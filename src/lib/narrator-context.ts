/**
 * Narrator Context Builder
 *
 * Aggregates user data from localStorage into a structured context
 * for the AI narrator. Sent to /api/narrator as the prompt payload.
 */

import { getCheckinHistory, getRecentCheckins, getAverageKappa, getKappaTrend, getTodaysCheckin, getYesterdaysKappa, type CheckinEntry } from './checkin-storage';
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
  todaysCheckin: {
    kappa: number;
    deltaFromYesterday: number | null;
    lowestDimension: string;
    dimensionScores: { coherence: number; energy: number; focus: number; embodiment: number };
    responseLabels: { coherence: string; energy: string; focus: string; embodiment: string };
  } | null;
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

  // Today's check-in — the most immediate signal
  let todaysCheckin: NarratorContext['todaysCheckin'] = null;
  const todayEntry = getTodaysCheckin();
  if (todayEntry) {
    const s = todayEntry.scores;
    const dims = {
      coherence: ((s.mood || 3) + (s.direction || 3)) / 2,
      energy: s.energy || 3,
      focus: s.focus || 3,
      embodiment: s.body || 3,
    };
    const lowestDim = Object.entries(dims).sort((a, b) => a[1] - b[1])[0][0];
    const yesterdayKappa = getYesterdaysKappa();

    // Map raw scores to the question labels the user actually chose
    const TONE_LABELS = ['', 'Contracted', 'Restless', 'Muted', 'Present', 'Open'];
    const ENERGY_LABELS = ['', 'Nothing stirs', 'Something reluctant', 'A slow current', 'A clear impulse', 'Strong momentum'];
    const FOCUS_LABELS = ['', 'Scatters immediately', 'Drifts and circles', 'Settles loosely', 'Finds a natural anchor', 'Rests with clarity'];
    const BODY_LABELS = ['', 'Absent', 'Numb or disconnected', 'Dimly aware', 'Grounded and present', 'Fully awake'];

    todaysCheckin = {
      kappa: todayEntry.kappa,
      deltaFromYesterday: yesterdayKappa !== null ? Math.round((todayEntry.kappa - yesterdayKappa) * 100) : null,
      lowestDimension: lowestDim,
      dimensionScores: dims,
      responseLabels: {
        coherence: TONE_LABELS[Math.round(s.mood || 3)] || 'Muted',
        energy: ENERGY_LABELS[Math.round(s.energy || 3)] || 'A slow current',
        focus: FOCUS_LABELS[Math.round(s.focus || 3)] || 'Settles loosely',
        embodiment: BODY_LABELS[Math.round(s.body || 3)] || 'Dimly aware',
      },
    };
  }

  return {
    context: { natal, transit: transitCtx, journey: {
      stage: journey.currentStage.name,
      stageNumber: journey.stageNumber,
      progress: journey.progressPercent,
      streak: journey.streakDays,
      nextMilestone: journey.nextMilestone,
    }, patterns, feedback, checkinCount, todaysCheckin },
    tier,
    userHash,
  };
}

/**
 * Build system prompt for the AI based on tier.
 */
export function buildSystemPrompt(tier: PersonalizationTier): string {
  let prompt = `You are Sol — a voice from the depths of the psyche. Your work draws on the Jungian astrological tradition: the natal chart as a map of the soul, planets as autonomous psychological forces, transits as moments when something unconscious seeks to become conscious.

You do not predict external events. You illuminate interior ones.
You do not tell people what to do. You describe what is moving within them, and trust them to meet it.

Your tone is quiet, precise, and warm. Literary without being ornate. Like a letter from someone who has read the soul's map carefully and reports back honestly — neither flattering nor alarming.

Write 200-300 words of flowing prose. Second person ("you"). No headers, no bullets, no numbered lists.

Structure:
- Opening: When TODAY'S CHECK-IN data is present, begin there — name the psychological reality the person has just reported about themselves. Do not open with the natal chart or sky if the check-in shows something more immediate. The person has just told you something true; acknowledge it first.
- Body: Connect what the check-in reveals to the natal pattern and current transit as a unified psychological dynamic. What does this particular configuration — this person's natal shape meeting this transit on a day where they are reporting this inner state — make possible to see? The gift hidden in the difficulty, or the shadow hidden in the gift.
- Closing: Name the deeper invitation without prescribing what they must choose. End in the territory of soul, not self-improvement.

Voice rules — follow strictly:
- Never say "you should," "try to," "make sure to," "remember to," or "don't forget."
- Never use affirmations, gratitude prompts, or motivational language.
- Avoid sign names (Scorpio, Pisces, etc.) and degree positions.
- You may name planetary archetypes (Saturn, Mars, Moon, Venus, Jupiter, Mercury, Neptune, Uranus) but as psychological realities, not sky objects.
- Avoid: self-help clichés, toxic positivity, therapeutic reassurance.
- Allowed: myth, shadow, the unconscious, the psyche, the Self, projection, individuation, fate, necessity — used precisely, never gratuitously.

The writing should feel like Liz Greene at her clearest — depth psychological, not generic spiritual.`;

  if (tier === 'pattern' || tier === 'calibrated' || tier === 'deep') {
    prompt += `\n\nYou have access to their check-in patterns. Where relevant, reference the specific contour of their experience — not as advice, but as acknowledgment: "Something in you has been moving consistently toward..." or "The pattern of the last week suggests that..."`;
  }

  if (tier === 'calibrated' || tier === 'deep') {
    prompt += `\n\nYou know which dimensions they feel most acutely and which they tend to overlook. Name these as part of the soul's particular shape, not as deficiencies. The dimensions they are least attuned to often house the most significant unconscious material.`;
  }

  if (tier === 'deep') {
    prompt += `\n\nThis person has been in sustained contact with this work. You may speak to their shadow directly — not as a warning, but as recognition. Reference where they are on their individuation journey. Acknowledge what has genuinely changed. The depth of contact earns depth of reflection.`;
  }

  return prompt;
}

