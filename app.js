const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const PRIORITY_COLORS = {
  baja: { bg: 'rgba(76, 175, 80, 0.2)', color: '#4CAF50' },
  media: { bg: 'rgba(255, 193, 7, 0.2)', color: '#FFC107' },
  alta: { bg: 'rgba(255, 87, 34, 0.2)', color: '#FF572B' },
  urgente: { bg: 'rgba(153, 51, 255, 0.4)', color: '#9933FF' }
};

const PRIORITY_ORDER = { baja: 0, media: 1, alta: 2, urgente: 3 };

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let tagsCache = new Set();
let swRegistration = null;
let notificationPermissionRequested = false;

console.log('App init: tasks loaded from localStorage:', tasks.length, 'tasks');

// ============================================
// COMUNICACIÓN CON SERVICE WORKER
// ============================================

function swMessage(type, payload) {
  return new Promise((resolve, reject) => {
    if (!swRegistration || !navigator.serviceWorker.controller) {
      reject(new Error('Service Worker no disponible'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      if (event.data.success) {
        resolve(event.data);
      } else {
        reject(new Error(event.data.error || 'Error desconocido'));
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type, payload },
      [messageChannel.port2]
    );
  });
}

async function saveTaskToSW(task) {
  try {
    await swMessage('SAVE_TASK', task);
  } catch (e) {
    console.error('SW save error:', e);
  }
}

async function deleteTaskFromSW(taskId) {
  try {
    await swMessage('DELETE_TASK', taskId);
  } catch (e) {
    console.error('SW delete error:', e);
  }
}

async function markTaskCompletedInSW(taskId) {
  try {
    await swMessage('MARK_COMPLETED', taskId);
  } catch (e) {
    console.error('SW mark error:', e);
  }
}

async function startSWPeriodicCheck() {
  try {
    await swMessage('START_CHECK', null);
  } catch (e) {
    console.error('SW start check error:', e);
  }
}

// ============================================
// NOTIFICACIONES NATIVAS
// ============================================

async function requestNotificationPermission() {
  if (notificationPermissionRequested) {
    return Notification.permission === 'granted';
  }

  notificationPermissionRequested = true;

  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function showNativeNotification(title, options = {}) {
  if (!('Notification' in window)) {
    console.log('Notificaciones no soportadas');
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  const defaultOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: 'task-notification',
    requireInteraction: true,
    renotify: true,
    ...options
  };

  return new Notification(title, defaultOptions);
}

async function subscribeToPush() {
  if (!swRegistration) return;
  try {
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BNyoM5liKnDim3WXhzygRKsGzmqTxpuFKvyIGdWVuIAt-r0LABydNiAuC_qt0mhBk_noPLCPCHh-IHuBXji1q1Y')
    });
    console.log('Suscripción push:', subscription.endpoint);
  } catch (e) {
    console.error('Error suscribiendo a push:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function sendTestPush() {
  showNativeNotification('Gestor de Tareas', {
    body: '¡Las notificaciones están funcionando!',
    tag: 'test-push'
  });
}

function notifyTaskCreated(task) {
  if (!task.dueDate) return;

  const taskDate = new Date(task.dueDate);
  const now = new Date();
  const diffHours = (taskDate - now) / (1000 * 60 * 60);

  if (diffHours > 0 && diffHours <= 24) {
    showNativeNotification('Tarea próximamente', {
      body: `${task.title} vence el ${taskDate.toLocaleDateString()}`,
      tag: `task-${task.id}`
    });
  }
}

function initApp() {
  renderCalendar();
  renderSummary();
  renderTasks();
  renderFilters();
  updateNotification();
  setupEventListeners();
  loadTagsFromTasks();
  setupKeyboardShortcuts();
}

function setupEventListeners() {
  // Botón nueva tarea - listener inicial (solo una vez al cargar)
  const newTaskBtn = document.getElementById('newTaskBtn');
  if (newTaskBtn) {
    newTaskBtn.addEventListener('click', openTaskModal);
  } else {
    console.error('ERROR: newTaskBtn not found');
  }

  // Atajo 'N' para nueva tarea (solo si no hay foco en inputs)
  const setupKeyboardShortcuts = () => {
    document.addEventListener('keydown', (e) => {
      const focusedEl = document.activeElement;
      const isInput = focusedEl && (focusedEl.tagName === 'INPUT' || focusedEl.tagName === 'TEXTAREA' || focusedEl.tagName === 'SELECT');
      
      if (e.key.toLowerCase() === 'n' && !isInput) {
        e.preventDefault();
        openTaskModal();
      }
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        const tagFilter = document.getElementById('tagFilter');
        if (tagFilter) tagFilter.focus();
      }
      if (e.key === 'Escape' && !isInput) {
        closeTaskModal();
      }
    });
  };

  setupKeyboardShortcuts();

  const taskForm = document.getElementById('taskForm');
  if (taskForm) {
    taskForm.addEventListener('submit', handleTaskSubmit);
  } else {
    console.error('ERROR: taskForm not found');
  }

  const priorityFilter = document.getElementById('priorityFilter');
  if (priorityFilter) priorityFilter.addEventListener('change', filterTasks);

  const tagFilter = document.getElementById('tagFilter');
  if (tagFilter) tagFilter.addEventListener('change', filterTasks);

  const btnClose = document.querySelector('.btn-close');
  if (btnClose) btnClose.addEventListener('click', closeTaskModal);

  const taskModal = document.getElementById('taskModal');
  if (taskModal) {
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeTaskModal();
    });
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Verificar si el foco está en un campo de texto, input, textarea o select
    const focusedEl = document.activeElement;
    const isInput = focusedEl && (focusedEl.tagName === 'INPUT' || focusedEl.tagName === 'TEXTAREA' || focusedEl.tagName === 'SELECT' || focusedEl.isContentEditable);
    
    if (e.key === 'Escape' || e.key === 'esc') {
      // Cerrar modal solo si no estamos en un campo de texto
      if (!isInput) closeTaskModal();
    }
    if (e.key.toLowerCase() === 'n' && !isInput) {
      e.preventDefault();
      // Double-check modal is not already open
      const modal = document.getElementById('taskModal');
      if (modal && modal.style.display !== 'flex') {
        openTaskModal();
      }
    }
    if (e.key === '/' && !isInput) {
      e.preventDefault();
      const tagFilter = document.getElementById('tagFilter');
      if (tagFilter) tagFilter.focus();
    }
  });
}

