/**
 * Transit Engine - Outer Octave & Coupling Dynamics
 *
 * Uses real ephemeris for planetary positions.
 * Implements FRC 16D.002 spec:
 * - κ (kappa): Aspect-based coupling with Gaussian decay
 * - RU: Resonance Units (α · W · κ̄ · C_joint)
 * - Outer Octave: 50% Western Transits + 50% Vedic Dasha
 * - Failure Modes: Collapse, Inversion, Dissociation, Dispersion
 *
 * @module transit-engine
 */

import { getPlanetaryLongitudes } from './ephemeris';
import { compute8D, activation, W, OMEGA } from './16d-engine';
import type { DiamondState } from './diamond-engine';
import { DIMENSION_SYMBOLS, createState } from './diamond-engine';

// =============================================================================
// Types
// =============================================================================

export interface TransitData {
  outerOctave: [number, number, number, number, number, number, number, number];
  kappa: number;
  RU: number;
  W: number;
  date: Date;
  failureMode: string;
  elderProgress: number;
}

export interface DailyForecast {
  date: Date;
  kappa: number;
  RU: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  primaryInfluence: string;
  advice: string;
  optimalFor: string[];
  avoidFor: string[];
  failureMode: string;
}

export interface WeeklyForecast {
  days: DailyForecast[];
  trend: 'ascending' | 'stable' | 'descending' | 'volatile';
  peakDay: Date;
  lowDay: Date;
  summary: string;
}

export interface OptimalWindow {
  start: Date;
  end: Date;
  kappa: number;
  RU: number;
  quality: 'excellent' | 'good' | 'fair';
  bestFor: string[];
}

// =============================================================================
// Constants
// =============================================================================

const DIM_NAMES = ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ'];

const DIMENSION_ACTIVITIES: Record<number, { good: string[]; avoid: string[] }> = {
  0: { good: ['starting projects', 'creative work'], avoid: ['endings', 'conclusions'] },
  1: { good: ['organizing', 'structuring'], avoid: ['radical changes'] },
  2: { good: ['learning', 'communication'], avoid: ['major decisions'] },
  3: { good: ['relationships', 'aesthetics'], avoid: ['conflict'] },
  4: { good: ['expansion', 'growth'], avoid: ['contraction'] },
  5: { good: ['action', 'competition'], avoid: ['rest', 'reflection'] },
  6: { good: ['discipline', 'long-term planning'], avoid: ['spontaneity'] },
  7: { good: ['insight', 'meditation'], avoid: ['mundane tasks'] },
};

// Vedic Dasha boosts: { dimension_index: boost_factor }
const DASHA_BOOSTS: Record<string, Record<number, number>> = {
  Sun:     { 0: 1.3, 4: 1.2, 5: 1.2 },
  Moon:    { 6: 1.3, 7: 1.2, 3: 1.1 },
  Mercury: { 2: 1.3, 4: 1.2 },
  Venus:   { 3: 1.3, 1: 1.1, 6: 1.2 },
  Mars:    { 5: 1.3, 3: 1.2, 0: 1.1 },
  Jupiter: { 4: 1.3, 7: 1.2, 2: 1.1 },
  Saturn:  { 1: 1.3, 0: 1.2, 5: 1.1 },
  Rahu:    { 5: 1.4, 0: 1.2, 4: 1.1 },
  Ketu:    { 7: 1.4, 4: 1.2, 2: 1.1 },
};

// =============================================================================
// Aspect-Based Kappa (per Python spec)
// =============================================================================

/**
 * Shortest angle between two ecliptic longitudes (0-180°)
 */
