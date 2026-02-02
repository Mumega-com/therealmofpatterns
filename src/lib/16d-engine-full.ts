/**
 * The Realm of Patterns - Full 16D Calculation Engine
 * FRC 16D.002 Complete Implementation
 *
 * Matches core/frc_16d_full_spec.py specification
 */

import { Vector8D, Vector16D } from '../types';

// ============================================
// Constants
// ============================================

// Planet → Dimension Weight Matrix (W)
// Rows: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
// Cols: P, E, μ, V, N, Δ, R, Φ
const W: number[][] = [
  [1.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0], // Sun → P
  [0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.3], // Moon → R
  [0.0, 0.0, 1.0, 0.0, 0.3, 0.0, 0.0, 0.0], // Mercury → μ
  [0.0, 0.3, 0.0, 1.0, 0.0, 0.0, 0.3, 0.0], // Venus → V
  [0.3, 0.0, 0.0, 0.3, 0.0, 1.0, 0.0, 0.0], // Mars → Δ
  [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.3], // Jupiter → N
  [0.3, 1.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0], // Saturn → E
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 1.0], // Uranus → Φ
  [0.0, 0.0, 0.3, 0.0, 0.3, 0.0, 0.0, 1.0], // Neptune → Φ
  [0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.3, 0.0], // Pluto
];

// Planet Importance Weights (ω)
const OMEGA: number[] = [2.0, 2.0, 1.5, 1.5, 1.5, 1.0, 1.0, 0.7, 0.7, 0.7];

// Dimension names
const DIM_NAMES = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ'];
const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];
const ELEMENTS = [
  'Fire', 'Earth', 'Air', 'Water',
  'Fire', 'Earth', 'Air', 'Water',
  'Fire', 'Earth', 'Air', 'Water'
];

// Vedic Dasha boost factors
type DashaBoosts = { [planet: string]: { [dim: string]: number } };
const DASHA_BOOSTS: DashaBoosts = {
  Sun: { P: 1.3, N: 1.2, Δ: 1.2 },
  Moon: { R: 1.3, Φ: 1.2, V: 1.1 },
  Mercury: { μ: 1.3, N: 1.2 },
  Venus: { V: 1.3, E: 1.1, R: 1.2 },
  Mars: { Δ: 1.3, V: 1.2, P: 1.1 },
  Jupiter: { N: 1.3, Φ: 1.2, μ: 1.1 },
  Saturn: { E: 1.3, P: 1.2, Δ: 1.1 },
  Rahu: { Δ: 1.4, P: 1.2, N: 1.1 },
  Ketu: { Φ: 1.4, N: 1.2, μ: 1.1 }
};

// ============================================
// Utility Functions
// ============================================

/**
 * Canonical activation function: a(θ) = (cos(θ) + 1) / 2
 * 0° Aries = 1.0, 180° Libra = 0.0
 */
export function activation(longitude: number): number {
  return (Math.cos((longitude * Math.PI) / 180) + 1) / 2;
}

/**
 * Max normalization (highest value = 1.0)
 */
function maxNormalize(vector: number[]): number[] {
  const maxVal = Math.max(...vector);
  return vector.map((v) => v / maxVal);
}

/**
 * L2 norm (magnitude)
 */
function l2Norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
}

/**
 * Compute variance
 */
function variance(vector: number[]): number {
  const mean = vector.reduce((sum, v) => sum + v, 0) / vector.length;
  return vector.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vector.length;
}

// ============================================
// Sign Modulation
// ============================================

