/**
 * Prediction Calibration System
 *
 * Learns from prediction feedback to improve accuracy over time.
 * Tracks user-specific transit sensitivities and adjusts predictions.
 */

import { getDominant } from './16d-engine';
import type { Vector16D } from '../types';

// ============================================
// Types
// ============================================

export interface PredictionFeedback {
  date: string;
  predicted: number;
  actual: number;
  error: number;
  accuracy: number;
  transitDominant?: number; // Index of dominant transit dimension
  natalDominant?: number; // Index of dominant natal dimension
}

export interface CalibrationProfile {
  // Overall prediction bias (positive = predicting too high)
  bias: number;

  // Accuracy metrics
  averageAccuracy: number;
  recentAccuracy: number; // Last 7 days

  // Dimension-specific sensitivities
  // If sensitivity > 1, user feels this dimension more strongly
  // If sensitivity < 1, user feels it less
  dimensionSensitivities: number[];

  // Data quality
  sampleCount: number;
  lastUpdated: string;
}

export interface CalibrationStats {
  totalCheckins: number;
  averageAccuracy: number;
  bestDay: { date: string; accuracy: number } | null;
  trend: 'improving' | 'stable' | 'declining';
  calibrationQuality: 'excellent' | 'good' | 'learning' | 'insufficient';
}

// ============================================
// Core Functions
// ============================================

/**
 * Get feedback history from storage
 */
export function getFeedbackHistory(): PredictionFeedback[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(localStorage.getItem('rop_prediction_feedback') || '[]');
  } catch {
    return [];
  }
}

/**
 * Store enhanced feedback with dimension tracking
 */
export function storeFeedback(
  predicted: number,
  actual: number,
  transit16D?: Vector16D,
  natal16D?: Vector16D
): void {
  if (typeof window === 'undefined') return;

  const today = new Date().toISOString().split('T')[0];
  const error = Math.abs(predicted - actual);
  const accuracy = Math.max(0, 1 - error) * 100;

  const feedback: PredictionFeedback = {
    date: today,
    predicted,
    actual,
    error,
    accuracy,
    transitDominant: transit16D ? getDominant(transit16D.slice(0, 8)).index : undefined,
    natalDominant: natal16D ? getDominant(natal16D.slice(0, 8)).index : undefined,
  };

  const history = getFeedbackHistory();

  // Avoid duplicate entries for the same day
  const existingIndex = history.findIndex((f) => f.date === today);
  if (existingIndex >= 0) {
    history[existingIndex] = feedback;
  } else {
    history.push(feedback);
  }

  // Keep last 90 days for more data
  while (history.length > 90) {
    history.shift();
  }

  localStorage.setItem('rop_prediction_feedback', JSON.stringify(history));

  // Update calibration profile
  updateCalibrationProfile(history);
}

/**
 * Update the calibration profile based on feedback history
 */
