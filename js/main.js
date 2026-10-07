import { initialLang, setLang } from './i18n.js';
import { state, update } from './store.js';
import { initLevels } from './levels.js';
import { initScheme } from './schematic.js';

function boot() {
  setLang(initialLang());
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  const gasSel = document.getElementById('global-gas');
  gasSel.value = state.gas;
  gasSel.addEventListener('input', () => update({ gas: gasSel.value }));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('themechange'));
  });
  // Section modules are initialised here (added by the following tasks).
  initLevels();
  initScheme();
}

boot();
