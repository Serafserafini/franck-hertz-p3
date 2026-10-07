// A range input with a live value in <output id="{id}-out">; fmt(value) -> text.
export function makeSlider(id, fmt, onInput) {
  const el = document.getElementById(id);
  const out = document.getElementById(id + '-out');
  const api = {
    el,
    get value() { return parseFloat(el.value); },
    set(v) { el.value = v; api.refresh(); },
    range(min, max, step) { el.min = min; el.max = max; el.step = step; },
    refresh() { if (out) out.textContent = fmt(api.value); },
  };
  el.addEventListener('input', () => { api.refresh(); if (onInput) onInput(api.value); });
  api.refresh();
  return api;
}
