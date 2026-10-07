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
  --dump-dom "http://localhost:$PORT/tests/index.html" 2>/dev/null | awk '/<pre id="out">/{f=1} f{print} f&&/<\/pre>/{f=0}')
echo "$OUT" | sed 's/<[^>]*>//g'
echo "$OUT" | grep -q 'RESULT: PASS'
