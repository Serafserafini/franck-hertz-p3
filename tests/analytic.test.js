import { test, assert } from './harness.js';
import {
  transmission, thresholds, idealFinalEnergy, idealCurrent, idealNoGasCurrent, noGasCurrent, idealSawtooth,
  eventProbabilities, realCurrent, realCurve, missedFraction, excitationDensity, expectedEnergyProfile,
  quantileElectrons, positionAlong, noGasPath,
} from '../js/analytic.js';
import { findExtrema, spacings, mean } from '../js/analysis.js';

const hg = { U1: 1, U3: 1.5, dE: 4.9 };
const grid = (max, step) => Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

test('thresholds are x_n = (n dE - U1)/U2 inside the gap', () => {
  const x = thresholds(1, 12, 4.9);
  assert.equal(x.length, 2);
  assert.close(x[0], 3.9 / 12, 1e-12);
  assert.close(x[1], 8.8 / 12, 1e-12);
  assert.equal(thresholds(1, 0, 4.9).length, 0);
  assert.equal(thresholds(1, 3, 4.9).length, 0);
});

test('thresholds terminate and stay in [0,1) even for U1 >= dE', () => {
  const x = thresholds(30, 10, 4.9);
  for (const v of x) assert.between(v, 0, 0.999999);
  assert.ok(x.length <= 9);
});

test('ideal sawtooth: final energy and anode current', () => {
  assert.close(idealFinalEnergy(1, 12, 4.9), 13 - 9.8, 1e-12);
  assert.equal(idealCurrent(1, 12, 1.5, 4.9), 1);
  assert.close(idealFinalEnergy(1, 10, 4.9), 11 - 9.8, 1e-12);
  assert.equal(idealCurrent(1, 10, 1.5, 4.9), 0);
});

test('ideal sawtooth polyline starts at U1, resets to 0 at each threshold and ends at the final energy', () => {
  const pts = idealSawtooth(1, 12, 4.9);
  assert.equal(pts[0].E, 1);
  assert.equal(pts.filter((p) => p.E === 0).length, 2);
  assert.close(pts[pts.length - 1].E, 3.2, 1e-12);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].x >= pts[i - 1].x);
});

test('no gas: ideal step and real smooth rise', () => {
  assert.equal(idealNoGasCurrent(1, 0.2, 1.5), 0);
  assert.equal(idealNoGasCurrent(1, 0.5, 1.5), 1);
  let prev = -1;
  for (const U2 of grid(40, 0.5)) { const I = noGasCurrent(1, U2, 1.5); assert.ok(I >= prev - 1e-12); prev = I; }
  assert.equal(noGasCurrent(1, 0.2, 1.5), 0);
  assert.ok(noGasCurrent(1, 40, 1.5) > 0.7 && noGasCurrent(1, 40, 1.5) < 1);
});

test('transmission is 0 up to U3 and tends to 1', () => {
  assert.equal(transmission(1.5, 1.5), 0);
  assert.close(transmission(1e6, 1.5), 1, 2e-3);
});

test('collision-count probabilities are non-negative and sum to 1', () => {
  for (const [U2, lambda] of [[12, 0.08], [20, 0.2], [33, 0.02], [5, 0.5]]) {
    const P = eventProbabilities(1, U2, 4.9, lambda);
    for (const p of P) assert.ok(p >= 0);
    assert.close(P.reduce((a, b) => a + b, 0), 1, 1e-9);
  }
});

test('lambda -> 0 reproduces the ideal collision count', () => {
  const P = eventProbabilities(1, 12, 4.9, 0.001);
  assert.close(P[2], 1, 0.01);
  const I = realCurrent({ ...hg, U2: 12, lambda: 0.001 });
  assert.close(I, 1 - Math.sqrt(1.5 / 3.2), 0.02);
});

test('large lambda means few collisions: the current approaches the no-gas current', () => {
  const I = realCurrent({ ...hg, U2: 12, lambda: 1e4 });
  assert.close(I, noGasCurrent(1, 12, 1.5), 0.02);
});

test('real curve (Hg, lambda 0.08): maxima are about dE apart and minima are not zero', () => {
  const U2s = grid(45, 0.25);
  const I = realCurve({ ...hg, lambda: 0.08 }, U2s);
  const e = findExtrema(U2s, I, { halfWindow: 1.5, prominence: 0.03 });
  assert.ok(e.maxima.length >= 5, 'maxima ' + e.maxima.length);
  assert.between(mean(spacings(e.maxima)), 4.6, 5.2);
  assert.between(mean(spacings(e.minima)), 4.6, 5.2);
  for (const m of e.minima) assert.ok(m.y > 0.001);
});

test('minima rise with the mean free path (lower gas pressure fills the dips)', () => {
  const U2s = grid(40, 0.25);
  const floor = (lambda) => {
    const I = realCurve({ ...hg, lambda }, U2s);
    const e = findExtrema(U2s, I, { halfWindow: 1.5, prominence: 0.02 });
    return mean(e.minima.map((m) => m.y));
  };
  assert.ok(floor(0.04) < floor(0.08));
  assert.ok(floor(0.08) < floor(0.2));
});

