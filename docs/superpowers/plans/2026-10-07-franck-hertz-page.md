# Franck–Hertz (P3) Interactive Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (EN/DE) static web page that explains the Franck–Hertz experiment with a Monte Carlo electron simulator, interactive plots and clickable references.

**Architecture:** Plain ES modules, no build step, served by any static host. Pure modules (`physics`, `montecarlo`, `analysis`, `profile`, `format`, `strings`) contain all logic and are unit-tested in headless Chrome; thin UI modules (`levels`, `tube`, `curve`, `motion`, `spacing`) own their DOM and share state through a small pub-sub `store`. The Monte Carlo runs in a Web Worker.

**Tech Stack:** HTML/CSS/vanilla JS (ES modules), Plotly basic bundle 2.35.2 and KaTeX 0.16.11 (vendored locally), headless Google Chrome + a 40-line harness for tests, bash scripts, git.

**Spec:** `docs/superpowers/specs/2026-10-07-franck-hertz-page-design.md` (amended in Task 1 — read the "Amendments" section at its end first).

## Global Constraints

- Working directory for everything: the repo root `site/` (a git repo, branch `main`).
- Language: bilingual EN/DE with a toggle, default EN (or German if the browser language starts with `de`; `?lang=de|en` in the URL overrides).
- Content scope: only physics understanding. **No** safety information, **no** instrument operation (control unit, oscilloscope, XY recorder, CAL/VAR, R factor, furnace), **no** typical instrument settings, **no** uncertainty budgets/type A–B/fit-with-error-bars exercises, **no** Task 1 data set or its key, **no** dates/points/deadlines.
- No build step; libraries vendored under `vendor/` (works offline, no CDN requests at runtime).
- ES modules need http(s): the page is served (`./scripts/serve.sh`), not opened via `file://`.
- Pure modules have no DOM access at import time or in their functions.
- `localStorage` access is always wrapped in try/catch; the page must work without it.
- Layout works at phone width (390 px) with no horizontal page scroll; dark mode via `prefers-color-scheme`.
- Hg vapour pressure: `log10(p/Pa) = 10.05 − 3163/T(K)`; Hg ΔE = 4.9 eV, Ne ΔE = 19.0 eV (model constants).
- Commit messages end with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Test command (must pass before every commit that touches `js/` or `tests/`): `./scripts/test.sh`.

## Review Focus

Input classes the spec implies but a casual test list would miss (each is pinned by a test in the named task):

1. A curve with **no structure** (all zeros, e.g. `U3` larger than any reachable energy, or fewer than 3 points) must give no extrema and no `NaN` — Task 3.
2. The idealised tube profile must **terminate** for `U2 = 0`, for `U1 ≥ ΔE` and with the gas off — Task 5.
3. **Every `data-i18n` key** used in `index.html` exists in both languages, both languages use the same `{placeholders}`, and no string is empty — Task 6/7.
4. The page must make **no remote requests** (no `http(s)` `src`/`href` on scripts and stylesheets) — Task 7.
5. **Unknown gas** and **Ne with any Hg temperature** must not crash or change Ne results — Task 2.

---

## File Structure

```
site/
  index.html                 page skeleton, all section markup
  README.md                  how to run, test, vendor
  .gitignore
  css/style.css              layout, theming (CSS variables, dark mode)
  js/
    physics.js               constants, GAS/TUBE/LEVELS, vapour pressure, λ(T), Boltzmann   [pure]
    montecarlo.js            RNG, transmission(), simulate(), traceElectrons()               [pure]
    analysis.js              findExtrema(), spacings(), mean(), EXTREMA_OPTIONS              [pure]
    profile.js               idealProfile() for the tube section                             [pure]
    format.js                formatSci()                                                     [pure]
    strings.js               merges js/strings/*.js into STRINGS {en,de}                     [pure]
    strings/{common,idea,tube,curve,delta,refs}.js   texts, EN + DE
    i18n.js                  t(), setLang(), applyI18n(), renderMath()
    dom.js                   svgEl() helper
    plotstyle.js             colors(), baseLayout(), plotConfig for Plotly
    store.js                 shared state + subscribe/update, simParams()
    compute.js               computeCurve(params) -> Promise (Web Worker, sync fallback)
    worker.js                module worker running simulate()
    levels.js                section 1: level ladder + thermal slider
    tube.js                  section 2: potential-energy profile
    curve.js                 section 3: Monte Carlo curve plot + controls
    motion.js                section 3: canvas animation of electrons / glow layers
    spacing.js               section 4: spacings table + plots
    main.js                  boot: language, module init
  vendor/                    plotly-basic, katex (downloaded by scripts/vendor.sh, committed)
  scripts/{vendor,test,smoke,serve}.sh
  tests/{harness.js,index.html,*.test.js}
  docs/superpowers/{specs,plans}/
```

---

### Task 1: Repository scaffold, test harness, vendored libraries

**Files:**
- Create: `.gitignore`, `README.md`, `scripts/serve.sh`, `scripts/test.sh`, `scripts/vendor.sh`, `tests/harness.js`, `tests/index.html`
- Modify: `docs/superpowers/specs/2026-10-07-franck-hertz-page-design.md` (append amendments)

**Interfaces:**
- Produces: `tests/harness.js` exports `test(name, fn)`, `assert.{ok,equal,close,between}`, `run()`. Test files are ES modules in `tests/*.test.js` that `import { test, assert } from './harness.js'` and are listed in `tests/index.html`. `./scripts/test.sh` exits 0 iff all tests pass.

- [ ] **Step 1: Write the harness**

`tests/harness.js`:

```js
// Minimal zero-dependency test harness for the browser (headless Chrome).
const results = [];
const queue = [];

export function test(name, fn) { queue.push({ name, fn }); }

export const assert = {
  ok(v, msg = 'expected truthy') { if (!v) throw new Error(msg); },
  equal(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${b}, got ${a}`); },
  close(a, b, tol, msg) {
    if (!(Math.abs(a - b) <= tol)) throw new Error(msg || `expected ${b} ± ${tol}, got ${a}`);
  },
  between(v, lo, hi, msg) {
    if (!(v >= lo && v <= hi)) throw new Error(msg || `expected ${lo} ≤ ${v} ≤ ${hi}`);
  },
};

export async function run() {
  for (const t of queue) {
    try { await t.fn(); results.push({ name: t.name, ok: true }); }
    catch (e) { results.push({ name: t.name, ok: false, err: String(e.message || e) }); }
  }
  const failed = results.filter((r) => !r.ok);
  const lines = results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + r.err));
  lines.push(failed.length ? `RESULT: FAIL (${failed.length}/${results.length})` : `RESULT: PASS (${results.length})`);
  document.getElementById('out').textContent = lines.join('\n');
  document.title = failed.length ? 'FAIL' : 'PASS';
}
```

`tests/index.html` (later tasks add one `import` line each, above `await run()`):

```html
<!doctype html>
<meta charset="utf-8">
<title>running</title>
<pre id="out">running…</pre>
<script type="module">
  import { run } from './harness.js';
  await run();
</script>
```

- [ ] **Step 2: Write the scripts**

`scripts/test.sh`:

```bash
#!/usr/bin/env bash
# Run the browser test suite in headless Chrome. Exit 0 iff every test passes.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-8791}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 1
CHROME=${CHROME:-google-chrome}
OUT=$("$CHROME" --headless=new --no-sandbox --disable-gpu --virtual-time-budget=170000 \
  --dump-dom "http://localhost:$PORT/tests/index.html" 2>/dev/null | sed -n '/<pre id="out">/,/<\/pre>/p')
echo "$OUT" | sed 's/<[^>]*>//g'
echo "$OUT" | grep -q 'RESULT: PASS'
```

`scripts/serve.sh`:

```bash
#!/usr/bin/env bash
# Serve the page locally: http://localhost:8000
cd "$(dirname "$0")/.."
exec python3 -m http.server "${PORT:-8000}"
```

`scripts/vendor.sh`:

```bash
#!/usr/bin/env bash
# Download third-party libraries into vendor/ (run once; vendor/ is committed).
set -euo pipefail
cd "$(dirname "$0")/.."
PLOTLY=2.35.2
KATEX=0.16.11
CDN=https://cdn.jsdelivr.net/npm

mkdir -p vendor/plotly vendor/katex/fonts vendor/katex/contrib
curl -fsSL "$CDN/plotly.js-basic-dist-min@$PLOTLY/plotly-basic.min.js" -o vendor/plotly/plotly-basic.min.js
curl -fsSL "$CDN/katex@$KATEX/dist/katex.min.js" -o vendor/katex/katex.min.js
curl -fsSL "$CDN/katex@$KATEX/dist/katex.min.css" -o vendor/katex/katex.min.css
curl -fsSL "$CDN/katex@$KATEX/dist/contrib/auto-render.min.js" -o vendor/katex/contrib/auto-render.min.js
# Only woff2 is needed by modern browsers; drop the other formats from the CSS.
grep -o 'fonts/[A-Za-z0-9_-]*\.woff2' vendor/katex/katex.min.css | sort -u | while read -r f; do
  curl -fsSL "$CDN/katex@$KATEX/dist/$f" -o "vendor/katex/$f"
