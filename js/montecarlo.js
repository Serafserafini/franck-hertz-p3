// 1D Monte Carlo of electrons crossing the G1-G2 gap. Pure module (no DOM).
import { GAS, TUBE, meanFreePath } from './physics.js';

export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULTS = {
  gas: 'hg', tempC: 170, U3: 1.5, spread: 0.3, contact: 1.0,
  U2min: 0, U2max: 45, U2step: 0.25, electrons: 3000, seed: 1, noGas: false,
};

export function withDefaults(params) {
  return { ...DEFAULTS, ...params };
}

// Propagate one electron across the gap. Returns its final energy (eV).
// If `track` is given, pushes [x/L, E] vertices; if `exc` is given, pushes x/L of each excitation.
function transmit(rng, V, p, lambda, track, exc) {
  const L = TUBE.L;
  const { dE, pInel } = GAS[p.gas];
  let E = -p.spread * Math.log(1 - rng());
  let x = 0;
  if (track) track.push([0, E]);
  for (;;) {
    const s = -lambda * Math.log(1 - rng());
    if (x + s >= L) {
      E += (V * (L - x)) / L;
      if (track) track.push([1, E]);
      return E;
    }
    x += s;
    E += (V * s) / L;
    if (track) track.push([x / L, E]);
    if (E >= dE && rng() < pInel) {
      E -= dE;
      if (exc) exc.push(x / L);
      if (track) track.push([x / L, E]);
    }
  }
}

function lambdaFor(p) {
  return p.noGas ? Infinity : meanFreePath(p.gas, p.tempC);
}

// Fraction of electrons of final energy E (eV) that pass the retarding voltage U3.
// Collisions make the directions isotropic; only the forward cone with
// cos(theta) >= sqrt(U3/E) overcomes the counter field: 1 - sqrt(U3/E).
export function transmission(E, U3) {
  return E > U3 ? 1 - Math.sqrt(U3 / E) : 0;
}

// Anode current (relative units, 0..1) versus U2.
export function simulate(params) {
  const p = withDefaults(params);
  const lambda = lambdaFor(p);
  const U2 = [];
  const IA = [];
  const n = Math.round((p.U2max - p.U2min) / p.U2step);
  for (let k = 0; k <= n; k++) {
    const u = p.U2min + k * p.U2step;
    const V = Math.max(u - p.contact, 0);
    const rng = mulberry32(p.seed); // same stream per point: smooth curve
    let sum = 0;
    for (let i = 0; i < p.electrons; i++) {
      sum += transmission(transmit(rng, V, p, lambda, null, null), p.U3);
    }
    U2.push(u);
    IA.push(sum / p.electrons);
  }
  return { U2, IA };
}

// Trajectories for the animation at a single U2.
export function traceElectrons(params, U2, count = 40, excitationSample = 2000) {
  const p = withDefaults(params);
  const lambda = lambdaFor(p);
  const V = Math.max(U2 - p.contact, 0);
  const rng = mulberry32(p.seed + 7);
  const tracks = [];
  for (let i = 0; i < count; i++) {
    const pts = [];
    const E = transmit(rng, V, p, lambda, pts, null);
    tracks.push({ pts, reached: E >= p.U3 });
  }
  const excitations = [];
  for (let i = 0; i < excitationSample; i++) transmit(rng, V, p, lambda, null, excitations);
  return { tracks, excitations };
}
