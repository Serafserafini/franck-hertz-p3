const SVG_NS = 'http://www.w3.org/2000/svg';

// Create an SVG element with attributes and optional text content.
export function svgEl(tag, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text !== undefined) el.textContent = text;
  return el;
}