function computeSignModulation(planetarySigns: string[]): { [dim: string]: number } {
  // Count elements
  const elementCounts: { [element: string]: number } = {
    Fire: 0,
    Water: 0,
    Air: 0,
    Earth: 0
  };

  for (const sign of planetarySigns) {
    const signIdx = SIGNS.indexOf(sign);
    if (signIdx >= 0) {
      const element = ELEMENTS[signIdx];
      elementCounts[element]++;
    }
  }

  // Normalize to percentages
  const total = Object.values(elementCounts).reduce((sum, c) => sum + c, 0);
  const elementPct: { [element: string]: number } = {};
  for (const [elem, count] of Object.entries(elementCounts)) {
    elementPct[elem] = count / total;
  }

  // Initialize modulation factors
  const modulation: { [dim: string]: number } = {};
  DIM_NAMES.forEach((dim) => (modulation[dim] = 1.0));

  // Fire effects: boost P, N, Δ; dampen Φ
  const fireStrength = elementPct['Fire'];
  modulation['P'] *= 1 + 0.2 * fireStrength;
  modulation['N'] *= 1 + 0.2 * fireStrength;
  modulation['Δ'] *= 1 + 0.2 * fireStrength;
  modulation['Φ'] *= 1 - 0.2 * fireStrength;

  // Water effects: boost Φ, R, μ; dampen Δ
  const waterStrength = elementPct['Water'];
  modulation['Φ'] *= 1 + 0.2 * waterStrength;
  modulation['R'] *= 1 + 0.2 * waterStrength;
  modulation['μ'] *= 1 + 0.2 * waterStrength;
  modulation['Δ'] *= 1 - 0.2 * waterStrength;

  // Air effects: boost μ, R, E; dampen V
  const airStrength = elementPct['Air'];
  modulation['μ'] *= 1 + 0.2 * airStrength;
  modulation['R'] *= 1 + 0.2 * airStrength;
  modulation['E'] *= 1 + 0.2 * airStrength;
  modulation['V'] *= 1 - 0.2 * airStrength;

  // Earth effects: boost E, V, P; dampen N
  const earthStrength = elementPct['Earth'];
  modulation['E'] *= 1 + 0.2 * earthStrength;
  modulation['V'] *= 1 + 0.2 * earthStrength;
  modulation['P'] *= 1 + 0.2 * earthStrength;
  modulation['N'] *= 1 - 0.2 * earthStrength;

  return modulation;
}

function applySignModulation(
  uBase: number[],
  modulation: { [dim: string]: number }
): number[] {
  return uBase.map((val, i) => val * modulation[DIM_NAMES[i]]);
}

// ============================================
// House Weighting
// ============================================

function computeHouseWeights(planetaryHouses: number[]): number[] {
  const angular = [1, 4, 7, 10];
  const succedent = [2, 5, 8, 11];

  return planetaryHouses.map((house) => {
    if (angular.includes(house)) return 1.5;
    if (succedent.includes(house)) return 1.2;
    return 1.0;
  });
}

// ============================================
// Inner Octave (Karma)
// ============================================

function computeInner8D(
  natalLongitudes: number[],
  planetarySigns: string[],
  planetaryHouses: number[]
): Vector8D {
  // Step 1: House weighting
  const houseWeights = computeHouseWeights(planetaryHouses);
  const weightedOmega = OMEGA.map((w, i) => w * houseWeights[i]);

  // Step 2: Activation
  const activations = natalLongitudes.map((lon) => activation(lon));

  // Step 3: Weighted sum
  const uRaw = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      uRaw[i] += weightedOmega[j] * activations[j] * W[j][i];
    }
  }

  // Step 4: Max normalize
  const uBase = maxNormalize(uRaw);

  // Step 5: Sign modulation
  const signMod = computeSignModulation(planetarySigns);
  const uModulated = applySignModulation(uBase, signMod);

  // Step 6: Final max normalize
  return maxNormalize(uModulated) as Vector8D;
}

// ============================================
// Outer Octave (Dharma)
// ============================================