// ============================================
// FIX APLICADO: Creación de tareas robusta
// ============================================

function openTaskModal(taskId = null) {
  // Asegurar que el modal esté hidden primero
  const modal = document.getElementById('taskModal');
  if (modal) modal.style.display = 'none';
  
  const form = document.getElementById('taskForm');
  const title = document.getElementById('modalTitle');
  const taskTitle = document.getElementById('taskTitle');
  const taskDescription = document.getElementById('taskDescription');
  const taskDueDate = document.getElementById('taskDueDate');
  const taskIdInput = document.getElementById('taskId');
  const priorityTags = document.querySelectorAll('.priority-tag');
  const tagInput = document.getElementById('newTag');
  const tagsChips = document.getElementById('tagsChips');

  // Reset completo del formulario
  if (form) form.reset();
  if (taskIdInput) taskIdInput.value = '';

  if (taskId) {
    // Modo edición: buscar la tarea en el array
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // Tarea encontrada - cargar datos en el formulario
      title.textContent = 'Editar tarea';
      if (taskIdInput) taskIdInput.value = task.id;
      if (taskTitle) taskTitle.value = task.title || '';
      if (taskDescription) taskDescription.value = task.description || '';
      if (taskDueDate) taskDueDate.value = task.dueDate || '';

      // Set priority based on task.priority
      if (priorityTags.length > 0) {
        priorityTags.forEach(tag => {
          if (tag.dataset.value === task.priority) {
            tag.classList.add('active');
          } else {
            tag.classList.remove('active');
          }
        });
      }
    } else {
      // Tarea NO encontrada - fallback a modo nueva tarea
      console.warn('Tarea no encontrada para editar - iniciando nueva tarea');
    }
  }

  if (!taskId || !tasks.find(t => t.id === taskId)) {
    // Modo nueva tarea (solo si no estamos editando una tarea existente)
    title.textContent = 'Nueva tarea';

    // Reset priority tags with forced Media (default per spec)
    if (priorityTags.length > 0) {
      priorityTags.forEach(tag => tag.classList.remove('active'));
      const mediaTag = document.querySelector('.priority-tag[data-value="media"]');
      if (mediaTag) mediaTag.classList.add('active');
    }

    // Clear tags completely
    if (tagsChips) tagsChips.innerHTML = '';
    tagsCache.clear();

    // Force focus to title with multiple attempts
    if (taskTitle) {
      taskTitle.value = '';  // Empieza vacío
      // Multiple focus attempts with delays
      taskTitle.focus();
      setTimeout(() => { if (!document.activeElement.isSameNode(taskTitle)) taskTitle.focus(); }, 50);
      setTimeout(() => { if (!document.activeElement.isSameNode(taskTitle)) taskTitle.focus(); }, 150);
    }
  }

  // Final: show modal
  if (modal) modal.style.display = 'flex';
}

