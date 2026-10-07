import { test, assert } from './harness.js';
import { simulate, traceElectrons, mulberry32, transmission } from '../js/montecarlo.js';
import { findExtrema, spacings, mean } from '../js/analysis.js';

const fast = { U2step: 0.25, electrons: 2000, seed: 1 };

test('seeded RNG is reproducible', () => {
  const a = mulberry32(5), b = mulberry32(5);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('simulate is reproducible for equal params', () => {
  const r1 = simulate({ gas: 'hg', tempC: 170, U2max: 10, ...fast });
  const r2 = simulate({ gas: 'hg', tempC: 170, U2max: 10, ...fast });
  assert.equal(JSON.stringify(r1.IA), JSON.stringify(r2.IA));
});

test('no-gas curve rises monotonically (no dips)', () => {
  const { IA } = simulate({ gas: 'hg', noGas: true, U2max: 45, ...fast });
  for (let i = 1; i < IA.length; i++) assert.ok(IA[i] >= IA[i - 1] - 1e-9, 'dip at index ' + i);
  assert.ok(IA[IA.length - 1] > 0.75);
});

test('transmission is 0 below U3 and tends to 1 for large E', () => {
  assert.equal(transmission(1, 1.5), 0);
  assert.close(transmission(1e6, 1.5), 1, 1e-2);
  assert.ok(transmission(10, 1.5) < transmission(20, 1.5));
});

test('Hg 170 degC: maxima spacing is close to 4.9 V', () => {
  const { U2, IA } = simulate({ gas: 'hg', tempC: 170, U2max: 45, ...fast });
  const { maxima, minima } = findExtrema(U2, IA);
  assert.ok(maxima.length >= 5, 'maxima count ' + maxima.length);
  assert.between(mean(spacings(maxima)), 4.6, 5.2);
  assert.between(mean(spacings(minima)), 4.6, 5.2);
});

test('Hg: first maximum sits near dE + contact', () => {
  const { U2, IA } = simulate({ gas: 'hg', tempC: 170, U3: 1.5, contact: 1.0, U2max: 45, ...fast });
  const { maxima } = findExtrema(U2, IA);
  assert.between(maxima[0].x, 4.5, 7.0);
});

test('contact potential shifts positions but not spacings', () => {
  const a = simulate({ gas: 'hg', contact: 0.5, U2max: 45, ...fast });
  const b = simulate({ gas: 'hg', contact: 2.5, U2max: 45, ...fast });
  const ea = findExtrema(a.U2, a.IA).maxima, eb = findExtrema(b.U2, b.IA).maxima;
  assert.close(eb[0].x - ea[0].x, 2.0, 0.6);
  assert.close(mean(spacings(eb)), mean(spacings(ea)), 0.2);
});

test('Ne: maxima spacing is close to 19 V', () => {
  const { U2, IA } = simulate({ gas: 'ne', U3: 7, U2max: 90, U2step: 0.5, electrons: 2000, seed: 1 });
  const { maxima } = findExtrema(U2, IA, { halfWindow: 5, prominence: 0.03 });
  assert.ok(maxima.length >= 3, 'maxima count ' + maxima.length);
  assert.between(mean(spacings(maxima)), 17.5, 20.5);
});

test('contrast of the oscillations grows with Hg temperature', () => {
  const contrast = (tempC) => {
    const { U2, IA } = simulate({ gas: 'hg', tempC, U2max: 40, ...fast });
    const e = findExtrema(U2, IA, { halfWindow: 1.5, prominence: 0.03 });
    return mean(e.maxima.map((m) => m.y)) - mean(e.minima.map((m) => m.y));
  };
  assert.ok(contrast(190) > contrast(170));
  assert.ok(contrast(170) > contrast(150));
});

test('minima do not reach zero', () => {
  const { U2, IA } = simulate({ gas: 'hg', tempC: 170, U2max: 40, ...fast });
  const { minima } = findExtrema(U2, IA);
  assert.ok(minima.length > 0);
  for (const m of minima) assert.ok(m.y > 0);
});

test('Ne results do not depend on the Hg temperature argument', () => {
  const a = simulate({ gas: 'ne', tempC: 150, U2max: 30, U2step: 1, electrons: 500 });
  const b = simulate({ gas: 'ne', tempC: 190, U2max: 30, U2step: 1, electrons: 500 });
  assert.equal(JSON.stringify(a.IA), JSON.stringify(b.IA));
});

test('traceElectrons returns tracks within [0,1] and excitations', () => {
  const { tracks, excitations } = traceElectrons({ gas: 'hg', tempC: 170 }, 20, 10, 500);
  assert.equal(tracks.length, 10);
  for (const t of tracks) for (const [x, E] of t.pts) { assert.between(x, 0, 1); assert.ok(E >= 0); }
  assert.ok(excitations.length > 0);
  for (const x of excitations) assert.between(x, 0, 1);
});

test('Ne excitations cluster in separated layers at U2 = 45 V', () => {
  const { excitations } = traceElectrons({ gas: 'ne' }, 45, 1, 4000);
  const bins = new Array(20).fill(0);
  for (const x of excitations) bins[Math.min(19, Math.floor(x * 20))]++;
  const peaks = bins.filter((c, i) => c > 0.5 * Math.max(...bins) && (i === 0 || c >= bins[i - 1]) && (i === 19 || c >= bins[i + 1]));
  assert.ok(peaks.length >= 2, 'peaks ' + peaks.length);
});
