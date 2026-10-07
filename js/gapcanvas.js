import { cssVar } from './plotstyle.js';
import { wrapText } from './dom.js';
import { t } from './i18n.js';

// Size the canvas to its CSS box (device pixels) and return a ready 2D context in CSS pixels.
export function fitCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const W = Math.round(w * dpr), H = Math.round(h * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Blue (slow) to red (energy >= dE).
export function energyColor(E, dE) {
  return `hsl(${220 - 220 * Math.min(Math.max(E, 0) / dE, 1)} 85% 52%)`;
}

// One scene: tube frame, shaded zones, glow strips (bins over x in [0,1]), marks, electron dots, footer text.
export function drawScene(ctx, w, h, o) {
  const xMax = o.xMax ?? 1, padX = 28, top = 26, th = h - 26 - 44;
  const X = (x) => padX + (x / xMax) * (w - 2 * padX);
  ctx.clearRect(0, 0, w, h);
  for (const z of o.zones || []) { ctx.fillStyle = z.fill; ctx.fillRect(X(z.x0), top, X(z.x1) - X(z.x0), th); }
  if (o.glow) {
    const n = o.glow.length, max = Math.max(1e-12, ...o.glow);
    const bw = (X(1) - X(0)) / n;
    for (let i = 0; i < n; i++) {
      const a = (0.9 * o.glow[i]) / max;
      if (a < 0.03) continue;
      ctx.fillStyle = `rgba(${o.glowRgb},${a.toFixed(3)})`;
      ctx.fillRect(X(0) + i * bw, top, bw + 0.5, th);
    }
  }
  ctx.strokeStyle = cssVar('--muted');
  ctx.lineWidth = 1.5;
  ctx.strokeRect(X(0), top, X(xMax) - X(0), th);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const m of o.marks || []) {
    ctx.strokeStyle = cssVar('--muted');
    ctx.lineWidth = 1;
    ctx.setLineDash(m.dashed ? [4, 3] : []);
    ctx.beginPath(); ctx.moveTo(X(m.x), top); ctx.lineTo(X(m.x), top + th); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cssVar('--fg');
    ctx.fillText(m.label, X(m.x), top - 8);
  }
  const lanes = o.lanes || 12;
  for (const d of o.dots || []) {
    const cx = X(d.x), cy = top + ((d.lane + 0.5) / lanes) * th;
    ctx.fillStyle = d.color;
    ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, Math.PI * 2); ctx.fill();
    if (d.ring) { ctx.strokeStyle = d.ring; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 6.5, 0, Math.PI * 2); ctx.stroke(); }
  }
  if (o.footer) {
    ctx.fillStyle = cssVar('--muted');
    ctx.textAlign = 'left';
    const lines = wrapText((s) => ctx.measureText(s).width, o.footer, w - 2 * padX - 4).slice(0, 2);
    lines.forEach((l, i) => ctx.fillText(l, padX + 2, h - 8 - (lines.length - 1 - i) * 15));
  }
}

// Walkers move along polylines [x,E]: u runs over the vertex index (time per segment is equal, so an
// electron pauses visibly at a collision, where two vertices share the same x).
export function initWalkers(paths) {
  return paths.map((pts, i) => ({
    pts, lane: i, u: (i / Math.max(1, paths.length)) * (pts.length - 1),
    speed: ((pts.length - 1) / 4) * (1 + 0.12 * Math.sin(i * 1.7)),
  }));
}
export function stepWalkers(walkers, dt) {
  for (const w of walkers) {
    w.u += w.speed * dt;
    if (w.u >= w.pts.length - 1) w.u = 0;
  }
}

// Animation loop that runs only while the canvas is visible, with a play/pause button and
// reduced-motion support. step(dt) advances the state, draw() paints it.
export function makeAnimator({ canvas, toggle, step, draw }) {
  let playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false, raf = 0, last = 0;
  const label = () => { if (toggle) toggle.textContent = t(playing ? 'ctl.pause' : 'ctl.play'); };
  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    step(dt);
    draw();
  }
  function start() { if (!raf && playing && visible) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  if (toggle) toggle.addEventListener('click', () => { playing = !playing; label(); if (playing) start(); else stop(); draw(); });
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
  window.addEventListener('resize', draw);
  document.addEventListener('langchange', () => { label(); draw(); });
  document.addEventListener('themechange', draw);
  label();
  return { redraw: draw };
}
