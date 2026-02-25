/**
 * Narrator Context Builder
 *
 * Aggregates user data from localStorage into a structured context
 * for the AI narrator. Sent to /api/narrator as the prompt payload.
 */

import { getCheckinHistory, getRecentCheckins, getAverageKappa, getKappaTrend } from './checkin-storage';
import { getJourneyState } from './journey-engine';
import { assignArchetype } from './archetype-engine';
import { computeFromBirthData } from './16d-engine';
import { getCalibrationProfile, getFeedbackHistory } from './prediction-calibration';
import type { BirthData } from '../types';

export type PersonalizationTier = 'intro' | 'early' | 'pattern' | 'calibrated' | 'deep';

export interface NarratorContext {
  natal: {
    vector: number[];
    archetype: string;
    shadow: string;
    profileShape: string;
    dominantDimension: number;
    weakestDimension: number;
  } | null;
  transit: {
    vector: number[];
    dominantDimension: number;
    alignmentScore: number | null;
  } | null;
  journey: {
    stage: string;
    stageNumber: number;
    progress: number;
    streak: number;
    nextMilestone: string;
  };
  patterns: {
    recentScores: { date: string; kappa: number }[];
    kappaTrend: number | null;
    averageKappa: number | null;
    dimensionSensitivities: number[] | null;
  } | null;
  feedback: {
    accuracy: number;
    bias: number;
    recentAccuracy: number;
    sampleCount: number;
  } | null;
  checkinCount: number;
}

const DIMENSION_NAMES = ['Identity', 'Structure', 'Mind', 'Heart', 'Growth', 'Drive', 'Connection', 'Awareness'];

/**
 * Determine personalization tier from check-in count.
 */
export function getPersonalizationTier(checkinCount: number): PersonalizationTier {
  if (checkinCount === 0) return 'intro';
  if (checkinCount <= 3) return 'early';
  if (checkinCount <= 7) return 'pattern';
  if (checkinCount <= 14) return 'calibrated';
  return 'deep';
}

/**
 * Build the full narrator context from localStorage data.
 */
export function buildNarratorContext(): { context: NarratorContext; tier: PersonalizationTier; userHash: string } {
  const history = getCheckinHistory();
  const checkinCount = history.entries.length;
  const tier = getPersonalizationTier(checkinCount);

  // User hash
  let userHash = '';
  if (typeof window !== 'undefined') {
    userHash = localStorage.getItem('rop_device_hash') || localStorage.getItem('rop_user_hash') || 'anonymous';
  }

  // Natal data
  let natal: NarratorContext['natal'] = null;
  let transitCtx: NarratorContext['transit'] = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('rop_birth_data_full');
      if (stored) {
        const birthData: BirthData = JSON.parse(stored);
        const vector = Array.from(computeFromBirthData(birthData)).slice(0, 8);
        const archResult = assignArchetype(vector);

        natal = {
          vector,
          archetype: archResult.primary.title,
          shadow: archResult.shadow.name,
          profileShape: archResult.profileShape,
          dominantDimension: archResult.dominantIndex,
          weakestDimension: archResult.weakestIndex,
        };

        // Transit: today's planetary positions (correct for local timezone)
        const now = new Date();
        const tzOffsetHours = -now.getTimezoneOffset() / 60;
        const todayBirth: BirthData = {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate(),
          hour: now.getHours(),
          minute: now.getMinutes(),
          latitude: birthData.latitude,
          longitude: birthData.longitude,
          timezone_offset: tzOffsetHours,
        };
        const transitVector = Array.from(computeFromBirthData(todayBirth)).slice(0, 8);
        const dominantTransit = transitVector.indexOf(Math.max(...transitVector));

        transitCtx = {
          vector: transitVector,
          dominantDimension: dominantTransit,
          alignmentScore: getAverageKappa(7),
        };
      }
    } catch { /* fail silently */ }
  }

  // Journey
  const journey = getJourneyState();

  // Patterns (tier >= pattern)
  let patterns: NarratorContext['patterns'] = null;
  if (checkinCount >= 3) {
    const recent = getRecentCheckins(7);
    const calibration = getCalibrationProfile();
    patterns = {
      recentScores: recent.map(e => ({ date: e.timestamp.split('T')[0], kappa: e.kappa })),
      kappaTrend: getKappaTrend(7),
      averageKappa: getAverageKappa(7),
      dimensionSensitivities: calibration?.dimensionSensitivities || null,
    };
  }

  // Feedback (tier >= calibrated)
  let feedback: NarratorContext['feedback'] = null;
  if (checkinCount >= 7) {
    const calibration = getCalibrationProfile();
    if (calibration) {
      feedback = {
        accuracy: calibration.averageAccuracy,
        bias: calibration.bias,
        recentAccuracy: calibration.recentAccuracy,
        sampleCount: calibration.sampleCount,
      };
    }
  }

  return {
    context: { natal, transit: transitCtx, journey: {
      stage: journey.currentStage.name,
      stageNumber: journey.stageNumber,
      progress: journey.progressPercent,
      streak: journey.streakDays,
      nextMilestone: journey.nextMilestone,
    }, patterns, feedback, checkinCount },
    tier,
    userHash,
  };
}

