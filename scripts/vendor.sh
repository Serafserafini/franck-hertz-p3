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
