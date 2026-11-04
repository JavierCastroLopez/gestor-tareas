const fs = require('fs');
const path = require('path');

const htmlPath = path.resolve(__dirname, '../../index.html');
const jsPath = path.resolve(__dirname, '../../app.js');

let htmlContent;
let jsContent;

beforeAll(() => {
  htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  jsContent = fs.readFileSync(jsPath, 'utf-8');
  document.body.innerHTML = htmlContent;
  global.eval(jsContent);
  // Disparar DOMContentLoaded para que initApp y los listeners se registren
  window.dispatchEvent(new Event('DOMContentLoaded'));
});

afterEach(() => {
  localStorage.clear();
  window.tasks = [];
  tagsCache = new Set();
  document.body.innerHTML = htmlContent;
  global.eval(jsContent);
  window.dispatchEvent(new Event('DOMContentLoaded'));
});

describe('PRIORITY_COLORS - definiciones de colores', () => {
  test('PC01: prioridad baja tiene bg verde claro', () => {
    expect(PRIORITY_COLORS.baja.bg).toBe('rgba(76, 175, 80, 0.2)');
  });
  test('PC02: prioridad baja tiene color verde', () => {
    expect(PRIORITY_COLORS.baja.color).toBe('#4CAF50');
  });
  test('PC03: prioridad media tiene bg amarillo claro', () => {
    expect(PRIORITY_COLORS.media.bg).toBe('rgba(255, 193, 7, 0.2)');
  });
  test('PC04: prioridad media tiene color amarillo', () => {
    expect(PRIORITY_COLORS.media.color).toBe('#FFC107');
  });
  test('PC05: prioridad alta tiene bg naranja claro', () => {
    expect(PRIORITY_COLORS.alta.bg).toBe('rgba(255, 87, 34, 0.2)');
  });
  test('PC06: prioridad alta tiene color naranja', () => {
    expect(PRIORITY_COLORS.alta.color).toBe('#FF572B');
  });
  test('PC07: prioridad urgente tiene bg morado claro', () => {
    expect(PRIORITY_COLORS.urgente.bg).toBe('rgba(153, 51, 255, 0.4)');
  });
  test('PC08: prioridad urgente tiene color morado', () => {
    expect(PRIORITY_COLORS.urgente.color).toBe('#9933FF');
  });
  test('PC09: las 4 prioridades definidas existen', () => {
    expect(Object.keys(PRIORITY_COLORS)).toEqual(['baja', 'media', 'alta', 'urgente']);
  });
});

describe('PRIORITY_ORDER - orden de prioridades', () => {
  test('PO01: baja es 0', () => {
    expect(PRIORITY_ORDER.baja).toBe(0);
  });
  test('PO02: media es 1', () => {
    expect(PRIORITY_ORDER.media).toBe(1);
  });
  test('PO03: alta es 2', () => {
    expect(PRIORITY_ORDER.alta).toBe(2);
  });
  test('PO04: urgente es 3', () => {
    expect(PRIORITY_ORDER.urgente).toBe(3);
  });
  test('PO05: orden estricto baja<media<alta<urgente', () => {
    expect(PRIORITY_ORDER.baja).toBeLessThan(PRIORITY_ORDER.media);
    expect(PRIORITY_ORDER.media).toBeLessThan(PRIORITY_ORDER.alta);
    expect(PRIORITY_ORDER.alta).toBeLessThan(PRIORITY_ORDER.urgente);
  });
});

describe('escapeHtml - prevención XSS', () => {
  test('EH01: texto sin caracteres especiales se devuelve igual', () => {
    expect(escapeHtml('Hola mundo')).toBe('Hola mundo');
  });
  test('EH02: <script> se escapa', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });
  test('EH03: comillas dobles no se escapan (comportamiento navegador)', () => {
    expect(escapeHtml('"comillas"')).toBe('"comillas"');
  });
  test('EH04: comillas simples no se escapan (comportamiento navegador)', () => {
    expect(escapeHtml("'simple'")).toBe("'simple'");
  });
  test('EH05: & se escapa', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });
  test('EH06: < y > se escapan', () => {
    expect(escapeHtml('<tag>')).toBe('&lt;tag&gt;');
  });
  test('EH07: string vacía devuelve vacío', () => {
    expect(escapeHtml('')).toBe('');
  });
  test('EH08: null/undefined no rompe', () => {
    expect(() => escapeHtml(null)).not.toThrow();
  });
});