done
sed -i -E 's/,url\(fonts\/[A-Za-z0-9_-]+\.woff\) format\("woff"\)//g; s/,url\(fonts\/[A-Za-z0-9_-]+\.ttf\) format\("truetype"\)//g' vendor/katex/katex.min.css
echo "vendored plotly-basic $PLOTLY and katex $KATEX"
```

`.gitignore`:

```
*.log
.DS_Store
```

`README.md`:

````markdown
# Franck–Hertz (P3) — interactive introduction

Bilingual (EN/DE) static page that explains the Franck–Hertz experiment: level ladder,
tube and potentials, a Monte Carlo simulation of the I_A(U₂) curve, and how ΔE follows from
the spacing of the extrema. No instrument operation, safety or grading content.

## Run
```bash
./scripts/serve.sh        # http://localhost:8000  (ES modules need http, not file://)
```
Any static host works (TUWEL link, TU webspace, GitHub Pages): upload the folder as is.
`?lang=de` / `?lang=en` selects the language.

## Test
```bash
./scripts/test.sh         # unit tests in headless Chrome (needs google-chrome)
./scripts/smoke.sh        # page-level smoke test, EN and DE
```

## Vendored libraries
`./scripts/vendor.sh` downloads Plotly (basic bundle) and KaTeX into `vendor/` (already committed).

## Structure
See `docs/superpowers/plans/2026-10-07-franck-hertz-page.md` (file structure) and the spec in `docs/superpowers/specs/`.
````

- [ ] **Step 3: Make scripts executable, vendor libraries, run empty suite**

Run:
```bash
chmod +x scripts/*.sh
./scripts/vendor.sh
du -sh vendor/*
./scripts/test.sh
```
Expected: `vendored plotly-basic 2.35.2 and katex 0.16.11`; `vendor/plotly` ≈ 1.1M, `vendor/katex` ≈ 600K; test output `RESULT: PASS (0)` and exit code 0 (`echo $?` → `0`).

- [ ] **Step 4: Append the spec amendments**

Run:
```bash
cat >> docs/superpowers/specs/2026-10-07-franck-hertz-page-design.md <<'EOF'

## 9. Amendments (2026-10-07, from implementation planning)

These supersede the corresponding statements above.

- **Test runner:** no Node is installed. Tests are ES-module files run in headless Chrome by `scripts/test.sh` with a 40-line harness (`tests/harness.js`). "Node unit tests" in section 7 means these tests.
- **Extra modules:** `strings/*.js` (texts per section) + `strings.js`, `store.js` (shared state), `compute.js` (worker client with synchronous fallback), `profile.js` (idealised tube profile), `format.js`, `dom.js`, `plotstyle.js`, `motion.js` (canvas animation, split from `curve.js`).
- **Model changes (verified by prototype):**
  - Electrons passing G₂ contribute `1 − sqrt(U3/E)` if `E > U3` (isotropic scattering assumption), not a step function; a step gives flat plateaus and no real maxima.
  - Effective gap `L = 1 mm`, inelastic probability above threshold `0.3`, `σ(Hg) = 4e-19 m²`, `σ(Ne) = 1e-19 m²`. Ne: 10 hPa, 20 °C, ΔE = 19.0 eV. These are tuning constants, not fitted data.
  - Extremum detection requires a drop of ≥ 3 % of the curve range on **both** sides within a half-window (1.5 V for Hg, 5 V for Ne); this rejects the plateau start and noise.
- **Contact potential** is a simulation parameter (`contact`, default 1.0 V), controlled from section 4; the effective accelerating voltage is `U2 − contact`.
- **Vapour-pressure fit** `log10(p/Pa) = 10.05 − 3163/T(K)` was fitted by the planner to remembered table values (≈376 Pa at 150 °C, ≈2.3 kPa at 200 °C): verify against a published table before release.
EOF
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold site repo with test harness, scripts and vendored libs" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `physics.js` — constants, gas model, vapour pressure

**Files:**
- Create: `js/physics.js`, `tests/physics.test.js`
- Modify: `tests/index.html` (add import)

**Interfaces:**
- Produces (used by all later tasks):
  - `K_B`, `E_CHARGE` (numbers)
  - `GAS: { hg: {id,dE,sigma,pInel,ionization}, ne: {...} }`
  - `TUBE: { L }` (metres), `NE_FILL: { pressurePa, tempC }`
  - `hgVaporPressure(tempC) -> Pa`, `numberDensity(pPa, tempK)`, `meanFreePath(gasId, tempC) -> m` (throws on unknown gas), `thermalEnergyEV(tempK)`, `wavelengthNm(eV)`, `boltzmannFactor(dE_eV, tempK)`
  - `LEVELS: { hg: {ground, ionization, levels:[{label,e,highlight?}]}, ne: {...} }`

- [ ] **Step 1: Write the failing test**

`tests/physics.test.js`:

```js
import { test, assert } from './harness.js';
import {
  GAS, LEVELS, hgVaporPressure, meanFreePath, thermalEnergyEV, wavelengthNm, boltzmannFactor,
} from '../js/physics.js';

test('Hg vapour pressure is in the table range at 150 and 190 degC', () => {
  assert.between(hgVaporPressure(150), 300, 450);
  assert.between(hgVaporPressure(190), 1200, 2000);
});

test('Hg vapour pressure increases monotonically with T', () => {
  assert.ok(hgVaporPressure(150) < hgVaporPressure(170));
  assert.ok(hgVaporPressure(170) < hgVaporPressure(190));
});

test('mean free path shrinks as Hg temperature rises', () => {
  assert.ok(meanFreePath('hg', 190) < meanFreePath('hg', 150));
});

test('mean free path is far below 1 mm for Hg at 170 degC', () => {
  assert.between(meanFreePath('hg', 170), 1e-6, 1e-4);
});

test('Ne mean free path is independent of the Hg temperature argument', () => {
  assert.equal(meanFreePath('ne', 150), meanFreePath('ne', 190));
});

test('unknown gas throws', () => {
  let threw = false;
  try { meanFreePath('xx', 100); } catch { threw = true; }
  assert.ok(threw);
});

test('thermal energy at room temperature is about 0.025 eV', () => {
  assert.close(thermalEnergyEV(293.15), 0.0253, 0.0005);
});

test('4.887 eV corresponds to about 253.7 nm', () => {
  assert.close(wavelengthNm(4.887), 253.7, 0.5);
});

test('Boltzmann factor is tiny at room temperature and approaches 1 when kT >> dE', () => {
  assert.ok(boltzmannFactor(4.89, 295) < 1e-80);
  assert.ok(boltzmannFactor(4.89, 1e7) > 0.99);
});

test('each gas has exactly one highlighted level, close to the model dE', () => {
  for (const id of ['hg', 'ne']) {
    const hl = LEVELS[id].levels.filter((l) => l.highlight);
    assert.equal(hl.length, 1);
    assert.close(hl[0].e, GAS[id].dE, 0.1);
    assert.ok(hl[0].e < LEVELS[id].ionization);
  }
});
```

Add `import './physics.test.js';` to `tests/index.html` above `await run();`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (exit non-zero; output contains an import error, so `RESULT:` line is absent or FAIL — the `physics.js` module does not exist yet).

- [ ] **Step 3: Write the implementation**

`js/physics.js`:

```js
// Physical constants and the gas/tube model used by the simulator.
// No DOM access: everything here is a pure function or constant.

export const K_B = 1.380649e-23; // J/K
export const E_CHARGE = 1.602176634e-19; // C

// Effective model parameters (tuned for plausible curves, not fitted to data).
// dE: excitation energy (eV); sigma: effective collision cross-section (m^2);
// pInel: probability that a collision above threshold is inelastic.
export const GAS = {
  hg: { id: 'hg', dE: 4.9, sigma: 4e-19, pInel: 0.3, ionization: 10.4 },
  ne: { id: 'ne', dE: 19.0, sigma: 1e-19, pInel: 0.3, ionization: 21.6 },
};

// Effective grid spacing G1-G2 (m).
export const TUBE = { L: 1e-3 };

// Neon tube: about 10 hPa at room temperature (fixed in the model).
export const NE_FILL = { pressurePa: 1000, tempC: 20 };

// log10(p/Pa) = A - B/T(K), linear fit to tabulated Hg vapour pressures, 100-200 degC.
export function hgVaporPressure(tempC) {
  const T = tempC + 273.15;
  return Math.pow(10, 10.05 - 3163 / T);
}

export function numberDensity(pressurePa, tempK) {
  return pressurePa / (K_B * tempK);
}

// Mean free path (m) of an electron between collisions, lambda = 1/(n sigma).
export function meanFreePath(gasId, tempC) {
  const gas = GAS[gasId];
  if (!gas) throw new Error('unknown gas: ' + gasId);
  const p = gasId === 'hg' ? hgVaporPressure(tempC) : NE_FILL.pressurePa;
  const T = (gasId === 'hg' ? tempC : NE_FILL.tempC) + 273.15;
  return 1 / (numberDensity(p, T) * gas.sigma);
}

export function thermalEnergyEV(tempK) {
  return (K_B * tempK) / E_CHARGE;
}

// Photon wavelength (nm) for an energy in eV: lambda = h c / E.
export function wavelengthNm(energyEV) {
  return 1239.841984 / energyEV;
}

// exp(-dE/kT) for dE in eV.
export function boltzmannFactor(dE, tempK) {
  return Math.exp(-dE / thermalEnergyEV(tempK));
}

// Energy levels (eV above ground state) for the level ladder in section 1.
// Values rounded from NIST ASD; the highlighted level is the one excited in the experiment
// (Ne: centre of the 2p5 3p group, 18.4-19.8 eV).
export const LEVELS = {
  hg: {
    ground: '6 ¹S₀',
    ionization: 10.44,
    levels: [
      { label: '6 ³P₀', e: 4.67 },
      { label: '6 ³P₁', e: 4.89, highlight: true },
      { label: '6 ³P₂', e: 5.46 },
      { label: '6 ¹P₁', e: 6.70 },
    ],
  },
  ne: {
    ground: '2p⁶ ¹S₀',
    ionization: 21.56,
    levels: [
      { label: '2p⁵3s', e: 16.7 },
      { label: '2p⁵3p', e: 19.0, highlight: true },
    ],
  },
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/test.sh`
Expected: 10 lines `PASS …` and `RESULT: PASS (10)`.

- [ ] **Step 5: Commit**

```bash
git add js/physics.js tests/physics.test.js tests/index.html
git commit -m "feat: add physics model (gas constants, vapour pressure, mean free path)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `analysis.js` — extrema and spacings

**Files:**
- Create: `js/analysis.js`, `tests/analysis.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Produces:
  - `findExtrema(x: number[], y: number[], opts?: {halfWindow=1.5, prominence=0.04}) -> {maxima: {x,y}[], minima: {x,y}[]}`
  - `spacings(extrema: {x}[]) -> number[]` (`extrema[i].x − extrema[i−1].x`)
  - `mean(values: number[]) -> number` (`NaN` for empty)
  - `EXTREMA_OPTIONS: { hg: {halfWindow:1.5, prominence:0.03}, ne: {halfWindow:5, prominence:0.03} }`

- [ ] **Step 1: Write the failing test**

`tests/analysis.test.js`:

```js
import { test, assert } from './harness.js';
import { findExtrema, spacings, mean, EXTREMA_OPTIONS } from '../js/analysis.js';

function sine(period, n = 400, xmax = 40) {
  const x = [], y = [];
  for (let i = 0; i < n; i++) { const v = (i * xmax) / (n - 1); x.push(v); y.push(Math.sin((2 * Math.PI * v) / period)); }
  return { x, y };
}

test('finds maxima and minima of a sine with the right spacing', () => {
  const { x, y } = sine(5);
  const { maxima, minima } = findExtrema(x, y, { halfWindow: 1.5, prominence: 0.1 });
  assert.ok(maxima.length >= 6, 'maxima: ' + maxima.length);
  assert.close(mean(spacings(maxima)), 5, 0.1);
  assert.close(mean(spacings(minima)), 5, 0.1);
});

test('a monotonic rise followed by a plateau has no extrema', () => {
  const x = [], y = [];
  for (let i = 0; i < 200; i++) { x.push(i * 0.1); y.push(Math.min(i * 0.1, 5) / 5); }
  const { maxima, minima } = findExtrema(x, y);
  assert.equal(maxima.length, 0);
  assert.equal(minima.length, 0);
});

test('tiny noise on a plateau gives no extrema', () => {
  const x = [], y = [];
  for (let i = 0; i < 200; i++) { x.push(i * 0.1); y.push(Math.min(i * 0.1, 5) / 5 + 0.001 * Math.sin(7 * i)); }
  const r = findExtrema(x, y);
  assert.equal(r.maxima.length, 0);
  assert.equal(r.minima.length, 0);
});

test('an all-zero curve gives no extrema and no NaN', () => {
  const x = [], y = [];
  for (let i = 0; i < 100; i++) { x.push(i * 0.25); y.push(0); }
  const r = findExtrema(x, y);
  assert.equal(r.maxima.length, 0);
  assert.equal(r.minima.length, 0);
});

test('fewer than 3 points gives no extrema', () => {
  const r = findExtrema([0, 1], [0, 1]);
  assert.equal(r.maxima.length, 0);
  assert.equal(r.minima.length, 0);
  const e = findExtrema([], []);
  assert.equal(e.maxima.length, 0);
});

test('spacings of an empty or single list is empty', () => {
  assert.equal(spacings([]).length, 0);
  assert.equal(spacings([{ x: 1, y: 0 }]).length, 0);
});

test('mean of an empty list is NaN', () => {
  assert.ok(Number.isNaN(mean([])));
});

test('EXTREMA_OPTIONS defines both gases', () => {
  assert.ok(EXTREMA_OPTIONS.hg.halfWindow > 0);
  assert.ok(EXTREMA_OPTIONS.ne.halfWindow > EXTREMA_OPTIONS.hg.halfWindow);
});
```

Add `import './analysis.test.js';` to `tests/index.html`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (module `../js/analysis.js` missing).

- [ ] **Step 3: Write the implementation**

`js/analysis.js`:

```js
// Extrema detection and spacings on a (uniformly sampled) curve. Pure module.

// Per-gas detection settings for the simulated curves (half-window in volts).
export const EXTREMA_OPTIONS = {
  hg: { halfWindow: 1.5, prominence: 0.03 },
  ne: { halfWindow: 5, prominence: 0.03 },
};

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
      maxima.push({ x: x[i], y: y[i] });
    }
    if (isMin && leftMax - y[i] >= minDrop && rightMax - y[i] >= minDrop) {
      minima.push({ x: x[i], y: y[i] });
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/test.sh`
Expected: all tests pass, `RESULT: PASS (18)`.

- [ ] **Step 5: Commit**

```bash
git add js/analysis.js tests/analysis.test.js tests/index.html
git commit -m "feat: add extrema detection and spacing analysis" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `montecarlo.js` — electron transport simulation

**Files:**
- Create: `js/montecarlo.js`, `tests/montecarlo.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: `GAS`, `TUBE`, `meanFreePath` from `physics.js`; `findExtrema`, `spacings`, `mean` from `analysis.js` (tests only).
- Produces:
  - `mulberry32(seed) -> () => number in [0,1)`
  - `transmission(E, U3) -> number` (`0` if `E ≤ U3`, else `1 − sqrt(U3/E)`)
  - `withDefaults(params)`; params: `{gas:'hg'|'ne', tempC=170, U3=1.5, spread=0.3, contact=1.0, U2min=0, U2max=45, U2step=0.25, electrons=3000, seed=1, noGas=false}`
  - `simulate(params) -> {U2: number[], IA: number[]}` (`IA` relative units, 0–1)
  - `traceElectrons(params, U2, count=40, excitationSample=2000) -> {tracks: {pts: [x,E][], reached: boolean}[], excitations: number[]}` where `x ∈ [0,1]` is the position across the G₁–G₂ gap and `E` the kinetic energy in eV.

- [ ] **Step 1: Write the failing test**

`tests/montecarlo.test.js`:

```js
import { test, assert } from './harness.js';
import { simulate, traceElectrons, mulberry32, transmission } from '../js/montecarlo.js';
import { findExtrema, spacings, mean } from '../js/analysis.js';

const fast = { U2step: 0.25, electrons: 2000, seed: 1 };

test('seeded RNG is reproducible', () => {
  const a = mulberry32(5), b = mulberry32(5);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('simulate is reproducible for equal params', () => {
  const r1 = simulate({ gas: 'hg', tempC: 170, U2max: 10, ...fast });
  const r2 = simulate({ gas: 'hg', tempC: 170, U2max: 10, ...fast });
  assert.equal(JSON.stringify(r1.IA), JSON.stringify(r2.IA));
});

test('no-gas curve rises monotonically (no dips)', () => {
  const { IA } = simulate({ gas: 'hg', noGas: true, U2max: 45, ...fast });
  for (let i = 1; i < IA.length; i++) assert.ok(IA[i] >= IA[i - 1] - 1e-9, 'dip at index ' + i);
  assert.ok(IA[IA.length - 1] > 0.75);
});

test('transmission is 0 below U3 and tends to 1 for large E', () => {
  assert.equal(transmission(1, 1.5), 0);
  assert.close(transmission(1e6, 1.5), 1, 1e-2);
  assert.ok(transmission(10, 1.5) < transmission(20, 1.5));
});

test('Hg 170 degC: maxima spacing is close to 4.9 V', () => {
  const { U2, IA } = simulate({ gas: 'hg', tempC: 170, U2max: 45, ...fast });
  const { maxima, minima } = findExtrema(U2, IA);
  assert.ok(maxima.length >= 5, 'maxima count ' + maxima.length);
  assert.between(mean(spacings(maxima)), 4.6, 5.2);
  assert.between(mean(spacings(minima)), 4.6, 5.2);
});

test('Hg: first maximum sits near dE + contact', () => {
  const { U2, IA } = simulate({ gas: 'hg', tempC: 170, U3: 1.5, contact: 1.0, U2max: 45, ...fast });
  const { maxima } = findExtrema(U2, IA);
  assert.between(maxima[0].x, 4.5, 7.0);
});

test('contact potential shifts positions but not spacings', () => {
  const a = simulate({ gas: 'hg', contact: 0.5, U2max: 45, ...fast });
  const b = simulate({ gas: 'hg', contact: 2.5, U2max: 45, ...fast });
  const ea = findExtrema(a.U2, a.IA).maxima, eb = findExtrema(b.U2, b.IA).maxima;
  assert.close(eb[0].x - ea[0].x, 2.0, 0.6);
  assert.close(mean(spacings(eb)), mean(spacings(ea)), 0.2);
});

test('Ne: maxima spacing is close to 19 V', () => {
  const { U2, IA } = simulate({ gas: 'ne', U3: 7, U2max: 90, U2step: 0.5, electrons: 2000, seed: 1 });
  const { maxima } = findExtrema(U2, IA, { halfWindow: 5, prominence: 0.03 });
  assert.ok(maxima.length >= 3, 'maxima count ' + maxima.length);
  assert.between(mean(spacings(maxima)), 17.5, 20.5);
});

test('contrast of the oscillations grows with Hg temperature', () => {
  const contrast = (tempC) => {
    const { U2, IA } = simulate({ gas: 'hg', tempC, U2max: 40, ...fast });
    const e = findExtrema(U2, IA, { halfWindow: 1.5, prominence: 0.03 });
    return mean(e.maxima.map((m) => m.y)) - mean(e.minima.map((m) => m.y));
  };
  assert.ok(contrast(190) > contrast(170));
  assert.ok(contrast(170) > contrast(150));
});

test('minima do not reach zero', () => {
  const { U2, IA } = simulate({ gas: 'hg', tempC: 170, U2max: 40, ...fast });
  const { minima } = findExtrema(U2, IA);
  assert.ok(minima.length > 0);
  for (const m of minima) assert.ok(m.y > 0);
});

test('Ne results do not depend on the Hg temperature argument', () => {
  const a = simulate({ gas: 'ne', tempC: 150, U2max: 30, U2step: 1, electrons: 500 });
  const b = simulate({ gas: 'ne', tempC: 190, U2max: 30, U2step: 1, electrons: 500 });
  assert.equal(JSON.stringify(a.IA), JSON.stringify(b.IA));
});

test('traceElectrons returns tracks within [0,1] and excitations', () => {
  const { tracks, excitations } = traceElectrons({ gas: 'hg', tempC: 170 }, 20, 10, 500);
  assert.equal(tracks.length, 10);
  for (const t of tracks) for (const [x, E] of t.pts) { assert.between(x, 0, 1); assert.ok(E >= 0); }
  assert.ok(excitations.length > 0);
  for (const x of excitations) assert.between(x, 0, 1);
});

test('Ne excitations cluster in separated layers at U2 = 45 V', () => {
  const { excitations } = traceElectrons({ gas: 'ne' }, 45, 1, 4000);
  const bins = new Array(20).fill(0);
  for (const x of excitations) bins[Math.min(19, Math.floor(x * 20))]++;
  const peaks = bins.filter((c, i) => c > 0.5 * Math.max(...bins) && (i === 0 || c >= bins[i - 1]) && (i === 19 || c >= bins[i + 1]));
  assert.ok(peaks.length >= 2, 'peaks ' + peaks.length);
});
```

Add `import './montecarlo.test.js';` to `tests/index.html`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (module `../js/montecarlo.js` missing).

- [ ] **Step 3: Write the implementation**

`js/montecarlo.js`:

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/test.sh`
Expected: `RESULT: PASS (31)` (the run takes ~10–20 s). If a tolerance test fails by a small margin, do **not** widen the tolerance silently: print the measured value, check it against the physics (spacing ≈ ΔE), and only then adjust the tolerance with a comment explaining why.

- [ ] **Step 5: Commit**

```bash
git add js/montecarlo.js tests/montecarlo.test.js tests/index.html
git commit -m "feat: add Monte Carlo electron transport (curve and trajectories)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `profile.js` and `format.js` — pure helpers for sections 1–2

**Files:**
- Create: `js/profile.js`, `js/format.js`, `tests/profile.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Consumes: `GAS` from `physics.js`.
- Produces:
  - `POS = {K:0, G1:0.2, G2:0.8, A:1}`
  - `idealProfile({U1, U2, U3, gasId, gasOn}) -> {points: {x,E}[], reached: boolean, finalE: number}`; `finalE` is the kinetic energy at the anode if reached, else `0`.
  - `formatSci(x: number) -> string` (HTML; `'0'` for 0, `toPrecision(2)` for `x ≥ 0.01`, else `m×10<sup>e</sup>` with a proper minus sign).

- [ ] **Step 1: Write the failing test**

`tests/profile.test.js`:

```js
import { test, assert } from './harness.js';
import { idealProfile, POS } from '../js/profile.js';
import { formatSci } from '../js/format.js';

test('gas off: energy accumulates and the electron reaches the anode', () => {
  const r = idealProfile({ U1: 1, U2: 12, U3: 1.5, gasId: 'hg', gasOn: false });
  assert.ok(r.reached);
  assert.close(r.finalE, 1 + 12 - 1.5, 1e-9);
  assert.equal(r.points[0].x, POS.K);
  assert.equal(r.points[r.points.length - 1].x, POS.A);
});

test('Hg with gas: two inelastic collisions at U2 = 12 V leave 0.7 eV at the anode', () => {
  const r = idealProfile({ U1: 0, U2: 12, U3: 1.5, gasId: 'hg', gasOn: true });
  assert.ok(r.reached);
  assert.close(r.finalE, 12 - 2 * 4.9 - 1.5, 1e-9);
});

test('Hg with gas: U2 = 10 V leaves 0.2 eV before G2 < U3, electron is stopped', () => {
  const r = idealProfile({ U1: 0, U2: 10, U3: 1.5, gasId: 'hg', gasOn: true });
  assert.ok(!r.reached);
  assert.equal(r.finalE, 0);
  const last = r.points[r.points.length - 1];
  assert.equal(last.E, 0);
  assert.between(last.x, POS.G2, POS.A);
});

test('profile x is non-decreasing and E is never negative', () => {
  const r = idealProfile({ U1: 1, U2: 25, U3: 3, gasId: 'hg', gasOn: true });
  for (let i = 1; i < r.points.length; i++) assert.ok(r.points[i].x >= r.points[i - 1].x);
  for (const p of r.points) assert.ok(p.E >= 0);
});

test('U2 = 0 with gas terminates', () => {
  const r = idealProfile({ U1: 1, U2: 0, U3: 1, gasId: 'hg', gasOn: true });
  assert.ok(r.points.length >= 3);
});

test('U1 >= dE with gas terminates', () => {
  const r = idealProfile({ U1: 4.5, U2: 20, U3: 1, gasId: 'hg', gasOn: true });
  assert.ok(r.points.length >= 3);
  const r2 = idealProfile({ U1: 30, U2: 10, U3: 1, gasId: 'hg', gasOn: true });
  assert.ok(r2.points.length >= 3);
});

test('Ne profile uses dE = 19 eV', () => {
  const r = idealProfile({ U1: 0, U2: 45, U3: 7, gasId: 'ne', gasOn: true });
  assert.close(r.finalE, 45 - 2 * 19 - 7, 1e-9);
  assert.ok(r.reached === (45 - 2 * 19 - 7 >= 0));
});

test('formatSci formats zero, ordinary and tiny numbers', () => {
  assert.equal(formatSci(0), '0');
  assert.equal(formatSci(0.5), '0.50');
  assert.equal(formatSci(1.23e-5), '1.2×10<sup>−5</sup>');
  assert.equal(formatSci(6e-84), '6.0×10<sup>−84</sup>');
});
```

Add `import './profile.test.js';` to `tests/index.html`.

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (modules missing).

- [ ] **Step 3: Write the implementation**

`js/profile.js`:

```js
// Idealised kinetic energy of one electron along the tube (mean free path << tube). Pure module.
import { GAS } from './physics.js';

// Normalised positions along the tube: cathode, grid 1, grid 2, anode.
export const POS = { K: 0, G1: 0.2, G2: 0.8, A: 1 };

export function idealProfile({ U1, U2, U3, gasId, gasOn }) {
  const dE = GAS[gasId].dE;
  const points = [{ x: POS.K, E: 0 }, { x: POS.G1, E: U1 }];
  let E = U1;
  let x = POS.G1;
  const slope = U2 / (POS.G2 - POS.G1); // eV gained per unit x in the G1-G2 gap
  if (gasOn && slope > 0) {
    for (;;) {
      const need = dE - E;
      if (need <= 0) { // already above threshold: lose dE immediately
        E -= dE;
        points.push({ x, E });
        continue;
      }
      const xHit = x + need / slope;
      if (xHit >= POS.G2) break;
      points.push({ x: xHit, E: dE });
      x = xHit;
      E = 0;
      points.push({ x, E });
    }
  }
  E += slope * (POS.G2 - x);
  points.push({ x: POS.G2, E });
  if (E >= U3) {
    const finalE = E - U3;
    points.push({ x: POS.A, E: finalE });
    return { points, reached: true, finalE };
  }
  const xStop = U3 > 0 ? POS.G2 + (E / U3) * (POS.A - POS.G2) : POS.G2;
  points.push({ x: xStop, E: 0 });
  return { points, reached: false, finalE: 0 };
}
```

`js/format.js`:

```js
// Number formatting helpers. Pure module.

// 0 -> "0"; x >= 0.01 -> 2 significant digits; otherwise "m×10<sup>e</sup>" (HTML).
export function formatSci(x) {
  if (x === 0) return '0';
  if (x >= 0.01) return x.toPrecision(2);
  const [m, e] = x.toExponential(1).split('e');
  return `${m}×10<sup>${String(parseInt(e, 10)).replace('-', '−')}</sup>`;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `./scripts/test.sh`
Expected: `RESULT: PASS (39)`.

- [ ] **Step 5: Commit**

```bash
git add js/profile.js js/format.js tests/profile.test.js tests/index.html
git commit -m "feat: add idealised tube profile and number formatting" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Texts (EN/DE) and i18n core

**Files:**
- Create: `js/strings/common.js`, `js/strings/idea.js`, `js/strings/tube.js`, `js/strings/curve.js`, `js/strings/delta.js`, `js/strings/refs.js`, `js/strings.js`, `js/i18n.js`, `tests/i18n.test.js`
- Modify: `tests/index.html`

**Interfaces:**
- Produces:
  - `STRINGS: {en: Record<string,string>, de: Record<string,string>}` (from `strings.js`). Values are HTML; math uses `$…$` KaTeX delimiters; `{name}` marks placeholders.
  - `i18n.js`: `initialLang() -> 'en'|'de'`, `getLang()`, `t(key, vars?) -> string` (falls back to EN, then to the key; replaces `{name}` only when `name` is in `vars`), `applyI18n(root?)` (sets `innerHTML` of `[data-i18n]`, `aria-label` of `[data-i18n-aria]`, `aria-pressed` on `[data-lang]`, `<html lang>`, then renders math), `setLang(lang)` (stores in `localStorage` inside try/catch, applies, dispatches `document` event `langchange`), `renderMath(root?)`.

- [ ] **Step 1: Write the failing test**

`tests/i18n.test.js`:

```js
import { test, assert } from './harness.js';
import { STRINGS } from '../js/strings.js';
import { t } from '../js/i18n.js';

const keysOf = (o) => Object.keys(o).sort();
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('EN and DE define exactly the same keys', () => {
  const en = keysOf(STRINGS.en), de = keysOf(STRINGS.de);
  const missingInDe = en.filter((k) => !(k in STRINGS.de));
  const missingInEn = de.filter((k) => !(k in STRINGS.en));
  assert.equal(missingInDe.length + missingInEn.length, 0,
    `missing in DE: ${missingInDe.join(', ')} | missing in EN: ${missingInEn.join(', ')}`);
});

test('no string is empty', () => {
  for (const lang of ['en', 'de']) {
    for (const [k, v] of Object.entries(STRINGS[lang])) assert.ok(v.trim().length > 0, `${lang}:${k} empty`);
  }
});

test('both languages use the same {placeholders} per key', () => {
  for (const k of Object.keys(STRINGS.en)) {
    assert.equal(placeholders(STRINGS.de[k] || ''), placeholders(STRINGS.en[k]), 'placeholders differ for ' + k);
  }
});

test('t() replaces known placeholders, keeps unknown braces, falls back to the key', () => {
  const s = t('idea.result', { kt: '0.025', bf: 'X' });
  assert.ok(s.includes('0.025') && s.includes('X'));
  assert.ok(s.includes('\\Delta'), 'math must survive');
  assert.equal(t('does.not.exist'), 'does.not.exist');
});

test('every data-i18n key used in index.html exists in both languages', async () => {
  const html = await (await fetch('../index.html')).text();
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length > 20, 'found only ' + keys.length + ' keys');
  const missing = keys.filter((k) => !(k in STRINGS.en) || !(k in STRINGS.de));
  assert.equal(missing.length, 0, 'missing: ' + missing.join(', '));
});

test('index.html loads no remote scripts or stylesheets', async () => {
  const html = await (await fetch('../index.html')).text();
  const remote = [...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(https?:)?\/\/[^"]*"/g)];
  assert.equal(remote.length, 0, 'remote resources: ' + remote.map((m) => m[0]).join(' | '));
});
```

Add `import './i18n.test.js';` to `tests/index.html`. (The last two tests need `index.html`, created in Task 7; until then they fail — this task's own commit therefore creates a minimal placeholder, see Step 5.)

- [ ] **Step 2: Run to verify it fails**

Run: `./scripts/test.sh`
Expected: FAIL (modules missing).

- [ ] **Step 3: Write the texts**

All math uses `String.raw` so backslashes survive. Every file has the same shape. German texts are drafts for the supervisor to proofread.

`js/strings/common.js`:

```js
export default {
  en: {
    'site.title': 'Franck–Hertz experiment (P3)',
    'site.subtitle': 'An interactive introduction: understand the physics before you enter the lab.',
    'nav.label': 'Contents',
    'nav.idea': 'The idea',
    'nav.tube': 'The tube',
    'nav.curve': 'The curve',
    'nav.delta': 'From curve to ΔE',
    'nav.refs': 'References',
    'lang.label': 'Language',
    'ctl.gas': 'Gas',
    'gas.hg': 'Mercury (Hg)',
    'gas.ne': 'Neon (Ne)',
    'busy': 'Computing…',
    'footer': 'Educational model for building intuition. It does not replace the lab manual.',
    'noscript': 'This page needs JavaScript for the interactive tools.',
  },
  de: {
    'site.title': 'Franck-Hertz-Versuch (P3)',
    'site.subtitle': 'Eine interaktive Einführung: die Physik verstehen, bevor Sie ins Labor gehen.',
    'nav.label': 'Inhalt',
    'nav.idea': 'Die Idee',
    'nav.tube': 'Die Röhre',
    'nav.curve': 'Die Kurve',
    'nav.delta': 'Von der Kurve zu ΔE',
    'nav.refs': 'Literatur',
    'lang.label': 'Sprache',
    'ctl.gas': 'Gas',
    'gas.hg': 'Quecksilber (Hg)',
    'gas.ne': 'Neon (Ne)',
    'busy': 'Berechne…',
    'footer': 'Didaktisches Modell zum Aufbau von Intuition. Es ersetzt nicht die Arbeitsanleitung.',
    'noscript': 'Diese Seite benötigt JavaScript für die interaktiven Werkzeuge.',
  },
};
```

`js/strings/idea.js`:

```js
const r = String.raw;

export default {
  en: {
    'idea.title': '1 · The idea',
    'idea.p1': r`In 1914 James Franck and Gustav Hertz accelerated electrons through mercury vapour and measured the current reaching a collecting anode. The electrons lost energy only in <strong>discrete portions</strong>: direct evidence that atoms possess discrete energy levels, as Bohr had proposed in 1913. They first read the spacing of about 4.9 V as ionisation; the emission line at 253.7 nm showed that it is <em>excitation</em> (ionising Hg takes 10.4 eV).`,
    'idea.p2': r`An electron accelerated through a voltage $U$ has kinetic energy $E_\mathrm{kin}=e_0U$. An atom can only absorb the energy $\Delta E=E_1-E_0$ between two of its levels. Below $\Delta E$ collisions are <strong>elastic</strong>: the electron loses only a fraction $\sim 2m_e/M$ of its energy. Once $E_\mathrm{kin}\ge\Delta E$ an <strong>inelastic</strong> collision is possible, and the electron gives up exactly $\Delta E$.`,
    'idea.temp': 'Gas temperature',
    'idea.caption': r`Energy levels in eV above the ground state (schematic). Highlighted: the level excited in the experiment. Dashed: ionisation limit. The dot marks the thermal energy $k_BT$.`,
    'idea.arrow': 'ΔE = {dE} eV ({nm} nm)',
    'idea.kt': 'k_BT = {kt} eV',
    'idea.ground': 'ground state',
    'idea.ion': 'ionisation',
    'idea.result': r`$k_BT$ = {kt} eV, so the Boltzmann factor of the highlighted transition is $e^{-\Delta E/k_BT}\approx$ {bf}.`,
    'idea.thermal': r`At room temperature $k_BT\approx0.025$ eV, about 200 times smaller than $\Delta E$: thermal excitation is completely negligible. Matching $\Delta E$ to the mean thermal energy $\tfrac32k_BT$ would need tens of thousands of kelvin. The atoms must therefore be excited by something else — here by electron impact.`,
    'idea.theory': 'Theory: <a href="https://www.nobelprize.org/prizes/physics/1925/franck/lecture/" target="_blank" rel="noopener">Franck’s Nobel lecture ↗</a> · <a href="https://physics.nist.gov/PhysRefData/ASD/levels_form.html" target="_blank" rel="noopener">NIST level data ↗</a>',
  },
  de: {
    'idea.title': '1 · Die Idee',
    'idea.p1': r`1914 beschleunigten James Franck und Gustav Hertz Elektronen durch Quecksilberdampf und maßen den Strom, der eine Auffängerelektrode erreicht. Die Elektronen verloren Energie nur in <strong>diskreten Portionen</strong>: ein direkter Hinweis auf diskrete Energieniveaus der Atome, wie Bohr sie 1913 postuliert hatte. Den Abstand von etwa 4,9 V deuteten sie zunächst als Ionisation; die Emissionslinie bei 253,7 nm zeigte, dass es sich um <em>Anregung</em> handelt (die Ionisation von Hg erfordert 10,4 eV).`,
    'idea.p2': r`Ein Elektron, das die Spannung $U$ durchläuft, hat die kinetische Energie $E_\mathrm{kin}=e_0U$. Ein Atom kann nur die Energie $\Delta E=E_1-E_0$ zwischen zwei seiner Niveaus aufnehmen. Unterhalb von $\Delta E$ sind Stöße <strong>elastisch</strong>: das Elektron verliert nur einen Bruchteil $\sim 2m_e/M$ seiner Energie. Sobald $E_\mathrm{kin}\ge\Delta E$ gilt, ist ein <strong>inelastischer</strong> Stoß möglich, bei dem das Elektron genau $\Delta E$ abgibt.`,
    'idea.temp': 'Gastemperatur',
    'idea.caption': r`Energieniveaus in eV über dem Grundzustand (schematisch). Hervorgehoben: das im Versuch angeregte Niveau. Gestrichelt: Ionisationsgrenze. Der Punkt markiert die thermische Energie $k_BT$.`,
    'idea.arrow': 'ΔE = {dE} eV ({nm} nm)',
    'idea.kt': 'k_BT = {kt} eV',
    'idea.ground': 'Grundzustand',
    'idea.ion': 'Ionisation',
    'idea.result': r`$k_BT$ = {kt} eV, der Boltzmann-Faktor des hervorgehobenen Übergangs ist daher $e^{-\Delta E/k_BT}\approx$ {bf}.`,
    'idea.thermal': r`Bei Raumtemperatur ist $k_BT\approx0{,}025$ eV, etwa 200-mal kleiner als $\Delta E$: thermische Anregung ist völlig vernachlässigbar. Um $\Delta E$ mit der mittleren thermischen Energie $\tfrac32k_BT$ gleichzusetzen, wären einige zehntausend Kelvin nötig. Die Atome müssen also anders angeregt werden — hier durch Elektronenstoß.`,
    'idea.theory': 'Theorie: <a href="https://www.nobelprize.org/prizes/physics/1925/franck/lecture/" target="_blank" rel="noopener">Nobelvortrag von Franck ↗</a> · <a href="https://physics.nist.gov/PhysRefData/ASD/levels_form.html" target="_blank" rel="noopener">NIST-Niveaudaten ↗</a>',
  },
};
```

`js/strings/tube.js`:

```js
const r = String.raw;

export default {
  en: {
    'tube.title': '2 · The tube',
    'tube.p1': r`The tube has a hot <strong>cathode K</strong> that emits electrons (heating voltage $U_K$), two grids G₁ and G₂, and an <strong>anode A</strong>. The <strong>control voltage $U_1$</strong> between K and G₁ draws the electrons out and makes the emission current independent of $U_2$. The <strong>accelerating voltage $U_2$</strong> between G₁ and G₂ gives them the energy $E_\mathrm{kin}=e_0U_2$. A weak <strong>counter voltage $U_3$</strong> between G₂ and A lets only electrons with enough energy through. The measured quantity is the anode current $I_A$ as a function of $U_2$.`,
    'tube.hint': r`Move the sliders. The electron starts at K with zero energy, gains $e_0U_1$ up to G₁ and $e_0U_2$ between G₁ and G₂, and is decelerated by $e_0U_3$ on the last stretch. With the gas switched on it loses $\Delta E$ every time its energy reaches $\Delta E$.`,
    'tube.U1': 'Control voltage U₁',
    'tube.U2': 'Accelerating voltage U₂',
    'tube.U3': 'Counter voltage U₃',
    'tube.gasOn': 'Gas atoms present (inelastic collisions)',
    'tube.caption': r`Idealised kinetic energy of one electron along the tube (mean free path much shorter than the tube). To reach the anode, the electron must still have $E_\mathrm{kin}\ge e_0U_3$ after its last collision.`,
    'tube.reached': r`✔ The electron reaches the anode with {E} eV left.`,
    'tube.stopped': r`✘ The electron is turned back by the counter voltage: it has less than $e_0U_3$ when it leaves G₂.`,
    'tube.axis.x': 'Position (K → A)',
    'tube.axis.y': 'Kinetic energy / eV',
    'tube.trace': 'Electron',
    'tube.dE': 'ΔE',
  },
  de: {
    'tube.title': '2 · Die Röhre',
    'tube.p1': r`Die Röhre enthält eine heiße <strong>Kathode K</strong>, die Elektronen emittiert (Heizspannung $U_K$), zwei Gitter G₁ und G₂ sowie eine <strong>Anode A</strong>. Die <strong>Steuerspannung $U_1$</strong> zwischen K und G₁ saugt die Elektronen ab und macht den Emissionsstrom unabhängig von $U_2$. Die <strong>Beschleunigungsspannung $U_2$</strong> zwischen G₁ und G₂ gibt ihnen die Energie $E_\mathrm{kin}=e_0U_2$. Eine schwache <strong>Gegenspannung $U_3$</strong> zwischen G₂ und A lässt nur Elektronen mit ausreichender Energie passieren. Gemessen wird der Anodenstrom $I_A$ als Funktion von $U_2$.`,
    'tube.hint': r`Bewegen Sie die Regler. Das Elektron startet bei K mit der Energie null, gewinnt bis G₁ die Energie $e_0U_1$ und zwischen G₁ und G₂ die Energie $e_0U_2$ und wird auf der letzten Strecke um $e_0U_3$ abgebremst. Bei eingeschaltetem Gas verliert es jedes Mal $\Delta E$, wenn seine Energie $\Delta E$ erreicht.`,
    'tube.U1': 'Steuerspannung U₁',
    'tube.U2': 'Beschleunigungsspannung U₂',
    'tube.U3': 'Gegenspannung U₃',
    'tube.gasOn': 'Gasatome vorhanden (inelastische Stöße)',
    'tube.caption': r`Idealisierte kinetische Energie eines Elektrons entlang der Röhre (mittlere freie Weglänge viel kleiner als die Röhre). Um die Anode zu erreichen, muss das Elektron nach dem letzten Stoß noch $E_\mathrm{kin}\ge e_0U_3$ haben.`,
    'tube.reached': r`✔ Das Elektron erreicht die Anode mit {E} eV Restenergie.`,
    'tube.stopped': r`✘ Das Elektron wird von der Gegenspannung zurückgehalten: Beim Verlassen von G₂ hat es weniger als $e_0U_3$.`,
    'tube.axis.x': 'Position (K → A)',
    'tube.axis.y': 'Kinetische Energie / eV',
    'tube.trace': 'Elektron',
    'tube.dE': 'ΔE',
  },
};
```

`js/strings/curve.js`:

```js
const r = String.raw;

export default {
  en: {
    'curve.title': '3 · The curve',
    'curve.p1': r`This is a <strong>Monte Carlo simulation</strong>: thousands of electrons cross the gap between G₁ and G₂ one by one. Between collisions they gain energy from the field; the free path is drawn from an exponential distribution with mean $\lambda=1/(n\sigma)$. Above $\Delta E$ a collision is inelastic with a fixed probability. The anode current is the average fraction of electrons that overcome $U_3$. The oscillations are not put in by hand — they <em>emerge</em> from the collisions.`,
    'curve.temp': 'Hg temperature',
    'curve.U3': 'Counter voltage U₃',
    'curve.spread': 'Initial energy spread of the electrons',
    'curve.nogas': 'Show the curve without gas',
    'curve.probe': 'Electrons in the tube at U₂ =',
    'curve.info.hg': r`Hg at {T} °C: vapour pressure {p} Pa, mean free path $\lambda\approx$ {lam} µm.`,
    'curve.info.ne': r`Ne at about 10 hPa and room temperature: mean free path $\lambda\approx$ {lam} µm.`,
    'curve.axis.x': 'U₂ / V',
    'curve.axis.y': 'I_A (relative units)',
    'curve.legend.gas': 'with gas',
    'curve.legend.nogas': 'without gas',
    'curve.legend.max': 'maxima',
    'curve.legend.min': 'minima',
    'curve.look.title': 'What to look for',
    'curve.look.1': r`Below $U_2\approx\Delta E/e_0$ the curve rises like the curve without gas: only elastic collisions.`,
    'curve.look.2': r`Around $U_2\approx\Delta E/e_0$ (plus the contact potential, see section 4) the current falls: electrons lose their energy shortly before G₂ and cannot overcome $U_3$.`,
    'curve.look.3': r`The current recovers as the inelastic collisions move towards G₁ and the electrons regain energy. At $2\Delta E/e_0$ a second collision becomes possible: second minimum, and so on.`,
    'curve.look.4': r`Minima are not zero and maxima are not sharp: the electrons start with a spread of energies, the free path is finite and not all collisions happen at the same place.`,
    'curve.look.5': r`Raising the Hg temperature raises the vapour pressure and shortens $\lambda$: more collisions before G₂ and a better-contrasted structure. The paper of Rapior et al. (see references) analyses the temperature dependence in detail.`,
    'curve.limits': r`<strong>Model limits.</strong> One dimension, a single excitation level, no ionisation (Hg: 10.4 eV), no space charge, isotropic scattering after collisions. The constants are chosen for plausible curves, not fitted to data: the model builds intuition, it does not reproduce your measured curves quantitatively.`,
    'motion.title': 'Electrons between G₁ and G₂',
    'motion.play': 'Play',
    'motion.pause': 'Pause',
    'motion.glow.ne': 'Orange glow: excitation zones (visible light)',
    'motion.glow.hg': 'Violet: excitation zones (UV at 253.7 nm, invisible)',
    'motion.caption': r`Each dot is one simulated electron (blue: slow, red: energy at or above $\Delta E$). The coloured bands show where excitations occur at the chosen $U_2$: they are the luminous layers seen in the neon tube.`,
  },
  de: {
    'curve.title': '3 · Die Kurve',
    'curve.p1': r`Dies ist eine <strong>Monte-Carlo-Simulation</strong>: Tausende Elektronen durchqueren nacheinander den Raum zwischen G₁ und G₂. Zwischen den Stößen gewinnen sie Energie im Feld; die freie Weglänge wird aus einer Exponentialverteilung mit Mittelwert $\lambda=1/(n\sigma)$ gezogen. Oberhalb von $\Delta E$ ist ein Stoß mit fester Wahrscheinlichkeit inelastisch. Der Anodenstrom ist der mittlere Anteil der Elektronen, die $U_3$ überwinden. Die Oszillationen werden nicht vorgegeben — sie <em>entstehen</em> aus den Stößen.`,
    'curve.temp': 'Hg-Temperatur',
    'curve.U3': 'Gegenspannung U₃',
    'curve.spread': 'Anfangs-Energiebreite der Elektronen',
    'curve.nogas': 'Kurve ohne Gas anzeigen',
    'curve.probe': 'Elektronen in der Röhre bei U₂ =',
    'curve.info.hg': r`Hg bei {T} °C: Dampfdruck {p} Pa, mittlere freie Weglänge $\lambda\approx$ {lam} µm.`,
    'curve.info.ne': r`Ne bei etwa 10 hPa und Raumtemperatur: mittlere freie Weglänge $\lambda\approx$ {lam} µm.`,
    'curve.axis.x': 'U₂ / V',
    'curve.axis.y': 'I_A (relative Einheiten)',
    'curve.legend.gas': 'mit Gas',
    'curve.legend.nogas': 'ohne Gas',
    'curve.legend.max': 'Maxima',
    'curve.legend.min': 'Minima',
    'curve.look.title': 'Worauf Sie achten sollten',
    'curve.look.1': r`Unterhalb von $U_2\approx\Delta E/e_0$ steigt die Kurve wie die Kurve ohne Gas: nur elastische Stöße.`,
    'curve.look.2': r`Bei $U_2\approx\Delta E/e_0$ (plus Kontaktpotential, siehe Abschnitt 4) fällt der Strom: Die Elektronen verlieren ihre Energie kurz vor G₂ und überwinden $U_3$ nicht.`,
    'curve.look.3': r`Der Strom erholt sich, wenn die inelastischen Stöße zu G₁ hin wandern und die Elektronen wieder Energie gewinnen. Bei $2\Delta E/e_0$ wird ein zweiter Stoß möglich: zweites Minimum usw.`,
    'curve.look.4': r`Die Minima sind nicht null und die Maxima nicht scharf: Die Elektronen starten mit einer Energieverteilung, die freie Weglänge ist endlich und nicht alle Stöße finden am selben Ort statt.`,
    'curve.look.5': r`Eine höhere Hg-Temperatur erhöht den Dampfdruck und verkürzt $\lambda$: mehr Stöße vor G₂ und eine kontrastreichere Struktur. Die Arbeit von Rapior et al. (siehe Literatur) analysiert die Temperaturabhängigkeit im Detail.`,
    'curve.limits': r`<strong>Grenzen des Modells.</strong> Eine Dimension, ein einziges Anregungsniveau, keine Ionisation (Hg: 10,4 eV), keine Raumladung, isotrope Streuung nach Stößen. Die Konstanten sind für plausible Kurven gewählt, nicht an Daten angepasst: Das Modell schafft Intuition, es reproduziert Ihre Messkurven nicht quantitativ.`,
    'motion.title': 'Elektronen zwischen G₁ und G₂',
    'motion.play': 'Abspielen',
    'motion.pause': 'Pause',
    'motion.glow.ne': 'Orange: Anregungszonen (sichtbares Licht)',
    'motion.glow.hg': 'Violett: Anregungszonen (UV bei 253,7 nm, unsichtbar)',
    'motion.caption': r`Jeder Punkt ist ein simuliertes Elektron (blau: langsam, rot: Energie bei oder über $\Delta E$). Die farbigen Bänder zeigen, wo bei der gewählten Spannung $U_2$ Anregungen stattfinden: Das sind die Leuchtschichten, die man in der Neonröhre sieht.`,
  },
};
```

`js/strings/delta.js`:

```js
const r = String.raw;

export default {
  en: {
    'delta.title': '4 · From the curve to ΔE',
    'delta.p1': r`The excitation energy is not read from the position of the first minimum but from the <strong>spacing</strong> of successive extrema: $\Delta E=e_0\,\bigl(U_2^{(n)}-U_2^{(n-1)}\bigr)$. This section takes the extrema of the simulated curve from section 3 (same gas and settings) and shows why this works.`,
    'delta.contact': 'Contact potential',
    'delta.kind': 'Extrema',
    'delta.maxima': 'maxima',
    'delta.minima': 'minima',
    'delta.compare': 'Compare Hg at 150, 170 and 190 °C',
    'delta.legend.pos': 'positions U₂⁽ⁿ⁾',
    'delta.legend.ref': r`slope = model ΔE`,
    'delta.axis.u': 'U₂⁽ⁿ⁾ / V',
    'delta.axis.d': 'spacing / V',
    'delta.col.u': 'U₂⁽ⁿ⁾ / V',
    'delta.col.d': 'spacing / V',
    'delta.result': r`Mean spacing of successive extrema: <strong>{d} V</strong>, so $\Delta E=e_0\,\overline{\Delta U_2}\approx$ <strong>{d} eV</strong> (the model was run with $\Delta E$ = {model} eV).`,
    'delta.none': 'Not enough extrema in the sweep range for a spacing.',
    'delta.p2': r`<strong>Try this:</strong> move the contact-potential slider (work-function difference between cathode and grid, plus any offset of the electron energies). All extrema shift by the same amount — the positions change, the spacings do not. That is why absolute positions are unreliable and spacings give $\Delta E$. The dotted line has the slope of the model $\Delta E$; compare it with the points.`,
    'delta.compare.caption': 'Spacing between successive maxima or minima for three Hg temperatures. Compare how the spacings behave as n grows and as the temperature changes.',
  },
  de: {
    'delta.title': '4 · Von der Kurve zu ΔE',
    'delta.p1': r`Die Anregungsenergie wird nicht aus der Lage des ersten Minimums bestimmt, sondern aus dem <strong>Abstand</strong> aufeinanderfolgender Extrema: $\Delta E=e_0\,\bigl(U_2^{(n)}-U_2^{(n-1)}\bigr)$. Dieser Abschnitt verwendet die Extrema der simulierten Kurve aus Abschnitt 3 (gleiches Gas, gleiche Einstellungen) und zeigt, warum das funktioniert.`,
    'delta.contact': 'Kontaktpotential',
    'delta.kind': 'Extrema',
    'delta.maxima': 'Maxima',
    'delta.minima': 'Minima',
    'delta.compare': 'Hg bei 150, 170 und 190 °C vergleichen',
    'delta.legend.pos': 'Lagen U₂⁽ⁿ⁾',
    'delta.legend.ref': r`Steigung = ΔE des Modells`,
    'delta.axis.u': 'U₂⁽ⁿ⁾ / V',
    'delta.axis.d': 'Abstand / V',
    'delta.col.u': 'U₂⁽ⁿ⁾ / V',
    'delta.col.d': 'Abstand / V',
    'delta.result': r`Mittlerer Abstand aufeinanderfolgender Extrema: <strong>{d} V</strong>, also $\Delta E=e_0\,\overline{\Delta U_2}\approx$ <strong>{d} eV</strong> (das Modell wurde mit $\Delta E$ = {model} eV gerechnet).`,
    'delta.none': 'Zu wenige Extrema im Messbereich für einen Abstand.',
    'delta.p2': r`<strong>Probieren Sie es aus:</strong> Verschieben Sie den Regler für das Kontaktpotential (Austrittsarbeitsdifferenz zwischen Kathode und Gitter, plus ein eventueller Versatz der Elektronenenergien). Alle Extrema verschieben sich um denselben Betrag — die Lagen ändern sich, die Abstände nicht. Deshalb sind absolute Lagen unzuverlässig und erst die Abstände liefern $\Delta E$. Die gepunktete Linie hat die Steigung des Modell-$\Delta E$; vergleichen Sie sie mit den Punkten.`,
    'delta.compare.caption': 'Abstand zwischen aufeinanderfolgenden Maxima bzw. Minima für drei Hg-Temperaturen. Vergleichen Sie, wie sich die Abstände mit wachsendem n und mit der Temperatur verhalten.',
  },
};
```

`js/strings/refs.js`:

```js
const A = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export default {
  en: {
    'refs.title': '5 · References',
    'refs.intro': 'Links open in a new tab.',
    'refs.r1': `G. Rapior, K. Sengstock, V. Baev, <em>New features of the Franck–Hertz experiment</em>, Am. J. Phys. <strong>74</strong>, 423–428 (2006). ${A('https://doi.org/10.1119/1.2174033', 'doi:10.1119/1.2174033 ↗')} — temperature dependence of the curves; recommended reading.`,
    'refs.r2': `J. Franck, G. Hertz, <em>Über Zusammenstöße zwischen Elektronen und Molekülen des Quecksilberdampfes und die Ionisierungsspannung desselben</em>, Verh. Dtsch. Phys. Ges. <strong>16</strong>, 457 (1914) — the original paper. ${A('https://www.nobelprize.org/prizes/physics/1925/franck/lecture/', 'Franck’s Nobel lecture ↗')} gives the story in his own words.`,
    'refs.r3': `G. Wedler, H.-J. Freund, <em>Lehrbuch der Physikalischen Chemie</em>, Wiley-VCH, Weinheim — atomic structure and spectroscopy chapters. ${A('https://www.wiley-vch.de', 'Wiley-VCH ↗')}`,
    'refs.r4': `${A('https://physics.nist.gov/PhysRefData/ASD/levels_form.html', 'NIST Atomic Spectra Database — energy levels ↗')} and ${A('https://physics.nist.gov/PhysRefData/ASD/lines_form.html', 'spectral lines ↗')}: levels and the 253.7 nm Hg line.`,
    'refs.r5': `${A('https://jcgm.bipm.org/vim/en/', 'JCGM — International Vocabulary of Metrology (VIM) ↗')}: terminology on measurement and uncertainty, for the data-evaluation part of the course.`,
  },
  de: {
    'refs.title': '5 · Literatur',
    'refs.intro': 'Links öffnen sich in einem neuen Tab.',
    'refs.r1': `G. Rapior, K. Sengstock, V. Baev, <em>New features of the Franck–Hertz experiment</em>, Am. J. Phys. <strong>74</strong>, 423–428 (2006). ${A('https://doi.org/10.1119/1.2174033', 'doi:10.1119/1.2174033 ↗')} — Temperaturabhängigkeit der Kurven; empfohlene Lektüre.`,
    'refs.r2': `J. Franck, G. Hertz, <em>Über Zusammenstöße zwischen Elektronen und Molekülen des Quecksilberdampfes und die Ionisierungsspannung desselben</em>, Verh. Dtsch. Phys. Ges. <strong>16</strong>, 457 (1914) — die Originalarbeit. ${A('https://www.nobelprize.org/prizes/physics/1925/franck/lecture/', 'Francks Nobelvortrag ↗')} erzählt die Geschichte in seinen eigenen Worten.`,
    'refs.r3': `G. Wedler, H.-J. Freund, <em>Lehrbuch der Physikalischen Chemie</em>, Wiley-VCH, Weinheim — Kapitel zu Atombau und Spektroskopie. ${A('https://www.wiley-vch.de', 'Wiley-VCH ↗')}`,
    'refs.r4': `${A('https://physics.nist.gov/PhysRefData/ASD/levels_form.html', 'NIST Atomic Spectra Database — Energieniveaus ↗')} und ${A('https://physics.nist.gov/PhysRefData/ASD/lines_form.html', 'Spektrallinien ↗')}: Niveaus und die Hg-Linie bei 253,7 nm.`,
    'refs.r5': `${A('https://jcgm.bipm.org/vim/en/', 'JCGM — Internationales Wörterbuch der Metrologie (VIM) ↗')}: Begriffe zu Messung und Messunsicherheit, für den Auswertungsteil des Kurses.`,
  },
};
```

- [ ] **Step 4: Write `strings.js` and `i18n.js`**

`js/strings.js`:

```js
// Merges the per-section string files into one table: STRINGS.en / STRINGS.de.
import common from './strings/common.js';
import idea from './strings/idea.js';
import tube from './strings/tube.js';
import curve from './strings/curve.js';
import delta from './strings/delta.js';
import refs from './strings/refs.js';

const parts = [common, idea, tube, curve, delta, refs];

export const STRINGS = {
  en: Object.assign({}, ...parts.map((p) => p.en)),
  de: Object.assign({}, ...parts.map((p) => p.de)),
};
```

`js/i18n.js`:

```js
import { STRINGS } from './strings.js';

const KEY = 'fh-lang';
let lang = 'en';

// ?lang=de|en wins, then the stored choice, then the browser language.
export function initialLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'de') return q;
  } catch { /* no location: ignore */ }
  try {
    const s = localStorage.getItem(KEY);
    if (s === 'en' || s === 'de') return s;
  } catch { /* storage blocked: ignore */ }
  return (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function getLang() { return lang; }

export function t(key, vars) {
  const s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.en[key] ?? key;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function renderMath(root = document.body) {
  if (typeof window.renderMathInElement !== 'function') return;
  window.renderMathInElement(root, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
    ],
    throwOnError: false,
  });
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.innerHTML = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  root.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.documentElement.lang = lang;
  renderMath(root === document ? document.body : root);
}