/**
 * Build system prompt for the AI based on tier.
 */
export function buildSystemPrompt(tier: PersonalizationTier): string {
  let prompt = `You are Sol, a warm and wise narrator for The Realm of Patterns.
You speak like a trusted friend who understands cosmic energy deeply.
Never use jargon. Never doom-predict. Always offer something practical.

Write a personalized energy narrative for today (~200-300 words).
Structure:
- Opening: What today's sky means for this person specifically
- Body: Connect their natal pattern to today's transit
- Insight: What they should notice or try today
- Closing: Warm, encouraging send-off

Use second person ("you"). Be specific, not generic. No bullet points or headers — flowing prose only.`;

  if (tier === 'pattern' || tier === 'calibrated' || tier === 'deep') {
    prompt += `\n\nYou have access to their check-in patterns. Reference specific trends you see (e.g., "Your energy tends to peak midweek" or "You've been on an upward trend lately").`;
  }

  if (tier === 'calibrated' || tier === 'deep') {
    prompt += `\n\nYou have their dimension sensitivities. Mention which energies they feel most/least strongly. Be tactful — frame sensitivities as strengths.`;
  }

  if (tier === 'deep') {
    prompt += `\n\nThis person has deep engagement. Reference their shadow work and journey stage. Acknowledge their growth. Connect patterns across time. You may reference their streak and milestone progress.`;
  }

  return prompt;
}

/**
 * Build user prompt from context data.
 */
export function buildUserPrompt(context: NarratorContext): string {
  const parts: string[] = [];

  if (context.natal) {
    const dims = context.natal.vector.map((v, i) => `${DIMENSION_NAMES[i]}: ${(v * 100).toFixed(0)}%`).join(', ');
    parts.push(`NATAL PROFILE: ${context.natal.archetype} (shape: ${context.natal.profileShape})
Dimensions: ${dims}
Strongest: ${DIMENSION_NAMES[context.natal.dominantDimension]}
Shadow: ${context.natal.shadow} (${DIMENSION_NAMES[context.natal.weakestDimension]})`);
  }

  if (context.transit) {
    const dims = context.transit.vector.map((v, i) => `${DIMENSION_NAMES[i]}: ${(v * 100).toFixed(0)}%`).join(', ');
    parts.push(`TODAY'S TRANSIT: Dominant energy: ${DIMENSION_NAMES[context.transit.dominantDimension]}
Dimensions: ${dims}
${context.transit.alignmentScore !== null ? `Alignment: ${Math.round(context.transit.alignmentScore * 100)}%` : ''}`);
  }

  parts.push(`JOURNEY: Stage ${context.journey.stageNumber} — ${context.journey.stage}
Progress: ${context.journey.progress}%, Streak: ${context.journey.streak} days
Next milestone: ${context.journey.nextMilestone}`);

  if (context.patterns) {
    const scores = context.patterns.recentScores.map(s => `${s.date}: ${Math.round(s.kappa * 100)}%`).join(', ');
    const trendDir = context.patterns.kappaTrend !== null
      ? (context.patterns.kappaTrend > 0.02 ? 'improving' : context.patterns.kappaTrend < -0.02 ? 'declining' : 'stable')
      : 'unknown';
    parts.push(`PATTERNS (last 7 check-ins): ${scores}
Trend: ${trendDir}, Average alignment: ${context.patterns.averageKappa !== null ? Math.round(context.patterns.averageKappa * 100) + '%' : 'N/A'}`);

    if (context.patterns.dimensionSensitivities) {
      const sens = context.patterns.dimensionSensitivities
        .map((s, i) => ({ name: DIMENSION_NAMES[i], sensitivity: s }))
        .sort((a, b) => b.sensitivity - a.sensitivity);
      parts.push(`SENSITIVITIES: Most felt: ${sens[0].name} (${sens[0].sensitivity.toFixed(2)}x), Least felt: ${sens[7].name} (${sens[7].sensitivity.toFixed(2)}x)`);
    }
  }

  if (context.feedback) {
    parts.push(`CALIBRATION: Accuracy: ${context.feedback.accuracy.toFixed(0)}%, Bias: ${context.feedback.bias > 0 ? '+' : ''}${context.feedback.bias.toFixed(2)}, Samples: ${context.feedback.sampleCount}`);
  }

  parts.push(`Check-ins completed: ${context.checkinCount}
Today's date: ${new Date().toISOString().split('T')[0]}`);

  return parts.join('\n\n');
}
