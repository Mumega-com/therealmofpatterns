/**
 * Personal Transit Engine
 *
 * Computes personalized predictions using real ephemeris:
 * - User's natal 16D vector (from birth data with real planetary positions)
 * - Current transit positions (real ephemeris, not approximations)
 * - Aspect-based κ (kappa) coupling with Gaussian decay
 * - Vedic Dasha integration for outer octave
 */

import {
  compute16DFromBirthData,
  computeFromBirthData,
  compute8D,
  cosineResonance,
  getDominant,
} from './16d-engine';
import {
  getLongitudesFromBirthData,
  getPlanetaryLongitudes,
  birthDataToDate,
} from './ephemeris';
import {
  computeGlobalKappa,
  computeOuterOctave,
  computeRU,
  classifyFailureMode,
  computeElderProgress,
} from './transit-engine';
import { calibratePrediction, getCalibrationProfile } from './prediction-calibration';
import type { BirthData, Vector16D } from '../types';

// ============================================
// Types
// ============================================
export interface PersonalPrediction {
  predictedKappa: number;
  confidence: number;
  dominantTransit: {
    name: string;
    symbol: string;
    effect: 'amplify' | 'challenge' | 'neutral';
  };
  optimalWindows: {
    start: string;
    end: string;
    activity: 'focused_work' | 'creative' | 'social' | 'rest' | 'important_decisions';
    quality: number;
  }[];
  warnings: string[];
  opportunities: string[];
  failureMode: string;
  elderProgress: number;
  RU: number;
}

export interface TransitAspect {
  transitPlanet: string;
  natalDimension: string;
  aspectType: 'conjunction' | 'opposition' | 'trine' | 'square';
  strength: number;
  meaning: string;
}

// ============================================
// Core Functions
// ============================================

/**
 * Get stored birth data
 */
function getStoredBirthData(): BirthData | null {
  if (typeof window === 'undefined') return null;
  const str = localStorage.getItem('rop_birth_data_full');
  if (!str) return null;
  try {
    return JSON.parse(str) as BirthData;
  } catch {
    return null;
  }
}

/**
 * Get or compute the user's natal 16D vector using real ephemeris
 */
export function getNatal16D(): Vector16D | null {
  if (typeof window === 'undefined') return null;

  const birthData = getStoredBirthData();
  if (!birthData) return null;

  // Always recompute with real ephemeris (fast enough client-side)
  const natal16D = compute16DFromBirthData(birthData);
  localStorage.setItem('rop_natal_16d', JSON.stringify(natal16D));
  return natal16D;
}

/**
 * Compute today's transit 16D vector using real ephemeris.
 * Inner = transit positions through W matrix
 * Outer = 1 - inner (shadow)
 */
export function getTodayTransit16D(): Vector16D {
  const today = new Date();
  const longs = getPlanetaryLongitudes(today);
  const inner = compute8D(longs);
  const shadow = inner.map((v: number) => 1 - v);
  return [...inner, ...shadow] as Vector16D;
}

/**
 * Compute personalized prediction for today using real ephemeris + aspect kappa
 */
export function computePersonalPrediction(): PersonalPrediction | null {
  const birthData = getStoredBirthData();
  if (!birthData) return null;

  const natal16D = getNatal16D();
  if (!natal16D) return null;

  // Real natal longitudes
  const natalLongs = getLongitudesFromBirthData(birthData);
  const birthDate = birthDataToDate(birthData);

  // Real transit longitudes
  const now = new Date();
  const transitLongs = getPlanetaryLongitudes(now);

  // Aspect-based kappa (real coupling)
  const { kappaBar } = computeGlobalKappa(natalLongs, transitLongs);

  // Outer octave with Vedic Dasha
  const outerOctave = computeOuterOctave(now, birthDate);

  // Full 16D for RU calculation
  const inner8D = computeFromBirthData(birthData);
  const U_16 = [...inner8D, ...outerOctave];

  // RU (real formula)
  const RU = computeRU(U_16, kappaBar, natalLongs);

  // Witness magnitude
  const Wmag = Math.sqrt(U_16.reduce((s, v) => s + v * v, 0));

  // Failure mode & elder progress
  const failureMode = classifyFailureMode(RU, kappaBar, Wmag);
  const elderProgress = computeElderProgress(kappaBar, RU, Wmag);

  // Get dominant dimensions
  const natalDominant = getDominant(natal16D.slice(0, 8));
  const transit16D = getTodayTransit16D();
  const transitDominant = getDominant(transit16D.slice(0, 8));

  // Apply calibration if available
  const predictedKappa = calibratePrediction(kappaBar, transitDominant.index);

  // Effect
  const effect = determineEffect(natalDominant.index, transitDominant.index);

  // Confidence
  const checkinCount = getCheckinCount();
  const calibrationProfile = getCalibrationProfile();
  const calibrationBonus = calibrationProfile && calibrationProfile.sampleCount >= 14 ? 0.15 : 0;
  const confidence = Math.min(0.5 + checkinCount * 0.03 + calibrationBonus, 0.95);

  // Optimal windows (real ephemeris)
  const optimalWindows = computeOptimalWindows(natalLongs, birthDate);

  // Insights
  const { warnings, opportunities } = generateInsights(natal16D, transit16D, predictedKappa, failureMode);

  return {
    predictedKappa,
    confidence,
    dominantTransit: {
      name: transitDominant.name,
      symbol: transitDominant.symbol,
      effect,
    },
    optimalWindows,
    warnings,
    opportunities,
    failureMode,
    elderProgress,
    RU,
  };
}

