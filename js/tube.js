import { idealProfile, POS } from './profile.js';
import { GAS } from './physics.js';
import { t, num, renderMath } from './i18n.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';

// Slider ranges per gas (U1 max stays below the Hg threshold of 4.9 V).
const RANGES = {
  hg: { U2: { max: 30, val: 12 }, U3: { max: 5, val: 1.5 } },
  ne: { U2: { max: 60, val: 45 }, U3: { max: 15, val: 7 } },
};

export function initTube() {
  const $ = (id) => document.getElementById(id);
  const gasSel = $('tube-gas'), U1 = $('tube-U1'), U2 = $('tube-U2'), U3 = $('tube-U3');
  const gasOn = $('tube-gasOn'), plot = $('tube-plot'), res = $('tube-result');

  function applyRanges() {
    const r = RANGES[gasSel.value];
    U2.max = r.U2.max; U2.value = r.U2.val;
    U3.max = r.U3.max; U3.value = r.U3.val;
  }

  function draw() {
    const gasId = gasSel.value;
    const v = { U1: +U1.value, U2: +U2.value, U3: +U3.value };
    $('tube-U1-out').textContent = `${num(v.U1, 1)} V`;
    $('tube-U2-out').textContent = `${num(v.U2, 1)} V`;
    $('tube-U3-out').textContent = `${num(v.U3, 1)} V`;

    const prof = idealProfile({ ...v, gasId, gasOn: gasOn.checked });
    const c = colors();
    const dE = GAS[gasId].dE;
    const yMax = Math.max(dE * 1.4, Math.max(...prof.points.map((p) => p.E)) * 1.15 + 0.5);

    const trace = {
      x: prof.points.map((p) => p.x), y: prof.points.map((p) => p.E),
      mode: 'lines', line: { color: c.c1, width: 3 }, name: t('tube.trace'),
      hovertemplate: '%{y:.2f} eV<extra></extra>',
    };
    const vline = (x) => ({ type: 'line', xref: 'x', yref: 'paper', x0: x, x1: x, y0: 0, y1: 1, line: { color: c.muted, width: 1, dash: 'dot' } });
    const shapes = [POS.G1, POS.G2].map(vline);
    if (gasOn.checked) {
      shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: dE, y1: dE, line: { color: c.c2, width: 1.5, dash: 'dash' } });
    }
    const layout = baseLayout({
      showlegend: false, shapes,
      xaxis: { range: [0, 1], tickvals: [POS.K, POS.G1, POS.G2, POS.A], ticktext: ['K', 'G₁', 'G₂', 'A'], title: { text: t('tube.axis.x') }, fixedrange: true },
      yaxis: { range: [0, yMax], title: { text: t('tube.axis.y') }, fixedrange: true },
      annotations: gasOn.checked ? [{ xref: 'paper', yref: 'y', x: 0.01, y: dE, yanchor: 'bottom', xanchor: 'left', showarrow: false, text: t('tube.dE'), font: { color: c.c2 } }] : [],
    });
    Plotly.react(plot, [trace], layout, plotConfig);

    res.innerHTML = prof.reached ? t('tube.reached', { E: prof.finalE.toFixed(2) }) : t('tube.stopped');
    renderMath(res);
  }

  gasSel.addEventListener('input', () => { applyRanges(); draw(); });
  [U1, U2, U3, gasOn].forEach((el) => el.addEventListener('input', draw));
  document.addEventListener('langchange', draw);
  document.addEventListener('themechange', draw);
  applyRanges();
  draw();
}
