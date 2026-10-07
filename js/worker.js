import { simulate } from './montecarlo.js';

self.onmessage = (e) => {
  const { id, params } = e.data;
  try {
    self.postMessage({ id, result: simulate(params) });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