export function setLang(next) {
  lang = next === 'de' ? 'de' : 'en';
  try { localStorage.setItem(KEY, lang); } catch { /* storage blocked: ignore */ }
  applyI18n();
  document.dispatchEvent(new CustomEvent('langchange'));
}
```

- [ ] **Step 5: Create a placeholder `index.html` so this task's last two tests can run, then verify**

The real page comes in Task 7; for now create a minimal file that satisfies the key test (it must reference more than 20 keys) — it will be overwritten in Task 7:

Run:
```bash
python3 - <<'EOF'
import re,subprocess
# collect all keys from the strings files and emit a throw-away page that references 25+ of them
keys=[]
for f in ['common','idea','tube','curve','delta','refs']:
    s=open(f'js/strings/{f}.js').read()
    en=s.split('de: {')[0]
    keys+=re.findall(r"^\s*'([a-z0-9.]+)':",en,re.M)
body=''.join(f'<p data-i18n="{k}"></p>\n' for k in keys[:30])
open('index.html','w').write('<!doctype html><meta charset="utf-8"><title>placeholder</title>\n'+body)
EOF
./scripts/test.sh
```
Expected: `RESULT: PASS (45)`.

- [ ] **Step 6: Commit**

```bash
git add js/strings js/strings.js js/i18n.js tests/i18n.test.js tests/index.html index.html
git commit -m "feat: add EN/DE texts and i18n core" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Page shell — `index.html`, CSS, `main.js`, `dom.js`, `plotstyle.js`

