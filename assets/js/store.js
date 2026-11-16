// Логика списка задач без обращения к странице.
// Все функции возвращают новый массив и не меняют исходный — так их проще проверять тестами.

export const STORAGE_KEY = 'galochka.tasks.v1';
export const MAX_LENGTH = 200;

export const SEED_TEXTS = [
  'Запишите свою первую задачу в поле выше',
  'Отметьте эту задачу — нажмите на кружок слева',
  'Удалите лишнее — крестик справа',
];

let counter = 0;

export function makeId(now = Date.now()) {
  counter += 1;
  return `${now.toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cleanText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
}

export function createTask(text, now = Date.now()) {
  return { id: makeId(now), text: cleanText(text), done: false, createdAt: now };
}

// Новая задача встаёт первой: её видно сразу, даже если список длинный.
export function addTask(tasks, text, now = Date.now()) {
  const clean = cleanText(text);
  if (!clean) return tasks;
  return [createTask(clean, now), ...tasks];
}

export function toggleTask(tasks, id) {
  return tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
}

export function removeTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

// Пустой текст при правке не сохраняем: задача остаётся прежней.
export function editTask(tasks, id, text) {
  const clean = cleanText(text);
  if (!clean) return tasks;
  return tasks.map((task) => (task.id === id ? { ...task, text: clean } : task));
}

// Возвращает удалённую задачу на прежнее место (для кнопки «Вернуть»).
export function insertTask(tasks, task, index) {
  const position = Math.max(0, Math.min(index, tasks.length));
  return [...tasks.slice(0, position), task, ...tasks.slice(position)];
}

export function clearDone(tasks) {
  return tasks.filter((task) => !task.done);
}

export function filterTasks(tasks, filter) {
  if (filter === 'active') return tasks.filter((task) => !task.done);
  if (filter === 'done') return tasks.filter((task) => task.done);
  return tasks;
}

export function countActive(tasks) {
  return tasks.reduce((sum, task) => sum + (task.done ? 0 : 1), 0);
}

// Русское склонение: 1 задача, 2 задачи, 5 задач.
export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function counterText(tasks) {
  if (tasks.length === 0) return 'Задач пока нет';
  const active = countActive(tasks);
  if (active === 0) return 'Все задачи выполнены';
  const verb = plural(active, 'Осталась', 'Осталось', 'Осталось');
  return `${verb} ${active} ${plural(active, 'задача', 'задачи', 'задач')}`;
}

function isTask(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    value.text.trim() !== '' &&
    typeof value.done === 'boolean'
  );
}

// Читает сохранённую строку. Битые данные не роняют страницу: вернётся пустой список.
export function parseTasks(raw) {
  if (typeof raw !== 'string' || raw === '') return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isTask).map((task) => ({
      id: task.id,
      text: cleanText(task.text),
      done: task.done,
      createdAt: Number.isFinite(task.createdAt) ? task.createdAt : 0,
    }));
  } catch {
    return [];
  }
}

export function seedTasks(now = Date.now()) {
  return SEED_TEXTS.map((text, index) => createTask(text, now - index));
}

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// При самом первом визите показываем три задачи-подсказки.
// Если человек удалил всё сам, подсказки больше не возвращаются.
export function loadTasks(storage = defaultStorage(), now = Date.now()) {
  if (!storage) return seedTasks(now);
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return seedTasks(now);
  }
  if (raw === null) {
    const seeded = seedTasks(now);
    saveTasks(seeded, storage);
    return seeded;
  }
  return parseTasks(raw);
}

// Возвращает false, если браузер не дал сохранить (приватный режим, переполнение).
export function saveTasks(tasks, storage = defaultStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}
