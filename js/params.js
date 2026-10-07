import { GAS, DEFAULTS, RANGES, lambdaOverL } from './physics.js';
import { num } from './i18n.js';

// Parameters of the analytic model for a gas, with optional overrides.
export function modelParams(gasId, o = {}) {
  const d = DEFAULTS[gasId];
  return {
    U1: o.U1 ?? d.U1,
    U3: o.U3 ?? d.U3,
    dE: GAS[gasId].dE,
    lambda: lambdaOverL(gasId, o.density ?? d.density),
    sigma: 0.08 * GAS[gasId].dE, // energy spread of the electrons (eV): rounds the peaks, lifts the minima
    rise: 0.2,                  // growth of the collected current with U2, per dE
  };
}

// U2 values 0 ... max in the U2 step of the gas.
export function u2Grid(gasId) {
  const [, max, step] = RANGES[gasId].U2;
  const n = Math.round(max / step);
  return Array.from({ length: n + 1 }, (_, i) => i * step);
}

export function densityText(gasId, v) {
  return gasId === 'hg' ? `${num(v)} °C` : `${num(v)} hPa`;
}

// Apply ranges and default values to sliders {range(min,max,step), set(v)} named U1, U2, U3 or density.
export function applyRanges(gasId, sliders) {
  for (const key of ['U1', 'U2', 'U3', 'density']) {
    const s = sliders[key];
    if (!s) continue;
    const [min, max, step] = RANGES[gasId][key];
    s.range(min, max, step);
    s.set(DEFAULTS[gasId][key]);
  }
}
