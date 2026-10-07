import { state, update, subscribe, simParams } from './store.js';
import { findExtrema, spacings, mean, EXTREMA_OPTIONS } from './analysis.js';
import { computeCurve } from './compute.js';
import { GAS } from './physics.js';
import { t, renderMath } from './i18n.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';

const COMPARE_TEMPS = [150, 170, 190];

export function initSpacing() {
  const $ = (id) => document.getElementById(id);
  const contact = $('contact'), contactOut = $('contact-out'), kind = $('kind');
  const compare = $('compare'), compareWrap = $('compare-wrap');
  const plot = $('delta-plot'), cmpPlot = $('compare-plot'), cmpCap = $('compare-cap');
  const result = $('delta-result'), tbody = $('delta-table').querySelector('tbody');
  let cmpToken = 0;
  let cmpCache = { key: '', curves: {} };

  function extremaOf(res, gas) {
    const e = findExtrema(res.U2, res.IA, EXTREMA_OPTIONS[gas]);
    return state.extremaKind === 'minima' ? e.minima : e.maxima;
  }

  function syncControls() {
    contact.value = state.contact;
    contactOut.textContent = `${(+state.contact).toFixed(1)} V`;
    kind.value = state.extremaKind;
    compare.checked = state.compare;
    compareWrap.hidden = state.gas !== 'hg';
  }

  function draw() {
    syncControls();
    const r = state.result;
    if (!r) return;
    const c = colors();
    const dEmodel = GAS[r.params.gas].dE;
    const list = extremaOf(r, r.params.gas);
    const sp = spacings(list);
    const n = list.map((_, i) => i + 1);

    const traces = [];
    if (list.length) {
      traces.push({ x: n, y: list.map((m) => m.x), mode: 'lines+markers', name: t('delta.legend.pos'), line: { color: c.c1, width: 2 }, marker: { size: 9, color: c.c1 }, hovertemplate: 'n = %{x}<br>U₂ = %{y:.2f} V<extra></extra>' });
      traces.push({ x: n, y: n.map((i) => list[0].x + (i - 1) * dEmodel), mode: 'lines', name: t('delta.legend.ref'), line: { color: c.muted, dash: 'dot', width: 2 }, hoverinfo: 'skip' });
    }
    Plotly.react(plot, traces, baseLayout({
      xaxis: { title: { text: 'n' }, dtick: 1 },
      yaxis: { title: { text: t('delta.axis.u') }, rangemode: 'tozero' },
    }), plotConfig);

    tbody.replaceChildren(...list.map((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${m.x.toFixed(2)}</td><td>${i ? sp[i - 1].toFixed(2) : '–'}</td>`;
      return tr;
    }));

    if (sp.length) {
      const d = mean(sp).toFixed(2);
      result.innerHTML = t('delta.result', { d, model: dEmodel.toFixed(1) });
    } else {
      result.innerHTML = t('delta.none');
    }
    renderMath(result);
    drawCompare();
  }

  async function drawCompare() {
    const show = state.compare && state.gas === 'hg';
    cmpPlot.hidden = !show;
    cmpCap.hidden = !show;
    if (!show) return;
    const my = ++cmpToken;
    const base = simParams();
    // Curves only depend on the simulation settings, not on maxima/minima, language or theme.
    const key = JSON.stringify({ ...base, tempC: 0 });
    if (cmpCache.key !== key) cmpCache = { key, curves: {} };
    for (const T of COMPARE_TEMPS) {
      if (!cmpCache.curves[T]) {
        const res = await computeCurve({ ...base, tempC: T }, 'compare');
        if (my !== cmpToken) return; // superseded while computing
        cmpCache.curves[T] = res;
      }
    }
    if (my !== cmpToken) return;
    const series = COMPARE_TEMPS.map((T) => ({ T, list: extremaOf(cmpCache.curves[T], 'hg') }));
    const c = colors();
    const palette = [c.c1, c.c2, c.c3];
    const traces = series.map((s, i) => {
      const sp = spacings(s.list);
      return { x: sp.map((_, k) => k + 2), y: sp, mode: 'lines+markers', name: `${s.T} °C`, line: { color: palette[i], width: 2 }, marker: { size: 8, color: palette[i] }, hovertemplate: 'n = %{x}<br>%{y:.2f} V<extra></extra>' };
    });
    Plotly.react(cmpPlot, traces, baseLayout({
      xaxis: { title: { text: 'n' }, dtick: 1 },
      yaxis: { title: { text: t('delta.axis.d') } },
      shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: GAS.hg.dE, y1: GAS.hg.dE, line: { color: c.muted, width: 1.5, dash: 'dot' } }],
    }), plotConfig);
  }

  contact.addEventListener('input', () => update({ contact: +contact.value }));
  kind.addEventListener('input', () => update({ extremaKind: kind.value }));
  compare.addEventListener('input', () => update({ compare: compare.checked }));

  subscribe((keys) => {
    if (keys.some((k) => ['result', 'extremaKind', 'compare'].includes(k))) draw();
    else if (keys.includes('contact') || keys.includes('gas')) syncControls();
  });
  document.addEventListener('langchange', draw);
  document.addEventListener('themechange', draw);
  syncControls();
}
