import { test, assert } from './harness.js';
import { STRINGS } from '../js/strings.js';
import { t, num, setLang } from '../js/i18n.js';

const keysOf = (o) => Object.keys(o).sort();
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('EN and DE define exactly the same keys', () => {
  const en = keysOf(STRINGS.en), de = keysOf(STRINGS.de);
  const missingInDe = en.filter((k) => !(k in STRINGS.de));
  const missingInEn = de.filter((k) => !(k in STRINGS.en));
  assert.equal(missingInDe.length + missingInEn.length, 0,
    `missing in DE: ${missingInDe.join(', ')} | missing in EN: ${missingInEn.join(', ')}`);
});

test('no string is empty', () => {
  for (const lang of ['en', 'de']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(v.trim().length > 0, `${lang}:${k} empty`);
  }
});

test('both languages use the same {placeholders} per key', () => {
  for (const k of Object.keys(STRINGS.en)) {
    assert.equal(placeholders(STRINGS.de[k] || ''), placeholders(STRINGS.en[k]), 'placeholders differ for ' + k);
  }
});

test('t() replaces known placeholders, keeps unknown braces, falls back to the key', () => {
  const s = t('idea.result', { kt: '0.025', bf: 'X' });
  assert.ok(s.includes('0.025') && s.includes('X'));
  assert.ok(s.includes('\\Delta'), 'math must survive');
  assert.equal(t('does.not.exist'), 'does.not.exist');
});

test('every data-i18n key used in index.html exists in both languages', async () => {
  const html = await (await fetch('../index.html')).text();
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20, 'found only ' + keys.length + ' keys');
  const missing = keys.filter((k) => !(k in STRINGS.en) || !(k in STRINGS.de));
  assert.equal(missing.length, 0, 'missing: ' + missing.join(', '));
});

test('index.html loads no remote scripts or stylesheets', async () => {
  const html = await (await fetch('../index.html')).text();
  const remote = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]*"/g)];
  assert.equal(remote.length, 0, 'remote resources: ' + remote.map((m) => m[0]).join(' | '));
});

test('content stays in scope: no uncertainty, safety or instrument-handling wording', () => {
  const banned = /uncertaint|Messunsicherheit|safety|Sicherheit|goggles|Schutzbrille|oscilloscope|Oszilloskop|XY recorder|CAL\/VAR/i;
  for (const lang of ['en', 'de']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(!banned.test(v), `${lang}:${k} is out of scope`);
  }
});

test('every explanatory section carries a theory link in both languages', () => {
  for (const lang of ['en', 'de']) {
    for (const k of ['idea.theory', 'tube.theory', 'curve.theory', 'delta.theory']) {
      assert.ok(STRINGS[lang][k] && STRINGS[lang][k].includes('<a href="https://'), `${lang}:${k} missing link`);
    }
  }
});

test('German output uses decimal commas for numbers passed to t() and num()', () => {
  try {
    setLang('de');
    assert.ok(t('curve.info.hg', { T: 170, p: '817', lam: '18.7' }).includes('18,7'));
    assert.equal(num(4.956, 2), '4,96');
    setLang('en');
    assert.ok(t('curve.info.hg', { T: 170, p: '817', lam: '18.7' }).includes('18.7'));
    assert.equal(num(4.956, 2), '4.96');
  } finally { setLang('en'); }
});

test('German wording of the empty-spacing hint does not call the sweep a measurement', () => {
  assert.ok(!/Messbereich/.test(STRINGS.de['delta.none']));
});

test('figures, plots and live results are accessible in index.html', async () => {
  const html = await (await fetch('../index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const named = (el) => el.hasAttribute('data-i18n-aria') || el.hasAttribute('aria-labelledby');
  const svg = doc.querySelector('svg.schematic');
  assert.ok(svg && named(svg) && !/aria-label="[A-Za-z]/.test(svg.outerHTML.slice(0, 120)), 'schematic needs a translated name');
  for (const id of ['tube-plot', 'curve-plot', 'delta-plot', 'compare-plot']) {
    const el = doc.getElementById(id);
    assert.ok(el && el.getAttribute('role') === 'img' && el.hasAttribute('data-i18n-aria'), id + ' needs role=img and a translated name');
  }
  assert.ok(named(doc.getElementById('motion-canvas')), 'canvas needs a name');
  for (const id of ['tube-result', 'delta-result', 'levels-result', 'curve-info']) {
    assert.equal(doc.getElementById(id).getAttribute('aria-live'), 'polite', id + ' must be a polite live region');
  }
  const st = doc.getElementById('curve-status');
  assert.ok(st && st.getAttribute('role') === 'status', 'curve-status live region missing');
});

test('plot axis titles contain no literal underscores', () => {
  for (const lang of ['en', 'de']) {
    for (const k of Object.keys(STRINGS[lang]).filter((k) => k.startsWith('curve.axis.') || k.startsWith('delta.axis.'))) {
      assert.ok(!/_/.test(STRINGS[lang][k]), `${lang}:${k} = ${STRINGS[lang][k]}`);
    }
  }
});

test('explanations name U1 as not simulated and cover both gases in the thermal note', () => {
  for (const lang of ['en', 'de']) {
    assert.ok(/U_1/.test(STRINGS[lang]['curve.limits']), lang + ': curve.limits must say what happens to U1');
    assert.ok(/Ne/.test(STRINGS[lang]['idea.thermal']) && /Hg/.test(STRINGS[lang]['idea.thermal']), lang + ': idea.thermal must cover Hg and Ne');
  }
});

test('the curve U3 slider cannot reach 0 and an error region exists', async () => {
  const html = await (await fetch('../index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  assert.ok(parseFloat(doc.getElementById('curve-U3').min) >= 0.1, 'U3 = 0 makes the curve flat');
  const err = doc.getElementById('curve-error');
  assert.ok(err && err.getAttribute('role') === 'alert' && err.hasAttribute('hidden'), 'curve-error alert region missing');
});
