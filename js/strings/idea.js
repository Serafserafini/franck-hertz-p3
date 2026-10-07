const r = String.raw;

export default {
  en: {
    'idea.title': '1 · The idea',
    'idea.p1': r`In 1914 James Franck and Gustav Hertz accelerated electrons through mercury vapour and measured the current reaching a collecting anode. The electrons lost energy only in <strong>discrete portions</strong>: direct evidence that atoms possess discrete energy levels, as Bohr had proposed in 1913. They first read the spacing of about 4.9 V as ionisation; the emission line at 253.7 nm showed that it is <em>excitation</em> (ionising Hg takes 10.4 eV).`,
    'idea.p2': r`An electron accelerated through a voltage $U$ has kinetic energy $E_\mathrm{kin}=e_0U$. An atom can only absorb the energy $\Delta E=E_1-E_0$ between two of its levels. Below $\Delta E$ collisions are <strong>elastic</strong>: the electron loses only a fraction $\sim 2m_e/M$ of its energy. Once $E_\mathrm{kin}\ge\Delta E$ an <strong>inelastic</strong> collision is possible, and the electron gives up exactly $\Delta E$.`,
    'idea.temp': 'Gas temperature',
    'idea.caption': r`Energy levels in eV above the ground state (schematic). Highlighted: the level excited in the experiment. Dashed: ionisation limit. The dot marks the thermal energy $k_BT$.`,
    'idea.arrow': 'ΔE = {dE} eV ({nm} nm)',
    'idea.arrow.ne': 'ΔE ≈ {dE} eV',
    'idea.kt': 'k_BT = {kt} eV',
    'idea.ground': 'ground state',
    'idea.ion': 'ionisation',
    'idea.result': r`$k_BT$ = {kt} eV, so the Boltzmann factor of the highlighted transition is $e^{-\Delta E/k_BT}\approx$ {bf}.`,
    'idea.thermal': r`At room temperature $k_BT\approx0.025$ eV, about 200 times smaller than $\Delta E$: thermal excitation is completely negligible. Matching $\Delta E$ to the mean thermal energy $\tfrac32k_BT$ would need tens of thousands of kelvin. The atoms must therefore be excited by something else — here by electron impact.`,
    'idea.theory': 'Theory: <a href="https://www.nobelprize.org/prizes/physics/1925/franck/lecture/" target="_blank" rel="noopener">Franck’s Nobel lecture ↗</a> · <a href="https://physics.nist.gov/PhysRefData/ASD/levels_form.html" target="_blank" rel="noopener">NIST level data ↗</a>',
  },
  de: {
    'idea.title': '1 · Die Idee',
    'idea.p1': r`1914 beschleunigten James Franck und Gustav Hertz Elektronen durch Quecksilberdampf und maßen den Strom, der eine Auffängerelektrode erreicht. Die Elektronen verloren Energie nur in <strong>diskreten Portionen</strong>: ein direkter Hinweis auf diskrete Energieniveaus der Atome, wie Bohr sie 1913 postuliert hatte. Den Abstand von etwa 4,9 V deuteten sie zunächst als Ionisation; die Emissionslinie bei 253,7 nm zeigte, dass es sich um <em>Anregung</em> handelt (die Ionisation von Hg erfordert 10,4 eV).`,
    'idea.p2': r`Ein Elektron, das die Spannung $U$ durchläuft, hat die kinetische Energie $E_\mathrm{kin}=e_0U$. Ein Atom kann nur die Energie $\Delta E=E_1-E_0$ zwischen zwei seiner Niveaus aufnehmen. Unterhalb von $\Delta E$ sind Stöße <strong>elastisch</strong>: das Elektron verliert nur einen Bruchteil $\sim 2m_e/M$ seiner Energie. Sobald $E_\mathrm{kin}\ge\Delta E$ gilt, ist ein <strong>inelastischer</strong> Stoß möglich, bei dem das Elektron genau $\Delta E$ abgibt.`,
    'idea.temp': 'Gastemperatur',
    'idea.caption': r`Energieniveaus in eV über dem Grundzustand (schematisch). Hervorgehoben: das im Versuch angeregte Niveau. Gestrichelt: Ionisationsgrenze. Der Punkt markiert die thermische Energie $k_BT$.`,
    'idea.arrow': 'ΔE = {dE} eV ({nm} nm)',
    'idea.arrow.ne': 'ΔE ≈ {dE} eV',
    'idea.kt': 'k_BT = {kt} eV',
    'idea.ground': 'Grundzustand',
    'idea.ion': 'Ionisation',
    'idea.result': r`$k_BT$ = {kt} eV, der Boltzmann-Faktor des hervorgehobenen Übergangs ist daher $e^{-\Delta E/k_BT}\approx$ {bf}.`,
    'idea.thermal': r`Bei Raumtemperatur ist $k_BT\approx0{,}025$ eV, etwa 200-mal kleiner als $\Delta E$: thermische Anregung ist völlig vernachlässigbar. Um $\Delta E$ mit der mittleren thermischen Energie $\tfrac32k_BT$ gleichzusetzen, wären einige zehntausend Kelvin nötig. Die Atome müssen also anders angeregt werden — hier durch Elektronenstoß.`,
    'idea.theory': 'Theorie: <a href="https://www.nobelprize.org/prizes/physics/1925/franck/lecture/" target="_blank" rel="noopener">Nobelvortrag von Franck ↗</a> · <a href="https://physics.nist.gov/PhysRefData/ASD/levels_form.html" target="_blank" rel="noopener">NIST-Niveaudaten ↗</a>',
  },
};