function getVedicDasha(birthDate: Date): [string, string] {
  // Simplified Vimshottari Dasha (for MVP)
  const dashaLords = [
    'Ketu', 'Venus', 'Sun', 'Moon', 'Mars',
    'Rahu', 'Jupiter', 'Saturn', 'Mercury'
  ];
  const dashaYears = [7, 20, 6, 10, 7, 18, 16, 19, 17];

  const now = new Date();
  const ageYears = (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  let cumulative = 0;
  for (let i = 0; i < dashaLords.length; i++) {
    if (ageYears < cumulative + dashaYears[i]) {
      const maha = dashaLords[i];
      const anta = dashaLords[(i + 1) % dashaLords.length];
      return [maha, anta];
    }
    cumulative += dashaYears[i];
  }

  return ['Ketu', 'Venus'];
}

function applyVedicBoosts(
  uTransit: number[],
  mahadasha: string,
  antardasha: string
): number[] {
  const uBoosted = [...uTransit];

  // Apply Mahadasha boosts (70%)
  if (mahadasha in DASHA_BOOSTS) {
    const boosts = DASHA_BOOSTS[mahadasha];
    for (const [dim, factor] of Object.entries(boosts)) {
      const dimIdx = DIM_NAMES.indexOf(dim);
      if (dimIdx >= 0) {
        uBoosted[dimIdx] *= 1 + 0.7 * (factor - 1);
      }
    }
  }

  // Apply Antardasha boosts (30%)
  if (antardasha in DASHA_BOOSTS) {
    const boosts = DASHA_BOOSTS[antardasha];
    for (const [dim, factor] of Object.entries(boosts)) {
      const dimIdx = DIM_NAMES.indexOf(dim);
      if (dimIdx >= 0) {
        uBoosted[dimIdx] *= 1 + 0.3 * (factor - 1);
      }
    }
  }

  return uBoosted;
}

function computeOuter8D(transitLongitudes: number[], birthDate: Date): Vector8D {
  // Step 1: Compute transit vector
  const activations = transitLongitudes.map((lon) => activation(lon));

  const uTransitRaw = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      uTransitRaw[i] += OMEGA[j] * activations[j] * W[j][i];
    }
  }

  const uTransit = maxNormalize(uTransitRaw);

  // Step 2: Get Vedic Dasha
  const [mahadasha, antardasha] = getVedicDasha(birthDate);

  // Step 3: Apply Vedic boosts
  const uVedic = applyVedicBoosts(uTransit, mahadasha, antardasha);
  const uVedicNorm = maxNormalize(uVedic);

  // Step 4: Combine 50/50
  const uOuter = uTransit.map((v, i) => 0.5 * v + 0.5 * uVedicNorm[i]);

  // Step 5: Final max normalize
  return maxNormalize(uOuter) as Vector8D;
}

// ============================================
// Kappa (κ) - Coupling
// ============================================

function aspectAngle(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function aspectToKappa(angle: number, orb: number = 5.0): number {
  const gaussianDecay = (angle: number, exact: number, orb: number) =>
    Math.exp(-(((angle - exact) / orb) ** 2));

  // Major aspects
  if (Math.abs(angle - 0) < orb) {
    return 1.0 * gaussianDecay(angle, 0, orb);
  } else if (Math.abs(angle - 120) < orb) {
    return 0.8 * gaussianDecay(angle, 120, orb);
  } else if (Math.abs(angle - 60) < orb) {
    return 0.5 * gaussianDecay(angle, 60, orb);
  } else if (Math.abs(angle - 90) < orb) {
    return -0.5 * gaussianDecay(angle, 90, orb);
  } else if (Math.abs(angle - 180) < orb) {
    return -0.8 * gaussianDecay(angle, 180, orb);
  } else {
    return 0.0;
  }
}

function computeGlobalKappa(
  natalLongitudes: number[],
  transitLongitudes: number[]
): { kappaBar: number; kappaDims: number[] } {
  // Compute aspect-based kappa for each planet
  const kappas = natalLongitudes.map((natalLon, i) => {
    const angle = aspectAngle(natalLon, transitLongitudes[i]);
    return aspectToKappa(angle);
  });

  // Global mean
  const kappaBar = kappas.reduce((sum, k) => sum + k, 0) / kappas.length;

  // Per-dimension kappa
  const kappaDims = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    let weightedSum = 0;
    let weightTotal = 0;
    for (let j = 0; j < 10; j++) {
      if (W[j][i] > 0) {
        weightedSum += kappas[j] * W[j][i] * OMEGA[j];
        weightTotal += W[j][i] * OMEGA[j];
      }
    }
    kappaDims[i] = weightTotal > 0 ? weightedSum / weightTotal : 0;
  }

  return { kappaBar, kappaDims };
}

// ============================================
// RU (Resonance Units)
// ============================================

