import { test, assert } from './harness.js';
import { renderLevels } from '../js/levels.js';
import { renderOrbitals } from '../js/orbitals.js';
import { setLang } from '../js/i18n.js';

function textOf(render, gasId, ...rest) {
  const box = document.createElement('div');
  render(box, gasId, ...rest);
  return box.textContent;
}

test('Hg ladder shows the 253.7 nm line next to the transition energy', () => {
  assert.ok(textOf(renderLevels, 'hg', 295).includes('253.7 nm'));
});

test('Ne ladder shows no wavelength for the excitation arrow (3p -> ground is forbidden)', () => {
  const txt = textOf(renderLevels, 'ne', 295);
  assert.ok(!/\d\s*nm/.test(txt), 'Ne ladder text: ' + txt);
  assert.ok(txt.includes('ΔE'));
});

test('German ladder uses decimal commas', () => {
  try {
    setLang('de');
    const txt = textOf(renderLevels, 'hg', 295);
    assert.ok(txt.includes('253,7 nm'), txt);
    assert.ok(txt.includes('4,89 eV') && txt.includes('10,44 eV'), txt);
    assert.ok(!/\d\.\d/.test(txt), 'a decimal point is left: ' + txt);
  } finally { setLang('en'); }
});

test('the thermal marker uses a subscript tspan, not a literal underscore', () => {
  const box = document.createElement('div');
  renderLevels(box, 'hg', 295);
  assert.ok(!/k_B/.test(box.textContent));
  assert.ok(box.querySelector('tspan'));
});

test('orbital diagram: two columns, one box per orbital slot and spin arrows', () => {
  const box = document.createElement('div');
  renderOrbitals(box, 'hg');
  const rects = box.querySelectorAll('rect.box');
  assert.equal(rects.length, 2 * (1 + 3)); // ground and excited: 6s (1 box) + 6p (3 boxes)
  assert.ok(box.textContent.includes('6s') && box.textContent.includes('6p'));
  assert.ok(/↑/.test(box.textContent));
  const ne = document.createElement('div');
  renderOrbitals(ne, 'ne');
  assert.equal(ne.querySelectorAll('rect.box').length, 2 * (3 + 1 + 3)); // 2p, 3s, 3p
});
