const A = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

export default {
  en: {
    'refs.title': '11 · References',
    'refs.intro': 'Links open in a new tab.',
    'refs.r1': `G. Rapior, K. Sengstock, V. Baev, <em>New features of the Franck–Hertz experiment</em>, Am. J. Phys. <strong>74</strong>, 423–428 (2006). ${A('https://doi.org/10.1119/1.2174033', 'doi:10.1119/1.2174033 ↗')} — temperature dependence of the curves; recommended reading.`,
    'refs.r2': `J. Franck, G. Hertz, <em>Über Zusammenstöße zwischen Elektronen und Molekülen des Quecksilberdampfes und die Ionisierungsspannung desselben</em>, Verh. Dtsch. Phys. Ges. <strong>16</strong>, 457 (1914) — the original paper. ${A('https://www.nobelprize.org/prizes/physics/1925/franck/lecture/', 'Franck’s Nobel lecture ↗')} gives the story in his own words.`,
    'refs.r3': `G. Wedler, H.-J. Freund, <em>Lehrbuch der Physikalischen Chemie</em>, Wiley-VCH, Weinheim — atomic structure and spectroscopy chapters. ${A('https://www.wiley-vch.de', 'Wiley-VCH ↗')}`,
    'refs.r4': `${A('https://physics.nist.gov/PhysRefData/ASD/levels_form.html', 'NIST Atomic Spectra Database — energy levels ↗')} and ${A('https://physics.nist.gov/PhysRefData/ASD/lines_form.html', 'spectral lines ↗')}: levels and the 253.7 nm Hg line.`,
  },
  de: {
    'refs.title': '11 · Literatur',
    'refs.intro': 'Links öffnen sich in einem neuen Tab.',
    'refs.r1': `G. Rapior, K. Sengstock, V. Baev, <em>New features of the Franck–Hertz experiment</em>, Am. J. Phys. <strong>74</strong>, 423–428 (2006). ${A('https://doi.org/10.1119/1.2174033', 'doi:10.1119/1.2174033 ↗')} — Temperaturabhängigkeit der Kurven; empfohlene Lektüre.`,
    'refs.r2': `J. Franck, G. Hertz, <em>Über Zusammenstöße zwischen Elektronen und Molekülen des Quecksilberdampfes und die Ionisierungsspannung desselben</em>, Verh. Dtsch. Phys. Ges. <strong>16</strong>, 457 (1914) — die Originalarbeit. ${A('https://www.nobelprize.org/prizes/physics/1925/franck/lecture/', 'Francks Nobelvortrag ↗')} erzählt die Geschichte in seinen eigenen Worten.`,
    'refs.r3': `G. Wedler, H.-J. Freund, <em>Lehrbuch der Physikalischen Chemie</em>, Wiley-VCH, Weinheim — Kapitel zu Atombau und Spektroskopie. ${A('https://www.wiley-vch.de', 'Wiley-VCH ↗')}`,
    'refs.r4': `${A('https://physics.nist.gov/PhysRefData/ASD/levels_form.html', 'NIST Atomic Spectra Database — Energieniveaus ↗')} und ${A('https://physics.nist.gov/PhysRefData/ASD/lines_form.html', 'Spektrallinien ↗')}: Niveaus und die Hg-Linie bei 253,7 nm.`,
  },
};
