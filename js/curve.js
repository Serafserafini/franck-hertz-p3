import { state, update, subscribe, simParams, planRecompute, SIM_KEYS } from './store.js';
import { computeCurve } from './compute.js';
import { findExtrema, EXTREMA_OPTIONS } from './analysis.js';
import { meanFreePath, hgVaporPressure } from './physics.js';
import { t, num, renderMath } from './i18n.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';

// Per-gas defaults for the U3 and probe sliders.
const GAS_UI = { hg: { U3max: 5, U3: 1.5, probe: 20, U2max: 45 }, ne: { U3max: 15, U3: 7, probe: 45, U2max: 90 } };

export function initCurve() {
  const $ = (id) => document.getElementById(id);
  const gasSel = $('curve-gas'), tempWrap = $('curve-temp-wrap'), temp = $('curve-temp');
  const U3 = $('curve-U3'), spread = $('curve-spread'), noGas = $('curve-nogas'), probe = $('curve-probe');
  const plot = $('curve-plot'), info = $('curve-info'), busy = $('curve-busy'), status = $('curve-status');
  const errorBox = $('curve-error');
  let token = 0, timer = 0, clickBound = false;
  let lastKeys = null; // keys of the curves currently shown (see planRecompute)

  function syncControls() {
    const ui = GAS_UI[state.gas];
    gasSel.value = state.gas;
    tempWrap.hidden = state.gas !== 'hg';
    U3.max = ui.U3max; probe.max = ui.U2max;
    temp.value = state.tempC; U3.value = state.U3; spread.value = state.spread;
    noGas.checked = state.showNoGas; probe.value = state.probeU2;
    $('curve-temp-out').textContent = `${state.tempC} °C`;
    $('curve-U3-out').textContent = `${num(state.U3, 1)} V`;
    $('curve-spread-out').textContent = `${num(state.spread, 2)} eV`;
    $('curve-probe-out').textContent = `${num(state.probeU2, 2)} V`;
  }

  function updateInfo() {
    if (state.gas === 'hg') {
      info.innerHTML = t('curve.info.hg', {
        T: state.tempC, p: hgVaporPressure(state.tempC).toFixed(0),
        lam: (meanFreePath('hg', state.tempC) * 1e6).toFixed(1),
      });
    } else {
      info.innerHTML = t('curve.info.ne', { lam: (meanFreePath('ne', 20) * 1e6).toFixed(1) });
    }
    renderMath(info);
  }

  async function recompute() {
    const my = ++token;
    busy.hidden = false;
    errorBox.hidden = true;
    status.textContent = t('busy');
    const p = simParams();
    const plan = planRecompute(lastKeys, p, state.showNoGas);
    try {
      const res = plan.main ? { ...(await computeCurve(p)), params: p } : state.result;
      let ref = state.showNoGas ? state.reference : null;
      if (plan.ref) ref = await computeCurve({ ...p, noGas: true });
      if (my !== token) return; // a newer request superseded this one
      lastKeys = plan.keys;
      busy.hidden = true;
      status.textContent = t('curve.status.done');
      update(plan.main ? { result: res, reference: ref } : { reference: ref });
    } catch {
      if (my !== token) return;
      busy.hidden = true;
      status.textContent = '';
      errorBox.hidden = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(recompute, 120);
  }

  function draw() {
    const r = state.result;
    if (!r) return;
    const c = colors();
    const e = findExtrema(r.U2, r.IA, EXTREMA_OPTIONS[r.params.gas]);
    const data = [];
    if (state.showNoGas && state.reference) {
      data.push({ x: state.reference.U2, y: state.reference.IA, mode: 'lines', name: t('curve.legend.nogas'), line: { color: c.muted, dash: 'dash', width: 2 }, hoverinfo: 'skip' });
    }
    data.push({ x: r.U2, y: r.IA, mode: 'lines', name: t('curve.legend.gas'), line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>' });
    data.push({ x: e.maxima.map((m) => m.x), y: e.maxima.map((m) => m.y), mode: 'markers', name: t('curve.legend.max'), marker: { symbol: 'triangle-up', size: 10, color: c.c3 }, hovertemplate: 'U₂ = %{x:.2f} V<extra></extra>' });
    data.push({ x: e.minima.map((m) => m.x), y: e.minima.map((m) => m.y), mode: 'markers', name: t('curve.legend.min'), marker: { symbol: 'triangle-down', size: 10, color: c.c2 }, hovertemplate: 'U₂ = %{x:.2f} V<extra></extra>' });
    const layout = baseLayout({
      xaxis: { title: { text: t('curve.axis.x') }, range: [0, r.U2[r.U2.length - 1]] },
      yaxis: { title: { text: t('curve.axis.y') }, range: [0, 1.02] },
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: state.probeU2, x1: state.probeU2, y0: 0, y1: 1, line: { color: c.fg, width: 1, dash: 'dot' } }],
    });
    Plotly.react(plot, data, layout, plotConfig).then(() => {
      if (clickBound) return;
      clickBound = true;
      plot.on('plotly_click', (ev) => {
        const x = ev.points && ev.points[0] ? ev.points[0].x : null;
        if (x !== null) update({ probeU2: Math.round(x * 4) / 4 });
      });
    });
  }

  gasSel.addEventListener('input', () => {
    const g = gasSel.value;
    update({ gas: g, U3: GAS_UI[g].U3, probeU2: GAS_UI[g].probe });
  });
  temp.addEventListener('input', () => update({ tempC: +temp.value }));
  U3.addEventListener('input', () => update({ U3: +U3.value }));
  spread.addEventListener('input', () => update({ spread: +spread.value }));
  noGas.addEventListener('input', () => update({ showNoGas: noGas.checked }));
  probe.addEventListener('input', () => update({ probeU2: +probe.value }));

  subscribe((keys) => {
    syncControls();
    if (keys.some((k) => SIM_KEYS.includes(k))) { updateInfo(); schedule(); }
    else if (keys.some((k) => ['result', 'reference', 'probeU2'].includes(k))) draw();
  });
  document.addEventListener('langchange', () => { updateInfo(); draw(); });
  document.addEventListener('themechange', draw);

  syncControls();
  updateInfo();
  recompute();
}
