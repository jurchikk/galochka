// Переключатель светлой и тёмной темы. Пока человек не нажал кнопку, сайт следует теме устройства.

const KEY = 'galochka.theme';
const BAR_COLOR = { light: '#f3f4f6', dark: '#0e1013' };

export function initTheme(button) {
  if (!button) return;
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const current = () => root.dataset.theme || (media.matches ? 'dark' : 'light');

  const sync = () => {
    button.setAttribute('aria-pressed', String(current() === 'dark'));
    // Тема выбрана вручную — красим и строку браузера на телефоне, иначе она останется в теме устройства.
    if (root.dataset.theme) {
      metas.forEach((meta) => {
        meta.removeAttribute('media');
        meta.setAttribute('content', BAR_COLOR[root.dataset.theme]);
      });
    }
  };

  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // хранилище недоступно: тема сменится только до перезагрузки
    }
    sync();
  });

  media.addEventListener('change', sync);
  sync();
}
