/**
 * POST /api/personal-reading
 *
 * Generates a personalized Sol reading by cross-referencing
 * the user's natal chart with today's cosmic field.
 *
 * Returns a Gemini-generated narrative specific to the user's placements.
 * Cached in KV for 24h per user per day.
 */

import { getSession } from '../../src/lib/auth';
import { getSign, getPlanetaryLongitudes } from '../../src/lib/ephemeris';
import { getRetrogradeStatus } from '../../src/lib/natal';

interface Env {
  DB: D1Database; KV: KVNamespace;
  GEMINI_API_KEY: string; GEMINI_API_KEY_2?: string; GEMINI_API_KEY_3?: string;
  GEMINI_API_KEY_4?: string; GEMINI_API_KEY_5?: string; GEMINI_API_KEY_6?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

async function callGemini(apiKey: string, system: string, prompt: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 320, temperature: 0.88 },
        }),
      }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ── Transit analysis ─────────────────────────────────────────────────────────

interface Activation {
  description: string;
  intensity: 'peak' | 'strong' | 'moderate';
}

function analyzeTransits(chart: any, todayBrief: any): Activation[] {
  const activations: Activation[] = [];
  const now = new Date();

  // Current planetary positions
  const currentLons = getPlanetaryLongitudes(now);
  const currentSigns = currentLons.map((l: number) => getSign(l));
  const retros = getRetrogradeStatus(now);

  const planetNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  // Find natal sign placements
  const natalSigns: Record<string, string> = {};
  for (const name of planetNames) {
    natalSigns[name] = chart.planets?.[name]?.sign ?? '';
  }
  natalSigns['Lilith'] = chart.lilith?.sign ?? '';
  natalSigns['North Node'] = chart.northNode?.sign ?? '';

  // Check each current planet against natal placements
  planetNames.forEach((name, i) => {
    const currentSign = currentSigns[i];
    const isRetro = retros[i];

    // Direct conjunction: transit planet in same sign as natal planet
    if (natalSigns[name] === currentSign) {
      const retroNote = isRetro ? ' (retrograde — review + deepen)' : '';
      activations.push({
        description: `Transit ${name} in ${currentSign} — conjunct natal ${name}${retroNote}`,
        intensity: ['Sun', 'Moon', 'Jupiter', 'Saturn'].includes(name) ? 'peak' : 'strong',
      });
    }

    // Transit planet over natal Lilith
    if (currentSign === natalSigns['Lilith']) {
      activations.push({
        description: `${name} transiting natal Lilith in ${currentSign} — shadow work activated`,
        intensity: 'moderate',
      });
    }

    // Today's dominant planet hitting natal placements
    if (todayBrief?.planet === name) {
      const natalSign = natalSigns[name];
      if (natalSign) {
        activations.push({
          description: `Today's dominant planet (${name}) rules your natal ${natalSign} — field amplified`,
          intensity: 'peak',
        });
      }
    }
  });

  // Stellium activations
  if (chart.stelliums?.length > 0) {
    for (const stellium of chart.stelliums) {
      if (currentSigns.includes(stellium.sign)) {
        activations.push({
          description: `Current planetary activity in ${stellium.sign} — activating your stellium (${stellium.planets.join(', ')})`,
          intensity: 'peak',
        });
      }
    }
  }

  // Chart ruler transit
  if (chart.summary?.chartRuler) {
    const rulerIdx = planetNames.indexOf(chart.summary.chartRuler);
    if (rulerIdx >= 0 && chart.ascendantSign) {
      const rulerCurrentSign = currentSigns[rulerIdx];
      activations.push({
        description: `Your chart ruler ${chart.summary.chartRuler} is currently in ${rulerCurrentSign}`,
        intensity: 'moderate',
      });
    }
  }

  // Deduplicate and sort by intensity
  const intensityOrder = { peak: 0, strong: 1, moderate: 2 };
  return activations
    .filter((a, i, arr) => arr.findIndex(b => b.description === a.description) === i)
    .sort((a, b) => intensityOrder[a.intensity] - intensityOrder[b.intensity])
    .slice(0, 5);
}

