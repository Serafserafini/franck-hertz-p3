#!/usr/bin/env bash
# Serve the page locally: http://localhost:8000
cd "$(dirname "$0")/.."
exec python3 -m http.server "${PORT:-8000}"
