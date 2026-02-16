/**
 * Journey Engine
 *
 * State machine that tracks where a user is on their Hero's Journey.
 * Each stage has concrete triggers based on user actions stored in localStorage.
 * The journey reveals itself progressively — users only see what they've earned.
 */

import { assignArchetype, getJourneyContent, type ArchetypeResult, type JourneyStageContent } from './archetype-engine';
import { computeFromBirthData } from './16d-engine';
import type { BirthData } from '../types';

// ============================================
// Types
// ============================================

export type JourneyStageId =
  | 'ordinary-world'
  | 'call-to-adventure'
  | 'meeting-mentor'
  | 'crossing-threshold'
  | 'tests-allies'
  | 'the-ordeal'
  | 'the-reward'
  | 'resurrection';

export interface JourneyStage {
  id: JourneyStageId;
  number: number;          // 1-8
  name: string;
  subtitle: string;
  description: string;
  icon: string;
}

export interface JourneyState {
  currentStage: JourneyStage;
  stageNumber: number;       // 1-8
  archetype: ArchetypeResult | null;
  content: JourneyStageContent | null;

  // Progress data
  hasBirthData: boolean;
  hasViewedForecast: boolean;
  hasMentor: boolean;        // Mode is set (Sol default)
  firstCheckinDone: boolean;
  checkinCount: number;
  streakDays: number;
  shadowRevealed: boolean;
  shadowMastered: boolean;

  // Unlock state
  unlockedStages: number[];  // Which stages are visible
  nextMilestone: string;     // Human-readable next goal
  progressPercent: number;   // 0-100 within current stage

  // Timestamps
  journeyStartedAt: string | null;
  lastCheckinAt: string | null;
}

// ============================================
// The Eight Stages
// ============================================

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'ordinary-world',
    number: 1,
    name: 'The Ordinary World',
    subtitle: 'Discovering who you are',
    description: 'You entered your birth data and saw your energy profile for the first time. This is your starting point — the shape the cosmos gave you.',
    icon: '⊙',
  },
  {
    id: 'call-to-adventure',
    number: 2,
    name: 'The Call to Adventure',
    subtitle: 'The app sees something',
    description: 'You received your first forecast — a glimpse of what the cosmic field holds for you today. Something resonated. This isn\'t random.',
    icon: '✧',
  },
  {
    id: 'meeting-mentor',
    number: 3,
    name: 'Meeting the Mentor',
    subtitle: 'Your guide appears',
    description: 'Sol is walking with you — a warm, honest friend who sees your pattern and speaks plainly about what it means.',
    icon: '☀',
  },
  {
    id: 'crossing-threshold',
    number: 4,
    name: 'Crossing the Threshold',
    subtitle: 'Your first check-in',
    description: 'You showed up. That first check-in was a commitment — you\'re no longer just observing, you\'re participating in your own transformation.',
    icon: '◈',
  },
  {
    id: 'tests-allies',
    number: 5,
    name: 'Tests, Allies & Enemies',
    subtitle: 'Building the practice',
    description: 'The daily rhythm is forming. Some days align, some challenge. Each check-in teaches the system — and you — something new.',
    icon: '⚔',
  },
  {
    id: 'the-ordeal',
    number: 6,
    name: 'The Ordeal',
    subtitle: 'Meeting your shadow',
    description: 'Enough data. Enough patterns. Now it\'s time to face what you\'ve been avoiding — the dimension where your shadow lives.',
    icon: '☽',
  },
  {
    id: 'the-reward',
    number: 7,
    name: 'The Reward',
    subtitle: 'Seeing clearly',
    description: 'You recognized the pattern before it took you. That moment of awareness — that\'s the sword. Not wellness. Consciousness.',
    icon: '⚜',
  },
  {
    id: 'resurrection',
    number: 8,
    name: 'The Return',
    subtitle: 'Integration and a new beginning',
    description: 'Your baseline has shifted. The shadow isn\'t gone — but it\'s no longer running the show. A deeper layer awaits.',
    icon: '◆',
  },
];

// ============================================
// Stage Determination Logic
// ============================================

