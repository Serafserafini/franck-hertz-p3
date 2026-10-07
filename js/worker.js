import { simulate } from './montecarlo.js';

self.onmessage = (e) => {
  const { id, params } = e.data;
  self.postMessage({ id, result: simulate(params) });
};
