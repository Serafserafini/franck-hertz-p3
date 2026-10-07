import { test, assert } from './harness.js';
import { baseLayout } from '../js/plotstyle.js';
import { setLang } from '../js/i18n.js';

test('Plotly separators follow the language (decimal comma in German)', () => {
  try {
    setLang('de');
    assert.equal(baseLayout().separators, ',.');
    setLang('en');
    assert.equal(baseLayout().separators, '.,');
  } finally { setLang('en'); }
});
