// Merges the per-section string files into one table: STRINGS.en / STRINGS.de.
import common from './strings/common.js';
import idea from './strings/idea.js';
import scheme from './strings/scheme.js';
import run from './strings/run.js';
import nogas from './strings/nogas.js';
import gas from './strings/gas.js';
import peaks from './strings/peaks.js';
import glow from './strings/glow.js';
import minima from './strings/minima.js';
import refs from './strings/refs.js';

const parts = [common, idea, scheme, run, nogas, gas, peaks, glow, minima, refs];

export const STRINGS = {
  en: Object.assign({}, ...parts.map((p) => p.en)),
  de: Object.assign({}, ...parts.map((p) => p.de)),
};