export function aspectAngle(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

/**
 * Convert aspect angle to κ coefficient with Gaussian decay.
 * Major aspects per FRC spec:
 *   Conjunction (0°): +1.0
 *   Trine (120°): +0.8
 *   Sextile (60°): +0.5
 *   Square (90°): -0.5
 *   Opposition (180°): -0.8
 */
export function aspectToKappa(angle: number, orb: number = 5.0): number {
  const gaussian = (a: number, exact: number, o: number) => {
    const ratio = (a - exact) / o;
    return Math.exp(-(ratio * ratio));
  };

  if (Math.abs(angle - 0) < orb)   return  1.0 * gaussian(angle, 0, orb);
  if (Math.abs(angle - 120) < orb) return  0.8 * gaussian(angle, 120, orb);
  if (Math.abs(angle - 60) < orb)  return  0.5 * gaussian(angle, 60, orb);
  if (Math.abs(angle - 90) < orb)  return -0.5 * gaussian(angle, 90, orb);
  if (Math.abs(angle - 180) < orb) return -0.8 * gaussian(angle, 180, orb);
  return 0;
}

/**
 * Compute global κ̄ (kappa bar) from natal-transit aspects.
 * Returns [kappaBar, kappaDims]
 */
export function computeGlobalKappa(
  natalLongs: number[],
  transitLongs: number[],
): { kappaBar: number; kappaDims: number[] } {
  // Per-planet kappa
  const kappas = natalLongs.map((nl, i) => {
    const angle = aspectAngle(nl, transitLongs[i]);
    return aspectToKappa(angle);
  });

  const kappaBar = kappas.reduce((s, k) => s + k, 0) / kappas.length;

  // Per-dimension kappa weighted by W matrix and OMEGA
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

// =============================================================================
// Vedic Dasha
// =============================================================================

const DASHA_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17]; // Vimshottari periods (total 120 yrs)

/**
 * Compute current Vedic Mahadasha and Antardasha from birth date.
 */
export function getVedicDasha(birthDate: Date): { mahadasha: string; antardasha: string } {
  const now = new Date();
  const ageYears = (now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  // Walk through cycle (repeats after 120 years)
  const ageInCycle = ageYears % 120;
  let cumulative = 0;
  for (let i = 0; i < DASHA_LORDS.length; i++) {
    if (ageInCycle < cumulative + DASHA_YEARS[i]) {
      return {
        mahadasha: DASHA_LORDS[i],
        antardasha: DASHA_LORDS[(i + 1) % DASHA_LORDS.length],
      };
    }
    cumulative += DASHA_YEARS[i];
  }
  return { mahadasha: 'Ketu', antardasha: 'Venus' };
}

/**
 * Apply Vedic Dasha boosts to outer octave vector.
 * Mahadasha: 70% weight, Antardasha: 30% weight.
 */
function applyVedicBoosts(vector: number[], mahadasha: string, antardasha: string): number[] {
  const boosted = [...vector];

  const mahaBoosts = DASHA_BOOSTS[mahadasha];
  if (mahaBoosts) {
    for (const [dimStr, factor] of Object.entries(mahaBoosts)) {
      const dim = Number(dimStr);
      boosted[dim] *= 1 + 0.7 * (factor - 1);
    }
  }

  const antaBoosts = DASHA_BOOSTS[antardasha];
  if (antaBoosts) {
    for (const [dimStr, factor] of Object.entries(antaBoosts)) {
      const dim = Number(dimStr);
      boosted[dim] *= 1 + 0.3 * (factor - 1);
    }
  }

  return boosted;
}

// =============================================================================
// Outer Octave: 50% Transits + 50% Vedic Dasha (per Python spec)
// =============================================================================

function maxNormalize(v: number[]): number[] {
  const mx = Math.max(...v);
  if (mx === 0) return v;
  return v.map(x => x / mx);
}

/**
 * Compute Outer 8D from real transit positions + Vedic Dasha.
 */
export function computeOuterOctave(
  date: Date,
  birthDate: Date,
): [number, number, number, number, number, number, number, number] {
  // Step 1: Real transit longitudes
  const transitLongs = getPlanetaryLongitudes(date);

  // Step 2: Transit vector (same W matrix computation)
  const a = transitLongs.map(l => activation(l));
  const raw = new Array(8).fill(0);
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 10; j++) {
      raw[i] += OMEGA[j] * a[j] * W[j][i];
    }
  }
  const transitVec = maxNormalize(raw);

  // Step 3: Vedic Dasha boosts
  const { mahadasha, antardasha } = getVedicDasha(birthDate);
  const vedicVec = maxNormalize(applyVedicBoosts(transitVec, mahadasha, antardasha));

  // Step 4: Combine 50/50
  const combined = transitVec.map((t, i) => 0.5 * t + 0.5 * vedicVec[i]);

  // Step 5: Final max normalize
  return maxNormalize(combined) as [number, number, number, number, number, number, number, number];
}

// =============================================================================
// RU (Resonance Units) — per Python spec
// =============================================================================

/**
 * Compute RU = α · W · κ̄ · C_joint
 * α = (Mars + Sun) × Jupiter activations
 * W = ||U_16|| (L2 norm)
 * C_joint = 1 / (1 + variance(U_16))
 */
export function computeRU(
  U_16: number[],
  kappaBar: number,
  natalLongitudes: number[],
): number {
  const activations = natalLongitudes.map(l => activation(l));
  const marsStrength = activations[4];
  const sunStrength = activations[0];
  const jupiterStrength = activations[5];

  const alpha = (marsStrength + sunStrength) * jupiterStrength;
  const Wmag = Math.sqrt(U_16.reduce((s, v) => s + v * v, 0));
  const variance = computeVariance(U_16);
  const Cjoint = 1 / (1 + variance);

  const RU_raw = alpha * Wmag * Math.abs(kappaBar) * Cjoint;
  return RU_raw * 35; // Scale to 0-100 range
}

