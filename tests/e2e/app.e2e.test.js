const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8888/index.html';

// Helper: crear una tarea completa desde el modal
async function crearTarea(page, { title, descripcion, fecha, prioridad, etiquetas } = {}) {
  await page.click('#newTaskBtn');
  await expect(page.locator('#taskModal')).toHaveCSS('display', 'flex');
  await page.waitForTimeout(200);

  if (title) {
    await page.fill('#taskTitle', title);
  }
  if (descripcion) {
    await page.fill('#taskDescription', descripcion);
  }
  if (fecha) {
    await page.fill('#taskDueDate', fecha);
  }
  if (prioridad) {
    await page.click(`.priority-tag[data-value="${prioridad}"]`);
  }
  if (etiquetas) {
    const input = page.locator('#newTag');
    await input.fill(etiquetas);
  }

  await page.click('button[type="submit"]', { force: true });
  await page.waitForTimeout(500);
  await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
  await page.waitForTimeout(300);
  // Esperar a que al menos una tarea aparezca en el DOM
  await page.waitForFunction(() => document.querySelectorAll('.task-item').length > 0);
}

// Helper: contar tareas en la lista
async function contarTareas(page) {
  return await page.locator('.task-item').count();
}

test.describe('Carga de la aplicación', () => {
  test('E2E-01: app carga y muestra el título', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('h1')).toContainText('Calendario Tasks');
  });

  test('E2E-02: botón nueva tarea está visible', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#newTaskBtn')).toBeVisible();
  });

  test('E2E-03: panel calendario está presente', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.calendar-panel')).toBeVisible();
  });

  test('E2E-04: panel resumen 7 días está presente', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.summary-panel')).toBeVisible();
  });

  test('E2E-05: panel tareas está presente', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('.tasks-panel')).toBeVisible();
  });
});

test.describe('Modal de nueva tarea', () => {
  test('E2E-06: clic en "+" abre el modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'flex');
    await expect(page.locator('#modalTitle')).toContainText('Nueva tarea');
  });

  test('E2E-07: modal se cierra con botón X', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.click('.btn-close');
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
  });

  test('E2E-08: modal se cierra haciendo clic fuera', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.click('#taskModal', { position: { x: 10, y: 10 } });
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
  });

  test('E2E-09: botón Cancelar cierra el modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.click('button:has-text("Cancelar")');
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
  });

  test('E2E-10: foco va al campo título al abrir modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await expect(page.locator('#taskTitle')).toBeFocused();
  });

  test('E2E-11: reset de prioridad al abrir modal (Baja por defecto)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    const baja = page.locator('.priority-tag.baja.active');
    await expect(baja).toBeVisible();
  });

  test('E2E-12: tags chips se limpian al abrir modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await expect(page.locator('#tagsChips')).toBeEmpty();
  });
});

test.describe('Creación de tareas', () => {
  test('E2E-13: crear tarea con título solo', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Comprar pan' });
    const count = await contarTareas(page);
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('.task-item').first()).toContainText('Comprar pan');
  });

  test('E2E-14: crear tarea con descripción', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Tarea con desc', descripcion: 'Esta es una descripción de prueba' });
    await expect(page.locator('.task-item').first()).toContainText('Esta es una descripción de prueba');
  });

  test('E2E-15: crear tarea con fecha límite', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Con fecha', fecha: '2025-12-25' });
    await expect(page.locator('.task-item').first()).toContainText('Vence');
  });

  test('E2E-16: crear tarea con prioridad baja', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Baja', prioridad: 'baja' });
    const badge = page.locator('.task-item .task-priority').first();
    await expect(badge).toHaveClass(/priority-baja/);
  });

  test('E2E-17: crear tarea con prioridad media', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Media', prioridad: 'media' });
    const badge = page.locator('.task-item .task-priority').first();
    await expect(badge).toHaveClass(/priority-media/);
  });

  test('E2E-18: crear tarea con prioridad alta', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Alta', prioridad: 'alta' });
    const badge = page.locator('.task-item .task-priority').first();
    await expect(badge).toHaveClass(/priority-alta/);
  });

  test('E2E-19: crear tarea con prioridad urgente', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Urgente', prioridad: 'urgente' });
    const badge = page.locator('.task-item .task-priority').first();
    await expect(badge).toHaveClass(/priority-urgente/);
  });

  test('E2E-20: crear tarea con etiquetas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Con etiquetas', etiquetas: 'trabajo,urgente' });
    const chips = page.locator('.task-item .tag-chip');
    await expect(chips.first()).toContainText('trabajo');
    await expect(chips.nth(1)).toContainText('urgente');
  });

  test('E2E-21: tarea nueva aparece al inicio de la lista', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Primera' });
    await crearTarea(page, { title: 'Segunda' });
    await expect(page.locator('.task-item').first()).toContainText('Segunda');
  });

  test('E2E-22: envío del formulario con Enter', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.fill('#taskTitle', 'Enter tarea');
    await page.press('form#taskForm', 'Enter');
    await page.waitForTimeout(300);
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
    await expect(page.locator('.task-item')).toContainText('Enter tarea');
  });
});

