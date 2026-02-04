/**
 * Check-in Persistence Layer
 * Stores check-in history in localStorage, with D1 sync via privacy storage
 */

import { addCheckin as addPrivacyCheckin } from './privacy';

export interface CheckinEntry {
  id: string;
  timestamp: string;
  scores: Record<string, number>;
  kappa: number;
  mode: 'kasra' | 'river' | 'sol';
}

export interface CheckinHistory {
  entries: CheckinEntry[];
  lastCheckin: string | null;
  streak: number;
}

const STORAGE_KEY = 'rop_checkin_history';
const MAX_ENTRIES = 100; // Keep last 100 check-ins

/**
 * Get check-in history from localStorage
 */
export function getCheckinHistory(): CheckinHistory {
  if (typeof window === 'undefined') {
    return { entries: [], lastCheckin: null, streak: 0 };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to read check-in history:', e);
  }

  return { entries: [], lastCheckin: null, streak: 0 };
}

/**
 * Save a new check-in entry
 */
export function saveCheckin(
  scores: Record<string, number>,
  kappa: number,
  mode: 'kasra' | 'river' | 'sol' = 'sol'
): CheckinEntry {
  const entry: CheckinEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    scores,
    kappa,
    mode,
  };

  const history = getCheckinHistory();

  // Calculate streak
  const streak = calculateStreak(history.lastCheckin);

  // Add new entry at the beginning
  history.entries.unshift(entry);

  // Trim to max entries
  if (history.entries.length > MAX_ENTRIES) {
    history.entries = history.entries.slice(0, MAX_ENTRIES);
  }

  // Update metadata
  history.lastCheckin = entry.timestamp;
  history.streak = streak;

  // Save to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save check-in:', e);
  }

  // Also save to privacy storage for server sync
  try {
    const vector = scoresToVector(scores);
    const stage = determineStage(kappa);
    addPrivacyCheckin({
      date: entry.timestamp.split('T')[0],
      vector,
      stage,
      kappa,
      moodScore: Math.round(kappa * 10), // Convert kappa to 1-10 mood score
    });
  } catch (e) {
    console.warn('Failed to save to privacy storage:', e);
  }

  // Dispatch event for listeners
  window.dispatchEvent(new CustomEvent('checkin-saved', { detail: entry }));

  return entry;
}

/**
 * Get recent check-ins
 */
export function getRecentCheckins(limit: number = 7): CheckinEntry[] {
  const history = getCheckinHistory();
  return history.entries.slice(0, limit);
}

/**
 * Get today's check-in if exists
 */
export function getTodaysCheckin(): CheckinEntry | null {
  const history = getCheckinHistory();
  const today = new Date().toDateString();

  return history.entries.find(entry =>
    new Date(entry.timestamp).toDateString() === today
  ) || null;
}

/**
 * Get check-ins for a specific date range
 */
export function getCheckinsInRange(startDate: Date, endDate: Date): CheckinEntry[] {
  const history = getCheckinHistory();
  return history.entries.filter(entry => {
    const date = new Date(entry.timestamp);
    return date >= startDate && date <= endDate;
  });
}

/**
 * Calculate average kappa over time
 */
export function getAverageKappa(days: number = 7): number | null {
  const history = getCheckinHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentEntries = history.entries.filter(entry =>
    new Date(entry.timestamp) >= cutoff
  );

  if (recentEntries.length === 0) return null;

  const sum = recentEntries.reduce((acc, entry) => acc + entry.kappa, 0);
  return sum / recentEntries.length;
}

/**
 * Get kappa trend (positive = improving, negative = declining)
 */
export function getKappaTrend(days: number = 7): number | null {
  const history = getCheckinHistory();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentEntries = history.entries
    .filter(entry => new Date(entry.timestamp) >= cutoff)
    .reverse(); // Oldest first

  if (recentEntries.length < 2) return null;

  // Simple linear regression slope
  const n = recentEntries.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  recentEntries.forEach((entry, i) => {
    sumX += i;
    sumY += entry.kappa;
    sumXY += i * entry.kappa;
    sumX2 += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}

/**
 * Clear all check-in history (for debugging/testing)
 */
export function clearCheckinHistory(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('checkin-cleared'));
  }
}

// Helper functions

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateStreak(lastCheckin: string | null): number {
  if (!lastCheckin) return 1;

  const last = new Date(lastCheckin);
  const today = new Date();

  // Reset time components for date comparison
  last.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Same day - maintain streak
    return getCheckinHistory().streak;
  } else if (daysDiff === 1) {
    // Consecutive day - increment streak
    return getCheckinHistory().streak + 1;
  } else {
    // Streak broken - restart at 1
    return 1;
  }
}

/**
 * Convert check-in scores to 8D vector format
 * Maps: clarity->P, energy->Δ, focus->μ, embodiment->R, direction->N, alignment->E
 */
function scoresToVector(scores: Record<string, number>): number[] {
  // Normalize scores to 0-1 range
  const normalize = (v: number) => (v || 3) / 5;

  // Map check-in dimensions to 8D vector indices
  // [P=Phase, E=Existence, μ=Cognition, V=Value, N=Expansion, Δ=Action, R=Relation, Φ=Field]
  return [
    normalize(scores.clarity),     // P - Phase/Identity from clarity
    normalize(scores.alignment),   // E - Existence/Structure from alignment
    normalize(scores.focus),       // μ - Cognition/Mind from focus
    normalize(scores.direction),   // V - Value/Harmony from direction
    normalize(scores.direction),   // N - Expansion/Growth from direction
    normalize(scores.energy),      // Δ - Action/Force from energy
    normalize(scores.embodiment),  // R - Relation/Connection from embodiment
    (normalize(scores.clarity) + normalize(scores.alignment)) / 2, // Φ - Field/Witness (composite)
  ];
}

/**
 * Determine alchemical stage from kappa score
 */
function determineStage(kappa: number): string {
  if (kappa < 0.25) return 'nigredo';      // Blackening - dissolution
  if (kappa < 0.50) return 'albedo';       // Whitening - purification
  if (kappa < 0.75) return 'citrinitas';   // Yellowing - awakening
  return 'rubedo';                          // Reddening - integration
}
