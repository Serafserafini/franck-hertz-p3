import { state, subscribe } from './store.js';
import { noGasCurrent, idealNoGasCurrent, noGasPath, positionAlong } from './analytic.js';
import { u2Grid } from './params.js';
import { RANGES, DEFAULTS, GAS } from './physics.js';
import { makeSlider } from './controls.js';
import { fitCanvas, drawScene, energyColor, initWalkers, stepWalkers, makeAnimator } from './gapcanvas.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num } from './i18n.js';

const ZONE = 0.3;

export function initNoGas() {
  const plot = document.getElementById('nogas-plot');
  const canvas = document.getElementById('nogas-canvas');
  const cmpPlot = document.getElementById('cmp-plot');
  let walkers = [], passes = true, finalE = 0;

  const u2 = makeSlider('nogas-U2', (v) => `${num(v, 1)} V`, () => { rebuild(); drawPlot(); });
  const u3n = makeSlider('nogas-U3', (v) => `${num(v, 1)} V`, () => { rebuild(); drawPlot(); });
  const u3 = makeSlider('cmp-U3', (v) => `${num(v, 1)} V`, () => drawCmp());

  function U1() { return DEFAULTS[state.gas].U1; }
  function U3() { return u3n.value; }

  function rebuild() {
    const path = noGasPath(U1(), u2.value, U3(), ZONE);
    passes = path.passes;
    finalE = U1() + u2.value - U3();
    walkers = initWalkers(Array.from({ length: 18 }, () => path.pts));
    anim.redraw();
  }

  function drawCanvas() {
    const { ctx, w, h } = fitCanvas(canvas);
    const dE = GAS[state.gas].dE;
    drawScene(ctx, w, h, {
      xMax: 1 + ZONE, lanes: 18,
      zones: [{ x0: 1, x1: 1 + ZONE, fill: 'rgba(200,80,80,0.15)' }],
      marks: [{ x: 0, label: t('nogas.legend.G1') }, { x: 1, label: t('nogas.legend.G2') }, { x: 1 + ZONE, label: t('nogas.legend.A') }],
      dots: walkers.map((wk) => { const p = positionAlong(wk.pts, wk.u); return { x: p.x, lane: wk.lane, color: energyColor(p.E, dE) }; }),
      footer: passes ? t('nogas.passes', { E: num(finalE, 1) }) : t('nogas.blocked'),
    });
  }
  const anim = makeAnimator({ canvas, toggle: document.getElementById('nogas-toggle'), step: (dt) => stepWalkers(walkers, dt), draw: drawCanvas });

  function drawPlot() {
    const c = colors();
    const U2s = u2Grid(state.gas);
    const I = U2s.map((v) => noGasCurrent(U1(), v, U3()));
    const here = noGasCurrent(U1(), u2.value, U3());
    Plotly.react(plot, [
      { x: U2s, y: I, mode: 'lines', line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>', showlegend: false },
      { x: [u2.value], y: [here], mode: 'markers', marker: { size: 11, color: c.c2 }, hoverinfo: 'skip', showlegend: false },
    ], baseLayout({
      showlegend: false,
      xaxis: { title: { text: t('axis.U2') }, range: [0, RANGES[state.gas].U2[1]], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, 1.02], fixedrange: true },
    }), plotConfig);
  }

  function drawCmp() {
    const c = colors();
    const p = { U1: U1(), U3: u3.value };
    const max = RANGES[state.gas].U2[1];
    const fine = Array.from({ length: 901 }, (_, i) => (i / 900) * max);
    Plotly.react(cmpPlot, [
      { x: fine, y: fine.map((v) => idealNoGasCurrent(p.U1, v, p.U3)), mode: 'lines', name: t('cmp.legend.ideal'), line: { color: c.muted, width: 2, dash: 'dash' } },
      { x: fine, y: fine.map((v) => noGasCurrent(p.U1, v, p.U3)), mode: 'lines', name: t('cmp.legend.real'), line: { color: c.c1, width: 3 } },
    ], baseLayout({
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, 1.05], fixedrange: true },
    }), plotConfig);
  }

  function onGas() {
    const r = RANGES[state.gas];
    u2.range(r.U2[0], r.U2[1], r.U2[2]);
    u2.set(Math.min(5, r.U2[1]));
    u3n.range(r.U3[0], r.U3[1], r.U3[2]);
    u3n.set(DEFAULTS[state.gas].U3);
    u3.range(r.U3[0], r.U3[1], r.U3[2]);
    u3.set(DEFAULTS[state.gas].U3);
    rebuild(); drawPlot(); drawCmp();
  }

  subscribe((keys) => { if (keys.includes('gas')) onGas(); });
  document.addEventListener('langchange', () => { u2.refresh(); u3n.refresh(); u3.refresh(); drawPlot(); drawCmp(); });
  document.addEventListener('themechange', () => { drawPlot(); drawCmp(); });
  onGas();
}
