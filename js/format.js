// Number formatting helpers. Pure module.

// 0 -> "0"; x >= 0.01 -> 2 significant digits; otherwise "m×10<sup>e</sup>" (HTML).
export function formatSci(x) {
  if (x === 0) return '0';
  if (x >= 0.01) return x.toPrecision(2);
  const [m, e] = x.toExponential(1).split('e');
  return `${m}×10<sup>${String(parseInt(e, 10)).replace('-', '−')}</sup>`;
}

// German decimal comma: "4.96" -> "4,96" (only plain decimals: URLs, "Fig. 3" and DOIs such as 10.1119/1.2174033 stay intact).
export function localizeNumber(text, lang) {
  return lang === 'de' ? text.replace(/(?<![\d/.])(\d+)\.(\d+)(?![\d/])/g, '$1,$2') : text;
}
