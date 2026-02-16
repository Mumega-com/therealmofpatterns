/**
 * The Realm of Patterns - 16D Calculation Engine
 * FRC 16D.002 Implementation
 */

import type { Vector8D, Vector16D, BirthData, DimensionInfo } from '../types';
import { DIMENSION_METADATA } from '../types';

// ============================================
// Planet-to-Dimension Weight Matrix (W)
// ============================================
// Rows: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
// Cols: P, E, μ, V, N, Δ, R, Φ
const W: number[][] = [
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
const OMEGA: number[] = [
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

// ============================================
// Activation Function
// ============================================
/**
 * Convert ecliptic longitude (0-360°) to activation value (0-1)
 * 0° (Aries point) → 1.0 (maximum)
 * 180° (Libra point) → 0.0 (minimum)
 */
export function activation(longitude: number): number {
  return (Math.cos((longitude * Math.PI) / 180) + 1) / 2;
}

// ============================================
// Simplified Ephemeris (Client-Side Approximation)
// ============================================
/**
 * Approximate planetary longitudes for a given date
 * Uses simplified orbital mechanics - suitable for previews
 * For production, use JPL Horizons or Swiss Ephemeris
 */
export function approximateLongitudes(birthData: BirthData): number[] {
  const { year, month, day } = birthData;

  // Julian Day calculation (simplified)
  const jd =
    367 * year -
    Math.floor((7 * (year + Math.floor((month + 9) / 12))) / 4) +
    Math.floor((275 * month) / 9) +
    day +
    1721013.5;

  // Days since J2000.0
  const T = (jd - 2451545.0) / 36525;

  // Mean longitudes (degrees, simplified Keplerian elements)
  const meanLongitudes: number[] = [
    // Sun (actually Earth's position + 180)
    (280.46646 + 36000.76983 * T) % 360,
    // Moon
    (218.3165 + 481267.8813 * T) % 360,
    // Mercury
    (252.2509 + 149472.6746 * T) % 360,
    // Venus
    (181.9798 + 58517.8157 * T) % 360,
    // Mars
    (355.433 + 19140.2993 * T) % 360,
    // Jupiter
    (34.3515 + 3034.9057 * T) % 360,
    // Saturn
    (50.0774 + 1222.1138 * T) % 360,
    // Uranus
    (314.055 + 428.4669 * T) % 360,
    // Neptune
    (304.349 + 218.4602 * T) % 360,
    // Pluto (very simplified)
    (238.929 + 145.1781 * T) % 360,
  ];

  // Normalize to 0-360 range
  return meanLongitudes.map((l) => ((l % 360) + 360) % 360);
}

// ============================================
// Core 8D Computation
// ============================================
/**
 * Compute 8D identity vector from planetary longitudes
 */
export function compute8D(longitudes: number[]): Vector8D {
  const dims = new Array(8).fill(0);

  // Apply weighted sum: μᵢ = Σⱼ (ωⱼ × aⱼ × Wⱼᵢ)
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      dims[i] += OMEGA[j] * activation(longitudes[j]) * W[j][i];
    }
  }

  // Normalize to unit sphere (L2 norm)
  const magnitude = Math.sqrt(dims.reduce((sum, val) => sum + val * val, 0));
  const normalized = dims.map((d) => d / magnitude) as Vector8D;

  return normalized;
}

/**
 * Compute full 16D vector (8D + shadow dimensions)
 */
export function compute16D(longitudes: number[]): Vector16D {
  const vector8d = compute8D(longitudes);
  const shadow = vector8d.map((v) => 1 - v) as Vector8D;
  return [...vector8d, ...shadow] as Vector16D;
}

/**
 * Compute 8D vector from birth data (convenience function)
 */
export function computeFromBirthData(birthData: BirthData): Vector8D {
  const longitudes = approximateLongitudes(birthData);
  return compute8D(longitudes);
}

/**
 * Compute full 16D from birth data
 */
export function compute16DFromBirthData(birthData: BirthData): Vector16D {
  const longitudes = approximateLongitudes(birthData);
  return compute16D(longitudes);
}

// ============================================
// Resonance (Similarity) Computation
// ============================================
/**
 * Compute cosine similarity between two vectors
 * Returns value between 0 and 1
 */
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
/**
 * Get dominant dimension from vector
 */
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
  return {
    ...meta,
    value: maxValue,
    shadow: 1 - maxValue,
    rank: 1,
  };
}

/**
 * Get all dimension info sorted by value
 */
export function analyzeDimensions(vector8d: number[]): DimensionInfo[] {
  const dims = DIMENSION_METADATA.map((meta, i) => ({
    ...meta,
    value: vector8d[i],
    shadow: 1 - vector8d[i],
    rank: 0,
  }));

  // Sort by value descending and assign ranks
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
