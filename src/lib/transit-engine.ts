/**
 * Transit Engine - Outer Octave & Coupling Dynamics
 *
 * Computes:
 * - κ (kappa): Coupling between inner (natal) and outer (transit) octaves
 * - RU: Resonance Units (integrated energy)
 * - Daily/weekly forecasts
 * - Optimal timing windows
 *
 * @module transit-engine
 */

import { DiamondState, DIMENSION_SYMBOLS, createState } from './diamond-engine';

// =============================================================================
// Types
// =============================================================================

export interface TransitData {
  /** Outer octave 8D vector from current transits */
  outerOctave: [number, number, number, number, number, number, number, number];
  /** κ coupling: cosine similarity [-1, 1] */
  kappa: number;
  /** Resonance Units: integrated energy metric */
  RU: number;
  /** Witness dimension value */
  W: number;
  /** Timestamp */
  date: Date;
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

/** Planet-to-dimension mapping (simplified astronomical model) */
const PLANET_DIMENSION_MAP = {
  sun: 0,      // P - Potential
  moon: 1,     // F - Form
  mercury: 2,  // A - Awareness
  venus: 3,    // M - Meaning
  mars: 4,     // T - Telos
  jupiter: 5,  // R - Response
  saturn: 6,   // C - Connection
  uranus: 7,   // W - Witness
} as const;

/** Dimension influences for activities */
const DIMENSION_ACTIVITIES: Record<number, { good: string[]; avoid: string[] }> = {
  0: { good: ['starting projects', 'creative work'], avoid: ['endings', 'conclusions'] },
  1: { good: ['organizing', 'structuring'], avoid: ['radical changes'] },
  2: { good: ['learning', 'communication'], avoid: ['major decisions'] },
  3: { good: ['relationships', 'aesthetics'], avoid: ['conflict'] },
  4: { good: ['action', 'competition'], avoid: ['rest', 'reflection'] },
  5: { good: ['expansion', 'growth'], avoid: ['contraction'] },
  6: { good: ['discipline', 'long-term planning'], avoid: ['spontaneity'] },
  7: { good: ['insight', 'meditation'], avoid: ['mundane tasks'] },
};

// =============================================================================
// Core Computations
// =============================================================================

/**
 * Compute planetary positions for a given date
 * Uses simplified astronomical model (harmonic approximation)
 */
export function computeCurrentTransits(date: Date): Record<string, number> {
  const dayOfYear = getDayOfYear(date);
  const year = date.getFullYear();
  const baseOffset = (year - 2000) * 365.25 + dayOfYear;

  // Orbital periods in days (simplified)
  const periods = {
    sun: 365.25,
    moon: 29.53,
    mercury: 87.97,
    venus: 224.7,
    mars: 687,
    jupiter: 4332,
    saturn: 10759,
    uranus: 30687,
  };

  const transits: Record<string, number> = {};

  for (const [planet, period] of Object.entries(periods)) {
    // Position as phase [0, 1]
    const phase = ((baseOffset % period) / period + 1) % 1;
    // Convert to intensity [-1, 1] using sine wave
    transits[planet] = Math.sin(phase * 2 * Math.PI);
  }

  return transits;
}

/**
 * Convert transit data to 8D outer octave vector
 */
export function computeOuterOctave(
  transits: Record<string, number>
): [number, number, number, number, number, number, number, number] {
  const octave: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0];

  for (const [planet, value] of Object.entries(transits)) {
    const dimIdx = PLANET_DIMENSION_MAP[planet as keyof typeof PLANET_DIMENSION_MAP];
    if (dimIdx !== undefined) {
      // Normalize to [0, 1]
      octave[dimIdx] = (value + 1) / 2;
    }
  }

  // Normalize so sum = 1
  const total = octave.reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (let i = 0; i < 8; i++) {
      octave[i] = octave[i] / total;
    }
  } else {
    // Fallback to uniform
    for (let i = 0; i < 8; i++) {
      octave[i] = 0.125;
    }
  }

  return octave;
}

/**
 * Compute κ (kappa) coupling via cosine similarity
 * κ = dot(inner, outer) / (||inner|| × ||outer||)
 * Range: [-1, 1]
 */