function computeVariance(arr: number[]): number {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => { const d = v - mean; return s + d * d; }, 0) / arr.length;
}

// =============================================================================
// Failure Modes & Elder Progress (per Python spec)
// =============================================================================

export function classifyFailureMode(RU: number, kappaBar: number, Wmag: number): string {
  if (RU < 10 && kappaBar < 0.3) return 'Collapse';
  if (kappaBar < 0) return 'Inversion';
  if (Wmag > 2.5 && kappaBar < 0.5) return 'Dissociation';
  if (RU > 45 && kappaBar < 0.5) return 'Dispersion';
  return 'Healthy';
}

export function computeElderProgress(kappaBar: number, RU: number, Wmag: number): number {
  const kp = Math.min(kappaBar / 0.85, 1);
  const rp = Math.min(RU / 45, 1);
  const wp = Math.min(Wmag / 2.5, 1);
  return Math.min(0.5 * kp + 0.3 * rp + 0.2 * wp, 1);
}

// =============================================================================
// Kappa (simple cosine for backward compatibility)
// =============================================================================

export function computeKappa(
  inner: DiamondState['dimensions'],
  outer: DiamondState['dimensions'],
): number {
  let dot = 0, normI = 0, normO = 0;
  for (let i = 0; i < 8; i++) {
    dot += inner[i] * outer[i];
    normI += inner[i] * inner[i];
    normO += outer[i] * outer[i];
  }
  const denom = Math.sqrt(normI) * Math.sqrt(normO);
  return denom === 0 ? 0 : dot / denom;
}

// =============================================================================
// High-Level Transit Data
// =============================================================================

/**
 * Get full transit data for a date using real ephemeris.
 * If natalLongitudes provided, uses aspect-based kappa.
 */
export function getTransitData(
  inner: DiamondState,
  date: Date = new Date(),
  natalLongitudes?: number[],
  birthDate?: Date,
): TransitData {
  const outerOctave = birthDate
    ? computeOuterOctave(date, birthDate)
    : (() => {
        const longs = getPlanetaryLongitudes(date);
        return compute8D(longs) as [number, number, number, number, number, number, number, number];
      })();

  let kappa: number;
  if (natalLongitudes) {
    const transitLongs = getPlanetaryLongitudes(date);
    const { kappaBar } = computeGlobalKappa(natalLongitudes, transitLongs);
    kappa = kappaBar;
  } else {
    kappa = computeKappa(inner.dimensions, outerOctave);
  }

  const U_16 = [...inner.dimensions, ...outerOctave];
  const Wmag = Math.sqrt(U_16.reduce((s, v) => s + v * v, 0));
  const RU = natalLongitudes
    ? computeRU(U_16, kappa, natalLongitudes)
    : Math.max(0, Math.min(100, U_16.reduce((s, v, i) => s + inner.dimensions[i % 8] * outerOctave[i % 8], 0) * (1 + kappa) * 50));

  const failureMode = classifyFailureMode(RU, kappa, Wmag);
  const elderProgress = computeElderProgress(kappa, RU, Wmag);

  return { outerOctave, kappa, RU, W: Wmag, date, failureMode, elderProgress };
}

// =============================================================================
// Forecasting
// =============================================================================

export function getDailyForecast(
  inner: DiamondState,
  date: Date = new Date(),
  natalLongitudes?: number[],
  birthDate?: Date,
): DailyForecast {
  const transit = getTransitData(inner, date, natalLongitudes, birthDate);
  const { kappa, RU, outerOctave } = transit;

  let maxIdx = 0;
  for (let i = 1; i < 8; i++) {
    if (outerOctave[i] > outerOctave[maxIdx]) maxIdx = i;
  }

  const primaryInfluence = DIMENSION_SYMBOLS[maxIdx];
  const activities = DIMENSION_ACTIVITIES[maxIdx];

  let riskLevel: DailyForecast['riskLevel'];
  if (kappa < -0.3) riskLevel = 'critical';
  else if (kappa < 0.2 || RU < 15) riskLevel = 'high';
  else if (kappa < 0.5 || RU < 30) riskLevel = 'moderate';
  else riskLevel = 'low';

  let advice: string;
  if (kappa > 0.7) advice = 'High alignment today. Trust your instincts and take action on important matters.';
  else if (kappa > 0.4) advice = 'Good flow available. Focus on activities that match your natural strengths.';
  else if (kappa > 0) advice = 'Mixed energies. Be selective about where you invest your attention.';
  else if (kappa > -0.3) advice = 'Inner-outer tension present. Avoid major decisions; focus on maintenance.';
  else advice = 'Strong resistance pattern active. Prioritize self-care and avoid confrontation.';

  return {
    date, kappa, RU, riskLevel, primaryInfluence, advice,
    optimalFor: activities.good,
    avoidFor: activities.avoid,
    failureMode: transit.failureMode,
  };
}

