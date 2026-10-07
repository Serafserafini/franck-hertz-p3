// Shared UI state: only the chosen gas is shared between sections.
export const state = { gas: 'hg' };

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