export function computeKappa(
  inner: DiamondState['dimensions'],
  outer: DiamondState['dimensions']
): number {
  // Dot product
  let dot = 0;
  let normInner = 0;
  let normOuter = 0;

  for (let i = 0; i < 8; i++) {
    dot += inner[i] * outer[i];
    normInner += inner[i] * inner[i];
    normOuter += outer[i] * outer[i];
  }

  const denom = Math.sqrt(normInner) * Math.sqrt(normOuter);
  if (denom === 0) return 0;

  return dot / denom;
}

/**
 * Compute RU (Resonance Units) - integrated energy metric
 * RU = Σ(inner × outer × weight) × 100
 */
export function computeRU(
  inner: DiamondState['dimensions'],
  outer: DiamondState['dimensions'],
  kappa: number
): number {
  // Weighted sum of aligned energies
  let energy = 0;
  for (let i = 0; i < 8; i++) {
    energy += inner[i] * outer[i];
  }

  // Scale by coupling and convert to RU (0-100 typical range)
  const ru = energy * (1 + kappa) * 50;
  return Math.max(0, Math.min(100, ru));
}

/**
 * Get full transit data for a date
 */
export function getTransitData(inner: DiamondState, date: Date = new Date()): TransitData {
  const transits = computeCurrentTransits(date);
  const outerOctave = computeOuterOctave(transits);
  const kappa = computeKappa(inner.dimensions, outerOctave);
  const RU = computeRU(inner.dimensions, outerOctave, kappa);

  return {
    outerOctave,
    kappa,
    RU,
    W: outerOctave[7], // Witness dimension
    date,
  };
}

// =============================================================================
// Forecasting
// =============================================================================

/**
 * Get daily forecast
 */
export function getDailyForecast(inner: DiamondState, date: Date = new Date()): DailyForecast {
  const transit = getTransitData(inner, date);
  const { kappa, RU, outerOctave } = transit;

  // Find dominant dimension
  let maxIdx = 0;
  let maxVal = outerOctave[0];
  for (let i = 1; i < 8; i++) {
    if (outerOctave[i] > maxVal) {
      maxVal = outerOctave[i];
      maxIdx = i;
    }
  }

  const primaryInfluence = DIMENSION_SYMBOLS[maxIdx];
  const activities = DIMENSION_ACTIVITIES[maxIdx];

  // Determine risk level
  let riskLevel: DailyForecast['riskLevel'];
  if (kappa < -0.3) riskLevel = 'critical';
  else if (kappa < 0.2 || RU < 15) riskLevel = 'high';
  else if (kappa < 0.5 || RU < 30) riskLevel = 'moderate';
  else riskLevel = 'low';

  // Generate advice
  let advice: string;
  if (kappa > 0.7) {
    advice = 'High alignment today. Trust your instincts and take action on important matters.';
  } else if (kappa > 0.4) {
    advice = 'Good flow available. Focus on activities that match your natural strengths.';
  } else if (kappa > 0) {
    advice = 'Mixed energies. Be selective about where you invest your attention.';
  } else if (kappa > -0.3) {
    advice = 'Inner-outer tension present. Avoid major decisions; focus on maintenance.';
  } else {
    advice = 'Strong resistance pattern active. Prioritize self-care and avoid confrontation.';
  }

  return {
    date,
    kappa,
    RU,
    riskLevel,
    primaryInfluence,
    advice,
    optimalFor: activities.good,
    avoidFor: activities.avoid,
  };
}

/**
 * Get weekly forecast (7 days)
 */
