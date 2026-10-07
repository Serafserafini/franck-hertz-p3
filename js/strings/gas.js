const r = String.raw;
const R = 'https://doi.org/10.1119/1.2174033';

export default {
  en: {
    'gas.title': '7 · Anode current with gas',
    'gas.p1': r`With gas, an electron that has gained the energy $\Delta E$ can lose it in an inelastic collision and start again from almost zero. In the <strong>ideal</strong> case this happens exactly when $E_\mathrm{kin}=\Delta E$: the kinetic energy along the gap is a <strong>sawtooth</strong> and the electron arrives at G₂ with $E_f=e_0(U_1+U_2)-m\Delta E$ ($m$ collisions). It passes the counter voltage only if $E_f>e_0U_3$: the ideal $I_A$ is a train of rectangular pulses.`,
    'gas.p2': r`In the <strong>real</strong> experiment a collision happens only after a free path of mean length $\lambda$ beyond the threshold. The sawtooth is smeared out (average energy, lower plot) and the rectangles become the rounded peaks of the measured curve. Since the electron energies are not perfectly sharp, the dips are not zero, and since more electrons get through the grids as the field grows, the peaks rise with $U_2$.`,
    'gas.ideal': 'Show the ideal experiment',
    'gas.legend.real': 'real',
    'gas.legend.ideal': 'ideal',
    'gas.legend.avg': 'real (average energy)',
    'gas.legend.saw': 'ideal sawtooth',
    'gas.energy.title': 'Kinetic energy along the gap at the chosen U₂',
    'gas.readout': r`$U_2$ = {U2} V: real $I_A$ = {IA}; ideal: {ideal}. Collisions in the ideal case: {m}.`,
    'gas.ideal.on': 'current flows',
    'gas.ideal.off': 'no current',
    'gas.plot.aria': 'Plot of the anode current with gas against U2: the real curve and, optionally, the ideal train of rectangular pulses, with a marker at the chosen U2.',
    'gas.energy.aria': 'Plot of the kinetic energy of the electrons against position between G1 and G2 for the chosen voltages: the ideal sawtooth, and the average energy of the real experiment.',
    'gas.theory': `Theory: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
  de: {
    'gas.title': '7 · Anodenstrom mit Gas',
    'gas.p1': r`Mit Gas kann ein Elektron, das die Energie $\Delta E$ gewonnen hat, diese in einem inelastischen Stoß abgeben und fast bei null neu beginnen. Im <strong>idealen</strong> Fall geschieht das genau bei $E_\mathrm{kin}=\Delta E$: Die kinetische Energie entlang des Zwischenraums ist ein <strong>Sägezahn</strong>, und das Elektron kommt mit $E_f=e_0(U_1+U_2)-m\Delta E$ an G₂ an ($m$ Stöße). Es überwindet die Gegenspannung nur bei $E_f>e_0U_3$: Das ideale $I_A$ ist eine Folge von Rechteckpulsen.`,
    'gas.p2': r`Im <strong>realen</strong> Experiment erfolgt ein Stoß erst nach einer freien Weglänge mit Mittelwert $\lambda$ hinter der Schwelle. Der Sägezahn wird verschmiert (mittlere Energie, unteres Diagramm), und aus den Rechtecken werden die gerundeten Maxima der gemessenen Kurve. Da die Elektronenenergien nicht ganz scharf sind, gehen die Minima nicht auf null, und da mit wachsendem Feld mehr Elektronen durch die Gitter kommen, wachsen die Maxima mit $U_2$.`,
    'gas.ideal': 'Idealen Versuch anzeigen',
    'gas.legend.real': 'real',
    'gas.legend.ideal': 'ideal',
    'gas.legend.avg': 'real (mittlere Energie)',
    'gas.legend.saw': 'idealer Sägezahn',
    'gas.energy.title': 'Kinetische Energie entlang des Zwischenraums bei der gewählten Spannung U₂',
    'gas.readout': r`$U_2$ = {U2} V: reales $I_A$ = {IA}; ideal: {ideal}. Stöße im idealen Fall: {m}.`,
    'gas.ideal.on': 'Strom fließt',
    'gas.ideal.off': 'kein Strom',
    'gas.plot.aria': 'Diagramm des Anodenstroms mit Gas über U2: die reale Kurve und wahlweise die ideale Folge von Rechteckpulsen, mit einer Markierung beim gewählten U2.',
    'gas.energy.aria': 'Diagramm der kinetischen Energie der Elektronen über dem Ort zwischen G1 und G2 für die gewählten Spannungen: der ideale Sägezahn, und die mittlere Energie des realen Versuchs.',
    'gas.theory': `Theorie: <a href="${R}" target="_blank" rel="noopener">Rapior et al., Am. J. Phys. 74, 423 (2006) ↗</a>`,
  },
};
