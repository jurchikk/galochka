import { mountTodo } from './todo-ui.js';
import { initTheme } from './theme.js';

mountTodo(document.querySelector('[data-todo-root]'));
initTheme(document.querySelector('[data-theme-toggle]'));

const today = document.querySelector('[data-today]');
if (today) {
  const text = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  today.textContent = text.charAt(0).toUpperCase() + text.slice(1);
}
