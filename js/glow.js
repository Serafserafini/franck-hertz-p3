import { state, subscribe } from './store.js';
import { excitationDensity, quantileElectrons, positionAlong, thresholds } from './analytic.js';
import { modelParams, applyRanges } from './params.js';
import { GAS } from './physics.js';
import { makeSlider } from './controls.js';
import { fitCanvas, drawScene, energyColor, initWalkers, stepWalkers, makeAnimator } from './gapcanvas.js';
import { t, num } from './i18n.js';

export function initGlow() {
  const canvas = document.getElementById('glow-canvas');
  let walkers = [], glow = null, marks = [];
  const sl = { U2: makeSlider('glow-U2', (v) => `${num(v, 1)} V`, rebuild) };

  function rebuild() {
    const p = { ...modelParams(state.gas), U2: sl.U2.value };
    glow = excitationDensity(p, 120);
    marks = thresholds(p.U1, p.U2, p.dE).map((x, i) => ({ x, label: String(i + 1), dashed: true }));
    walkers = initWalkers(quantileElectrons(p, 24).map((e) => e.pts));
    sl.U2.refresh();
    anim.redraw();
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    const dE = GAS[state.gas].dE;
    drawScene(ctx, w, h, {
      lanes: 24, glow, glowRgb: state.gas === 'ne' ? '255,120,30' : '150,90,255', marks,
      dots: walkers.map((wk) => { const q = positionAlong(wk.pts, wk.u); return { x: q.x, lane: wk.lane, color: energyColor(q.E, dE) }; }),
      footer: t(state.gas === 'ne' ? 'glow.footer.ne' : 'glow.footer.hg'),
    });
  }
  const anim = makeAnimator({ canvas, toggle: document.getElementById('glow-toggle'), step: (dt) => stepWalkers(walkers, dt), draw });

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); rebuild(); } });
  document.addEventListener('langchange', () => sl.U2.refresh());
  applyRanges(state.gas, sl);
  rebuild();
}
