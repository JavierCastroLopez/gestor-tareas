// Service Worker - Gestor de Tareas
// Maneja notificaciones push incluso con la app cerrada

const CACHE_NAME = 'task-manager-v1';
const VAPID_PUBLIC_KEY = 'BM6...'; // Reemplazar con tu clave VAPID pública real

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker');
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker');
  event.waitUntil(
    clients.claim()
  );
});

// Escuchar mensajes push del servidor
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');

  const options = {
    body: 'Tienes tareas pendientes para hoy',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir app',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icon-192.png'
      }
    ],
    tag: 'task-notification',
    renotify: true,
    requireInteraction: true,
    silent: false
  };

  // Intentar obtener datos del push
  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.body || options.body;
      options.title = data.title || 'Gestor de Tareas';
      options.data = data.options || options.data;
      if (data.actions) options.actions = data.actions;
    } catch (e) {
      console.error('[SW] Error parseando datos push:', e);
      options.title = 'Gestor de Tareas';
    }
  } else {
    options.title = 'Gestor de Tareas';
  }

  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abrir la aplicación
  const urlToOpen = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';

  const promiseChain = clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // Buscar si ya hay una ventana abierta de la app
    for (let client of windowClients) {
      if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    // Si no hay ninguna abierta, abrir una nueva
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Manejar errores de push
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Suscripción push cambiada');
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }).then((newSubscription) => {
      console.log('[SW] Nueva suscripción obtenida:', newSubscription);
      // Aquí se enviaría la nueva suscripción al servidor
    })
  );
});

// Utilidad para convertir VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Sincronización en segundo plano (para cuando recupere conexión)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync evento:', event.tag);
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      // Sincronizar tareas pendientes
      Promise.resolve()
    );
  }
});
