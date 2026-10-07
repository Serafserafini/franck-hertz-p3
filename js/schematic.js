import { svgEl } from './dom.js';
import { t } from './i18n.js';

const W = 640, H = 500;
const XK = 70, XG1 = 190, XG2 = 450, XA = 570; // electrode x positions
const TUBE_Y = 50, TUBE_H = 80, BUS_Y = 190;
const PHI_TOP = 285, PHI_UNIT = 22, PHI_BASE = 410; // y of phi = 0 is PHI_BASE
const U = { U1: 1.5, U2: 4, U3: 1.8 }; // example values, in units of PHI_UNIT

function battery(svg, cx, y, plusRight, labelKey, name) {
  // two vertical plates 10 px apart; the long plate is the positive pole
  const xl = cx - 5, xr = cx + 5;
  const longX = plusRight ? xr : xl, shortX = plusRight ? xl : xr;
  svg.append(svgEl('line', { x1: longX, y1: y - 16, x2: longX, y2: y + 16, class: 'plate-long' }));
  svg.append(svgEl('line', { x1: shortX, y1: y - 8, x2: shortX, y2: y + 8, class: 'plate-short' }));
  svg.append(svgEl('text', { x: longX + (plusRight ? 12 : -12), y: y - 18, 'text-anchor': 'middle', class: 'plus' }, '+'));
  svg.append(svgEl('text', { x: shortX + (plusRight ? -12 : 12), y: y - 18, 'text-anchor': 'middle', class: 'minus' }, '−'));
  svg.append(svgEl('text', { x: cx, y: y + 34, 'text-anchor': 'middle' }, name));
  svg.append(svgEl('text', { x: cx, y: y + 50, 'text-anchor': 'middle', class: 'small' }, t(labelKey)));
}

// One explanation per row (the '|' separators of the texts become ' · '), left aligned.
function row(svg, y, str, color) {
  svg.append(svgEl('rect', { x: 20, y: y - 9, width: 10, height: 10, class: color }));
  svg.append(svgEl('text', { x: 38, y, class: 'small' }, str.split('|').join(' · ')));
}

export function renderScheme(container) {
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'scheme', 'aria-hidden': 'true' });

  // tube with electrodes
  svg.append(svgEl('rect', { x: 20, y: TUBE_Y, width: 600, height: TUBE_H, rx: 40, class: 'glass' }));
  svg.append(svgEl('rect', { x: XK - 5, y: TUBE_Y + 18, width: 10, height: 44, class: 'electrode' }));
  for (const x of [XG1, XG2]) svg.append(svgEl('line', { x1: x, y1: TUBE_Y + 6, x2: x, y2: TUBE_Y + TUBE_H - 6, class: 'grid-el' }));
  svg.append(svgEl('rect', { x: XA - 5, y: TUBE_Y + 12, width: 10, height: 56, class: 'electrode' }));
  [['K', XK], ['G₁', XG1], ['G₂', XG2], ['A', XA]].forEach(([name, x]) => {
    svg.append(svgEl('text', { x, y: TUBE_Y - 12, 'text-anchor': 'middle' }, name));
    svg.append(svgEl('line', { x1: x, y1: TUBE_Y + TUBE_H, x2: x, y2: BUS_Y, class: 'wire' }));
  });

  // series chain of the three sources along the bus
  svg.append(svgEl('line', { x1: XK, y1: BUS_Y, x2: XA, y2: BUS_Y, class: 'wire' }));
  battery(svg, (XK + XG1) / 2, BUS_Y, true, 'scheme.suction', 'U₁');   // + toward G1
  battery(svg, (XG1 + XG2) / 2, BUS_Y, true, 'scheme.accel', 'U₂');    // + toward G2
  battery(svg, (XG2 + XA) / 2, BUS_Y, false, 'scheme.decel', 'U₃');    // + toward G2 (A lower)

  // potential along the tube: K = 0, G1 = U1, G2 = U1 + U2, A = U1 + U2 - U3
  const y = (phi) => PHI_BASE - phi * PHI_UNIT;
  const phi = [0, U.U1, U.U1 + U.U2, U.U1 + U.U2 - U.U3];
  const xs = [XK, XG1, XG2, XA];
  // Uniform field between neighbouring electrodes (close, parallel plates): phi is a straight ramp in each stretch.
  const poly = xs.map((x, i) => [x, y(phi[i])]);
  // coloured bands tie each potential step to its explanation row
  [['z1', xs[0], xs[1]], ['z2', xs[1], xs[2]], ['z3', xs[2], xs[3]]].forEach(([cls, x0, x1]) => {
    svg.append(svgEl('rect', { x: x0, y: PHI_TOP - 10, width: x1 - x0, height: PHI_BASE + 6 - (PHI_TOP - 10), class: 'band ' + cls }));
  });
  svg.append(svgEl('polyline', { points: poly.map((p) => p.join(',')).join(' '), class: 'phi' }));
  for (const x of xs) svg.append(svgEl('line', { x1: x, y1: PHI_TOP - 10, x2: x, y2: PHI_BASE + 6, class: 'dash' }));
  svg.append(svgEl('text', { x: 14, y: PHI_TOP - 12, class: 'small' }, t('scheme.phi')));
  svg.append(svgEl('text', { x: 14, y: PHI_TOP + 4, class: 'small' }, '+'));

  row(svg, PHI_BASE + 36, t('scheme.z1'), 'z1');
  row(svg, PHI_BASE + 56, t('scheme.z2'), 'z2');
  row(svg, PHI_BASE + 76, t('scheme.z3'), 'z3');

  container.replaceChildren(svg);
}

export function initScheme() {
  const box = document.getElementById('scheme-svg');
  const draw = () => renderScheme(box);
  document.addEventListener('langchange', draw);
  draw();
}