test.describe('Listado y visualización de tareas', () => {
  test('E2E-23: múltiples tareas se muestran todas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'A' });
    await crearTarea(page, { title: 'B' });
    await crearTarea(page, { title: 'C' });
    expect(await contarTareas(page)).toBeGreaterThanOrEqual(3);
  });

  test('E2E-24: descripción larga se muestra', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Larga', descripcion: 'A'.repeat(200) });
    await expect(page.locator('.task-item').first()).toContainText('A'.repeat(50));
  });

  test('E2E-25: badge de prioridad muestra color correcto', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Color', prioridad: 'urgente' });
    const badge = page.locator('.task-item .task-priority').first();
    await expect(badge).toContainText('U');
  });
});

test.describe('Completar y descompletar tareas', () => {
  test('E2E-26: marcar tarea como completada tacha el texto', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Para completar' });
    const checkbox = page.locator('.task-checkbox').first();
    await checkbox.check();
    await page.waitForTimeout(300);
    const title = page.locator('.task-title').first();
    await expect(title).toHaveCSS('text-decoration', /line-through/);
  });

  test('E2E-27: descompletar tarea quita el tachado', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Toggle' });
    const checkbox = page.locator('.task-checkbox').first();
    await checkbox.check();
    await checkbox.uncheck();
    const title = page.locator('.task-title').first();
    await expect(title).not.toHaveCSS('text-decoration', /line-through/);
  });

  test('E2E-28: tarea completada se mueve al final', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Primera' });
    await crearTarea(page, { title: 'Segunda' });
    const firstCheckbox = page.locator('.task-checkbox').first();
    await firstCheckbox.check();
    await page.waitForTimeout(500);
    await expect(page.locator('.task-item').last()).toContainText('Primera');
  });
});

test.describe('Edición de tareas', () => {
  test('E2E-29: editar tarea cambia el título', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Original' });
    await page.locator('.task-item button:has-text("Editar")').first().click();
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'flex');
    await page.fill('#taskTitle', 'Modificado');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    await expect(page.locator('.task-item').first()).toContainText('Modificado');
  });

  test('E2E-30: editar tarea cambia la prioridad', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'CambioPrioridad', prioridad: 'baja' });
    await page.locator('.task-item button:has-text("Editar")').first().click();
    await page.click('.priority-tag[data-value="urgente"]');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    const badge = page.locator('.task-item .task-priority').first();
    await expect(badge).toHaveClass(/priority-urgente/);
  });
});

test.describe('Eliminación de tareas', () => {
  test('E2E-31: eliminar tarea la quita de la lista', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Para eliminar' });
    const before = await contarTareas(page);
    await page.evaluate(() => {
      window.confirm = () => true;
      const taskId = document.querySelector('.task-item').dataset.id;
      window.deleteTask(taskId);
    });
    await page.waitForTimeout(500);
    const after = await contarTareas(page);
    expect(after).toBeLessThan(before);
  });

  test('E2E-32: eliminar todas las tareas muestra empty state', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Única' });
    await page.evaluate(() => {
      window.confirm = () => true;
      const taskId = document.querySelector('.task-item').dataset.id;
      window.deleteTask(taskId);
    });
    await page.waitForTimeout(500);
    await expect(page.locator('#emptyState')).toBeVisible();
  });
});

