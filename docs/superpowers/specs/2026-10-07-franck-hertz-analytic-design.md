# Franck–Hertz (P3) — analytic redesign (branch `analytic`): design spec

Date: 2026-10-07
Supersedes: `2026-10-07-franck-hertz-page-design.md` for the content/model of this branch (language, hosting, libraries, scope exclusions and the module rules of that spec still apply unless stated here).

## 1. Purpose and decisions

A trial redesign of the page. It explains the Franck–Hertz experiment along a fixed teaching sequence (section 3) using **closed-form theory only — no Monte Carlo**. Understanding the idea matters more than quantitative realism.

| Topic | Decision |
|---|---|
| Model | Analytic: constant field between the grids, ideal step/sawtooth limit, and a closed-form "real" model with a finite inelastic mean free path |
| Randomness | None. Animations use deterministic stratified delays (section 5.5), so every frame and reload is identical |
| Branch | Work on branch `analytic`; the published site (`main`, Monte Carlo version) is untouched until the user decides |
| Scope | Unchanged: physics understanding only; no safety, instrument operation, grading, uncertainty budgets, Task-1 data, dates or points |
| Language | EN/DE toggle, `?lang=` override (unchanged) |
| Libraries | Plotly basic + KaTeX, vendored (unchanged) |
| Contact potential | Dropped. `U1` shifts the absolute peak positions (energy at G₁ is `e0·U1`), which already shows why spacings, not positions, give ΔE |
| Removed | `montecarlo.js`, `worker.js`, `compute.js`, `motion.js`, `curve.js`, `spacing.js`, `store.js` pieces tied to the simulation, the separate "curve to ΔE" section (merged into section 8 of the page) |

## 2. Notation

`L` = distance G₁–G₂, normalised to 1; `x ∈ [0,1]` position in the gap. `U1, U2, U3` as before; `ΔE` excitation energy in eV (Hg 4.9, Ne 19.0). Kinetic energy at G₁ is `E0 = U1` (energy gained K→G₁; requires `U1 < ΔE`, slider limited accordingly). Field in the gap `F = U2` (eV per unit `x`): the two grids are a parallel-plate capacitor, so the potential is linear, `E(x) = U1 + U2·x` between collisions. `λ` = inelastic mean free path in units of `L`.

## 3. Page structure (teaching sequence)

1. **Energy levels and orbitals.** Level ladder (existing design) with a temperature slider and a `k_BT` marker, plus an orbital-box diagram of the valence electrons: Hg `6s²` → `6s¹6p¹` (³P₁); Ne `2p⁶` → `2p⁵3s/3p` (arrows in boxes, ground vs excited).
2. **The experiment scheme.** SVG tube with K, G₁, G₂, A, three voltage sources drawn with correct `+`/`−` signs, and underneath the electrostatic potential along the tube (stepped levels) with the voltage of each zone labelled and what the difference means.
3. **What the three voltages do.** Three cards: *suction* `U1` (K→G₁: extracts electrons, makes the emission current independent of `U2`), *acceleration* `U2` (G₁→G₂: gives the energy that can be lost in collisions), *deceleration* `U3` (G₂→A: only electrons with `E > e0·U3` get through).
4. **How the experiment is run.** Set `U1`, `U3`, keep them constant, vary only `U2`. A play/scrub control sweeps `U2` and draws `I_A` progressively (using the model of 5.3) next to a live read-out of `U2` and `I_A`, with a short list of what is observed on `I_A`.
5. **`I_A` without gas.** Plot (real model, no gas) with a `U2` slider and an electron animation: electrons accelerate in the gap (colour by energy) and, if `E < e0·U3` at G₂, turn back in the decelerating region.
6. **Ideal vs real, no gas.** Overlay of the ideal step function (`I = 1` for `U1+U2 ≥ U3`) and the real smooth rise `1 − √(U3/E)`, with a short explanation (scattered/oblique electrons need extra energy to pass the retarding field; spread of initial energies).
7. **`I_A` with gas.** Plot with a `U2` marker (slider) and, below, kinetic energy vs position at that `U2` with sliders for `U1`, `U2`, `U3`: ideal sawtooth plus the expected energy of the real model; overlay toggle for the ideal comb-shaped `I_A`.
8. **Why several peaks.** The linear potential between the grids; excitation positions `x_n = (n·ΔE − U1)/U2` (ideal) drawn on the tube for the chosen `U2`, with a slider that shows new zones entering at `U2 = n·ΔE − U1`; read-out of peak spacing `= ΔE` and of how `U1` shifts all positions equally.
9. **Illuminated stripes.** Animation of the stratified electrons and the glow strip given by the excitation density `u(x)` (Ne visible orange, Hg UV violet/invisible), with a `U2` slider.
10. **Why the minima do not reach zero.** Scheme/animation with a gas-density slider (Hg temperature; Ne pressure): coloured electrons (excited vs passing through), a bar with the fraction not colliding, and the curve minimum depth vs `λ`.
11. **References** (unchanged list without the VIM item).

