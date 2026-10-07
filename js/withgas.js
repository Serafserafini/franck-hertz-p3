import { state, subscribe } from './store.js';
import { realCurve, realCurrent, idealCurrent, idealSawtooth, expectedEnergyProfile, thresholds } from './analytic.js';
import { modelParams, u2Grid, applyRanges, densityText } from './params.js';
import { RANGES } from './physics.js';
import { makeSlider } from './controls.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

export function initWithGas() {
  const plot = document.getElementById('gas-plot');
  const eplot = document.getElementById('gas-energy-plot');
  const readout = document.getElementById('gas-readout');
  const ideal = document.getElementById('gas-ideal');
  const label = document.getElementById('gas-density-label');
  const sl = {
    U1: makeSlider('gas-U1', (v) => `${num(v, 1)} V`, draw),
    U2: makeSlider('gas-U2', (v) => `${num(v, 1)} V`, draw),
    U3: makeSlider('gas-U3', (v) => `${num(v, 1)} V`, draw),
    density: makeSlider('gas-density', (v) => densityText(state.gas, v), draw),
  };
  ideal.addEventListener('input', draw);

  function params() {
    return modelParams(state.gas, { U1: sl.U1.value, U3: sl.U3.value, density: sl.density.value });
  }

  function draw() {
    const gasId = state.gas, p = params(), c = colors();
    const U2s = u2Grid(gasId), U2 = sl.U2.value;
    const max = RANGES[gasId].U2[1];
    Object.values(sl).forEach((s) => s.refresh());
    label.textContent = t(gasId === 'hg' ? 'ctl.density.hg' : 'ctl.density.ne');

    const real = realCurve(p, U2s);
    const traces = [{ x: U2s, y: real, mode: 'lines', name: t('gas.legend.real'), line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>' }];
    const fine = Array.from({ length: 721 }, (_, i) => (i / 720) * max);
    if (ideal.checked) {
      const sc = Math.max(...real); // ideal pulses drawn at the height of the real maxima for comparison
      traces.push({ x: fine, y: fine.map((v) => idealCurrent(p.U1, v, p.U3, p.dE) * sc), mode: 'lines', name: t('gas.legend.ideal'), line: { color: c.muted, width: 2, dash: 'dash' } });
    }
    const here = realCurrent({ ...p, U2 });
    traces.push({ x: [U2], y: [here], mode: 'markers', marker: { size: 11, color: c.c2 }, hoverinfo: 'skip', showlegend: false });
    Plotly.react(plot, traces, baseLayout({
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, Math.max(...real) * 1.15 || 1], fixedrange: true },
    }), plotConfig);

    // energy along the gap
    const saw = idealSawtooth(p.U1, U2, p.dE);
    const avg = expectedEnergyProfile({ ...p, U2 });
    const yMax = Math.max(p.U1 + U2, p.dE) * 1.08 + 0.2;
    Plotly.react(eplot, [
      { x: saw.map((q) => q.x), y: saw.map((q) => q.E), mode: 'lines', name: t('gas.legend.saw'), line: { color: c.muted, width: 2, dash: 'dash' } },
      { x: avg.x, y: avg.E, mode: 'lines', name: t('gas.legend.avg'), line: { color: c.c1, width: 3 } },
    ], baseLayout({
      shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: p.dE, y1: p.dE, line: { color: c.c2, width: 1.5, dash: 'dot' } }],
      xaxis: { title: { text: t('axis.x') }, range: [0, 1], fixedrange: true },
      yaxis: { title: { text: t('axis.E') }, range: [0, yMax], fixedrange: true },
    }), plotConfig);

    const m = thresholds(p.U1, U2, p.dE).length;
    readout.innerHTML = t('gas.readout', {
      U2: num(U2, 1), IA: num(here, 2), m,
      ideal: t(idealCurrent(p.U1, U2, p.U3, p.dE) ? 'gas.ideal.on' : 'gas.ideal.off'),
    });
    renderMath(readout);
  }

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); draw(); } });
  document.addEventListener('langchange', draw);
  document.addEventListener('themechange', draw);
  applyRanges(state.gas, sl);
  draw();
}
