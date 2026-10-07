# Franck–Hertz (P3) — interactive introduction

Bilingual (EN/DE) static page that explains the Franck–Hertz experiment with closed-form theory (no Monte Carlo): levels and term schemes (H vs Hg), tube and potentials, the experiment, the I_A(U₂) curve without and with gas, why there are several peaks, the glowing stripes and why the minima do not reach zero.

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
./scripts/browser.sh      # server + debuggable Chrome, then: python3 scripts/cdp.py URL --eval JS --shot FILE
```

## Vendored libraries
`./scripts/vendor.sh` downloads Plotly (basic bundle) and KaTeX into `vendor/` (already committed).

## Structure
See `docs/superpowers/plans/2026-10-07-franck-hertz-page.md` (file structure) and the spec in `docs/superpowers/specs/`.