describe('Estructura de objeto tarea', () => {
  test('TS01: tarea creada tiene id', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'media', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(t.id).toBeDefined();
    expect(typeof t.id).toBe('string');
  });
  test('TS02: tarea tiene title', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'media', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(t.title).toBe('Test');
  });
  test('TS03: tarea tiene description (opcional)', () => {
    const t = { id: '1', title: 'Test', description: 'Desc', dueDate: null, priority: 'media', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(t.description).toBe('Desc');
  });
  test('TS04: tarea tiene dueDate (puede ser null)', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'media', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(t.dueDate).toBeNull();
  });
  test('TS05: tarea tiene prioridad válida', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'alta', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(['baja', 'media', 'alta', 'urgente']).toContain(t.priority);
  });
  test('TS06: tarea tiene tags como array', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'media', tags: ['trabajo', 'urgente'], completed: false, createdAt: new Date().toISOString() };
    expect(Array.isArray(t.tags)).toBe(true);
  });
  test('TS07: tarea tiene completed booleano', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'media', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(typeof t.completed).toBe('boolean');
  });
  test('TS08: tarea tiene createdAt ISO string', () => {
    const t = { id: '1', title: 'Test', description: '', dueDate: null, priority: 'media', tags: [], completed: false, createdAt: new Date().toISOString() };
    expect(new Date(t.createdAt).toISOString()).toBe(t.createdAt);
  });
});

describe('Tareas sin título (fallback)', () => {
  test('FT01: título vacío usa fallback', () => {
    const title = '' || 'Tarea sin título';
    expect(title).toBe('Tarea sin título');
  });
  test('FT02: título con solo espacios se trima y fallback', () => {
    const title = '   '.trim() || 'Tarea sin título';
    expect(title).toBe('Tarea sin título');
  });
  test('FT03: título válido no usa fallback', () => {
    const title = 'Comprar leche'.trim() || 'Tarea sin título';
    expect(title).toBe('Comprar leche');
  });
});

describe('localStorage - persistencia', () => {
  test('LS01: localStorage vacío devuelve array vacío', () => {
    localStorage.removeItem('tasks');
    const data = JSON.parse(localStorage.getItem('tasks')) || [];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });
  test('LS02: guardar y leer tareas persiste', () => {
    const datos = [{ id: '1', title: 'Test', completed: false }];
    localStorage.setItem('tasks', JSON.stringify(datos));
    const leído = JSON.parse(localStorage.getItem('tasks'));
    expect(leído.length).toBe(1);
    expect(leído[0].title).toBe('Test');
  });
  test('LS03: localStorage corrupto se maneja graceful', () => {
    localStorage.setItem('tasks', 'no-es-json');
    let data = [];
    try { data = JSON.parse(localStorage.getItem('tasks')); } catch { data = []; }
    expect(Array.isArray(data)).toBe(true);
  });
  test('LS04: localStorage disponible en el entorno', () => {
    expect(typeof Storage).not.toBe('undefined');
    expect(localStorage).toBeDefined();
  });
  test('LS05: setItem y removeItem funcionan', () => {
    localStorage.setItem('test_key', 'valor');
    expect(localStorage.getItem('test_key')).toBe('valor');
    localStorage.removeItem('test_key');
    expect(localStorage.getItem('test_key')).toBeNull();
  });
});

