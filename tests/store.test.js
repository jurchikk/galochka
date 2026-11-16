import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as store from '../assets/js/store.js';

// Простая замена localStorage для тестов.
function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    dump: () => Object.fromEntries(data),
  };
}

test('добавление: новая задача встаёт первой и не выполнена', () => {
  const tasks = store.addTask(store.addTask([], 'Первая'), 'Вторая');
  assert.equal(tasks.length, 2);
  assert.equal(tasks[0].text, 'Вторая');
  assert.equal(tasks[0].done, false);
  assert.notEqual(tasks[0].id, tasks[1].id);
});

test('добавление: пустая строка и пробелы не создают задачу', () => {
  const tasks = [];
  assert.equal(store.addTask(tasks, ''), tasks);
  assert.equal(store.addTask(tasks, '   \n '), tasks);
});

test('добавление: текст чистится и обрезается до 200 символов', () => {
  const [task] = store.addTask([], `  много   пробелов  ${'я'.repeat(300)}`);
  assert.equal(task.text.startsWith('много пробелов'), true);
  assert.equal(task.text.length, store.MAX_LENGTH);
});

test('отметка: переключает только нужную задачу и не меняет исходный массив', () => {
  const tasks = store.addTask(store.addTask([], 'А'), 'Б');
  const next = store.toggleTask(tasks, tasks[1].id);
  assert.equal(next[1].done, true);
  assert.equal(next[0].done, false);
  assert.equal(tasks[1].done, false);
  assert.equal(store.toggleTask(next, tasks[1].id)[1].done, false);
});

test('удаление и возврат на прежнее место', () => {
  const tasks = ['В', 'Б', 'А'].reduce((list, text) => store.addTask(list, text), []);
  const removed = tasks[1];
  const without = store.removeTask(tasks, removed.id);
  assert.deepEqual(without.map((t) => t.text), ['А', 'В']);
  const restored = store.insertTask(without, removed, 1);
  assert.deepEqual(restored.map((t) => t.text), ['А', 'Б', 'В']);
});

test('правка: меняет текст, пустую правку отбрасывает', () => {
  const tasks = store.addTask([], 'Старый текст');
  const id = tasks[0].id;
  assert.equal(store.editTask(tasks, id, ' Новый  текст ')[0].text, 'Новый текст');
  assert.equal(store.editTask(tasks, id, '   '), tasks);
});

test('фильтр, счётчик и очистка выполненных', () => {
  let tasks = ['А', 'Б', 'В'].reduce((list, text) => store.addTask(list, text), []);
  tasks = store.toggleTask(tasks, tasks[0].id);
  assert.equal(store.filterTasks(tasks, 'all').length, 3);
  assert.equal(store.filterTasks(tasks, 'active').length, 2);
  assert.equal(store.filterTasks(tasks, 'done').length, 1);
  assert.equal(store.countActive(tasks), 2);
  assert.equal(store.clearDone(tasks).length, 2);
});

test('склонение и текст счётчика', () => {
  const words = (n) => store.plural(n, 'задача', 'задачи', 'задач');
  assert.equal(words(1), 'задача');
  assert.equal(words(3), 'задачи');
  assert.equal(words(5), 'задач');
  assert.equal(words(11), 'задач');
  assert.equal(words(21), 'задача');
  assert.equal(words(112), 'задач');

  assert.equal(store.counterText([]), 'Задач пока нет');
  const one = store.addTask([], 'А');
  assert.equal(store.counterText(one), 'Осталась 1 задача');
  assert.equal(store.counterText(store.addTask(one, 'Б')), 'Осталось 2 задачи');
  assert.equal(store.counterText(store.toggleTask(one, one[0].id)), 'Все задачи выполнены');
});

test('сохранение: список переживает «обновление страницы»', () => {
  const storage = fakeStorage({ [store.STORAGE_KEY]: '[]' });
  let tasks = store.addTask(store.loadTasks(storage), 'Купить хлеб');
  tasks = store.toggleTask(tasks, tasks[0].id);
  assert.equal(store.saveTasks(tasks, storage), true);

  const reloaded = store.loadTasks(storage);
  assert.deepEqual(reloaded, tasks);
});

test('первый визит: появляются задачи-подсказки, после удаления всех — не возвращаются', () => {
  const storage = fakeStorage();
  const first = store.loadTasks(storage);
  assert.equal(first.length, store.SEED_TEXTS.length);
  assert.deepEqual(store.loadTasks(storage), first);

  store.saveTasks([], storage);
  assert.deepEqual(store.loadTasks(storage), []);
});

test('битые данные в хранилище не роняют список', () => {
  assert.deepEqual(store.parseTasks('не json'), []);
  assert.deepEqual(store.parseTasks('{"a":1}'), []);
  assert.deepEqual(store.parseTasks(null), []);
  const mixed = JSON.stringify([{ id: 'x', text: 'Годная', done: true }, { id: 1, text: 'Без id' }, null, 'строка']);
  assert.deepEqual(store.parseTasks(mixed), [{ id: 'x', text: 'Годная', done: true, createdAt: 0 }]);
});

test('хранилище недоступно: сохранение возвращает false и не бросает ошибку', () => {
  const broken = {
    getItem: () => {
      throw new Error('доступ запрещён');
    },
    setItem: () => {
      throw new Error('нет места');
    },
  };
  assert.equal(store.saveTasks([], broken), false);
  assert.equal(store.loadTasks(broken).length, store.SEED_TEXTS.length);
  assert.equal(store.saveTasks([], null), false);
});
