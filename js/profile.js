// Idealised kinetic energy of one electron along the tube (mean free path << tube). Pure module.
import { GAS } from './physics.js';

// Normalised positions along the tube: cathode, grid 1, grid 2, anode.
export const POS = { K: 0, G1: 0.2, G2: 0.8, A: 1 };

export function idealProfile({ U1, U2, U3, gasId, gasOn }) {
  const dE = GAS[gasId].dE;
  const points = [{ x: POS.K, E: 0 }, { x: POS.G1, E: U1 }];
  let E = U1;
  let x = POS.G1;
  const slope = U2 / (POS.G2 - POS.G1); // eV gained per unit x in the G1-G2 gap
  if (gasOn && slope > 0) {
    for (;;) {
      const need = dE - E;
      if (need <= 0) { // already above threshold: lose dE immediately
        E -= dE;
        points.push({ x, E });
        continue;
      }
      const xHit = x + need / slope;
      if (xHit >= POS.G2) break;
      points.push({ x: xHit, E: dE });
      x = xHit;
      E = 0;
      points.push({ x, E });
    }
  }
  E += slope * (POS.G2 - x);
  points.push({ x: POS.G2, E });
  if (E >= U3) {
    const finalE = E - U3;
    points.push({ x: POS.A, E: finalE });
    return { points, reached: true, finalE };
  }
  const xStop = U3 > 0 ? POS.G2 + (E / U3) * (POS.A - POS.G2) : POS.G2;
  points.push({ x: xStop, E: 0 });
  return { points, reached: false, finalE: 0 };
}
