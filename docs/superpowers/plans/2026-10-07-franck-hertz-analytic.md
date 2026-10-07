# Franck–Hertz Analytic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the page on branch `analytic` so that it explains the experiment along the user's teaching sequence using closed-form theory only (no Monte Carlo, no random numbers).

**Architecture:** One new pure module `analytic.js` holds the whole model (ideal step/sawtooth, real model with a finite inelastic mean free path via an exact recursion on collision positions, expected energy, glow density, deterministic "typical electrons"). Thin UI modules, one per page section, read a tiny shared store (only the chosen gas) and draw with Plotly, SVG and canvas. Old Monte Carlo modules are deleted in the cut-over task.

**Tech Stack:** HTML/CSS/vanilla JS ES modules, Plotly basic 2.35.2 and KaTeX 0.16.11 (already vendored), headless Google Chrome for tests (`./scripts/test.sh`, `./scripts/smoke.sh`), bash, python3 (stdlib only) for the dev CDP client.

**Spec:** `docs/superpowers/specs/2026-10-07-franck-hertz-analytic-design.md`. **Task 1 corrects it** (the collision recursion and the value of `λ170`); read the spec's section 4 together with Task 1.

## Global Constraints

- Work on branch `analytic` of the repo `site/` (do not touch `main`; the published site is built from `main`).
- Language: EN/DE toggle, default EN (German if browser language starts with `de`; `?lang=de|en` overrides). All numbers shown to the user go through `num()`/`t()` (German decimal comma); Plotly gets `separators` from `baseLayout`.
- Content scope: physics understanding only. **No** safety information, instrument operation, uncertainty budgets, Task-1 data, dates, points, deadlines (a test scans all strings).
- No build step; libraries vendored; no remote requests at runtime; ES modules need http (`./scripts/serve.sh`).
- **No random numbers anywhere**: `Math.random` must not appear in `js/` (a test checks this). Animations are deterministic.
- Pure modules (`physics`, `analytic`, `analysis`, `format`, `params`, `strings*`) have no DOM access.
- `localStorage` access always in try/catch.
- Layout works at 390 px wide with no horizontal page scroll; dark mode via `prefers-color-scheme`; `prefers-reduced-motion` starts animations paused.
- Model constants: Hg ΔE = 4.9 eV, Ne ΔE = 19.0 eV; `λ` (inelastic mean free path in units of the gap length `L`) is `0.08` at 170 °C (Hg) or 10 hPa (Ne), scaled by `p(170 °C)/p(T)` for Hg (`log10(p/Pa) = 10.05 − 3163/T(K)`) and by `10 hPa/p` for Ne.
- Commit messages end with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Test command (must pass before every commit touching `js/`, `tests/`, `index.html`): `./scripts/test.sh`.

## Review Focus

Input classes the spec implies but a casual test list would miss (each is pinned by a test in the named task):

1. `U1 ≥ ΔE` (collisions already in the suction region) and `U2 = 0` must not hang or produce `NaN` — Task 2.
2. A non-positive or non-finite mean free path must be rejected, not produce `NaN` curves — Task 2.
3. Switching gas must reset every slider range and value (a `U2` value above the new maximum would draw outside the data) — Tasks 5–11, checked in the real-browser steps.
4. Every `data-i18n` key exists in both languages, placeholders match, no string is out of scope, every plot/canvas/SVG has a translated accessible name, live regions exist — Task 4.
5. The page must contain no `Math.random` and make no remote requests — Task 4.

---

## File Structure

```
site/
  index.html                 all section markup (rewritten in Task 4)
  css/style.css              + gas bar, cards, bar, canvas helpers (Task 4)
  js/
    physics.js               constants, GAS{dE}, LEVELS, ORBITALS, RANGES/DEFAULTS, lambdaOverL   [pure]
    analytic.js              the model                                                           [pure]
    params.js                modelParams(), u2Grid(), densityText(), applyRanges()               [pure + num()]
    analysis.js format.js    kept
    strings.js strings/*.js  all texts, rewritten (Task 4)
    i18n.js dom.js plotstyle.js   kept
    store.js                 { gas } + subscribe/update (rewritten)
    controls.js              makeSlider()
    gapcanvas.js             fitCanvas, drawScene, makeAnimator, walkers
    levels.js orbitals.js    section 1
    schematic.js             section 2
    sweep.js                 section 4
    nogas.js                 sections 5 and 6
    withgas.js               section 7
    peaks.js                 section 8
    glow.js                  section 9
    minima.js                section 10
    main.js                  boot
  scripts/ cdp.py browser.sh   dev tools for real-browser checks (Task 4)
  tests/ analytic.test.js ... updated per task
```

Deleted in Task 4: `montecarlo.js`, `worker.js`, `compute.js`, `curve.js`, `motion.js`, `spacing.js`, `tube.js`, `profile.js`, `strings/{idea,tube,curve,delta,refs}.js` (rewritten), and their tests.

---

### Task 1: Correct the spec, extend `physics.js` (additive)

**Files:**
- Modify: `docs/superpowers/specs/2026-10-07-franck-hertz-analytic-design.md`, `js/physics.js`, `tests/physics.test.js`

**Interfaces:**
- Produces (physics.js, added next to the existing exports; nothing is removed in this task):
  - `LAMBDA_REF = 0.08`
  - `lambdaOverL(gasId, density) -> number` (`density` = temperature in °C for `'hg'`, pressure in hPa for `'ne'`; throws on unknown gas or non-positive density)
  - `DEFAULTS = {hg:{U1:1,U3:1.5,U2:20,density:170}, ne:{U1:2,U3:7,U2:50,density:10}}`
  - `RANGES = {hg:{U1:[0,4.5,0.1],U2:[0,45,0.25],U3:[0.5,5,0.1],density:[150,190,1]}, ne:{U1:[0,18,0.5],U2:[0,90,0.5],U3:[0.5,15,0.5],density:[5,20,0.5]}}` (each `[min,max,step]`)
  - `ORBITALS = {hg:{ground:[{name,boxes}],excited:[…]}, ne:{…}}`; box codes `0` empty, `1` spin up, `2` spin down, `3` paired.

- [ ] **Step 1: Write the failing tests**

Append to `tests/physics.test.js` and extend its import list with `LAMBDA_REF, lambdaOverL, DEFAULTS, RANGES, ORBITALS`:

```js
test('lambdaOverL is the reference value at 170 degC (Hg) and 10 hPa (Ne)', () => {
  assert.close(lambdaOverL('hg', 170), LAMBDA_REF, 1e-12);
  assert.close(lambdaOverL('ne', 10), LAMBDA_REF, 1e-12);
});

test('lambdaOverL shrinks with Hg temperature and with Ne pressure', () => {
  assert.ok(lambdaOverL('hg', 150) > lambdaOverL('hg', 170));
  assert.ok(lambdaOverL('hg', 170) > lambdaOverL('hg', 190));
  assert.close(lambdaOverL('ne', 20), LAMBDA_REF / 2, 1e-12);
});

test('lambdaOverL rejects unknown gases and non-positive Ne pressure', () => {
  let n = 0;
  try { lambdaOverL('xx', 1); } catch { n++; }
  try { lambdaOverL('ne', 0); } catch { n++; }
  try { lambdaOverL('ne', -3); } catch { n++; }
  assert.equal(n, 3);
});

test('defaults lie inside the slider ranges and U1 stays below dE', () => {
  for (const id of ['hg', 'ne']) {
    for (const k of ['U1', 'U2', 'U3', 'density']) {
      const [lo, hi, step] = RANGES[id][k];
      assert.between(DEFAULTS[id][k], lo, hi, `${id}.${k}`);
      assert.ok(step > 0);
    }
    assert.ok(RANGES[id].U1[1] < GAS[id].dE, id + ': U1 max must stay below dE');
  }
});

test('ground and excited orbital diagrams hold the same number of electrons', () => {
  const count = (groups) => groups.reduce((s, g) => s + g.boxes.reduce((a, b) => a + (b === 3 ? 2 : b === 0 ? 0 : 1), 0), 0);
  for (const id of ['hg', 'ne']) {
    assert.equal(count(ORBITALS[id].ground), count(ORBITALS[id].excited), id);
    assert.ok(count(ORBITALS[id].ground) > 0);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (the new names are not exported yet, so the suite does not finish: output has no `RESULT:` line or shows FAIL).

- [ ] **Step 3: Implement**

Append to `js/physics.js`:

```js
// ---- analytic redesign -------------------------------------------------------------------------
// Inelastic mean free path in units of the gap length L at the reference gas density
// (Hg at 170 degC, Ne at 10 hPa). A tuning constant for readable curves, not a measured value.
export const LAMBDA_REF = 0.08;

// density: temperature in degC for Hg (vapour pressure fixes the density), pressure in hPa for Ne.
export function lambdaOverL(gasId, density) {
  if (gasId === 'hg') return LAMBDA_REF * hgVaporPressure(170) / hgVaporPressure(density);
  if (gasId === 'ne') {
    if (!(density > 0)) throw new Error('Ne pressure must be positive');
    return LAMBDA_REF * 10 / density;
  }
  throw new Error('unknown gas: ' + gasId);
}

export const DEFAULTS = {
  hg: { U1: 1, U3: 1.5, U2: 20, density: 170 },
  ne: { U1: 2, U3: 7, U2: 50, density: 10 },
};

// [min, max, step] of the sliders; U1 stays below dE (no collisions before G1).
export const RANGES = {
  hg: { U1: [0, 4.5, 0.1], U2: [0, 45, 0.25], U3: [0.5, 5, 0.1], density: [150, 190, 1] },
  ne: { U1: [0, 18, 0.5], U2: [0, 90, 0.5], U3: [0.5, 15, 0.5], density: [5, 20, 0.5] },
};

// Valence orbitals for the box diagrams. Box codes: 0 empty, 1 spin up, 2 spin down, 3 paired.
export const ORBITALS = {
  hg: {
    ground: [{ name: '6s', boxes: [3] }, { name: '6p', boxes: [0, 0, 0] }],
    excited: [{ name: '6s', boxes: [1] }, { name: '6p', boxes: [1, 0, 0] }], // 6 3P1: parallel spins
  },
  ne: {
    ground: [{ name: '2p', boxes: [3, 3, 3] }, { name: '3s', boxes: [0] }],
    excited: [{ name: '2p', boxes: [3, 3, 1] }, { name: '3s', boxes: [1] }],
  },
};
```

- [ ] **Step 4: Correct the spec**

In `docs/superpowers/specs/2026-10-07-franck-hertz-analytic-design.md` replace sections 4.3 to 4.7 (from the line `### 4.3 Real model with gas` up to, but not including, `## 5. Architecture`) with:

```markdown
### 4.3 Real model with gas
Energy bookkeeping: after `n` collisions `E(x) = U1 + U2·x − n·ΔE`, so the `n`-th collision can only happen at `x ≥ x_n` (the fixed ideal thresholds) and, once eligible, happens after an exponential path of mean `λ` (in units of `L`):

`S_n = max(S_{n−1}, x_n) + Exp(λ)`, `S_0 = 0`.

The number of collisions `N` in the gap has `P(N ≥ n) = P(S_n ≤ 1) =: C_n`, so `P(N = n) = C_n − C_{n+1}` (`C_0 = 1`). The final energy depends only on `N`: `E_f = U1 + U2 − N·ΔE`. Therefore

`I_A(U2) = Σ_n P(N = n) · T(U1 + U2 − n·ΔE)`, with `T(E) = 1 − √(U3/E)` for `E > U3`, else 0.

The distribution of `S_n` is computed exactly by a linear recursion on 300 position bins (a discrete renewal equation with an exponential kernel, `O(bins)` per collision order). Glow density: `u(x) = Σ_n p_n(x)`. Expected energy profile: `Ē(x) = U1 + U2·x − ΔE·Σ_n P(S_n ≤ x)`.

### 4.4 Minima
Minima are not zero because electrons do not collide as soon as they are eligible: the fraction that misses at least one of the possible collisions is `1 − C_m` (`m` = number of thresholds in the gap). It grows with `λ`, i.e. as the gas density falls. For the last zone the chance of not exciting before G₂ is about `exp(−(1 − x_m)/λ)`.

### 4.5 Gas density
`λ = 0.08` at 170 °C (Hg) / 10 hPa (Ne): `λ(T) = 0.08·p(170 °C)/p(T)` for Hg (`≈ 0.17` at 150 °C, `≈ 0.04` at 190 °C), `λ(p) = 0.08·10 hPa/p` for Ne. A tuning constant, not data.

### 4.6 Deterministic animation
Electron `j` of `N` draws the delay of its `k`-th collision from the quantile `frac(0.5 + (j+1)·α_k)` of the exponential distribution, with `α_k` the square roots of the first primes. No random numbers are used; results are reproducible.

### 4.7 Numerical check (planning time)
`ΔE = 4.9`, `U1 = 1`, `U3 = 1.5`: peak spacing stays 4.75–5.0 V (grid 0.25 V) for every `λ` from 0.01 to 0.2; minima rise with `λ` (about 0 at `λ = 0.01`, 0.02–0.27 at `λ = 0.08`, 0.14–0.55 at `λ = 0.2`); the probabilities `P(N = n)` sum to 1. (An earlier version of this section used a renewal model that restarted from zero energy after each collision; it was wrong and made the spacing drift.)
```

Also in section 5 of the spec change the sentence `analytic.js — idealCurrent, idealProfile points, noGasCurrent, realCurrent, realCurve, excitationDensity, slipThrough, quantileElectrons` to `analytic.js — thresholds, idealCurrent, idealSawtooth, noGasCurrent, eventProbabilities, realCurrent, realCurve, missedFraction, excitationDensity, expectedEnergyProfile, quantileElectrons, positionAlong, noGasPath`.

- [ ] **Step 5: Run to verify it passes, commit**

Run: `./scripts/test.sh`
Expected: `RESULT: PASS (79)` (74 existing + 5 new).

```bash
git add -A
git commit -m "feat: analytic model constants (lambda, ranges, orbitals); correct the spec" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `analytic.js` — the model

**Files:**
- Create: `js/analytic.js`, `tests/analytic.test.js`
- Modify: `tests/index.html` (add `import './analytic.test.js';`)

**Interfaces:**
- Consumes: `findExtrema`, `spacings`, `mean` from `analysis.js` (tests only).
- Produces (all pure; `L = 1`, energies in eV, `lambda` in units of `L`):
  - `transmission(E, U3)`, `thresholds(U1, U2, dE) -> number[]`
  - `idealFinalEnergy(U1,U2,dE)`, `idealCurrent(U1,U2,U3,dE) -> 0|1`, `idealNoGasCurrent(U1,U2,U3) -> 0|1`, `noGasCurrent(U1,U2,U3)`, `idealSawtooth(U1,U2,dE) -> {x,E}[]`
  - `eventMasses(U1,U2,dE,lambda,bins=300) -> Float64Array[]`, `eventProbabilities(U1,U2,dE,lambda,bins=300) -> number[]` (`P(N=n)`, `n=0..m`)
  - `realCurrent({U1,U2,U3,dE,lambda}) -> number`, `realCurve(params, U2s) -> number[]`
  - `missedFraction(U1,U2,dE,lambda)`, `excitationDensity({U1,U2,dE,lambda}, bins=120) -> Float64Array`, `expectedEnergyProfile({U1,U2,dE,lambda}, bins=300) -> {x:number[],E:number[]}`
  - `quantileElectrons({U1,U2,dE,lambda}, count=24) -> {pts:[x,E][], events:number[], finalE}[]`, `positionAlong(pts,u) -> {x,E}`, `noGasPath(U1,U2,U3,zone=0.3) -> {passes, pts}`

- [ ] **Step 1: Write the failing tests**

`tests/analytic.test.js`:

```js
import { test, assert } from './harness.js';
import {
  transmission, thresholds, idealFinalEnergy, idealCurrent, idealNoGasCurrent, noGasCurrent, idealSawtooth,
  eventProbabilities, realCurrent, realCurve, missedFraction, excitationDensity, expectedEnergyProfile,
  quantileElectrons, positionAlong, noGasPath,
} from '../js/analytic.js';
import { findExtrema, spacings, mean } from '../js/analysis.js';

const hg = { U1: 1, U3: 1.5, dE: 4.9 };
const grid = (max, step) => Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);

test('thresholds are x_n = (n dE - U1)/U2 inside the gap', () => {
  const x = thresholds(1, 12, 4.9);
  assert.equal(x.length, 2);
  assert.close(x[0], 3.9 / 12, 1e-12);
  assert.close(x[1], 8.8 / 12, 1e-12);
  assert.equal(thresholds(1, 0, 4.9).length, 0);
  assert.equal(thresholds(1, 3, 4.9).length, 0);
});

test('thresholds terminate and stay in [0,1) even for U1 >= dE', () => {
  const x = thresholds(30, 10, 4.9);
  for (const v of x) assert.between(v, 0, 0.999999);
  assert.ok(x.length <= 9);
});

test('ideal sawtooth: final energy and anode current', () => {
  assert.close(idealFinalEnergy(1, 12, 4.9), 13 - 9.8, 1e-12);
  assert.equal(idealCurrent(1, 12, 1.5, 4.9), 1);
  assert.close(idealFinalEnergy(1, 10, 4.9), 11 - 9.8, 1e-12);
  assert.equal(idealCurrent(1, 10, 1.5, 4.9), 0);
});

test('ideal sawtooth polyline starts at U1, resets to 0 at each threshold and ends at the final energy', () => {
  const pts = idealSawtooth(1, 12, 4.9);
  assert.equal(pts[0].E, 1);
  assert.equal(pts.filter((p) => p.E === 0).length, 2);
  assert.close(pts[pts.length - 1].E, 3.2, 1e-12);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].x >= pts[i - 1].x);
});

test('no gas: ideal step and real smooth rise', () => {
  assert.equal(idealNoGasCurrent(1, 0.2, 1.5), 0);
  assert.equal(idealNoGasCurrent(1, 0.5, 1.5), 1);
  let prev = -1;
  for (const U2 of grid(40, 0.5)) { const I = noGasCurrent(1, U2, 1.5); assert.ok(I >= prev - 1e-12); prev = I; }
  assert.equal(noGasCurrent(1, 0.2, 1.5), 0);
  assert.ok(noGasCurrent(1, 40, 1.5) > 0.7 && noGasCurrent(1, 40, 1.5) < 1);
});

test('transmission is 0 up to U3 and tends to 1', () => {
  assert.equal(transmission(1.5, 1.5), 0);
  assert.close(transmission(1e6, 1.5), 1, 2e-3);
});

test('collision-count probabilities are non-negative and sum to 1', () => {
  for (const [U2, lambda] of [[12, 0.08], [20, 0.2], [33, 0.02], [5, 0.5]]) {
    const P = eventProbabilities(1, U2, 4.9, lambda);
    for (const p of P) assert.ok(p >= 0);
    assert.close(P.reduce((a, b) => a + b, 0), 1, 1e-9);
  }
});

test('lambda -> 0 reproduces the ideal collision count', () => {
  const P = eventProbabilities(1, 12, 4.9, 0.001);
  assert.close(P[2], 1, 0.01);
  const I = realCurrent({ ...hg, U2: 12, lambda: 0.001 });
  assert.close(I, 1 - Math.sqrt(1.5 / 3.2), 0.02);
});

test('large lambda means few collisions: the current approaches the no-gas current', () => {
  const I = realCurrent({ ...hg, U2: 12, lambda: 1e4 });
  assert.close(I, noGasCurrent(1, 12, 1.5), 0.02);
});

test('real curve (Hg, lambda 0.08): maxima are about dE apart and minima are not zero', () => {
  const U2s = grid(45, 0.25);
  const I = realCurve({ ...hg, lambda: 0.08 }, U2s);
  const e = findExtrema(U2s, I, { halfWindow: 1.5, prominence: 0.03 });
  assert.ok(e.maxima.length >= 5, 'maxima ' + e.maxima.length);
  assert.between(mean(spacings(e.maxima)), 4.6, 5.2);
  assert.between(mean(spacings(e.minima)), 4.6, 5.2);
  for (const m of e.minima) assert.ok(m.y > 0.001);
});

