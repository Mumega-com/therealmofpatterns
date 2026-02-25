/**
 * The Realm of Patterns - 16D Calculation Engine
 * FRC 16D.002 Implementation
 *
 * Uses real ephemeris (astronomy-engine) for accurate planetary positions.
 * Implements full spec: house weighting, sign modulation, max-normalization.
 */

import type { Vector8D, Vector16D, BirthData, DimensionInfo } from '../types';
import { DIMENSION_METADATA } from '../types';
import {
  getLongitudesFromBirthData,
  getPlanetaryLongitudes,
  getPlanetarySigns,
  getPlanetaryHouses,
  birthDataToDate,
  ELEMENTS,
} from './ephemeris';

// ============================================
// Planet-to-Dimension Weight Matrix (W)
// ============================================
// Rows: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
// Cols: P, E, μ, V, N, Δ, R, Φ
export const W: number[][] = [
  [1.0, 0.0, 0.0, 0.0, 0.3, 0.3, 0.0, 0.0], // Sun
  [0.0, 0.0, 0.0, 0.3, 0.0, 0.0, 1.0, 0.3], // Moon
  [0.0, 0.0, 1.0, 0.0, 0.3, 0.0, 0.0, 0.0], // Mercury
  [0.0, 0.3, 0.0, 1.0, 0.0, 0.0, 0.3, 0.0], // Venus
  [0.3, 0.0, 0.0, 0.3, 0.0, 1.0, 0.0, 0.0], // Mars
  [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.3], // Jupiter
  [0.3, 1.0, 0.0, 0.0, 0.0, 0.3, 0.0, 0.0], // Saturn
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.0, 1.0], // Uranus
  [0.0, 0.0, 0.3, 0.0, 0.3, 0.0, 0.0, 1.0], // Neptune
  [0.0, 0.0, 0.3, 0.3, 0.0, 0.0, 0.3, 0.0], // Pluto
];

// ============================================
// Planet Importance Weights (ω)
// ============================================
export const OMEGA: number[] = [
  2.0, // Sun (luminary)
  2.0, // Moon (luminary)
  1.5, // Mercury (personal)
  1.5, // Venus (personal)
  1.5, // Mars (personal)
  1.0, // Jupiter (social)
  1.0, // Saturn (social)
  0.7, // Uranus (outer)
  0.7, // Neptune (outer)
  0.7, // Pluto (outer)
];

// Dimension symbols matching the Python spec
const DIM_NAMES = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ'];

// ============================================
// Activation Function
// ============================================
export function activation(longitude: number): number {
  return (Math.cos((longitude * Math.PI) / 180) + 1) / 2;
}

// ============================================
// Sign Modulation (per Python spec)
// ============================================
function computeSignModulation(signs: string[]): number[] {
  const elementCounts: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  for (const sign of signs) {
    const el = ELEMENTS[sign];
    if (el) elementCounts[el]++;
  }
  const total = signs.length;
  const pct: Record<string, number> = {};
  for (const e of Object.keys(elementCounts)) {
    pct[e] = elementCounts[e] / total;
  }

  // modulation[dimIndex] — matches DIM_NAMES order: P, E, μ, V, N, Δ, R, Φ
  const mod = new Array(8).fill(1);

  // Fire: boosts P(0), N(4), Δ(5); dampens Φ(7)
  mod[0] *= 1 + 0.2 * pct.Fire;
  mod[4] *= 1 + 0.2 * pct.Fire;
  mod[5] *= 1 + 0.2 * pct.Fire;
  mod[7] *= 1 - 0.2 * pct.Fire;

  // Water: boosts Φ(7), R(6), μ(2); dampens Δ(5)
  mod[7] *= 1 + 0.2 * pct.Water;
  mod[6] *= 1 + 0.2 * pct.Water;
  mod[2] *= 1 + 0.2 * pct.Water;
  mod[5] *= 1 - 0.2 * pct.Water;

  // Air: boosts μ(2), R(6), E(1); dampens V(3)
  mod[2] *= 1 + 0.2 * pct.Air;
  mod[6] *= 1 + 0.2 * pct.Air;
  mod[1] *= 1 + 0.2 * pct.Air;
  mod[3] *= 1 - 0.2 * pct.Air;

  // Earth: boosts E(1), V(3), P(0); dampens N(4)
  mod[1] *= 1 + 0.2 * pct.Earth;
  mod[3] *= 1 + 0.2 * pct.Earth;
  mod[0] *= 1 + 0.2 * pct.Earth;
  mod[4] *= 1 - 0.2 * pct.Earth;

  return mod;
}

// ============================================
// House Weighting (per Python spec)
// ============================================
function computeHouseWeights(houses: number[]): number[] {
  const angular = [1, 4, 7, 10];
  const succedent = [2, 5, 8, 11];
  return houses.map(h => {
    if (angular.includes(h)) return 1.5;
    if (succedent.includes(h)) return 1.2;
    return 1.0;
  });
}

// ============================================
// Max Normalization (per Python spec)
// ============================================
function maxNormalize(v: number[]): number[] {
  const mx = Math.max(...v);
  if (mx === 0) return v;
  return v.map(x => x / mx);
}

// ============================================
// Core 8D Computation — Full Spec
// ============================================
/**
 * Compute Inner 8D with house weighting + sign modulation + max-normalize.
 * Matches Python compute_inner_8d_full().
 */
