/**
 * Narrator Client
 *
 * Fetches AI-generated narratives from /api/narrator.
 * Includes localStorage caching and template fallback.
 */

import { buildNarratorContext, buildSystemPrompt, buildUserPrompt, type PersonalizationTier } from './narrator-context';

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
  const cacheKey = CACHE_PREFIX + today;

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
    intro: "Welcome to The Realm of Patterns. Your unique energy profile is like a fingerprint in the cosmos — no one else has quite the same combination. Today's sky is sending a gentle nudge to pay attention to what feels natural. Trust your instincts, and notice the moments where things click into place. Your journey is just beginning, and there's so much to discover about how you move through the world.",
    early: "You're starting to see how this works. Each check-in adds another data point, and the patterns are beginning to emerge. Today, pay attention to the energy that feels strongest — that's your profile resonating with the sky above. Keep checking in, and you'll start to notice your own rhythms more clearly.",
    pattern: "Your check-in history is telling a story. The patterns in your energy are becoming clearer with each day. Today's sky brings a shift worth paying attention to. Notice how your energy moves through the day — the peaks and valleys have meaning. Trust what you're learning about yourself.",
    calibrated: "The system is learning your rhythms, and the readings are getting more accurate. Today's energy is shaped by transits that interact with your unique sensitivities. Pay extra attention to the dimension that's been most active for you lately — there's a message in how strongly you feel it.",
    deep: "You've been on this path long enough to know: the patterns are real, and they're deeply personal. Today's sky is speaking directly to where you are in your journey. Your shadow work is showing results, and the spiral continues. Trust the process — you know how to read your own energy now.",
  };

  return {
    narrative: templates[tier],
    tier,
    model: 'template',
    cached: false,
    fromFallback: true,
  };
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