test('minima rise with the mean free path (lower gas pressure fills the dips)', () => {
  const U2s = grid(40, 0.25);
  const floor = (lambda) => {
    const I = realCurve({ ...hg, lambda }, U2s);
    const e = findExtrema(U2s, I, { halfWindow: 1.5, prominence: 0.02 });
    return mean(e.minima.map((m) => m.y));
  };
  assert.ok(floor(0.04) < floor(0.08));
  assert.ok(floor(0.08) < floor(0.2));
});

test('first peak position shifts with U1 but the spacing stays dE', () => {
  const U2s = grid(40, 0.25);
  const peaks = (U1) => findExtrema(U2s, realCurve({ U1, U3: 1.5, dE: 4.9, lambda: 0.05 }, U2s), { halfWindow: 1.5, prominence: 0.03 }).maxima;
  const a = peaks(0.5), b = peaks(2.5);
  const shifts = b.slice(1, 4).map((m, i) => m.x - a.slice(1, 4)[i].x);
  for (const s of shifts) assert.close(s, -2, 0.6);
  assert.close(mean(spacings(a)), mean(spacings(b)), 0.3);
});

test('missed fraction grows with lambda and is 0 when no collision is possible', () => {
  assert.ok(missedFraction(1, 20, 4.9, 0.02) < missedFraction(1, 20, 4.9, 0.2));
  assert.equal(missedFraction(1, 3, 4.9, 0.1), 0);
});

test('U2 = 0 and U1 above dE give finite results', () => {
  assert.ok(Number.isFinite(realCurrent({ ...hg, U2: 0, lambda: 0.08 })));
  const I = realCurrent({ U1: 30, U3: 1.5, dE: 4.9, U2: 10, lambda: 0.08 });
  assert.ok(Number.isFinite(I) && I >= 0 && I <= 1);
  assert.ok(Number.isFinite(missedFraction(30, 10, 4.9, 0.08)));
});

test('a non-positive or non-finite mean free path gives no NaN: it is rejected', () => {
  let n = 0;
  for (const lambda of [0, -0.1, NaN, Infinity]) {
    try { realCurrent({ ...hg, U2: 20, lambda }); } catch { n++; }
  }
  assert.equal(n, 4);
});

test('expected energy profile ends at U1 + U2 - dE * E[N] and starts at U1', () => {
  const U1 = 1, U2 = 20, dE = 4.9, lambda = 0.1;
  const prof = expectedEnergyProfile({ U1, U2, dE, lambda }, 300);
  const P = eventProbabilities(U1, U2, dE, lambda, 300);
  const EN = P.reduce((s, p, n) => s + n * p, 0);
  assert.equal(prof.E[0], U1);
  assert.close(prof.E[prof.E.length - 1], U1 + U2 - dE * EN, 1e-9);
  for (const E of prof.E) assert.ok(E >= -1e-9);
});

test('excitation density integrates to the expected number of collisions and is 0 before the first threshold', () => {
  const U1 = 1, U2 = 20, dE = 4.9, lambda = 0.1, bins = 120;
  const d = excitationDensity({ U1, U2, dE, lambda }, bins);
  const EN = eventProbabilities(U1, U2, dE, lambda, bins).reduce((s, p, n) => s + n * p, 0);
  assert.close(d.reduce((a, b) => a + b, 0) / bins, EN, 1e-9);
  const x1 = thresholds(U1, U2, dE)[0];
  for (let j = 0; j < Math.floor(x1 * bins) - 1; j++) assert.equal(d[j], 0);
});

test('quantile electrons are deterministic, ordered and keep non-negative energies', () => {
  const p = { U1: 1, U2: 20, dE: 4.9, lambda: 0.1 };
  const a = quantileElectrons(p, 24), b = quantileElectrons(p, 24);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(a.length, 24);
  for (const el of a) {
    for (let i = 1; i < el.pts.length; i++) assert.ok(el.pts[i][0] >= el.pts[i - 1][0] - 1e-12);
    for (const [x, E] of el.pts) { assert.between(x, 0, 1); assert.ok(E >= -1e-9); }
    assert.close(el.finalE, 1 + 20 - el.events.length * 4.9, 1e-9);
  }
});

test('quantile electrons reproduce the collision statistics of the model', () => {
  const p = { U1: 1, U2: 20, dE: 4.9, lambda: 0.1 };
  const els = quantileElectrons(p, 400);
  const meanN = els.reduce((s, e) => s + e.events.length, 0) / els.length;
  const EN = eventProbabilities(1, 20, 4.9, 0.1).reduce((s, q, n) => s + n * q, 0);
  assert.close(meanN, EN, 0.2);
});

test('positionAlong interpolates and clamps', () => {
  const pts = [[0, 1], [1, 5], [1, 0], [1, 3]];
  assert.close(positionAlong(pts, 0.5).x, 0.5, 1e-12);
  assert.close(positionAlong(pts, 0.5).E, 3, 1e-12);
  assert.close(positionAlong(pts, -3).E, 1, 1e-12);
  assert.close(positionAlong(pts, 99).E, 3, 1e-12);
});

test('noGasPath: passing electrons cross the decelerating zone, others turn back', () => {
  const ok = noGasPath(1, 12, 1.5);
  assert.ok(ok.passes);
  assert.close(ok.pts[ok.pts.length - 1][1], 13 - 1.5, 1e-12);
  const no = noGasPath(1, 0.2, 1.5);
  assert.ok(!no.passes);
  assert.equal(no.pts[no.pts.length - 1][0], 0);
  assert.ok(no.pts[2][0] > 1 && no.pts[2][0] < 1.3);
});
```

Add `import './analytic.test.js';` to `tests/index.html` above `await run();`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (module `../js/analytic.js` missing, suite does not finish).

- [ ] **Step 3: Implement**

`js/analytic.js` (the validity guard on `lambda` is the only change relative to the version verified at planning time):

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/test.sh`
Expected: `RESULT: PASS (100)` (79 + 21 new). If a tolerance test fails by a small margin, print the measured value and check it against the physics before touching a tolerance.

- [ ] **Step 5: Commit**

```bash
git add js/analytic.js tests/analytic.test.js tests/index.html
git commit -m "feat: add the analytic Franck-Hertz model" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `params.js` — shared parameter helpers

**Files:**
- Create: `js/params.js`, `tests/params.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: `GAS`, `DEFAULTS`, `RANGES`, `lambdaOverL` (`physics.js`); `num` (`i18n.js`).
- Produces:
  - `modelParams(gasId, o = {}) -> {U1, U3, dE, lambda}` (`o.U1`, `o.U3`, `o.density` override the defaults)
  - `u2Grid(gasId) -> number[]` (0 to the `U2` maximum in the `U2` step)
  - `densityText(gasId, v) -> string` (`"170 °C"` / `"10,5 hPa"` localised)
  - `applyRanges(gasId, sliders)` where `sliders` maps any of `U1,U2,U3,density` to `{range(min,max,step), set(v)}`: applies the ranges and the default values.

- [ ] **Step 1: Write the failing tests**

`tests/params.test.js`:

```js
import { test, assert } from './harness.js';
import { modelParams, u2Grid, densityText, applyRanges } from '../js/params.js';
import { DEFAULTS, RANGES, GAS, lambdaOverL } from '../js/physics.js';
import { setLang } from '../js/i18n.js';

test('modelParams uses the gas defaults and allows overrides', () => {
  const p = modelParams('hg');
  assert.equal(p.U1, DEFAULTS.hg.U1);
  assert.equal(p.U3, DEFAULTS.hg.U3);
  assert.equal(p.dE, GAS.hg.dE);
  assert.close(p.lambda, lambdaOverL('hg', DEFAULTS.hg.density), 1e-12);
  const q = modelParams('ne', { U1: 3, density: 20 });
  assert.equal(q.U1, 3);
  assert.equal(q.U3, DEFAULTS.ne.U3);
  assert.close(q.lambda, lambdaOverL('ne', 20), 1e-12);
});

test('u2Grid runs from 0 to the U2 maximum in the U2 step', () => {
  const g = u2Grid('hg');
  const [, max, step] = RANGES.hg.U2;
  assert.equal(g[0], 0);
  assert.close(g[g.length - 1], max, 1e-9);
  assert.close(g[1] - g[0], step, 1e-12);
  assert.equal(g.length, Math.round(max / step) + 1);
});

test('densityText shows units and follows the language', () => {
  try {
    setLang('en');
    assert.equal(densityText('hg', 170), '170 °C');
    assert.equal(densityText('ne', 10.5), '10.5 hPa');
    setLang('de');
    assert.equal(densityText('ne', 10.5), '10,5 hPa');
  } finally { setLang('en'); }
});

test('applyRanges sets ranges and default values on the given sliders', () => {
  const calls = [];
  const mk = (name) => ({ range: (a, b, c) => calls.push([name, 'range', a, b, c]), set: (v) => calls.push([name, 'set', v]) });
  applyRanges('ne', { U1: mk('U1'), density: mk('density') });
  assert.equal(calls.length, 4);
  assert.equal(JSON.stringify(calls[0]), JSON.stringify(['U1', 'range', 0, 18, 0.5]));
  assert.equal(JSON.stringify(calls[1]), JSON.stringify(['U1', 'set', 2]));
  assert.equal(JSON.stringify(calls[3]), JSON.stringify(['density', 'set', 10]));
});
```

Add `import './params.test.js';` to `tests/index.html`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (module `../js/params.js` missing).

- [ ] **Step 3: Implement**

`js/params.js`:

```js
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
```

- [ ] **Step 4: Run to verify it passes, commit**

Run: `./scripts/test.sh` — Expected: `RESULT: PASS (104)`.

```bash
git add js/params.js tests/params.test.js tests/index.html
git commit -m "feat: add shared parameter helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cut-over — texts, page skeleton, dev tools, removal of the Monte Carlo code

**Files:**
- Create: `js/strings/common.js`, `js/strings/idea.js`, `js/strings/scheme.js`, `js/strings/run.js`, `js/strings/nogas.js`, `js/strings/gas.js`, `js/strings/peaks.js`, `js/strings/glow.js`, `js/strings/minima.js`, `js/strings/refs.js` (the five existing files `common, idea, refs` are overwritten, `tube, curve, delta` are deleted), `js/controls.js`, `js/gapcanvas.js`, `scripts/cdp.py`, `scripts/browser.sh`, `tests/format.test.js`
- Modify (rewrite): `index.html`, `css/style.css` (append), `js/strings.js`, `js/store.js`, `js/main.js`, `js/physics.js` (prune), `tests/i18n.test.js`, `tests/physics.test.js`, `tests/index.html`, `scripts/smoke.sh`, `README.md`
- Delete: `js/montecarlo.js`, `js/worker.js`, `js/compute.js`, `js/curve.js`, `js/motion.js`, `js/spacing.js`, `js/tube.js`, `js/profile.js`, `js/strings/tube.js`, `js/strings/curve.js`, `js/strings/delta.js`, `tests/montecarlo.test.js`, `tests/compute.test.js`, `tests/store.test.js`, `tests/profile.test.js`, `tests/levels.test.js` (rewritten in Task 5)

**Interfaces:**
- Produces:
  - DOM ids (all used by later tasks) listed in the markup below.
  - `store.js`: `state = {gas}`, `update(patch)`, `subscribe(fn) -> unsubscribe`.
  - `controls.js`: `makeSlider(id, fmt, onInput) -> {el, value (getter), set(v), range(min,max,step), refresh()}`; writes `fmt(value)` to `#<id>-out`.
  - `gapcanvas.js`: `fitCanvas(canvas) -> {ctx,w,h}`, `energyColor(E, dE)`, `drawScene(ctx, w, h, opts)` (opts: `xMax, zones[{x0,x1,fill}], glow[], glowRgb, marks[{x,label,dashed}], dots[{x,lane,color,ring?}], lanes, footer`), `initWalkers(paths) -> {pts,u,speed,lane}[]`, `stepWalkers(walkers, dt)`, `makeAnimator({canvas, toggle, step, draw}) -> {redraw}`.
  - `physics.js` keeps: `K_B, E_CHARGE, GAS{dE}, hgVaporPressure, thermalEnergyEV, wavelengthNm, boltzmannFactor, LEVELS, LAMBDA_REF, lambdaOverL, DEFAULTS, RANGES, ORBITALS`; drops `TUBE, NE_FILL, numberDensity, meanFreePath` and the `sigma/pInel/ionization` fields of `GAS`.

- [ ] **Step 1: Remove the Monte Carlo code and its tests**

```bash
git rm -q js/montecarlo.js js/worker.js js/compute.js js/curve.js js/motion.js js/spacing.js js/tube.js js/profile.js \
  js/strings/tube.js js/strings/curve.js js/strings/delta.js \
  tests/montecarlo.test.js tests/compute.test.js tests/store.test.js tests/profile.test.js tests/levels.test.js
```

Create `tests/format.test.js` (the two format tests that lived in `profile.test.js`):

```js
import { test, assert } from './harness.js';
import { formatSci, localizeNumber } from '../js/format.js';

test('formatSci formats zero, ordinary and tiny numbers', () => {
  assert.equal(formatSci(0), '0');
  assert.equal(formatSci(0.5), '0.50');
  assert.equal(formatSci(1.23e-5), '1.2×10<sup>−5</sup>');
  assert.equal(formatSci(6e-84), '6.0×10<sup>−84</sup>');
});

test('localizeNumber turns decimal points into commas only for German', () => {
  assert.equal(localizeNumber('4.96 V', 'de'), '4,96 V');
  assert.equal(localizeNumber('4.96 V', 'en'), '4.96 V');
  assert.equal(localizeNumber('6.0×10<sup>−84</sup>', 'de'), '6,0×10<sup>−84</sup>');
  assert.equal(localizeNumber('Fig. 3 and 0.5', 'de'), 'Fig. 3 and 0,5');
  assert.equal(localizeNumber('https://doi.org/10.1119/1.2174033', 'de'), 'https://doi.org/10.1119/1.2174033');
});
```

Rewrite `tests/index.html`: keep the harness skeleton and list exactly these imports above `await run();`: `physics, analysis, analytic, params, format, dom, i18n, plotstyle`. (`levels.test.js` is added in Task 5 and later test files in their tasks.)

In `js/physics.js` delete `TUBE`, `NE_FILL`, `numberDensity`, `meanFreePath`, and change `GAS` to `{ hg: { id: 'hg', dE: 4.9 }, ne: { id: 'ne', dE: 19.0 } }`; update the file's header comment accordingly. In `tests/physics.test.js` remove the tests `mean free path shrinks…`, `mean free path is far below…`, `Ne mean free path is independent…`, `unknown gas throws` and the import of `meanFreePath`. Change the `LEVELS` test so the Ne highlight tolerance stays 0.5 and add this test:

```js
test('the Ne 2p5 3p group is placed inside its real range (18.4-19.0 eV)', () => {
  const hl = LEVELS.ne.levels.find((l) => l.highlight);
  assert.between(hl.e, 18.4, 19.0);
});
```

(skip if a test with this name already exists). In `LEVELS.ne` set the highlighted level `e` to `18.7` and the comment to `(Ne: the 2p5 3p group, 18.4-19.0 eV; the model uses dE = 19.0 eV, the observed spacing)`. In `LEVELS.hg` set the highlighted level to `e: 4.887`.

- [ ] **Step 2: Write the new texts**

All texts use `String.raw` for math. Keep the German as a draft for proofreading. Strings must avoid the scope-guard words (uncertainty, safety, instrument names).

`js/strings/common.js`:

```js
export default {
  en: {
    'site.title': 'Franck–Hertz experiment (P3)',
    'site.subtitle': 'An interactive introduction: understand the physics before you enter the lab.',
    'nav.label': 'Contents',
    'nav.idea': 'Levels',
    'nav.scheme': 'Tube',
    'nav.roles': 'Voltages',
    'nav.run': 'Procedure',
    'nav.nogas': 'No gas',
    'nav.cmp': 'Ideal vs real',
    'nav.gas': 'With gas',
    'nav.peaks': 'Peaks',
    'nav.glow': 'Glow',
    'nav.minima': 'Minima',
    'nav.refs': 'References',
    'lang.label': 'Language',
    'ctl.gas': 'Gas',
    'gas.hg': 'Mercury (Hg)',
    'gas.ne': 'Neon (Ne)',
    'gasbar.hint': 'The gas applies to all sections.',
    'ctl.U1': 'Suction voltage U₁',
    'ctl.U2': 'Accelerating voltage U₂',
    'ctl.U3': 'Decelerating voltage U₃',
    'ctl.density.hg': 'Hg temperature',
    'ctl.density.ne': 'Ne pressure',
    'ctl.play': 'Play',
    'ctl.pause': 'Pause',
    'axis.U2': 'U₂ / V',
    'axis.IA': 'I<sub>A</sub> (relative units)',
    'axis.x': 'Position in the gap (G₁ → G₂)',
    'axis.E': 'Kinetic energy / eV',
    'footer': 'Educational model for building intuition. It does not replace the lab manual.',
    'noscript': 'This page needs JavaScript for the interactive tools.',
  },
  de: {
    'site.title': 'Franck-Hertz-Versuch (P3)',
    'site.subtitle': 'Eine interaktive Einführung: die Physik verstehen, bevor Sie ins Labor gehen.',
    'nav.label': 'Inhalt',
    'nav.idea': 'Niveaus',
    'nav.scheme': 'Röhre',
    'nav.roles': 'Spannungen',
    'nav.run': 'Ablauf',
    'nav.nogas': 'Ohne Gas',
    'nav.cmp': 'Ideal/real',
    'nav.gas': 'Mit Gas',
    'nav.peaks': 'Maxima',
    'nav.glow': 'Leuchten',
    'nav.minima': 'Minima',
    'nav.refs': 'Literatur',
    'lang.label': 'Sprache',
    'ctl.gas': 'Gas',
    'gas.hg': 'Quecksilber (Hg)',
    'gas.ne': 'Neon (Ne)',
    'gasbar.hint': 'Das Gas gilt für alle Abschnitte.',
    'ctl.U1': 'Absaugspannung U₁',
    'ctl.U2': 'Beschleunigungsspannung U₂',
    'ctl.U3': 'Bremsspannung U₃',
    'ctl.density.hg': 'Hg-Temperatur',
    'ctl.density.ne': 'Ne-Druck',
    'ctl.play': 'Abspielen',
    'ctl.pause': 'Pause',
    'axis.U2': 'U₂ / V',
    'axis.IA': 'I<sub>A</sub> (relative Einheiten)',
    'axis.x': 'Ort im Zwischenraum (G₁ → G₂)',
    'axis.E': 'Kinetische Energie / eV',
    'footer': 'Didaktisches Modell zum Aufbau von Intuition. Es ersetzt nicht die Arbeitsanleitung.',
    'noscript': 'Diese Seite benötigt JavaScript für die interaktiven Werkzeuge.',
  },
};
```

`js/strings/idea.js`:

```js
const r = String.raw;
const L = 'https://www.nobelprize.org/prizes/physics/1925/franck/lecture/';
const N = 'https://physics.nist.gov/PhysRefData/ASD/levels_form.html';

export default {
  en: {
    'idea.title': '1 · Energy levels of single atoms',
    'idea.p1': r`An isolated atom has discrete energy levels. In the ground state its electrons occupy the lowest orbitals; the smallest excitation moves one valence electron into the next empty orbital and costs the energy $\Delta E=E_1-E_0$. For Hg this is $6s\to6p$ (4.89 eV, the line at 253.7 nm); for Ne an electron of the filled $2p$ shell goes to $3s/3p$ (about 19 eV). No energy between two levels can be absorbed: this is what the Franck–Hertz experiment shows.`,
    'idea.temp': 'Gas temperature',
    'idea.caption': r`Energy levels in eV above the ground state (schematic). Highlighted: the level excited in the experiment. Dashed: ionisation limit. The dot marks the thermal energy $k_BT$.`,
    'idea.arrow': 'ΔE = {dE} eV ({nm} nm)',
    'idea.arrow.ne': 'ΔE ≈ {dE} eV',
    'idea.kt': 'k_BT = {kt} eV',
    'idea.ground': 'ground state',
    'idea.ion': 'ionisation',
    'idea.result': r`$k_BT$ = {kt} eV, so the Boltzmann factor of the highlighted transition is $e^{-\Delta E/k_BT}\approx$ {bf}.`,
    'idea.thermal': r`At room temperature $k_BT\approx0.025$ eV: about 200 times smaller than $\Delta E$ for Hg and more than 700 times smaller for Ne, so thermal excitation is completely negligible. Matching $\Delta E$ to the mean thermal energy $\tfrac32k_BT$ would need tens of thousands of kelvin. The atoms must therefore be excited by something else — here by electron impact.`,
    'idea.orb.title': 'Valence orbitals',
    'idea.orb.ground': 'ground state',
    'idea.orb.excited': 'excited state',
    'idea.orb.caption': r`Boxes are orbitals, arrows are electron spins. Hg: one $6s$ electron moves to $6p$ with parallel spin ($^3P_1$). Ne: an electron leaves the filled $2p$ shell for $3s$ (the $3p$ group lies at about 19 eV).`,
    'idea.orb.aria': 'Box diagram of the valence orbitals of the ground state and of the excited state of the chosen gas.',
    'idea.levels.aria': 'Energy level diagram of the chosen gas with the excitation energy, the ionisation limit and a marker for the thermal energy.',
    'idea.theory': `Theory: <a href="${L}" target="_blank" rel="noopener">Franck’s Nobel lecture ↗</a> · <a href="${N}" target="_blank" rel="noopener">NIST level data ↗</a>`,
  },
  de: {
    'idea.title': '1 · Energieniveaus einzelner Atome',
    'idea.p1': r`Ein isoliertes Atom hat diskrete Energieniveaus. Im Grundzustand besetzen die Elektronen die tiefsten Orbitale; die kleinste Anregung hebt ein Valenzelektron in das nächste freie Orbital und kostet die Energie $\Delta E=E_1-E_0$. Bei Hg ist das $6s\to6p$ (4,89 eV, die Linie bei 253,7 nm); bei Ne geht ein Elektron der gefüllten $2p$-Schale nach $3s/3p$ (etwa 19 eV). Eine Energie zwischen zwei Niveaus kann nicht aufgenommen werden: Das zeigt der Franck-Hertz-Versuch.`,
    'idea.temp': 'Gastemperatur',
    'idea.caption': r`Energieniveaus in eV über dem Grundzustand (schematisch). Hervorgehoben: das im Versuch angeregte Niveau. Gestrichelt: Ionisationsgrenze. Der Punkt markiert die thermische Energie $k_BT$.`,
    'idea.arrow': 'ΔE = {dE} eV ({nm} nm)',
    'idea.arrow.ne': 'ΔE ≈ {dE} eV',
    'idea.kt': 'k_BT = {kt} eV',
    'idea.ground': 'Grundzustand',
    'idea.ion': 'Ionisation',
    'idea.result': r`$k_BT$ = {kt} eV, der Boltzmann-Faktor des hervorgehobenen Übergangs ist daher $e^{-\Delta E/k_BT}\approx$ {bf}.`,
    'idea.thermal': r`Bei Raumtemperatur ist $k_BT\approx0{,}025$ eV: etwa 200-mal kleiner als $\Delta E$ bei Hg und mehr als 700-mal kleiner bei Ne, thermische Anregung ist also völlig vernachlässigbar. Um $\Delta E$ mit der mittleren thermischen Energie $\tfrac32k_BT$ gleichzusetzen, wären einige zehntausend Kelvin nötig. Die Atome müssen also anders angeregt werden — hier durch Elektronenstoß.`,
    'idea.orb.title': 'Valenzorbitale',
    'idea.orb.ground': 'Grundzustand',
    'idea.orb.excited': 'angeregter Zustand',
    'idea.orb.caption': r`Kästchen sind Orbitale, Pfeile sind Elektronenspins. Hg: ein $6s$-Elektron geht mit parallelem Spin nach $6p$ ($^3P_1$). Ne: ein Elektron verlässt die gefüllte $2p$-Schale und geht nach $3s$ (die $3p$-Gruppe liegt bei etwa 19 eV).`,
    'idea.orb.aria': 'Kästchendiagramm der Valenzorbitale im Grundzustand und im angeregten Zustand des gewählten Gases.',
    'idea.levels.aria': 'Energieniveauschema des gewählten Gases mit Anregungsenergie, Ionisationsgrenze und einer Markierung der thermischen Energie.',
    'idea.theory': `Theorie: <a href="${L}" target="_blank" rel="noopener">Nobelvortrag von Franck ↗</a> · <a href="${N}" target="_blank" rel="noopener">NIST-Niveaudaten ↗</a>`,
  },
};
```

`js/strings/scheme.js`:

```js
const r = String.raw;
const L = 'https://www.nobelprize.org/prizes/physics/1925/franck/lecture/';

export default {
  en: {
    'scheme.title': '2 · The experiment: tube and potentials',
    'scheme.p1': r`The tube is filled with the gas. A hot <strong>cathode K</strong> emits electrons; two grids <strong>G₁</strong> and <strong>G₂</strong> and the <strong>anode A</strong> follow. Three voltage sources are connected in series. In the symbol of a source the <em>long bar is the positive pole</em>. Electrons are negative, so they are pulled towards the more positive electrode: they gain kinetic energy when they move to a higher potential φ and lose it when they move to a lower one.`,
    'scheme.caption': r`Top: the tube with the three sources (long bar = +). Bottom: the potential φ along the tube. Each step is one of the voltages.`,
    'scheme.z1': 'U₁ > 0: φ(G₁) − φ(K)|G₁ is more positive than K:|electrons are pulled out of K',
    'scheme.z2': 'U₂ > 0: φ(G₂) − φ(G₁)|G₂ is more positive than G₁:|electrons gain the energy e₀U₂',
    'scheme.z3': 'U₃ > 0: φ(G₂) − φ(A)|A is lower than G₂:|electrons are slowed down',
    'scheme.phi': 'potential φ',
    'scheme.suction': 'suction',
    'scheme.accel': 'acceleration',
    'scheme.decel': 'deceleration',
    'scheme.aria': 'Schematic of the tube with cathode K, grids G1 and G2 and anode A, three voltage sources in series with their plus and minus poles, and the potential along the tube: it rises by U1 from K to G1, by U2 from G1 to G2 and falls by U3 from G2 to A.',
    'scheme.theory': `Theory: <a href="${L}" target="_blank" rel="noopener">Franck’s Nobel lecture (apparatus and results) ↗</a>`,
    'roles.title': '3 · What the three voltages do',
    'roles.suction.title': 'Suction U₁ (K → G₁)',
    'roles.suction.text': r`$U_1$ pulls the electrons out of the cloud around the hot cathode. It makes the current that enters the gap independent of $U_2$, so changes of $I_A$ come from the gas and not from the emission.`,
    'roles.accel.title': 'Acceleration U₂ (G₁ → G₂)',
    'roles.accel.text': r`$U_2$ gives the electrons the kinetic energy $e_0U_2$ (on top of the $e_0U_1$ already gained). This energy can be handed over to the atoms in inelastic collisions. It is the only voltage that is varied.`,
    'roles.decel.title': 'Deceleration U₃ (G₂ → A)',
    'roles.decel.text': r`$U_3$ is a weak counter voltage. Only electrons that arrive at G₂ with $E_\mathrm{kin}>e_0U_3$ reach the anode. Electrons that lost most of their energy in collisions are turned back: this is how the energy loss shows up in $I_A$.`,
  },
  de: {
    'scheme.title': '2 · Der Versuch: Röhre und Potentiale',
    'scheme.p1': r`Die Röhre ist mit dem Gas gefüllt. Eine heiße <strong>Kathode K</strong> emittiert Elektronen; es folgen zwei Gitter <strong>G₁</strong> und <strong>G₂</strong> und die <strong>Anode A</strong>. Drei Spannungsquellen sind in Reihe geschaltet. Im Symbol einer Quelle ist der <em>lange Strich der Pluspol</em>. Elektronen sind negativ und werden zur positiveren Elektrode gezogen: Sie gewinnen kinetische Energie, wenn sie zu einem höheren Potential φ laufen, und verlieren sie, wenn sie zu einem tieferen laufen.`,
    'scheme.caption': r`Oben: die Röhre mit den drei Quellen (langer Strich = +). Unten: das Potential φ entlang der Röhre. Jede Stufe ist eine der Spannungen.`,
    'scheme.z1': 'U₁ > 0: φ(G₁) − φ(K)|G₁ ist positiver als K:|Elektronen werden aus K gezogen',
    'scheme.z2': 'U₂ > 0: φ(G₂) − φ(G₁)|G₂ ist positiver als G₁:|Elektronen gewinnen die Energie e₀U₂',
    'scheme.z3': 'U₃ > 0: φ(G₂) − φ(A)|A liegt tiefer als G₂:|Elektronen werden abgebremst',
    'scheme.phi': 'Potential φ',
    'scheme.suction': 'Absaugen',
    'scheme.accel': 'Beschleunigen',
    'scheme.decel': 'Abbremsen',
    'scheme.aria': 'Schema der Röhre mit Kathode K, Gittern G1 und G2 und Anode A, drei in Reihe geschalteten Spannungsquellen mit Plus- und Minuspol und dem Potential entlang der Röhre: Es steigt um U1 von K nach G1, um U2 von G1 nach G2 und fällt um U3 von G2 nach A.',
    'scheme.theory': `Theorie: <a href="${L}" target="_blank" rel="noopener">Nobelvortrag von Franck (Aufbau und Ergebnisse) ↗</a>`,
    'roles.title': '3 · Wozu die drei Spannungen dienen',
    'roles.suction.title': 'Absaugen U₁ (K → G₁)',
    'roles.suction.text': r`$U_1$ zieht die Elektronen aus der Wolke um die heiße Kathode. Dadurch ist der in den Zwischenraum eintretende Strom unabhängig von $U_2$; Änderungen von $I_A$ kommen also vom Gas und nicht von der Emission.`,
    'roles.accel.title': 'Beschleunigen U₂ (G₁ → G₂)',
    'roles.accel.text': r`$U_2$ gibt den Elektronen die kinetische Energie $e_0U_2$ (zusätzlich zu den bereits gewonnenen $e_0U_1$). Diese Energie kann in inelastischen Stößen an die Atome abgegeben werden. Es ist die einzige Spannung, die variiert wird.`,
    'roles.decel.title': 'Abbremsen U₃ (G₂ → A)',
    'roles.decel.text': r`$U_3$ ist eine schwache Gegenspannung. Nur Elektronen, die mit $E_\mathrm{kin}>e_0U_3$ an G₂ ankommen, erreichen die Anode. Elektronen, die in Stößen den größten Teil ihrer Energie verloren haben, werden zurückgehalten: So zeigt sich der Energieverlust in $I_A$.`,
  },
};
```

`js/strings/run.js`:

```js
const r = String.raw;

export default {
  en: {
    'run.title': '4 · How the experiment is run',
    'run.p1': r`First $U_1$ (suction) and $U_3$ (deceleration) are set and then kept <strong>constant</strong>. Only the accelerating voltage $U_2$ is varied, slowly upwards from zero, and the anode current $I_A$ is recorded as a function of $U_2$. Press play or move the slider: the curve is drawn as $U_2$ increases.`,
    'run.fixed': '{name} = {v} V (constant)',
    'run.U2': 'Accelerating voltage U₂ (varied)',
    'run.readout': r`$U_2$ = {U2} V → $I_A$ = {IA} (relative units)`,
    'run.obs.title': 'What is observed on I_A',
    'run.obs.1': r`At small $U_2$ no current flows: the electrons do not have enough energy to pass the counter voltage $U_3$.`,
    'run.obs.2': r`Then $I_A$ rises with $U_2$, as long as the electrons only collide elastically.`,
    'run.obs.3': r`When $U_2$ reaches about $\Delta E/e_0$ the current <strong>drops</strong>: electrons lose their energy in inelastic collisions and cannot pass $U_3$.`,
    'run.obs.4': r`It rises again and drops again at $2\Delta E/e_0$, $3\Delta E/e_0$, …: a series of peaks, one energy quantum apart.`,
    'run.plot.aria': 'Plot of the anode current against the accelerating voltage U2 for the chosen gas. The curve is drawn up to the chosen value of U2; the rest is shown faintly.',
  },
  de: {
    'run.title': '4 · Wie der Versuch durchgeführt wird',
    'run.p1': r`Zuerst werden $U_1$ (Absaugen) und $U_3$ (Abbremsen) eingestellt und dann <strong>konstant</strong> gehalten. Nur die Beschleunigungsspannung $U_2$ wird langsam von null an erhöht, und der Anodenstrom $I_A$ wird als Funktion von $U_2$ aufgezeichnet. Drücken Sie Abspielen oder bewegen Sie den Regler: Die Kurve entsteht, während $U_2$ wächst.`,
    'run.fixed': '{name} = {v} V (konstant)',
    'run.U2': 'Beschleunigungsspannung U₂ (variiert)',
    'run.readout': r`$U_2$ = {U2} V → $I_A$ = {IA} (relative Einheiten)`,
    'run.obs.title': 'Was an I_A beobachtet wird',
    'run.obs.1': r`Bei kleinem $U_2$ fließt kein Strom: Die Elektronen haben nicht genug Energie, um die Gegenspannung $U_3$ zu überwinden.`,
    'run.obs.2': r`Dann steigt $I_A$ mit $U_2$, solange die Elektronen nur elastisch stoßen.`,
    'run.obs.3': r`Erreicht $U_2$ etwa $\Delta E/e_0$, <strong>fällt</strong> der Strom: Die Elektronen verlieren ihre Energie in inelastischen Stößen und überwinden $U_3$ nicht.`,
    'run.obs.4': r`Er steigt wieder und fällt erneut bei $2\Delta E/e_0$, $3\Delta E/e_0$, …: eine Folge von Maxima im Abstand eines Energiequants.`,
    'run.plot.aria': 'Diagramm des Anodenstroms über der Beschleunigungsspannung U2 für das gewählte Gas. Die Kurve ist bis zum gewählten Wert von U2 gezeichnet, der Rest blass.',
  },
};
```

`js/strings/nogas.js`:

```js
const r = String.raw;

export default {
  en: {
    'nogas.title': '5 · Anode current without gas',
    'nogas.p1': r`Without gas nothing happens in the gap: the electrons gain the energy $e_0(U_1+U_2)$ and then meet the decelerating region. They reach the anode if $E_\mathrm{kin}>e_0U_3$ at G₂; otherwise they are turned back. So $I_A$ switches on once $U_1+U_2$ exceeds $U_3$ and then keeps rising.`,
    'nogas.probe': 'Accelerating voltage U₂',
    'nogas.passes': r`The electrons reach the anode with {E} eV left.`,
    'nogas.blocked': 'The electrons are stopped in the decelerating region and return.',
    'nogas.legend.G1': 'G₁',
    'nogas.legend.G2': 'G₂',
    'nogas.legend.A': 'A',
    'nogas.plot.aria': 'Plot of the anode current without gas against U2, with a marker at the chosen value of U2.',
    'nogas.canvas.aria': 'Animation: electrons are accelerated between G1 and G2 and then slowed down towards the anode A. If they have too little energy they stop and return. Dot colour shows the kinetic energy.',
    'cmp.title': '6 · Ideal and real without gas',
    'cmp.p1': r`In the <strong>ideal</strong> picture all electrons start with the same energy and fly straight: $I_A$ is a <strong>step function</strong>, zero below $U_1+U_2=U_3$ and constant above.`,
    'cmp.p2': r`In the <strong>real</strong> experiment the electrons start with a spread of energies and directions, and the grids scatter some of them. An electron that is not moving exactly along the field needs more energy to pass the counter voltage: only the fraction $1-\sqrt{U_3/E}$ gets through. The sharp step becomes a smooth rise.`,
    'cmp.U3': 'Decelerating voltage U₃',
    'cmp.legend.ideal': 'ideal (step)',
    'cmp.legend.real': 'real (smooth rise)',
    'cmp.plot.aria': 'Plot of the anode current without gas against U2: the ideal step function and the real smooth rise, for the chosen counter voltage U3.',
  },
  de: {
    'nogas.title': '5 · Anodenstrom ohne Gas',
    'nogas.p1': r`Ohne Gas passiert im Zwischenraum nichts: Die Elektronen gewinnen die Energie $e_0(U_1+U_2)$ und laufen dann in den Bremsbereich. Sie erreichen die Anode, wenn $E_\mathrm{kin}>e_0U_3$ an G₂ gilt; sonst werden sie zurückgeworfen. $I_A$ setzt also ein, sobald $U_1+U_2$ größer als $U_3$ ist, und steigt dann weiter.`,
    'nogas.probe': 'Beschleunigungsspannung U₂',
    'nogas.passes': r`Die Elektronen erreichen die Anode mit {E} eV Restenergie.`,
    'nogas.blocked': 'Die Elektronen werden im Bremsbereich gestoppt und kehren um.',
    'nogas.legend.G1': 'G₁',
    'nogas.legend.G2': 'G₂',
    'nogas.legend.A': 'A',
    'nogas.plot.aria': 'Diagramm des Anodenstroms ohne Gas über U2, mit einer Markierung beim gewählten Wert von U2.',
    'nogas.canvas.aria': 'Animation: Elektronen werden zwischen G1 und G2 beschleunigt und dann zur Anode A hin abgebremst. Haben sie zu wenig Energie, bleiben sie stehen und kehren um. Die Punktfarbe zeigt die kinetische Energie.',
    'cmp.title': '6 · Ideal und real ohne Gas',
    'cmp.p1': r`Im <strong>idealen</strong> Bild starten alle Elektronen mit derselben Energie und fliegen geradeaus: $I_A$ ist eine <strong>Stufenfunktion</strong>, null unterhalb von $U_1+U_2=U_3$ und darüber konstant.`,
    'cmp.p2': r`Im <strong>realen</strong> Experiment starten die Elektronen mit einer Verteilung von Energien und Richtungen, und die Gitter streuen einen Teil. Ein Elektron, das sich nicht genau entlang des Feldes bewegt, braucht mehr Energie, um die Gegenspannung zu überwinden: Nur der Anteil $1-\sqrt{U_3/E}$ kommt durch. Aus der scharfen Stufe wird ein glatter Anstieg.`,
    'cmp.U3': 'Bremsspannung U₃',
    'cmp.legend.ideal': 'ideal (Stufe)',
    'cmp.legend.real': 'real (glatter Anstieg)',
    'cmp.plot.aria': 'Diagramm des Anodenstroms ohne Gas über U2: die ideale Stufenfunktion und der reale glatte Anstieg, für die gewählte Gegenspannung U3.',
  },
};
```

`js/strings/gas.js`:

```js
const r = String.raw;
const R = 'https://doi.org/10.1119/1.2174033';

export default {
  en: {
    'gas.title': '7 · Anode current with gas',
    'gas.p1': r`With gas, an electron that has gained the energy $\Delta E$ can lose it in an inelastic collision and start again from almost zero. In the <strong>ideal</strong> case this happens exactly when $E_\mathrm{kin}=\Delta E$: the kinetic energy along the gap is a <strong>sawtooth</strong> and the electron arrives at G₂ with $E_f=e_0(U_1+U_2)-m\Delta E$ ($m$ collisions). It passes the counter voltage only if $E_f>e_0U_3$: the ideal $I_A$ is a train of rectangular pulses.`,
    'gas.p2': r`In the <strong>real</strong> experiment a collision happens only after a free path of mean length $\lambda$ beyond the threshold. The sawtooth is smeared out (average energy, lower plot) and the rectangles become the rounded peaks of the measured curve.`,
    'gas.ideal': 'Show the ideal experiment',
    'gas.legend.real': 'real',
    'gas.legend.ideal': 'ideal',
    'gas.legend.avg': 'real (average energy)',
    'gas.legend.saw': 'ideal sawtooth',
    'gas.legend.free': 'without collisions',
    'gas.energy.title': 'Kinetic energy along the gap at the chosen U₂',
    'gas.readout': r`$U_2$ = {U2} V: real $I_A$ = {IA}; ideal: {ideal}. Collisions in the ideal case: {m}.`,
    'gas.ideal.on': 'current flows',
    'gas.ideal.off': 'no current',
    'gas.plot.aria': 'Plot of the anode current with gas against U2: the real curve and, optionally, the ideal train of rectangular pulses, with a marker at the chosen U2.',
    'gas.energy.aria': 'Plot of the kinetic energy of the electrons against position between G1 and G2 for the chosen voltages: the ideal sawtooth, the average energy of the real experiment and the energy without collisions.',
    'gas.theory': `Theory: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
  de: {
    'gas.title': '7 · Anodenstrom mit Gas',
    'gas.p1': r`Mit Gas kann ein Elektron, das die Energie $\Delta E$ gewonnen hat, diese in einem inelastischen Stoß abgeben und fast bei null neu beginnen. Im <strong>idealen</strong> Fall geschieht das genau bei $E_\mathrm{kin}=\Delta E$: Die kinetische Energie entlang des Zwischenraums ist ein <strong>Sägezahn</strong>, und das Elektron kommt mit $E_f=e_0(U_1+U_2)-m\Delta E$ an G₂ an ($m$ Stöße). Es überwindet die Gegenspannung nur bei $E_f>e_0U_3$: Das ideale $I_A$ ist eine Folge von Rechteckpulsen.`,
    'gas.p2': r`Im <strong>realen</strong> Experiment erfolgt ein Stoß erst nach einer freien Weglänge mit Mittelwert $\lambda$ hinter der Schwelle. Der Sägezahn wird verschmiert (mittlere Energie, unteres Diagramm), und aus den Rechtecken werden die gerundeten Maxima der gemessenen Kurve.`,
    'gas.ideal': 'Idealen Versuch anzeigen',
    'gas.legend.real': 'real',
    'gas.legend.ideal': 'ideal',
    'gas.legend.avg': 'real (mittlere Energie)',
    'gas.legend.saw': 'idealer Sägezahn',
    'gas.legend.free': 'ohne Stöße',
    'gas.energy.title': 'Kinetische Energie entlang des Zwischenraums bei der gewählten Spannung U₂',
    'gas.readout': r`$U_2$ = {U2} V: reales $I_A$ = {IA}; ideal: {ideal}. Stöße im idealen Fall: {m}.`,
    'gas.ideal.on': 'Strom fließt',
    'gas.ideal.off': 'kein Strom',
    'gas.plot.aria': 'Diagramm des Anodenstroms mit Gas über U2: die reale Kurve und wahlweise die ideale Folge von Rechteckpulsen, mit einer Markierung beim gewählten U2.',
    'gas.energy.aria': 'Diagramm der kinetischen Energie der Elektronen über dem Ort zwischen G1 und G2 für die gewählten Spannungen: der ideale Sägezahn, die mittlere Energie des realen Versuchs und die Energie ohne Stöße.',
    'gas.theory': `Theorie: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
};
```

`js/strings/peaks.js`:

```js
const r = String.raw;
const R = 'https://doi.org/10.1119/1.2174033';

export default {
  en: {
    'peaks.title': '8 · Why there are several peaks',
    'peaks.p1': r`Between G₁ and G₂ the field is <strong>uniform</strong>: the two grids behave like a parallel-plate capacitor. The potential therefore rises <strong>linearly</strong> with position, and so does the kinetic energy of an electron that does not collide: $E(x)=e_0\left(U_1+U_2\,x/L\right)$. It can excite as soon as $E=\Delta E$, at $x_1=(\Delta E/e_0-U_1)L/U_2$. After the collision it must gain $\Delta E$ again, so the next threshold is $\Delta E L/(e_0U_2)$ further on, and so on: $x_n=(n\Delta E/e_0-U_1)\,L/U_2$.`,
    'peaks.p2': r`Increasing $U_2$ compresses the thresholds towards G₁. Each time $U_2$ grows by $\Delta E/e_0$ one more threshold enters the gap, and the current drops and recovers once more. Hence the peaks are spaced by $\Delta E/e_0$. $U_1$ shifts all peaks by the same amount, so the positions are not reliable, but the <strong>spacings</strong> give $\Delta E$.`,
    'peaks.cap.aria': 'Sketch of two parallel plates: the grid G1 at lower potential and the grid G2 at higher potential with a uniform electric field between them.',
    'peaks.cap.G1': 'G₁ (−)',
    'peaks.cap.G2': 'G₂ (+)',
    'peaks.cap.E': 'uniform field',
    'peaks.zones': r`Collision thresholds inside the gap at this $U_2$: {n}`,
    'peaks.legend.free': 'without collisions (linear)',
    'peaks.legend.saw': 'ideal sawtooth',
    'peaks.legend.thr': 'thresholds x_n',
    'peaks.legend.curve': 'real curve',
    'peaks.legend.pred': 'predicted peak positions',
    'peaks.col.u': 'U₂⁽ⁿ⁾ / V',
    'peaks.col.d': 'spacing / V',
    'peaks.result': r`Mean spacing of the peaks: <strong>{d} V</strong>, so $\Delta E\approx$ <strong>{d} eV</strong> (the model uses $\Delta E$ = {model} eV).`,
    'peaks.none': 'Not enough peaks in the sweep range for a spacing.',
    'peaks.plot.aria': 'Plot of the kinetic energy against position in the gap for the chosen U2: the linear rise without collisions and the ideal sawtooth with the collision thresholds marked.',
    'peaks.curve.aria': 'Plot of the real anode current against U2 with the predicted peak positions marked as dotted lines and a marker at the chosen U2. The same peaks are listed in the table.',
    'peaks.theory': `Theory: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
  de: {
    'peaks.title': '8 · Warum es mehrere Maxima gibt',
    'peaks.p1': r`Zwischen G₁ und G₂ ist das Feld <strong>homogen</strong>: Die beiden Gitter verhalten sich wie ein Plattenkondensator. Das Potential steigt daher <strong>linear</strong> mit dem Ort, und ebenso die kinetische Energie eines Elektrons ohne Stöße: $E(x)=e_0\left(U_1+U_2\,x/L\right)$. Es kann anregen, sobald $E=\Delta E$ ist, bei $x_1=(\Delta E/e_0-U_1)L/U_2$. Nach dem Stoß muss es erneut $\Delta E$ gewinnen, die nächste Schwelle liegt also $\Delta E L/(e_0U_2)$ weiter, und so fort: $x_n=(n\Delta E/e_0-U_1)\,L/U_2$.`,
    'peaks.p2': r`Eine Erhöhung von $U_2$ drückt die Schwellen zu G₁ hin. Jedes Mal, wenn $U_2$ um $\Delta E/e_0$ wächst, kommt eine weitere Schwelle in den Zwischenraum, und der Strom fällt und erholt sich einmal mehr. Die Maxima haben daher den Abstand $\Delta E/e_0$. $U_1$ verschiebt alle Maxima um denselben Betrag, die Lagen sind also nicht verlässlich, aber die <strong>Abstände</strong> liefern $\Delta E$.`,
    'peaks.cap.aria': 'Skizze zweier paralleler Platten: das Gitter G1 auf niedrigerem Potential und das Gitter G2 auf höherem Potential mit einem homogenen elektrischen Feld dazwischen.',
    'peaks.cap.G1': 'G₁ (−)',
    'peaks.cap.G2': 'G₂ (+)',
    'peaks.cap.E': 'homogenes Feld',
    'peaks.zones': r`Stoßschwellen im Zwischenraum bei diesem $U_2$: {n}`,
    'peaks.legend.free': 'ohne Stöße (linear)',
    'peaks.legend.saw': 'idealer Sägezahn',
    'peaks.legend.thr': 'Schwellen x_n',
    'peaks.legend.curve': 'reale Kurve',
    'peaks.legend.pred': 'vorhergesagte Lagen der Maxima',
    'peaks.col.u': 'U₂⁽ⁿ⁾ / V',
    'peaks.col.d': 'Abstand / V',
    'peaks.result': r`Mittlerer Abstand der Maxima: <strong>{d} V</strong>, also $\Delta E\approx$ <strong>{d} eV</strong> (das Modell verwendet $\Delta E$ = {model} eV).`,
    'peaks.none': 'Zu wenige Maxima im Spannungsbereich für einen Abstand.',
    'peaks.plot.aria': 'Diagramm der kinetischen Energie über dem Ort im Zwischenraum für das gewählte U2: der lineare Anstieg ohne Stöße und der ideale Sägezahn mit markierten Stoßschwellen.',
    'peaks.curve.aria': 'Diagramm des realen Anodenstroms über U2 mit den vorhergesagten Lagen der Maxima als gepunkteten Linien und einer Markierung beim gewählten U2. Dieselben Maxima stehen in der Tabelle.',
    'peaks.theory': `Theorie: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
};
```

`js/strings/glow.js`:

```js
const r = String.raw;
const L = 'https://www.nobelprize.org/prizes/physics/1925/franck/lecture/';

export default {
  en: {
    'glow.title': '9 · Illuminated stripes in the tube',
    'glow.p1': r`Each inelastic collision leaves an atom excited. When it falls back it emits light. Collisions happen where electrons have just reached the threshold energy, that is around the positions $x_n$. At a given $U_2$ the excitations therefore concentrate in <strong>separate zones</strong>, and the tube glows in <strong>stripes</strong>. In neon the emitted light is orange and visible; in mercury the line at 253.7 nm is ultraviolet and invisible. When $U_2$ grows, the stripes move towards G₁ and new ones appear at G₂.`,
    'glow.U2': 'Accelerating voltage U₂',
    'glow.footer.ne': 'Orange glow: excitation zones (visible light)',
    'glow.footer.hg': 'Violet: excitation zones (UV at 253.7 nm, invisible)',
    'glow.canvas.aria': 'Animation of typical electrons between G1 and G2. Dot colour shows the kinetic energy; coloured bands show where excitations occur at the chosen U2; dashed lines mark the collision thresholds.',
    'glow.theory': `Theory: <a href="${L}" target="_blank" rel="noopener">Franck’s Nobel lecture ↗</a>`,
  },
  de: {
    'glow.title': '9 · Leuchtende Streifen in der Röhre',
    'glow.p1': r`Jeder inelastische Stoß hinterlässt ein angeregtes Atom. Beim Zurückfallen sendet es Licht aus. Stöße geschehen dort, wo die Elektronen gerade die Schwellenenergie erreicht haben, also um die Orte $x_n$. Bei gegebenem $U_2$ konzentrieren sich die Anregungen daher in <strong>getrennten Zonen</strong>, und die Röhre leuchtet in <strong>Streifen</strong>. In Neon ist das Licht orange und sichtbar; bei Quecksilber ist die Linie bei 253,7 nm ultraviolett und unsichtbar. Wächst $U_2$, wandern die Streifen zu G₁, und an G₂ entstehen neue.`,
    'glow.U2': 'Beschleunigungsspannung U₂',
    'glow.footer.ne': 'Orange: Anregungszonen (sichtbares Licht)',
    'glow.footer.hg': 'Violett: Anregungszonen (UV bei 253,7 nm, unsichtbar)',
    'glow.canvas.aria': 'Animation typischer Elektronen zwischen G1 und G2. Die Punktfarbe zeigt die kinetische Energie; farbige Bänder zeigen, wo bei dem gewählten U2 Anregungen stattfinden; gestrichelte Linien markieren die Stoßschwellen.',
    'glow.theory': `Theorie: <a href="${L}" target="_blank" rel="noopener">Nobelvortrag von Franck ↗</a>`,
  },
};
```

`js/strings/minima.js`:

```js
const r = String.raw;
const R = 'https://doi.org/10.1119/1.2174033';

export default {
  en: {
    'minima.title': '10 · Why the minima do not reach zero',
    'minima.p1': r`Not every electron collides where it could. Once it has reached the threshold it needs on average a free path $\lambda=1/(n\sigma)$ before it excites — and the path left to G₂ may be shorter than that. Such electrons arrive at G₂ still carrying their energy and pass the counter voltage although, in the ideal picture, they should have been stopped. The shorter $\lambda$ is, the fewer electrons slip through. $\lambda$ falls when the gas density $n$ rises, that is with the <strong>pressure</strong> (for mercury with the temperature, through the vapour pressure).`,
    'minima.U2': 'Accelerating voltage U₂',
    'minima.bar': r`Electrons that missed at least one possible collision: <strong>{pct} %</strong>`,
    'minima.legend.all': 'made all possible collisions',
    'minima.legend.missed': 'missed a collision (ring)',
    'minima.footer': 'Ringed dots missed at least one collision; colour shows the kinetic energy.',
    'minima.p2': r`Low pressure (long $\lambda$): many electrons slip through, the minima are shallow. High pressure (short $\lambda$): almost every electron collides, the minima become deep. The lower plot compares three gas densities.`,
    'minima.curves': '{v}',
    'minima.canvas.aria': 'Animation of typical electrons between G1 and G2. Dot colour shows the kinetic energy; electrons that missed at least one possible collision carry a ring.',
    'minima.plot.aria': 'Plot of the anode current against U2 for the lowest, the chosen and the highest gas density: the lower the density, the shallower the minima.',
    'minima.theory': `Theory: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
  de: {
    'minima.title': '10 · Warum die Minima nicht auf null gehen',
    'minima.p1': r`Nicht jedes Elektron stößt dort, wo es könnte. Hat es die Schwelle erreicht, braucht es im Mittel eine freie Weglänge $\lambda=1/(n\sigma)$, bevor es anregt — und der Weg bis G₂ kann kürzer sein. Solche Elektronen kommen noch mit ihrer Energie an G₂ an und überwinden die Gegenspannung, obwohl sie im idealen Bild gestoppt worden wären. Je kürzer $\lambda$, desto weniger Elektronen schlüpfen durch. $\lambda$ sinkt, wenn die Gasdichte $n$ steigt, also mit dem <strong>Druck</strong> (bei Quecksilber mit der Temperatur über den Dampfdruck).`,
    'minima.U2': 'Beschleunigungsspannung U₂',
    'minima.bar': r`Elektronen, die mindestens einen möglichen Stoß verpasst haben: <strong>{pct} %</strong>`,
    'minima.legend.all': 'alle möglichen Stöße gemacht',
    'minima.legend.missed': 'einen Stoß verpasst (Ring)',
    'minima.footer': 'Punkte mit Ring haben mindestens einen Stoß verpasst; die Farbe zeigt die kinetische Energie.',
    'minima.p2': r`Niedriger Druck (langes $\lambda$): viele Elektronen schlüpfen durch, die Minima sind flach. Hoher Druck (kurzes $\lambda$): fast jedes Elektron stößt, die Minima werden tief. Das untere Diagramm vergleicht drei Gasdichten.`,
    'minima.curves': '{v}',
    'minima.canvas.aria': 'Animation typischer Elektronen zwischen G1 und G2. Die Punktfarbe zeigt die kinetische Energie; Elektronen, die mindestens einen möglichen Stoß verpasst haben, tragen einen Ring.',
    'minima.plot.aria': 'Diagramm des Anodenstroms über U2 für die niedrigste, die gewählte und die höchste Gasdichte: Je niedriger die Dichte, desto flacher die Minima.',
    'minima.theory': `Theorie: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
};
```

`js/strings/refs.js`:

```js
const A = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export default {
  en: {
    'refs.title': '11 · References',
    'refs.intro': 'Links open in a new tab.',
    'refs.r1': `G. Rapior, K. Sengstock, V. Baev, <em>New features of the Franck–Hertz experiment</em>, Am. J. Phys. <strong>74</strong>, 423–428 (2006). ${A('https://doi.org/10.1119/1.2174033', 'doi:10.1119/1.2174033 ↗')} — temperature dependence of the curves; recommended reading.`,
    'refs.r2': `J. Franck, G. Hertz, <em>Über Zusammenstöße zwischen Elektronen und Molekülen des Quecksilberdampfes und die Ionisierungsspannung desselben</em>, Verh. Dtsch. Phys. Ges. <strong>16</strong>, 457 (1914) — the original paper. ${A('https://www.nobelprize.org/prizes/physics/1925/franck/lecture/', 'Franck’s Nobel lecture ↗')} gives the story in his own words.`,
    'refs.r3': `G. Wedler, H.-J. Freund, <em>Lehrbuch der Physikalischen Chemie</em>, Wiley-VCH, Weinheim — atomic structure and spectroscopy chapters. ${A('https://www.wiley-vch.de', 'Wiley-VCH ↗')}`,
    'refs.r4': `${A('https://physics.nist.gov/PhysRefData/ASD/levels_form.html', 'NIST Atomic Spectra Database — energy levels ↗')} and ${A('https://physics.nist.gov/PhysRefData/ASD/lines_form.html', 'spectral lines ↗')}: levels and the 253.7 nm Hg line.`,
  },
  de: {
    'refs.title': '11 · Literatur',
    'refs.intro': 'Links öffnen sich in einem neuen Tab.',
    'refs.r1': `G. Rapior, K. Sengstock, V. Baev, <em>New features of the Franck–Hertz experiment</em>, Am. J. Phys. <strong>74</strong>, 423–428 (2006). ${A('https://doi.org/10.1119/1.2174033', 'doi:10.1119/1.2174033 ↗')} — Temperaturabhängigkeit der Kurven; empfohlene Lektüre.`,
    'refs.r2': `J. Franck, G. Hertz, <em>Über Zusammenstöße zwischen Elektronen und Molekülen des Quecksilberdampfes und die Ionisierungsspannung desselben</em>, Verh. Dtsch. Phys. Ges. <strong>16</strong>, 457 (1914) — die Originalarbeit. ${A('https://www.nobelprize.org/prizes/physics/1925/franck/lecture/', 'Francks Nobelvortrag ↗')} erzählt die Geschichte in seinen eigenen Worten.`,
    'refs.r3': `G. Wedler, H.-J. Freund, <em>Lehrbuch der Physikalischen Chemie</em>, Wiley-VCH, Weinheim — Kapitel zu Atombau und Spektroskopie. ${A('https://www.wiley-vch.de', 'Wiley-VCH ↗')}`,
    'refs.r4': `${A('https://physics.nist.gov/PhysRefData/ASD/levels_form.html', 'NIST Atomic Spectra Database — Energieniveaus ↗')} und ${A('https://physics.nist.gov/PhysRefData/ASD/lines_form.html', 'Spektrallinien ↗')}: Niveaus und die Hg-Linie bei 253,7 nm.`,
  },
};
```

`js/strings.js`:

```js
// Merges the per-section string files into one table: STRINGS.en / STRINGS.de.
import common from './strings/common.js';
import idea from './strings/idea.js';
import scheme from './strings/scheme.js';
import run from './strings/run.js';
import nogas from './strings/nogas.js';
import gas from './strings/gas.js';
import peaks from './strings/peaks.js';
import glow from './strings/glow.js';
import minima from './strings/minima.js';
import refs from './strings/refs.js';

const parts = [common, idea, scheme, run, nogas, gas, peaks, glow, minima, refs];

export const STRINGS = {
  en: Object.assign({}, ...parts.map((p) => p.en)),
  de: Object.assign({}, ...parts.map((p) => p.de)),
};
```

- [ ] **Step 3: Update the i18n tests**

In `tests/i18n.test.js` replace the tests `figures, plots and live results are accessible in index.html`, `every explanatory section carries a theory link in both languages`, `plot axis titles contain no literal underscores`, `explanations name U1 as not simulated…` and `the curve U3 slider cannot reach 0…` with the following (keep the other tests; keep `import { t, num, setLang }`):

```js
test('figures, plots, canvases and live results are accessible in index.html', async () => {
  const html = await (await fetch('../index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const id of ['levels-svg', 'orbitals-svg', 'scheme-svg', 'run-plot', 'nogas-plot', 'cmp-plot', 'gas-plot',
    'gas-energy-plot', 'peaks-plot', 'peaks-curve-plot', 'minima-plot']) {
    const el = doc.getElementById(id);
    assert.ok(el && el.getAttribute('role') === 'img' && el.hasAttribute('data-i18n-aria'), id + ' needs role=img and a translated name');
  }
  for (const id of ['nogas-canvas', 'glow-canvas', 'minima-canvas']) {
    const el = doc.getElementById(id);
    assert.ok(el && el.getAttribute('role') === 'img' && el.hasAttribute('data-i18n-aria'), id + ' needs role=img and a translated name');
  }
  const cap = doc.getElementById('peaks-cap');
  assert.ok(cap && cap.hasAttribute('data-i18n-aria'), 'capacitor sketch needs a translated name');
  for (const id of ['levels-result', 'gas-readout', 'peaks-result', 'minima-bartext']) {
    assert.equal(doc.getElementById(id).getAttribute('aria-live'), 'polite', id + ' must be a polite live region');
  }
});

test('every explanatory section carries a theory link in both languages', () => {
  for (const lang of ['en', 'de']) {
    for (const k of ['idea.theory', 'scheme.theory', 'gas.theory', 'peaks.theory', 'glow.theory', 'minima.theory']) {
      assert.ok(STRINGS[lang][k] && STRINGS[lang][k].includes('<a href="https://'), `${lang}:${k} missing link`);
    }
  }
});

test('plot axis titles contain no literal underscores', () => {
  for (const lang of ['en', 'de']) {
    for (const k of Object.keys(STRINGS[lang]).filter((k) => k.startsWith('axis.'))) {
      assert.ok(!/_/.test(STRINGS[lang][k]), `${lang}:${k} = ${STRINGS[lang][k]}`);
    }
  }
});

test('the page has all eleven sections and the gas selector', async () => {
  const html = await (await fetch('../index.html')).text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const id of ['idea', 'scheme', 'roles', 'run', 'nogas', 'cmp', 'gas', 'peaks', 'glow', 'minima', 'refs']) {
    assert.ok(doc.getElementById(id), 'section #' + id + ' missing');
  }
  assert.ok(doc.getElementById('global-gas'), 'gas selector missing');
});

test('no random numbers are used anywhere in js/', async () => {
  const files = ['physics', 'analytic', 'params', 'analysis', 'format', 'i18n', 'dom', 'plotstyle', 'store', 'controls',
    'gapcanvas', 'levels', 'orbitals', 'schematic', 'sweep', 'nogas', 'withgas', 'peaks', 'glow', 'minima', 'main'];
  for (const f of files) {
    const res = await fetch(`../js/${f}.js`);
    if (!res.ok) continue; // modules are added task by task
    assert.ok(!/Math\.random/.test(await res.text()), f + '.js uses Math.random');
  }
});
```

Run `./scripts/test.sh` later in Step 6 (the strings tests need `index.html`).

- [ ] **Step 4: Write the new `index.html`, the CSS, `store.js`, `controls.js`, `gapcanvas.js`, `main.js`**

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Franck–Hertz (P3)</title>
<link rel="stylesheet" href="vendor/katex/katex.min.css">
<link rel="stylesheet" href="css/style.css">
<script defer src="vendor/plotly/plotly-basic.min.js"></script>
<script defer src="vendor/katex/katex.min.js"></script>
<script defer src="vendor/katex/contrib/auto-render.min.js"></script>
<script type="module" src="js/main.js"></script>
</head>
<body>
<header class="top">
  <div class="wrap top-inner">
    <div>
      <h1 data-i18n="site.title">Franck–Hertz experiment (P3)</h1>
      <p class="subtitle" data-i18n="site.subtitle"></p>
    </div>
    <div class="lang" role="group" data-i18n-aria="lang.label">
      <button type="button" data-lang="en">EN</button>
      <button type="button" data-lang="de">DE</button>
    </div>
  </div>
</header>

<div class="wrap layout">
  <nav class="toc" data-i18n-aria="nav.label">
    <a href="#idea" data-i18n="nav.idea"></a>
    <a href="#scheme" data-i18n="nav.scheme"></a>
    <a href="#roles" data-i18n="nav.roles"></a>
    <a href="#run" data-i18n="nav.run"></a>
    <a href="#nogas" data-i18n="nav.nogas"></a>
    <a href="#cmp" data-i18n="nav.cmp"></a>
    <a href="#gas" data-i18n="nav.gas"></a>
    <a href="#peaks" data-i18n="nav.peaks"></a>
    <a href="#glow" data-i18n="nav.glow"></a>
    <a href="#minima" data-i18n="nav.minima"></a>
    <a href="#refs" data-i18n="nav.refs"></a>
  </nav>

  <main>
    <noscript><p class="note" data-i18n="noscript">This page needs JavaScript for the interactive tools.</p></noscript>
    <div class="gasbar">
      <label><span data-i18n="ctl.gas"></span>
        <select id="global-gas">
          <option value="hg" data-i18n="gas.hg"></option>
          <option value="ne" data-i18n="gas.ne"></option>
        </select>
      </label>
      <span class="muted" data-i18n="gasbar.hint"></span>
    </div>

    <!-- 1 · Energy levels -->
    <section id="idea">
      <h2 data-i18n="idea.title"></h2>
      <p data-i18n="idea.p1"></p>
      <div class="card">
        <div class="controls">
          <label class="grow"><span data-i18n="idea.temp"></span> <output id="levels-T-out"></output>
            <input id="levels-T" type="range" min="2.4" max="4.8" step="0.01" value="2.47">
          </label>
        </div>
        <div id="levels-svg" class="figure" role="img" data-i18n-aria="idea.levels.aria"></div>
        <p class="caption" data-i18n="idea.caption"></p>
        <p id="levels-result" class="result" aria-live="polite"></p>
      </div>
      <div class="card">
        <h3 data-i18n="idea.orb.title"></h3>
        <div id="orbitals-svg" class="figure" role="img" data-i18n-aria="idea.orb.aria"></div>
        <p class="caption" data-i18n="idea.orb.caption"></p>
      </div>
      <p class="note" data-i18n="idea.thermal"></p>
      <p class="theory" data-i18n="idea.theory"></p>
    </section>

    <!-- 2 · The experiment scheme -->
    <section id="scheme">
      <h2 data-i18n="scheme.title"></h2>
      <p data-i18n="scheme.p1"></p>
      <div class="card">
        <div id="scheme-svg" class="figure" role="img" data-i18n-aria="scheme.aria"></div>
        <p class="caption" data-i18n="scheme.caption"></p>
      </div>
      <p class="theory" data-i18n="scheme.theory"></p>
    </section>

    <!-- 3 · What the voltages do -->
    <section id="roles">
      <h2 data-i18n="roles.title"></h2>
      <div class="cards3">
        <div class="card"><h3 data-i18n="roles.suction.title"></h3><p data-i18n="roles.suction.text"></p></div>
        <div class="card"><h3 data-i18n="roles.accel.title"></h3><p data-i18n="roles.accel.text"></p></div>
        <div class="card"><h3 data-i18n="roles.decel.title"></h3><p data-i18n="roles.decel.text"></p></div>
      </div>
    </section>

    <!-- 4 · How the experiment is run -->
    <section id="run">
      <h2 data-i18n="run.title"></h2>
      <p data-i18n="run.p1"></p>
      <div class="card">
        <p id="run-fixed" class="chips"></p>
        <div class="controls">
          <label class="grow"><span data-i18n="run.U2"></span> <output id="run-U2-out"></output>
            <input id="run-U2" type="range" min="0" max="45" step="0.25" value="0">
          </label>
          <button id="run-play" type="button" class="btn"></button>
        </div>
        <div id="run-plot" class="plot" role="img" data-i18n-aria="run.plot.aria"></div>
        <p id="run-readout" class="result"></p>
      </div>
      <h3 data-i18n="run.obs.title"></h3>
      <ol class="look">
        <li data-i18n="run.obs.1"></li>
        <li data-i18n="run.obs.2"></li>
        <li data-i18n="run.obs.3"></li>
        <li data-i18n="run.obs.4"></li>
      </ol>
    </section>

    <!-- 5 · Anode current without gas -->
    <section id="nogas">
      <h2 data-i18n="nogas.title"></h2>
      <p data-i18n="nogas.p1"></p>
      <div class="card">
        <div class="controls">
          <label class="grow"><span data-i18n="nogas.probe"></span> <output id="nogas-U2-out"></output>
            <input id="nogas-U2" type="range" min="0" max="45" step="0.25" value="5">
          </label>
          <button id="nogas-toggle" type="button" class="btn"></button>
        </div>
        <div id="nogas-plot" class="plot short" role="img" data-i18n-aria="nogas.plot.aria"></div>
        <canvas id="nogas-canvas" class="motion" role="img" data-i18n-aria="nogas.canvas.aria"></canvas>
      </div>
    </section>

    <!-- 6 · Ideal and real, no gas -->
    <section id="cmp">
      <h2 data-i18n="cmp.title"></h2>
      <p data-i18n="cmp.p1"></p>
      <div class="card">
        <div class="controls">
          <label class="grow"><span data-i18n="cmp.U3"></span> <output id="cmp-U3-out"></output>
            <input id="cmp-U3" type="range" min="0.5" max="5" step="0.1" value="1.5">
          </label>
        </div>
        <div id="cmp-plot" class="plot short" role="img" data-i18n-aria="cmp.plot.aria"></div>
      </div>
      <p class="note" data-i18n="cmp.p2"></p>
    </section>

    <!-- 7 · Anode current with gas -->
    <section id="gas">
      <h2 data-i18n="gas.title"></h2>
      <p data-i18n="gas.p1"></p>
      <div class="card">
        <div class="controls">
          <label><span data-i18n="ctl.U1"></span> <output id="gas-U1-out"></output>
            <input id="gas-U1" type="range" min="0" max="4.5" step="0.1" value="1">
          </label>
          <label><span data-i18n="ctl.U2"></span> <output id="gas-U2-out"></output>
            <input id="gas-U2" type="range" min="0" max="45" step="0.25" value="20">
          </label>
          <label><span data-i18n="ctl.U3"></span> <output id="gas-U3-out"></output>
            <input id="gas-U3" type="range" min="0.5" max="5" step="0.1" value="1.5">
          </label>
          <label><span id="gas-density-label"></span> <output id="gas-density-out"></output>
            <input id="gas-density" type="range" min="150" max="190" step="1" value="170">
          </label>
          <label class="check"><input id="gas-ideal" type="checkbox" checked> <span data-i18n="gas.ideal"></span></label>
        </div>
        <div id="gas-plot" class="plot" role="img" data-i18n-aria="gas.plot.aria"></div>
        <p id="gas-readout" class="result" aria-live="polite"></p>
        <h3 data-i18n="gas.energy.title"></h3>
        <div id="gas-energy-plot" class="plot short" role="img" data-i18n-aria="gas.energy.aria"></div>
      </div>
      <p class="note" data-i18n="gas.p2"></p>
      <p class="theory" data-i18n="gas.theory"></p>
    </section>

    <!-- 8 · Why several peaks -->
    <section id="peaks">
      <h2 data-i18n="peaks.title"></h2>
      <p data-i18n="peaks.p1"></p>
      <svg id="peaks-cap" class="capacitor" viewBox="0 0 400 110" role="img" data-i18n-aria="peaks.cap.aria">
        <line x1="90" y1="14" x2="90" y2="80" class="plate"/>
        <line x1="310" y1="14" x2="310" y2="80" class="plate"/>
        <g class="field"><line x1="100" y1="30" x2="300" y2="30"/><line x1="100" y1="47" x2="300" y2="47"/><line x1="100" y1="64" x2="300" y2="64"/></g>
        <path d="M296,26 l8,4 l-8,4 z M296,43 l8,4 l-8,4 z M296,60 l8,4 l-8,4 z" class="head"/>
        <text x="90" y="100" text-anchor="middle" data-i18n="peaks.cap.G1"></text>
        <text x="310" y="100" text-anchor="middle" data-i18n="peaks.cap.G2"></text>
        <text x="200" y="22" text-anchor="middle" class="small" data-i18n="peaks.cap.E"></text>
      </svg>
      <div class="card">
        <div class="controls">
          <label><span data-i18n="ctl.U1"></span> <output id="peaks-U1-out"></output>
            <input id="peaks-U1" type="range" min="0" max="4.5" step="0.1" value="1">
          </label>
          <label class="grow"><span data-i18n="ctl.U2"></span> <output id="peaks-U2-out"></output>
            <input id="peaks-U2" type="range" min="0" max="45" step="0.25" value="20">
          </label>
        </div>
        <div id="peaks-plot" class="plot short" role="img" data-i18n-aria="peaks.plot.aria"></div>
        <p id="peaks-zones" class="result"></p>
        <div id="peaks-curve-plot" class="plot" role="img" data-i18n-aria="peaks.curve.aria"></div>
        <p id="peaks-result" class="result" aria-live="polite"></p>
        <table id="peaks-table" class="data">
          <thead><tr><th>n</th><th data-i18n="peaks.col.u"></th><th data-i18n="peaks.col.d"></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="note" data-i18n="peaks.p2"></p>
      <p class="theory" data-i18n="peaks.theory"></p>
    </section>

    <!-- 9 · Illuminated stripes -->
    <section id="glow">
      <h2 data-i18n="glow.title"></h2>
      <p data-i18n="glow.p1"></p>
      <div class="card">
        <div class="controls">
          <label class="grow"><span data-i18n="glow.U2"></span> <output id="glow-U2-out"></output>
            <input id="glow-U2" type="range" min="0" max="45" step="0.25" value="20">
          </label>
          <button id="glow-toggle" type="button" class="btn"></button>
        </div>
        <canvas id="glow-canvas" class="motion tall" role="img" data-i18n-aria="glow.canvas.aria"></canvas>
      </div>
      <p class="theory" data-i18n="glow.theory"></p>
    </section>

    <!-- 10 · Why the minima do not reach zero -->
    <section id="minima">
      <h2 data-i18n="minima.title"></h2>
      <p data-i18n="minima.p1"></p>
      <div class="card">
        <div class="controls">
          <label class="grow"><span data-i18n="minima.U2"></span> <output id="minima-U2-out"></output>
            <input id="minima-U2" type="range" min="0" max="45" step="0.25" value="20">
          </label>
          <label><span id="minima-density-label"></span> <output id="minima-density-out"></output>
            <input id="minima-density" type="range" min="150" max="190" step="1" value="170">
          </label>
          <button id="minima-toggle" type="button" class="btn"></button>
        </div>
        <canvas id="minima-canvas" class="motion tall" role="img" data-i18n-aria="minima.canvas.aria"></canvas>
        <div class="bar" aria-hidden="true"><div id="minima-bar-fill"></div></div>
        <p id="minima-bartext" class="result" aria-live="polite"></p>
        <div id="minima-plot" class="plot short" role="img" data-i18n-aria="minima.plot.aria"></div>
      </div>
      <p class="note" data-i18n="minima.p2"></p>
      <p class="theory" data-i18n="minima.theory"></p>
    </section>

    <!-- 11 · References -->
    <section id="refs">
      <h2 data-i18n="refs.title"></h2>
      <p class="muted" data-i18n="refs.intro"></p>
      <ol class="refs">
        <li data-i18n="refs.r1"></li>
        <li data-i18n="refs.r2"></li>
        <li data-i18n="refs.r3"></li>
        <li data-i18n="refs.r4"></li>
      </ol>
    </section>
  </main>
</div>
<footer class="wrap foot"><p class="muted" data-i18n="footer"></p></footer>
</body>
</html>
```

Append to `css/style.css` (and delete the now-unused rule `.busy` and `.error`; keep the rest):

```css
/* analytic redesign */
.gasbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; position: sticky; top: 0; z-index: 4; background: var(--bg); padding: 8px 0; border-bottom: 1px solid var(--border); }
.gasbar label { display: flex; align-items: center; gap: 8px; }
.gasbar select { width: auto; }
.cards3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.cards3 .card { margin: 14px 0; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 8px; font-size: .9rem; color: var(--muted); }
.chips span { border: 1px solid var(--border); border-radius: 999px; padding: 2px 10px; }
.motion.tall { height: 240px; }
.capacitor { width: 100%; max-width: 420px; height: auto; display: block; margin: 8px auto; }
.capacitor .plate { stroke: var(--fg); stroke-width: 5; }
.capacitor .field line { stroke: var(--c1); stroke-width: 1.5; }
.capacitor .head { fill: var(--c1); }
.capacitor text { fill: var(--fg); font: 13px system-ui, sans-serif; }
.capacitor .small { fill: var(--muted); font-size: 12px; }
.bar { height: 14px; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; margin-top: 8px; }
#minima-bar-fill { height: 100%; width: 0; background: var(--c2); transition: width .2s; }
.scheme text { fill: var(--fg); font: 13px system-ui, sans-serif; }
.scheme .small { fill: var(--muted); font-size: 12px; }
.scheme .wire { stroke: var(--fg); stroke-width: 1.5; fill: none; }
.scheme .plate-long { stroke: var(--fg); stroke-width: 3; }
.scheme .plate-short { stroke: var(--fg); stroke-width: 3; }
.scheme .phi { stroke: var(--c1); stroke-width: 3; fill: none; }
.scheme .dash { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 4 3; }
.scheme .plus { fill: var(--c2); font-weight: 700; }
.scheme .minus { fill: var(--c1); font-weight: 700; }
.orb text { fill: var(--fg); font: 14px system-ui, sans-serif; }
.orb .box { fill: none; stroke: var(--fg); stroke-width: 1.5; }
.orb .small { fill: var(--muted); font-size: 12px; }
.orb .arrow { fill: var(--c1); font-size: 18px; }
@media (max-width: 860px) {
  .cards3 { grid-template-columns: minmax(0, 1fr); }
  .gasbar { top: 41px; }
}
```

`js/store.js`:

```js
// Shared UI state: only the chosen gas is shared between sections.
export const state = { gas: 'hg' };

const listeners = new Set();

export function update(patch) {
  Object.assign(state, patch);
  const keys = Object.keys(patch);
  for (const fn of listeners) fn(keys);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

`js/controls.js`:

```js
// A range input with a live value in <output id="{id}-out">; fmt(value) -> text.
export function makeSlider(id, fmt, onInput) {
  const el = document.getElementById(id);
  const out = document.getElementById(id + '-out');
  const api = {
    el,
    get value() { return parseFloat(el.value); },
    set(v) { el.value = v; api.refresh(); },
    range(min, max, step) { el.min = min; el.max = max; el.step = step; },
    refresh() { if (out) out.textContent = fmt(api.value); },
  };
  el.addEventListener('input', () => { api.refresh(); if (onInput) onInput(api.value); });
  api.refresh();
  return api;
}
```

`js/gapcanvas.js`:

```js
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
```

`js/main.js`:

```js
import { initialLang, setLang } from './i18n.js';
import { state, update } from './store.js';

function boot() {
  setLang(initialLang());
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  const gasSel = document.getElementById('global-gas');
  gasSel.value = state.gas;
  gasSel.addEventListener('input', () => update({ gas: gasSel.value }));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('themechange'));
  });
  // Section modules are initialised here (added by the following tasks).
}

boot();
```

- [ ] **Step 5: Dev tools for real-browser checks**

`scripts/browser.sh` (starts the page server and a debuggable headless Chrome; stop them with `pkill -f remote-debugging-port=9333; pkill -f "http.server 8000"`):

```bash
#!/usr/bin/env bash
# Start the page server (8000) and a headless Chrome with a debugging port (9333) for scripts/cdp.py.
cd "$(dirname "$0")/.."
curl -s -o /dev/null localhost:8000/index.html || (setsid nohup python3 -m http.server 8000 >/dev/null 2>&1 &)
curl -s -o /dev/null localhost:9333/json/version || (setsid nohup "${CHROME:-google-chrome}" --headless=new --no-sandbox --disable-gpu \
  --remote-debugging-port=9333 --user-data-dir="${TMPDIR:-/tmp}/fh-chrome-profile" about:blank >/dev/null 2>&1 &)
sleep 2
```

`scripts/cdp.py`:

```python
#!/usr/bin/env python3
"""Minimal Chrome DevTools client (stdlib only). Needs scripts/browser.sh running.
Usage: cdp.py URL [--wait SEC] [--w W] [--h H] [--dark] [--clickjs JS] [--eval JS]... [--shot FILE] [--clip x,y,w,h]
--clickjs: JS returning [x, y] viewport coordinates of a real mouse click. --eval: JS evaluated after the wait
(promises are awaited); results are printed as JSON. The cache is disabled."""
import argparse, base64, json, os, socket, struct, sys, time, urllib.request

class WS:
    def __init__(self, url):
        assert url.startswith('ws://')
        hp, path = url[5:].split('/', 1)
        host, port = hp.split(':')
        self.s = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f'GET /{path} HTTP/1.1\r\nHost: {hp}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.s.recv(1)
        self.buf = b''
        self.id = 0

    def send(self, obj):
        data = json.dumps(obj).encode()
        hdr = bytearray([0x81])
        n = len(data)
        if n < 126: hdr.append(0x80 | n)
        elif n < 65536: hdr.append(0x80 | 126); hdr += struct.pack('>H', n)
        else: hdr.append(0x80 | 127); hdr += struct.pack('>Q', n)
        mask = os.urandom(4)
        hdr += mask
        self.s.sendall(bytes(hdr) + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def _read(self, n):
        while len(self.buf) < n:
            c = self.s.recv(65536)
            if not c: raise EOFError
            self.buf += c
        r, self.buf = self.buf[:n], self.buf[n:]
        return r

    def recv(self):
        msg = b''
        while True:
            b1, b2 = self._read(2)
            op = b1 & 0x0f
            n = b2 & 0x7f
            if n == 126: n = struct.unpack('>H', self._read(2))[0]
            elif n == 127: n = struct.unpack('>Q', self._read(8))[0]
            payload = self._read(n)
            if op in (0, 1, 2): msg += payload
            if b1 & 0x80 and op in (0, 1, 2): return json.loads(msg)

    def call(self, method, params=None):
        self.id += 1
        i = self.id
        self.send({'id': i, 'method': method, 'params': params or {}})
        while True:
            m = self.recv()
            if m.get('id') == i: return m

ap = argparse.ArgumentParser()
ap.add_argument('url'); ap.add_argument('--wait', type=float, default=5)
ap.add_argument('--w', type=int, default=1200); ap.add_argument('--h', type=int, default=900)
ap.add_argument('--eval', action='append', default=[]); ap.add_argument('--shot'); ap.add_argument('--clip')
ap.add_argument('--clickjs'); ap.add_argument('--port', type=int, default=9333); ap.add_argument('--dark', action='store_true')
a = ap.parse_args()
req = urllib.request.Request(f'http://localhost:{a.port}/json/new?{a.url}', method='PUT')
tgt = json.load(urllib.request.urlopen(req))
ws = WS(tgt['webSocketDebuggerUrl'])
for m in ('Page.enable', 'Runtime.enable', 'Network.enable'): ws.call(m)
ws.call('Network.setCacheDisabled', {'cacheDisabled': True})
ws.call('Emulation.setDeviceMetricsOverride', {'width': a.w, 'height': a.h, 'deviceScaleFactor': 1, 'mobile': False})
if a.dark: ws.call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'dark'}]})
ws.call('Page.navigate', {'url': a.url})
time.sleep(a.wait)
if a.clickjs:
    r = ws.call('Runtime.evaluate', {'expression': a.clickjs, 'returnByValue': True})
    x, y = r['result']['result']['value']
    for typ in ('mouseMoved', 'mousePressed', 'mouseReleased'):
        ws.call('Input.dispatchMouseEvent', {'type': typ, 'x': x, 'y': y, 'button': 'left', 'clickCount': 1})
    time.sleep(1)
for js in a.eval:
    r = ws.call('Runtime.evaluate', {'expression': js, 'awaitPromise': True, 'returnByValue': True})
    print(json.dumps(r.get('result', r), ensure_ascii=False)[:3000])
if a.shot:
    p = {'format': 'png'}
    if a.clip:
        x, y, w, h = map(float, a.clip.split(','))
        p['clip'] = {'x': x, 'y': y, 'width': w, 'height': h, 'scale': 1}
        p['captureBeyondViewport'] = True
    r = ws.call('Page.captureScreenshot', p)
    open(a.shot, 'wb').write(base64.b64decode(r['result']['data']))
urllib.request.urlopen(f"http://localhost:{a.port}/json/close/{tgt['id']}").read()
```

- [ ] **Step 6: Run the tests, update the smoke test and README, check the page**

Replace the checks in `scripts/smoke.sh` for the new page (keep the structure; the simulation no longer needs `?sync`, remove it from the URL): change the three-plot check to `[ $(grep -o 'js-plotly-plot' ...) -ge 5 ]` named `five Plotly plots rendered`, remove the `spacing table filled` check, and add `check "[$lang] orbital diagram present" "grep -q '<svg[^>]*class=\"orb\"' ..."`. (They pass only after Tasks 5–11; until then run only `./scripts/test.sh`.)

Update `README.md`: replace the first paragraph with `Bilingual (EN/DE) static page that explains the Franck–Hertz experiment with closed-form theory (no Monte Carlo): levels and orbitals, tube and potentials, the experiment, the I_A(U₂) curve without and with gas, why there are several peaks, the glowing stripes and why the minima do not reach zero.`; add under *Test* the line `./scripts/browser.sh   # server + debuggable Chrome, then python3 scripts/cdp.py URL --eval JS --shot FILE`.

Run: `chmod +x scripts/browser.sh scripts/cdp.py && ./scripts/test.sh`
Expected: `RESULT: PASS` — count: 104 − 10 (removed physics/profile/montecarlo… tests adjust automatically) … report the actual count; there must be no FAIL. Then open the page once to check the shell: `./scripts/browser.sh; python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 4 --eval "document.querySelectorAll('section').length"` → `11`, and no `Uncaught` errors (`--eval "typeof Plotly"` → `"object"`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: cut over to the analytic page skeleton (texts, markup, canvas helpers) and drop the Monte Carlo code" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Section 1 — levels and orbitals

**Files:**
- Create: `js/levels.js` (overwrites the old file — it was kept through Task 4's `git rm` of only `tests/levels.test.js`), `js/orbitals.js`, `tests/levels.test.js`
- Modify: `js/main.js`, `tests/index.html`

**Interfaces:**
- Consumes: `LEVELS`, `ORBITALS`, `thermalEnergyEV`, `wavelengthNm`, `boltzmannFactor` (`physics.js`); `formatSci`; `svgEl`, `svgText` (`dom.js`); `t`, `num`, `renderMath`; `state`, `subscribe` (`store.js`); `makeSlider`.
- Produces: `renderLevels(container, gasId, tempK)`, `initLevels()`, `renderOrbitals(container, gasId)`.

- [ ] **Step 1: Write the failing tests**

`tests/levels.test.js`:

```js
import { test, assert } from './harness.js';
import { renderLevels } from '../js/levels.js';
import { renderOrbitals } from '../js/orbitals.js';
import { setLang } from '../js/i18n.js';

function textOf(render, gasId, ...rest) {
  const box = document.createElement('div');
  render(box, gasId, ...rest);
  return box.textContent;
}

test('Hg ladder shows the 253.7 nm line next to the transition energy', () => {
  assert.ok(textOf(renderLevels, 'hg', 295).includes('253.7 nm'));
});

test('Ne ladder shows no wavelength for the excitation arrow (3p -> ground is forbidden)', () => {
  const txt = textOf(renderLevels, 'ne', 295);
  assert.ok(!/\d\s*nm/.test(txt), 'Ne ladder text: ' + txt);
  assert.ok(txt.includes('ΔE'));
});

test('German ladder uses decimal commas', () => {
  try {
    setLang('de');
    const txt = textOf(renderLevels, 'hg', 295);
    assert.ok(txt.includes('253,7 nm'), txt);
    assert.ok(txt.includes('4,89 eV') && txt.includes('10,44 eV'), txt);
    assert.ok(!/\d\.\d/.test(txt), 'a decimal point is left: ' + txt);
  } finally { setLang('en'); }
});

test('the thermal marker uses a subscript tspan, not a literal underscore', () => {
  const box = document.createElement('div');
  renderLevels(box, 'hg', 295);
  assert.ok(!/k_B/.test(box.textContent));
  assert.ok(box.querySelector('tspan'));
});

test('orbital diagram: two columns, one box per orbital slot and spin arrows', () => {
  const box = document.createElement('div');
  renderOrbitals(box, 'hg');
  const rects = box.querySelectorAll('rect.box');
  assert.equal(rects.length, 2 * (1 + 3)); // ground and excited: 6s (1 box) + 6p (3 boxes)
  assert.ok(box.textContent.includes('6s') && box.textContent.includes('6p'));
  assert.ok(/↑/.test(box.textContent));
  const ne = document.createElement('div');
  renderOrbitals(ne, 'ne');
  assert.equal(ne.querySelectorAll('rect.box').length, 2 * (3 + 1));
});
```

Add `import './levels.test.js';` to `tests/index.html`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh` — Expected: FAIL (`orbitals.js` missing; the old `levels.js` was deleted in Task 4's `git rm`? **No**: `js/levels.js` still exists from the Monte Carlo version and has the old `initLevels` with a `levels-gas` select; the test still fails because of the missing `orbitals.js`).

- [ ] **Step 3: Implement**

`js/orbitals.js`:

```js
import { ORBITALS } from './physics.js';
import { svgEl } from './dom.js';
import { t } from './i18n.js';

const BOX = 34, GAP = 6;
const GLYPH = { 1: '↑', 2: '↓', 3: '↑↓' };

// Box diagram of the valence orbitals: left ground state, right excited state.
export function renderOrbitals(container, gasId) {
  const cols = [['idea.orb.ground', ORBITALS[gasId].ground], ['idea.orb.excited', ORBITALS[gasId].excited]];
  const W = 560, H = 150;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'orb', 'aria-hidden': 'true' });
  cols.forEach(([titleKey, groups], c) => {
    const x0 = 20 + c * 290;
    svg.append(svgEl('text', { x: x0, y: 20, class: 'small' }, t(titleKey)));
    let x = x0;
    for (const g of groups) {
      g.boxes.forEach((state, i) => {
        const bx = x + i * (BOX + GAP);
        svg.append(svgEl('rect', { x: bx, y: 50, width: BOX, height: BOX, class: 'box' }));
        if (state) svg.append(svgEl('text', { x: bx + BOX / 2, y: 74, 'text-anchor': 'middle', class: 'arrow' }, GLYPH[state]));
      });
      svg.append(svgEl('text', { x: x + (g.boxes.length * (BOX + GAP) - GAP) / 2, y: 108, 'text-anchor': 'middle' }, g.name));
      x += g.boxes.length * (BOX + GAP) + 18;
    }
  });
  svg.append(svgEl('text', { x: 268, y: 72, 'text-anchor': 'middle', class: 'small' }, '→'));
  container.replaceChildren(svg);
}
```

`js/levels.js` (rewrite; ladder code as before, but the gas comes from the store, the thermal label is a subscript text and numbers go through `num`):

```js
import { LEVELS, thermalEnergyEV, wavelengthNm, boltzmannFactor } from './physics.js';
import { formatSci } from './format.js';
import { svgEl, svgText } from './dom.js';
import { t, num, renderMath } from './i18n.js';
import { state, subscribe } from './store.js';
import { makeSlider } from './controls.js';
import { renderOrbitals } from './orbitals.js';

const W = 560, H = 380;
const PAD = { l: 64, r: 16, t: 16, b: 34 };
const X_LINE0 = 150, X_LINE1 = 330;

// Push labels apart vertically (screen y, input order preserved) so they stay readable.
function spread(ys, gap) {
  const idx = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const out = ys.slice();
  for (let k = 1; k < idx.length; k++) {
    const a = idx[k - 1], b = idx[k];
    if (out[b] - out[a] < gap) out[b] = out[a] + gap;
  }
  return out;
}

export function renderLevels(container, gasId, tempK) {
  const data = LEVELS[gasId];
  const top = data.ionization * 1.08;
  const y = (e) => PAD.t + (1 - e / top) * (H - PAD.t - PAD.b);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'levels', 'aria-hidden': 'true' });

  const defs = svgEl('defs');
  const marker = svgEl('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' });
  marker.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: 'var(--c1)' }));
  defs.append(marker);
  svg.append(defs);

  svg.append(svgEl('line', { x1: PAD.l, y1: y(0), x2: PAD.l, y2: y(top), class: 'axis' }));
  const step = gasId === 'hg' ? 2 : 5;
  for (let e = 0; e <= top; e += step) {
    svg.append(svgEl('line', { x1: PAD.l - 5, y1: y(e), x2: PAD.l, y2: y(e), class: 'tick' }));
    svg.append(svgEl('text', { x: PAD.l - 9, y: y(e) + 4, 'text-anchor': 'end' }, String(e)));
  }
  svg.append(svgEl('text', { x: 14, y: 14, class: 'small' }, 'E / eV'));

  svg.append(svgEl('line', { x1: X_LINE0, y1: y(0), x2: X_LINE1, y2: y(0), class: 'lv' }));
  svg.append(svgEl('text', { x: X_LINE1 + 10, y: y(0) + 4 }, `${data.ground} (${t('idea.ground')})`));
  svg.append(svgEl('line', { x1: X_LINE0, y1: y(data.ionization), x2: X_LINE1, y2: y(data.ionization), class: 'ion' }));
  svg.append(svgEl('text', { x: X_LINE1 + 10, y: y(data.ionization) + 4, class: 'small' }, `${t('idea.ion')} ${num(data.ionization)} eV`));

  const labelYs = spread(data.levels.map((l) => y(l.e)), 15);
  data.levels.forEach((l, i) => {
    svg.append(svgEl('line', { x1: X_LINE0, y1: y(l.e), x2: X_LINE1, y2: y(l.e), class: l.highlight ? 'lv hl' : 'lv' }));
    svg.append(svgEl('text', { x: X_LINE1 + 10, y: labelYs[i] + 4, class: l.highlight ? 'hl-text' : '' }, `${l.label}  ${num(l.e, 2)} eV`));
  });

  const hl = data.levels.find((l) => l.highlight);
  const ax = (X_LINE0 + X_LINE1) / 2;
  svg.append(svgEl('line', { x1: ax, y1: y(0) - 2, x2: ax, y2: y(hl.e) + 4, class: 'arrow', 'marker-end': 'url(#arrowhead)' }));
  svg.append(svgEl('text', { x: ax - 8, y: (y(0) + y(hl.e)) / 2, 'text-anchor': 'end', class: 'hl-text' },
    gasId === 'hg'
      ? t('idea.arrow', { dE: hl.e.toFixed(2), nm: wavelengthNm(hl.e).toFixed(1) })
      : t('idea.arrow.ne', { dE: hl.e.toFixed(1) }))); // 3p -> ground is forbidden: no single line to quote

  const kT = Math.min(thermalEnergyEV(tempK), top);
  svg.append(svgEl('circle', { cx: PAD.l + 34, cy: y(kT), r: 5, class: 'dot' }));
  svg.append(svgText({ x: PAD.l + 44, y: y(kT) - 8, class: 'small' }, t('idea.kt', { kt: thermalEnergyEV(tempK).toPrecision(2) })));

  container.replaceChildren(svg);
}