function closeTaskModal() {
  const modal = document.getElementById('taskModal');
  if (modal) modal.style.display = 'none';
}

function selectPriority(tag) {
  document.querySelectorAll('.priority-tag').forEach(t => t.classList.remove('active'));
  tag.classList.add('active');
}

// LA FUNCIÓN MÁS IMPORTANTE - MÍTOLA ROBUSTA
function handleTaskSubmit(e) {
  e.preventDefault();
  console.log('handleTaskSubmit called - form submitted');

  // 1. Obtener valores CON FALLBACKS EXTREMOS
  const taskIdInput = document.getElementById('taskId');
  const titleInput = document.getElementById('taskTitle');
  const descInput = document.getElementById('taskDescription');
  const dueDateInput = document.getElementById('taskDueDate');

  let taskId = '';
  let title = '';
  let description = '';
  let dueDate = '';

  if (taskIdInput) taskId = taskIdInput.value;
  if (titleInput) title = titleInput.value.trim() || 'Tarea sin título';  // FALLBACK
  if (descInput) description = descInput.value.trim() || '';
  if (dueDateInput) dueDate = dueDateInput.value;

  // 2. Validación mejorada
  if (!title || title.length === 0) {
    // Si el título está vacío, usamos un valor por defecto pero seguimos
    title = 'Nueva tarea';
    addLog('warning', 'Título vacío - usando valor por defecto');
  }

  // 3. Obtener prioridad de forma segura
  let priority = 'media';  // Default media
  const priorityTags = document.querySelectorAll('.priority-tag');
  if (priorityTags.length > 0) {
    // Buscar la que tenga .active
    const activeTag = Array.from(priorityTags).find(t => t.classList.contains('active'));
    if (activeTag && activeTag.dataset.value) {
      priority = activeTag.dataset.value;
    } else {
      // Forzar la primera (Baja)
      priority = 'baja';
    }
  }

  // 4. Obtener etiquetas de forma segura
  let tags = [];
  const tagInput = document.getElementById('newTag');
  if (tagInput) {
    const tagValue = tagInput.value.trim();
    if (tagValue) {
      // Separar por comas y filtrar vacíos
      tags = tagValue.split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
    }
  }
  // Añadir tags cached
  tags = [...new Set([...(tagsCache || []), ...tags])];

  // 5. CREAR LA TAREA CON VALORES POR DEFECTO SEGUROS
  const task = {
    id: taskId ? taskId : (Date.now().toString() + Math.random().toString(36).substr(2)),
    title: title.trim(),
    description: description || '',
    dueDate: dueDate || null,
    priority: priority,
    tags: tags.length > 0 ? tags : [],  // Asegurar array no nulo
    completed: false,
    createdAt: new Date().toISOString()
  };

  console.log('Tarea a guardar:', task);

  // 6. ACTUALIZAR O INSERTAR EN EL ARRAY
  if (taskId && taskId.length > 0) {
    // Modo edición: buscar y reemplazar
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = task;
      console.log('Tarea actualizada en índice:', index);
    } else {
      // ID no encontrado, insertar al inicio
      tasks.unshift(task);
      console.log('ID no encontrado, insertando al inicio');
    }
  } else {
    // Modo nueva: al principio para que sea visible inmediatamente
    tasks.unshift(task);
    console.log('Nueva tarea añadida al inicio, total:', tasks.length);
  }

  // 7. GUARDAR EN localStorage CON ERROR HANDLING
  try {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    console.log('✅ localStorage actualizado:', tasks.length, 'tareas');
  } catch (e) {
    console.error('❌ Error saving to localStorage:', e.message);
    alert('Error guardando datos: ' + e.message);
    return;
  }

  // 8. REFRESCAR TODAS LAS Vistas en ORDEN SEGURO
  try { renderCalendar(); } catch (e) { console.error('renderCalendar error:', e); }
  try { renderSummary(); } catch (e) { console.error('renderSummary error:', e); }
  try { renderTasks(); } catch (e) { console.error('renderTasks error:', e); }
  try { renderFilters(); } catch (e) { console.error('renderFilters error:', e); }
  try { loadTagsFromTasks(); } catch (e) { console.error('loadTagsFromTasks error:', e); }

  // 9. Limpiar input de tags
  if (tagInput) tagInput.value = '';

  // 10. Notificar si la tarea tiene fecha límite cercana
  try { notifyTaskCreated(task); } catch (e) { console.error('notifyTaskCreated error:', e); }

  // 11. Cerrar modal ÚLTIMO
  setTimeout(closeTaskModal, 100);  // Retraso pequeño para asegurar que todo se guardó primero
}

