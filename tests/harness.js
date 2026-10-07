// Minimal zero-dependency test harness for the browser (headless Chrome).
const results = [];
const queue = [];

export function test(name, fn) { queue.push({ name, fn }); }

export const assert = {
  ok(v, msg = 'expected truthy') { if (!v) throw new Error(msg); },
  equal(a, b, msg) { if (a !== b) throw new Error(msg || `expected ${b}, got ${a}`); },
  close(a, b, tol, msg) {
    if (!(Math.abs(a - b) <= tol)) throw new Error(msg || `expected ${b} ± ${tol}, got ${a}`);
  },
  between(v, lo, hi, msg) {
    if (!(v >= lo && v <= hi)) throw new Error(msg || `expected ${lo} ≤ ${v} ≤ ${hi}`);
  },
};

export async function run() {
  for (const t of queue) {
    try { await t.fn(); results.push({ name: t.name, ok: true }); }
    catch (e) { results.push({ name: t.name, ok: false, err: String(e.message || e) }); }
  }
  const failed = results.filter((r) => !r.ok);
  const lines = results.map((r) => (r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' :: ' + r.err));
  lines.push(failed.length ? `RESULT: FAIL (${failed.length}/${results.length})` : `RESULT: PASS (${results.length})`);
  document.getElementById('out').textContent = lines.join('\n');
  document.title = failed.length ? 'FAIL' : 'PASS';
}