export function initLevels() {
  const fig = document.getElementById('levels-svg');
  const orb = document.getElementById('orbitals-svg');
  const res = document.getElementById('levels-result');
  const slider = makeSlider('levels-T', (v) => `${Math.round(Math.pow(10, v))} K`, draw);

  function draw() {
    const gasId = state.gas;
    const tempK = Math.pow(10, slider.value);
    slider.refresh();
    renderLevels(fig, gasId, tempK);
    renderOrbitals(orb, gasId);
    const hl = LEVELS[gasId].levels.find((l) => l.highlight);
    res.innerHTML = t('idea.result', {
      kt: thermalEnergyEV(tempK).toPrecision(2),
      bf: formatSci(boltzmannFactor(hl.e, tempK)),
    });
    renderMath(res);
  }

  subscribe((keys) => { if (keys.includes('gas')) draw(); });
  document.addEventListener('langchange', draw);
  draw();
}
```

In `js/main.js` add `import { initLevels } from './levels.js';` and call `initLevels();` after the comment line.

- [ ] **Step 4: Run to verify it passes, then check in a real browser**

Run: `./scripts/test.sh` — Expected: PASS (report the count). Then:

```bash
./scripts/browser.sh
python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 5 --w 1200 --h 900 --shot /tmp/s1.png --clip 250,0,820,1500
```

Read `/tmp/s1.png`: level ladder with the thermal dot and `kBT` with a subscript B, orbital diagram with ground and excited boxes (Hg: filled 6s, empty 6p → half-filled 6s and one arrow in 6p). Also run `--eval "(()=>{const s=document.getElementById('global-gas'); s.value='ne'; s.dispatchEvent(new Event('input',{bubbles:true})); return document.getElementById('orbitals-svg').textContent})()"` — Expected: the text contains `2p` and `3s`.

- [ ] **Step 5: Commit**

```bash
git add js/levels.js js/orbitals.js js/main.js tests/levels.test.js tests/index.html
git commit -m "feat: section 1 - energy levels with orbital diagram" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Sections 2–3 — the tube scheme with signed voltage sources