// Función auxiliar para logs de debug
function addLog(id, message, type = 'info') {
  const container = document.getElementById(id);
  if (container) {
    const div = document.createElement('div');
    div.innerHTML = message;
    div.className = `debug-log ${type}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
}

// ... (resto de funciones sin cambios: renderCalendar, renderSummary, renderTasks, etc.)
function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;
  calendarGrid.innerHTML = '';
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startingDay = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const prevStart = (startingDay - 1 + 7) % 7;
  for (let i = 0; i < 42; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    const dayOfMonth = i - prevStart - (startingDay > 0 ? 1 : 0) + 1;
    const month = today.getMonth();
    const year = today.getFullYear();
    if (dayOfMonth >= 1 && dayOfMonth <= totalDays && month === today.getMonth()) {
      dayCell.textContent = dayOfMonth;
      dayCell.classList.add('day-cell');
      dayCell.setAttribute('data-day', dayOfMonth);
      const taskList = window.tasks || tasks;
      const tasksForDay = taskList.filter(t => {
        if (!t.dueDate || t.completed) return false;
        const taskDate = new Date(t.dueDate);
        return taskDate.getDate() === dayOfMonth && taskDate.getMonth() === month;
      });
      if (tasksForDay.length > 0) {
        dayCell.classList.add('has-task');
        const pendingTasks = tasksForDay.filter(t => !t.completed).length;
        if (pendingTasks > 0) {
          const badge = document.createElement('span');
          const firstTaskPriority = tasksForDay[0] ? tasksForDay[0].priority : 'baja';
          badge.className = 'task-pill priority-' + firstTaskPriority;
          badge.textContent = `${pendingTasks} pend`;
          dayCell.appendChild(badge);
        }
      }
    } else if (dayOfMonth < 1 || month !== today.getMonth()) {
      dayCell.textContent = '';
      dayCell.classList.add('empty');
    }
    const todayDate = new Date();
    if (dayOfMonth === todayDate.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayCell.style.background = 'rgba(153, 51, 255, 0.15)';
      dayCell.style.borderRadius = '4px 4px 0 0';
    }
    calendarGrid.appendChild(dayCell);
  }
}

function renderSummary() {
  const summaryGrid = document.getElementById('summaryGrid');
  if (!summaryGrid) return;
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + 7);
  summaryGrid.innerHTML = '';
  for (let d = 0; d < 7; d++) {
    const summaryDay = document.createElement('div');
    summaryDay.className = 'summary-day';
    summaryDay.innerHTML = `<span>${DAYS_OF_WEEK[(today.getDay() + d) % 7]} ${today.getDate()}/${today.getMonth() + 1}</span>`;
    const taskList = window.tasks || tasks;
    const dayTasks = taskList.filter(t => {
      if (t.completed) return false;
      if (!t.dueDate) return false;
      const taskDate = new Date(t.dueDate);
      return taskDate >= today && taskDate <= future;
    });
    if (dayTasks.length > 0) {
      summaryDay.classList.add('has-tasks');
      summaryDay.innerHTML += `<span class="tag-chip">${dayTasks.length} tarea${dayTasks.length > 1 ? 's' : ''}</span>`;
    }
    summaryGrid.appendChild(summaryDay);
  }
}

function renderTasks() {
  const tasksList = document.getElementById('tasksList');
  const emptyState = document.getElementById('emptyState');
  if (!tasksList || !emptyState) return;
  const filtered = filterTasksInMemory();
  if (filtered.length === 0) {
    tasksList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  tasksList.innerHTML = filtered.map((task, index) => {
    const priorityClass = `priority-${task.priority}`;
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Sin fecha';
    const tagsHtml = task.tags ? task.tags.map(tag => `<span class="tag-chip">${tag}</span>`).join('') : '';
    return `
      <div class="task-item" data-id="${task.id}">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} role="checkbox">
        <div class="task-info">
          <h3 class="task-title">${escapeHtml(task.title)}</h3>
          <div class="task-meta">
            <span>${task.description ? `<em>${escapeHtml(task.description)}</em>` : ''}</span>
            <span>Vence: ${dueDate}</span>
          </div>
        </div>
        <div class="task-actions">${tagsHtml}</div>
        <div class="task-priority ${priorityClass}" title="${task.priority}">${task.priority.charAt(0).toUpperCase()}</div>
        <div class="task-actions delete-btn">
          <button class="btn btn-secondary btn-small" onclick="editTask('${task.id}')">Editar</button>
          <button class="btn btn-secondary btn-small" onclick="deleteTask('${task.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
  // Re-attacher event listener
  tasksList.replaceWith(tasksList.cloneNode(true));
  const newTasksList = document.getElementById('tasksList');
  newTasksList.addEventListener('change', (e) => {
    if (e.target.classList.contains('task-checkbox')) {
      const taskId = e.target.parentElement.dataset.id;
      toggleTaskCompletion(taskId);
    }
  });
}

