import { test, assert } from './harness.js';
import { formatSci, localizeNumber } from '../js/format.js';

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
