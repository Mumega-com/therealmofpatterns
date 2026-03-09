/**
 * GET /api/daily-brief
 * Returns today's field brief as JSON for the /sol/today page and email.
 *
 * Response: { date, dateFormatted, planet, frequency, dimension,
 *             archetypes: { yin, yang }, moonPhase, moonEmoji, narrative }
 */

import type { Env } from '../../src/types';
import { compute8D, getDominant } from '../../src/lib/16d-engine';
import { getPlanetaryLongitudes } from '../../src/lib/ephemeris';
import { DIMENSION_METADATA } from '../../src/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── Planet → frequency (Kepler / Cousto astronomical ratios) ─
const PLANET_FREQ: Record<string, number> = {
  Sun: 126.22, Moon: 210.42, Mercury: 141.27, Venus: 221.23,
  Mars: 144.72, Jupiter: 183.58, Saturn: 147.85,
  'Uranus/Neptune': 207.36,
};

// ── Dimension → Jungian archetype (yin/yang polarity) ────────
const DIM_ARCHETYPES: Record<string, { yin: { name: string; symbol: string; quality: string }; yang: { name: string; symbol: string; quality: string } }> = {
  Identity: {
    yin:  { name: 'The Soul',       symbol: '☽', quality: 'Inner radiance, authenticity' },
    yang: { name: 'The Hero',       symbol: '☉', quality: 'Courage, self-expression' },
  },
  Structure: {
    yin:  { name: 'The Hermit',     symbol: '⚗', quality: 'Withdrawal, inner light' },
    yang: { name: 'The Architect',  symbol: '◈', quality: 'Structure, mastery' },
  },
  Mind: {
    yin:  { name: 'The Weaver',     symbol: '∞', quality: 'Pattern-sensing, intuition' },
    yang: { name: 'The Messenger',  symbol: '✦', quality: 'Clarity, articulation' },
  },
  Heart: {
    yin:  { name: 'The Beloved',    symbol: '♡', quality: 'Receptivity, depth of feeling' },
    yang: { name: 'The Lover',      symbol: '◎', quality: 'Beauty, creative force' },
  },
  Growth: {
    yin:  { name: 'The Seeker',     symbol: '◉', quality: 'Longing, inner pilgrimage' },
    yang: { name: 'The Explorer',   symbol: '⬡', quality: 'Expansion, meaning-making' },
  },
  Drive: {
    yin:  { name: 'The Alchemist',  symbol: '△', quality: 'Directed will, quiet force' },
    yang: { name: 'The Warrior',    symbol: '◆', quality: 'Action, decisive courage' },
  },
  Connection: {
    yin:  { name: 'The Empath',     symbol: '◌', quality: 'Deep attunement, reflection' },
    yang: { name: 'The Weaver',     symbol: '⊕', quality: 'Bonds, communal field' },
  },
  Awareness: {
    yin:  { name: 'The Mystic',     symbol: '◑', quality: 'Dissolution, cosmic attunement' },
    yang: { name: 'The Witness',    symbol: '◐', quality: 'Presence, clear seeing' },
  },
};

// ── Moon phase from synodic cycle ────────────────────────────
function getMoonPhase(date: Date): { phase: string; emoji: string } {
  // Known new moon reference: Jan 29, 2025 12:36 UTC
  const REF_NEW_MOON = new Date('2025-01-29T12:36:00Z').getTime();
  const SYNODIC = 29.53058867 * 24 * 60 * 60 * 1000;
  const elapsed = ((date.getTime() - REF_NEW_MOON) % SYNODIC + SYNODIC) % SYNODIC;
  const pct = elapsed / SYNODIC;

  if (pct < 0.035) return { phase: 'New Moon',        emoji: '🌑' };
  if (pct < 0.25)  return { phase: 'Waxing Crescent', emoji: '🌒' };
  if (pct < 0.285) return { phase: 'First Quarter',   emoji: '🌓' };
  if (pct < 0.465) return { phase: 'Waxing Gibbous',  emoji: '🌔' };
  if (pct < 0.535) return { phase: 'Full Moon',       emoji: '🌕' };
  if (pct < 0.715) return { phase: 'Waning Gibbous',  emoji: '🌖' };
  if (pct < 0.75)  return { phase: 'Last Quarter',    emoji: '🌗' };
  if (pct < 0.965) return { phase: 'Waning Crescent', emoji: '🌘' };
  return { phase: 'New Moon', emoji: '🌑' };
}

