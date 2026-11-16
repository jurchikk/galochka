// Отрисовка списка задач. Один и тот же код работает на доске и в блоке «Попробуйте» на главной.
// Текст задач попадает на страницу только через textContent, поэтому HTML из задачи не исполняется.

import * as store from './store.js';

const TOAST_MS = 6000;

const ICON_EDIT =
  '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M4 16l.6-3.2 8.3-8.3a1.6 1.6 0 0 1 2.3 0l.3.3a1.6 1.6 0 0 1 0 2.3L7.2 15.4 4 16zM11.8 5.6l2.6 2.6"/></svg>';
const ICON_DELETE =
  '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5.5 5.5l9 9M14.5 5.5l-9 9"/></svg>';

export function mountTodo(root, { limit = Infinity, editable = true } = {}) {
  const part = (name) => root.querySelector(`[data-todo="${name}"]`);
  const els = {
    form: part('form'),
    input: part('input'),
    list: part('list'),
    empty: part('empty'),
    counter: part('counter'),
    clear: part('clear'),
    more: part('more'),
  };
  const filterButtons = [...root.querySelectorAll('[data-filter]')];
  const toast = document.querySelector('[data-todo="toast"]');

  let tasks = store.loadTasks();
  let filter = 'all';
  let editingId = null;
  let freshId = null;
  let toastTimer = null;

  const itemOf = (id) => [...els.list.children].find((li) => li.dataset.id === id) ?? null;
  const idOf = (node) => node.closest('.task')?.dataset.id ?? null;
  const focusIn = (id, selector) => itemOf(id)?.querySelector(selector)?.focus();

  function persist(next) {
    tasks = next;
    if (!store.saveTasks(tasks)) {
      notify('Браузер не дал сохранить список. После обновления страницы изменения пропадут.');
    }
  }

  function commit(next) {
    persist(next);
    render();
  }

  function hideToast() {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.classList.remove('is-open');
    toast.replaceChildren();
  }

  function notify(message, action) {
    if (!toast) return;
    clearTimeout(toastTimer);
    const text = document.createElement('span');
    text.textContent = message;
    toast.replaceChildren(text);
    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast__btn';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        hideToast();
        action.run();
      });
      toast.append(button);
    }
    toast.classList.add('is-open');
    toastTimer = setTimeout(hideToast, TOAST_MS);
  }

  function iconButton(action, label, icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `task__btn task__btn--${action}`;
    button.dataset.action = action;
    button.setAttribute('aria-label', label);
    button.innerHTML = icon; // статичная иконка, пользовательского текста здесь нет
    return button;
  }

  function renderTask(task) {
    const li = document.createElement('li');
    li.className = 'task';
    if (task.done) li.classList.add('is-done');
    if (task.id === freshId) li.classList.add('is-new');
    li.dataset.id = task.id;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task__check';
    check.checked = task.done;
    check.dataset.action = 'toggle';
    check.setAttribute('aria-label', `${task.done ? 'Вернуть в работу' : 'Отметить выполненной'}: ${task.text}`);
    li.append(check);

    const isEditing = editable && editingId === task.id;
    if (isEditing) {
      const field = document.createElement('input');
      field.type = 'text';
      field.className = 'task__edit';
      field.value = task.text;
      field.maxLength = store.MAX_LENGTH;
      field.dataset.action = 'edit-field';
      field.setAttribute('aria-label', 'Текст задачи');
      li.append(field);
    } else {
      const text = document.createElement('span');
      text.className = 'task__text';
      text.textContent = task.text;
      li.append(text);
    }

    const actions = document.createElement('div');
    actions.className = 'task__actions';
    if (editable && !isEditing) actions.append(iconButton('edit', `Изменить: ${task.text}`, ICON_EDIT));
    actions.append(iconButton('delete', `Удалить: ${task.text}`, ICON_DELETE));
    li.append(actions);
    return li;
  }

  function emptyText() {
    if (tasks.length === 0) return 'Список пуст. Запишите первую задачу — она сохранится в этом браузере.';
    if (filter === 'active') return 'Активных задач нет: всё сделано.';
    return 'Выполненных задач пока нет.';
  }

  function render() {
    const matching = store.filterTasks(tasks, filter);
    const visible = matching.slice(0, limit);
    els.list.replaceChildren(...visible.map(renderTask));
    freshId = null;

    els.empty.hidden = visible.length > 0;
    if (visible.length === 0) els.empty.textContent = emptyText();
    if (els.counter) els.counter.textContent = store.counterText(tasks);
    if (els.clear) els.clear.hidden = !tasks.some((task) => task.done);
    if (els.more) {
      const rest = matching.length - visible.length;
      els.more.hidden = rest <= 0;
      if (rest > 0) {
        els.more.textContent = `Ещё ${rest} ${store.plural(rest, 'задача', 'задачи', 'задач')} — в полном списке`;
      }
    }
    filterButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
    });
  }

  function startEdit(id) {
    if (!editable || !id) return;
    if (editingId && editingId !== id) finishEdit(true, false);
    editingId = id;
    const task = tasks.find((item) => item.id === id);
    const li = itemOf(id);
    if (!task || !li) {
      editingId = null;
      return;
    }
    li.replaceWith(renderTask(task));
    const field = itemOf(id)?.querySelector('[data-action="edit-field"]');
    field?.focus();
    field?.select();
  }

  // Меняем только одну строку, а не весь список: так щелчок по соседней задаче во время правки не теряется.
  function finishEdit(save, refocus) {
    if (!editingId) return;
    const id = editingId;
    const li = itemOf(id);
    const field = li?.querySelector('[data-action="edit-field"]');
    editingId = null;
    if (save && field && store.cleanText(field.value)) {
      persist(store.editTask(tasks, id, field.value));
    }
    const task = tasks.find((item) => item.id === id);
    if (li && task) li.replaceWith(renderTask(task));
    if (refocus) focusIn(id, '[data-action="edit"]');
  }

  function remove(id) {
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) return;
    const task = tasks[index];
    if (editingId === id) editingId = null;

    const visibleIds = [...els.list.children].map((li) => li.dataset.id);
    const position = visibleIds.indexOf(id);
    const neighbour = visibleIds[position + 1] ?? visibleIds[position - 1] ?? null;

    commit(store.removeTask(tasks, id));
    if (neighbour && itemOf(neighbour)) focusIn(neighbour, '[data-action="delete"]');
    else els.input.focus();

    notify('Задача удалена', {
      label: 'Вернуть',
      run: () => {
        if (tasks.some((item) => item.id === task.id)) return;
        commit(store.insertTask(tasks, task, index));
        focusIn(task.id, '[data-action="toggle"]');
      },
    });
  }

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const next = store.addTask(tasks, els.input.value);
    if (next === tasks) {
      els.input.value = '';
      els.input.classList.remove('is-shake');
      void els.input.offsetWidth; // перезапуск анимации
      els.input.classList.add('is-shake');
      els.input.focus();
      return;
    }
    freshId = next[0].id;
    if (filter === 'done') filter = 'all';
    els.input.value = '';
    commit(next);
    els.input.focus();
  });

  els.list.addEventListener('change', (event) => {
    if (event.target.dataset.action !== 'toggle') return;
    const id = idOf(event.target);
    if (editingId) finishEdit(true, false);
    commit(store.toggleTask(tasks, id));
    focusIn(id, '[data-action="toggle"]');
  });

  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const id = idOf(button);
    if (button.dataset.action === 'delete') remove(id);
    if (button.dataset.action === 'edit') startEdit(id);
  });

  els.list.addEventListener('dblclick', (event) => {
    if (event.target.closest('.task__text')) startEdit(idOf(event.target));
  });

  els.list.addEventListener('keydown', (event) => {
    if (event.target.dataset.action !== 'edit-field') return;
    if (event.key === 'Enter') {
      event.preventDefault();
      finishEdit(true, true);
    } else if (event.key === 'Escape') {
      finishEdit(false, true);
    }
  });

  els.list.addEventListener('focusout', (event) => {
    if (event.target.dataset.action === 'edit-field') finishEdit(true, false);
  });

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (editingId) finishEdit(true, false);
      filter = button.dataset.filter;
      render();
    });
  });

  els.clear?.addEventListener('click', () => {
    const removed = tasks.filter((task) => task.done);
    if (removed.length === 0) return;
    if (editingId) finishEdit(true, false);
    commit(store.clearDone(tasks));
    els.input.focus();
    notify(`Удалено: ${removed.length} ${store.plural(removed.length, 'задача', 'задачи', 'задач')}`, {
      label: 'Вернуть',
      run: () => {
        const present = new Set(tasks.map((task) => task.id));
        commit([...tasks, ...removed.filter((task) => !present.has(task.id))]);
      },
    });
  });

  // Список открыт в двух вкладках (например, главная и доска) — держим их одинаковыми.
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== store.STORAGE_KEY) return;
    if (editingId) finishEdit(false, false);
    tasks = store.loadTasks();
    render();
  });

  render();
}