function updateCalibrationProfile(history: PredictionFeedback[]): void {
  if (history.length < 3) return; // Need minimum data

  // Calculate overall bias
  const errors = history.map((f) => f.predicted - f.actual);
  const bias = errors.reduce((a, b) => a + b, 0) / errors.length;

  // Calculate accuracies
  const accuracies = history.map((f) => f.accuracy);
  const averageAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  // Recent accuracy (last 7 entries)
  const recent = history.slice(-7);
  const recentAccuracies = recent.map((f) => f.accuracy);
  const recentAccuracy =
    recentAccuracies.length > 0
      ? recentAccuracies.reduce((a, b) => a + b, 0) / recentAccuracies.length
      : averageAccuracy;

  // Calculate dimension-specific sensitivities
  const dimensionSensitivities = calculateDimensionSensitivities(history);

  const profile: CalibrationProfile = {
    bias,
    averageAccuracy,
    recentAccuracy,
    dimensionSensitivities,
    sampleCount: history.length,
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem('rop_calibration_profile', JSON.stringify(profile));
}

/**
 * Calculate how sensitive the user is to each dimension
 */
function calculateDimensionSensitivities(history: PredictionFeedback[]): number[] {
  // Initialize with neutral sensitivities
  const sensitivities = new Array(8).fill(1.0);

  // Group feedback by dominant transit dimension
  const byDimension: Map<number, PredictionFeedback[]> = new Map();

  for (const feedback of history) {
    if (feedback.transitDominant !== undefined) {
      const existing = byDimension.get(feedback.transitDominant) || [];
      existing.push(feedback);
      byDimension.set(feedback.transitDominant, existing);
    }
  }

  // Calculate sensitivity for each dimension
  for (const [dim, feedbacks] of byDimension) {
    if (feedbacks.length >= 2) {
      // Calculate average error ratio for this dimension
      // If actual is consistently higher than predicted, sensitivity > 1
      // If actual is consistently lower than predicted, sensitivity < 1
      const ratios = feedbacks.map((f) => (f.predicted !== 0 ? f.actual / f.predicted : 1));
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

      // Clamp between 0.5 and 1.5 to prevent extreme adjustments
      sensitivities[dim] = Math.max(0.5, Math.min(1.5, avgRatio));
    }
  }

  return sensitivities;
}

/**
 * Get the current calibration profile
 */
export function getCalibrationProfile(): CalibrationProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('rop_calibration_profile');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

/**
 * Apply calibration to a raw prediction
 */
export function calibratePrediction(
  rawPrediction: number,
  transitDominant?: number
): number {
  const profile = getCalibrationProfile();
  if (!profile || profile.sampleCount < 5) {
    return rawPrediction; // Not enough data to calibrate
  }

  let adjusted = rawPrediction;

  // Apply bias correction
  adjusted -= profile.bias * 0.5; // Partial correction to avoid overcorrection

  // Apply dimension-specific sensitivity if available
  if (
    transitDominant !== undefined &&
    profile.dimensionSensitivities[transitDominant]
  ) {
    const sensitivity = profile.dimensionSensitivities[transitDominant];
    // Adjust towards the sensitivity direction
    adjusted = rawPrediction * (1 + (sensitivity - 1) * 0.3);
  }

  // Clamp to valid range
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Get calibration statistics for display
 */
export function getCalibrationStats(): CalibrationStats {
  const history = getFeedbackHistory();

  if (history.length === 0) {
    return {
      totalCheckins: 0,
      averageAccuracy: 0,
      bestDay: null,
      trend: 'stable',
      calibrationQuality: 'insufficient',
    };
  }

  // Calculate average accuracy
  const accuracies = history.map((f) => f.accuracy);
  const averageAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

  // Find best day
  const bestFeedback = history.reduce((best, current) =>
    current.accuracy > best.accuracy ? current : best
  );
  const bestDay = {
    date: bestFeedback.date,
    accuracy: bestFeedback.accuracy,
  };

  // Calculate trend (comparing last 7 to previous 7)
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (history.length >= 14) {
    const recent = history.slice(-7).map((f) => f.accuracy);
    const previous = history.slice(-14, -7).map((f) => f.accuracy);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    if (recentAvg - prevAvg > 5) {
      trend = 'improving';
    } else if (prevAvg - recentAvg > 5) {
      trend = 'declining';
    }
  }

  // Determine calibration quality
  let calibrationQuality: CalibrationStats['calibrationQuality'];
  if (history.length < 7) {
    calibrationQuality = 'insufficient';
  } else if (history.length < 14) {
    calibrationQuality = 'learning';
  } else if (averageAccuracy >= 80) {
    calibrationQuality = 'excellent';
  } else if (averageAccuracy >= 65) {
    calibrationQuality = 'good';
  } else {
    calibrationQuality = 'learning';
  }

  return {
    totalCheckins: history.length,
    averageAccuracy,
    bestDay,
    trend,
    calibrationQuality,
  };
}

/**
 * Get dimension-specific insights for the user
 */
export function getDimensionInsights(): {
  mostSensitive: { index: number; name: string; sensitivity: number } | null;
  leastSensitive: { index: number; name: string; sensitivity: number } | null;
} {
  const profile = getCalibrationProfile();
  if (!profile || profile.sampleCount < 14) {
    return { mostSensitive: null, leastSensitive: null };
  }

  const dimensionNames = [
    'Phase (Moon)',
    'Existence (Sun)',
    'Cognition (Mercury)',
    'Value (Venus)',
    'Expansion (Jupiter)',
    'Action (Mars)',
    'Relation (Saturn)',
    'Field (Outer)',
  ];

  const sensitivities = profile.dimensionSensitivities;

  // Find most and least sensitive
  let maxIdx = 0;
  let minIdx = 0;

  for (let i = 1; i < 8; i++) {
    if (sensitivities[i] > sensitivities[maxIdx]) maxIdx = i;
    if (sensitivities[i] < sensitivities[minIdx]) minIdx = i;
  }

  // Only return if there's meaningful difference
  if (sensitivities[maxIdx] - sensitivities[minIdx] < 0.1) {
    return { mostSensitive: null, leastSensitive: null };
  }

  return {
    mostSensitive: {
      index: maxIdx,
      name: dimensionNames[maxIdx],
      sensitivity: sensitivities[maxIdx],
    },
    leastSensitive: {
      index: minIdx,
      name: dimensionNames[minIdx],
      sensitivity: sensitivities[minIdx],
    },
  };
}

/**
 * Clear all calibration data (for testing or reset)
 */
export function clearCalibration(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rop_prediction_feedback');
  localStorage.removeItem('rop_calibration_profile');
}
