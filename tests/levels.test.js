import { test, assert } from './harness.js';
import { renderLevels } from '../js/levels.js';

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
