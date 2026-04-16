/**
 * GET /api/social-content?date=YYYY-MM-DD
 * Returns deterministic daily social content: captions + image prompt.
 * Given the same date, the output is always calculable from planetary positions.
 * Gemini-enhanced when API key is present; falls back to templates.
 *
 * Called by: cron daily-update, admin dashboard, social scheduling tools
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

// Moon phase from synodic cycle (same calc as daily-brief)
function getMoonPhase(date: Date): { phase: string; emoji: string } {
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

// Dimension → archetype labels for content
const DIM_ARCHETYPE: Record<string, string> = {
  Identity: 'The Hero / The Soul',
  Structure: 'The Architect / The Hermit',
  Mind: 'The Messenger / The Weaver',
  Heart: 'The Lover / The Beloved',
  Growth: 'The Explorer / The Seeker',
  Drive: 'The Warrior / The Alchemist',
  Connection: 'The Weaver / The Empath',
  Awareness: 'The Witness / The Mystic',
};

// Dimension → visual keywords for image prompt
const DIM_VISUAL: Record<string, string> = {
  Identity: 'radiant solar figure, golden light, crown, hero journey, cosmic sunrise',
  Structure: 'sacred geometry, stone pillars, crystal lattice, mountain peak, deep blue',
  Mind: 'mercury wings, neural networks, starling murmuration, silver threads, communication',
  Heart: 'rose mandala, copper tones, twin flames, venus glyph, warm amber light',
  Growth: 'infinite horizon, jupiter bands, ancient oak tree, map of stars, emerald green',
  Drive: 'volcanic energy, red planet mars, warrior silhouette, flame spiral, crimson',
  Connection: 'moon reflection on water, silver threads between people, tidal waves, indigo',
  Awareness: 'third eye opening, nebula, cosmic ocean, dissolving boundaries, violet aurora',
};

// Planet → qualities for caption
const PLANET_QUALITY: Record<string, string> = {
  Sun: 'clarity and self-expression',
  Saturn: 'discipline and structure',
  Mercury: 'communication and sharp thought',
  Venus: 'beauty and heart-connection',
  Jupiter: 'expansion and meaning',
  Mars: 'action and raw energy',
  Moon: 'emotional depth and empathy',
  'Uranus/Neptune': 'higher awareness and intuition',
};

// Hashtag sets per dimension (SEO + discovery)
const DIM_HASHTAGS: Record<string, string[]> = {
  Identity: ['#selfawareness', '#herojourney', '#identity', '#solarenergy'],
  Structure: ['#discipline', '#structure', '#saturnreturn', '#boundaries'],
  Mind: ['#mercurydirect', '#mindfulness', '#clarity', '#communication'],
  Heart: ['#venus', '#selflovve', '#heartchakra', '#relationships'],
  Growth: ['#jupiter', '#personalgrowth', '#abundance', '#expansion'],
  Drive: ['#mars', '#motivation', '#courage', '#action'],
  Connection: ['#moon', '#empathy', '#community', '#emotional'],
  Awareness: ['#spiritualawareness', '#intuition', '#cosmic', '#meditation'],
};

const BASE_HASHTAGS = ['#jungian', '#depthpsychology', '#astrology', '#therealmofpatterns', '#dailyreading'];
const CTA = 'DM me your birthday for your personal 8D reading → therealmofpatterns.com';

// Template-based caption (no Gemini required)
function buildTemplateCaptions(
  dimension: string,
  planet: string,
  moon: string,
  moonEmoji: string,
  isYang: boolean,
  dateFormatted: string,
): { caption_ig: string; caption_x: string } {
  const quality = PLANET_QUALITY[planet] ?? 'cosmic energy';
  const archetype = DIM_ARCHETYPE[dimension] ?? 'The Seeker';
  const energy = isYang ? 'active, expressive' : 'receptive, inward';

  const caption_ig =
    `${moonEmoji} Today's field: ${dimension} — ruled by ${planet}.\n\n` +
    `The pattern today calls for ${quality}. ${moon} energy shapes this into something ${energy}.\n\n` +
    `Archetype active: ${archetype}.\n\n` +
    `What dimension is pulling at you today?\n\n` +
    `${CTA}`;

  const caption_x =
    `${moonEmoji} ${dateFormatted} — ${dimension} dimension active (${planet})\n` +
    `Today: ${quality}. ${moon}. Archetype: ${archetype}.\n` +
    `What's your 8D type? → therealmofpatterns.com`;

  return { caption_ig, caption_x };
}

// Image prompt (deterministic, no API needed)
function buildImagePrompt(dimension: string, planet: string, moon: string): string {
  const visual = DIM_VISUAL[dimension] ?? 'cosmic mandala, starfield, sacred geometry';
  return (
    `Mystical cosmic illustration representing ${dimension} energy. ` +
    `Visual elements: ${visual}. ${planet} as ruling celestial body, ${moon} phase visible. ` +
    `Style: dark celestial background, ethereal glow, depth psychology aesthetic, ` +
    `sacred geometry overlay, watercolor + digital art fusion, 1:1 square format for Instagram. ` +
    `Mood: introspective yet inviting, neither too dark nor too bright. No text.`
  );
}

// Gemini-enhanced generation (richer, more varied copy)
async function generateWithGemini(
  geminiKey: string,
  dimension: string,
  planet: string,
  moon: string,
  isYang: boolean,
  dateFormatted: string,
): Promise<{ caption_ig: string; caption_x: string } | null> {
  const quality = PLANET_QUALITY[planet] ?? 'cosmic energy';
  const energy = isYang ? 'yang (active, outward)' : 'yin (receptive, inward)';

  const prompt = `You are Sol — warm, accessible depth psychology guide (Alan Watts + Ram Dass tone).

Today is ${dateFormatted}. The cosmic field shows:
- Dominant dimension: ${dimension} (ruler: ${planet})
- Quality: ${quality}
- Moon phase: ${moon}
- Polarity: ${energy}

Write two social media captions:

1. INSTAGRAM (150-200 chars without hashtags, warm + poetic, ends with an open question):

2. TWITTER/X (200-240 chars including a link placeholder [LINK], conversational, no hashtags in body):

Rules:
- No "you should" or prescriptive language
- No FRC, kappa, or technical jargon
- Planets as psychology, not fortune-telling
- Sol speaks, never explains
- Output only the two captions, numbered as above.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    // Parse the two captions from numbered output
    const igMatch = text.match(/1\.\s*INSTAGRAM[:\s]*\n?([\s\S]+?)(?=\n2\.|$)/i);
    const xMatch = text.match(/2\.\s*TWITTER[/\w]*[:\s]*\n?([\s\S]+?)$/i);

    if (!igMatch || !xMatch) return null;

    const caption_ig = igMatch[1].trim()
      .replace('[LINK]', 'therealmofpatterns.com')
      + `\n\n${CTA}`;
    const caption_x = xMatch[1].trim()
      .replace('[LINK]', 'therealmofpatterns.com');

    return { caption_ig, caption_x };
  } catch {
    return null;
  }
}

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get('date');

  const targetDate = dateParam ? new Date(dateParam + 'T12:00:00Z') : new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  // KV cache check (24h — content is stable per date)
  const cacheKey = `social-content:${dateStr}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers: { ...CORS, 'X-Cache': 'HIT' } });
  }

  // Compute deterministic field data from planetary positions
  const lons = getPlanetaryLongitudes(targetDate);
  const vector = compute8D(lons);
  const dominant = getDominant(vector);
  const meta = DIMENSION_METADATA[dominant.index];
  const moon = getMoonPhase(targetDate);
  const isYang = dominant.value > 0.6;

  const dateFormatted = targetDate.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  // Generate captions — Gemini if available, template fallback
  let captions = dateParam !== null || !env.GEMINI_API_KEY
    ? null
    : await generateWithGemini(
        env.GEMINI_API_KEY,
        meta.name,
        meta.ruler,
        moon.phase,
        isYang,
        dateFormatted,
      );

  // Always try Gemini for current date
  if (!captions && env.GEMINI_API_KEY) {
    captions = await generateWithGemini(
      env.GEMINI_API_KEY,
      meta.name,
      meta.ruler,
      moon.phase,
      isYang,
      dateFormatted,
    );
  }

  if (!captions) {
    captions = buildTemplateCaptions(
      meta.name, meta.ruler, moon.phase, moon.emoji, isYang, dateFormatted,
    );
  }

  const hashtags = [
    ...DIM_HASHTAGS[meta.name] ?? [],
    ...BASE_HASHTAGS,
  ];

  const result = {
    date: dateStr,
    dateFormatted,
    dimension: meta.name,
    planet: meta.ruler,
    moonPhase: moon.phase,
    moonEmoji: moon.emoji,
    isYangDay: isYang,
    caption_ig: captions.caption_ig,
    caption_x: captions.caption_x,
    image_prompt: buildImagePrompt(meta.name, meta.ruler, moon.phase),
    hashtags,
    cta: CTA,
    source: 'therealmofpatterns.com',
  };

  const json = JSON.stringify(result);
  await env.CACHE.put(cacheKey, json, { expirationTtl: 86400 }); // 24h

  return new Response(json, { headers: CORS });
};