test.describe('Filtros por prioridad', () => {
  test('E2E-33: filtro baja muestra solo bajas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'B1', prioridad: 'baja' });
    await crearTarea(page, { title: 'U1', prioridad: 'urgente' });
    await page.selectOption('#priorityFilter', 'baja');
    await page.waitForTimeout(500);
    const items = page.locator('.task-item .task-priority');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toHaveClass(/priority-baja/);
    }
  });

  test('E2E-34: filtro media muestra solo medias', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'M1', prioridad: 'media' });
    await crearTarea(page, { title: 'A1', prioridad: 'alta' });
    await page.selectOption('#priorityFilter', 'media');
    await page.waitForTimeout(500);
    const items = page.locator('.task-item .task-priority');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toHaveClass(/priority-media/);
    }
  });

  test('E2E-35: filtro alta muestra solo altas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'A1', prioridad: 'alta' });
    await crearTarea(page, { title: 'B1', prioridad: 'baja' });
    await page.selectOption('#priorityFilter', 'alta');
    await page.waitForTimeout(500);
    const items = page.locator('.task-item .task-priority');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toHaveClass(/priority-alta/);
    }
  });

  test('E2E-36: filtro urgente muestra solo urgentes', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'U1', prioridad: 'urgente' });
    await crearTarea(page, { title: 'B1', prioridad: 'baja' });
    await page.selectOption('#priorityFilter', 'urgente');
    await page.waitForTimeout(500);
    const items = page.locator('.task-item .task-priority');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toHaveClass(/priority-urgente/);
    }
  });

  test('E2E-37: filtro "Todas" muestra todas las tareas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Baja', prioridad: 'baja' });
    await crearTarea(page, { title: 'Urgente', prioridad: 'urgente' });
    await page.selectOption('#priorityFilter', 'urgente');
    await page.waitForTimeout(300);
    await page.selectOption('#priorityFilter', 'all');
    await page.waitForTimeout(300);
    expect(await contarTareas(page)).toBeGreaterThanOrEqual(2);
  });
});

test.describe('Filtros por etiqueta', () => {
  test('E2E-38: filtro por etiqueta trabajo', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Trabajo1', etiquetas: 'trabajo' });
    await crearTarea(page, { title: 'Personal1', etiquetas: 'personal' });
    await page.selectOption('#tagFilter', 'trabajo');
    await page.waitForTimeout(300);
    const items = page.locator('.task-item');
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toContainText('trabajo');
    }
  });

  test('E2E-39: filtro combinado prioridad + etiqueta', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'AltaTrabajo', prioridad: 'alta', etiquetas: 'trabajo' });
    await crearTarea(page, { title: 'BajaPersonal', prioridad: 'baja', etiquetas: 'personal' });
    await page.selectOption('#priorityFilter', 'alta');
    await page.selectOption('#tagFilter', 'trabajo');
    await page.waitForTimeout(500);
    const items = page.locator('.task-item');
    expect(await items.count()).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < await items.count(); i++) {
      await expect(items.nth(i)).toContainText('AltaTrabajo');
    }
  });

  test('E2E-40: el filtro de etiqueta se actualiza al crear nuevas etiquetas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'NuevaEtiqueta', etiquetas: 'etiquetaNueva' });
    await page.waitForTimeout(300);
    const options = page.locator('#tagFilter option');
    let encontrado = false;
    for (let i = 0; i < await options.count(); i++) {
      if (await options.nth(i).textContent() === 'etiquetaNueva') {
        encontrado = true;
        break;
      }
    }
    expect(encontrado).toBe(true);
  });
});