**Files:**
- Create (overwrite the placeholder): `index.html`
- Create: `css/style.css`, `js/main.js`, `js/dom.js`, `js/plotstyle.js`

**Interfaces:**
- Consumes: `initialLang`, `setLang` from `i18n.js`.
- Produces:
  - DOM ids used by later tasks: `levels-gas`, `levels-T`, `levels-T-out`, `levels-svg`, `levels-result`; `tube-gas`, `tube-U1`, `tube-U2`, `tube-U3`, `tube-U1-out`, `tube-U2-out`, `tube-U3-out`, `tube-gasOn`, `tube-plot`, `tube-result`; `curve-gas`, `curve-temp-wrap`, `curve-temp`, `curve-temp-out`, `curve-U3`, `curve-U3-out`, `curve-spread`, `curve-spread-out`, `curve-nogas`, `curve-probe`, `curve-probe-out`, `curve-busy`, `curve-info`, `curve-plot`, `motion-canvas`, `motion-toggle`; `contact`, `contact-out`, `kind`, `compare-wrap`, `compare`, `delta-plot`, `delta-result`, `delta-table`, `compare-plot`.
  - `dom.js`: `svgEl(tag, attrs?, text?) -> SVGElement`.
  - `plotstyle.js`: `cssVar(name)`, `colors() -> {fg,muted,grid,card,c1,c2,c3}`, `baseLayout(extra?) -> layout`, `plotConfig`. Document event `themechange` is dispatched by `main.js` when the OS colour scheme changes.
  - CSS variables `--bg --card --fg --muted --grid --border --c1 --c2 --c3 --note`.