function computeRU(u16: number[], kappaBar: number, natalLongitudes: number[]): number {
  // Extract planet strengths
  const activations = natalLongitudes.map((lon) => activation(lon));
  const marsStrength = activations[4]; // Mars
  const sunStrength = activations[0]; // Sun
  const jupiterStrength = activations[5]; // Jupiter

  // Alpha (base energy)
  const alpha = (marsStrength + sunStrength) * jupiterStrength;

  // Witness magnitude (L2 norm of full 16D)
  const wMag = l2Norm(u16);

  // Coherence
  const varianceVal = variance(u16);
  const cJoint = 1 / (1 + varianceVal);

  // Compute RU
  const ruRaw = alpha * wMag * Math.abs(kappaBar) * cJoint;

  // Scale to 0-100 (empirical factor)
  return ruRaw * 35;
}

// ============================================
// Failure Modes & Diagnostics
// ============================================

function classifyFailureMode(ru: number, kappaBar: number, w: number): string {
  if (ru < 10 && kappaBar < 0.3) return 'Collapse';
  if (kappaBar < 0) return 'Inversion';
  if (w > 2.5 && kappaBar < 0.5) return 'Dissociation';
  if (ru > 45 && kappaBar < 0.5) return 'Dispersion';
  return 'Healthy';
}

function computeElderProgress(kappaBar: number, ru: number, w: number): number {
  const kappaProgress = Math.min(kappaBar / 0.85, 1.0);
  const ruProgress = Math.min(ru / 45.0, 1.0);
  const wProgress = Math.min(w / 2.5, 1.0);

  const progress = 0.5 * kappaProgress + 0.3 * ruProgress + 0.2 * wProgress;
  return Math.min(progress, 1.0);
}

// ============================================
// Main API
// ============================================

export interface Full16DProfile {
  inner_8d: Vector8D;
  outer_8d: Vector8D;
  U_16: Vector16D;
  kappa_bar: number;
  kappa_dims: number[];
  RU: number;
  W: number;
  C: number;
  dominant: {
    index: number;
    symbol: string;
    value: number;
    name: string;
  };
  failure_mode: string;
  elder_progress: number;
  timestamp: string;
}

/**
 * Compute full 16D Universal Vector profile
 *
 * NOTE: This is a simplified client-side implementation.
 * For production, use server-side API with proper ephemeris (Swiss Ephemeris).
 */
export function computeFull16DProfile(
  natalLongitudes: number[],
  planetarySigns: string[],
  planetaryHouses: number[],
  transitLongitudes: number[],
  birthDate: Date
): Full16DProfile {
  // Compute Inner Octave (Karma)
  const inner8d = computeInner8D(natalLongitudes, planetarySigns, planetaryHouses);

  // Compute Outer Octave (Dharma)
  const outer8d = computeOuter8D(transitLongitudes, birthDate);

  // Full 16D vector
  const u16 = [...inner8d, ...outer8d] as Vector16D;

  // Compute κ (coupling)
  const { kappaBar, kappaDims } = computeGlobalKappa(natalLongitudes, transitLongitudes);

  // Compute metrics
  const W_mag = l2Norm(u16);
  const C = 1 / (1 + variance(u16));
  const RU = computeRU(u16, kappaBar, natalLongitudes);

  // Diagnostics
  const failureMode = classifyFailureMode(RU, kappaBar, W_mag);
  const elderProgress = computeElderProgress(kappaBar, RU, W_mag);

  // Dominant dimension
  const dominantIdx = inner8d.indexOf(Math.max(...inner8d));
  const dominantSymbol = DIM_NAMES[dominantIdx];
  const dimensionNames: { [key: string]: string } = {
    P: 'Phase/Identity',
    E: 'Existence/Structure',
    μ: 'Cognition/Mind',
    V: 'Value/Beauty',
    N: 'Narrative/Growth',
    Δ: 'Action/Momentum',
    R: 'Relation/Connection',
    Φ: 'Field/Witness'
  };

  return {
    inner_8d: inner8d,
    outer_8d: outer8d,
    U_16: u16,
    kappa_bar: kappaBar,
    kappa_dims: kappaDims,
    RU,
    W: W_mag,
    C,
    dominant: {
      index: dominantIdx,
      symbol: dominantSymbol,
      value: inner8d[dominantIdx],
      name: dimensionNames[dominantSymbol]
    },
    failure_mode: failureMode,
    elder_progress: elderProgress,
    timestamp: new Date().toISOString()
  };
}
