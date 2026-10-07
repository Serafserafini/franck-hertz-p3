// Runs simulate() in a module Web Worker; falls back to the main thread if workers are unavailable.
import { simulate } from './montecarlo.js';

let worker = null;
let failed = false;
let seq = 0;
const pending = new Map();

// ?sync in the URL forces the main-thread path (used by the headless smoke test).
const FORCE_SYNC = typeof location !== 'undefined' && new URLSearchParams(location.search).has('sync');

function getWorker() {
  if (failed || FORCE_SYNC) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (p) { pending.delete(e.data.id); p.resolve(e.data.result); }
    };
    worker.onerror = () => {
      failed = true;
      worker = null;
      for (const p of pending.values()) p.fallback();
      pending.clear();
    };
  } catch {
    failed = true;
    worker = null;
  }
  return worker;
}

export function computeCurve(params) {
  return new Promise((resolve) => {
    const w = getWorker();
    if (!w) { resolve(simulate(params)); return; }
    const id = ++seq;
    pending.set(id, { resolve, fallback: () => resolve(simulate(params)) });
    w.postMessage({ id, params });
  });
}
