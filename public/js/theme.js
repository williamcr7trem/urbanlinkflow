/* Independent presentation preference; does not touch authentication or APIs. */
(() => {
  'use strict';
  const root = document.documentElement;
  const key = 'urbanlink_tema';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(key); } catch (_) { /* private mode */ }
  if (!['light', 'dark'].includes(preference)) preference = null;
  const current = () => preference || (system.matches ? 'dark' : 'light');
  function render() {
    const dark = current() === 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    const color = document.querySelector('meta[name="theme-color"]');
    if (color) color.content = dark ? '#101725' : '#f4f6fb';
    document.querySelectorAll('img[src$="/logo.png"], img[src$="/logo-dark.png"]').forEach(img => {
      const next = dark ? './assets/logo-dark.png' : './assets/logo.png';
      if (img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
    document.querySelectorAll('.theme-toggle').forEach(button => {
      const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  }
  render();
  document.addEventListener('DOMContentLoaded', () => {
    render();
    document.querySelectorAll('.theme-toggle').forEach(button => button.addEventListener('click', () => {
      preference = current() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, preference); } catch (_) { /* keep session preference */ }
      render();
    }));
  });
  system.addEventListener('change', () => { if (!preference) render(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
      render();
    }
  });
})();