- [ ] **Step 1: Write `index.html`**

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
    <a href="#tube" data-i18n="nav.tube"></a>
    <a href="#curve" data-i18n="nav.curve"></a>
    <a href="#delta" data-i18n="nav.delta"></a>
    <a href="#refs" data-i18n="nav.refs"></a>
  </nav>

  <main>
    <noscript><p class="note" data-i18n="noscript">This page needs JavaScript for the interactive tools.</p></noscript>

    <!-- 1 · The idea -->
    <section id="idea">
      <h2 data-i18n="idea.title"></h2>
      <p data-i18n="idea.p1"></p>
      <p data-i18n="idea.p2"></p>
      <div class="card">
        <div class="controls">
          <label><span data-i18n="ctl.gas"></span>
            <select id="levels-gas">
              <option value="hg" data-i18n="gas.hg"></option>
              <option value="ne" data-i18n="gas.ne"></option>
            </select>
          </label>
          <label class="grow"><span data-i18n="idea.temp"></span> <output id="levels-T-out"></output>
            <input id="levels-T" type="range" min="2.4" max="4.8" step="0.01" value="2.47">
          </label>
        </div>
        <div id="levels-svg" class="figure" role="img" aria-labelledby="levels-cap"></div>
        <p id="levels-cap" class="caption" data-i18n="idea.caption"></p>
        <p id="levels-result" class="result"></p>
      </div>
      <p class="note" data-i18n="idea.thermal"></p>
      <p class="theory" data-i18n="idea.theory"></p>
    </section>

    <!-- 2 · The tube -->
    <section id="tube">
      <h2 data-i18n="tube.title"></h2>
      <p data-i18n="tube.p1"></p>
      <svg class="schematic" viewBox="0 0 600 140" role="img" aria-label="Tube: K, G1, G2, A">
        <rect x="10" y="30" width="580" height="70" rx="35" class="glass"/>
        <rect x="26" y="48" width="8" height="34" class="electrode"/>
        <line x1="138" y1="34" x2="138" y2="96" class="grid-el"/>
        <line x1="462" y1="34" x2="462" y2="96" class="grid-el"/>
        <rect x="566" y="42" width="8" height="46" class="electrode"/>
        <g class="sch-label" text-anchor="middle">
          <text x="30" y="122">K</text><text x="138" y="122">G₁</text>
          <text x="462" y="122">G₂</text><text x="570" y="122">A</text>
          <text x="84" y="20">U₁</text><text x="300" y="20">U₂</text><text x="516" y="20">U₃</text>
        </g>
        <g class="sch-arrow">
          <line x1="34" y1="26" x2="134" y2="26"/><line x1="142" y1="26" x2="458" y2="26"/><line x1="466" y1="26" x2="566" y2="26"/>
        </g>
      </svg>
      <div class="card">
        <div class="controls">
          <label><span data-i18n="ctl.gas"></span>
            <select id="tube-gas">
              <option value="hg" data-i18n="gas.hg"></option>
              <option value="ne" data-i18n="gas.ne"></option>
            </select>
          </label>
          <label><span data-i18n="tube.U1"></span> <output id="tube-U1-out"></output>
            <input id="tube-U1" type="range" min="0" max="4.5" step="0.1" value="1">
          </label>
          <label><span data-i18n="tube.U2"></span> <output id="tube-U2-out"></output>
            <input id="tube-U2" type="range" min="0" max="30" step="0.1" value="12">
          </label>
          <label><span data-i18n="tube.U3"></span> <output id="tube-U3-out"></output>
            <input id="tube-U3" type="range" min="0" max="5" step="0.1" value="1.5">
          </label>
          <label class="check"><input id="tube-gasOn" type="checkbox" checked> <span data-i18n="tube.gasOn"></span></label>
        </div>
        <div id="tube-plot" class="plot short"></div>
        <p id="tube-result" class="result"></p>
        <p class="caption" data-i18n="tube.caption"></p>
      </div>
      <p class="note" data-i18n="tube.hint"></p>
    </section>

    <!-- 3 · The curve -->
    <section id="curve">
      <h2 data-i18n="curve.title"></h2>
      <p data-i18n="curve.p1"></p>
      <div class="card">
        <div class="controls">
          <label><span data-i18n="ctl.gas"></span>
            <select id="curve-gas">
              <option value="hg" data-i18n="gas.hg"></option>
              <option value="ne" data-i18n="gas.ne"></option>
            </select>
          </label>
          <label id="curve-temp-wrap"><span data-i18n="curve.temp"></span> <output id="curve-temp-out"></output>
            <input id="curve-temp" type="range" min="150" max="190" step="1" value="170">
          </label>
          <label><span data-i18n="curve.U3"></span> <output id="curve-U3-out"></output>
            <input id="curve-U3" type="range" min="0" max="5" step="0.1" value="1.5">
          </label>
          <label><span data-i18n="curve.spread"></span> <output id="curve-spread-out"></output>
            <input id="curve-spread" type="range" min="0.05" max="1" step="0.05" value="0.3">
          </label>
          <label class="check"><input id="curve-nogas" type="checkbox" checked> <span data-i18n="curve.nogas"></span></label>
        </div>
        <p id="curve-info" class="result"></p>
        <div class="plot-wrap">
          <div id="curve-plot" class="plot"></div>
          <span id="curve-busy" class="busy" hidden data-i18n="busy"></span>
        </div>
      </div>

      <div class="card">
        <h3 data-i18n="motion.title"></h3>
        <div class="controls">
          <label class="grow"><span data-i18n="curve.probe"></span> <output id="curve-probe-out"></output>
            <input id="curve-probe" type="range" min="0" max="45" step="0.25" value="20">
          </label>
          <button id="motion-toggle" type="button" class="btn"></button>
        </div>
        <canvas id="motion-canvas" class="motion" role="img" aria-labelledby="motion-cap"></canvas>
        <p id="motion-cap" class="caption" data-i18n="motion.caption"></p>
      </div>

      <h3 data-i18n="curve.look.title"></h3>
      <ol class="look">
        <li data-i18n="curve.look.1"></li>
        <li data-i18n="curve.look.2"></li>
        <li data-i18n="curve.look.3"></li>
        <li data-i18n="curve.look.4"></li>
        <li data-i18n="curve.look.5"></li>
      </ol>
      <p class="note" data-i18n="curve.limits"></p>
    </section>

    <!-- 4 · From the curve to ΔE -->
    <section id="delta">
      <h2 data-i18n="delta.title"></h2>
      <p data-i18n="delta.p1"></p>
      <div class="card">
        <div class="controls">
          <label class="grow"><span data-i18n="delta.contact"></span> <output id="contact-out"></output>
            <input id="contact" type="range" min="0" max="3" step="0.1" value="1">
          </label>
          <label><span data-i18n="delta.kind"></span>
            <select id="kind">
              <option value="maxima" data-i18n="delta.maxima"></option>
              <option value="minima" data-i18n="delta.minima"></option>
            </select>
          </label>
          <label class="check" id="compare-wrap"><input id="compare" type="checkbox"> <span data-i18n="delta.compare"></span></label>
        </div>
        <div id="delta-plot" class="plot short"></div>
        <p id="delta-result" class="result"></p>
        <table id="delta-table" class="data">
          <thead><tr><th>n</th><th data-i18n="delta.col.u"></th><th data-i18n="delta.col.d"></th></tr></thead>
          <tbody></tbody>
        </table>
        <div id="compare-plot" class="plot short" hidden></div>
        <p class="caption" id="compare-cap" data-i18n="delta.compare.caption" hidden></p>
      </div>
      <p class="note" data-i18n="delta.p2"></p>
    </section>

    <!-- 5 · References -->
    <section id="refs">
      <h2 data-i18n="refs.title"></h2>
      <p class="muted" data-i18n="refs.intro"></p>
      <ol class="refs">
        <li data-i18n="refs.r1"></li>
        <li data-i18n="refs.r2"></li>
        <li data-i18n="refs.r3"></li>
        <li data-i18n="refs.r4"></li>
        <li data-i18n="refs.r5"></li>
      </ol>
    </section>
  </main>