const STORAGE_KEYS = {
  birthData: 'rop_birth_data_full',
  checkinHistory: 'rop_checkin_history',
  checkCount: 'rop_check_count',
  streakDays: 'rop_streak_days',
  predictionFeedback: 'rop_prediction_feedback',
  journeyState: 'rop_journey_state',
  natal16D: 'rop_natal_16d',
} as const;

interface StoredJourneyState {
  journeyStartedAt: string;
  hasViewedForecast: boolean;
  shadowRevealed: boolean;
  shadowMastered: boolean;
  currentCycle: number; // Which shadow cycle (0 = first)
}

function getStoredJourney(): StoredJourneyState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.journeyState);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveJourneyState(state: Partial<StoredJourneyState>) {
  if (typeof window === 'undefined') return;
  const current = getStoredJourney() || {
    journeyStartedAt: new Date().toISOString(),
    hasViewedForecast: false,
    shadowRevealed: false,
    shadowMastered: false,
    currentCycle: 0,
  };
  localStorage.setItem(STORAGE_KEYS.journeyState, JSON.stringify({ ...current, ...state }));
}

/**
 * Compute the full journey state from localStorage.
 * This is the main entry point — call it on any page to know where the user is.
 */
export function getJourneyState(): JourneyState {
  if (typeof window === 'undefined') {
    return getDefaultState();
  }

  const stored = getStoredJourney();
  const birthDataStr = localStorage.getItem(STORAGE_KEYS.birthData);
  const checkCount = parseInt(localStorage.getItem(STORAGE_KEYS.checkCount) || '0', 10);
  const streakDays = parseInt(localStorage.getItem(STORAGE_KEYS.streakDays) || '0', 10);

  let checkinHistory: unknown[] = [];
  try {
    checkinHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.checkinHistory) || '[]');
  } catch { /* empty */ }

  let feedbackHistory: unknown[] = [];
  try {
    feedbackHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.predictionFeedback) || '[]');
  } catch { /* empty */ }

  // Flags
  const hasBirthData = !!birthDataStr;
  const hasViewedForecast = stored?.hasViewedForecast || false;
  const hasMentor = true; // Sol is always the mentor for MVP
  const firstCheckinDone = checkCount > 0 || checkinHistory.length > 0;
  const shadowRevealed = stored?.shadowRevealed || false;
  const shadowMastered = stored?.shadowMastered || false;
  const actualCheckCount = Math.max(checkCount, checkinHistory.length);
  const hasSufficientData = actualCheckCount >= 14 && feedbackHistory.length >= 5;

  // Determine stage
  let stageNumber: number;

  if (!hasBirthData) {
    stageNumber = 0; // Not even started
  } else if (!firstCheckinDone) {
    // Has birth data but no check-in yet
    stageNumber = hasViewedForecast ? 3 : 1;
  } else if (actualCheckCount < 3) {
    stageNumber = 4; // Just crossed the threshold
  } else if (!hasSufficientData) {
    stageNumber = 5; // In the tests & allies phase
  } else if (!shadowRevealed) {
    stageNumber = 6; // Ready for the ordeal
  } else if (!shadowMastered) {
    stageNumber = 7; // Working with the shadow
  } else {
    stageNumber = 8; // Resurrection
  }

  // Clamp to valid range
  stageNumber = Math.max(1, Math.min(8, stageNumber));
  if (!hasBirthData) stageNumber = 1;

  const currentStage = JOURNEY_STAGES[stageNumber - 1];

  // Compute archetype if we have birth data
  let archetype: ArchetypeResult | null = null;
  let content: JourneyStageContent | null = null;

  if (hasBirthData && birthDataStr) {
    try {
      const birthData: BirthData = JSON.parse(birthDataStr);
      const vector = computeFromBirthData(birthData);
      archetype = assignArchetype(Array.from(vector));
      content = getJourneyContent(archetype);
    } catch { /* fail silently */ }
  }

  // Determine unlocked stages
  const unlockedStages: number[] = [];
  for (let i = 1; i <= stageNumber; i++) {
    unlockedStages.push(i);
  }

  // Next milestone
  const nextMilestone = getNextMilestone(stageNumber, actualCheckCount, hasBirthData, shadowRevealed);

  // Progress within current stage
  const progressPercent = getStageProgress(stageNumber, actualCheckCount, feedbackHistory.length, shadowRevealed);

  // Get last check-in timestamp
  let lastCheckinAt: string | null = null;
  if (checkinHistory.length > 0) {
    const last = checkinHistory[checkinHistory.length - 1] as Record<string, unknown>;
    lastCheckinAt = (last?.date as string) || (last?.timestamp as string) || null;
  }

  return {
    currentStage,
    stageNumber,
    archetype,
    content,
    hasBirthData,
    hasViewedForecast,
    hasMentor,
    firstCheckinDone,
    checkinCount: actualCheckCount,
    streakDays,
    shadowRevealed,
    shadowMastered,
    unlockedStages,
    nextMilestone,
    progressPercent,
    journeyStartedAt: stored?.journeyStartedAt || null,
    lastCheckinAt,
  };
}

