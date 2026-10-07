import { svgEl } from './dom.js';
import { t } from './i18n.js';

const BOX = 28, GAP = 4;

// Hg levels of the 6s6p configuration (eV above 6s2 1S0, NIST) with the y of their label (the lines are too close to label in place).
const HG = [
  { name: '¹P₁', e: 6.70, ly: 64 },
  { name: '³P₂', e: 5.46, ly: 98 },
  { name: '³P₁', e: 4.89, ly: 120, hl: true },
  { name: '³P₀', e: 4.67, ly: 142 },
];

// Comparison of H (one electron, degenerate p orbitals) with Hg (two electrons: singlet/triplet, J splitting).
export function renderTerms(container) {
  const W = 720, H = 300;
  const y = (e) => 250 - e * 28;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'terms', 'aria-hidden': 'true' });
  const text = (x, yy, str, cls, anchor = 'start') => svg.append(svgEl('text', { x, y: yy, class: cls || '', 'text-anchor': anchor }, str));

  // Hydrogen: three p boxes, one electron, same energy.
  text(20, 24, t('idea.cmp.h'), 'head');
  text(20, 46, t('idea.cmp.h1'), 'small');
  const hx = 40;
  ['px', 'py', 'pz'].forEach((name, i) => {
    const bx = hx + i * (BOX + GAP + 14);
    svg.append(svgEl('rect', { x: bx, y: 110, width: BOX, height: BOX, class: 'box' }));
    if (i === 0) text(bx + BOX / 2, 130, '↑', 'arrow', 'middle');
    text(bx + BOX / 2, 158, name, '', 'middle');
  });
  svg.append(svgEl('line', { x1: hx, y1: 96, x2: hx + 2 * (BOX + GAP + 14) + BOX, y2: 96, class: 'level' }));
  text(hx + (2 * (BOX + GAP + 14) + BOX) / 2, 86, t('idea.cmp.deg'), 'small', 'middle');
  text(20, 196, t('idea.cmp.hq'), '');
  text(20, 218, t('idea.cmp.h2'), 'small');

  svg.append(svgEl('line', { x1: 300, y1: 14, x2: 300, y2: 286, class: 'sep' }));

  // Mercury: ground state with paired spins, excited 6s6p split into singlet and triplet, triplet split by J.
  const gx0 = 350, gx1 = 460;
  text(320, 24, t('idea.cmp.hg'), 'head');
  svg.append(svgEl('line', { x1: gx0, y1: y(0), x2: gx1, y2: y(0), class: 'level' }));
  text(gx1 + 10, y(0) + 5, '6s² ¹S₀', '');
  svg.append(svgEl('rect', { x: gx0 + 41, y: y(0) + 12, width: BOX, height: BOX, class: 'box' }));
  text(gx0 + 41 + BOX / 2, y(0) + 32, '↑↓', 'arrow', 'middle');
  text(gx1 + 10, y(0) + 32, t('idea.cmp.S0'), 'small');

  for (const lv of HG) {
    svg.append(svgEl('line', { x1: gx0, y1: y(lv.e), x2: gx1, y2: y(lv.e), class: lv.hl ? 'level hl' : 'level' }));
    svg.append(svgEl('line', { x1: gx1, y1: y(lv.e), x2: gx1 + 26, y2: lv.ly - 4, class: 'lead' }));
    text(gx1 + 30, lv.ly, `6s6p ${lv.name}`, lv.hl ? 'hl-text' : '');
  }
  text(gx1 + 130, 64, t('idea.cmp.sing'), 'small');
  text(gx1 + 130, 98, t('idea.cmp.trip'), 'small');
  text(gx1 + 130, 120, t('idea.cmp.so'), 'small');

  const ax = gx0 + 30;
  svg.append(svgEl('line', { x1: ax, y1: y(0) - 2, x2: ax, y2: y(4.89) + 6, class: 'arrow-line', 'marker-end': 'url(#terms-arrowhead)' }));
  text(ax - 8, (y(0) + y(4.89)) / 2, '≈ 4.9 eV', 'hl-text', 'end');
  const defs = svgEl('defs');
  const mk = svgEl('marker', { id: 'terms-arrowhead', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' });
  mk.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrow-head' }));
  defs.append(mk);
  svg.prepend(defs);

  container.replaceChildren(svg);
}