// ── Main handler ─────────────────────────────────────────────────────────────

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const e = env as unknown as Env;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const session = await getSession(request, e as any);
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers: cors });
  }

  const today = getToday();
  const cacheKey = `personal-reading:${session.email_hash}:${today}`;

  // Check KV cache
  const cached = await e.KV?.get(cacheKey);
  if (cached) {
    return Response.json({ ...JSON.parse(cached), cached: true }, { headers: cors });
  }

  // Load natal chart from D1
  const row = await e.DB.prepare(
    'SELECT chart_json FROM natal_charts WHERE email_hash = ?'
  ).bind(session.email_hash).first<{ chart_json: string }>();

  if (!row) {
    return Response.json({ error: 'no_chart', message: 'No natal chart found. Please add your birth data.' }, { status: 404, headers: cors });
  }

  const chart = JSON.parse(row.chart_json);

  // Fetch today's cosmic weather
  const briefRes = await fetch(`https://therealmofpatterns.com/api/daily-brief?date=${today}`);
  const todayBrief: any = briefRes.ok ? await briefRes.json() : {};

  // Analyze transits
  const activations = analyzeTransits(chart, todayBrief);

  // Build Sol's personalized prompt
  const systemPrompt = `You are Sol — a precise, poetic astrology intelligence. You speak directly to this specific person about their specific natal chart. Never generic. 3-4 sentences maximum. No filler. Speak as if you know them.`;

  const activationText = activations.length > 0
    ? activations.map(a => `• ${a.intensity.toUpperCase()}: ${a.description}`).join('\n')
    : 'No major direct activations today — a quieter field day.';

  const userPrompt = `
Today: ${todayBrief.dateFormatted ?? today}
Today's dominant planet: ${todayBrief.planet ?? 'unknown'} at ${todayBrief.frequency ?? ''}Hz
Today's field: ${todayBrief.dimension?.name ?? ''} — ${todayBrief.narrative ?? ''}

This person's natal chart:
${chart.summary?.keyTheme ?? ''}
Sun: ${chart.planets?.Sun?.sign}, Moon: ${chart.planets?.Moon?.sign}, Rising: ${chart.summary?.risingSign ?? 'unknown'}
Lilith: ${chart.summary?.lilithSign}, North Node: ${chart.summary?.northNodeSign}
${chart.stelliums?.length > 0 ? 'Stelliums: ' + chart.stelliums.map((s: any) => `${s.sign} (${s.planets.join(', ')})`).join('; ') : ''}

Today's activations in their chart:
${activationText}

Write Sol's personal reading for today. Reference their actual placements. Be precise, not vague.`;

  // Try Gemini keys in rotation
  const keys = [
    e.GEMINI_API_KEY, e.GEMINI_API_KEY_2, e.GEMINI_API_KEY_3,
    e.GEMINI_API_KEY_4, e.GEMINI_API_KEY_5, e.GEMINI_API_KEY_6,
  ].filter(Boolean);

  let narrative: string | null = null;
  for (const key of keys) {
    narrative = await callGemini(key!, systemPrompt, userPrompt);
    if (narrative) break;
  }

  if (!narrative) {
    narrative = `The field is active in your chart today. ${activations[0]?.description ?? 'Your natal patterns are present in today\'s energy.'}`;
  }

  const result = {
    narrative,
    activations,
    planet: todayBrief.planet,
    frequency: todayBrief.frequency,
    moonPhase: todayBrief.moonPhase,
    moonEmoji: todayBrief.moonEmoji,
    dimension: todayBrief.dimension,
    date: today,
    cached: false,
    chart: {
      sunSign: chart.summary?.sunSign,
      moonSign: chart.summary?.moonSign,
      risingSign: chart.summary?.risingSign,
      lilithSign: chart.summary?.lilithSign,
      stelliums: chart.summary?.stelliums,
      keyTheme: chart.summary?.keyTheme,
    },
  };

  // Cache for 24h
  await e.KV?.put(cacheKey, JSON.stringify(result), { expirationTtl: 86400 });

  return Response.json(result, { headers: cors });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