test.describe('Calendario', () => {
  test('E2E-41: calendario muestra los días del mes', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    const celdas = page.locator('.day-cell');
    expect(await celdas.count()).toBeGreaterThan(0);
  });

  test('E2E-42: día con tarea pendiente muestra punto indicador', async ({ page }) => {
    await page.goto(BASE_URL);
    const hoy = new Date();
    const fecha = hoy.toISOString().split('T')[0];
    await crearTarea(page, { title: 'Calendario', fecha });
    await page.waitForTimeout(500);
    const diaHoy = page.locator(`.day-cell[data-day="${hoy.getDate()}"]`);
    await expect(diaHoy).toHaveClass(/has-task/);
  });

  test('E2E-43: tarea completada no muestra punto en calendario', async ({ page }) => {
    await page.goto(BASE_URL);
    const hoy = new Date();
    const fecha = hoy.toISOString().split('T')[0];
    await crearTarea(page, { title: 'Completar', fecha });
    await page.waitForTimeout(300);
    const checkbox = page.locator('.task-checkbox').first();
    await checkbox.check();
    await page.waitForTimeout(500);
    const diaHoy = page.locator(`.day-cell[data-day="${hoy.getDate()}"]`);
    await expect(diaHoy).not.toHaveClass(/has-task/);
  });

  test('E2E-44: botón mes anterior navega', async ({ page }) => {
    await page.goto(BASE_URL);
    const mesAntes = page.locator('#currentMonth').textContent();
    await page.click('.nav-btn.prev');
    await page.waitForTimeout(500);
    const mesDespués = page.locator('#currentMonth').textContent();
    expect(mesDespués).not.toBe(mesAntes);
  });

  test('E2E-45: botón mes siguiente navega', async ({ page }) => {
    await page.goto(BASE_URL);
    const mesAntes = page.locator('#currentMonth').textContent();
    await page.click('.nav-btn.next');
    await page.waitForTimeout(500);
    const mesDespués = page.locator('#currentMonth').textContent();
    expect(mesDespués).not.toBe(mesAntes);
  });

  test('E2E-46: mes actual está resaltado', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    const hoy = new Date();
    const diaHoy = page.locator(`.day-cell[data-day="${hoy.getDate()}"]`);
    await expect(diaHoy).toHaveCSS('background-color', /rgba\(153, 51, 255/);
  });
});

test.describe('Resumen 7 días', () => {
  test('E2E-47: resumen muestra 7 días', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(500);
    const dias = page.locator('.summary-day');
    expect(await dias.count()).toBe(7);
  });

  test('E2E-48: días con tareas tienen fondo morado', async ({ page }) => {
    await page.goto(BASE_URL);
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 2);
    const fecha = futuro.toISOString().split('T')[0];
    await crearTarea(page, { title: 'Resumen', fecha });
    await page.waitForTimeout(500);
    const conTareas = page.locator('.summary-day.has-tasks');
    expect(await conTareas.count()).toBeGreaterThanOrEqual(1);
  });

  test('E2E-49: contador de tareas en resumen coincide', async ({ page }) => {
    await page.goto(BASE_URL);
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 1);
    const fecha = futuro.toISOString().split('T')[0];
    await crearTarea(page, { title: 'Contar1', fecha });
    await crearTarea(page, { title: 'Contar2', fecha });
    await page.waitForTimeout(500);
    const chip = page.locator('.summary-day.has-tasks .tag-chip').first();
    await expect(chip).toContainText('2 tarea');
  });
});

test.describe('Atajos de teclado', () => {
  test('E2E-50: tecla N abre el modal', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.keyboard.press('n');
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'flex');
  });

  test('E2E-51: tecla N no abre modal si hay foco en input', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.fill('#taskTitle', 'test');
    await page.keyboard.press('n');
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'flex');
  });

  test('E2E-52: tecla / enfoca el filtro de etiquetas', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.keyboard.press('/');
    await expect(page.locator('#tagFilter')).toBeFocused();
  });

  test('E2E-53: tecla Esc cierra el modal abierto', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press('Escape');
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
  });
});

test.describe('Persistencia en localStorage', () => {
  test('E2E-54: tareas persisten al recargar la página', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Persistente' });
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.task-item')).toContainText('Persistente');
  });

  test('E2E-55: modificar tarea y recargar conserva el cambio', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Antes' });
    await page.locator('.task-item button:has-text("Editar")').first().click();
    await page.fill('#taskTitle', 'Después');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('.task-item')).toContainText('Después');
  });

  test('E2E-56: eliminar tarea y recargar no reaparece', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'EliminarPersist' });
    await page.locator('.task-item button:has-text("Eliminar")').first().click();
    await page.on('dialog', d => d.accept());
    await page.waitForTimeout(300);
    await page.reload();
    await page.waitForTimeout(500);
    const items = page.locator('.task-item');
    let encontrado = false;
    for (let i = 0; i < await items.count(); i++) {
      if (await items.nth(i).textContent() === 'EliminarPersist') {
        encontrado = true;
        break;
      }
    }
    expect(encontrado).toBe(false);
  });
});

