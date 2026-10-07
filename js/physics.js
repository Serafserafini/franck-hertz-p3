// Physical constants and the gas/tube model used by the simulator.
// No DOM access: everything here is a pure function or constant.

export const K_B = 1.380649e-23; // J/K
export const E_CHARGE = 1.602176634e-19; // C

// Effective model parameters (tuned for plausible curves, not fitted to data).
// dE: excitation energy (eV); sigma: effective collision cross-section (m^2);
// pInel: probability that a collision above threshold is inelastic.
export const GAS = {
  hg: { id: 'hg', dE: 4.9, sigma: 4e-19, pInel: 0.3, ionization: 10.4 },
  ne: { id: 'ne', dE: 19.0, sigma: 1e-19, pInel: 0.3, ionization: 21.6 },
};

// Effective grid spacing G1-G2 (m).
export const TUBE = { L: 1e-3 };

// Neon tube: about 10 hPa at room temperature (fixed in the model).
export const NE_FILL = { pressurePa: 1000, tempC: 20 };

// log10(p/Pa) = A - B/T(K), linear fit to tabulated Hg vapour pressures, 100-200 degC.
export function hgVaporPressure(tempC) {
  const T = tempC + 273.15;
  return Math.pow(10, 10.05 - 3163 / T);
}

export function numberDensity(pressurePa, tempK) {
  return pressurePa / (K_B * tempK);
}

// Mean free path (m) of an electron between collisions, lambda = 1/(n sigma).
export function meanFreePath(gasId, tempC) {
  const gas = GAS[gasId];
  if (!gas) throw new Error('unknown gas: ' + gasId);
  const p = gasId === 'hg' ? hgVaporPressure(tempC) : NE_FILL.pressurePa;
  const T = (gasId === 'hg' ? tempC : NE_FILL.tempC) + 273.15;
  return 1 / (numberDensity(p, T) * gas.sigma);
}

export function thermalEnergyEV(tempK) {
  return (K_B * tempK) / E_CHARGE;
}

// Photon wavelength (nm) for an energy in eV: lambda = h c / E.
export function wavelengthNm(energyEV) {
  return 1239.841984 / energyEV;
}

// exp(-dE/kT) for dE in eV.
export function boltzmannFactor(dE, tempK) {
  return Math.exp(-dE / thermalEnergyEV(tempK));
}

// Energy levels (eV above ground state) for the level ladder in section 1.
// Values rounded from NIST ASD; the highlighted level is the one excited in the experiment
// (Ne: centre of the 2p5 3p group, 18.4-19.8 eV).
export const LEVELS = {
  hg: {
    ground: '6 ¹S₀',
    ionization: 10.44,
    levels: [
      { label: '6 ³P₀', e: 4.67 },
      { label: '6 ³P₁', e: 4.89, highlight: true },
      { label: '6 ³P₂', e: 5.46 },
      { label: '6 ¹P₁', e: 6.70 },
    ],
  },
  ne: {
    ground: '2p⁶ ¹S₀',
    ionization: 21.56,
    levels: [
      { label: '2p⁵3s', e: 16.7 },
      { label: '2p⁵3p', e: 19.0, highlight: true },
    ],
  },
};
