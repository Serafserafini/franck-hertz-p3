import { test, assert } from './harness.js';
import { computeCurve } from '../js/compute.js';

test('computeCurve resolves on the main-thread path', async () => {
  const r = await computeCurve({ gas: 'hg', U2max: 3, U2step: 1, electrons: 50 }, 'test', { sync: true });
  assert.equal(r.U2.length, 4);
});

test('computeCurve rejects instead of hanging when the simulation throws', async () => {
  let err = null;
  try { await computeCurve({ gas: 'xx', U2max: 3, U2step: 1, electrons: 50 }, 'test', { sync: true }); }
  catch (e) { err = e; }
  assert.ok(err instanceof Error, 'expected a rejection');
});