test('first peak position shifts with U1 but the spacing stays dE', () => {
  const U2s = grid(40, 0.25);
  const peaks = (U1) => findExtrema(U2s, realCurve({ U1, U3: 1.5, dE: 4.9, lambda: 0.05 }, U2s), { halfWindow: 1.5, prominence: 0.03 }).maxima;
  const a = peaks(0.5), b = peaks(2.5);
  const shifts = b.slice(1, 4).map((m, i) => m.x - a.slice(1, 4)[i].x);
  for (const s of shifts) assert.close(s, -2, 0.6);
  assert.close(mean(spacings(a)), mean(spacings(b)), 0.3);
});

test('missed fraction grows with lambda and is 0 when no collision is possible', () => {
  assert.ok(missedFraction(1, 20, 4.9, 0.02) < missedFraction(1, 20, 4.9, 0.2));
  assert.equal(missedFraction(1, 3, 4.9, 0.1), 0);
});

test('U2 = 0 and U1 above dE give finite results', () => {
  assert.ok(Number.isFinite(realCurrent({ ...hg, U2: 0, lambda: 0.08 })));
  const I = realCurrent({ U1: 30, U3: 1.5, dE: 4.9, U2: 10, lambda: 0.08 });
  assert.ok(Number.isFinite(I) && I >= 0 && I <= 1);
  assert.ok(Number.isFinite(missedFraction(30, 10, 4.9, 0.08)));
});

test('a non-positive or non-finite mean free path gives no NaN: it is rejected', () => {
  let n = 0;
  for (const lambda of [0, -0.1, NaN, Infinity]) {
    try { realCurrent({ ...hg, U2: 20, lambda }); } catch { n++; }
  }
  assert.equal(n, 4);
});

test('expected energy profile ends at U1 + U2 - dE * E[N] and starts at U1', () => {
  const U1 = 1, U2 = 20, dE = 4.9, lambda = 0.1;
  const prof = expectedEnergyProfile({ U1, U2, dE, lambda }, 300);
  const P = eventProbabilities(U1, U2, dE, lambda, 300);
  const EN = P.reduce((s, p, n) => s + n * p, 0);
  assert.equal(prof.E[0], U1);
  assert.close(prof.E[prof.E.length - 1], U1 + U2 - dE * EN, 1e-9);
  for (const E of prof.E) assert.ok(E >= -1e-9);
});

test('excitation density integrates to the expected number of collisions and is 0 before the first threshold', () => {
  const U1 = 1, U2 = 20, dE = 4.9, lambda = 0.1, bins = 120;
  const d = excitationDensity({ U1, U2, dE, lambda }, bins);
  const EN = eventProbabilities(U1, U2, dE, lambda, bins).reduce((s, p, n) => s + n * p, 0);
  assert.close(d.reduce((a, b) => a + b, 0) / bins, EN, 1e-9);
  const x1 = thresholds(U1, U2, dE)[0];
  for (let j = 0; j < Math.floor(x1 * bins) - 1; j++) assert.equal(d[j], 0);
});

test('quantile electrons are deterministic, ordered and keep non-negative energies', () => {
  const p = { U1: 1, U2: 20, dE: 4.9, lambda: 0.1 };
  const a = quantileElectrons(p, 24), b = quantileElectrons(p, 24);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.length, 24);
  for (const el of a) {
    for (let i = 1; i < el.pts.length; i++) assert.ok(el.pts[i][0] >= el.pts[i - 1][0] - 1e-12);
    for (const [x, E] of el.pts) { assert.between(x, 0, 1); assert.ok(E >= -1e-9); }
    assert.close(el.finalE, 1 + 20 - el.events.length * 4.9, 1e-9);
  }
});

test('quantile electrons reproduce the collision statistics of the model', () => {
  const p = { U1: 1, U2: 20, dE: 4.9, lambda: 0.1 };
  const els = quantileElectrons(p, 400);
  const meanN = els.reduce((s, e) => s + e.events.length, 0) / els.length;
  const EN = eventProbabilities(1, 20, 4.9, 0.1).reduce((s, q, n) => s + n * q, 0);
  assert.close(meanN, EN, 0.2);
});

test('positionAlong interpolates and clamps', () => {
  const pts = [[0, 1], [1, 5], [1, 0], [1, 3]];
  assert.close(positionAlong(pts, 0.5).x, 0.5, 1e-12);
  assert.close(positionAlong(pts, 0.5).E, 3, 1e-12);
  assert.close(positionAlong(pts, -3).E, 1, 1e-12);
  assert.close(positionAlong(pts, 99).E, 3, 1e-12);
});

test('noGasPath: passing electrons cross the decelerating zone, others turn back', () => {
  const ok = noGasPath(1, 12, 1.5);
  assert.ok(ok.passes);
  assert.close(ok.pts[ok.pts.length - 1][1], 13 - 1.5, 1e-12);
  const no = noGasPath(1, 0.2, 1.5);
  assert.ok(!no.passes);
  assert.equal(no.pts[no.pts.length - 1][0], 0);
  assert.ok(no.pts[2][0] > 1 && no.pts[2][0] < 1.3);
});