Each explanatory section keeps one "Theory ↗" link.

## 4. Analytic model

### 4.1 Ideal (λ → 0)
Collision as soon as `E = ΔE`. Collision positions: `x_n = (n·ΔE − U1)/U2` for `n = 1, 2, …` while `x_n < 1`. After `m` collisions the energy at G₂ is `E_f = U1 + U2 − m·ΔE`, i.e. a sawtooth in `x` (energy resets to 0 at each `x_n`) and in `U2`. The electron reaches the anode iff `E_f ≥ U3`, so the ideal current is a step comb: `I_ideal = 1` if `E_f ≥ U3` else 0. Without gas `E_f = U1 + U2`; `I_ideal = 1` iff `U1 + U2 ≥ U3`.

### 4.2 Transmission (real, with and without gas)
`T(E) = 1 − √(U3/E)` for `E > U3`, else 0 (isotropic scattering assumption; the same assumption makes real maxima rounded and the no-gas curve a smooth rise).

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

## 5. Architecture

Pure modules (no DOM), unit-tested in headless Chrome as before:
- `physics.js` — constants, `GAS {dE}`, `LEVELS`, orbital configurations, vapour pressure, `lambdaOverL(gasId, density)`.
- `analytic.js` — `thresholds`, `idealCurrent`, `idealSawtooth`, `noGasCurrent`, `eventProbabilities`, `realCurrent`, `realCurve`, `missedFraction`, `excitationDensity`, `expectedEnergyProfile`, `quantileElectrons`, `positionAlong`, `noGasPath`.
- `profile.js` — existing ideal profile (kept), extended with the expected-energy curve of the real model.
- `analysis.js`, `format.js`, `strings*.js`, `i18n.js`, `dom.js`, `plotstyle.js` — kept (strings rewritten).

UI modules, one per section: `levels.js` (+orbitals), `schematic.js`, `roles.js`, `sweep.js`, `nogas.js`, `withgas.js`, `peaks.js`, `glow.js`, `minima.js`; a small shared `store.js` for the gas and `U1/U2/U3/density` state where sections are linked (7–10).

## 6. Testing

Unit tests (headless Chrome): ideal comb/sawtooth values and limits; `U1 ≥ ΔE` rejected; transmission; real model normalisation (`P0 + Σ weights = 1`); `λ → 0` converges to the ideal curve (max difference < 0.05 away from edges); no-gas curve monotonic; peak spacing ≈ ΔE for `λ ≤ 0.02`; minimum floor increases with `λ`; `q_n` formula; density integrates to the expected number of excitations; quantile electrons deterministic and within `[0,1]`; i18n key parity, placeholder parity, scope-guard words, `data-i18n` keys present; accessibility attributes; no remote resources. Page smoke test EN/DE; real-time browser check of each interactive section (sliders, language, mobile 390 px, dark mode).

## 7. Open items

- Calibration `λ170 = 0.03` and the Erlang model's drift of the peak spacing at larger `λ` should be reviewed against the Anleitung and Rapior et al.
- German texts remain drafts for proofreading.
- Publication: the `analytic` branch is not deployed; a preview (for example under a sub-folder of the published site) is the user's call.
