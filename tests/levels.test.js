import { test, assert } from './harness.js';
import { renderLevels } from '../js/levels.js';
import { setLang } from '../js/i18n.js';

function textOf(gasId) {
  const box = document.createElement('div');
  renderLevels(box, gasId, 295);
  return box.textContent;
}

test('Hg ladder shows the 253.7 nm line next to the transition energy', () => {
  assert.ok(textOf('hg').includes('253.7 nm'));
});

test('Ne ladder shows no wavelength for the excitation arrow (3p -> ground is forbidden)', () => {
  const txt = textOf('ne');
  assert.ok(!/\d\s*nm/.test(txt), 'Ne ladder text: ' + txt);
  assert.ok(txt.includes('ΔE'));
});

test('German ladder uses decimal commas', () => {
  try {
    setLang('de');
    const txt = textOf('hg');
    assert.ok(txt.includes('253,7 nm'), txt);
    assert.ok(txt.includes('4,89 eV') && txt.includes('10,44 eV'), txt);
    assert.ok(!/\d\.\d/.test(txt), 'a decimal point is left: ' + txt);
  } finally { setLang('en'); }
});
