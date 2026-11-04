// Service Worker - Gestor de Tareas con Notificaciones Locales
// Verifica tareas vencidas y muestra notificaciones nativas sin servidor externo

const CACHE_NAME = 'task-manager-v1';
const CHECK_INTERVAL = 60 * 1000; // Verificar cada minuto

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker');
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker');
  event.waitUntil(clients.claim());
});

// Verificación periódica de tareas vencidas
let checkInterval = null;

function startPeriodicCheck() {
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    checkAndNotifyTasks();
  }, CHECK_INTERVAL);
  console.log('[SW] Verificación periódica iniciada cada', CHECK_INTERVAL / 1000, 'segundos');
}

// Función principal: verificar tareas y mostrar notificaciones
async function checkAndNotifyTasks() {
  try {
    // Obtener todas las tareas desde IndexedDB
    const tasks = await getAllTasksFromIDB();
    const now = new Date();

    for (const task of tasks) {
      if (!task.dueDate || task.completed || task.notified) continue;

      const taskDate = new Date(task.dueDate);
      const diffMinutes = (taskDate - now) / (1000 * 60);

      // Notificar si la tarea vence en los próximos 60 minutos o ya venció (hace menos de 60 min)
      if (diffMinutes <= 60 && diffMinutes > -60) {
        await showLocalNotification(task);
        // Marcar como notificada para no repetir
        await markTaskAsNotified(task.id);
      }
    }
  } catch (error) {
    console.error('[SW] Error verificando tareas:', error);
  }
}

// Mostrar notificación local desde el Service Worker
async function showLocalNotification(task) {
  const options = {
    body: task.description ? task.description : 'Tarea pendiente',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: `task-${task.id}`,
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/',
      taskId: task.id,
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Abrir', icon: '/icons/icon-192.png' },
      { action: 'close', title: 'Cerrar', icon: '/icons/icon-192.png' }
    ]
  };

  await self.registration.showNotification(`⏰ ${task.title}`, options);
  console.log('[SW] Notificación mostrada:', task.title);
}

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============================================
// INDEXEDDB - Almacenamiento local de tareas
// ============================================

const DB_NAME = 'TaskManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('dueDate', 'dueDate', { unique: false });
        store.createIndex('completed', 'completed', { unique: false });
        store.createIndex('notified', 'notified', { unique: false });
      }
    };
  });
}

async function getAllTasksFromIDB() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveTaskToIDB(task) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(task);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function markTaskAsNotified(taskId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(taskId);
    getRequest.onsuccess = () => {
      const task = getRequest.result;
      if (task) {
        task.notified = true;
        const putRequest = store.put(task);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function deleteTaskFromIDB(taskId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(taskId);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// ============================================
// MENSAJES DESDE LA APP (main thread)
// ============================================

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'SAVE_TASK') {
    try {
      await saveTaskToIDB(payload);
      event.ports[0].postMessage({ success: true });
    } catch (e) {
      event.ports[0].postMessage({ success: false, error: e.message });
    }
  } else if (type === 'DELETE_TASK') {
    try {
      await deleteTaskFromIDB(payload);
      event.ports[0].postMessage({ success: true });
    } catch (e) {
      event.ports[0].postMessage({ success: false, error: e.message });
    }
  } else if (type === 'MARK_COMPLETED') {
    try {
      const db = await openDB();
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(payload);
      getRequest.onsuccess = () => {
        const task = getRequest.result;
        if (task) {
          task.completed = true;
          store.put(task);
        }
      };
      event.ports[0].postMessage({ success: true });
    } catch (e) {
      event.ports[0].postMessage({ success: false, error: e.message });
    }
  } else if (type === 'START_CHECK') {
    startPeriodicCheck();
    event.ports[0].postMessage({ success: true });
  }
});

// Iniciar verificación periódica al activar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      startPeriodicCheck();
    })
  );
});

// Escuchar push notifications externas (opcional, para futuro servidor)
self.addEventListener('push', (event) => {
  console.log('[SW] Push externo recibido');
  const options = {
    body: 'Tienes una nueva notificación',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'external-push',
    renotify: true,
    requireInteraction: true
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'Gestor de Tareas';
    } catch (e) {
      console.error('[SW] Error parseando push:', e);
    }
  }

  event.waitUntil(self.registration.showNotification(options.title || 'Gestor de Tareas', options));
});