</div>
<footer class="wrap foot"><p class="muted" data-i18n="footer"></p></footer>
</body>
</html>
```

- [ ] **Step 2: Write `css/style.css`**

```css
:root {
  --bg: #f6f7f9; --card: #ffffff; --fg: #1d232b; --muted: #5d6877; --grid: #e3e7ec;
  --border: #d7dce3; --note: #eef4ff; --c1: #2a6fdb; --c2: #c2610b; --c3: #1a8a5f;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #12161c; --card: #1a2028; --fg: #e8ecf1; --muted: #9aa5b4; --grid: #2c3541;
    --border: #2e3744; --note: #172438; --c1: #6aa5ff; --c2: #f0a050; --c3: #4cc79a;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 56px; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
a { color: var(--c1); }
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
.top { background: var(--card); border-bottom: 1px solid var(--border); }
.top-inner { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; padding-bottom: 16px; }
h1 { margin: 0; font-size: 1.6rem; line-height: 1.2; }
h2 { margin: 2.2rem 0 .6rem; font-size: 1.35rem; }
h3 { margin: 1.2rem 0 .5rem; font-size: 1.05rem; }
.subtitle, .muted { color: var(--muted); margin: .25rem 0 0; }
.lang { display: flex; gap: 4px; }
.lang button, .btn { font: inherit; padding: 6px 12px; border: 1px solid var(--border); background: var(--card); color: var(--fg); border-radius: 6px; cursor: pointer; }
.lang button[aria-pressed="true"] { background: var(--c1); border-color: var(--c1); color: #fff; }
.layout { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 32px; padding-top: 8px; padding-bottom: 32px; }
.toc { position: sticky; top: 16px; align-self: start; display: flex; flex-direction: column; gap: 4px; padding-top: 24px; }
.toc a { text-decoration: none; color: var(--muted); padding: 4px 8px; border-left: 2px solid var(--border); }
.toc a:hover { color: var(--fg); border-left-color: var(--c1); }
main { max-width: 780px; min-width: 0; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; margin: 14px 0; }
.controls { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: flex-end; margin-bottom: 8px; }
.controls label { display: flex; flex-direction: column; gap: 2px; font-size: .9rem; min-width: 150px; }
.controls label.grow { flex: 1 1 220px; }
.controls label.check { flex-direction: row; align-items: center; gap: 6px; }
.controls output { font-variant-numeric: tabular-nums; color: var(--muted); margin-left: 6px; }
select, input[type="range"] { font: inherit; width: 100%; }
select { padding: 4px 6px; background: var(--card); color: var(--fg); border: 1px solid var(--border); border-radius: 6px; }
.plot { width: 100%; height: 380px; }
.plot.short { height: 300px; }
.plot-wrap { position: relative; }
.busy { position: absolute; top: 6px; right: 10px; font-size: .85rem; color: var(--muted); }
.figure svg, .schematic { width: 100%; height: auto; display: block; }
.motion { width: 100%; height: 200px; display: block; border-radius: 6px; background: color-mix(in srgb, var(--card) 85%, var(--bg)); }
.caption { color: var(--muted); font-size: .88rem; margin: .4rem 0 0; }
.result { margin: .5rem 0 0; }
.note { background: var(--note); border-left: 3px solid var(--c1); padding: 10px 12px; border-radius: 4px; margin: 14px 0; }
.theory { font-size: .92rem; color: var(--muted); }
ol.look, ol.refs { padding-left: 1.3rem; }
ol.look li, ol.refs li { margin: .5rem 0; }
table.data { border-collapse: collapse; margin-top: 8px; font-variant-numeric: tabular-nums; }
table.data th, table.data td { border-bottom: 1px solid var(--border); padding: 3px 14px 3px 0; text-align: left; }
.foot { padding-bottom: 32px; }
/* tube schematic and level ladder */
.glass { fill: none; stroke: var(--muted); stroke-width: 2; }
.electrode { fill: var(--fg); }
.grid-el { stroke: var(--fg); stroke-width: 2; stroke-dasharray: 4 3; }
.sch-label text, .levels text { fill: var(--fg); font: 13px system-ui, sans-serif; }
.sch-arrow line { stroke: var(--muted); stroke-width: 1.2; }
.levels .axis, .levels .tick { stroke: var(--muted); stroke-width: 1; }
.levels .lv { stroke: var(--fg); stroke-width: 2; }
.levels .lv.hl { stroke: var(--c1); stroke-width: 3.5; }
.levels .ion { stroke: var(--muted); stroke-width: 1.5; stroke-dasharray: 6 4; }
.levels .arrow { stroke: var(--c1); stroke-width: 2; }
.levels .dot { fill: var(--c2); }
.levels .small { font-size: 12px; fill: var(--muted); }
.levels .hl-text { fill: var(--c1); font-weight: 600; }
@media (max-width: 860px) {
  .layout { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .toc { position: sticky; top: 0; z-index: 5; flex-direction: row; overflow-x: auto; background: var(--bg); padding: 8px 0; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .toc a { border-left: 0; border-bottom: 2px solid var(--border); }
  .top-inner { align-items: flex-start; }
  h1 { font-size: 1.3rem; }
  .plot { height: 320px; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
```

- [ ] **Step 3: Write `dom.js`, `plotstyle.js`, `main.js`**

`js/dom.js`:

```js
const SVG_NS = 'http://www.w3.org/2000/svg';

// Create an SVG element with attributes and optional text content.
export function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}
```

`js/plotstyle.js`:

```js
// Shared Plotly styling that follows the CSS variables (light/dark mode).

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function colors() {
  return {
    fg: cssVar('--fg'), muted: cssVar('--muted'), grid: cssVar('--grid'), card: cssVar('--card'),
    c1: cssVar('--c1'), c2: cssVar('--c2'), c3: cssVar('--c3'),
  };
}

export function baseLayout(extra = {}) {
  const c = colors();
  const { xaxis = {}, yaxis = {}, ...rest } = extra;
  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: c.fg, family: 'system-ui, sans-serif', size: 13 },
    margin: { l: 58, r: 16, t: 14, b: 48 },
    xaxis: { gridcolor: c.grid, zerolinecolor: c.grid, linecolor: c.muted, ...xaxis },
    yaxis: { gridcolor: c.grid, zerolinecolor: c.grid, linecolor: c.muted, ...yaxis },
    legend: { orientation: 'h', y: -0.22 },
    ...rest,
  };
}

export const plotConfig = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
};
```

`js/main.js`:

```js
import { initialLang, setLang } from './i18n.js';

function boot() {
  setLang(initialLang());
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    document.dispatchEvent(new CustomEvent('themechange'));
  });
  // Section modules are initialised here (added by later tasks).
}