**Files:**
- Create: `js/schematic.js`, `tests/schematic.test.js`
- Modify: `js/main.js`, `tests/index.html`

**Interfaces:**
- Consumes: `svgEl`, `svgText` (`dom.js`); `t` (`i18n.js`).
- Produces: `renderScheme(container)`, `initScheme()` (re-renders on `langchange`). Section 3 is static markup (no code).

- [ ] **Step 1: Write the failing test**

`tests/schematic.test.js`:

```js
import { test, assert } from './harness.js';
import { renderScheme } from '../js/schematic.js';

function render() {
  const box = document.createElement('div');
  renderScheme(box);
  return box;
}

test('scheme draws the four electrodes and three sources with plus and minus poles', () => {
  const box = render();
  const texts = [...box.querySelectorAll('text')].map((e) => e.textContent);
  for (const label of ['K', 'G₁', 'G₂', 'A']) assert.ok(texts.includes(label), label + ' missing');
  assert.equal(texts.filter((s) => s === '+').length, 3);
  assert.equal(texts.filter((s) => s === '−').length, 3);
  assert.equal(box.querySelectorAll('line.plate-long').length, 3);
  assert.equal(box.querySelectorAll('line.plate-short').length, 3);
});

test('the long plate (plus) of the sources U1 and U2 faces the later electrode, that of U3 faces G2', () => {
  const box = render();
  const longs = [...box.querySelectorAll('line.plate-long')].map((l) => parseFloat(l.getAttribute('x1')));
  const shorts = [...box.querySelectorAll('line.plate-short')].map((l) => parseFloat(l.getAttribute('x1')));
  assert.ok(longs[0] > shorts[0], 'U1: plus on the G1 side');
  assert.ok(longs[1] > shorts[1], 'U2: plus on the G2 side');
  assert.ok(longs[2] < shorts[2], 'U3: plus on the G2 side (A is lower than G2)');
});

test('the potential steps up by U1 and U2 and down by U3', () => {
  const box = render();
  const pts = box.querySelector('polyline.phi').getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));
  const ys = pts.map((p) => p[1]);
  // SVG y grows downwards: a higher potential is a smaller y.
  assert.ok(ys[2] < ys[0], 'phi(G1) above phi(K)');
  assert.ok(ys[4] < ys[2], 'phi(G2) above phi(G1)');
  assert.ok(ys[6] > ys[4], 'phi(A) below phi(G2)');
});

test('the three zone explanations are present', () => {
  const txt = render().textContent;
  assert.ok(txt.includes('φ(G₁) − φ(K)') && txt.includes('φ(G₂) − φ(G₁)') && txt.includes('φ(G₂) − φ(A)'));
});
```

Add `import './schematic.test.js';` to `tests/index.html`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh` — Expected: FAIL (module `schematic.js` missing).

- [ ] **Step 3: Implement**

`js/schematic.js`:

```js
import { svgEl } from './dom.js';
import { t } from './i18n.js';

const W = 640, H = 470;
const XK = 70, XG1 = 190, XG2 = 450, XA = 570; // electrode x positions
const TUBE_Y = 50, TUBE_H = 80, BUS_Y = 190;
const PHI_TOP = 285, PHI_UNIT = 22; // potential baseline (y of phi = 0 is PHI_BASE)
const PHI_BASE = 410;
const U = { U1: 1.5, U2: 4, U3: 1.8 }; // example values, in units of PHI_UNIT

function battery(svg, cx, y, plusRight, labelKey, name) {
  // two vertical plates 10 px apart; the long plate is the positive pole
  const xl = cx - 5, xr = cx + 5;
  const longX = plusRight ? xr : xl, shortX = plusRight ? xl : xr;
  svg.append(svgEl('line', { x1: longX, y1: y - 16, x2: longX, y2: y + 16, class: 'plate-long' }));
  svg.append(svgEl('line', { x1: shortX, y1: y - 8, x2: shortX, y2: y + 8, class: 'plate-short' }));
  svg.append(svgEl('text', { x: longX + (plusRight ? 12 : -12), y: y - 18, 'text-anchor': 'middle', class: 'plus' }, '+'));
  svg.append(svgEl('text', { x: shortX + (plusRight ? -12 : 12), y: y - 18, 'text-anchor': 'middle', class: 'minus' }, '−'));
  svg.append(svgEl('text', { x: cx, y: y + 34, 'text-anchor': 'middle' }, name));
  svg.append(svgEl('text', { x: cx, y: y + 50, 'text-anchor': 'middle', class: 'small' }, t(labelKey)));
}