export function getWeeklyForecast(
  inner: DiamondState,
  startDate: Date = new Date(),
  natalLongitudes?: number[],
  birthDate?: Date,
): WeeklyForecast {
  const days: DailyForecast[] = [];
  let peakKappa = -Infinity, lowKappa = Infinity;
  let peakDay = startDate, lowDay = startDate;

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const forecast = getDailyForecast(inner, date, natalLongitudes, birthDate);
    days.push(forecast);
    if (forecast.kappa > peakKappa) { peakKappa = forecast.kappa; peakDay = date; }
    if (forecast.kappa < lowKappa) { lowKappa = forecast.kappa; lowDay = date; }
  }

  const firstHalf = days.slice(0, 3).reduce((s, d) => s + d.kappa, 0) / 3;
  const secondHalf = days.slice(4, 7).reduce((s, d) => s + d.kappa, 0) / Math.max(days.slice(4, 7).length, 1);
  const avg = (firstHalf + secondHalf) / 2;
  const variance = days.reduce((v, d) => { const diff = d.kappa - avg; return v + diff * diff; }, 0) / 7;

  let trend: WeeklyForecast['trend'];
  if (variance > 0.1) trend = 'volatile';
  else if (secondHalf - firstHalf > 0.15) trend = 'ascending';
  else if (firstHalf - secondHalf > 0.15) trend = 'descending';
  else trend = 'stable';

  const avgKappa = days.reduce((s, d) => s + d.kappa, 0) / 7;
  let summary: string;
  if (avgKappa > 0.5) summary = 'Strong week ahead. Multiple high-alignment windows available for important work.';
  else if (avgKappa > 0.2) summary = 'Balanced week. Choose your moments carefully and don\'t overextend.';
  else summary = 'Challenging week. Focus on foundations and avoid major initiatives.';

  return { days, trend, peakDay, lowDay, summary };
}

export function findOptimalWindows(
  inner: DiamondState,
  days: number = 30,
  startDate: Date = new Date(),
  natalLongitudes?: number[],
  birthDate?: Date,
): OptimalWindow[] {
  const windows: OptimalWindow[] = [];
  let inWindow = false;
  let windowStart: Date | null = null;
  let windowKappaSum = 0, windowRUSum = 0, windowDays = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const transit = getTransitData(inner, date, natalLongitudes, birthDate);
    const isGood = transit.kappa > 0.5 && transit.RU > 30;

    if (isGood && !inWindow) {
      inWindow = true;
      windowStart = date;
      windowKappaSum = transit.kappa;
      windowRUSum = transit.RU;
      windowDays = 1;
    } else if (isGood && inWindow) {
      windowKappaSum += transit.kappa;
      windowRUSum += transit.RU;
      windowDays++;
    } else if (!isGood && inWindow && windowStart) {
      const avgK = windowKappaSum / windowDays;
      const avgR = windowRUSum / windowDays;
      const quality = avgK > 0.7 && avgR > 45 ? 'excellent' : avgK > 0.6 || avgR > 40 ? 'good' : 'fair';
      const t = getTransitData(inner, windowStart, natalLongitudes, birthDate);
      let mx = 0;
      for (let j = 1; j < 8; j++) { if (t.outerOctave[j] > t.outerOctave[mx]) mx = j; }
      windows.push({ start: windowStart, end: date, kappa: avgK, RU: avgR, quality, bestFor: DIMENSION_ACTIVITIES[mx].good });
      inWindow = false;
      windowStart = null;
    }
  }

  if (inWindow && windowStart) {
    const avgK = windowKappaSum / windowDays;
    const avgR = windowRUSum / windowDays;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);
    const quality = avgK > 0.7 && avgR > 45 ? 'excellent' : avgK > 0.6 || avgR > 40 ? 'good' : 'fair';
    const t = getTransitData(inner, windowStart, natalLongitudes, birthDate);
    let mx = 0;
    for (let j = 1; j < 8; j++) { if (t.outerOctave[j] > t.outerOctave[mx]) mx = j; }
    windows.push({ start: windowStart, end: endDate, kappa: avgK, RU: avgR, quality, bestFor: DIMENSION_ACTIVITIES[mx].good });
  }

  return windows.sort((a, b) => b.kappa - a.kappa);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  computeGlobalKappa,
  computeOuterOctave,
  computeRU,
  computeKappa,
  getTransitData,
  getDailyForecast,
  getWeeklyForecast,
  findOptimalWindows,
  classifyFailureMode,
  computeElderProgress,
  aspectAngle,
  aspectToKappa,
  getVedicDasha,
};
