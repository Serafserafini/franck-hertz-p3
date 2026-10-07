// Analytic Franck–Hertz model (no random numbers). Pure module: no DOM.
// Units: gap length L = 1 (position x in [0,1] from G1 to G2), energies in eV, lambda in units of L.
// Between collisions the kinetic energy grows linearly: E(x) = U1 + U2*x (uniform field = parallel-plate capacitor).
// After n inelastic collisions it is U1 + U2*x - n*dE, so the n-th collision can only happen at x >= x_n.

// Fraction of electrons of energy E (eV) passing the retarding voltage U3 (isotropic scattering assumption).
export function transmission(E, U3) {
  return E > U3 ? 1 - Math.sqrt(U3 / E) : 0;
}

// Threshold positions x_n = (n*dE - U1)/U2 (n = 1, 2, ...) that lie inside the gap (x < 1).
export function thresholds(U1, U2, dE) {
  const out = [];
  if (!(U2 > 0)) return out;
  for (let n = 1; ; n++) {
    const x = Math.max(0, (n * dE - U1) / U2);
    if (x >= 1) break;
    out.push(x);
  }
  return out;
}

// --- ideal experiment (collision exactly at threshold) -------------------------------------------
export function idealFinalEnergy(U1, U2, dE) {
  return U1 + U2 - thresholds(U1, U2, dE).length * dE;
}
export function idealCurrent(U1, U2, U3, dE) { return idealFinalEnergy(U1, U2, dE) >= U3 ? 1 : 0; }
export function idealNoGasCurrent(U1, U2, U3) { return U1 + U2 >= U3 ? 1 : 0; }
export function noGasCurrent(U1, U2, U3) { return transmission(U1 + U2, U3); }

// Ideal kinetic energy along the gap as a sawtooth: array of {x, E}.
export function idealSawtooth(U1, U2, dE) {
  const pts = [{ x: 0, E: U1 }];
  let n = 0;
  for (const x of thresholds(U1, U2, dE)) {
    pts.push({ x, E: dE }, { x, E: 0 });
    n++;
  }
  pts.push({ x: 1, E: U1 + U2 - n * dE });
  return pts;
}

// --- real model: n-th collision position S_n = max(S_{n-1}, x_n) + Exp(lambda) -------------------
// Returns probability masses p_n[j] (n = 1..m) that the n-th collision happens in bin j of `bins`.
export function eventMasses(U1, U2, dE, lambda, bins = 300) {
  if (!(lambda > 0) || !Number.isFinite(lambda)) throw new Error('lambda must be a positive finite number');
  const xs = thresholds(U1, U2, dE);
  const dy = 1 / bins;
  const decay = Math.exp(-dy / lambda);
  const out = [];
  let prev = null;
  xs.forEach((xn, idx) => {
    const p = new Float64Array(bins);
    const jx = Math.min(bins - 1, Math.floor(xn / dy));
    let delta = 1; // mass that starts waiting at the threshold x_n
    if (idx > 0) {
      delta = 0;
      for (let j = 0; j < bins; j++) if ((j + 0.5) * dy < xn) delta += prev[j];
    }
    let carry = 0; // sum of earlier sources, decayed to the left edge of bin j
    for (let j = 0; j < bins; j++) {
      const b = (j + 1) * dy;
      p[j] += carry * (1 - decay);
      carry *= decay;
      if (idx > 0) {
        const c = (j + 0.5) * dy;
        if (c >= xn && prev[j] > 0) {
          const w = Math.exp(-(b - c) / lambda);
          p[j] += prev[j] * (1 - w);
          carry += prev[j] * w;
        }
      }
      if (j === jx && delta > 0) {
        const w = Math.exp(-(b - xn) / lambda);
        p[j] += delta * (1 - w);
        carry += delta * w;
      }
    }
    out.push(p);
    prev = p;
  });
  return out;
}

// P(N = n) for n = 0..m, N = number of inelastic collisions in the gap.
export function eventProbabilities(U1, U2, dE, lambda, bins = 300) {
  const C = [1, ...eventMasses(U1, U2, dE, lambda, bins).map((p) => p.reduce((a, b) => a + b, 0)), 0];
  const P = [];
  for (let n = 0; n < C.length - 1; n++) P.push(Math.max(0, C[n] - C[n + 1]));
  return P;
}

