import { test, assert } from './harness.js';
import { renderScheme } from '../js/schematic.js';

function render() {
  const box = document.createElement('div');
  renderScheme(box);
  return box;
}

test('scheme draws the four electrodes and three sources with plus and minus poles', () => {
  const box = render();
  const texts = [...box.querySelectorAll('text')].map((e) => e.textContent);
  for (const label of ['K', 'G₁', 'G₂', 'A']) assert.ok(texts.includes(label), label + ' missing');
  assert.equal(texts.filter((s) => s === '+').length, 3 + 1); // three poles + the axis mark
  assert.equal(texts.filter((s) => s === '−').length, 3);
  assert.equal(box.querySelectorAll('line.plate-long').length, 3);
  assert.equal(box.querySelectorAll('line.plate-short').length, 3);
});

test('the long plate (plus) of the sources U1 and U2 faces the later electrode, that of U3 faces G2', () => {
  const box = render();
  const longs = [...box.querySelectorAll('line.plate-long')].map((l) => parseFloat(l.getAttribute('x1')));
  const shorts = [...box.querySelectorAll('line.plate-short')].map((l) => parseFloat(l.getAttribute('x1')));
  assert.ok(longs[0] > shorts[0], 'U1: plus on the G1 side');
  assert.ok(longs[1] > shorts[1], 'U2: plus on the G2 side');
  assert.ok(longs[2] < shorts[2], 'U3: plus on the G2 side (A is lower than G2)');
});

test('the potential is a linear ramp in each stretch: up by U1 and U2, down by U3 (uniform fields)', () => {
  const box = render();
  const pts = box.querySelector('polyline.phi').getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
  assert.equal(pts.length, 4, 'one vertex per electrode: K, G1, G2, A');
  const ys = pts.map((p) => p[1]);
  // SVG y grows downwards: a higher potential is a smaller y.
  assert.ok(ys[1] < ys[0], 'phi(G1) above phi(K)');
  assert.ok(ys[2] < ys[1], 'phi(G2) above phi(G1)');
  assert.ok(ys[3] > ys[2], 'phi(A) below phi(G2)');
  const xs = pts.map((p) => p[0]);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], 'no vertical steps: x strictly increases');
});

test('the three zone explanations are present', () => {
  const txt = render().textContent;
  assert.ok(txt.includes('φ(G₁) − φ(K)') && txt.includes('φ(G₂) − φ(G₁)') && txt.includes('φ(G₂) − φ(A)'));
});
