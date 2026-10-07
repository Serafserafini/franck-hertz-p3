const r = String.raw;
const R = 'https://doi.org/10.1119/1.2174033';

export default {
  en: {
    'minima.title': '10 · Why the minima do not reach zero',
    'minima.p1': r`Not every electron collides where it could. Once it has reached the threshold it needs on average a free path $\lambda=1/(n\sigma)$ before it excites — and the path left to G₂ may be shorter than that. Such electrons arrive at G₂ still carrying their energy and pass the counter voltage although, in the ideal picture, they should have been stopped. The shorter $\lambda$ is, the fewer electrons slip through. $\lambda$ falls when the gas density $n$ rises, that is with the <strong>pressure</strong> (for mercury with the temperature, through the vapour pressure).`,
    'minima.U2': 'Accelerating voltage U₂',
    'minima.bar': r`Electrons that missed at least one possible collision: <strong>{pct} %</strong>`,
    'minima.legend.all': 'made all possible collisions',
    'minima.legend.missed': 'missed a collision (ring)',
    'minima.footer': 'Ringed dots missed at least one collision; colour shows the kinetic energy.',
    'minima.p2': r`Low pressure (long $\lambda$): many electrons slip through, the minima are shallow. High pressure (short $\lambda$): almost every electron collides, the minima become deep. The lower plot compares three gas densities.`,
    'minima.canvas.aria': 'Animation of typical electrons between G1 and G2. Dot colour shows the kinetic energy; electrons that missed at least one possible collision carry a ring.',
    'minima.plot.aria': 'Plot of the anode current against U2 for the lowest, the chosen and the highest gas density: the lower the density, the shallower the minima.',
    'minima.theory': `Theory: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
  de: {
    'minima.title': '10 · Warum die Minima nicht auf null gehen',
    'minima.p1': r`Nicht jedes Elektron stößt dort, wo es könnte. Hat es die Schwelle erreicht, braucht es im Mittel eine freie Weglänge $\lambda=1/(n\sigma)$, bevor es anregt — und der Weg bis G₂ kann kürzer sein. Solche Elektronen kommen noch mit ihrer Energie an G₂ an und überwinden die Gegenspannung, obwohl sie im idealen Bild gestoppt worden wären. Je kürzer $\lambda$, desto weniger Elektronen schlüpfen durch. $\lambda$ sinkt, wenn die Gasdichte $n$ steigt, also mit dem <strong>Druck</strong> (bei Quecksilber mit der Temperatur über den Dampfdruck).`,
    'minima.U2': 'Beschleunigungsspannung U₂',
    'minima.bar': r`Elektronen, die mindestens einen möglichen Stoß verpasst haben: <strong>{pct} %</strong>`,
    'minima.legend.all': 'alle möglichen Stöße gemacht',
    'minima.legend.missed': 'einen Stoß verpasst (Ring)',
    'minima.footer': 'Punkte mit Ring haben mindestens einen Stoß verpasst; die Farbe zeigt die kinetische Energie.',
    'minima.p2': r`Niedriger Druck (langes $\lambda$): viele Elektronen schlüpfen durch, die Minima sind flach. Hoher Druck (kurzes $\lambda$): fast jedes Elektron stößt, die Minima werden tief. Das untere Diagramm vergleicht drei Gasdichten.`,
    'minima.canvas.aria': 'Animation typischer Elektronen zwischen G1 und G2. Die Punktfarbe zeigt die kinetische Energie; Elektronen, die mindestens einen möglichen Stoß verpasst haben, tragen einen Ring.',
    'minima.plot.aria': 'Diagramm des Anodenstroms über U2 für die niedrigste, die gewählte und die höchste Gasdichte: Je niedriger die Dichte, desto flacher die Minima.',
    'minima.theory': `Theorie: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
};
