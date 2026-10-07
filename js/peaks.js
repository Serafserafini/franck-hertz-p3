import { state, subscribe } from './store.js';
import { thresholds, idealSawtooth, realCurve } from './analytic.js';
import { findExtrema, spacings, mean, EXTREMA_OPTIONS } from './analysis.js';
import { modelParams, u2Grid, applyRanges } from './params.js';
import { RANGES } from './physics.js';
import { makeSlider } from './controls.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

export function initPeaks() {
  const plot = document.getElementById('peaks-plot');
  const cplot = document.getElementById('peaks-curve-plot');
  const zones = document.getElementById('peaks-zones');
  const result = document.getElementById('peaks-result');
  const tbody = document.getElementById('peaks-table').querySelector('tbody');
  const sl = {
    U1: makeSlider('peaks-U1', (v) => `${num(v, 1)} V`, draw),
    U2: makeSlider('peaks-U2', (v) => `${num(v, 1)} V`, draw),
  };

  function draw() {
    const gasId = state.gas, c = colors();
    const p = modelParams(gasId, { U1: sl.U1.value });
    const U2 = sl.U2.value, dE = p.dE;
    Object.values(sl).forEach((s) => s.refresh());

    // energy along the gap: linear rise without collisions, ideal sawtooth, thresholds
    const xs = thresholds(p.U1, U2, dE);
    const saw = idealSawtooth(p.U1, U2, dE);
    const yMax = Math.max(p.U1 + U2, dE) * 1.08 + 0.2;
    Plotly.react(plot, [
      { x: saw.map((q) => q.x), y: saw.map((q) => q.E), mode: 'lines', name: t('peaks.legend.saw'), line: { color: c.c1, width: 3 } },
      { x: xs, y: xs.map(() => dE), mode: 'markers+text', name: t('peaks.legend.thr'), text: xs.map((_, i) => String(i + 1)), textposition: 'top center', marker: { size: 9, color: c.c2 } },
    ], baseLayout({
      xaxis: { title: { text: t('axis.x') }, range: [0, 1], fixedrange: true },
      yaxis: { title: { text: t('axis.E') }, range: [0, yMax], fixedrange: true },
    }), plotConfig);
    zones.innerHTML = t('peaks.zones', { n: xs.length });
    renderMath(zones);

    // real curve with the predicted peak positions U2 = n dE - U1
    const U2s = u2Grid(gasId), max = RANGES[gasId].U2[1];
    const I = realCurve(p, U2s);
    const pred = [];
    for (let n = 1; n * dE - p.U1 <= max; n++) pred.push(n * dE - p.U1);
    const e = findExtrema(U2s, I, EXTREMA_OPTIONS[gasId]);
    Plotly.react(cplot, [
      { x: U2s, y: I, mode: 'lines', name: t('peaks.legend.curve'), line: { color: c.c1, width: 3 } },
      { x: [U2], y: [I[Math.round(U2 / RANGES[gasId].U2[2])]], mode: 'markers', marker: { size: 11, color: c.c2 }, showlegend: false, hoverinfo: 'skip' },
      { x: [null], y: [null], mode: 'lines', name: t('peaks.legend.pred'), line: { color: c.muted, width: 1.5, dash: 'dot' } },
    ], baseLayout({
      shapes: pred.map((x) => ({ type: 'line', xref: 'x', yref: 'paper', x0: x, x1: x, y0: 0, y1: 1, line: { color: c.muted, width: 1.5, dash: 'dot' } })),
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, Math.max(...I) * 1.15 || 1], fixedrange: true },
    }), plotConfig);

    // table of the peaks of the real curve and their spacing
    const list = e.maxima, sp = spacings(list);
    tbody.replaceChildren(...list.map((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${num(m.x, 2)}</td><td>${i ? num(sp[i - 1], 2) : '–'}</td>`;
      return tr;
    }));
    result.innerHTML = sp.length
      ? t('peaks.result', { d: num(mean(sp), 2), model: num(dE, 1) })
      : t('peaks.none');
    renderMath(result);
  }

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); draw(); } });
  document.addEventListener('langchange', draw);
  document.addEventListener('themechange', draw);
  applyRanges(state.gas, sl);
  draw();
}