function filterTasksInMemory() {
  const taskList = window.tasks || [];
  const priorityFilter = document.getElementById('priorityFilter').value;
  const tagFilter = document.getElementById('tagFilter').value;
  let result = [...taskList];
  if (priorityFilter !== 'all') {
    result = result.filter(t => t.priority === priorityFilter);
  }
  if (tagFilter !== 'all') {
    result = result.filter(t => t.tags && t.tags.includes(tagFilter));
  }
  result.sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    const priorityA = PRIORITY_ORDER[a.priority] !== undefined ? PRIORITY_ORDER[a.priority] : 99;
    const priorityB = PRIORITY_ORDER[b.priority] !== undefined ? PRIORITY_ORDER[b.priority] : 99;
    if (priorityA !== priorityB) return priorityB - priorityA;
    const dateA = new Date(a.dueDate || '9999-99-99');
    const dateB = new Date(b.dueDate || '9999-99-99');
    return dateA - dateB;
  });
  return result;
}

function filterTasks() {
  renderTasks();
  renderFilters();
}

function renderFilters() {
  const tagFilter = document.getElementById('tagFilter');
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))];
  tagFilter.innerHTML = '<option value="all">Todas etiquetas</option>';
  allTags.forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
  if (tasks.length > 0) {
    tagFilter.value = 'all';
  }
}