/**
 * Compute optimal windows using real Moon transit (fastest-moving body)
 */
function computeOptimalWindows(
  natalLongs: number[],
  birthDate: Date,
): PersonalPrediction['optimalWindows'] {
  const windows: PersonalPrediction['optimalWindows'] = [];
  const today = new Date();

  for (let hour = 6; hour < 22; hour += 2) {
    const hourDate = new Date(today);
    hourDate.setHours(hour, 0, 0, 0);

    const transitLongs = getPlanetaryLongitudes(hourDate);
    const { kappaBar } = computeGlobalKappa(natalLongs, transitLongs);

    if (kappaBar > 0.2) {
      const activity = determineOptimalActivity(transitLongs, hour);
      windows.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 2).toString().padStart(2, '0')}:00`,
        activity,
        quality: (kappaBar + 1) / 2, // normalize to 0-1
      });
    }
  }

  return windows.sort((a, b) => b.quality - a.quality).slice(0, 3);
}

function determineOptimalActivity(
  transitLongs: number[],
  hour: number,
): PersonalPrediction['optimalWindows'][0]['activity'] {
  const transit8D = compute8D(transitLongs);
  const dominant = getDominant(transit8D);

  if (hour < 12) {
    if (dominant.index === 2) return 'focused_work';
    if (dominant.index === 5) return 'important_decisions';
  }
  if (hour >= 12 && hour < 17) {
    if (dominant.index === 4) return 'creative';
    if (dominant.index === 6) return 'social';
  }
  if (hour >= 17) {
    if (dominant.index === 7) return 'rest';
  }

  switch (dominant.index) {
    case 0: case 1: return 'important_decisions';
    case 2: return 'focused_work';
    case 3: case 6: return 'social';
    case 4: return 'creative';
    default: return 'rest';
  }
}

function determineEffect(
  natalIdx: number,
  transitIdx: number,
): 'amplify' | 'challenge' | 'neutral' {
  if (natalIdx === transitIdx) return 'amplify';
  if (Math.abs(natalIdx - transitIdx) === 4) return 'challenge';
  return 'neutral';
}

function generateInsights(
  natal16D: Vector16D,
  transit16D: Vector16D,
  predictedKappa: number,
  failureMode: string,
): { warnings: string[]; opportunities: string[] } {
  const warnings: string[] = [];
  const opportunities: string[] = [];

  if (predictedKappa < 0.4) {
    warnings.push('Energy may feel scattered today - keep tasks simple');
  }

  // Failure mode warnings
  if (failureMode === 'Collapse') warnings.push('Very low energy — rest and recharge');
  if (failureMode === 'Inversion') warnings.push('Inner-outer tension active — avoid big decisions');
  if (failureMode === 'Dissociation') warnings.push('Energy feels disconnected — ground yourself');
  if (failureMode === 'Dispersion') warnings.push('High energy but unfocused — pick one priority');

  const shadowResonance = cosineResonance(natal16D.slice(8), transit16D.slice(8));
  if (shadowResonance > 0.7) {
    warnings.push('Shadow patterns may surface - practice self-awareness');
  }

  if (predictedKappa > 0.75) {
    opportunities.push('Strong alignment today - good for important decisions');
  }
  if (transit16D[4] > 0.7 && natal16D[4] > 0.5) {
    opportunities.push('Creative expansion favored - pursue new ideas');
  }
  if (transit16D[6] > 0.7) {
    opportunities.push('Social connections amplified - reach out to others');
  }

  return { warnings, opportunities };
}

function getCheckinCount(): number {
  if (typeof window === 'undefined') return 0;
  const history = localStorage.getItem('rop_checkin_history');
  if (!history) return 0;
  try {
    const { entries } = JSON.parse(history);
    return entries?.length || 0;
  } catch {
    return 0;
  }
}

export function hasPersonalizedData(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('rop_birth_data_full') !== null;
}

export function clearNatalCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rop_natal_16d');
}
