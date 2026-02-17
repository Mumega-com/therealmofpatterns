/**
 * Dashboard Data Utilities
 *
 * Aggregates localStorage state for the Pro dashboard.
 * No API calls — everything is client-side.
 */

import { getCheckinHistory, getAverageKappa, getKappaTrend, type CheckinEntry } from './checkin-storage';
import { getJourneyState, type JourneyState } from './journey-engine';
import { assignArchetype, type ArchetypeResult } from './archetype-engine';
import { getDailyReading, getDailyAction, type DailyReadingTemplate, type DailyAction } from './daily-reading-content';
import { computeFromBirthData } from './16d-engine';
import type { BirthData } from '../types';

export interface DashboardData {
  // User state
  hasBirthData: boolean;
  isPro: boolean;
  birthData: BirthData | null;

  // Natal profile
  natalVector: number[] | null;
  archetype: ArchetypeResult | null;

  // Today's transit (current planetary positions)
  transitVector: number[] | null;

  // Journey
  journey: JourneyState;

  // Check-in stats
  streak: number;
  totalCheckins: number;
  recentScores: { date: string; kappa: number }[];
  averageKappa: number | null;
  trend: 'up' | 'down' | 'stable';

  // Today's content
  todayReading: DailyReadingTemplate | null;
  todayAction: DailyAction | null;
}

/**
 * Aggregate all dashboard data from localStorage.
 */
export function getDashboardData(): DashboardData {
  const journey = getJourneyState();
  const history = getCheckinHistory();
  const avgKappa = getAverageKappa(7);
  const trendSlope = getKappaTrend(7);

  // Determine trend direction
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (trendSlope !== null) {
    if (trendSlope > 0.02) trend = 'up';
    else if (trendSlope < -0.02) trend = 'down';
  }

  // Get birth data
  let birthData: BirthData | null = null;
  let natalVector: number[] | null = null;
  let archetype: ArchetypeResult | null = null;
  let transitVector: number[] | null = null;
  let todayReading: DailyReadingTemplate | null = null;
  let todayAction: DailyAction | null = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('rop_birth_data_full');
      if (stored) {
        birthData = JSON.parse(stored);
        if (birthData) {
          const fullVector = computeFromBirthData(birthData);
          natalVector = Array.from(fullVector).slice(0, 8);
          archetype = assignArchetype(natalVector);

          // Transit: compute for today's date with same location
          const now = new Date();
          const todayBirth: BirthData = {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: now.getHours(),
            minute: now.getMinutes(),
            latitude: birthData.latitude,
            longitude: birthData.longitude,
          };
          const transitFull = computeFromBirthData(todayBirth);
          transitVector = Array.from(transitFull).slice(0, 8);

          // Today's reading based on dominant dimension
          todayReading = getDailyReading(archetype.dominantIndex, now);
          todayAction = getDailyAction(archetype.dominantIndex, now);
        }
      }
    } catch { /* fail silently */ }
  }

  // Check pro status
  let isPro = false;
  if (typeof window !== 'undefined') {
    try {
      const user = localStorage.getItem('rop_user');
      if (user) {
        const parsed = JSON.parse(user);
        isPro = parsed.isPro === true;
      }
    } catch { /* fail silently */ }
  }

  // Recent scores for sparkline (last 30 entries)
  const recentScores = history.entries
    .slice(0, 30)
    .map((entry: CheckinEntry) => ({
      date: entry.timestamp.split('T')[0],
      kappa: entry.kappa,
    }))
    .reverse(); // Oldest first for chart

  return {
    hasBirthData: !!birthData,
    isPro,
    birthData,
    natalVector,
    archetype,
    transitVector,
    journey,
    streak: history.streak,
    totalCheckins: history.entries.length,
    recentScores,
    averageKappa: avgKappa,
    trend,
    todayReading,
    todayAction,
  };
}