// Anode current (relative units) of the real model.
export function realCurrent({ U1, U2, U3, dE, lambda }) {
  if (!(lambda > 0) || !Number.isFinite(lambda)) throw new Error('lambda must be a positive finite number');
  if (!(U2 > 0)) return transmission(U1, U3);
  const P = eventProbabilities(U1, U2, dE, lambda);
  let I = 0;
  for (let n = 0; n < P.length; n++) I += P[n] * transmission(U1 + U2 - n * dE, U3);
  return I;
}
export function realCurve(params, U2s) {
  return U2s.map((U2) => realCurrent({ ...params, U2 }));
}

// Fraction of electrons that miss at least one of the collisions they could have made (drives the minima floor).
export function missedFraction(U1, U2, dE, lambda) {
  const P = eventProbabilities(U1, U2, dE, lambda);
  return P.length <= 1 ? 0 : 1 - P[P.length - 1];
}

// Expected number of excitations per unit length (glow density) in `bins` bins.
export function excitationDensity({ U1, U2, dE, lambda }, bins = 120) {
  const dens = new Float64Array(bins);
  for (const p of eventMasses(U1, U2, dE, lambda, bins)) for (let j = 0; j < bins; j++) dens[j] += p[j] * bins;
  return dens;
}

// Expected kinetic energy along the gap: U1 + U2*x - dE * E[number of collisions up to x].
export function expectedEnergyProfile({ U1, U2, dE, lambda }, bins = 300) {
  const masses = eventMasses(U1, U2, dE, lambda, bins);
  const cum = new Float64Array(bins);
  const x = [0], E = [U1];
  for (const p of masses) { let s = 0; for (let j = 0; j < bins; j++) { s += p[j]; cum[j] += s; } }
  for (let j = 0; j < bins; j++) {
    const xj = (j + 1) / bins;
    x.push(xj);
    E.push(U1 + U2 * xj - dE * cum[j]);
  }
  return { x, E };
}

// Deterministic "typical electrons" (no random numbers): the exponential path delays of electron j are
// the quantiles frac(0.5 + (j+1)*alpha_k) of a Kronecker sequence, which is uniform on [0,1).
const ALPHAS = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37].map(Math.sqrt);
const frac = (v) => v - Math.floor(v);

export function quantileElectrons({ U1, U2, dE, lambda }, count = 24) {
  if (!(lambda > 0) || !Number.isFinite(lambda)) throw new Error('lambda must be a positive finite number');
  const xs = thresholds(U1, U2, dE);
  const electrons = [];
  for (let j = 0; j < count; j++) {
    const pts = [[0, U1]];
    const events = [];
    let prevS = 0;
    for (let n = 0; n < xs.length; n++) {
      const q = frac(0.5 + (j + 1) * ALPHAS[n % ALPHAS.length]);
      const S = Math.max(prevS, xs[n]) + -lambda * Math.log(1 - q);
      if (S >= 1) break;
      const before = U1 + U2 * S - n * dE;
      pts.push([S, before], [S, before - dE]);
      events.push(S);
      prevS = S;
    }
    const finalE = U1 + U2 - events.length * dE;
    pts.push([1, finalE]);
    electrons.push({ pts, events, finalE });
  }
  return electrons;
}

// Position and energy along a polyline of [x, E] vertices at parameter u in [0, pts.length-1].
export function positionAlong(pts, u) {
  const k = Math.max(0, Math.min(Math.floor(u), pts.length - 2));
  const f = Math.max(0, Math.min(1, u - k));
  const a = pts[k], b = pts[k + 1];
  return { x: a[0] + (b[0] - a[0]) * f, E: a[1] + (b[1] - a[1]) * f };
}

// Path of one electron without gas, from G1 through the gap (x in [0,1]) and the decelerating zone
// (x in [1, 1 + zone]): it passes if U1+U2 > U3, else it stops inside the zone and returns.
export function noGasPath(U1, U2, U3, zone = 0.3) {
  const E1 = U1 + U2;
  if (E1 > U3) return { passes: true, pts: [[0, U1], [1, E1], [1 + zone, E1 - U3]] };
  const stop = U3 > 0 ? 1 + zone * (E1 / U3) : 1;
  return { passes: false, pts: [[0, U1], [1, E1], [stop, 0], [1, E1], [0, U1]] };
}