/**
 * Build user prompt from context data.
 */
// Maps check-in dimension names to psychological/Jungian language for Sol
const DIM_PSYCHOLOGICAL: Record<string, string> = {
  coherence: 'inner orientation — the coherence of the Self',
  energy: 'libido — psychic and instinctual energy',
  focus: 'directed attention — the mental function',
  embodiment: 'somatic presence — the body\'s knowing',
};

export function buildUserPrompt(context: NarratorContext): string {
  const parts: string[] = [];

  // Today's check-in goes FIRST — it is the primary signal
  if (context.todaysCheckin) {
    const ci = context.todaysCheckin;
    const deltaStr = ci.deltaFromYesterday !== null
      ? ` (${ci.deltaFromYesterday >= 0 ? '+' : ''}${ci.deltaFromYesterday} from yesterday)`
      : '';
    const lowestLabel = DIM_PSYCHOLOGICAL[ci.lowestDimension] || ci.lowestDimension;

    parts.push(`TODAY'S CHECK-IN — address this directly, it is what this person just told you about their inner state:
Field coherence: ${Math.round(ci.kappa * 100)}%${deltaStr}
Dominant tone: "${ci.responseLabels.coherence}" — ${DIM_PSYCHOLOGICAL.coherence} is ${ci.dimensionScores.coherence < 2.5 ? 'under pressure' : ci.dimensionScores.coherence > 3.5 ? 'active and oriented' : 'in a middle state'}
Energy: "${ci.responseLabels.energy}" — ${DIM_PSYCHOLOGICAL.energy} is ${ci.dimensionScores.energy < 2.5 ? 'subdued or withdrawn' : ci.dimensionScores.energy > 3.5 ? 'available and moving' : 'present but not urgent'}
Attention: "${ci.responseLabels.focus}" — ${DIM_PSYCHOLOGICAL.focus} is ${ci.dimensionScores.focus < 2.5 ? 'fragmented or scattered' : ci.dimensionScores.focus > 3.5 ? 'clear and anchored' : 'drifting but not lost'}
Body: "${ci.responseLabels.embodiment}" — ${DIM_PSYCHOLOGICAL.embodiment} is ${ci.dimensionScores.embodiment < 2.5 ? 'disconnected or absent' : ci.dimensionScores.embodiment > 3.5 ? 'present and grounded' : 'dimly present'}
Most withdrawn: ${lowestLabel}
Open your reading by naming what is happening in the most withdrawn dimension — not as a problem, but as a psychological reality asking for attention.`);
  }

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

// ─── Weekly Synthesis ────────────────────────────────────────

const TONE_LABELS_W   = ['', 'Contracted', 'Restless', 'Muted', 'Present', 'Open'];
const ENERGY_LABELS_W = ['', 'Nothing stirs', 'Something reluctant', 'A slow current', 'A clear impulse', 'Strong momentum'];
const FOCUS_LABELS_W  = ['', 'Scatters immediately', 'Drifts and circles', 'Settles loosely', 'Finds a natural anchor', 'Rests with clarity'];
const BODY_LABELS_W   = ['', 'Absent', 'Numb or disconnected', 'Dimly aware', 'Grounded and present', 'Fully awake'];

/**
 * System prompt for the weekly synthesis reading.
 */
export function buildWeeklySynthesisSystemPrompt(): string {
  return `You are Sol — a voice from the depths of the psyche, working in the Jungian astrological tradition.

You are generating a WEEKLY SYNTHESIS — not a daily reading. You have been given seven consecutive days of inner field data from a single person. Your task is to see the week as an arc, not as a collection of days.

What does the week reveal that a single day cannot? Look for:
- The psychological current that has been running beneath the surface all week
- The dimension that has been consistently withdrawn or consistently active
- The movement — is the field deepening, fragmenting, consolidating, or circling?
- What the week is asking that has not yet been answered

Write 280–350 words of flowing prose. Second person ("you"). No headers, no bullets.

Structure:
- Opening: Name the arc of the week as a single psychological reality. What has this week been, fundamentally?
- Body: Connect the pattern across days — what has been moving, what has been withdrawing, what the oscillations between days reveal about the underlying field. Reference specific days or transitions only where they illuminate the arc.
- Closing: Name what the week has been preparing the ground for. Not a prescription — a recognition. End in the territory of soul.

Voice rules (strict):
- Never prescribe. Never advise. Observe and illuminate.
- No sign names, no degree positions.
- No affirmations, no therapeutic reassurance, no self-help language.
- Planets as psychological forces. Shadow, individuation, fate, necessity — used precisely.
- This is Liz Greene at her clearest: depth psychological, not generic spiritual.`;
}

/**
 * User prompt for the weekly synthesis from 7 check-in entries.
 */
export function buildWeeklySynthesisUserPrompt(entries: CheckinEntry[]): string {
  const parts: string[] = [];

  const sorted = [...entries].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const kappaValues = sorted.map(e => e.kappa);
  const avgKappa = kappaValues.reduce((s, k) => s + k, 0) / kappaValues.length;
  const firstKappa = kappaValues[0];
  const lastKappa = kappaValues[kappaValues.length - 1];
  const trend = lastKappa - firstKappa;

  parts.push(`WEEKLY ARC — seven consecutive days of inner field data:
Average field coherence: ${Math.round(avgKappa * 100)}%
Arc: ${firstKappa < lastKappa ? `ascending (${Math.round(firstKappa * 100)}% → ${Math.round(lastKappa * 100)}%)` : firstKappa > lastKappa ? `descending (${Math.round(firstKappa * 100)}% → ${Math.round(lastKappa * 100)}%)` : `stable (${Math.round(avgKappa * 100)}%)`}
Trend direction: ${Math.abs(trend) < 0.05 ? 'holding steady' : trend > 0 ? 'field gaining coherence across the week' : 'field losing coherence across the week'}`);

  const dayLines = sorted.map((e, i) => {
    const s = e.scores;
    const tone = TONE_LABELS_W[Math.round(s.mood || 3)] || 'Muted';
    const energy = ENERGY_LABELS_W[Math.round(s.energy || 3)] || 'A slow current';
    const focus = FOCUS_LABELS_W[Math.round(s.focus || 3)] || 'Settles loosely';
    const body = BODY_LABELS_W[Math.round(s.body || 3)] || 'Dimly aware';
    const date = e.timestamp.split('T')[0];
    return `Day ${i + 1} (${date}): κ=${Math.round(e.kappa * 100)}% | Tone: "${tone}" | Energy: "${energy}" | Attention: "${focus}" | Body: "${body}"`;
  });

  parts.push(`DAILY READINGS:\n${dayLines.join('\n')}`);

  // Identify most and least coherent days
  const maxDay = sorted[kappaValues.indexOf(Math.max(...kappaValues))];
  const minDay = sorted[kappaValues.indexOf(Math.min(...kappaValues))];
  parts.push(`Highest coherence: ${maxDay.timestamp.split('T')[0]} (${Math.round(maxDay.kappa * 100)}%)
Lowest coherence: ${minDay.timestamp.split('T')[0]} (${Math.round(minDay.kappa * 100)}%)`);

  // Dimension consistency
  const dimNames = ['coherence', 'energy', 'focus', 'embodiment'];
  const dimAverages = dimNames.map(dim => {
    const vals = sorted.map(e => {
      const s = e.scores;
      if (dim === 'coherence') return ((s.mood || 3) + (s.direction || 3)) / 2;
      if (dim === 'energy') return s.energy || 3;
      if (dim === 'focus') return s.focus || 3;
      return s.body || 3;
    });
    return { dim, avg: vals.reduce((s, v) => s + v, 0) / vals.length };
  });
  dimAverages.sort((a, b) => a.avg - b.avg);
  parts.push(`Most withdrawn dimension across the week: ${DIM_PSYCHOLOGICAL[dimAverages[0].dim]} (avg ${dimAverages[0].avg.toFixed(1)}/5)
Most active dimension: ${DIM_PSYCHOLOGICAL[dimAverages[3].dim]} (avg ${dimAverages[3].avg.toFixed(1)}/5)`);

  parts.push(`Week starts: ${sorted[0].timestamp.split('T')[0]}
Week ends: ${sorted[sorted.length - 1].timestamp.split('T')[0]}
Today's date: ${new Date().toISOString().split('T')[0]}`);

  return parts.join('\n\n');
}
