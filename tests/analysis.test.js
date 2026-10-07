import { test, assert } from './harness.js';
import { findExtrema, spacings, mean, EXTREMA_OPTIONS } from '../js/analysis.js';

function sine(period, n = 400, xmax = 40) {
  const x = [], y = [];
  for (let i = 0; i < n; i++) { const v = (i * xmax) / (n - 1); x.push(v); y.push(Math.sin((2 * Math.PI * v) / period)); }
  return { x, y };
}

test('finds maxima and minima of a sine with the right spacing', () => {
  const { x, y } = sine(5);
  const { maxima, minima } = findExtrema(x, y, { halfWindow: 1.5, prominence: 0.1 });
  assert.ok(maxima.length >= 6, 'maxima: ' + maxima.length);
  assert.close(mean(spacings(maxima)), 5, 0.1);
  assert.close(mean(spacings(minima)), 5, 0.1);
});

test('a monotonic rise followed by a plateau has no extrema', () => {
  const x = [], y = [];
  for (let i = 0; i < 200; i++) { x.push(i * 0.1); y.push(Math.min(i * 0.1, 5) / 5); }
  const { maxima, minima } = findExtrema(x, y);
  assert.equal(maxima.length, 0);
  assert.equal(minima.length, 0);
});

test('tiny noise on a plateau gives no extrema', () => {
  const x = [], y = [];
  for (let i = 0; i < 200; i++) { x.push(i * 0.1); y.push(Math.min(i * 0.1, 5) / 5 + 0.001 * Math.sin(7 * i)); }
  const r = findExtrema(x, y);
  assert.equal(r.maxima.length, 0);
  assert.equal(r.minima.length, 0);
});

test('an all-zero curve gives no extrema and no NaN', () => {
  const x = [], y = [];
  for (let i = 0; i < 100; i++) { x.push(i * 0.25); y.push(0); }
  const r = findExtrema(x, y);
  assert.equal(r.maxima.length, 0);
  assert.equal(r.minima.length, 0);
});

test('fewer than 3 points gives no extrema', () => {
  const r = findExtrema([0, 1], [0, 1]);
  assert.equal(r.maxima.length, 0);
  assert.equal(r.minima.length, 0);
  const e = findExtrema([], []);
  assert.equal(e.maxima.length, 0);
});

test('spacings of an empty or single list is empty', () => {
  assert.equal(spacings([]).length, 0);
  assert.equal(spacings([{ x: 1, y: 0 }]).length, 0);
});

test('mean of an empty list is NaN', () => {
  assert.ok(Number.isNaN(mean([])));
});

test('EXTREMA_OPTIONS defines both gases', () => {
  assert.ok(EXTREMA_OPTIONS.hg.halfWindow > 0);
  assert.ok(EXTREMA_OPTIONS.ne.halfWindow > EXTREMA_OPTIONS.hg.halfWindow);
});
