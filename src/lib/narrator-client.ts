/**
 * Narrator Client
 *
 * Fetches AI-generated narratives from /api/narrator.
 * Includes localStorage caching and template fallback.
 */

import { buildNarratorContext, buildSystemPrompt, buildUserPrompt, buildWeeklySynthesisSystemPrompt, buildWeeklySynthesisUserPrompt, type PersonalizationTier } from './narrator-context';
import { getTodaysCheckin, getCheckinHistory, getRecentCheckins } from './checkin-storage';

export interface NarratorResult {
  narrative: string;
  tier: PersonalizationTier;
  model: string;
  cached: boolean;
  fromFallback: boolean;
}

const CACHE_PREFIX = 'rop_narrative_';

/**
 * Fetch today's narrative. Checks local cache, then API, falls back to template.
 */
export async function fetchNarrative(): Promise<NarratorResult> {
  const today = new Date().toISOString().split('T')[0];
  // Cache key includes today's check-in ID so it invalidates after a new check-in
  const todayEntry = getTodaysCheckin();
  const cacheKey = CACHE_PREFIX + today + (todayEntry ? '_' + todayEntry.id : '');

  // 1. Check localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return { ...JSON.parse(cached), cached: true, fromFallback: false };
      }
    } catch { /* continue */ }
  }

  // 2. Build context + call API
  try {
    const { context, tier, userHash } = buildNarratorContext();
    const systemPrompt = buildSystemPrompt(tier);
    const userPrompt = buildUserPrompt(context);

    // Check if user is pro
    let isPro = false;
    if (typeof window !== 'undefined') {
      try {
        const user = localStorage.getItem('rop_user');
        if (user) isPro = JSON.parse(user).isPro === true;
      } catch { /* default false */ }
    }

    const response = await fetch('/api/narrator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userHash,
        context,
        tier,
        systemPrompt,
        userPrompt,
        isPro,
        checkinId: todayEntry?.id || null,
      }),
    });

    if (response.ok) {
      const data = await response.json() as { narrative: string; tier: string; model: string; cached: boolean };
      const result: NarratorResult = {
        narrative: data.narrative,
        tier: data.tier as PersonalizationTier,
        model: data.model,
        cached: data.cached,
        fromFallback: false,
      };

      // Cache locally
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
          // Clean old cache entries
          cleanOldNarrativeCache();
        } catch { /* storage full, ignore */ }
      }

      return result;
    }
  } catch (e) {
    console.warn('[NARRATOR] API call failed:', e);
  }

  // 3. Fallback to template
  return getFallbackNarrative();
}

/**
 * Template fallback when API is unavailable.
 */
function getFallbackNarrative(): NarratorResult {
  const { tier } = buildNarratorContext();

  const templates: Record<PersonalizationTier, string> = {
    intro: "Something in you already knows that the outer life is a reflection of an inner one — that the recurring tensions, the patterns that keep returning, are not random. They have a shape. This work begins with that shape: the configuration of forces present at your birth, which the Jungian tradition reads not as fate but as the particular psychological task you came here to engage. The field is quiet today, waiting for you to begin listening. What you notice first is rarely accidental.",
    early: "The map is beginning to take form. Each time you return, the field becomes more legible — not because the patterns change, but because you are learning to read them. Something in today's sky touches a dimension of your natal profile that is worth sitting with. The work at this stage is simply to notice: what feels familiar in an uncomfortable way? What has appeared before, wearing different clothes? The pattern you keep meeting is the one most worth understanding.",
    pattern: "The field has started speaking in your particular frequency. What was abstract is becoming personal — you are beginning to recognize the specific shape of your own psychological weather. Today carries a current worth attending to. Not as something to manage or optimize, but as information about what is moving in the deeper layers. The psyche communicates through pattern, and yours is becoming visible. What the week has shown you is not coincidence.",
    calibrated: "You are in sustained contact with this work, and the field reflects that. The dimensions you feel most acutely and those you tend to overlook have become clearer — both to the system and, more importantly, to you. Today's transit touches something in your natal structure that has been active beneath the surface. The shadow material is often what we feel least, not most — the dimensions that seem irrelevant are frequently where the most significant unconscious content lives. What have you been not quite looking at?",
    deep: "The individuation process does not move in straight lines. What you are encountering now is not a regression but a deeper layer of the same essential work — the spiral returning to familiar territory at a new depth. You have been here long enough to know the difference between genuine movement and the psyche's capacity for sophisticated avoidance. The field today confirms something you have probably already sensed. The question is not whether you know it, but whether you are willing to let it change something.",
  };

  return {
    narrative: templates[tier],
    tier,
    model: 'template',
    cached: false,
    fromFallback: true,
  };
}

const WEEKLY_CACHE_PREFIX = 'rop_weekly_';

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export interface WeeklySynthesisResult {
  narrative: string;
  weekStart: string;
  checkinCount: number;
  cached: boolean;
}

/**
 * Fetch weekly synthesis. Generated once per calendar week after 7+ check-ins.
 * Returns null if not enough data yet.
 */
export async function fetchWeeklySynthesis(): Promise<WeeklySynthesisResult | null> {
  const history = getCheckinHistory();
  if (history.entries.length < 7) return null;

  const weekStart = getWeekStart();
  const cacheKey = WEEKLY_CACHE_PREFIX + weekStart;

  // Check local cache
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return { ...JSON.parse(cached), cached: true };
      }
    } catch { /* continue */ }
  }

  // Build context from last 7 check-ins
  const recentEntries = getRecentCheckins(7);
  if (recentEntries.length < 7) return null;

  let userHash = 'anonymous';
  let isPro = false;
  if (typeof window !== 'undefined') {
    try {
      userHash = localStorage.getItem('rop_device_hash') || localStorage.getItem('rop_user_hash') || 'anonymous';
      const user = localStorage.getItem('rop_user');
      if (user) isPro = JSON.parse(user).isPro === true;
    } catch { /* default */ }
  }

  try {
    const systemPrompt = buildWeeklySynthesisSystemPrompt();
    const userPrompt = buildWeeklySynthesisUserPrompt(recentEntries);

    const response = await fetch('/api/narrator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userHash,
        tier: 'weekly',
        systemPrompt,
        userPrompt,
        isPro,
        weekStart,
        type: 'weekly',
      }),
    });

    if (response.ok) {
      const data = await response.json() as { narrative: string };
      const result: WeeklySynthesisResult = {
        narrative: data.narrative,
        weekStart,
        checkinCount: recentEntries.length,
        cached: false,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(result));
        } catch { /* ignore */ }
      }
      return result;
    }
  } catch (e) {
    console.warn('[WEEKLY] API call failed:', e);
  }

  return null;
}

/**
 * Remove narrative cache entries older than 7 days.
 */
function cleanOldNarrativeCache(): void {
  if (typeof window === 'undefined') return;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        const date = key.replace(CACHE_PREFIX, '');
        if (date < cutoffStr) {
          localStorage.removeItem(key);
        }
      }
    }
  } catch { /* ignore */ }
}
