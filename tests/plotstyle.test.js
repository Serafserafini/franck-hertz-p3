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

test('legend sits above the plot so it cannot cover the x-axis title on narrow screens', () => {
  const l = baseLayout();
  assert.ok(l.legend.y >= 1, 'legend.y = ' + l.legend.y);
  assert.ok(l.margin.t >= 30, 'top margin must leave room for the legend');
});
