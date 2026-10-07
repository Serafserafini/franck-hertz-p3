const r = String.raw;

export default {
  en: {
    'run.title': '6 · How the experiment is run',
    'run.p1': r`First $U_1$ (suction) and $U_3$ (deceleration) are set and then kept <strong>constant</strong>. Only the accelerating voltage $U_2$ is varied, slowly upwards from zero, and the anode current $I_A$ is recorded as a function of $U_2$. Press play or move the slider: the horizontal axis grows with $U_2$ and the curve is drawn up to the selected value.`,
    'run.fixed': '{name} = {v} V (constant)',
    'run.U2': 'Accelerating voltage U₂ (varied)',
    'run.readout': r`$U_2$ = {U2} V → $I_A$ = {IA} (relative units)`,
    'run.obs.title': 'What is observed on I_A',
    'run.obs.1': r`At small $U_2$ no current flows: the electrons do not have enough energy to pass the counter voltage $U_3$.`,
    'run.obs.2': r`Then $I_A$ rises with $U_2$, as long as the electrons only collide elastically.`,
    'run.obs.3': r`When $U_1+U_2$ reaches about $\Delta E/e_0$ the current <strong>drops</strong>: electrons lose their energy in inelastic collisions and cannot pass $U_3$.`,
    'run.obs.4': r`It rises again and drops again when $U_1+U_2\approx2\Delta E/e_0$, $3\Delta E/e_0$, …: a series of peaks, one energy quantum apart.`,
    'run.plot.aria': 'Plot of the anode current against the accelerating voltage U2 for the chosen gas. The horizontal axis ends at the chosen value of U2 and the curve shows the current for all voltages up to that value.',
  },
  de: {
    'run.title': '6 · Wie der Versuch durchgeführt wird',
    'run.p1': r`Zuerst werden $U_1$ (Absaugen) und $U_3$ (Abbremsen) eingestellt und dann <strong>konstant</strong> gehalten. Nur die Beschleunigungsspannung $U_2$ wird langsam von null an erhöht, und der Anodenstrom $I_A$ wird als Funktion von $U_2$ aufgezeichnet. Drücken Sie Abspielen oder bewegen Sie den Regler: Die Kurve entsteht, während $U_2$ wächst.`,
    'run.fixed': '{name} = {v} V (konstant)',
    'run.U2': 'Beschleunigungsspannung U₂ (variiert)',
    'run.readout': r`$U_2$ = {U2} V → $I_A$ = {IA} (relative Einheiten)`,
    'run.obs.title': 'Was an I_A beobachtet wird',
    'run.obs.1': r`Bei kleinem $U_2$ fließt kein Strom: Die Elektronen haben nicht genug Energie, um die Gegenspannung $U_3$ zu überwinden.`,
    'run.obs.2': r`Dann steigt $I_A$ mit $U_2$, solange die Elektronen nur elastisch stoßen.`,
    'run.obs.3': r`Erreicht $U_1+U_2$ etwa $\Delta E/e_0$, <strong>fällt</strong> der Strom: Die Elektronen verlieren ihre Energie in inelastischen Stößen und überwinden $U_3$ nicht.`,
    'run.obs.4': r`Er steigt wieder und fällt erneut, wenn $U_1+U_2\approx2\Delta E/e_0$, $3\Delta E/e_0$, …: eine Folge von Maxima im Abstand eines Energiequants.`,
    'run.plot.aria': 'Diagramm des Anodenstroms über der Beschleunigungsspannung U2 für das gewählte Gas. Die waagerechte Achse endet beim gewählten Wert von U2, und die Kurve zeigt den Strom für alle Spannungen bis dahin.',
  },
};
