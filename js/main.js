import { initialLang, setLang } from './i18n.js';
import { initLevels } from './levels.js';
import { initTube } from './tube.js';
import { initCurve } from './curve.js';

function boot() {
  setLang(initialLang());
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('themechange'));
  });
  // Section modules are initialised here.
  initLevels();
  initTube();
  initCurve();
}

boot();