boot();
```

- [ ] **Step 4: Run tests, then check the page renders in both languages**

Run:
```bash
./scripts/test.sh
S=$(mktemp -d); ./scripts/serve.sh >/dev/null 2>&1 & SRV=$!; sleep 1
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=15000 --window-size=1200,2400 --screenshot=$S/en.png "http://localhost:8000/index.html?lang=en" 2>/dev/null
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=15000 --window-size=390,2400 --screenshot=$S/de-mobile.png "http://localhost:8000/index.html?lang=de" 2>/dev/null
kill $SRV; echo $S
```
Expected: `RESULT: PASS (45)` (the key test now checks the real page). Then open `$S/en.png` and `$S/de-mobile.png` with the Read tool: texts present in the right language, math rendered (no raw `$…$`), cards visible but plots empty, mobile TOC is a horizontal bar, no horizontal scroll (page not wider than the screenshot).

- [ ] **Step 5: Commit**

```bash
git add index.html css js/main.js js/dom.js js/plotstyle.js
git commit -m "feat: add page shell, styles and language switching" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Section 1 — level ladder and thermal energy (`levels.js`)

**Files:**
- Create: `js/levels.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `LEVELS`, `thermalEnergyEV`, `wavelengthNm`, `boltzmannFactor` (`physics.js`); `formatSci` (`format.js`); `svgEl` (`dom.js`); `t`, `renderMath` (`i18n.js`); DOM ids `levels-*`.
- Produces: `initLevels()`; `renderLevels(container, gasId, tempK)`.

- [ ] **Step 1: Write the implementation**

`js/levels.js`:

```js
import { LEVELS, thermalEnergyEV, wavelengthNm, boltzmannFactor } from './physics.js';
import { formatSci } from './format.js';
import { svgEl } from './dom.js';
import { t, renderMath } from './i18n.js';

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

  // energy axis with ticks
  svg.append(svgEl('line', { x1: PAD.l, y1: y(0), x2: PAD.l, y2: y(top), class: 'axis' }));
  const step = gasId === 'hg' ? 2 : 5;
  for (let e = 0; e <= top; e += step) {
    svg.append(svgEl('line', { x1: PAD.l - 5, y1: y(e), x2: PAD.l, y2: y(e), class: 'tick' }));
    svg.append(svgEl('text', { x: PAD.l - 9, y: y(e) + 4, 'text-anchor': 'end' }, String(e)));
  }
  svg.append(svgEl('text', { x: 14, y: 14, class: 'small' }, 'E / eV'));

  // ground state, levels, ionisation limit
  svg.append(svgEl('line', { x1: X_LINE0, y1: y(0), x2: X_LINE1, y2: y(0), class: 'lv' }));
  svg.append(svgEl('text', { x: X_LINE1 + 10, y: y(0) + 4 }, `${data.ground} (${t('idea.ground')})`));
  svg.append(svgEl('line', { x1: X_LINE0, y1: y(data.ionization), x2: X_LINE1, y2: y(data.ionization), class: 'ion' }));
  svg.append(svgEl('text', { x: X_LINE1 + 10, y: y(data.ionization) + 4, class: 'small' }, `${t('idea.ion')} ${data.ionization} eV`));

  const labelYs = spread(data.levels.map((l) => y(l.e)), 15);
  data.levels.forEach((l, i) => {
    svg.append(svgEl('line', { x1: X_LINE0, y1: y(l.e), x2: X_LINE1, y2: y(l.e), class: l.highlight ? 'lv hl' : 'lv' }));
    svg.append(svgEl('text', { x: X_LINE1 + 10, y: labelYs[i] + 4, class: l.highlight ? 'hl-text' : '' }, `${l.label}  ${l.e.toFixed(2)} eV`));
  });

  // transition arrow with its energy and wavelength
  const hl = data.levels.find((l) => l.highlight);
  const ax = (X_LINE0 + X_LINE1) / 2;
  svg.append(svgEl('line', { x1: ax, y1: y(0) - 2, x2: ax, y2: y(hl.e) + 4, class: 'arrow', 'marker-end': 'url(#arrowhead)' }));
  svg.append(svgEl('text', { x: ax - 8, y: (y(0) + y(hl.e)) / 2, 'text-anchor': 'end', class: 'hl-text' },
    t('idea.arrow', { dE: hl.e.toFixed(2), nm: wavelengthNm(hl.e).toFixed(1) })));

  // thermal energy marker
  const kT = Math.min(thermalEnergyEV(tempK), top);
  svg.append(svgEl('circle', { cx: PAD.l + 34, cy: y(kT), r: 5, class: 'dot' }));
  svg.append(svgEl('text', { x: PAD.l + 44, y: y(kT) - 8, class: 'small' }, t('idea.kt', { kt: thermalEnergyEV(tempK).toPrecision(2) })));

  container.replaceChildren(svg);
}

export function initLevels() {
  const gasSel = document.getElementById('levels-gas');
  const slider = document.getElementById('levels-T');
  const out = document.getElementById('levels-T-out');
  const fig = document.getElementById('levels-svg');
  const res = document.getElementById('levels-result');

  function draw() {
    const gasId = gasSel.value;
    const tempK = Math.pow(10, parseFloat(slider.value));
    out.textContent = `${Math.round(tempK)} K`;
    renderLevels(fig, gasId, tempK);
    const hl = LEVELS[gasId].levels.find((l) => l.highlight);
    res.innerHTML = t('idea.result', {
      kt: thermalEnergyEV(tempK).toPrecision(2),
      bf: formatSci(boltzmannFactor(hl.e, tempK)),
    });
    renderMath(res);
  }

  gasSel.addEventListener('input', draw);
  slider.addEventListener('input', draw);
  document.addEventListener('langchange', draw);
  draw();
}
```

- [ ] **Step 2: Wire it into `main.js`**

Add `import { initLevels } from './levels.js';` below the first import, and replace the comment line `// Section modules are initialised here (added by later tasks).` with:

```js
  // Section modules are initialised here.
  initLevels();
```

- [ ] **Step 3: Verify visually**

Run the screenshot commands of Task 7 Step 4 (English, 1200×2400) and Read `en.png`. Expected: in section 1 a level ladder (Hg: ground, four levels with non-overlapping labels, highlighted ³P₁ with an arrow labelled "ΔE = 4.89 eV (253.5 nm)" — if the printed wavelength is 253.5 rather than 253.7 that is fine, it is computed from 4.89 eV —, dashed ionisation line at 10.44 eV, an orange dot near the bottom for kT), and a result line such as "k_BT = 0.025 eV, so the Boltzmann factor … ≈ 1.1×10⁻⁸⁴"-like value. Then run `./scripts/test.sh` (must still pass).

- [ ] **Step 4: Commit**

```bash
git add js/levels.js js/main.js
git commit -m "feat: add level ladder and thermal-energy section" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Section 2 — tube and potential profile (`tube.js`)

**Files:**
- Create: `js/tube.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `idealProfile`, `POS` (`profile.js`); `GAS` (`physics.js`); `t`, `renderMath` (`i18n.js`); `baseLayout`, `plotConfig`, `colors` (`plotstyle.js`); global `Plotly`; DOM ids `tube-*`.
- Produces: `initTube()`.

- [ ] **Step 1: Write the implementation**

`js/tube.js`:

```js
import { idealProfile, POS } from './profile.js';
import { GAS } from './physics.js';
import { t, renderMath } from './i18n.js';
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
    $('tube-U1-out').textContent = `${v.U1.toFixed(1)} V`;
    $('tube-U2-out').textContent = `${v.U2.toFixed(1)} V`;
    $('tube-U3-out').textContent = `${v.U3.toFixed(1)} V`;

    const prof = idealProfile({ ...v, gasId, gasOn: gasOn.checked });
    const c = colors();
    const dE = GAS[gasId].dE;
    const yMax = +U1.max + +U2.max + 1;

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
```

- [ ] **Step 2: Wire it into `main.js`**

Add `import { initTube } from './tube.js';` and add `initTube();` after `initLevels();`.

- [ ] **Step 3: Verify visually**

Take the Task 7 Step 4 screenshot (English, 1200×2400) and Read it. Expected: in section 2 the tube schematic (K, G₁, G₂, A with U₁/U₂/U₃ arrows) and a Plotly profile: rises to U₁ at G₁, then a sawtooth in the G₁–G₂ region (Hg, U₂ = 12 V → two drops at the dashed ΔE line), then a short falling segment; the result line reads "✔ The electron reaches the anode with 0.70 eV left." Run `./scripts/test.sh`.

- [ ] **Step 4: Commit**

```bash
git add js/tube.js js/main.js
git commit -m "feat: add tube section with idealised potential profile" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Section 3 — shared store, worker and the I_A(U₂) curve

**Files:**
- Create: `js/store.js`, `js/worker.js`, `js/compute.js`, `js/curve.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `simulate` (`montecarlo.js`); `findExtrema`, `EXTREMA_OPTIONS` (`analysis.js`); `meanFreePath`, `hgVaporPressure` (`physics.js`); `t`, `renderMath`; `baseLayout`, `plotConfig`, `colors`; DOM ids `curve-*`.
- Produces:
  - `store.js`: `state` (object: `gas, tempC, U3, spread, contact, probeU2, showNoGas, extremaKind, compare, result, reference`), `update(patch)` (merges and calls every subscriber with `Object.keys(patch)`), `subscribe(fn) -> unsubscribe`, `simParams() -> params for simulate()` (U2 range 0–45 step 0.25 for Hg, 0–90 step 0.5 for Ne, 3000 electrons, seed 1), `SIM_KEYS`.
  - `state.result = {U2, IA, params}` and `state.reference = {U2, IA} | null`, set by `curve.js` after each simulation.
  - `compute.js`: `computeCurve(params) -> Promise<{U2,IA}>`.
  - `curve.js`: `initCurve()`.

- [ ] **Step 1: Write the store, worker and compute client**

`js/store.js`:

```js
// Shared UI state with a tiny pub-sub. Sections read `state` and call `update()`.

export const state = {
  gas: 'hg', tempC: 170, U3: 1.5, spread: 0.3, contact: 1.0,
  probeU2: 20, showNoGas: true, extremaKind: 'maxima', compare: false,
  result: null,    // {U2, IA, params} of the latest simulation
  reference: null, // {U2, IA} curve without gas, or null
};

// Keys that change the simulated curve.
export const SIM_KEYS = ['gas', 'tempC', 'U3', 'spread', 'contact', 'showNoGas'];

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

export function simParams() {
  const hg = state.gas === 'hg';
  return {
    gas: state.gas, tempC: state.tempC, U3: state.U3, spread: state.spread, contact: state.contact,
    U2min: 0, U2max: hg ? 45 : 90, U2step: hg ? 0.25 : 0.5, electrons: 3000, seed: 1,
  };
}
```

`js/worker.js`:

```js
import { simulate } from './montecarlo.js';

self.onmessage = (e) => {
  const { id, params } = e.data;
  self.postMessage({ id, result: simulate(params) });
};
```

`js/compute.js`:

```js
// Runs simulate() in a module Web Worker; falls back to the main thread if workers are unavailable.
import { simulate } from './montecarlo.js';

let worker = null;
let failed = false;
let seq = 0;
const pending = new Map();

function getWorker() {
  if (failed) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (p) { pending.delete(e.data.id); p.resolve(e.data.result); }
    };
    worker.onerror = () => {
      failed = true;
      worker = null;
      for (const p of pending.values()) p.fallback();
      pending.clear();
    };
  } catch {
    failed = true;
    worker = null;
  }
  return worker;
}

export function computeCurve(params) {
  return new Promise((resolve) => {
    const w = getWorker();
    if (!w) { resolve(simulate(params)); return; }
    const id = ++seq;
    pending.set(id, { resolve, fallback: () => resolve(simulate(params)) });
    w.postMessage({ id, params });
  });
}
```

- [ ] **Step 2: Write `curve.js`**

