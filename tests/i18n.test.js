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

test('German output uses decimal commas for numbers passed to t() and num()', () => {
  try {
    setLang('de');
    assert.ok(t('run.fixed', { name: 'U₁', v: '1.5' }).includes('1,5'));
    assert.equal(num(4.956, 2), '4,96');
    setLang('en');
    assert.ok(t('run.fixed', { name: 'U₁', v: '1.5' }).includes('1.5'));
    assert.equal(num(4.956, 2), '4.96');
  } finally { setLang('en'); }
});

test('German wording of the empty-spacing hint does not call the sweep a measurement', () => {
  assert.ok(!/Messbereich/.test(STRINGS.de['delta.none']));
});

test('figures, plots, canvases and live results are accessible in index.html', async () => {
  const html = await (await fetch('../index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const id of ['levels-svg', 'orbitals-svg', 'scheme-svg', 'run-plot', 'nogas-plot', 'cmp-plot', 'gas-plot',
    'gas-energy-plot', 'peaks-plot', 'peaks-curve-plot', 'minima-plot']) {
    const el = doc.getElementById(id);
    assert.ok(el && el.getAttribute('role') === 'img' && el.hasAttribute('data-i18n-aria'), id + ' needs role=img and a translated name');
  }
  for (const id of ['nogas-canvas', 'glow-canvas', 'minima-canvas']) {
    const el = doc.getElementById(id);
    assert.ok(el && el.getAttribute('role') === 'img' && el.hasAttribute('data-i18n-aria'), id + ' needs role=img and a translated name');
  }
  const cap = doc.getElementById('peaks-cap');
  assert.ok(cap && cap.hasAttribute('data-i18n-aria'), 'capacitor sketch needs a translated name');
  for (const id of ['levels-result', 'gas-readout', 'peaks-result', 'minima-bartext']) {
    assert.equal(doc.getElementById(id).getAttribute('aria-live'), 'polite', id + ' must be a polite live region');
  }
});

test('every explanatory section carries a theory link in both languages', () => {
  for (const lang of ['en', 'de']) {
    for (const k of ['idea.theory', 'scheme.theory', 'gas.theory', 'peaks.theory', 'glow.theory', 'minima.theory']) {
      assert.ok(STRINGS[lang][k] && STRINGS[lang][k].includes('<a href="https://'), `${lang}:${k} missing link`);
    }
  }
});

test('plot axis titles contain no literal underscores', () => {
  for (const lang of ['en', 'de']) {
    for (const k of Object.keys(STRINGS[lang]).filter((k) => k.startsWith('axis.'))) {
      assert.ok(!/_/.test(STRINGS[lang][k]), `${lang}:${k} = ${STRINGS[lang][k]}`);
    }
  }
});

test('the page has all eleven sections and the gas selector', async () => {
  const html = await (await fetch('../index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const id of ['idea', 'scheme', 'roles', 'run', 'nogas', 'cmp', 'gas', 'peaks', 'glow', 'minima', 'refs']) {
    assert.ok(doc.getElementById(id), 'section #' + id + ' missing');
  }
  assert.ok(doc.getElementById('global-gas'), 'gas selector missing');
});

test('no random numbers are used anywhere in js/', async () => {
  const files = ['physics', 'analytic', 'params', 'analysis', 'format', 'i18n', 'dom', 'plotstyle', 'store', 'controls',
    'gapcanvas', 'levels', 'orbitals', 'schematic', 'sweep', 'nogas', 'withgas', 'peaks', 'glow', 'minima', 'main'];
  for (const f of files) {
    const res = await fetch(`../js/${f}.js`);
    if (!res.ok) continue; // modules are added task by task
    assert.ok(!/Math\.random/.test(await res.text()), f + '.js uses Math.random');
  }
});

test('section 1 does not call dE the smallest excitation (the ladder shows lower levels)', () => {
  for (const lang of ['en', 'de']) assert.ok(!/smallest excitation|kleinste Anregung/i.test(STRINGS[lang]['idea.p1']), lang);
});

test('the observation list names U1 + U2 (the drops sit at n dE - U1)', () => {
  for (const lang of ['en', 'de']) {
    for (const k of ['run.obs.3', 'run.obs.4']) assert.ok(/U_1\+U_2/.test(STRINGS[lang][k]), `${lang}:${k}`);
  }
});

test('the temperature that matches dE to 3/2 kT is given for both gases', () => {
  for (const lang of ['en', 'de']) {
    const s = STRINGS[lang]['idea.thermal'];
    assert.ok(/10\^4/.test(s) && /10\^5/.test(s), lang + ': Hg ~4e4 K and Ne ~1.5e5 K expected');
  }
});

test('the ladder caption describes the thermal-energy bar, not a dot', () => {
  assert.ok(!/\bdot\b/i.test(STRINGS.en['idea.caption']) && /bar/i.test(STRINGS.en['idea.caption']));
  assert.ok(!/Punkt/.test(STRINGS.de['idea.caption']) && /Balken/.test(STRINGS.de['idea.caption']));
});