// ── Format date nicely ───────────────────────────────────────
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

// ── Pull narrative from DB if available ─────────────────────
async function getStoredNarrative(db: D1Database, dateStr: string): Promise<string | null> {
  try {
    const row = await db.prepare(
      `SELECT content FROM cosmic_content
       WHERE content_type = 'daily_weather' AND date = ? AND lang = 'en'
       LIMIT 1`
    ).bind(dateStr).first<{ content: string }>();
    if (row?.content) {
      // Extract first paragraph from stored content if it's rich text
      const text = row.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const first = text.split(/[.!?]\s+/)[0];
      return first ? first + '.' : null;
    }
  } catch { /* table may differ */ }
  return null;
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');

  const today = dateParam ? new Date(dateParam) : new Date();
  const dateStr = today.toISOString().split('T')[0];

  // Check KV cache (1 hour)
  const cacheKey = `daily-brief:${dateStr}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers: { ...CORS, 'X-Cache': 'HIT' } });
  }

  // Compute today's 8D field vector from planetary positions
  const lons = getPlanetaryLongitudes(today);
  const vector = compute8D(lons);
  const dominant = getDominant(vector);
  const meta = DIMENSION_METADATA[dominant.index];

  // Frequency from ruling planet
  const planet = meta.ruler;
  const frequency = PLANET_FREQ[planet] ?? 126.22;

  // Yin/yang archetypes based on dominant dimension
  const archetypeSet = DIM_ARCHETYPES[meta.name] ?? DIM_ARCHETYPES.Awareness;

  // Yang = high energy (dominant value > 0.6), Yin = lower/receptive
  const isYangDay = dominant.value > 0.6;
  const primaryArchetype   = isYangDay ? archetypeSet.yang : archetypeSet.yin;
  const secondaryArchetype = isYangDay ? archetypeSet.yin  : archetypeSet.yang;

  // Moon phase
  const moon = getMoonPhase(today);

  // Narrative: DB first, fallback to generated
  let narrative = await getStoredNarrative(env.DB, dateStr);
  if (!narrative) {
    narrative = generateFallbackNarrative(meta.name, planet, moon.phase, isYangDay);
  }

  const brief = {
    date: dateStr,
    dateFormatted: formatDate(today),
    planet,
    frequency: Math.round(frequency * 100) / 100,
    dimension: {
      name: meta.name,
      symbol: meta.symbol,
      domain: meta.domain,
      value: Math.round(dominant.value * 100) / 100,
    },
    archetypes: {
      primary:   { ...primaryArchetype,   polarity: isYangDay ? 'yang' : 'yin' },
      secondary: { ...secondaryArchetype, polarity: isYangDay ? 'yin'  : 'yang' },
    },
    moonPhase: moon.phase,
    moonEmoji: moon.emoji,
    narrative,
    isYangDay,
  };

  const json = JSON.stringify(brief);
  await env.CACHE.put(cacheKey, json, { expirationTtl: 3600 });

  return new Response(json, { headers: CORS });
};

function generateFallbackNarrative(dim: string, planet: string, moon: string, yang: boolean): string {
  const energy = yang ? 'active' : 'receptive';
  const arc = yang ? 'expression' : 'depth';
  return `${planet} orients the field today — the ${dim} dimension carries the most charge. A ${moon} invites ${arc}. Meet the day with ${energy} presence.`;
}
