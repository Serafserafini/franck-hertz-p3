import { test, assert } from './harness.js';
import { idealProfile, POS } from '../js/profile.js';
import { formatSci, localizeNumber } from '../js/format.js';

test('gas off: energy accumulates and the electron reaches the anode', () => {
  const r = idealProfile({ U1: 1, U2: 12, U3: 1.5, gasId: 'hg', gasOn: false });
  assert.ok(r.reached);
  assert.close(r.finalE, 1 + 12 - 1.5, 1e-9);
  assert.equal(r.points[0].x, POS.K);
  assert.equal(r.points[r.points.length - 1].x, POS.A);
});

test('Hg with gas: two inelastic collisions at U2 = 12 V leave 0.7 eV at the anode', () => {
  const r = idealProfile({ U1: 0, U2: 12, U3: 1.5, gasId: 'hg', gasOn: true });
  assert.ok(r.reached);
  assert.close(r.finalE, 12 - 2 * 4.9 - 1.5, 1e-9);
});

test('Hg with gas: U2 = 10 V leaves 0.2 eV before G2 < U3, electron is stopped', () => {
  const r = idealProfile({ U1: 0, U2: 10, U3: 1.5, gasId: 'hg', gasOn: true });
  assert.ok(!r.reached);
  assert.equal(r.finalE, 0);
  const last = r.points[r.points.length - 1];
  assert.equal(last.E, 0);
  assert.between(last.x, POS.G2, POS.A);
});

test('profile x is non-decreasing and E is never negative', () => {
  const r = idealProfile({ U1: 1, U2: 25, U3: 3, gasId: 'hg', gasOn: true });
  for (let i = 1; i < r.points.length; i++) assert.ok(r.points[i].x >= r.points[i - 1].x);
  for (const p of r.points) assert.ok(p.E >= 0);
});

test('U2 = 0 with gas terminates', () => {
  const r = idealProfile({ U1: 1, U2: 0, U3: 1, gasId: 'hg', gasOn: true });
  assert.ok(r.points.length >= 3);
});

test('U1 >= dE with gas terminates', () => {
  const r = idealProfile({ U1: 4.5, U2: 20, U3: 1, gasId: 'hg', gasOn: true });
  assert.ok(r.points.length >= 3);
  const r2 = idealProfile({ U1: 30, U2: 10, U3: 1, gasId: 'hg', gasOn: true });
  assert.ok(r2.points.length >= 3);
});

test('Ne profile uses dE = 19 eV', () => {
  const r = idealProfile({ U1: 0, U2: 46, U3: 7, gasId: 'ne', gasOn: true });
  assert.ok(r.reached);
  assert.close(r.finalE, 46 - 2 * 19 - 7, 1e-9);
});

test('formatSci formats zero, ordinary and tiny numbers', () => {
  assert.equal(formatSci(0), '0');
  assert.equal(formatSci(0.5), '0.50');
  assert.equal(formatSci(1.23e-5), '1.2×10<sup>−5</sup>');
  assert.equal(formatSci(6e-84), '6.0×10<sup>−84</sup>');
});

test('localizeNumber turns decimal points into commas only for German', () => {
  assert.equal(localizeNumber('4.96 V', 'de'), '4,96 V');
  assert.equal(localizeNumber('4.96 V', 'en'), '4.96 V');
  assert.equal(localizeNumber('6.0×10<sup>−84</sup>', 'de'), '6,0×10<sup>−84</sup>');
  assert.equal(localizeNumber('Fig. 3 and 0.5', 'de'), 'Fig. 3 and 0,5');
  assert.equal(localizeNumber('https://doi.org/10.1119/1.2174033', 'de'), 'https://doi.org/10.1119/1.2174033');
});
