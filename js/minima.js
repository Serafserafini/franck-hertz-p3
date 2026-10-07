import { state, subscribe } from './store.js';
import { quantileElectrons, positionAlong, thresholds, missedFraction, realCurve } from './analytic.js';
import { modelParams, u2Grid, applyRanges, densityText } from './params.js';
import { GAS, RANGES } from './physics.js';
import { makeSlider } from './controls.js';
import { fitCanvas, drawScene, energyColor, initWalkers, stepWalkers, makeAnimator } from './gapcanvas.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

export function initMinima() {
  const canvas = document.getElementById('minima-canvas');
  const fill = document.getElementById('minima-bar-fill');
  const text = document.getElementById('minima-bartext');
  const plot = document.getElementById('minima-plot');
  const label = document.getElementById('minima-density-label');
  let walkers = [], missed = [], marks = [];
  const sl = {
    U2: makeSlider('minima-U2', (v) => `${num(v, 1)} V`, rebuild),
    density: makeSlider('minima-density', (v) => densityText(state.gas, v), rebuild),
  };

  function rebuild() {
    const p = { ...modelParams(state.gas, { density: sl.density.value }), U2: sl.U2.value };
    const els = quantileElectrons(p, 24);
    const m = thresholds(p.U1, p.U2, p.dE).length;
    missed = els.map((e) => e.events.length < m);
    walkers = initWalkers(els.map((e) => e.pts));
    marks = thresholds(p.U1, p.U2, p.dE).map((x, i) => ({ x, label: String(i + 1), dashed: true }));
    Object.values(sl).forEach((s) => s.refresh());
    label.textContent = t(state.gas === 'hg' ? 'ctl.density.hg' : 'ctl.density.ne');
    const frac = missedFraction(p.U1, p.U2, p.dE, p.lambda);
    fill.style.width = `${(frac * 100).toFixed(1)}%`;
    text.innerHTML = t('minima.bar', { pct: num(frac * 100, 0) });
    renderMath(text);
    drawPlot(p);
    anim.redraw();
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    const dE = GAS[state.gas].dE;
    drawScene(ctx, w, h, {
      lanes: 24, marks,
      dots: walkers.map((wk, i) => { const q = positionAlong(wk.pts, wk.u); return { x: q.x, lane: wk.lane, color: energyColor(q.E, dE), ring: missed[i] ? colors().c2 : null }; }),
      footer: t('minima.footer'),
    });
  }
  const anim = makeAnimator({ canvas, toggle: document.getElementById('minima-toggle'), step: (dt) => stepWalkers(walkers, dt), draw });

  function drawPlot(p) {
    const c = colors(), gasId = state.gas;
    const [lo, hi] = RANGES[gasId].density;
    const U2s = u2Grid(gasId), max = RANGES[gasId].U2[1];
    const mk = (density) => realCurve(modelParams(gasId, { density }), U2s);
    const chosen = sl.density.value;
    // low density = long mean free path = shallow minima; for Hg the density rises with the temperature
    const entries = [[lo, c.muted, 'dash'], [chosen, c.c1, 'solid'], [hi, c.c2, 'dash']];
    const Imax = [];
    const traces = entries.map(([d, color, dash]) => {
      const I = mk(d); Imax.push(Math.max(...I));
      return { x: U2s, y: I, mode: 'lines', name: densityText(gasId, d), line: { color, width: d === chosen ? 3 : 2, dash } };
    });
    Plotly.react(plot, traces, baseLayout({
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: p.U2, x1: p.U2, y0: 0, y1: 1, line: { color: c.fg, width: 1, dash: 'dot' } }],
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, Math.max(...Imax) * 1.12], fixedrange: true },
    }), plotConfig);
  }

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); rebuild(); } });
  document.addEventListener('langchange', rebuild);
  document.addEventListener('themechange', rebuild);
  applyRanges(state.gas, sl);
  rebuild();
}
