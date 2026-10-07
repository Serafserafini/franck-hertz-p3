import { state, subscribe } from './store.js';
import { realCurve } from './analytic.js';
import { modelParams, u2Grid } from './params.js';
import { RANGES } from './physics.js';
import { makeSlider } from './controls.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

const SWEEP_SECONDS = 10;
const MIN_SPAN = 2; // V, so the axis is not degenerate at U₂ = 0

export function initSweep() {
  const plot = document.getElementById('run-plot');
  const readout = document.getElementById('run-readout');
  const fixed = document.getElementById('run-fixed');
  const play = document.getElementById('run-play');
  let curve = null, playing = false, raf = 0, last = 0, lastDraw = 0;
  let pos = 0; // float position while playing: the slider snaps to its step, which would swallow small increments
  const slider = makeSlider('run-U2', (v) => `${num(v, 1)} V`, () => { stop(); draw(); });

  function compute() {
    const p = modelParams(state.gas);
    const U2s = u2Grid(state.gas);
    curve = { p, U2s, I: realCurve(p, U2s), max: RANGES[state.gas].U2[1], step: RANGES[state.gas].U2[2] };
    slider.range(0, curve.max, curve.step);
    slider.set(0);
  }

  function draw() {
    if (!curve) return;
    const c = colors();
    const k = Math.round(slider.value / curve.step);
    const x = curve.U2s.slice(0, k + 1), y = curve.I.slice(0, k + 1);
    const yMax = Math.max(...curve.I) * 1.1 || 1;
    const data = [
      { x, y, mode: 'lines', line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>', showlegend: false },
      { x: [x[x.length - 1]], y: [y[y.length - 1]], mode: 'markers', marker: { size: 11, color: c.c2 }, hoverinfo: 'skip', showlegend: false },
    ];
    Plotly.react(plot, data, baseLayout({
      showlegend: false,
      xaxis: { title: { text: t('axis.U2') }, range: [0, Math.max(slider.value, MIN_SPAN)], fixedrange: true }, // the selected U₂ is the right edge: only what is measured so far is shown
      yaxis: { title: { text: t('axis.IA') }, range: [0, yMax], fixedrange: true },
    }), plotConfig);
    readout.innerHTML = t('run.readout', { U2: num(slider.value, 1), IA: num(y[y.length - 1], 2) });
    renderMath(readout);
    const p = curve.p;
    fixed.replaceChildren(...[['U₁', p.U1], ['U₃', p.U3]].map(([name, v]) => {
      const s = document.createElement('span');
      s.textContent = t('run.fixed', { name, v: num(v, 1) });
      return s;
    }));
  }

  function label() { play.textContent = t(playing ? 'ctl.pause' : 'ctl.play'); }
  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; label(); }
  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    pos += (curve.max / SWEEP_SECONDS) * dt;
    if (pos >= curve.max) { slider.set(curve.max); draw(); stop(); return; }
    slider.set(pos);
    if (ts - lastDraw > 50) { lastDraw = ts; draw(); } // Plotly redraw at most 20 times per second
  }
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (slider.value >= curve.max) slider.set(0);
    pos = slider.value; playing = true; last = performance.now(); label(); raf = requestAnimationFrame(tick);
  });

  subscribe((keys) => { if (keys.includes('gas')) { stop(); compute(); draw(); } });
  document.addEventListener('langchange', () => { label(); draw(); });
  document.addEventListener('themechange', draw);
  compute();
  label();
  draw();
}