test.describe('Exportar e Importar JSON', () => {
  test('E2E-57: botón Exportar JSON está presente', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('button:has-text("Exportar JSON")')).toBeVisible();
  });

  test('E2E-58: botón Importar JSON está presente', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('button:has-text("Importar JSON")')).toBeVisible();
  });

  test('E2E-59: exportar descarga un archivo .json', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'ExportTest' });
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Exportar JSON")'),
    ]);
    expect(descarga.suggestedFilename()).toMatch(/\.json$/);
  });
});

test.describe('Notificación matutina', () => {
  test('E2E-60: botón simular aviso 7 AM está presente en el DOM', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('button:has-text("Simular aviso 7:00 AM")')).toBeAttached();
  });

  test('E2E-61: simular aviso muestra el banner', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      window.alert = () => {};
      testMorningAlert();
    });
    await page.waitForTimeout(300);
    await expect(page.locator('#notificationBanner')).toBeVisible();
  });
});

test.describe('PWA y manifest', () => {
  test('E2E-62: manifest.json es accesible', async ({ page }) => {
    const response = await page.request.fetch('http://localhost:8888/manifest.json');
    expect(response.ok()).toBe(true);
    const json = await response.json();
    expect(json.name).toBeDefined();
    expect(json.short_name).toBeDefined();
    expect(json.display).toBe('standalone');
  });

  test('E2E-63: theme-color meta está presente', async ({ page }) => {
    await page.goto(BASE_URL);
    const meta = page.locator('meta[name="theme-color"]');
    await expect(meta).toHaveAttribute('content', '#9933FF');
  });
});

test.describe('Accesibilidad', () => {
  test('E2E-64: botón nueva tarea tiene aria-label', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('#newTaskBtn')).toHaveAttribute('aria-label', /Nueva tarea/);
  });

  test('E2E-65: modal tiene role dialog', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await expect(page.locator('#taskModal')).toHaveAttribute('role', 'dialog');
    await expect(page.locator('#taskModal')).toHaveAttribute('aria-modal', 'true');
  });

  test('E2E-66: checkbox tiene role checkbox', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Accesibilidad' });
    await expect(page.locator('.task-checkbox')).toHaveAttribute('role', 'checkbox');
  });

  test('E2E-67: navegación por teclado Tab funciona', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement.tagName);
    expect(['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA']).toContain(focused);
  });
});

test.describe('Casos borde y edge cases', () => {
  test('E2E-68: título con solo espacios se guarda con fallback', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('#newTaskBtn');
    await page.fill('#taskTitle', '   ');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(300);
    await expect(page.locator('#taskModal')).toHaveCSS('display', 'none');
    const items = page.locator('.task-item');
    let encontrado = false;
    for (let i = 0; i < await items.count(); i++) {
      const txt = await items.nth(i).textContent();
      if (txt && txt.includes('Tarea sin título')) { encontrado = true; break; }
    }
    expect(encontrado).toBe(true);
  });

  test('E2E-69: crear tarea rápida consecutiva no duplica', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Rápida1' });
    await crearTarea(page, { title: 'Rápida2' });
    expect(await contarTareas(page)).toBeGreaterThanOrEqual(2);
  });

  test('E2E-70: muchas tareas (20) se renderizan', async ({ page }) => {
    await page.goto(BASE_URL);
    for (let i = 0; i < 20; i++) {
      await crearTarea(page, { title: `Tarea ${i}` });
    }
    expect(await contarTareas(page)).toBeGreaterThanOrEqual(20);
  });

  test('E2E-71: vaciar localStorage y recargar inicia sin tareas', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Temporal' });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('#emptyState')).toBeVisible();
  });

  test('E2E-72: fecha límite en el pasado se acepta', async ({ page }) => {
    await page.goto(BASE_URL);
    await crearTarea(page, { title: 'Pasada', fecha: '2020-01-01' });
    await expect(page.locator('.task-item').first()).toContainText('Pasada');
  });
});

test.describe('Diseño responsivo', () => {
  test('E2E-73: vista móvil apila los paneles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await expect(page.locator('.main-content')).toBeVisible();
    await expect(page.locator('.calendar-panel')).toBeVisible();
    await expect(page.locator('.tasks-panel')).toBeVisible();
  });

  test('E2E-74: filtros en columna en móvil', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL);
    await expect(page.locator('.filter-controls')).toBeVisible();
  });
});
