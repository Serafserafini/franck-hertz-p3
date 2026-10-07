const SVG_NS = 'http://www.w3.org/2000/svg';

// Create an SVG element with attributes and optional text content.
export function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}

// SVG <text> where "_X" renders X as a subscript: svgText({x, y}, 'k_BT') -> kBT with a sub-scripted B.
export function svgText(attrs, str) {
  const el = svgEl('text', attrs);
  const parts = str.split(/_(\w)/); // text, sub, text, sub, ...
  parts.forEach((part, i) => {
    if (part === '') return;
    if (i % 2 === 1) {
      const sub = svgEl('tspan', { 'baseline-shift': 'sub', 'font-size': '75%' }, part);
      el.append(sub);
    } else {
      el.append(document.createTextNode(part));
    }
  });
  return el;
}

// Greedy word wrap: returns lines whose measured width stays <= maxWidth (a single over-long word keeps its own line).
export function wrapText(measure, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measure(trial) > maxWidth) { lines.push(line); line = word; }
    else line = trial;
  }
  if (line) lines.push(line);
  return lines;
}
