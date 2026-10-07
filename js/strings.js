// Merges the per-section string files into one table: STRINGS.en / STRINGS.de.
import common from './strings/common.js';
import idea from './strings/idea.js';
import tube from './strings/tube.js';
import curve from './strings/curve.js';
import delta from './strings/delta.js';
import refs from './strings/refs.js';

const parts = [common, idea, tube, curve, delta, refs];

export const STRINGS = {
  en: Object.assign({}, ...parts.map((p) => p.en)),
  de: Object.assign({}, ...parts.map((p) => p.de)),
};