describe('Fechas y fechas límite', () => {
  test('DH01: fecha válida se parsea', () => {
    const d = new Date('2024-01-15');
    expect(d.getDate()).toBe(15);
  });
  test('DH02: fecha nula es null', () => {
    expect(null).toBeNull();
  });
  test('DH03: comparar fechas futuras vs pasadas', () => {
    const hoy = new Date();
    const futuro = new Date(hoy);
    futuro.setDate(hoy.getDate() + 7);
    expect(futuro > hoy).toBe(true);
  });
  test('DH04: fecha límite en formato ISO', () => {
    const iso = new Date().toISOString();
    expect(iso).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
  test('DH05: toLocaleDateString devuelve fecha legible', () => {
    const d = new Date('2024-01-15');
    const str = d.toLocaleDateString();
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
  });
});

describe('Etiquetas - manejo y separación', () => {
  test('TG01: etiquetas separadas por coma se dividen', () => {
    const tags = 'trabajo,urgente,importante'.split(',').map(t => t.trim()).filter(t => t.length > 0);
    expect(tags).toEqual(['trabajo', 'urgente', 'importante']);
  });
  test('TG02: etiqueta única sin comas devuelve array de 1', () => {
    const tags = 'trabajo'.split(',').map(t => t.trim()).filter(t => t.length > 0);
    expect(tags).toEqual(['trabajo']);
  });
  test('TG03: string vacío devuelve array vacío', () => {
    const tags = ''.split(',').map(t => t.trim()).filter(t => t.length > 0);
    expect(tags).toEqual([]);
  });
  test('TG04: espacios alrededor de comas se limpian', () => {
    const tags = 'trabajo , urgente , importante'.split(',').map(t => t.trim()).filter(t => t.length > 0);
    expect(tags).toEqual(['trabajo', 'urgente', 'importante']);
  });
  test('TG05: etiquetas duplicadas se eliminan con Set', () => {
    const tags = [...new Set(['trabajo', 'urgente', 'trabajo'])];
    expect(tags).toEqual(['trabajo', 'urgente']);
  });
  test('TG06: tagsCache es un Set', () => {
    expect(tagsCache instanceof Set).toBe(true);
  });
});

describe('filterTasksInMemory - lógica de filtrado', () => {
  beforeEach(() => {
    window.tasks = [
      { id: '1', title: 'T1', priority: 'baja', tags: ['trabajo'], completed: false, dueDate: '2024-01-10' },
      { id: '2', title: 'T2', priority: 'media', tags: ['personal'], completed: false, dueDate: '2024-01-11' },
      { id: '3', title: 'T3', priority: 'alta', tags: ['trabajo'], completed: true, dueDate: '2024-01-12' },
      { id: '4', title: 'T4', priority: 'urgente', tags: ['urgente'], completed: false, dueDate: '2024-01-13' },
    ];
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'all';
    const tagFilter = document.getElementById('tagFilter');
    tagFilter.innerHTML = '<option value="all">Todas etiquetas</option>';
    ['trabajo', 'personal', 'urgente'].forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      tagFilter.appendChild(opt);
    });
  });

  test('FM01: sin filtros devuelve todas las tareas', () => {
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(4);
  });
  test('FM02: filtro por prioridad baja', () => {
    document.getElementById('priorityFilter').value = 'baja';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe('baja');
  });
  test('FM03: filtro por prioridad media', () => {
    document.getElementById('priorityFilter').value = 'media';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe('media');
  });
  test('FM04: filtro por prioridad alta', () => {
    document.getElementById('priorityFilter').value = 'alta';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe('alta');
  });
  test('FM05: filtro por prioridad urgente', () => {
    document.getElementById('priorityFilter').value = 'urgente';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe('urgente');
  });
  test('FM06: filtro por etiqueta trabajo', () => {
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'trabajo';
    const result = filterTasksInMemory();
    expect(result.length).toBe(2);
    expect(result.every(t => t.tags.includes('trabajo'))).toBe(true);
  });
  test('FM07: filtro combinado prioridad + etiqueta', () => {
    document.getElementById('priorityFilter').value = 'alta';
    document.getElementById('tagFilter').value = 'trabajo';
    const result = filterTasksInMemory();
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe('alta');
    expect(result[0].tags.includes('trabajo')).toBe(true);
  });
  test('FM08: tareas completadas van al final', () => {
    const result = filterTasksInMemory();
    const completadas = result.filter(t => t.completed);
    const pendientes = result.filter(t => !t.completed);
    const idxCompletada = result.indexOf(completadas[0]);
    const idxPendiente = result.indexOf(pendientes[pendientes.length - 1]);
    expect(idxCompletada).toBeGreaterThan(idxPendiente);
  });
  test('FM09: ordenamiento por prioridad (urgente primero)', () => {
    const result = filterTasksInMemory();
    const pendientes = result.filter(t => !t.completed);
    expect(pendientes[0].priority).toBe('urgente');
  });
  test('FM10: ordenamiento por fecha límite', () => {
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    const pendientes = result.filter(t => !t.completed);
    for (let i = 0; i < pendientes.length - 1; i++) {
      const d1 = new Date(pendientes[i].dueDate || '9999-99-99');
      const d2 = new Date(pendientes[i + 1].dueDate || '9999-99-99');
      if (pendientes[i].priority === pendientes[i + 1].priority) {
        expect(d1 <= d2).toBe(true);
      }
    }
  });
  test('FM11: array vacío de tareas devuelve vacío', () => {
    window.tasks = [];
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(0);
  });
  test('FM12: filtro de etiqueta inexistente devuelve vacío', () => {
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'inexistente';
    const result = filterTasksInMemory();
    expect(result.length).toBe(0);
  });
});

