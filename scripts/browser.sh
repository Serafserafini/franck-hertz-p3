#!/usr/bin/env bash
# Start the page server (8000) and a headless Chrome with a debugging port (9333) for scripts/cdp.py.
cd "$(dirname "$0")/.."
curl -s -o /dev/null localhost:8000/index.html || (setsid nohup python3 -m http.server 8000 >/dev/null 2>&1 &)
curl -s -o /dev/null localhost:9333/json/version || (setsid nohup "${CHROME:-google-chrome}" --headless=new --no-sandbox --disable-gpu \
  --remote-debugging-port=9333 --user-data-dir="${TMPDIR:-/tmp}/fh-chrome-profile" about:blank >/dev/null 2>&1 &)
sleep 2
