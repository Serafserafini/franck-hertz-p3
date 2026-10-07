import { STRINGS } from './strings.js';
import { localizeNumber } from './format.js';

const KEY = 'fh-lang';
let lang = 'en';

// ?lang=de|en wins, then the stored choice, then the browser language.
export function initialLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'de') return q;
  } catch { /* no location: ignore */ }
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'en' || s === 'de') return s;
  } catch { /* storage blocked: ignore */ }
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function getLang() { return lang; }

export function t(key, vars) {
  const s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? localizeNumber(String(vars[k]), lang) : m));
}

// Number formatted for the current language: num(4.956, 2) -> "4.96" (EN) / "4,96" (DE).
export function num(x, digits) {
  const s = digits === undefined ? String(x) : Number(x).toFixed(digits);
  return localizeNumber(s, lang);
}

export function renderMath(root = document.body) {
  if (typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.documentElement.lang = lang;
  renderMath(root === document ? document.body : root);
}

export function setLang(next) {
  lang = next === 'de' ? 'de' : 'en';
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked: ignore */ }
  applyI18n();
  document.dispatchEvent(new CustomEvent('langchange'));
}