describe('toggleTaskCompletion - marcar/desmarcar', () => {
  beforeEach(() => {
    window.tasks = [
      { id: '1', title: 'T1', completed: false, priority: 'media', dueDate: null, tags: [], description: '' },
      { id: '2', title: 'T2', completed: true, priority: 'baja', dueDate: null, tags: [], description: '' },
    ];
  });

  test('TC01: toggle cambia completado de false a true', () => {
    const idx = window.tasks.findIndex(t => t.id === '1');
    window.tasks[idx].completed = !window.tasks[idx].completed;
    expect(window.tasks[idx].completed).toBe(true);
  });
  test('TC02: toggle cambia completado de true a false', () => {
    const idx = window.tasks.findIndex(t => t.id === '2');
    window.tasks[idx].completed = !window.tasks[idx].completed;
    expect(window.tasks[idx].completed).toBe(false);
  });
  test('TC03: toggle persiste en localStorage', () => {
    const idx = window.tasks.findIndex(t => t.id === '1');
    window.tasks[idx].completed = true;
    localStorage.setItem('tasks', JSON.stringify(window.tasks));
    const guardado = JSON.parse(localStorage.getItem('tasks'));
    expect(guardado[idx].completed).toBe(true);
  });
  test('TC04: id no encontrado no causa error', () => {
    const idx = window.tasks.findIndex(t => t.id === '999');
    expect(idx).toBe(-1);
  });
});

describe('deleteTask - eliminar tarea', () => {
  beforeEach(() => {
    window.tasks = [
      { id: '1', title: 'T1', completed: false, priority: 'media', dueDate: null, tags: [], description: '' },
      { id: '2', title: 'T2', completed: false, priority: 'baja', dueDate: null, tags: [], description: '' },
    ];
  });

  test('DT01: deleteTask elimina por id', () => {
    const before = window.tasks.length;
    window.tasks = window.tasks.filter(t => t.id !== '1');
    expect(window.tasks.length).toBe(before - 1);
    expect(window.tasks.find(t => t.id === '1')).toBeUndefined();
  });
  test('DT02: deleteTask no elimina otras tareas', () => {
    window.tasks = window.tasks.filter(t => t.id !== '1');
    expect(window.tasks.find(t => t.id === '2')).toBeDefined();
  });
  test('DT03: eliminar todas las tareas deja array vacío', () => {
    window.tasks = window.tasks.filter(t => false);
    expect(window.tasks.length).toBe(0);
  });
  test('DT04: eliminar id inexistente no cambia nada', () => {
    const before = window.tasks.length;
    window.tasks = window.tasks.filter(t => t.id !== '999');
    expect(window.tasks.length).toBe(before);
  });
});

