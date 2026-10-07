import { test, assert } from './harness.js';
import {
  GAS, LEVELS, hgVaporPressure, meanFreePath, thermalEnergyEV, wavelengthNm, boltzmannFactor,
} from '../js/physics.js';

test('Hg vapour pressure is in the table range at 150 and 190 degC', () => {
  assert.between(hgVaporPressure(150), 300, 450);
  assert.between(hgVaporPressure(190), 1200, 2000);
});

test('Hg vapour pressure increases monotonically with T', () => {
  assert.ok(hgVaporPressure(150) < hgVaporPressure(170));
  assert.ok(hgVaporPressure(170) < hgVaporPressure(190));
});

test('mean free path shrinks as Hg temperature rises', () => {
  assert.ok(meanFreePath('hg', 190) < meanFreePath('hg', 150));
});

test('mean free path is far below 1 mm for Hg at 170 degC', () => {
  assert.between(meanFreePath('hg', 170), 1e-6, 1e-4);
});

test('Ne mean free path is independent of the Hg temperature argument', () => {
  assert.equal(meanFreePath('ne', 150), meanFreePath('ne', 190));
});

test('unknown gas throws', () => {
  let threw = false;
  try { meanFreePath('xx', 100); } catch { threw = true; }
  assert.ok(threw);
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
    assert.close(hl[0].e, GAS[id].dE, 0.1);
    assert.ok(hl[0].e < LEVELS[id].ionization);
  }
});
