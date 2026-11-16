import { mountTodo } from './todo-ui.js';
import { initTheme } from './theme.js';

// На главной показываем четыре последние задачи без правки: полный список — на доске.
mountTodo(document.querySelector('[data-todo-root]'), { limit: 4, editable: false });
initTheme(document.querySelector('[data-theme-toggle]'));