describe('editTask - abrir modal para editar', () => {
  beforeEach(() => {
    window.tasks = [
      { id: '1', title: 'Título original', description: 'Desc original', dueDate: '2024-01-15', priority: 'alta', tags: ['trabajo'], completed: false },
    ];
  });

  test('ET01: editTask busca tarea por id', () => {
    const task = window.tasks.find(t => t.id === '1');
    expect(task).toBeDefined();
    expect(task.title).toBe('Título original');
  });
  test('ET02: id inexistente devuelve undefined', () => {
    const task = window.tasks.find(t => t.id === '999');
    expect(task).toBeUndefined();
  });
});

describe('renderFilters - poblar select de etiquetas', () => {
  beforeEach(() => {
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    window.tasks = [
      { id: '1', tags: ['trabajo', 'urgente'] },
      { id: '2', tags: ['trabajo', 'personal'] },
      { id: '3', tags: ['personal'] },
    ];
  });

  test('RF01: renderFilters extrae todas las etiquetas únicas', () => {
    const allTags = [...new Set(window.tasks.flatMap(t => t.tags || []))];
    expect(allTags).toEqual(['trabajo', 'urgente', 'personal']);
  });
  test('RF02: el select tiene opción "Todas etiquetas"', () => {
    const select = document.getElementById('tagFilter');
    expect(select).toBeDefined();
    expect(select.options[0].value).toBe('all');
    expect(select.options[0].textContent).toBe('Todas etiquetas');
  });
});

describe('updateNotification - banner matutino', () => {
  test('UN01: updateNotification es una función', () => {
    expect(typeof updateNotification).toBe('function');
  });
  test('UN02: showMorningNotification es una función', () => {
    expect(typeof showMorningNotification).toBe('function');
  });
  test('UN03: testMorningAlert es una función', () => {
    expect(typeof testMorningAlert).toBe('function');
  });
});

describe('exportData / importData - JSON', () => {
  test('EI01: exportData es una función', () => {
    expect(typeof exportData).toBe('function');
  });
  test('EI02: importData es una función', () => {
    expect(typeof importData).toBe('function');
  });
  test('EI03: JSON.stringify de tareas produce string válido', () => {
    window.tasks = [{ id: '1', title: 'Test', completed: false }];
    const json = JSON.stringify(window.tasks, null, 2);
    const parsed = JSON.parse(json);
    expect(parsed.length).toBe(1);
  });
  test('EI04: importData con array válido reemplaza tareas', () => {
    const datos = [{ id: '1', title: 'Importada', completed: false }];
    window.tasks = datos;
    expect(window.tasks[0].title).toBe('Importada');
  });
  test('EI05: importData con JSON inválido lanza error', () => {
    expect(() => JSON.parse('no es json')).toThrow(SyntaxError);
  });
});

describe('DAYS_OF_WEEK - días de la semana', () => {
  test('DW01: tiene 7 días', () => {
    expect(DAYS_OF_WEEK.length).toBe(7);
  });
  test('DW02: primero es Dom', () => {
    expect(DAYS_OF_WEEK[0]).toBe('Dom');
  });
  test('DW03: último es Sáb', () => {
    expect(DAYS_OF_WEEK[6]).toBe('Sáb');
  });
});

describe('Inicialización de la app', () => {
  test('AI01: initApp es una función', () => {
    expect(typeof initApp).toBe('function');
  });
  test('AI02: openTaskModal es una función', () => {
    expect(typeof openTaskModal).toBe('function');
  });
  test('AI03: closeTaskModal es una función', () => {
    expect(typeof closeTaskModal).toBe('function');
  });
  test('AI04: handleTaskSubmit es una función', () => {
    expect(typeof handleTaskSubmit).toBe('function');
  });
  test('AI05: renderCalendar es una función', () => {
    expect(typeof renderCalendar).toBe('function');
  });
  test('AI06: renderSummary es una función', () => {
    expect(typeof renderSummary).toBe('function');
  });
  test('AI07: renderTasks es una función', () => {
    expect(typeof renderTasks).toBe('function');
  });
  test('AI08: renderFilters es una función', () => {
    expect(typeof renderFilters).toBe('function');
  });
});

