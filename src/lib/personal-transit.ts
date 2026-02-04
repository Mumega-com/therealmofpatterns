/**
 * Personal Transit Engine
 *
 * Computes personalized predictions by comparing:
 * - User's natal 16D vector (computed once from birth data)
 * - Current transit 16D vector (computed daily from planetary positions)
 *
 * The resonance between these vectors predicts the user's experience.
 */

import {
  compute16DFromBirthData,
  cosineResonance,
  getDominant,
  approximateLongitudes,
} from './16d-engine';
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
 * Get or compute the user's natal 16D vector
 */
export function getNatal16D(): Vector16D | null {
  if (typeof window === 'undefined') return null;

  // Check cache first
  const cached = localStorage.getItem('rop_natal_16d');
  if (cached) {
    try {
      return JSON.parse(cached) as Vector16D;
    } catch {
      // Fall through to recompute
    }
  }

  // Try to compute from birth data
  const birthDataStr = localStorage.getItem('rop_birth_data_full');
  if (!birthDataStr) return null;

  try {
    const birthData = JSON.parse(birthDataStr) as BirthData;
    const natal16D = compute16DFromBirthData(birthData);
    localStorage.setItem('rop_natal_16d', JSON.stringify(natal16D));
    return natal16D;
  } catch {
    return null;
  }
}

/**
 * Compute today's transit 16D vector
 */
export function getTodayTransit16D(): Vector16D {
  const today = new Date();
  const transitBirthData: BirthData = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
    hour: today.getHours(),
    minute: today.getMinutes(),
  };
  return compute16DFromBirthData(transitBirthData);
}

/**
 * Compute personalized prediction for today
 */
export function computePersonalPrediction(): PersonalPrediction | null {
  const natal16D = getNatal16D();
  if (!natal16D) {
    return null; // No birth data available
  }

  const transit16D = getTodayTransit16D();

  // Compute base resonance (kappa)
  const rawKappa = cosineResonance(natal16D, transit16D);

  // Get dominant dimensions
  const natalDominant = getDominant(natal16D.slice(0, 8));
  const transitDominant = getDominant(transit16D.slice(0, 8));

  // Apply calibration if available (learns from user feedback)
  const predictedKappa = calibratePrediction(rawKappa, transitDominant.index);

  // Determine effect based on dimension interaction
  const effect = determineEffect(natalDominant.index, transitDominant.index);

  // Calculate confidence based on how much data we have
  const checkinCount = getCheckinCount();
  const calibrationProfile = getCalibrationProfile();
  const calibrationBonus = calibrationProfile && calibrationProfile.sampleCount >= 14 ? 0.15 : 0;
  const confidence = Math.min(0.5 + checkinCount * 0.03 + calibrationBonus, 0.95);

  // Compute optimal windows throughout the day
  const optimalWindows = computeOptimalWindows(natal16D);

  // Generate warnings and opportunities
  const { warnings, opportunities } = generateInsights(natal16D, transit16D, predictedKappa);

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
  };
}

/**
 * Compute optimal windows throughout the day based on Moon transit
 */
function computeOptimalWindows(natal16D: Vector16D): PersonalPrediction['optimalWindows'] {
  const windows: PersonalPrediction['optimalWindows'] = [];
  const today = new Date();

  // Check every 2 hours
  for (let hour = 6; hour < 22; hour += 2) {
    const hourlyBirthData: BirthData = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
      hour,
      minute: 0,
    };

    const hourlyTransit = compute16DFromBirthData(hourlyBirthData);
    const resonance = cosineResonance(natal16D, hourlyTransit);

    // Only include windows with good resonance
    if (resonance > 0.6) {
      const activity = determineOptimalActivity(hourlyTransit, hour);
      windows.push({
        start: `${hour.toString().padStart(2, '0')}:00`,
        end: `${(hour + 2).toString().padStart(2, '0')}:00`,
        activity,
        quality: resonance,
      });
    }
  }

  // Sort by quality and return top 3
  return windows.sort((a, b) => b.quality - a.quality).slice(0, 3);
}

/**
 * Determine what activity is optimal based on transit energies
 */
function determineOptimalActivity(
  transit16D: Vector16D,
  hour: number
): PersonalPrediction['optimalWindows'][0]['activity'] {
  const dominant = getDominant(transit16D.slice(0, 8));

  // Morning favors focused work
  if (hour < 12) {
    if (dominant.index === 2) return 'focused_work'; // Cognition
    if (dominant.index === 5) return 'important_decisions'; // Action
  }

  // Afternoon can be creative or social
  if (hour >= 12 && hour < 17) {
    if (dominant.index === 4) return 'creative'; // Expansion
    if (dominant.index === 6) return 'social'; // Relation
  }

  // Evening favors rest and reflection
  if (hour >= 17) {
    if (dominant.index === 7) return 'rest'; // Field/Witness
  }

  // Default based on dominant dimension
  switch (dominant.index) {
    case 0:
    case 1:
      return 'important_decisions';
    case 2:
      return 'focused_work';
    case 3:
    case 6:
      return 'social';
    case 4:
      return 'creative';
    default:
      return 'rest';
  }
}

/**
 * Determine the effect of transit on natal configuration
 */
function determineEffect(
  natalDominantIndex: number,
  transitDominantIndex: number
): 'amplify' | 'challenge' | 'neutral' {
  // Same dimension = amplify
  if (natalDominantIndex === transitDominantIndex) {
    return 'amplify';
  }

  // Opposite dimensions (0-4, 1-5, 2-6, 3-7) = challenge
  if (Math.abs(natalDominantIndex - transitDominantIndex) === 4) {
    return 'challenge';
  }

  // Adjacent or other = neutral
  return 'neutral';
}

/**
 * Generate warnings and opportunities based on predictions
 */
function generateInsights(
  natal16D: Vector16D,
  transit16D: Vector16D,
  predictedKappa: number
): { warnings: string[]; opportunities: string[] } {
  const warnings: string[] = [];
  const opportunities: string[] = [];

  // Low kappa warning
  if (predictedKappa < 0.4) {
    warnings.push('Energy may feel scattered today - keep tasks simple');
  }

  // Check shadow dimensions (indices 8-15)
  const natalShadow = natal16D.slice(8);
  const transitShadow = transit16D.slice(8);

  // High shadow activation
  const shadowResonance = cosineResonance(natalShadow, transitShadow);
  if (shadowResonance > 0.7) {
    warnings.push('Shadow patterns may surface - practice self-awareness');
  }

  // High kappa opportunity
  if (predictedKappa > 0.75) {
    opportunities.push('Strong alignment today - good for important decisions');
  }

  // Check for expansion dimension (index 4)
  if (transit16D[4] > 0.7 && natal16D[4] > 0.5) {
    opportunities.push('Creative expansion favored - pursue new ideas');
  }

  // Check for relation dimension (index 6)
  if (transit16D[6] > 0.7) {
    opportunities.push('Social connections amplified - reach out to others');
  }

  return { warnings, opportunities };
}

/**
 * Get count of user's check-ins for confidence calculation
 */
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

/**
 * Check if user has birth data for personalized predictions
 */
export function hasPersonalizedData(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('rop_natal_16d') !== null;
}

/**
 * Clear cached natal data (for when birth data changes)
 */
export function clearNatalCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rop_natal_16d');
}