```js
import { state, update, subscribe, simParams, SIM_KEYS } from './store.js';
import { computeCurve } from './compute.js';
import { findExtrema, EXTREMA_OPTIONS } from './analysis.js';
import { meanFreePath, hgVaporPressure } from './physics.js';
import { t, renderMath } from './i18n.js';
import { baseLayout, plotConfig, colors } from './plotstyle.js';

// Per-gas defaults for the U3 and probe sliders.
const GAS_UI = { hg: { U3max: 5, U3: 1.5, probe: 20, U2max: 45 }, ne: { U3max: 15, U3: 7, probe: 45, U2max: 90 } };

export function initCurve() {
  const $ = (id) => document.getElementById(id);
  const gasSel = $('curve-gas'), tempWrap = $('curve-temp-wrap'), temp = $('curve-temp');
  const U3 = $('curve-U3'), spread = $('curve-spread'), noGas = $('curve-nogas'), probe = $('curve-probe');
  const plot = $('curve-plot'), info = $('curve-info'), busy = $('curve-busy');
  let token = 0, timer = 0, clickBound = false;

  function syncControls() {
    const ui = GAS_UI[state.gas];
    gasSel.value = state.gas;
    tempWrap.hidden = state.gas !== 'hg';
    U3.max = ui.U3max; probe.max = ui.U2max;
    temp.value = state.tempC; U3.value = state.U3; spread.value = state.spread;
    noGas.checked = state.showNoGas; probe.value = state.probeU2;
    $('curve-temp-out').textContent = `${state.tempC} °C`;
    $('curve-U3-out').textContent = `${(+state.U3).toFixed(1)} V`;
    $('curve-spread-out').textContent = `${(+state.spread).toFixed(2)} eV`;
    $('curve-probe-out').textContent = `${(+state.probeU2).toFixed(2)} V`;
  }

  function updateInfo() {
    if (state.gas === 'hg') {
      info.innerHTML = t('curve.info.hg', {
        T: state.tempC, p: hgVaporPressure(state.tempC).toFixed(0),
        lam: (meanFreePath('hg', state.tempC) * 1e6).toFixed(1),
      });
    } else {
      info.innerHTML = t('curve.info.ne', { lam: (meanFreePath('ne', 20) * 1e6).toFixed(1) });
    }
    renderMath(info);
  }

  async function recompute() {
    const my = ++token;
    busy.hidden = false;
    const p = simParams();
    const res = await computeCurve(p);
    const ref = state.showNoGas ? await computeCurve({ ...p, noGas: true }) : null;
    if (my !== token) return; // a newer request superseded this one
    busy.hidden = true;
    update({ result: { ...res, params: p }, reference: ref });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(recompute, 120);
  }

  function draw() {
    const r = state.result;
    if (!r) return;
    const c = colors();
    const e = findExtrema(r.U2, r.IA, EXTREMA_OPTIONS[r.params.gas]);
    const data = [];
    if (state.showNoGas && state.reference) {
      data.push({ x: state.reference.U2, y: state.reference.IA, mode: 'lines', name: t('curve.legend.nogas'), line: { color: c.muted, dash: 'dash', width: 2 }, hoverinfo: 'skip' });
    }
    data.push({ x: r.U2, y: r.IA, mode: 'lines', name: t('curve.legend.gas'), line: { color: c.c1, width: 3 }, hovertemplate: 'U₂ = %{x:.2f} V<br>I = %{y:.3f}<extra></extra>' });
    data.push({ x: e.maxima.map((m) => m.x), y: e.maxima.map((m) => m.y), mode: 'markers', name: t('curve.legend.max'), marker: { symbol: 'triangle-up', size: 10, color: c.c3 }, hovertemplate: 'U₂ = %{x:.2f} V<extra></extra>' });
    data.push({ x: e.minima.map((m) => m.x), y: e.minima.map((m) => m.y), mode: 'markers', name: t('curve.legend.min'), marker: { symbol: 'triangle-down', size: 10, color: c.c2 }, hovertemplate: 'U₂ = %{x:.2f} V<extra></extra>' });
    const layout = baseLayout({
      xaxis: { title: { text: t('curve.axis.x') }, range: [0, r.U2[r.U2.length - 1]] },
      yaxis: { title: { text: t('curve.axis.y') }, range: [0, 1.02] },
      shapes: [{ type: 'line', xref: 'x', yref: 'paper', x0: state.probeU2, x1: state.probeU2, y0: 0, y1: 1, line: { color: c.fg, width: 1, dash: 'dot' } }],
    });
    Plotly.react(plot, data, layout, plotConfig).then(() => {
      if (clickBound) return;
      clickBound = true;
      plot.on('plotly_click', (ev) => {
        const x = ev.points && ev.points[0] ? ev.points[0].x : null;
        if (x !== null) update({ probeU2: Math.round(x * 4) / 4 });
      });
    });
  }

  gasSel.addEventListener('input', () => {
    const g = gasSel.value;
    update({ gas: g, U3: GAS_UI[g].U3, probeU2: GAS_UI[g].probe });
  });
  temp.addEventListener('input', () => update({ tempC: +temp.value }));
  U3.addEventListener('input', () => update({ U3: +U3.value }));
  spread.addEventListener('input', () => update({ spread: +spread.value }));
  noGas.addEventListener('input', () => update({ showNoGas: noGas.checked }));
  probe.addEventListener('input', () => update({ probeU2: +probe.value }));

  subscribe((keys) => {
    syncControls();
    if (keys.some((k) => SIM_KEYS.includes(k))) { updateInfo(); schedule(); }
    else if (keys.some((k) => ['result', 'reference', 'probeU2'].includes(k))) draw();
  });
  document.addEventListener('langchange', () => { updateInfo(); draw(); });
  document.addEventListener('themechange', draw);

  syncControls();
  updateInfo();
  recompute();
}
```

- [ ] **Step 3: Wire it into `main.js`**

Add `import { initCurve } from './curve.js';` and `initCurve();` after `initTube();`.

- [ ] **Step 4: Verify with a headless DOM dump and a screenshot**

Run:
```bash
S=$(mktemp -d); ./scripts/serve.sh >/dev/null 2>&1 & SRV=$!; sleep 1
google-chrome --headless=new --no-sandbox --disable-gpu --virtual-time-budget=30000 --enable-logging=stderr --v=0 --window-size=1200,3000 --screenshot=$S/en.png "http://localhost:8000/index.html?lang=en" 2>$S/log.txt
grep -E "CONSOLE.*(rror|Uncaught)" $S/log.txt || echo "no console errors"
kill $SRV; echo $S
```
Expected: `no console errors`. Read `$S/en.png`: in section 3 the plot shows the Hg curve at 170 °C — a rising sawtooth-like curve with 6–8 triangle-up maxima and triangle-down minima spaced ≈ 4.9 V, a dashed grey no-gas curve above it, the dotted probe line near 20 V, and the info line "Hg at 170 °C: vapour pressure 817 Pa, mean free path λ ≈ 37.4 µm"-like text (λ in the range 20–60 µm; Hg 170 °C ≈ 18.7 µm with σ = 4e-19 — accept anything physically consistent with 1/(nσ)). If the curve looks flat or empty, the simulation failed: open the log and fix before continuing. Run `./scripts/test.sh`.

- [ ] **Step 5: Commit**

```bash
git add js/store.js js/worker.js js/compute.js js/curve.js js/main.js
git commit -m "feat: add shared store, worker client and the simulated I_A(U2) curve" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Section 3 — electron animation and excitation layers (`motion.js`)

**Files:**
- Create: `js/motion.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `state`, `subscribe`, `simParams` (`store.js`); `traceElectrons` (`montecarlo.js`); `GAS`; `t`; `cssVar` (`plotstyle.js`); DOM ids `motion-canvas`, `motion-toggle`.
- Produces: `initMotion()`.

- [ ] **Step 1: Write the implementation**

`js/motion.js`:

```js
import { state, subscribe, simParams } from './store.js';
import { traceElectrons } from './montecarlo.js';
import { GAS } from './physics.js';
import { t } from './i18n.js';
import { cssVar } from './plotstyle.js';

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
    const x0 = 28, x1 = w - 28, y0 = 22, th = h - 46;
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
    ctx.fillText(t(state.gas === 'ne' ? 'motion.glow.ne' : 'motion.glow.hg'), x0 + 2, h - 8);
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
```

- [ ] **Step 2: Wire it into `main.js`**

Add `import { initMotion } from './motion.js';` and `initMotion();` after `initCurve();`.

- [ ] **Step 3: Verify visually**

Take the Task 10 Step 4 screenshot and Read it. Expected: below the plot a canvas with a tube rectangle, labels G₁/G₂, ~36 coloured dots (blue → red), violet vertical bands (Hg at U₂ = 20 V: bands at roughly equal spacing, 4 layers), and the caption "Violet: excitation zones (UV at 253.7 nm, invisible)". Then verify the Ne case and the play button: run a Chrome headless dump with the page at `?lang=en`, which cannot click; instead temporarily confirm Ne by changing nothing in the code and reasoning from the unit test "Ne excitations cluster in separated layers" (already passing). Run `./scripts/test.sh` and check there are no console errors as in Task 10 Step 4.

- [ ] **Step 4: Commit**

```bash
git add js/motion.js js/main.js
git commit -m "feat: add electron animation with excitation layers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Section 4 — spacings and ΔE (`spacing.js`)

**Files:**
- Create: `js/spacing.js`
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `state`, `update`, `subscribe`, `simParams` (`store.js`); `findExtrema`, `spacings`, `mean`, `EXTREMA_OPTIONS` (`analysis.js`); `computeCurve` (`compute.js`); `GAS`; `t`, `renderMath`; `baseLayout`, `plotConfig`, `colors`; DOM ids `contact*`, `kind`, `compare*`, `delta-*`.
- Produces: `initSpacing()`.

- [ ] **Step 1: Write the implementation**

`js/spacing.js`:

```js
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
    const series = [];
    for (const T of COMPARE_TEMPS) {
      const res = await computeCurve({ ...base, tempC: T });
      series.push({ T, list: extremaOf(res, 'hg') });
    }
    if (my !== cmpToken) return;
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
```

- [ ] **Step 2: Wire it into `main.js`**

Add `import { initSpacing } from './spacing.js';` and `initSpacing();` after `initMotion();`.

- [ ] **Step 3: Verify visually**

Take the Task 10 Step 4 screenshot (height 3600 now: `--window-size=1200,3600`) and Read it. Expected in section 4: a plot of U₂⁽ⁿ⁾ versus n with markers that follow the dotted slope line closely (parallel, offset allowed), a result line "Mean spacing …: 4.9x V, so ΔE … ≈ 4.9x eV (the model was run with ΔE = 4.9 eV)", and a table with n, U₂⁽ⁿ⁾, spacing columns (first spacing "–"). The compare plot stays hidden (checkbox off). Run `./scripts/test.sh` and the console-error check.

- [ ] **Step 4: Commit**

```bash
git add js/spacing.js js/main.js
git commit -m "feat: add spacing analysis section (curve to delta E)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Smoke test, interaction check and release checks

**Files:**
- Create: `scripts/smoke.sh`
- Modify: `README.md` (only if a command changed)

**Interfaces:**
- Consumes: the whole page. `./scripts/smoke.sh` exits 0 iff the EN and DE pages render without console errors and with the expected structure.

- [ ] **Step 1: Write the smoke script**

`scripts/smoke.sh`:

```bash
#!/usr/bin/env bash
# Page-level smoke test: renders index.html in headless Chrome (EN and DE) and checks the DOM.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=${PORT:-8792}
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT
sleep 1
CHROME=${CHROME:-google-chrome}
TMP=$(mktemp -d)
fail=0
check() { # description, command
  if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi
}
for lang in en de; do
  "$CHROME" --headless=new --no-sandbox --disable-gpu --virtual-time-budget=40000 \
    --enable-logging=stderr --v=0 --dump-dom "http://localhost:$PORT/index.html?lang=$lang" \
    >"$TMP/$lang.html" 2>"$TMP/$lang.log" || true
  check "[$lang] <html lang> is $lang" "grep -q '<html lang=\"$lang\"' $TMP/$lang.html"
  check "[$lang] three Plotly plots rendered" "[ \$(grep -o 'js-plotly-plot' $TMP/$lang.html | wc -l) -ge 3 ]"
  check "[$lang] level ladder SVG present" "grep -q '<svg[^>]*class=\"levels\"' $TMP/$lang.html"
  check "[$lang] KaTeX rendered" "grep -q 'class=\"katex\"' $TMP/$lang.html"
  check "[$lang] no unresolved {placeholders}" "! grep -E '\{(kt|bf|T|p|lam|d|model|E|dE|nm)\}' $TMP/$lang.html"
  check "[$lang] no console errors" "! grep -E 'CONSOLE.*(rror|Uncaught)|Failed to load resource' $TMP/$lang.log"
done
rm -rf "$TMP"
exit $fail
```

- [ ] **Step 2: Run unit tests and smoke test**

Run:
```bash
chmod +x scripts/smoke.sh
./scripts/test.sh
./scripts/smoke.sh
```
Expected: `RESULT: PASS (45)`; smoke prints twelve `ok` lines and exits 0. If a check fails, fix the cause (do not weaken the check): e.g. "no unresolved placeholders" failing means a `t()` call is missing a variable.

- [ ] **Step 3: Interaction check (Ne, temperature, contact, compare, language)**

Chrome headless cannot click, so drive the page with the state in the URL is not supported; instead use the Claude-in-Chrome tools or ask the human partner to open `./scripts/serve.sh` and verify, in a real browser, this checklist (report each item as pass/fail):
1. Section 3: switching Gas to Neon → plot shows maxima ≈ 19 V apart over 0–90 V, the temperature slider disappears, the animation shows orange layers, info line shows the Ne λ.
2. Section 3: moving the Hg temperature slider 150 → 190 °C → structure becomes more contrasted; the info line changes (λ decreases).
3. Section 3: clicking on the plot moves the dotted probe line and the animation follows; Pause/Play works.
4. Section 4: moving the contact-potential slider shifts the first position, the mean spacing stays ≈ constant; ticking "Compare Hg at 150, 170 and 190 °C" shows a third plot with three lines; with Neon selected the checkbox is hidden.
5. EN ↔ DE toggle updates all texts, plot axis titles and the animation caption; reload keeps the choice.
6. Narrow window (390 px): no horizontal scroll, sticky TOC bar scrolls horizontally, plots fit.
7. Dark mode (OS or browser emulation): text and plots remain legible.

- [ ] **Step 4: Offline check**

Run:
```bash
grep -rEn "https?://" index.html css/style.css js/*.js | grep -v 'href="https\?://[^"]*"[^>]*target="_blank"' | grep -vE "www\.w3\.org|doi\.org|nobelprize|nist\.gov|jcgm|wiley|//.*(http|https)" || echo "no runtime remote URLs"
```
Expected: `no runtime remote URLs` (external `<a href>` links in the strings are references only; `www.w3.org` is the SVG namespace string). Any other hit is a remote runtime dependency and must be removed.

- [ ] **Step 5: Commit and report**

```bash
git add scripts/smoke.sh README.md
git commit -m "test: add page-level smoke test for EN and DE" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git log --oneline | head -20
```
Report to the human partner: test counts, smoke result, the manual checklist outcome, and the open items from the spec (German proofreading, model constants vs. the manual and Rapior et al., Hg vapour-pressure fit vs. a published table, hosting location).
