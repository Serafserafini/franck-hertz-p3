// Runs simulate() in module Web Workers; falls back to the main thread if workers are unavailable.
// One worker per channel. A new request on a channel cancels the one still running there
// (the worker is terminated), so quick slider moves never build up a backlog.
import { simulate } from './montecarlo.js';

// ?sync in the URL forces the main-thread path (used by the headless smoke test).
const FORCE_SYNC = typeof location !== 'undefined' && new URLSearchParams(location.search).has('sync');

let failed = false;
let seq = 0;
const channels = new Map(); // name -> { worker, pending: Map(id -> {resolve, reject, fallback}) }

function channelFor(name) {
  if (!channels.has(name)) channels.set(name, { worker: null, pending: new Map() });
  return channels.get(name);
}

function ensureWorker(ch) {
  if (failed || FORCE_SYNC) return null;
  if (ch.worker) return ch.worker;
  try {
    const w = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    w.onmessage = (e) => {
      const p = ch.pending.get(e.data.id);
      if (!p) return;
      ch.pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.result);
    };
    w.onerror = () => { // the worker itself broke: redo the pending work on the main thread
      failed = true;
      try { w.terminate(); } catch { /* already gone */ }
      ch.worker = null;
      for (const p of ch.pending.values()) p.fallback();
      ch.pending.clear();
    };
    ch.worker = w;
  } catch {
    failed = true;
  }
  return ch.worker;
}

function runSync(params, resolve, reject) {
  try { resolve(simulate(params)); } catch (e) { reject(e); }
}

// Superseded requests never settle; callers must ignore results of stale requests (token pattern).
// A simulation error rejects the promise.
export function computeCurve(params, channel = 'main', { sync = false } = {}) {
  const ch = channelFor(channel);
  return new Promise((resolve, reject) => {
    if (ch.worker && ch.pending.size) { // cancel the superseded computation
      ch.worker.terminate();
      ch.worker = null;
      ch.pending.clear();
    }
    const w = sync ? null : ensureWorker(ch);
    if (!w) { runSync(params, resolve, reject); return; }
    const id = ++seq;
    ch.pending.set(id, { resolve, reject, fallback: () => runSync(params, resolve, reject) });
    w.postMessage({ id, params });
  });
}
