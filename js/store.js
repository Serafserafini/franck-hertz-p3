// Shared UI state with a tiny pub-sub. Sections read `state` and call `update()`.

export const state = {
  gas: 'hg', tempC: 170, U3: 1.5, spread: 0.3, contact: 1.0,
  probeU2: 20, showNoGas: true, extremaKind: 'maxima', compare: false,
  result: null,    // {U2, IA, params} of the latest simulation
  reference: null, // {U2, IA} curve without gas, or null
};

// Keys that change the simulated curve.
export const SIM_KEYS = ['gas', 'tempC', 'U3', 'spread', 'contact', 'showNoGas'];

const listeners = new Set();

export function update(patch) {
  Object.assign(state, patch);
  const keys = Object.keys(patch);
  for (const fn of listeners) fn(keys);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function simParams() {
  const hg = state.gas === 'hg';
  return {
    gas: state.gas, tempC: state.tempC, U3: state.U3, spread: state.spread, contact: state.contact,
    U2min: 0, U2max: hg ? 45 : 90, U2step: hg ? 0.25 : 0.5, electrons: 3000, seed: 1,
  };
}
