import { test, assert } from './harness.js';
import { planRecompute } from '../js/store.js';

const base = { gas: 'hg', tempC: 170, U3: 1.5, spread: 0.3, contact: 1, U2min: 0, U2max: 45, U2step: 0.25, electrons: 3000, seed: 1 };

test('first run computes the curve and, if wanted, the reference', () => {
  const p = planRecompute(null, base, true);
  assert.ok(p.main && p.ref);
  assert.ok(!planRecompute(null, base, false).ref);
});

test('unchanged settings need no work', () => {
  const p1 = planRecompute(null, base, true);
  const p2 = planRecompute(p1.keys, base, true);
  assert.ok(!p2.main && !p2.ref);
});

test('toggling the no-gas curve on only computes the reference', () => {
  const p1 = planRecompute(null, base, false);
  const p2 = planRecompute(p1.keys, base, true);
  assert.ok(!p2.main && p2.ref);
});

test('changing the Hg temperature recomputes the gas curve but not the reference', () => {
  const p1 = planRecompute(null, base, true);
  const p2 = planRecompute(p1.keys, { ...base, tempC: 150 }, true);
  assert.ok(p2.main && !p2.ref);
});

test('changing U3, spread, contact or gas recomputes both curves', () => {
  const p1 = planRecompute(null, base, true);
  for (const patch of [{ U3: 2 }, { spread: 0.5 }, { contact: 2 }, { gas: 'ne' }]) {
    const p2 = planRecompute(p1.keys, { ...base, ...patch }, true);
    assert.ok(p2.main && p2.ref, JSON.stringify(patch));
  }
});

test('turning the reference off requests no computation', () => {
  const p1 = planRecompute(null, base, true);
  const p2 = planRecompute(p1.keys, base, false);
  assert.ok(!p2.main && !p2.ref);
});
