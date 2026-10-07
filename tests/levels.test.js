import { test, assert } from './harness.js';
import { renderLevels } from '../js/levels.js';
import { renderTerms } from '../js/terms.js';
import { setLang } from '../js/i18n.js';

function textOf(render, gasId, ...rest) {
  const box = document.createElement('div');
  render(box, gasId, ...rest);
  return box.textContent;
}

test('Hg ladder shows the 253.7 nm line next to the transition energy', () => {
  assert.ok(textOf(renderLevels, 'hg', 295).includes('253.7 nm'));
});

test('Ne ladder shows no wavelength for the excitation arrow (3p -> ground is forbidden)', () => {
  const txt = textOf(renderLevels, 'ne', 295);
  assert.ok(!/\d\s*nm/.test(txt), 'Ne ladder text: ' + txt);
  assert.ok(txt.includes('ΔE'));
});

test('German ladder uses decimal commas', () => {
  try {
    setLang('de');
    const txt = textOf(renderLevels, 'hg', 295);
    assert.ok(txt.includes('253,7 nm'), txt);
    assert.ok(txt.includes('4,89 eV') && txt.includes('10,44 eV'), txt);
    assert.ok(!/\d\.\d/.test(txt), 'a decimal point is left: ' + txt);
  } finally { setLang('en'); }
});

test('the thermal marker uses a subscript tspan, not a literal underscore', () => {
  const box = document.createElement('div');
  renderLevels(box, 'hg', 295);
  assert.ok(!/k_B/.test(box.textContent));
  assert.ok(box.querySelector('tspan'));
});

test('term diagram compares H (three degenerate p boxes, one electron) with the Hg 6s6p levels', () => {
  const box = document.createElement('div');
  renderTerms(box);
  assert.equal(box.querySelectorAll('rect.box').length, 3 + 1); // H: px, py, pz; Hg: 6s2 box
  const txt = box.textContent;
  for (const s of ['¹S₀', '¹P₁', '³P₀', '³P₁', '³P₂', '4.9 eV']) assert.ok(txt.includes(s), s);
  assert.equal(box.querySelectorAll('line.level.hl').length, 1, 'only 3P1 is highlighted');
});

function ktBar(gas, T) {
  const box = document.createElement('div');
  renderLevels(box, gas, T);
  return { box, bar: box.querySelector('rect.kt-bar') };
}

test('thermal energy is a bar on the right whose height grows in proportion to kT', () => {
  const h = (T) => parseFloat(ktBar('hg', T).bar.getAttribute('height'));
  assert.ok(h(295) >= 1, 'even the room-temperature bar must be visible');
  assert.ok(h(295) < h(3000));
  assert.close(h(30000) / h(3000), 10, 0.2);
  assert.equal(ktBar('hg', 295).box.querySelectorAll('circle').length, 0, 'no dot marker any more');
});

test('the kT label sits on top of the bar, right of every level label', () => {
  for (const gas of ['hg', 'ne']) {
    for (const T of [295, 5000, 40000]) {
      const { box, bar } = ktBar(gas, T);
      const label = [...box.querySelectorAll('text')].find((e) => /k.*T =/.test(e.textContent));
      assert.ok(label, 'label missing');
      assert.ok(parseFloat(label.getAttribute('y')) < parseFloat(bar.getAttribute('y')), `${gas} ${T}: label must be above the bar top`);
      const others = [...box.querySelectorAll('text')].filter((e) => e !== label).map((e) => parseFloat(e.getAttribute('x')));
      assert.ok(parseFloat(bar.getAttribute('x')) > Math.max(...others) + 150, `${gas} ${T}: bar must lie right of all other text`);
      assert.equal(label.getAttribute('text-anchor'), 'end');
    }
  }
});
