import { test, assert } from './harness.js';
import { modelParams, u2Grid, densityText, applyRanges } from '../js/params.js';
import { DEFAULTS, RANGES, GAS, lambdaOverL } from '../js/physics.js';
import { setLang } from '../js/i18n.js';

test('modelParams uses the gas defaults and allows overrides', () => {
  const p = modelParams('hg');
  assert.equal(p.U1, DEFAULTS.hg.U1);
  assert.equal(p.U3, DEFAULTS.hg.U3);
  assert.equal(p.dE, GAS.hg.dE);
  assert.close(p.lambda, lambdaOverL('hg', DEFAULTS.hg.density), 1e-12);
  const q = modelParams('ne', { U1: 3, density: 20 });
  assert.equal(q.U1, 3);
  assert.equal(q.U3, DEFAULTS.ne.U3);
  assert.close(q.lambda, lambdaOverL('ne', 20), 1e-12);
});

test('u2Grid runs from 0 to the U2 maximum in the U2 step', () => {
  const g = u2Grid('hg');
  const [, max, step] = RANGES.hg.U2;
  assert.equal(g[0], 0);
  assert.close(g[g.length - 1], max, 1e-9);
  assert.close(g[1] - g[0], step, 1e-12);
  assert.equal(g.length, Math.round(max / step) + 1);
});

test('densityText shows units and follows the language', () => {
  try {
    setLang('en');
    assert.equal(densityText('hg', 170), '170 °C');
    assert.equal(densityText('ne', 10.5), '10.5 hPa');
    setLang('de');
    assert.equal(densityText('ne', 10.5), '10,5 hPa');
  } finally { setLang('en'); }
});

test('applyRanges sets ranges and default values on the given sliders', () => {
  const calls = [];
  const mk = (name) => ({ range: (a, b, c) => calls.push([name, 'range', a, b, c]), set: (v) => calls.push([name, 'set', v]) });
  applyRanges('ne', { U1: mk('U1'), density: mk('density') });
  assert.equal(calls.length, 4);
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(['U1', 'range', 0, 18, 0.5]));
  assert.equal(JSON.stringify(calls[1]), JSON.stringify(['U1', 'set', 2]));
  assert.equal(JSON.stringify(calls[3]), JSON.stringify(['density', 'set', 10]));
});
