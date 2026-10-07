# Franck–Hertz (P3) — Interactive explainer page: design spec

Date: 2026-10-07
Course: Physical Chemistry Lab 165.008, 3rd-year BSc Chemistry, TU Wien

## 1. Purpose and scope

A static, interactive web page that helps students **understand** the Franck–Hertz
experiment (P3) before the lab day: the principle, the tube, the physics behind the
I_A(U₂) curve, and how ΔE is obtained from it. Explanations are simple but always
tied to the underlying theory, with clickable references.

**In scope:** concept explanation, interactive simulation, plots, clickable references.

**Explicitly out of scope** (decided with the supervisor):
- Safety information and lab rules.
- Operation of instruments (control unit, oscilloscope, XY recorder, CAL/VAR, R factor, furnace) and typical instrument settings.
- Anything that assesses students: uncertainty budgets (type A/B), fit-with-error-bars exercises, the pre-lab Task 1 data set or its supervisor's key, scoring, dates, deadlines.

## 2. Decisions

| Topic | Decision |
|---|---|
| Language | Bilingual EN/DE with a toggle (default EN) |
| Simulation | 1D Monte Carlo of electrons; the curve emerges from the model |
| Delivery | Static multi-file folder, no backend, no build step |
| Libraries | Plotly (basic bundle) + KaTeX, vendored locally (works offline, no CDN) |
| Layout | Single scrolling page, side table of contents, language toggle in header |

## 3. Page structure

### 3.1 The idea
Energy-level ladder for Hg and Ne, highlighting Hg 6¹S₀→6³P₁ (4.9 eV, 253.7 nm). Comparison
with thermal energy k_BT to show why thermal excitation is negligible and an electron
impact is needed. Short historical note (1914; initial misreading as ionisation, Hg
ionisation at 10.4 eV).

### 3.2 The tube
Schematic of K, G₁, G₂, A with sliders for U₁, U₂, U₃. Below it, the potential-energy
profile along the tube showing electron kinetic energy, where it is lost in an
inelastic collision, and whether it can overcome the retarding voltage U₃ to reach A.
Roles: U_K heating, U₁ suction/control, U₂ accelerating (E_kin = e₀U₂), U₃ counter voltage.

### 3.3 The curve (main tool)
Monte Carlo 1D simulator.
- Controls: gas (Ne / Hg), Hg temperature (150–190 °C → vapour pressure → mean free path λ), U₃, thermal energy spread of emitted electrons, U₂ sweep range.
- Output: I_A(U₂) plot with maxima and minima marked; toggle for "no gas" reference curve.
- Animation panel: electrons travelling in the tube; luminous layers for Ne (excitation zones).
- Teaches: why current drops at U₂⁽¹⁾ and rises again, why further extrema appear, why minima are not zero and maxima not sharp, and the effect of λ (temperature).

### 3.4 From curve to ΔE
Works on the *simulated* curve from 3.3 (conceptual, not a graded evaluation):
- Extracts extrema positions, shows spacings U₂⁽ⁿ⁾ − U₂⁽ⁿ⁻¹⁾ and ΔE = e₀·ΔU.
- Shows why spacings, not absolute positions, are used (contact potential shifts all positions equally; adjustable offset demonstrates it).
- Shows how temperature (via λ) shifts and distorts the spacings.
- No uncertainty propagation, no fit-with-errors exercise.

### 3.5 References
Clickable list: Rapior, Sengstock, Baev, *New features of the Franck–Hertz experiment*, Am. J. Phys. **74**, 423 (2006) (DOI link); Wedler/Freund, *Lehrbuch der Physikalischen Chemie*; NIST Atomic Spectra Database for level data. Inline "Theory ↗" links beside concepts in 3.1–3.4 point to the relevant reference or section.

## 4. Architecture

```
index.html          page skeleton, sections, TOC
css/style.css       layout, theming
js/i18n.js          EN/DE strings, toggle, persistence (try/catch localStorage)
js/physics.js       constants, level data, λ(T) / vapour-pressure model
js/montecarlo.js    1D electron transport; runs in a Web Worker
js/worker.js        worker wrapper (message in: params; out: curve)
js/tube.js          section 3.2 schematic + potential profile
js/curve.js         section 3.3 UI, Plotly plot, animation
js/analysis.js      section 3.4 extrema detection and spacings
vendor/             plotly-basic.min.js, katex (css, js, fonts)
```

Units and interfaces:
- `physics.js` has no DOM; exports pure functions (vapour pressure, λ, level energies).
- `montecarlo.js` is pure: `simulate(params) -> {U2[], IA[]}`; testable in Node.
- `analysis.js` is pure: `findExtrema(U2, IA) -> {maxima[], minima[]}`, `spacings(list)`.
- UI modules (`tube.js`, `curve.js`) consume these and own their DOM.
- `i18n.js` supplies strings by key; no UI text is hard-coded in other modules.

Data flow: slider change → debounce → worker `simulate(params)` → curve data →
Plotly plot + `analysis.js` extrema → section 3.4 table/plot.

## 5. Physical model (Monte Carlo, summary)

Electrons are emitted at K with a thermal spread, accelerated uniformly over the
G₁–G₂ gap under U₂, and undergo collisions with free path drawn from an exponential
distribution with mean λ. At each collision: if E_kin ≥ ΔE, an inelastic event (loss of
ΔE, excitation counted) occurs with a given probability; otherwise elastic (negligible
energy loss, ~2m_e/M). After G₂, an electron reaches A if its remaining E_kin ≥ e₀U₃.
I_A ∝ fraction of electrons reaching A. Parameters (cross-sections, gap length, ΔE for
Hg 4.9 eV and Ne ≈ 19 eV, λ(T) from Hg vapour pressure) live in `physics.js` and are
documented with sources. Absolute realism is secondary to reproducing the qualitative
behaviour discussed by Rapior et al. (temperature effect on shape and extrema).

## 6. Error handling and robustness

- Worker failure or unsupported browser: show a clear message and keep the static explanation usable.
- `localStorage` access wrapped in try/catch; page works without it.
- Parameter ranges clamped in the UI; invalid combinations (e.g. U₃ > U₂ range) handled without exceptions.
- Responsive layout down to phone width; no horizontal page scroll.

## 7. Testing

- Node unit tests for `physics.js`, `montecarlo.js` (seeded RNG: first extremum near ΔE/e₀ for Hg, spacing ≈ 4.9 V at 170 °C, no-gas curve monotonic) and `analysis.js` (extrema on synthetic curves).
- Manual browser check of both languages, all sliders, and offline loading (no network requests).
- i18n check: every key present in both EN and DE.

## 8. Open items

- German texts are drafted by the assistant and should be proofread by the supervisor.
- Model constants (cross-sections, gap geometry) are tuned to give plausible curves, not fitted to measured data; to be reviewed against the manual (*Arbeitsanleitung Franck-Hertz-Versuch*) and Rapior et al.
- Hosting location (TUWEL link, TU webspace, or GitHub Pages) is not decided; the folder is host-agnostic.

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