function toggleTaskCompletion(taskId) {
  const taskList = window.tasks || tasks;
  const index = taskList.findIndex(t => t.id === taskId);
  if (index > -1) {
    taskList[index].completed = !taskList[index].completed;
    saveToLocalStorage();
    renderCalendar();
    renderSummary();
    renderTasks();
    markTaskCompletedInSW(taskId);
  }
}

function editTask(taskId) {
  openTaskModal(taskId);
}

function deleteTask(taskId) {
  if (confirm('¿Seguro que quieres eliminar esta tarea?')) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveToLocalStorage();
    renderCalendar();
    renderSummary();
    renderTasks();
    renderFilters();
    deleteTaskFromSW(taskId);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function saveToLocalStorage() {
  try {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    window.tasks = tasks;
    // Guardar en IndexedDB para que el SW pueda leerlo y mostrar notificaciones
    if ('indexedDB' in window) {
      tasks.forEach(task => saveTaskToAppDB(task));
    }
    // También guardar en el SW
    if (swRegistration && swRegistration.active) {
      tasks.forEach(task => saveTaskToSW(task));
    }
  } catch (e) {
    console.error('localStorage error:', e);
  }
}

function loadTagsFromTasks() {
  const taskList = window.tasks || tasks;
  tagsCache = new Set(taskList.flatMap(t => t.tags || []));
  renderFilters();
}

function updateNotification() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  if (hour === 7 && minute >= 0 && minute < 5) {
    showMorningNotification();
  }
}

// Chequeo de notificación matutina cada minuto
setInterval(updateNotification, 60000);

function showMorningNotification() {
  const banner = document.getElementById('notificationBanner');
  if (banner) {
    banner.style.display = 'flex';
    setTimeout(() => { banner.style.display = 'none'; }, 8000);
  }
}

function testMorningAlert() {
  showMorningNotification();
  alert('Aviso de las 7:00 AM simulado exitosamente!');
}

