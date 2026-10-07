import { state, subscribe, simParams } from './store.js';
import { traceElectrons } from './montecarlo.js';
import { GAS } from './physics.js';
import { t } from './i18n.js';
import { cssVar } from './plotstyle.js';
import { wrapText } from './dom.js';

const LANES = 12;
const BINS = 80;
const REBUILD_KEYS = ['gas', 'tempC', 'U3', 'spread', 'contact', 'probeU2'];

export function initMotion() {
  const canvas = document.getElementById('motion-canvas');
  const toggle = document.getElementById('motion-toggle');
  const ctx = canvas.getContext('2d');
  let electrons = [], bins = new Array(BINS).fill(0), maxBin = 1;
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, raf = 0, last = 0, timer = 0;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rebuild() {
    const { tracks, excitations } = traceElectrons(simParams(), state.probeU2, 36, 4000);
    bins = new Array(BINS).fill(0);
    for (const x of excitations) bins[Math.min(BINS - 1, Math.floor(x * BINS))]++;
    maxBin = Math.max(1, ...bins);
    electrons = tracks.map((tr, i) => ({
      pts: tr.pts, lane: i % LANES, speed: 5 + Math.random() * 3,
      u: Math.random() * (tr.pts.length - 1),
    }));
    draw();
  }

  function posOf(e) {
    const k = Math.min(Math.floor(e.u), e.pts.length - 2);
    const f = e.u - k;
    const a = e.pts[k], b = e.pts[k + 1];
    return { x: a[0] + (b[0] - a[0]) * f, E: a[1] + (b[1] - a[1]) * f };
  }

  function draw() {
    resize();
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const x0 = 28, x1 = w - 28, y0 = 22, th = h - 60; // bottom strip holds up to two lines of text
    ctx.clearRect(0, 0, w, h);
    const rgb = state.gas === 'ne' ? '255,120,30' : '150,90,255';
    const bw = (x1 - x0) / BINS;
    for (let i = 0; i < BINS; i++) {
      const a = (0.85 * bins[i]) / maxBin;
      if (a < 0.02) continue;
      ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`;
      ctx.fillRect(x0 + i * bw, y0, bw + 0.5, th);
    }
    ctx.strokeStyle = cssVar('--muted');
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, x1 - x0, th);
    ctx.fillStyle = cssVar('--fg');
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('G₁', x0 - 4, 14);
    ctx.textAlign = 'right';
    ctx.fillText('G₂', x1 + 4, 14);
    const dE = GAS[state.gas].dE;
    for (const e of electrons) {
      const { x, E } = posOf(e);
      ctx.fillStyle = `hsl(${220 - 220 * Math.min(E / dE, 1)} 85% 52%)`;
      ctx.beginPath();
      ctx.arc(x0 + x * (x1 - x0), y0 + ((e.lane + 0.5) / LANES) * th, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = cssVar('--muted');
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const lines = wrapText((s) => ctx.measureText(s).width, t(state.gas === 'ne' ? 'motion.glow.ne' : 'motion.glow.hg'), x1 - x0 - 4).slice(0, 2);
    lines.forEach((line, i) => ctx.fillText(line, x0 + 2, h - 8 - (lines.length - 1 - i) * 15));
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    for (const e of electrons) {
      e.u += e.speed * dt;
      if (e.u >= e.pts.length - 1) e.u = 0;
    }
    draw();
  }
  function start() { if (!raf && playing && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function label() { toggle.textContent = t(playing ? 'motion.pause' : 'motion.play'); }

  toggle.addEventListener('click', () => { playing = !playing; label(); if (playing) start(); else stop(); draw(); });
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
  window.addEventListener('resize', draw);
  document.addEventListener('langchange', () => { label(); draw(); });
  document.addEventListener('themechange', draw);
  subscribe((keys) => {
    if (keys.some((k) => REBUILD_KEYS.includes(k))) { clearTimeout(timer); timer = setTimeout(rebuild, 80); }
  });

  label();
  rebuild();
}