export function getWeeklyForecast(inner: DiamondState, startDate: Date = new Date()): WeeklyForecast {
  const days: DailyForecast[] = [];
  let peakKappa = -Infinity;
  let lowKappa = Infinity;
  let peakDay = startDate;
  let lowDay = startDate;

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const forecast = getDailyForecast(inner, date);
    days.push(forecast);

    if (forecast.kappa > peakKappa) {
      peakKappa = forecast.kappa;
      peakDay = date;
    }
    if (forecast.kappa < lowKappa) {
      lowKappa = forecast.kappa;
      lowDay = date;
    }
  }

  // Determine trend
  const firstHalf = days.slice(0, 3).reduce((s, d) => s + d.kappa, 0) / 3;
  const secondHalf = days.slice(4, 7).reduce((s, d) => s + d.kappa, 0) / 3;
  const variance = days.reduce((v, d) => v + Math.pow(d.kappa - (firstHalf + secondHalf) / 2, 2), 0) / 7;

  let trend: WeeklyForecast['trend'];
  if (variance > 0.1) trend = 'volatile';
  else if (secondHalf - firstHalf > 0.15) trend = 'ascending';
  else if (firstHalf - secondHalf > 0.15) trend = 'descending';
  else trend = 'stable';

  // Generate summary
  const avgKappa = days.reduce((s, d) => s + d.kappa, 0) / 7;
  let summary: string;
  if (avgKappa > 0.5) {
    summary = 'Strong week ahead. Multiple high-alignment windows available for important work.';
  } else if (avgKappa > 0.2) {
    summary = 'Balanced week. Choose your moments carefully and don\'t overextend.';
  } else {
    summary = 'Challenging week. Focus on foundations and avoid major initiatives.';
  }

  return { days, trend, peakDay, lowDay, summary };
}

/**
 * Find optimal windows in a date range
 */
export function findOptimalWindows(
  inner: DiamondState,
  days: number = 30,
  startDate: Date = new Date()
): OptimalWindow[] {
  const windows: OptimalWindow[] = [];
  let inWindow = false;
  let windowStart: Date | null = null;
  let windowKappaSum = 0;
  let windowRUSum = 0;
  let windowDays = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const transit = getTransitData(inner, date);
    const isGood = transit.kappa > 0.5 && transit.RU > 30;

    if (isGood && !inWindow) {
      // Start new window
      inWindow = true;
      windowStart = date;
      windowKappaSum = transit.kappa;
      windowRUSum = transit.RU;
      windowDays = 1;
    } else if (isGood && inWindow) {
      // Continue window
      windowKappaSum += transit.kappa;
      windowRUSum += transit.RU;
      windowDays++;
    } else if (!isGood && inWindow && windowStart) {
      // End window
      const avgKappa = windowKappaSum / windowDays;
      const avgRU = windowRUSum / windowDays;

      let quality: OptimalWindow['quality'];
      if (avgKappa > 0.7 && avgRU > 45) quality = 'excellent';
      else if (avgKappa > 0.6 || avgRU > 40) quality = 'good';
      else quality = 'fair';

      // Determine best activities based on dominant dimension during window
      const transit = getTransitData(inner, windowStart);
      let maxIdx = 0;
      for (let j = 1; j < 8; j++) {
        if (transit.outerOctave[j] > transit.outerOctave[maxIdx]) maxIdx = j;
      }

      windows.push({
        start: windowStart,
        end: date,
        kappa: avgKappa,
        RU: avgRU,
        quality,
        bestFor: DIMENSION_ACTIVITIES[maxIdx].good,
      });

      inWindow = false;
      windowStart = null;
    }
  }

  // Close any open window
  if (inWindow && windowStart) {
    const avgKappa = windowKappaSum / windowDays;
    const avgRU = windowRUSum / windowDays;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days - 1);

    let quality: OptimalWindow['quality'];
    if (avgKappa > 0.7 && avgRU > 45) quality = 'excellent';
    else if (avgKappa > 0.6 || avgRU > 40) quality = 'good';
    else quality = 'fair';

    const transit = getTransitData(inner, windowStart);
    let maxIdx = 0;
    for (let j = 1; j < 8; j++) {
      if (transit.outerOctave[j] > transit.outerOctave[maxIdx]) maxIdx = j;
    }

    windows.push({
      start: windowStart,
      end: endDate,
      kappa: avgKappa,
      RU: avgRU,
      quality,
      bestFor: DIMENSION_ACTIVITIES[maxIdx].good,
    });
  }

  return windows.sort((a, b) => b.kappa - a.kappa);
}

// =============================================================================
// Utilities
// =============================================================================

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  computeCurrentTransits,
  computeOuterOctave,
  computeKappa,
  computeRU,
  getTransitData,
  getDailyForecast,
  getWeeklyForecast,
  findOptimalWindows,
};