function lines(svg, x, y, str, cls) {
  str.split('|').forEach((l, i) => svg.append(svgEl('text', { x, y: y + i * 15, 'text-anchor': 'middle', class: cls }, l)));
}

export function renderScheme(container) {
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scheme', 'aria-hidden': 'true' });

  // tube with electrodes
  svg.append(svgEl('rect', { x: 20, y: TUBE_Y, width: 600, height: TUBE_H, rx: 40, class: 'glass' }));
  svg.append(svgEl('rect', { x: XK - 5, y: TUBE_Y + 18, width: 10, height: 44, class: 'electrode' }));
  for (const x of [XG1, XG2]) svg.append(svgEl('line', { x1: x, y1: TUBE_Y + 6, x2: x, y2: TUBE_Y + TUBE_H - 6, class: 'grid-el' }));
  svg.append(svgEl('rect', { x: XA - 5, y: TUBE_Y + 12, width: 10, height: 56, class: 'electrode' }));
  [['K', XK], ['G₁', XG1], ['G₂', XG2], ['A', XA]].forEach(([name, x]) => {
    svg.append(svgEl('text', { x, y: TUBE_Y - 12, 'text-anchor': 'middle' }, name));
    svg.append(svgEl('line', { x1: x, y1: TUBE_Y + TUBE_H, x2: x, y2: BUS_Y, class: 'wire' }));
  });

  // series chain of the three sources along the bus
  svg.append(svgEl('line', { x1: XK, y1: BUS_Y, x2: XA, y2: BUS_Y, class: 'wire' }));
  battery(svg, (XK + XG1) / 2, BUS_Y, true, 'scheme.suction', 'U₁');   // + toward G1
  battery(svg, (XG1 + XG2) / 2, BUS_Y, true, 'scheme.accel', 'U₂');    // + toward G2
  battery(svg, (XG2 + XA) / 2, BUS_Y, false, 'scheme.decel', 'U₃');    // + toward G2 (A lower)

  // potential along the tube: K = 0, G1 = U1, G2 = U1 + U2, A = U1 + U2 - U3
  const y = (phi) => PHI_BASE - phi * PHI_UNIT;
  const phi = [0, U.U1, U.U1 + U.U2, U.U1 + U.U2 - U.U3];
  const xs = [XK, XG1, XG2, XA];
  // Vertices in order: K level, G1 corner, G1 level, G2 corner, G2 level, A corner, A level.
  const poly = [[xs[0], y(phi[0])], [xs[1], y(phi[0])], [xs[1], y(phi[1])], [xs[2], y(phi[1])], [xs[2], y(phi[2])], [xs[3], y(phi[2])], [xs[3], y(phi[3])]];
  svg.append(svgEl('polyline', { points: poly.map((p) => p.join(',')).join(' '), class: 'phi' }));
  for (const x of xs) svg.append(svgEl('line', { x1: x, y1: PHI_TOP - 10, x2: x, y2: PHI_BASE + 6, class: 'dash' }));
  svg.append(svgEl('text', { x: 14, y: PHI_TOP - 12, class: 'small' }, t('scheme.phi')));
  svg.append(svgEl('text', { x: 14, y: PHI_TOP + 4, class: 'small' }, '+'));

  lines(svg, (XK + XG1) / 2, PHI_BASE + 26, t('scheme.z1'), 'small');
  lines(svg, (XG1 + XG2) / 2, PHI_BASE + 26, t('scheme.z2'), 'small');
  lines(svg, (XG2 + XA) / 2 + 6, PHI_BASE + 26, t('scheme.z3'), 'small');

  container.replaceChildren(svg);
}

export function initScheme() {
  const box = document.getElementById('scheme-svg');
  const draw = () => renderScheme(box);
  document.addEventListener('langchange', draw);
  draw();
}
```

(The test reads `ys[0]` = φ(K), `ys[2]` = φ(G₁), `ys[4]` = φ(G₂), `ys[6]` = φ(A) from the polyline vertices.)

In `js/main.js` add `import { initScheme } from './schematic.js';` and `initScheme();` after `initLevels();`.

- [ ] **Step 4: Run to verify it passes, check in a real browser**

Run: `./scripts/test.sh` — Expected: PASS. Then `python3 scripts/cdp.py "http://localhost:8000/index.html?lang=de" --wait 5 --w 1200 --h 900 --eval "document.getElementById('scheme-svg').scrollIntoView({behavior:'instant',block:'start'}); 'ok'" --shot /tmp/s2.png` and Read the image: the tube, the three batteries with `+`/`−` next to the right plates (long bar toward G₁ for U₁, toward G₂ for U₂, toward G₂ for U₃), the stepped potential (up, up, down) and the three zone explanations in German, none overlapping.

- [ ] **Step 5: Commit**

```bash
git add js/schematic.js js/main.js tests/schematic.test.js tests/index.html
git commit -m "feat: sections 2-3 - tube scheme with signed sources and potential steps" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Section 4 — how the experiment is run (`sweep.js`)

**Files:**
- Create: `js/sweep.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `state`, `subscribe`; `realCurve` (`analytic.js`); `modelParams`, `u2Grid` (`params.js`); `RANGES`, `DEFAULTS`; `makeSlider`; `baseLayout`, `plotConfig`, `colors`; `t`, `num`, `renderMath`; global `Plotly`.
- Produces: `initSweep()`.

(This UI module has no new pure logic; its checks are the real-browser steps. The pure parts it uses are tested in Tasks 2–3.)

- [ ] **Step 1: Implement**

`js/sweep.js`:

```js
import { state, subscribe } from './store.js';
import { realCurve } from './analytic.js';
import { modelParams, u2Grid } from './params.js';
import { RANGES } from './physics.js';
import { makeSlider } from './controls.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

const SWEEP_SECONDS = 10;

export function initSweep() {
  const plot = document.getElementById('run-plot');
  const readout = document.getElementById('run-readout');
  const fixed = document.getElementById('run-fixed');
  const play = document.getElementById('run-play');
  let curve = null, playing = false, raf = 0, last = 0, lastDraw = 0;
  const slider = makeSlider('run-U2', (v) => `${num(v, 1)} V`, () => { stop(); draw(); });

  function compute() {
    const p = modelParams(state.gas);
    const U2s = u2Grid(state.gas);
    curve = { p, U2s, I: realCurve(p, U2s), max: RANGES[state.gas].U2[1], step: RANGES[state.gas].U2[2] };
    slider.range(0, curve.max, curve.step);
    slider.set(0);
  }

  function draw() {
    if (!curve) return;
    const c = colors();
    const k = Math.round(slider.value / curve.step);
    const x = curve.U2s.slice(0, k + 1), y = curve.I.slice(0, k + 1);
    const yMax = Math.max(...curve.I) * 1.1 || 1;
    const data = [
      { x: curve.U2s, y: curve.I, mode: 'lines', line: { color: c.grid, width: 2 }, hoverinfo: 'skip', showlegend: false },
      { x, y, mode: 'lines', line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>', showlegend: false },
      { x: [x[x.length - 1]], y: [y[y.length - 1]], mode: 'markers', marker: { size: 11, color: c.c2 }, hoverinfo: 'skip', showlegend: false },
    ];
    Plotly.react(plot, data, baseLayout({
      showlegend: false,
      xaxis: { title: { text: t('axis.U2') }, range: [0, curve.max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, yMax], fixedrange: true },
    }), plotConfig);
    readout.innerHTML = t('run.readout', { U2: num(slider.value, 1), IA: num(y[y.length - 1], 2) });
    renderMath(readout);
    const p = curve.p;
    fixed.replaceChildren(...[['U₁', p.U1], ['U₃', p.U3]].map(([name, v]) => {
      const s = document.createElement('span');
      s.textContent = t('run.fixed', { name, v: num(v, 1) });
      return s;
    }));
  }

  function label() { play.textContent = t(playing ? 'ctl.pause' : 'ctl.play'); }
  function stop() { playing = false; if (raf) cancelAnimationFrame(raf); raf = 0; label(); }
  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    const next = slider.value + (curve.max / SWEEP_SECONDS) * dt;
    if (next >= curve.max) { slider.set(curve.max); draw(); stop(); return; }
    slider.set(next);
    if (ts - lastDraw > 50) { lastDraw = ts; draw(); } // Plotly redraw at most 20 times per second
  }
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    if (slider.value >= curve.max) slider.set(0);
    playing = true; last = performance.now(); label(); raf = requestAnimationFrame(tick);
  });

  subscribe((keys) => { if (keys.includes('gas')) { stop(); compute(); draw(); } });
  document.addEventListener('langchange', () => { label(); draw(); });
  document.addEventListener('themechange', draw);
  compute();
  label();
  draw();
}
```

In `js/main.js` add `import { initSweep } from './sweep.js';` and `initSweep();`.

- [ ] **Step 2: Check in a real browser**

Run `./scripts/test.sh` (PASS, no new tests) and:

```bash
python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 6 --w 1200 --h 900 --eval "(async()=>{const q=id=>document.getElementById(id); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const out={}; out.start=q('run-readout').textContent.slice(0,40); q('run-play').click(); await sleep(3000); out.after3s=q('run-U2').value; await sleep(8500); out.end=q('run-U2').value; out.label=q('run-play').textContent; out.chips=q('run-fixed').textContent; q('run-U2').value=20; q('run-U2').dispatchEvent(new Event('input',{bubbles:true})); out.manual=q('run-readout').textContent.slice(0,40); const g=q('global-gas'); g.value='ne'; g.dispatchEvent(new Event('input',{bubbles:true})); await sleep(500); out.neMax=q('run-U2').max; out.neValue=q('run-U2').value; return JSON.stringify(out)})()"
```

Expected: `after3s` ≈ 13 (45 V over 10 s), `end` = `45`, label `Play`, chips mention `U₁ = 1.0 V (constant)` and `U₃ = 1.5 V (constant)`, a manual value shows `U₂ = 20.0 V`, after switching to Ne `neMax` = `90` and `neValue` = `0`. Take a screenshot of section 4 mid-sweep and Read it: the solid curve grows up to the marker, the rest is faint.

- [ ] **Step 3: Commit**

```bash
git add js/sweep.js js/main.js
git commit -m "feat: section 4 - progressive sweep of U2" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Sections 5–6 — no gas: animation, plot, ideal vs real (`nogas.js`)

**Files:**
- Create: `js/nogas.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `state`, `subscribe`; `noGasCurrent`, `idealNoGasCurrent`, `noGasPath`, `positionAlong` (`analytic.js`); `modelParams`, `u2Grid`, `applyRanges` (`params.js`); `RANGES`, `DEFAULTS`, `GAS`; `makeSlider`; `fitCanvas`, `drawScene`, `energyColor`, `initWalkers`, `stepWalkers`, `makeAnimator` (`gapcanvas.js`); plot helpers; global `Plotly`.
- Produces: `initNoGas()`.

- [ ] **Step 1: Implement**

`js/nogas.js`:

```js
import { state, subscribe } from './store.js';
import { noGasCurrent, idealNoGasCurrent, noGasPath, positionAlong } from './analytic.js';
import { u2Grid } from './params.js';
import { RANGES, DEFAULTS, GAS } from './physics.js';
import { makeSlider } from './controls.js';
import { fitCanvas, drawScene, energyColor, initWalkers, stepWalkers, makeAnimator } from './gapcanvas.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num } from './i18n.js';

const ZONE = 0.3;

export function initNoGas() {
  const plot = document.getElementById('nogas-plot');
  const canvas = document.getElementById('nogas-canvas');
  const cmpPlot = document.getElementById('cmp-plot');
  let walkers = [], passes = true, finalE = 0;

  const u2 = makeSlider('nogas-U2', (v) => `${num(v, 1)} V`, () => { rebuild(); drawPlot(); });
  const u3 = makeSlider('cmp-U3', (v) => `${num(v, 1)} V`, () => drawCmp());

  function U1() { return DEFAULTS[state.gas].U1; }
  function U3() { return DEFAULTS[state.gas].U3; }

  function rebuild() {
    const path = noGasPath(U1(), u2.value, U3(), ZONE);
    passes = path.passes;
    finalE = U1() + u2.value - U3();
    walkers = initWalkers(Array.from({ length: 18 }, () => path.pts));
    anim.redraw();
  }

  function drawCanvas() {
    const { ctx, w, h } = fitCanvas(canvas);
    const dE = GAS[state.gas].dE;
    drawScene(ctx, w, h, {
      xMax: 1 + ZONE, lanes: 18,
      zones: [{ x0: 1, x1: 1 + ZONE, fill: 'rgba(200,80,80,0.15)' }],
      marks: [{ x: 0, label: t('nogas.legend.G1') }, { x: 1, label: t('nogas.legend.G2') }, { x: 1 + ZONE, label: t('nogas.legend.A') }],
      dots: walkers.map((wk) => { const p = positionAlong(wk.pts, wk.u); return { x: p.x, lane: wk.lane, color: energyColor(p.E, dE) }; }),
      footer: passes ? t('nogas.passes', { E: num(finalE, 1) }) : t('nogas.blocked'),
    });
  }
  const anim = makeAnimator({ canvas, toggle: document.getElementById('nogas-toggle'), step: (dt) => stepWalkers(walkers, dt), draw: drawCanvas });

  function drawPlot() {
    const c = colors();
    const U2s = u2Grid(state.gas);
    const I = U2s.map((v) => noGasCurrent(U1(), v, U3()));
    const here = noGasCurrent(U1(), u2.value, U3());
    Plotly.react(plot, [
      { x: U2s, y: I, mode: 'lines', line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>', showlegend: false },
      { x: [u2.value], y: [here], mode: 'markers', marker: { size: 11, color: c.c2 }, hoverinfo: 'skip', showlegend: false },
    ], baseLayout({
      showlegend: false,
      xaxis: { title: { text: t('axis.U2') }, range: [0, RANGES[state.gas].U2[1]], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, 1.02], fixedrange: true },
    }), plotConfig);
  }

  function drawCmp() {
    const c = colors();
    const p = { U1: U1(), U3: u3.value };
    const max = RANGES[state.gas].U2[1];
    const fine = Array.from({ length: 901 }, (_, i) => (i / 900) * max);
    Plotly.react(cmpPlot, [
      { x: fine, y: fine.map((v) => idealNoGasCurrent(p.U1, v, p.U3)), mode: 'lines', name: t('cmp.legend.ideal'), line: { color: c.muted, width: 2, dash: 'dash' } },
      { x: fine, y: fine.map((v) => noGasCurrent(p.U1, v, p.U3)), mode: 'lines', name: t('cmp.legend.real'), line: { color: c.c1, width: 3 } },
    ], baseLayout({
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, 1.05], fixedrange: true },
    }), plotConfig);
  }

  function onGas() {
    const r = RANGES[state.gas];
    u2.range(r.U2[0], r.U2[1], r.U2[2]);
    u2.set(Math.min(5, r.U2[1]));
    u3.range(r.U3[0], r.U3[1], r.U3[2]);
    u3.set(DEFAULTS[state.gas].U3);
    rebuild(); drawPlot(); drawCmp();
  }

  subscribe((keys) => { if (keys.includes('gas')) onGas(); });
  document.addEventListener('langchange', () => { u2.refresh(); u3.refresh(); drawPlot(); drawCmp(); });
  document.addEventListener('themechange', () => { drawPlot(); drawCmp(); });
  onGas();
}
```

In `js/main.js` add `import { initNoGas } from './nogas.js';` and `initNoGas();`.

- [ ] **Step 2: Check in a real browser**

Run `./scripts/test.sh` (PASS). Then:

```bash
python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 6 --w 1200 --h 900 --eval "(async()=>{const q=id=>document.getElementById(id); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const set=(id,v)=>{q(id).value=v;q(id).dispatchEvent(new Event('input',{bubbles:true}))}; const out={}; q('nogas-canvas').scrollIntoView({behavior:'instant',block:'center'}); await sleep(600); set('nogas-U2',0.2); await sleep(300); out.blockedPlotted=q('nogas-plot').data[0].y[1]; set('nogas-U2',12); await sleep(300); out.passes=true; const g=q('global-gas'); g.value='ne'; g.dispatchEvent(new Event('input',{bubbles:true})); await sleep(600); out.neMax=q('nogas-U2').max; out.cmpMax=q('cmp-U3').max; out.cmpVal=q('cmp-U3').value; return JSON.stringify(out)})()" --shot /tmp/s5.png
```

Expected: `blockedPlotted` is `0` (no current at U₂ = 0.25 V), Ne gives `neMax` `90`, `cmpMax` `15`, `cmpVal` `7`. Read `/tmp/s5.png` (canvas in view): dots coloured blue→red moving across the gap into the shaded decelerating zone, G₁/G₂/A labels, footer text. Then take two further screenshots (U₂ = 0.2 → electrons turn back; section 6 plot) and Read them: section 6 shows a dashed step and a solid smooth rise.

- [ ] **Step 3: Commit**

```bash
git add js/nogas.js js/main.js
git commit -m "feat: sections 5-6 - current without gas with electron animation and ideal vs real" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Section 7 — current with gas and energy along the gap (`withgas.js`)

**Files:**
- Create: `js/withgas.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `realCurve`, `realCurrent`, `idealCurrent`, `idealSawtooth`, `expectedEnergyProfile`, `thresholds` (`analytic.js`); `modelParams`, `u2Grid`, `applyRanges`, `densityText` (`params.js`); `GAS`; `state`, `subscribe`; `makeSlider`; plot helpers; `t`, `num`, `renderMath`.
- Produces: `initWithGas()`.

- [ ] **Step 1: Implement**

`js/withgas.js`:

```js
import { state, subscribe } from './store.js';
import { realCurve, realCurrent, idealCurrent, idealSawtooth, expectedEnergyProfile, thresholds } from './analytic.js';
import { modelParams, u2Grid, applyRanges, densityText } from './params.js';
import { RANGES, GAS } from './physics.js';
import { makeSlider } from './controls.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

