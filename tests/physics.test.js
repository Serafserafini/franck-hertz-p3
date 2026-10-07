import { test, assert } from './harness.js';
import {
  GAS, LEVELS, hgVaporPressure, thermalEnergyEV, wavelengthNm, boltzmannFactor,
  LAMBDA_REF, lambdaOverL, DEFAULTS, RANGES, ORBITALS,
} from '../js/physics.js';

test('Hg vapour pressure is in the table range at 150 and 190 degC', () => {
  assert.between(hgVaporPressure(150), 300, 450);
  assert.between(hgVaporPressure(190), 1200, 2000);
});

test('Hg vapour pressure increases monotonically with T', () => {
  assert.ok(hgVaporPressure(150) < hgVaporPressure(170));
  assert.ok(hgVaporPressure(170) < hgVaporPressure(190));
});

test('thermal energy at room temperature is about 0.025 eV', () => {
  assert.close(thermalEnergyEV(293.15), 0.0253, 0.0005);
});

test('4.887 eV corresponds to about 253.7 nm', () => {
  assert.close(wavelengthNm(4.887), 253.7, 0.5);
});

test('Boltzmann factor is tiny at room temperature and approaches 1 when kT >> dE', () => {
  assert.ok(boltzmannFactor(4.89, 295) < 1e-80);
  assert.ok(boltzmannFactor(4.89, 1e7) > 0.99);
});

test('each gas has exactly one highlighted level, close to the model dE', () => {
  for (const id of ['hg', 'ne']) {
    const hl = LEVELS[id].levels.filter((l) => l.highlight);
    assert.equal(hl.length, 1);
    assert.close(hl[0].e, GAS[id].dE, id === 'hg' ? 0.1 : 0.5);
    assert.ok(hl[0].e < LEVELS[id].ionization);
  }
});

test('the highlighted Hg level gives the 253.7 nm line', () => {
  const hl = LEVELS.hg.levels.find((l) => l.highlight);
  assert.equal(wavelengthNm(hl.e).toFixed(1), '253.7');
  assert.equal(hl.e.toFixed(2), '4.89');
});

test('the Ne 2p5 3p group is placed inside its real range (18.4-19.0 eV)', () => {
  const hl = LEVELS.ne.levels.find((l) => l.highlight);
  assert.between(hl.e, 18.4, 19.0);
});

test('lambdaOverL is the reference value at 170 degC (Hg) and 10 hPa (Ne)', () => {
  assert.close(lambdaOverL('hg', 170), LAMBDA_REF, 1e-12);
  assert.close(lambdaOverL('ne', 10), LAMBDA_REF, 1e-12);
});

test('lambdaOverL shrinks with Hg temperature and with Ne pressure', () => {
  assert.ok(lambdaOverL('hg', 150) > lambdaOverL('hg', 170));
  assert.ok(lambdaOverL('hg', 170) > lambdaOverL('hg', 190));
  assert.close(lambdaOverL('ne', 20), LAMBDA_REF / 2, 1e-12);
});

test('lambdaOverL rejects unknown gases and non-positive Ne pressure', () => {
  let n = 0;
  try { lambdaOverL('xx', 1); } catch { n++; }
  try { lambdaOverL('ne', 0); } catch { n++; }
  try { lambdaOverL('ne', -3); } catch { n++; }
  assert.equal(n, 3);
});

test('defaults lie inside the slider ranges and U1 stays below dE', () => {
  for (const id of ['hg', 'ne']) {
    for (const k of ['U1', 'U2', 'U3', 'density']) {
      const [lo, hi, step] = RANGES[id][k];
      assert.between(DEFAULTS[id][k], lo, hi, `${id}.${k}`);
      assert.ok(step > 0);
    }
    assert.ok(RANGES[id].U1[1] < GAS[id].dE, id + ': U1 max must stay below dE');
  }
});

test('ground and excited orbital diagrams hold the same number of electrons', () => {
  const count = (groups) => groups.reduce((s, g) => s + g.boxes.reduce((a, b) => a + (b === 3 ? 2 : b === 0 ? 0 : 1), 0), 0);
  for (const id of ['hg', 'ne']) {
    assert.equal(count(ORBITALS[id].ground), count(ORBITALS[id].excited), id);
    assert.ok(count(ORBITALS[id].ground) > 0);
  }
});