function exportData() {
  const data = JSON.stringify(tasks, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tareas-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedTasks = JSON.parse(e.target.result);
      if (Array.isArray(importedTasks)) {
        tasks = importedTasks;
        saveToLocalStorage();
        renderCalendar();
        renderSummary();
        renderTasks();
        renderFilters();
        loadTagsFromTasks();
        alert('Datos importados exitosamente!');
      } else {
        alert('El archivo JSON no tiene un formato válido.');
      }
    } catch (error) {
      alert('Error al leer el archivo: ' + error.message);
    }
  };
  reader.readAsText(file);
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Desregistrar Service Workers antiguos para evitar conflictos de caché
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrations.forEach(reg => reg.unregister());
  }

  // Cargar tareas desde IndexedDB si localStorage está vacío
  if (tasks.length === 0 && 'indexedDB' in window) {
    try {
      const db = await openDBForApp();
      const allTasks = await getAllTasksFromAppDB(db);
      if (allTasks.length > 0) {
        tasks = allTasks;
        console.log('Tareas cargadas desde IndexedDB:', tasks.length);
      }
      db.close();
    } catch (e) {
      console.error('Error cargando desde IDB:', e);
    }
  }

  // Botones de Exportar/Importar JSON (restore functionality)
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary';
  exportBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Exportar JSON';
  exportBtn.onclick = exportData;
  const appActions = document.querySelector('.app-actions');
  const btnSettings = document.querySelector('.btn-settings');
  if (appActions && btnSettings) {
    appActions.insertBefore(exportBtn, btnSettings);
  }

  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-secondary';
  importBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 3a2 2 0 012 2v7M7 12l5 5v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7l5-5M7 20l5-5v-7"/></svg> Importar JSON';
  importBtn.onclick = () => document.getElementById('importFile').click();
  if (appActions && btnSettings) {
    appActions.insertBefore(importBtn, btnSettings);
  }

  const notifyBtn = document.createElement('button');
  notifyBtn.className = 'btn btn-secondary';
  notifyBtn.id = 'notifyBtn';
  notifyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> Activar Notificaciones';
  notifyBtn.onclick = async () => {
    // Verificar si estamos en HTTPS o localhost (requerido para Service Worker)
    const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (!isSecure) {
      alert('Las notificaciones push requieren HTTPS o localhost.\n\nSi estás abriendo el archivo directamente (file:///), las notificaciones no funcionarán.\n\nSube la app a GitHub Pages o usa un servidor local.');
      return;
    }

    // Registrar Service Worker al activar notificaciones
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registrado:', swRegistration.scope);
      } catch (e) {
        console.error('Error registrando SW:', e);
        alert('Error registrando el Service Worker: ' + e.message + '\n\nRevisa la consola para más detalles.');
        return;
      }
    }

    const granted = await requestNotificationPermission();
    if (granted) {
      await subscribeToPush();
      notifyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> Notificaciones Activas';
      notifyBtn.classList.add('btn-primary');
      notifyBtn.classList.remove('btn-secondary');
      notifyBtn.disabled = true;
      // Iniciar verificación periódica en el SW
      await startSWPeriodicCheck();
      // Enviar notificación de prueba
      setTimeout(() => sendTestPush(), 1000);
    } else {
      alert('No se pudo conceder el permiso de notificaciones. Revisa la configuración de tu navegador.');
    }
  };
  if (appActions && btnSettings) {
    appActions.insertBefore(notifyBtn, btnSettings);
  }

  // Botón de prueba de notificación (funciona sin SW, solo con permiso de notificaciones)
  const testNotifyBtn = document.createElement('button');
  testNotifyBtn.className = 'btn btn-secondary';
  testNotifyBtn.id = 'testNotifyBtn';
  testNotifyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L1 7l11 6 11-6-11-5z"/><path d="M12 17a7 7 0 007-7v-2a7 7 0 00-7-7v2a7 7 0 007 7z"/></svg> Probar Notificación';
  testNotifyBtn.onclick = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      sendTestPush();
    } else {
      alert('Permiso de notificaciones no concedido.');
    }
  };
  if (appActions && btnSettings) {
    appActions.insertBefore(testNotifyBtn, btnSettings);
  }

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.id = 'importFile';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  document.body.appendChild(importInput);

  // Inicializar la app: renderizar calendario, resumen, tareas y listeners
  initApp();
});

// Funciones auxiliares para IndexedDB desde la app (main thread)
const APP_DB_NAME = 'TaskManagerDB';
const APP_DB_VERSION = 1;
const APP_STORE_NAME = 'tasks';

function openDBForApp() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(APP_DB_NAME, APP_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(APP_STORE_NAME)) {
        const store = db.createObjectStore(APP_STORE_NAME, { keyPath: 'id' });
        store.createIndex('dueDate', 'dueDate', { unique: false });
        store.createIndex('completed', 'completed', { unique: false });
        store.createIndex('notified', 'notified', { unique: false });
      }
    };
  });
}

async function getAllTasksFromAppDB(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_STORE_NAME], 'readonly');
    const store = transaction.objectStore(APP_STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function saveTaskToAppDB(task) {
  const db = await openDBForApp();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(APP_STORE_NAME);
    const request = store.put(task);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };
  });
}

// Exponer API para tests unitarios
window.PRIORITY_COLORS = PRIORITY_COLORS;
window.PRIORITY_ORDER = PRIORITY_ORDER;
window.DAYS_OF_WEEK = DAYS_OF_WEEK;
window.tasks = tasks;
window.escapeHtml = escapeHtml;
window.filterTasksInMemory = filterTasksInMemory;
window.toggleTaskCompletion = toggleTaskCompletion;
window.deleteTask = deleteTask;
window.editTask = editTask;