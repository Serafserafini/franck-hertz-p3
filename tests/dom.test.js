import { test, assert } from './harness.js';
import { svgText, wrapText } from '../js/dom.js';

test('svgText renders _X as a subscript tspan and keeps the plain text', () => {
  const el = svgText({ x: 1, y: 2 }, 'k_BT = 0.025 eV');
  assert.equal(el.textContent, 'kBT = 0.025 eV');
  const subs = el.querySelectorAll('tspan');
  assert.equal(subs.length, 1);
  assert.equal(subs[0].textContent, 'B');
  assert.equal(subs[0].getAttribute('baseline-shift'), 'sub');
  assert.equal(el.getAttribute('x'), '1');
});

test('svgText leaves text without underscores untouched', () => {
  const el = svgText({}, 'ΔE = 4.89 eV');
  assert.equal(el.querySelectorAll('tspan').length, 0);
  assert.equal(el.textContent, 'ΔE = 4.89 eV');
});

test('wrapText breaks lines so that none exceeds the width', () => {
  const measure = (s) => s.length * 7;
  const lines = wrapText(measure, 'Violett: Anregungszonen (UV bei 253,7 nm, unsichtbar)', 150);
  assert.ok(lines.length >= 2, 'lines: ' + lines.length);
  for (const l of lines) assert.ok(measure(l) <= 150, `too wide: "${l}"`);
  assert.equal(lines.join(' '), 'Violett: Anregungszonen (UV bei 253,7 nm, unsichtbar)');
});

test('wrapText keeps short text on one line and survives an over-long word', () => {
  const measure = (s) => s.length * 7;
  assert.equal(wrapText(measure, 'short', 150).length, 1);
  const long = wrapText(measure, 'Donaudampfschifffahrtsgesellschaft x', 60);
  assert.ok(long.length >= 2);
  assert.equal(wrapText(measure, '', 100).length, 0);
});
