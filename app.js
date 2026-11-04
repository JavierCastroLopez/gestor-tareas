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
  document.getElementById('newTaskBtn').addEventListener('click', openTaskModal);
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);
  document.getElementById('priorityFilter').addEventListener('change', filterTasks);
  document.getElementById('tagFilter').addEventListener('change', filterTasks);
  document.querySelector('.btn-close').addEventListener('click', closeTaskModal);
  document.getElementById('taskModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeTaskModal();
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'esc') closeTaskModal();
    if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openTaskModal();
    }
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('tagFilter').focus();
    }
  });
}

function openTaskModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  const title = document.getElementById('modalTitle');
  const taskTitle = document.getElementById('taskTitle');
  const taskDescription = document.getElementById('taskDescription');
  const taskDueDate = document.getElementById('taskDueDate');
  const taskIdInput = document.getElementById('taskId');

  form.reset();
  taskIdInput.value = '';

  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    title.textContent = 'Editar tarea';
    taskTitle.value = task.title;
    taskDescription.value = task.description || '';
    taskDueDate.value = task.dueDate || '';
    taskIdInput.value = task.id;

    // Set priority
    document.querySelectorAll('.priority-tag').forEach(tag => {
      tag.classList.toggle('active', tag.dataset.value === task.priority);
    });
  } else {
    title.textContent = 'Nueva tarea';
    document.querySelectorAll('.priority-tag').forEach(tag => tag.classList.remove('active'));
    document.querySelector('.priority-tag.baja').classList.add('active');

    // Clear tags
    document.getElementById('tagsChips').innerHTML = '';
    tagsCache.clear();
  }

  modal.style.display = 'flex';
}

function closeTaskModal() {
  document.getElementById('taskModal').style.display = 'none';
}

function handleTaskSubmit(e) {
  e.preventDefault();

  const taskId = document.getElementById('taskId').value;
  const title = document.getElementById('taskTitle').value.trim();
  const description = document.getElementById('taskDescription').value.trim();
  const dueDate = document.getElementById('taskDueDate').value;
  const priority = document.querySelector('.priority-tag.active')?.dataset.value || 'media';
  const tagInputValue = document.getElementById('newTag').value.trim();
  const tagInputs = tagInputValue.split(',').map(t => t.trim()).filter(t => t);
  const newTag = tagInputValue ? tagInputValue : '';

  if (!title) return;

  const allTags = [...new Set([...(tagsCache || []), ...tagInputs, newTag].filter(t => t))];

  const task = {
    id: Date.now().toString() + Math.random().toString(36).substr(2),
    title,
    description,
    dueDate: dueDate || null,
    priority,
    tags: allTags,
    completed: false,
    createdAt: new Date().toISOString()
  };

  if (taskId) {
    const index = tasks.findIndex(t => t.id === taskId);
    if (index > -1) tasks[index] = task;
  } else {
    tasks.push(task);
  }

  saveToLocalStorage();
  renderCalendar();
  renderSummary();
  renderTasks();
  renderFilters();
  loadTagsFromTasks();
  
  // Clear tag input after submitting
  document.getElementById('newTag').value = '';
  
  closeTaskModal();
}

function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;

  calendarGrid.innerHTML = '';

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const startingDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  // Previous month days
  const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const prevStart = (startingDay - 1 + 7) % 7;

  // Fill all days of the grid (6 weeks * 7 days = 42 cells)
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

      // Find tasks for this day
      const tasksForDay = tasks.filter(t => {
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

    // Highlight today
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

    const dayTasks = tasks.filter(t => {
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
        <div class="task-actions">
          ${tagsHtml}
        </div>
        <div class="task-priority ${priorityClass}" title="${task.priority}">${task.priority.charAt(0).toUpperCase()}</div>
        <div class="task-actions delete-btn">
          <button class="btn btn-secondary btn-small" onclick="editTask(${task.id})">Editar</button>
          <button class="btn btn-secondary btn-small" onclick="deleteTask('${task.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');

  tasksList.addEventListener('change', (e) => {
    if (e.target.classList.contains('task-checkbox')) {
      const taskId = e.target.parentElement.dataset.id;
      toggleTaskCompletion(taskId);
    }
  });
}

function filterTasksInMemory() {
  const priorityFilter = document.getElementById('priorityFilter').value;
  const tagFilter = document.getElementById('tagFilter').value;

  let result = [...tasks];

  // Filter by priority
  if (priorityFilter !== 'all') {
    result = result.filter(t => t.priority === priorityFilter);
  }

  // Filter by tag
  if (tagFilter !== 'all') {
    result = result.filter(t => t.tags && t.tags.includes(tagFilter));
  }

  // Sort: completed first, then by priority, then by date
  result.sort((a, b) => {
    // Completed tasks al final
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    // By priority
    const priorityA = PRIORITY_ORDER[a.priority] || 99;
    const priorityB = PRIORITY_ORDER[b.priority] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;

    // By date
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
  
  // Si hay tareas, seleccionar "Todas" como default, si no ocultar el filtro
  if (tasks.length > 0) {
    tagFilter.value = 'all';
  }
}

function toggleTaskCompletion(taskId) {
  const index = tasks.findIndex(t => t.id === taskId);
  if (index > -1) {
    tasks[index].completed = !tasks[index].completed;
    saveToLocalStorage();
    renderCalendar();
    renderSummary();
    renderTasks();
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
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function saveToLocalStorage() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTagsFromTasks() {
  tagsCache = new Set(tasks.flatMap(t => t.tags || []));
  renderFilters();
}

function updateNotification() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Check if it's 7:00 AM exactly or close to it
  if (hour === 7 && minute >= 0 && minute < 5) {
    showMorningNotification();
  }
}

function showMorningNotification() {
  const banner = document.getElementById('notificationBanner');
  if (banner) {
    banner.style.display = 'flex';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 8000);
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

// Initialize app
document.addEventListener('DOMContentLoaded', initApp);

// Export/Import buttons
document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-secondary';
  exportBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Exportar JSON';
  exportBtn.onclick = exportData;
  document.querySelector('.app-actions').insertBefore(exportBtn, document.querySelector('.btn-settings'));

  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-secondary';
  importBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 3a2 2 0 012 2v7M7 12l5 5v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7l5-5M7 20l5-5v-7"/></svg> Importar JSON';
  importBtn.onclick = () => document.getElementById('importFile').click();
  document.querySelector('.app-actions').insertBefore(importBtn, document.querySelector('.btn-settings'));

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.id = 'importFile';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  document.body.appendChild(importInput);
});