export function initWithGas() {
  const plot = document.getElementById('gas-plot');
  const eplot = document.getElementById('gas-energy-plot');
  const readout = document.getElementById('gas-readout');
  const ideal = document.getElementById('gas-ideal');
  const label = document.getElementById('gas-density-label');
  const sl = {
    U1: makeSlider('gas-U1', (v) => `${num(v, 1)} V`, draw),
    U2: makeSlider('gas-U2', (v) => `${num(v, 1)} V`, draw),
    U3: makeSlider('gas-U3', (v) => `${num(v, 1)} V`, draw),
    density: makeSlider('gas-density', (v) => densityText(state.gas, v), draw),
  };
  ideal.addEventListener('input', draw);

  function params() {
    return modelParams(state.gas, { U1: sl.U1.value, U3: sl.U3.value, density: sl.density.value });
  }

  function draw() {
    const gasId = state.gas, p = params(), c = colors();
    const U2s = u2Grid(gasId), U2 = sl.U2.value;
    const max = RANGES[gasId].U2[1];
    Object.values(sl).forEach((s) => s.refresh());
    label.textContent = t(gasId === 'hg' ? 'ctl.density.hg' : 'ctl.density.ne');

    const real = realCurve(p, U2s);
    const traces = [{ x: U2s, y: real, mode: 'lines', name: t('gas.legend.real'), line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>' }];
    const fine = Array.from({ length: 721 }, (_, i) => (i / 720) * max);
    if (ideal.checked) {
      const sc = Math.max(...real) / 1; // ideal pulses drawn at the height of the real maxima for comparison
      traces.push({ x: fine, y: fine.map((v) => idealCurrent(p.U1, v, p.U3, p.dE) * sc), mode: 'lines', name: t('gas.legend.ideal'), line: { color: c.muted, width: 2, dash: 'dash' } });
    }
    const here = realCurrent({ ...p, U2 });
    traces.push({ x: [U2], y: [here], mode: 'markers', marker: { size: 11, color: c.c2 }, hoverinfo: 'skip', showlegend: false });
    Plotly.react(plot, traces, baseLayout({
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, Math.max(...real) * 1.15 || 1], fixedrange: true },
    }), plotConfig);

    // energy along the gap
    const saw = idealSawtooth(p.U1, U2, p.dE);
    const avg = expectedEnergyProfile({ ...p, U2 });
    const free = [{ x: 0, E: p.U1 }, { x: 1, E: p.U1 + U2 }];
    const yMax = Math.max(p.U1 + U2, p.dE) * 1.08 + 0.2;
    Plotly.react(eplot, [
      { x: free.map((q) => q.x), y: free.map((q) => q.E), mode: 'lines', name: t('gas.legend.free'), line: { color: c.grid, width: 2, dash: 'dot' } },
      { x: saw.map((q) => q.x), y: saw.map((q) => q.E), mode: 'lines', name: t('gas.legend.saw'), line: { color: c.muted, width: 2, dash: 'dash' } },
      { x: avg.x, y: avg.E, mode: 'lines', name: t('gas.legend.avg'), line: { color: c.c1, width: 3 } },
    ], baseLayout({
      shapes: [{ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: p.dE, y1: p.dE, line: { color: c.c2, width: 1.5, dash: 'dot' } }],
      xaxis: { title: { text: t('axis.x') }, range: [0, 1], fixedrange: true },
      yaxis: { title: { text: t('axis.E') }, range: [0, yMax], fixedrange: true },
    }), plotConfig);

    const m = thresholds(p.U1, U2, p.dE).length;
    readout.innerHTML = t('gas.readout', {
      U2: num(U2, 1), IA: num(here, 2), m,
      ideal: t(idealCurrent(p.U1, U2, p.U3, p.dE) ? 'gas.ideal.on' : 'gas.ideal.off'),
    });
    renderMath(readout);
  }

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); draw(); } });
  document.addEventListener('langchange', draw);
  document.addEventListener('themechange', draw);
  applyRanges(state.gas, sl);
  draw();
}
```

In `js/main.js` add `import { initWithGas } from './withgas.js';` and `initWithGas();`.

- [ ] **Step 2: Check in a real browser**

Run `./scripts/test.sh` (PASS). Then:

```bash
python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 6 --w 1200 --h 900 --eval "(async()=>{const q=id=>document.getElementById(id); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const set=(id,v)=>{q(id).value=v;q(id).dispatchEvent(new Event('input',{bubbles:true}))}; const out={}; set('gas-U2',12); await sleep(300); out.readout=q('gas-readout').textContent.slice(0,90); out.sawEnd=q('gas-energy-plot').data[1].y.slice(-1)[0]; set('gas-U2',10); await sleep(300); out.ideal10=q('gas-readout').textContent.includes('no current'); const g=q('global-gas'); g.value='ne'; g.dispatchEvent(new Event('input',{bubbles:true})); await sleep(600); out.neU2=q('gas-U2').value; out.neMax=q('gas-U2').max; out.neU1max=q('gas-U1').max; out.label=q('gas-density-label').textContent; return JSON.stringify(out)})()" --shot /tmp/s7.png --clip 250,0,820,100
```

Expected: at `U2 = 12` the sawtooth ends at `3.2` and the readout says `current flows` with 2 collisions; at `U2 = 10` it says `no current`; Ne resets `U2` to `50`, maxima `90`/`18`, label `Ne pressure`. Scroll section 7 into view with a viewport screenshot (`--eval "document.getElementById('gas').scrollIntoView({behavior:'instant'});'ok'" --shot /tmp/s7.png`) and Read it: the real curve with rectangular ideal pulses dashed, the marker, and below the sawtooth (dashed grey), the smooth average (blue), the dotted ΔE line.

- [ ] **Step 3: Commit**

```bash
git add js/withgas.js js/main.js
git commit -m "feat: section 7 - current with gas and energy along the gap" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Section 8 — why several peaks (`peaks.js`)

**Files:**
- Create: `js/peaks.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `thresholds`, `idealSawtooth`, `realCurve` (`analytic.js`); `findExtrema`, `spacings`, `mean`, `EXTREMA_OPTIONS` (`analysis.js`); `modelParams`, `u2Grid`, `applyRanges`; `GAS`, `RANGES`; plot helpers; `makeSlider`; `t`, `num`, `renderMath`.
- Produces: `initPeaks()`.

- [ ] **Step 1: Implement**

`js/peaks.js`:

```js
import { state, subscribe } from './store.js';
import { thresholds, idealSawtooth, realCurve } from './analytic.js';
import { findExtrema, spacings, mean, EXTREMA_OPTIONS } from './analysis.js';
import { modelParams, u2Grid, applyRanges } from './params.js';
import { RANGES, GAS } from './physics.js';
import { makeSlider } from './controls.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

export function initPeaks() {
  const plot = document.getElementById('peaks-plot');
  const cplot = document.getElementById('peaks-curve-plot');
  const zones = document.getElementById('peaks-zones');
  const result = document.getElementById('peaks-result');
  const tbody = document.getElementById('peaks-table').querySelector('tbody');
  const sl = {
    U1: makeSlider('peaks-U1', (v) => `${num(v, 1)} V`, draw),
    U2: makeSlider('peaks-U2', (v) => `${num(v, 1)} V`, draw),
  };

  function draw() {
    const gasId = state.gas, c = colors();
    const p = modelParams(gasId, { U1: sl.U1.value });
    const U2 = sl.U2.value, dE = p.dE;
    Object.values(sl).forEach((s) => s.refresh());

    // energy along the gap: linear rise without collisions, ideal sawtooth, thresholds
    const xs = thresholds(p.U1, U2, dE);
    const saw = idealSawtooth(p.U1, U2, dE);
    const yMax = Math.max(p.U1 + U2, dE) * 1.08 + 0.2;
    Plotly.react(plot, [
      { x: [0, 1], y: [p.U1, p.U1 + U2], mode: 'lines', name: t('peaks.legend.free'), line: { color: c.grid, width: 2, dash: 'dot' } },
      { x: saw.map((q) => q.x), y: saw.map((q) => q.E), mode: 'lines', name: t('peaks.legend.saw'), line: { color: c.c1, width: 3 } },
      { x: xs, y: xs.map(() => dE), mode: 'markers+text', name: t('peaks.legend.thr'), text: xs.map((_, i) => String(i + 1)), textposition: 'top center', marker: { size: 9, color: c.c2 } },
    ], baseLayout({
      xaxis: { title: { text: t('axis.x') }, range: [0, 1], fixedrange: true },
      yaxis: { title: { text: t('axis.E') }, range: [0, yMax], fixedrange: true },
    }), plotConfig);
    zones.innerHTML = t('peaks.zones', { n: xs.length });
    renderMath(zones);

    // real curve with the predicted peak positions U2 = n dE - U1
    const U2s = u2Grid(gasId), max = RANGES[gasId].U2[1];
    const I = realCurve(p, U2s);
    const pred = [];
    for (let n = 1; n * dE - p.U1 <= max; n++) pred.push(n * dE - p.U1);
    const e = findExtrema(U2s, I, EXTREMA_OPTIONS[gasId]);
    Plotly.react(cplot, [
      { x: U2s, y: I, mode: 'lines', name: t('peaks.legend.curve'), line: { color: c.c1, width: 3 } },
      { x: [U2], y: [I[Math.round(U2 / RANGES[gasId].U2[2])]], mode: 'markers', marker: { size: 11, color: c.c2 }, showlegend: false, hoverinfo: 'skip' },
      { x: [null], y: [null], mode: 'lines', name: t('peaks.legend.pred'), line: { color: c.muted, width: 1.5, dash: 'dot' } },
    ], baseLayout({
      shapes: pred.map((x) => ({ type: 'line', xref: 'x', yref: 'paper', x0: x, x1: x, y0: 0, y1: 1, line: { color: c.muted, width: 1.5, dash: 'dot' } })),
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, Math.max(...I) * 1.15 || 1], fixedrange: true },
    }), plotConfig);

    // table of the peaks of the real curve and their spacing
    const list = e.maxima, sp = spacings(list);
    tbody.replaceChildren(...list.map((m, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${num(m.x, 2)}</td><td>${i ? num(sp[i - 1], 2) : '–'}</td>`;
      return tr;
    }));
    result.innerHTML = sp.length
      ? t('peaks.result', { d: num(mean(sp), 2), model: num(dE, 1) })
      : t('peaks.none');
    renderMath(result);
  }

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); draw(); } });
  document.addEventListener('langchange', draw);
  document.addEventListener('themechange', draw);
  applyRanges(state.gas, sl);
  draw();
}
```

In `js/main.js` add `import { initPeaks } from './peaks.js';` and `initPeaks();`.

- [ ] **Step 2: Check in a real browser**

Run `./scripts/test.sh` (PASS). Then:

```bash
python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 6 --w 1200 --h 900 --eval "(async()=>{const q=id=>document.getElementById(id); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const set=(id,v)=>{q(id).value=v;q(id).dispatchEvent(new Event('input',{bubbles:true}))}; const out={}; out.zones20=q('peaks-zones').textContent; set('peaks-U2',30); await sleep(300); out.zones30=q('peaks-zones').textContent; const rows=()=>[...document.querySelectorAll('#peaks-table tbody tr')].map(r=>r.children[1].textContent+'/'+r.children[2].textContent).join(' '); set('peaks-U1',0.5); await sleep(300); out.rowsU1_05=rows(); set('peaks-U1',2.5); await sleep(300); out.rowsU1_25=rows(); out.result=q('peaks-result').textContent.slice(0,60); return JSON.stringify(out,null,1)})()"
```

Expected: `zones20` reports 4 thresholds (U₂ = 20 V, thresholds at 3.9/20, 8.8/20, 13.7/20, 18.6/20), `zones30` 6; the table rows for `U1 = 0.5` and `U1 = 2.5` have the first positions about 2 V apart (the second value smaller) and spacings 4.75–5.0. Take a viewport screenshot of section 8 and Read it: the capacitor sketch, the linear dotted energy line, the blue sawtooth with numbered thresholds, and the real curve with dotted vertical lines at the predicted peak positions.

- [ ] **Step 3: Commit**

```bash
git add js/peaks.js js/main.js
git commit -m "feat: section 8 - linear potential, thresholds and the peak spacing" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Sections 9–10 — glowing stripes and why the minima do not reach zero

**Files:**
- Create: `js/glow.js`, `js/minima.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `excitationDensity`, `quantileElectrons`, `positionAlong`, `thresholds`, `missedFraction`, `realCurve` (`analytic.js`); `modelParams`, `u2Grid`, `applyRanges`, `densityText`; `GAS`, `RANGES`; `fitCanvas`, `drawScene`, `energyColor`, `initWalkers`, `stepWalkers`, `makeAnimator`; plot helpers; `makeSlider`; `t`, `num`, `renderMath`.
- Produces: `initGlow()`, `initMinima()`.

- [ ] **Step 1: Implement**

`js/glow.js`:

```js
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
```

`js/minima.js`:

```js
import { state, subscribe } from './store.js';
import { quantileElectrons, positionAlong, thresholds, missedFraction, realCurve } from './analytic.js';
import { modelParams, u2Grid, applyRanges, densityText } from './params.js';
import { GAS, RANGES } from './physics.js';
import { makeSlider } from './controls.js';
import { fitCanvas, drawScene, energyColor, initWalkers, stepWalkers, makeAnimator } from './gapcanvas.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';
import { t, num, renderMath } from './i18n.js';

export function initMinima() {
  const canvas = document.getElementById('minima-canvas');
  const fill = document.getElementById('minima-bar-fill');
  const text = document.getElementById('minima-bartext');
  const plot = document.getElementById('minima-plot');
  const label = document.getElementById('minima-density-label');
  let walkers = [], missed = [], marks = [];
  const sl = {
    U2: makeSlider('minima-U2', (v) => `${num(v, 1)} V`, rebuild),
    density: makeSlider('minima-density', (v) => densityText(state.gas, v), rebuild),
  };

  function rebuild() {
    const p = { ...modelParams(state.gas, { density: sl.density.value }), U2: sl.U2.value };
    const els = quantileElectrons(p, 24);
    const m = thresholds(p.U1, p.U2, p.dE).length;
    missed = els.map((e) => e.events.length < m);
    walkers = initWalkers(els.map((e) => e.pts));
    marks = thresholds(p.U1, p.U2, p.dE).map((x, i) => ({ x, label: String(i + 1), dashed: true }));
    Object.values(sl).forEach((s) => s.refresh());
    label.textContent = t(state.gas === 'hg' ? 'ctl.density.hg' : 'ctl.density.ne');
    const frac = missedFraction(p.U1, p.U2, p.dE, p.lambda);
    fill.style.width = `${(frac * 100).toFixed(1)}%`;
    text.innerHTML = t('minima.bar', { pct: num(frac * 100, 0) });
    renderMath(text);
    drawPlot(p);
    anim.redraw();
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    const dE = GAS[state.gas].dE;
    drawScene(ctx, w, h, {
      lanes: 24, marks,
      dots: walkers.map((wk, i) => { const q = positionAlong(wk.pts, wk.u); return { x: q.x, lane: wk.lane, color: energyColor(q.E, dE), ring: missed[i] ? colors().c2 : null }; }),
      footer: t('minima.footer'),
    });
  }
  const anim = makeAnimator({ canvas, toggle: document.getElementById('minima-toggle'), step: (dt) => stepWalkers(walkers, dt), draw });

  function drawPlot(p) {
    const c = colors(), gasId = state.gas;
    const [lo, hi] = RANGES[gasId].density;
    const U2s = u2Grid(gasId), max = RANGES[gasId].U2[1];
    const mk = (density) => realCurve(modelParams(gasId, { density }), U2s);
    const chosen = sl.density.value;
    // low density = long mean free path = shallow minima; for Hg the density rises with the temperature
    const entries = [[lo, c.muted, 'dash'], [chosen, c.c1, 'solid'], [hi, c.c2, 'dash']];
    const Imax = [];
    const traces = entries.map(([d, color, dash]) => {
      const I = mk(d); Imax.push(Math.max(...I));
      return { x: U2s, y: I, mode: 'lines', name: densityText(gasId, d), line: { color, width: d === chosen ? 3 : 2, dash } };
    });
    Plotly.react(plot, traces, baseLayout({
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: p.U2, x1: p.U2, y0: 0, y1: 1, line: { color: c.fg, width: 1, dash: 'dot' } }],
      xaxis: { title: { text: t('axis.U2') }, range: [0, max], fixedrange: true },
      yaxis: { title: { text: t('axis.IA') }, range: [0, Math.max(...Imax) * 1.12], fixedrange: true },
    }), plotConfig);
  }

  subscribe((keys) => { if (keys.includes('gas')) { applyRanges(state.gas, sl); rebuild(); } });
  document.addEventListener('langchange', rebuild);
  document.addEventListener('themechange', rebuild);
  applyRanges(state.gas, sl);
  rebuild();
}
```

In `js/main.js` add `import { initGlow } from './glow.js';`, `import { initMinima } from './minima.js';` and call `initGlow(); initMinima();`.

- [ ] **Step 2: Check in a real browser**

Run `./scripts/test.sh` (PASS). Then:

```bash
python3 scripts/cdp.py "http://localhost:8000/index.html?lang=en" --wait 6 --w 1200 --h 900 --eval "(async()=>{const q=id=>document.getElementById(id); const sleep=ms=>new Promise(r=>setTimeout(r,ms)); const set=(id,v)=>{q(id).value=v;q(id).dispatchEvent(new Event('input',{bubbles:true}))}; const out={}; const pct=()=>q('minima-bartext').textContent.match(/(\d+) %/)?.[1]; set('minima-U2',20); set('minima-density',150); await sleep(400); out.pct150=pct(); set('minima-density',190); await sleep(400); out.pct190=pct(); const g=q('global-gas'); g.value='ne'; g.dispatchEvent(new Event('input',{bubbles:true})); await sleep(800); out.neDensity=q('minima-density').value; out.neLabel=q('minima-density-label').textContent; out.neGlowU2=q('glow-U2').value; return JSON.stringify(out)})()"
```

Expected: `pct150` is clearly larger than `pct190` (more electrons miss a collision at 150 °C than at 190 °C); after switching to Ne the density slider resets to `10`, the label reads `Ne pressure` and the glow `U₂` to `50`. Take viewport screenshots of sections 9 and 10 (Hg and, with the gas switched to Ne, section 9) and Read them: the stripes are separate bands that follow the dashed thresholds; in section 10 ringed dots, the orange bar and three curves with different minima depth.

- [ ] **Step 3: Commit**

```bash
git add js/glow.js js/minima.js js/main.js
git commit -m "feat: sections 9-10 - glowing stripes and the floor of the minima" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Smoke test, final checks, push the branch

**Files:**
- Modify: `scripts/smoke.sh`, `README.md`

**Interfaces:**
- Consumes: the whole page. `./scripts/smoke.sh` exits 0 iff the EN and DE pages render without console errors and with the expected structure (no worker is used any more, so the `?sync` flag is not needed).

- [ ] **Step 1: Update the smoke test**

In `scripts/smoke.sh` use the URL `index.html?lang=$lang` (no `&sync`), delete the comment about `?sync`/workers, and make the per-language checks exactly:

```bash
  check "[$lang] <html lang> is $lang" "grep -q '<html lang=\"$lang\"' $TMP/$lang.html"
  check "[$lang] at least eight Plotly plots rendered" "[ \$(grep -o 'js-plotly-plot' $TMP/$lang.html | wc -l) -ge 8 ]"
  check "[$lang] level ladder SVG present" "grep -q '<svg[^>]*class=\"levels\"' $TMP/$lang.html"
  check "[$lang] orbital diagram present" "grep -q '<svg[^>]*class=\"orb\"' $TMP/$lang.html"
  check "[$lang] tube scheme present" "grep -q '<svg[^>]*class=\"scheme\"' $TMP/$lang.html"
  check "[$lang] peaks table filled" "[ \$(grep -o '<tr><td>' $TMP/$lang.html | wc -l) -ge 4 ]"
  check "[$lang] KaTeX rendered" "grep -q 'class=\"katex\"' $TMP/$lang.html"
  check "[$lang] no unresolved {placeholders}" "! grep -E '>[^<]*\{(kt|bf|U2|IA|ideal|m|n|d|model|pct|v|name|E|dE|nm)\}' $TMP/$lang.html"
  check "[$lang] no console errors" "! grep -E 'CONSOLE.*(rror|Uncaught)|Failed to load resource' $TMP/$lang.log"
```

(The plots: run 1, nogas 2, gas 2, peaks 2, minima 1 = 8 Plotly plots.)

- [ ] **Step 2: Run everything**

Run:
```bash
./scripts/test.sh
./scripts/smoke.sh
```
Expected: `RESULT: PASS (…)` and every smoke line `ok`. If the Plotly count is lower than 8 under Chrome's virtual time, report it and check each plot individually with `scripts/cdp.py` before changing the threshold (do not weaken the check without evidence).

- [ ] **Step 3: Real-browser pass over the whole page**

With `./scripts/browser.sh` running, check and report each item (pass/fail):
1. EN and DE: no horizontal overflow at 390 px (`document.documentElement.scrollWidth <= innerWidth`) and at 1200 px.
2. Dark mode (`--dark`): screenshot of sections 5, 7, 9 are legible.
3. German: no `\d\.\d` in visible text outside references (same eval as in the Monte Carlo version: `document.querySelectorAll('main *')` leaf elements not inside `.katex-mathml`, `.js-plotly-plot`, `ol.refs`, `.theory`).
4. Switching the gas to Ne and back to Hg leaves every slider inside its range (`value` between `min` and `max` for every `input[type=range]`).
5. `performance.getEntriesByType('resource')` shows no URL outside the origin.
6. Pause buttons stop the animations (`#nogas-toggle`, `#glow-toggle`, `#minima-toggle`: the label changes to `Play`).
7. `grep -rn "Math.random" js/` finds nothing.

- [ ] **Step 4: Commit and push the branch**

```bash
git add -A
git commit -m "test: smoke test for the analytic page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push origin analytic
```
(Use the same authenticated push as before; the published site is built from `main` and is not affected.)

Report to the human partner: test and smoke results, the checklist outcome, the screenshots reviewed, and the open items from the spec (calibration of `λ`, German proofreading, whether and how to publish the branch for preview).
