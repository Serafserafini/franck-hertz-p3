const r = String.raw;
const L = 'https://www.nobelprize.org/prizes/physics/1925/franck/lecture/';

export default {
  en: {
    'glow.title': '9 · Illuminated stripes in the tube',
    'glow.p1': r`Each inelastic collision leaves an atom excited. When it falls back it emits light. Collisions happen where electrons have just reached the threshold energy, that is around the positions $x_n$. At a given $U_2$ the excitations therefore concentrate in <strong>separate zones</strong>, and the tube glows in <strong>stripes</strong>. In neon the emitted light is orange and visible; in mercury the line at 253.7 nm is ultraviolet and invisible. When $U_2$ grows, the stripes move towards G₁ and new ones appear at G₂.`,
    'glow.U2': 'Accelerating voltage U₂',
    'glow.footer.ne': 'Orange glow: excitation zones (visible light)',
    'glow.footer.hg': 'Violet: excitation zones (UV at 253.7 nm, invisible)',
    'glow.canvas.aria': 'Animation of typical electrons between G1 and G2. Dot colour shows the kinetic energy; coloured bands show where excitations occur at the chosen U2; dashed lines mark the collision thresholds.',
    'glow.theory': `Theory: <a href="${L}" target="_blank" rel="noopener">Franck’s Nobel lecture ↗</a>`,
  },
  de: {
    'glow.title': '9 · Leuchtende Streifen in der Röhre',
    'glow.p1': r`Jeder inelastische Stoß hinterlässt ein angeregtes Atom. Beim Zurückfallen sendet es Licht aus. Stöße geschehen dort, wo die Elektronen gerade die Schwellenenergie erreicht haben, also um die Orte $x_n$. Bei gegebenem $U_2$ konzentrieren sich die Anregungen daher in <strong>getrennten Zonen</strong>, und die Röhre leuchtet in <strong>Streifen</strong>. In Neon ist das Licht orange und sichtbar; bei Quecksilber ist die Linie bei 253,7 nm ultraviolett und unsichtbar. Wächst $U_2$, wandern die Streifen zu G₁, und an G₂ entstehen neue.`,
    'glow.U2': 'Beschleunigungsspannung U₂',
    'glow.footer.ne': 'Orange: Anregungszonen (sichtbares Licht)',
    'glow.footer.hg': 'Violett: Anregungszonen (UV bei 253,7 nm, unsichtbar)',
    'glow.canvas.aria': 'Animation typischer Elektronen zwischen G1 und G2. Die Punktfarbe zeigt die kinetische Energie; farbige Bänder zeigen, wo bei dem gewählten U2 Anregungen stattfinden; gestrichelte Linien markieren die Stoßschwellen.',
    'glow.theory': `Theorie: <a href="${L}" target="_blank" rel="noopener">Nobelvortrag von Franck ↗</a>`,
  },
};
