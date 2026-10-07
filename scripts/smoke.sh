#!/usr/bin/env bash
# Page-level smoke test: renders index.html in headless Chrome (EN and DE) and checks the DOM.
# Uses ?sync so the simulation runs on the main thread (workers do not run under virtual time).
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
  "$CHROME" --headless=new --no-sandbox --disable-gpu --virtual-time-budget=60000 \
    --enable-logging=stderr --v=0 --dump-dom "http://localhost:$PORT/index.html?lang=$lang&sync" \
    >"$TMP/$lang.html" 2>"$TMP/$lang.log" || true
  check "[$lang] <html lang> is $lang" "grep -q '<html lang=\"$lang\"' $TMP/$lang.html"
  check "[$lang] three Plotly plots rendered" "[ \$(grep -o 'js-plotly-plot' $TMP/$lang.html | wc -l) -ge 3 ]"
  check "[$lang] level ladder SVG present" "grep -q '<svg[^>]*class=\"levels\"' $TMP/$lang.html"
  check "[$lang] KaTeX rendered" "grep -q 'class=\"katex\"' $TMP/$lang.html"
  check "[$lang] spacing table filled" "[ \$(grep -o '<tr><td>' $TMP/$lang.html | wc -l) -ge 4 ]"
  check "[$lang] no unresolved {placeholders}" "! grep -E '>[^<]*\{(kt|bf|T|p|lam|d|model|E|dE|nm)\}' $TMP/$lang.html"
  check "[$lang] no console errors" "! grep -E 'CONSOLE.*(rror|Uncaught)|Failed to load resource' $TMP/$lang.log"
done
rm -rf "$TMP"
exit $fail
