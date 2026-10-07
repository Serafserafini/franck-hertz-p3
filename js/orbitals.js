import { ORBITALS } from './physics.js';
import { svgEl } from './dom.js';
import { t } from './i18n.js';

const BOX = 28, GAP = 4;
const GLYPH = { 1: '↑', 2: '↓', 3: '↑↓' };

// Box diagram of the valence orbitals: left ground state, right excited state.
export function renderOrbitals(container, gasId) {
  const cols = [['idea.orb.ground', ORBITALS[gasId].ground], ['idea.orb.excited', ORBITALS[gasId].excited]];
  const W = 590, H = 150;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'orb', 'aria-hidden': 'true' });
  cols.forEach(([titleKey, groups], c) => {
    const x0 = 20 + c * 300;
    svg.append(svgEl('text', { x: x0, y: 20, class: 'small' }, t(titleKey)));
    let x = x0;
    for (const g of groups) {
      g.boxes.forEach((state, i) => {
        const bx = x + i * (BOX + GAP);
        svg.append(svgEl('rect', { x: bx, y: 52, width: BOX, height: BOX, class: 'box' }));
        if (state) svg.append(svgEl('text', { x: bx + BOX / 2, y: 72, 'text-anchor': 'middle', class: 'arrow' }, GLYPH[state]));
      });
      svg.append(svgEl('text', { x: x + (g.boxes.length * (BOX + GAP) - GAP) / 2, y: 108, 'text-anchor': 'middle' }, g.name));
      x += g.boxes.length * (BOX + GAP) + 14;
    }
  });
  svg.append(svgEl('text', { x: 290, y: 72, 'text-anchor': 'middle', class: 'small' }, '→'));
  container.replaceChildren(svg);
}