// ============================================
// Milestone & Progress Helpers
// ============================================

function getNextMilestone(stage: number, checkins: number, hasBirth: boolean, shadowRevealed: boolean): string {
  if (!hasBirth) return 'Enter your birthday to begin your journey';
  if (stage <= 1) return 'View your first forecast to hear the call';
  if (stage <= 3) return 'Complete your first check-in to cross the threshold';
  if (stage === 4) return `${3 - checkins} more check-in${3 - checkins === 1 ? '' : 's'} to build your practice`;
  if (stage === 5) {
    const remaining = Math.max(0, 14 - checkins);
    return remaining > 0
      ? `${remaining} more check-in${remaining === 1 ? '' : 's'} until the system knows your shadow`
      : 'Your shadow is ready to be revealed';
  }
  if (stage === 6 && !shadowRevealed) return 'Your shadow awaits — explore it when you\'re ready';
  if (stage === 7) return 'Notice your shadow pattern in daily life. Recognition is the reward';
  return 'A new cycle begins. Deeper shadows await';
}

function getStageProgress(stage: number, checkins: number, feedbackCount: number, shadowRevealed: boolean): number {
  switch (stage) {
    case 1: return 0;
    case 2: return 25;
    case 3: return 50;
    case 4: return Math.min(100, Math.round((checkins / 3) * 100));
    case 5: return Math.min(100, Math.round((checkins / 14) * 100));
    case 6: return shadowRevealed ? 100 : Math.min(80, Math.round((feedbackCount / 5) * 80));
    case 7: return 50; // Binary — either in it or past it
    case 8: return 100;
    default: return 0;
  }
}

function getDefaultState(): JourneyState {
  return {
    currentStage: JOURNEY_STAGES[0],
    stageNumber: 1,
    archetype: null,
    content: null,
    hasBirthData: false,
    hasViewedForecast: false,
    hasMentor: true,
    firstCheckinDone: false,
    checkinCount: 0,
    streakDays: 0,
    shadowRevealed: false,
    shadowMastered: false,
    unlockedStages: [1],
    nextMilestone: 'Enter your birthday to begin your journey',
    progressPercent: 0,
    journeyStartedAt: null,
    lastCheckinAt: null,
  };
}

// ============================================
// Actions
// ============================================

/**
 * Call when user views a forecast for the first time.
 */
export function markForecastViewed() {
  saveJourneyState({ hasViewedForecast: true });
}

/**
 * Call when the shadow is revealed to the user (they've seen The Ordeal content).
 */
export function markShadowRevealed() {
  saveJourneyState({ shadowRevealed: true });
}

/**
 * Call when the user has demonstrated pattern recognition (The Reward).
 */
export function markShadowMastered() {
  saveJourneyState({ shadowMastered: true });
}

/**
 * Start the journey (called on first birth data entry).
 */
export function startJourney() {
  saveJourneyState({ journeyStartedAt: new Date().toISOString() });
}

/**
 * Check if a specific content piece should be visible.
 */
export function isUnlocked(requiredStage: number): boolean {
  const state = getJourneyState();
  return state.stageNumber >= requiredStage;
}
