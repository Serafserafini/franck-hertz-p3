import { LEVELS, thermalEnergyEV, wavelengthNm, boltzmannFactor } from './physics.js';
import { formatSci } from './format.js';
import { svgEl, svgText } from './dom.js';
import { t, num, renderMath } from './i18n.js';
import { state, subscribe } from './store.js';
import { makeSlider } from './controls.js';
import { renderOrbitals } from './orbitals.js';

const W = 560, H = 380;
const PAD = { l: 64, r: 16, t: 16, b: 34 };
const X_LINE0 = 150, X_LINE1 = 330;

// `deg` short segments side by side at one height (degenerate orbitals), centred in the ladder column.
// Returns the x centres of the segments.
function segments(svg, y, deg, cls) {
  const w = 46, gap = 8, total = deg * w + (deg - 1) * gap;
  const x0 = (X_LINE0 + X_LINE1) / 2 - total / 2;
  const centres = [];
  for (let i = 0; i < deg; i++) {
    const a = x0 + i * (w + gap);
    svg.append(svgEl('line', { x1: a, y1: y, x2: a + w, y2: y, class: cls }));
    centres.push(a + w / 2);
  }
  return centres;
}

// Push labels apart vertically (screen y, input order preserved) so they stay readable.
function spread(ys, gap) {
  const idx = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = ys.slice();
  for (let k = 1; k < idx.length; k++) {
    const a = idx[k - 1], b = idx[k];
    if (out[b] - out[a] < gap) out[b] = out[a] + gap;
  }
  return out;
}

export function renderLevels(container, gasId, tempK) {
  const data = LEVELS[gasId];
  const top = data.ionization * 1.08;
  const y = (e) => PAD.t + (1 - e / top) * (H - PAD.t - PAD.b);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'levels', 'aria-hidden': 'true' });

  const defs = svgEl('defs');
  const marker = svgEl('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  marker.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--c1)' }));
  defs.append(marker);
  svg.append(defs);

  svg.append(svgEl('line', { x1: PAD.l, y1: y(0), x2: PAD.l, y2: y(top), class: 'axis' }));
  const step = gasId === 'hg' ? 2 : 5;
  for (let e = 0; e <= top; e += step) {
    svg.append(svgEl('line', { x1: PAD.l - 5, y1: y(e), x2: PAD.l, y2: y(e), class: 'tick' }));
    svg.append(svgEl('text', { x: PAD.l - 9, y: y(e) + 4, 'text-anchor': 'end' }, String(e)));
  }
  svg.append(svgEl('text', { x: 14, y: 14, class: 'small' }, 'E / eV'));

  // ground orbital (filled: two electrons per orbital), ionisation limit, empty orbitals above
  const ground = segments(svg, y(0), data.groundDeg, 'lv');
  ground.forEach((cx) => svg.append(svgEl('text', { x: cx, y: y(0) - 7, 'text-anchor': 'middle', class: 'glyph' }, '↑↓')));
  svg.append(svgEl('text', { x: X_LINE1 + 10, y: y(0) + 4 }, `${data.ground} (${t('idea.ground')})`));
  svg.append(svgEl('line', { x1: X_LINE0, y1: y(data.ionization), x2: X_LINE1, y2: y(data.ionization), class: 'ion' }));
  svg.append(svgEl('text', { x: X_LINE1 + 10, y: y(data.ionization) + 4, class: 'small' }, `${t('idea.ion')} ${num(data.ionization)} eV`));

  const labelYs = spread(data.levels.map((l) => y(l.e)), 15);
  data.levels.forEach((l, i) => {
    segments(svg, y(l.e), l.deg, l.highlight ? 'lv hl' : 'lv');
    const deg = l.deg > 1 ? ` ×${l.deg}` : '';
    svg.append(svgEl('text', { x: X_LINE1 + 10, y: labelYs[i] + 4, class: l.highlight ? 'hl-text' : '' }, `${l.label}${deg}  ${num(l.e, 2)} eV`));
  });

  const hl = data.levels.find((l) => l.highlight);
  const ax = (X_LINE0 + X_LINE1) / 2;
  svg.append(svgEl('line', { x1: ax, y1: y(0) - 2, x2: ax, y2: y(hl.e) + 4, class: 'arrow', 'marker-end': 'url(#arrowhead)' }));
  svg.append(svgEl('text', { x: ax - 8, y: (y(0) + y(hl.e)) / 2, 'text-anchor': 'end', class: 'hl-text' },
    gasId === 'hg'
      ? t('idea.arrow', { dE: hl.e.toFixed(2), nm: wavelengthNm(hl.e).toFixed(1) })
      : t('idea.arrow.ne', { dE: hl.e.toFixed(1) }))); // 3p -> ground is forbidden: no single line to quote

  const kT = Math.min(thermalEnergyEV(tempK), top);
  svg.append(svgEl('circle', { cx: PAD.l + 34, cy: y(kT), r: 5, class: 'dot' }));
  svg.append(svgText({ x: PAD.l + 44, y: y(kT) - 34, class: 'small' }, t('idea.kt', { kt: thermalEnergyEV(tempK).toPrecision(2) })));

  container.replaceChildren(svg);
}

export function initLevels() {
  const fig = document.getElementById('levels-svg');
  const orb = document.getElementById('orbitals-svg');
  const res = document.getElementById('levels-result');
  const slider = makeSlider('levels-T', (v) => `${Math.round(Math.pow(10, v))} K`, draw);

  function draw() {
    const gasId = state.gas;
    const tempK = Math.pow(10, slider.value);
    slider.refresh();
    renderLevels(fig, gasId, tempK);
    renderOrbitals(orb, gasId);
    const hl = LEVELS[gasId].levels.find((l) => l.highlight);
    res.innerHTML = t('idea.result', {
      kt: thermalEnergyEV(tempK).toPrecision(2),
      bf: formatSci(boltzmannFactor(hl.e, tempK)),
    });
    renderMath(res);
  }

  subscribe((keys) => { if (keys.includes('gas')) draw(); });
  document.addEventListener('langchange', draw);
  draw();
}
