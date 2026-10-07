// Extrema detection and spacings on a (uniformly sampled) curve. Pure module.

// Per-gas detection settings for the simulated curves (half-window in volts).
export const EXTREMA_OPTIONS = {
  hg: { halfWindow: 1.5, prominence: 0.03 },
  ne: { halfWindow: 5, prominence: 0.03 },
};

// Parabola through (i-1, i, i+1): sub-grid position and value of the extremum.
function refine(x, y, i, dx) {
  const denom = y[i - 1] - 2 * y[i] + y[i + 1];
  if (denom === 0) return { x: x[i], y: y[i] };
  const off = Math.max(-1, Math.min(1, (0.5 * (y[i - 1] - y[i + 1])) / denom));
  return { x: x[i] + off * dx, y: y[i] - 0.25 * (y[i - 1] - y[i + 1]) * off };
}

// Local maxima/minima that stand out by at least `prominence` (fraction of the
// full y-range) on BOTH sides within `halfWindow` (in x units). Requiring both
// sides rejects the start of the plateau and noise on flat parts.
export function findExtrema(x, y, { halfWindow = 1.5, prominence = 0.04 } = {}) {
  const n = x.length;
  if (n < 3) return { maxima: [], minima: [] };
  const dx = (x[n - 1] - x[0]) / (n - 1);
  const w = Math.max(1, Math.round(halfWindow / dx));
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of y) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const minDrop = prominence * (hi - lo);
  const maxima = [];
  const minima = [];
  for (let i = w; i < n - w; i++) {
    let isMax = true, isMin = true;
    let leftMin = Infinity, rightMin = Infinity, leftMax = -Infinity, rightMax = -Infinity;
    for (let j = i - w; j <= i + w; j++) {
      if (j === i) continue;
      if (j < i) {
        if (y[j] >= y[i]) isMax = false;
        if (y[j] <= y[i]) isMin = false;
        if (y[j] < leftMin) leftMin = y[j];
        if (y[j] > leftMax) leftMax = y[j];
      } else {
        if (y[j] > y[i]) isMax = false;
        if (y[j] < y[i]) isMin = false;
        if (y[j] < rightMin) rightMin = y[j];
        if (y[j] > rightMax) rightMax = y[j];
      }
    }
    if (isMax && y[i] - leftMin >= minDrop && y[i] - rightMin >= minDrop) {
      maxima.push(refine(x, y, i, dx));
    }
    if (isMin && leftMax - y[i] >= minDrop && rightMax - y[i] >= minDrop) {
      minima.push(refine(x, y, i, dx));
    }
  }
  return { maxima, minima };
}

// Differences between successive extremum positions.
export function spacings(extrema) {
  const out = [];
  for (let i = 1; i < extrema.length; i++) out.push(extrema[i].x - extrema[i - 1].x);
  return out;
}

export function mean(values) {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
