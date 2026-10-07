import { test, assert } from './harness.js';
import { STRINGS } from '../js/strings.js';
import { t } from '../js/i18n.js';

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