export function computeInner8D(
  longitudes: number[],
  signs: string[],
  houses: number[],
): Vector8D {
  // Step 1: House weighting applied to OMEGA
  const houseWeights = computeHouseWeights(houses);
  const weightedOmega = OMEGA.map((w, i) => w * houseWeights[i]);

  // Step 2: Activations
  const a = longitudes.map(activation);

  // Step 3: Weighted matrix multiply
  const raw = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      raw[i] += weightedOmega[j] * a[j] * W[j][i];
    }
  }

  // Step 4: Max normalize
  const base = maxNormalize(raw);

  // Step 5: Sign modulation
  const signMod = computeSignModulation(signs);
  const modulated = base.map((v, i) => v * signMod[i]);

  // Step 6: Final max normalize
  return maxNormalize(modulated) as Vector8D;
}

/**
 * Simple 8D without house/sign (for transit vectors or when location unavailable)
 */
export function compute8D(longitudes: number[]): Vector8D {
  const a = longitudes.map(activation);
  const raw = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      raw[i] += OMEGA[j] * a[j] * W[j][i];
    }
  }
  return maxNormalize(raw) as Vector8D;
}

// ============================================
// 16D = Inner 8D + Outer 8D
// ============================================
/**
 * Compute full 16D: inner (natal) + outer (transit/shadow)
 */
export function compute16D(longitudes: number[]): Vector16D {
  const vector8d = compute8D(longitudes);
  const shadow = vector8d.map((v) => 1 - v) as Vector8D;
  return [...vector8d, ...shadow] as Vector16D;
}

// ============================================
// Convenience: Full pipeline from BirthData
// ============================================

/**
 * Compute Inner 8D from birth data using real ephemeris.
 * Uses location for house calculation if available.
 */
export function computeFromBirthData(birthData: BirthData): Vector8D {
  const longitudes = getLongitudesFromBirthData(birthData);
  const signs = getPlanetarySigns(longitudes);

  if (birthData.latitude != null && birthData.longitude != null) {
    const date = birthDataToDate(birthData);
    const houses = getPlanetaryHouses(longitudes, date, birthData.latitude, birthData.longitude);
    return computeInner8D(longitudes, signs, houses);
  }

  // Fallback without house weighting
  return compute8D(longitudes);
}

/**
 * Compute full 16D from birth data.
 * Inner octave = natal chart with houses + signs.
 * Shadow octave = 1 - inner.
 */
export function compute16DFromBirthData(birthData: BirthData): Vector16D {
  const inner = computeFromBirthData(birthData);
  const shadow = inner.map((v) => 1 - v) as Vector8D;
  return [...inner, ...shadow] as Vector16D;
}

/**
 * @deprecated Use getLongitudesFromBirthData from ephemeris.ts
 * Kept for backward compatibility — now uses real ephemeris.
 */
export function approximateLongitudes(birthData: BirthData): number[] {
  return getLongitudesFromBirthData(birthData);
}

// ============================================
// Resonance (Similarity) Computation
// ============================================
export function cosineResonance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) {
    throw new Error('Vectors must have same length');
  }
  const dot = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
  const mag1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));
  if (mag1 === 0 || mag2 === 0) return 0;
  return dot / (mag1 * mag2);
}

// ============================================
// Dimension Analysis
// ============================================
export function getDominant(vector: number[]): DimensionInfo {
  let maxIndex = 0;
  let maxValue = vector[0];
  for (let i = 1; i < 8; i++) {
    if (vector[i] > maxValue) {
      maxValue = vector[i];
      maxIndex = i;
    }
  }
  const meta = DIMENSION_METADATA[maxIndex];
  return { ...meta, value: maxValue, shadow: 1 - maxValue, rank: 1 };
}

export function analyzeDimensions(vector8d: number[]): DimensionInfo[] {
  const dims = DIMENSION_METADATA.map((meta, i) => ({
    ...meta,
    value: vector8d[i],
    shadow: 1 - vector8d[i],
    rank: 0,
  }));
  dims.sort((a, b) => b.value - a.value);
  dims.forEach((d, i) => (d.rank = i + 1));
  return dims;
}

// ============================================
// Interpretation
// ============================================
export function interpretResonance(rho: number): string {
  if (rho >= 0.95) return 'Near-identical pattern';
  if (rho >= 0.85) return 'Strong resonance';
  if (rho >= 0.70) return 'Moderate resonance';
  if (rho >= 0.50) return 'Weak resonance';
  return 'Complementary/opposite';
}

export function getDimensionTeaser(dominant: DimensionInfo): string {
  const teasers: Record<string, string> = {
    P: 'Your Phase dimension leads - you are becoming who you were meant to be.',
    E: 'Your Existence dimension grounds you - structure and form are your allies.',
    μ: 'Your Cognition shines brightest - mind and understanding guide your path.',
    V: 'Your Value dimension peaks - you treasure beauty and seek harmony.',
    N: 'Your Expansion leads - growth and meaning drive everything you do.',
    Δ: 'Your Action dimension dominates - force and movement define your nature.',
    R: 'Your Relation dimension is strongest - connection and care are your gifts.',
    Φ: 'Your Field dimension resonates highest - you witness and unify.',
  };
  return teasers[dominant.symbol] || 'Your unique pattern awaits discovery.';
}