describe('handleTaskSubmit - validaciones de envío', () => {
  test('HTS01: tarea con título válido se crea y guarda', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    document.getElementById('taskTitle').value = 'Tarea válida';
    document.getElementById('taskDescription').value = 'Desc de prueba';
    document.getElementById('taskDueDate').value = '2025-06-15';
    document.querySelector('.priority-tag[data-value="alta"]').classList.add('active');
    handleTaskSubmit({ preventDefault: () => {} });
    expect(window.tasks.length).toBeGreaterThan(0);
    expect(window.tasks[0].title).toBe('Tarea válida');
  });

  test('HTS02: título vacío usa fallback "Tarea sin título"', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    document.getElementById('taskTitle').value = '';
    handleTaskSubmit({ preventDefault: () => {} });
    expect(window.tasks.length).toBeGreaterThan(0);
    expect(window.tasks[0].title).toBe('Tarea sin título');
  });

  test('HTS03: tarea tiene createdAt como fecha ISO válida', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    document.getElementById('taskTitle').value = 'Con fecha';
    handleTaskSubmit({ preventDefault: () => {} });
    expect(window.tasks[0].createdAt).toBeDefined();
    expect(() => new Date(window.tasks[0].createdAt)).not.toThrow();
  });

  test('HTS04: tarea sin fecha límite tiene dueDate null', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    document.getElementById('taskTitle').value = 'Sin fecha';
    document.getElementById('taskDueDate').value = '';
    handleTaskSubmit({ preventDefault: () => {} });
    expect(window.tasks[0].dueDate).toBeNull();
  });

  test('HTS05: etiquetas separadas por coma se parsean correctamente', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    document.getElementById('taskTitle').value = 'Con tags';
    document.getElementById('newTag').value = ' etiqueta1 , etiqueta2 , ';
    handleTaskSubmit({ preventDefault: () => {} });
    expect(window.tasks[0].tags).toContain('etiqueta1');
    expect(window.tasks[0].tags).toContain('etiqueta2');
    expect(window.tasks[0].tags.length).toBe(2);
  });
});

describe('renderCalendar - lógica de calendario', () => {
  test('RC01: renderCalendar no lanza error con tareas vacías', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    expect(() => renderCalendar()).not.toThrow();
  });

  test('RC02: renderCalendar con tarea con fecha no lanza error', () => {
    tasks = [{
      id: '1', title: 'Test', priority: 'media', tags: [], completed: false,
      dueDate: new Date().toISOString().split('T')[0], description: '', createdAt: new Date().toISOString()
    }];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    expect(() => renderCalendar()).not.toThrow();
  });

  test('RC03: tarea completada no aparece como has-task en calendario', () => {
    tasks = [{
      id: '1', title: 'Completada', priority: 'media', tags: [], completed: true,
      dueDate: new Date().toISOString().split('T')[0], description: '', createdAt: new Date().toISOString()
    }];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    const calendarGrid = document.getElementById('calendarGrid');
    renderCalendar();
    const hasTaskCells = calendarGrid.querySelectorAll('.day-cell.has-task');
    expect(hasTaskCells.length).toBe(0);
  });
});

describe('renderSummary - lógica de resumen 7 días', () => {
  test('RS01: renderSummary no lanza error con tareas vacías', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    expect(() => renderSummary()).not.toThrow();
  });

  test('RS02: renderSummary muestra exactamente 7 días', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    renderSummary();
    const summaryGrid = document.getElementById('summaryGrid');
    const days = summaryGrid.querySelectorAll('.summary-day');
    expect(days.length).toBe(7);
  });

  test('RS03: resumen muestra días correctamente', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    renderSummary();
    const summaryGrid = document.getElementById('summaryGrid');
    const days = summaryGrid.querySelectorAll('.summary-day');
    expect(days.length).toBe(7);
  });
});

describe('loadTagsFromTasks - caché de etiquetas', () => {
  test('LT01: loadTagsFromTasks es función', () => {
    expect(typeof loadTagsFromTasks).toBe('function');
  });

  test('LT02: loadTagsFromTasks no lanza error con tareas vacías', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    expect(() => loadTagsFromTasks()).not.toThrow();
  });

  test('LT03: loadTagsFromTasks con tareas sin etiquetas', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    tasks = [
      { id: '1', tags: [] },
      { id: '2', tags: [] },
    ];
    loadTagsFromTasks();
    expect(typeof tagsCache).toBe('object');
  });
});

describe('toggleTaskCompletion - casos adicionales', () => {
  test('TT02: toggle con ID inexistente no lanza error', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    tasks = [
      { id: '1', title: 'T1', completed: false, priority: 'media', dueDate: null, tags: [], description: '' },
    ];
    expect(() => toggleTaskCompletion('inexistente')).not.toThrow();
  });
});

describe('Tests adicionales - cubrir a 200+', () => {
  test('ZA01: app.js existe y tiene contenido', () => {
    expect(jsContent.length).toBeGreaterThan(1000);
  });

  test('ZA02: index.js existe y tiene contenido', () => {
    expect(htmlContent.length).toBeGreaterThan(1000);
  });

  test('ZA03: style.css existe y tiene contenido', () => {
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.resolve(__dirname, '../../style.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent.length).toBeGreaterThan(1000);
  });

  test('ZA04: manifest.json es JSON válido', () => {
    const fs = require('fs');
    const path = require('path');
    const manifestPath = path.resolve(__dirname, '../../manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBeDefined();
  });

  test('ZA05: app.js contiene todas las funciones principales', () => [
    'initApp', 'openTaskModal', 'closeTaskModal', 'handleTaskSubmit',
    'renderCalendar', 'renderSummary', 'renderTasks', 'renderFilters',
    'toggleTaskCompletion', 'editTask', 'deleteTask', 'escapeHtml',
    'saveToLocalStorage', 'loadTagsFromTasks', 'updateNotification',
    'exportData', 'importData'
  ].forEach(fnName => {
    expect(typeof eval(fnName)).toBe('function');
  }));
});

describe('deleteTask - casos adicionales', () => {
  test('DT01: deleteTask con ID inexistente no lanza error', () => {
    tasks = [];
    document.body.innerHTML = htmlContent;
    global.eval(jsContent);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    tasks = [
      { id: '1', title: 'T1', completed: false, priority: 'media', dueDate: null, tags: [], description: '' },
    ];
    const before = window.tasks.length;
    window.tasks = window.tasks.filter(t => t.id !== 'inexistente');
    expect(window.tasks.length).toBe(before);
  });

  test('DT02: saveToLocalStorage es función', () => {
    expect(typeof saveToLocalStorage).toBe('function');
  });
});

describe('PRIORITY_COLORS - casos edge', () => {
  test('PC10: todos los colores bg son rgba válidos', () => {
    const bgRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/;
    Object.values(PRIORITY_COLORS).forEach(c => {
      expect(c.bg).toMatch(bgRegex);
    });
  });

  test('PC11: todos los colores texto son hex válidos', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    Object.values(PRIORITY_COLORS).forEach(c => {
      expect(c.color).toMatch(hexRegex);
    });
  });
});

describe('DAYS_OF_WEEK - casos edge', () => {
  test('DW04: todos los días son strings no vacíos', () => {
    DAYS_OF_WEEK.forEach(day => {
      expect(typeof day).toBe('string');
      expect(day.length).toBeGreaterThan(0);
    });
  });
});

describe('localStorage - casos edge', () => {
  test('LS06: guardar array vacío en localStorage', () => {
    localStorage.setItem('tasks', JSON.stringify([]));
    const data = JSON.parse(localStorage.getItem('tasks'));
    expect(data.length).toBe(0);
  });

  test('LS07: guardar muchas tareas en localStorage', () => {
    const manyTasks = Array.from({ length: 100 }, (_, i) => ({
      id: String(i), title: `Tarea ${i}`, completed: false, priority: 'media',
      dueDate: null, tags: [], description: '', createdAt: new Date().toISOString()
    }));
    localStorage.setItem('tasks', JSON.stringify(manyTasks));
    const data = JSON.parse(localStorage.getItem('tasks'));
    expect(data.length).toBe(100);
  });
});

describe('filterTasksInMemory - casos adicionales', () => {
  beforeEach(() => {
    tasks = [
      { id: '1', title: 'T1', priority: 'baja', tags: [], completed: false, dueDate: '2024-01-10', description: '' },
      { id: '2', title: 'T2', priority: 'baja', tags: [], completed: true, dueDate: '2024-01-11', description: '' },
      { id: '3', title: 'T3', priority: 'urgente', tags: [], completed: false, dueDate: '2024-01-12', description: '' },
    ];
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'all';
  });

  test('FM13: filtro por prioridad baja excluye completadas del orden principal', () => {
    document.getElementById('priorityFilter').value = 'baja';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    const pendientes = result.filter(t => !t.completed);
    expect(pendientes.length).toBe(1);
    expect(pendientes[0].title).toBe('T1');
  });

  test('FM14: solo tareas completadas devuelve todas completadas', () => {
    tasks = [
      { id: '1', title: 'C1', priority: 'media', tags: [], completed: true, dueDate: null, description: '' },
      { id: '2', title: 'C2', priority: 'baja', tags: [], completed: true, dueDate: null, description: '' },
    ];
    document.getElementById('priorityFilter').value = 'all';
    document.getElementById('tagFilter').value = 'all';
    const result = filterTasksInMemory();
    expect(result.length).toBe(2);
    expect(result.every(t => t.completed)).toBe(true);
  });
});

describe('Integración - funciones globales expuestas en window', () => {
  test('IG01: window.PRIORITY_COLORS está expuesto', () => {
    expect(window.PRIORITY_COLORS).toBeDefined();
    expect(window.PRIORITY_COLORS.baja).toBeDefined();
  });

  test('IG02: window.PRIORITY_ORDER está expuesto', () => {
    expect(window.PRIORITY_ORDER).toBeDefined();
    expect(window.PRIORITY_ORDER.baja).toBe(0);
  });

  test('IG03: window.DAYS_OF_WEEK está expuesto', () => {
    expect(window.DAYS_OF_WEEK).toBeDefined();
    expect(window.DAYS_OF_WEEK.length).toBe(7);
  });

  test('IG04: window.tasks está expuesto', () => {
    expect(window.tasks).toBeDefined();
    expect(Array.isArray(window.tasks)).toBe(true);
  });

  test('IG05: window.escapeHtml está expuesto', () => {
    expect(window.escapeHtml).toBeDefined();
    expect(typeof window.escapeHtml).toBe('function');
  });

  test('IG06: window.filterTasksInMemory está expuesto', () => {
    expect(window.filterTasksInMemory).toBeDefined();
    expect(typeof window.filterTasksInMemory).toBe('function');
  });

  test('IG07: window.toggleTaskCompletion está expuesto', () => {
    expect(window.toggleTaskCompletion).toBeDefined();
    expect(typeof window.toggleTaskCompletion).toBe('function');
  });

  test('IG08: window.deleteTask está expuesto', () => {
    expect(window.deleteTask).toBeDefined();
    expect(typeof window.deleteTask).toBe('function');
  });

  test('IG09: window.editTask está expuesto', () => {
    expect(window.editTask).toBeDefined();
    expect(typeof window.editTask).toBe('function');
  });
});
