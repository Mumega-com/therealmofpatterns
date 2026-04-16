/**
 * POST /api/archetype-report
 *
 * PHASE 1 of the free Birth Chart Archetype Report — deterministic generator.
 *
 * Given birth data, produces a full structured report using:
 *   - 16D compute from real ephemeris (src/lib/16d-engine)
 *   - Archetype assignment (src/lib/archetype-engine)
 *   - Historical figure cosine match (D1 historical_figures)
 *   - Jungian threads (dimension-weighted)
 *   - Sol-voice oracle sentence (Gemini if available, deterministic fallback)
 *
 * Deterministic: report_id = SHA-256(canonical birth data), truncated.
 * Same birth data → same id → same permalink → same content.
 *
 * Body:
 *   {
 *     birth_date: "YYYY-MM-DD",                 required
 *     birth_time: "HH:MM" | null,               optional; defaults to noon
 *     birth_location: {                         optional; no houses when absent
 *       name: string, latitude?: number, longitude?: number, timezone_offset?: number
 *     } | null,
 *     email: string | null,                     optional; captured as subscriber
 *     referrer_code: string | null,             optional; attributes referral
 *     language: "en" | "pt-br" | ...            optional; default "en"
 *   }
 *
 * Response:
 *   {
 *     success: boolean,
 *     report_id: string,
 *     permalink: string,
 *     cached: boolean,
 *     report: { ...full report JSON... }
 *   }
 */

import type { Env, BirthData } from '../../src/types';
import { DIMENSION_METADATA } from '../../src/types';
import {
  compute16DFromBirthData,
  cosineResonance,
  getDominant,
  analyzeDimensions,
} from '../../src/lib/16d-engine';
import {
  assignArchetype,
  getJourneyContent,
  ARCHETYPES,
} from '../../src/lib/archetype-engine';
import { sendEmail } from '../../src/lib/resend-client';
import { remember } from '../../src/lib/mirror-client';

// ─────────────────────────────────────────────
// Request / response types
// ─────────────────────────────────────────────

interface LocationInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone_offset?: number;
}

interface RequestBody {
  birth_date?: string;
  birth_time?: string | null;
  birth_location?: LocationInput | null;
  email?: string | null;
  referrer_code?: string | null;
  language?: string;
}

interface FigureMatch {
  id: number;
  name: string;
  era: string;
  culture: string;
  domains: string[];
  quote: string;
  bio: string;
  similarity: number;
}

interface ArchetypeReport {
  report_id: string;
  generated_at: string;
  language: string;
  birth: {
    date: string;
    time: string | null;
    location: string | null;
  };
  identity: {
    primary_archetype: { id: string; title: string; planet: string; gift: string; quote: string; quote_author: string };
    shadow_archetype: { id: string; title: string; shadow_name: string; shadow_description: string };
    dominant_dimension: { name: string; domain: string; ruler: string; value: number };
    weakest_dimension: { name: string; domain: string; ruler: string; value: number };
    journey_stage: string;
    profile_shape: 'spike' | 'balanced' | 'split';
  };
  dimensions_16d: Array<{
    octave: 'inner' | 'shadow';
    index: number;
    name: string;
    symbol: string;
    domain: string;
    ruler: string;
    value: number;
    rank: number;
  }>;
  jungian_threads: Array<{ concept: string; description: string; relevance: string }>;
  historical_resonance: FigureMatch[];
  oracle_sentence: string;
  practice_prompts: string[];
  sol_voice: {
    intro: string;
    strength: string;
    shadow: string;
  };
  referral: {
    code: string;
    share_url: string;
    count: number;
    bonus_unlocked: boolean;
    unlock_threshold: number;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: CORS_HEADERS }
  );
}

/** SHA-256 hex digest (Web Crypto). */
async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Canonicalize birth data for hashing. Same semantic input → same string. */
function canonicalize(
  birthDate: string,
  birthTime: string | null,
  location: LocationInput | null,
): string {
  const parts = [
    `d=${birthDate}`,
    `t=${birthTime ?? 'none'}`,
    `lat=${location?.latitude != null ? location.latitude.toFixed(4) : 'none'}`,
    `lng=${location?.longitude != null ? location.longitude.toFixed(4) : 'none'}`,
    `tz=${location?.timezone_offset != null ? location.timezone_offset : 'none'}`,
  ];
  return parts.join('|');
}

/** Parse YYYY-MM-DD + optional HH:MM to BirthData shape. */
function parseBirthData(
  dateStr: string,
  timeStr: string | null,
  location: LocationInput | null,
): BirthData | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  let hour = 12;
  let minute = 0;
  if (timeStr) {
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
    if (timeMatch) {
      hour = Number(timeMatch[1]);
      minute = Number(timeMatch[2]);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        hour = 12;
        minute = 0;
      }
    }
  }

  return {
    year, month, day, hour, minute,
    latitude: location?.latitude,
    longitude: location?.longitude,
    timezone_offset: location?.timezone_offset,
  };
}

/** Simple email validation. */
function validEmail(email: string | null | undefined): email is string {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─────────────────────────────────────────────
// Report components
// ─────────────────────────────────────────────

/** Pick top 5 historical figures by cosine similarity on 8D inner vector. */
async function findHistoricalResonance(
  db: D1Database,
  inner8D: number[],
  limit = 5,
): Promise<FigureMatch[]> {
  try {
    const { results } = await db.prepare('SELECT id, name, era, culture, domains, vector, quote, bio FROM historical_figures').all<{
      id: number; name: string; era: string; culture: string;
      domains: string; vector: string; quote: string; bio: string;
    }>();
    if (!results || results.length === 0) return [];

    const matches: FigureMatch[] = [];
    for (const fig of results) {
      let figVec: number[];
      let domains: string[];
      try {
        figVec = typeof fig.vector === 'string' ? JSON.parse(fig.vector) : (fig.vector as unknown as number[]);
        domains = typeof fig.domains === 'string' ? JSON.parse(fig.domains) : (fig.domains as unknown as string[]);
      } catch {
        continue;
      }
      if (!Array.isArray(figVec) || figVec.length < 8) continue;

      const similarity = cosineResonance(inner8D, figVec.slice(0, 8));
      matches.push({
        id: fig.id,
        name: fig.name,
        era: fig.era ?? '',
        culture: fig.culture ?? '',
        domains: Array.isArray(domains) ? domains : [],
        quote: fig.quote ?? '',
        bio: fig.bio ?? '',
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, limit);
  } catch (err) {
    console.error('[ARCHETYPE-REPORT] figure match failed:', err);
    return [];
  }
}

/** Jungian threads keyed by dominant/secondary/weakest dimension indices. */
const JUNGIAN_THREADS: Record<number, { concept: string; description: string; relevance: string }> = {
  0: {
    concept: 'Individuation',
    description: 'The lifelong process of becoming the self you already are underneath your conditioning.',
    relevance: 'Your Identity dimension is strong — individuation shows up as the pull to stop performing and live from your actual center.',
  },
  1: {
    concept: 'The Senex',
    description: 'The old-king archetype: structure, tradition, the weight of form. Healthy Senex builds; wounded Senex rigidifies.',
    relevance: 'Your Structure dimension carries Senex energy — your task is to let it contain without imprisoning.',
  },
  2: {
    concept: 'The Puer and the Logos',
    description: 'The eternal youth meets the structuring word — mind as bridge between possibility and articulation.',
    relevance: 'Your Mind dimension lives here — the risk is spinning ideas without landing them, the gift is naming what others cannot.',
  },
  3: {
    concept: 'The Anima / Animus',
    description: 'The contrasexual figure in the psyche — the inner image of what you love and what you long to become.',
    relevance: 'Your Heart dimension is where this work happens — in relating, in beauty, in the risk of actually wanting.',
  },
  4: {
    concept: 'The Wise Old One',
    description: 'Jupiter as teacher — meaning, expansion, the transmission of experience into insight.',
    relevance: 'Your Growth dimension carries this — you are here to learn in public and make sense of what you find.',
  },
  5: {
    concept: 'The Shadow',
    description: 'The disowned energies that, when integrated, become your most grounded power.',
    relevance: 'Your Drive dimension either serves the shadow or is held hostage by it — this is where integration lives.',
  },
  6: {
    concept: 'Participation Mystique',
    description: 'The psychic weave where self and other blur — empathy\'s gift and its tax.',
    relevance: 'Your Connection dimension is attuned to this field — the work is staying porous without dissolving.',
  },
  7: {
    concept: 'Synchronicity',
    description: 'Meaningful coincidence — the sense that inner and outer are two sides of one event.',
    relevance: 'Your Awareness dimension notices what others miss — the task is trusting the signal without mystifying it.',
  },
};

function buildJungianThreads(dominantIndex: number, secondaryIndex: number, weakestIndex: number) {
  const picks = [dominantIndex, secondaryIndex, weakestIndex].filter((v, i, a) => a.indexOf(v) === i);
  return picks.map(i => JUNGIAN_THREADS[i]).filter(Boolean);
}

/** Three practice prompts keyed to the user's top dimensions. */
function buildPracticePrompts(dominantIndex: number, weakestIndex: number): string[] {
  const dominant = DIMENSION_METADATA[dominantIndex];
  const weakest = DIMENSION_METADATA[weakestIndex];
  return [
    `Where in your life this week does your ${dominant.name} energy feel alive without needing to perform?`,
    `What would change if you treated your ${weakest.name} dimension as a teacher rather than a weakness?`,
    `Notice one moment in the next 48 hours when your ${dominant.name} and ${weakest.name} are pulling in different directions. What wants to happen there?`,
  ];
}

/** Deterministic oracle sentence — Gemini if available, template fallback seeded by hash. */
async function buildOracleSentence(
  env: Env,
  primaryTitle: string,
  dominantName: string,
  weakestName: string,
  shadowName: string,
  seed: string,
): Promise<string> {
  const fallbackTemplates = [
    `${primaryTitle} learns to carry their ${dominantName} without losing sight of their ${weakestName}.`,
    `The gift of ${dominantName} meets its teacher in ${weakestName} — this is the only work that matters.`,
    `${primaryTitle} is the shape your ${dominantName} wants to take; ${shadowName} is what gets in the way.`,
    `You are here to love your ${dominantName} without abandoning your ${weakestName}.`,
  ];
  const seedIndex = parseInt(seed.slice(0, 4), 16) % fallbackTemplates.length;
  const templated = fallbackTemplates[seedIndex];

  if (!env.GEMINI_API_KEY) return templated;

  const prompt = `You are Sol — a warm, Jungian voice. Write ONE sentence (20-30 words) that names the lifelong tension for "${primaryTitle}" whose strongest dimension is ${dominantName} and weakest is ${weakestName}, with shadow tendency "${shadowName}". No "you should." No prescription. Just a single sentence that reads like it was written for this one person. Output only the sentence.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 80 },
        }),
      }
    );
    if (!res.ok) return templated;
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().replace(/^["']|["']$/g, '');
    return text.length > 0 ? text : templated;
  } catch {
    return templated;
  }
}

/** Short human-readable referral code derived from archetype + hash slice. */
function buildReferralCode(primaryArchetypeId: string, reportId: string): string {
  return `${primaryArchetypeId}-${reportId.slice(0, 6)}`;
}

/** Build the delivery email HTML. Kept inline — small template, rarely changes. */
function buildReportEmailHtml(
  archetypeTitle: string,
  oracleSentence: string,
  permalink: string,
  referralCode: string,
  appUrl: string,
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="dark">
  <title>Your archetype report is ready</title>
</head>
<body style="margin:0; padding:0; background:#0a0a10; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; color:#ededf0;">
  <div style="max-width:560px; margin:0 auto; padding:48px 24px;">

    <p style="color:#d4a017; letter-spacing:0.15em; text-transform:uppercase; font-size:12px; margin:0 0 12px;">✦ Your report is ready</p>

    <h1 style="font-size:28px; font-weight:300; color:#ededf0; margin:0 0 24px; line-height:1.2;">
      You are <span style="color:#d4a017;">${archetypeTitle}</span>.
    </h1>

    <p style="font-family:Georgia,serif; font-style:italic; font-size:18px; line-height:1.5; color:rgba(237,237,240,0.9); padding:20px; border-left:3px solid #d4a017; background:rgba(212,160,23,0.05); margin:0 0 32px;">
      ${oracleSentence}
    </p>

    <p style="font-size:15px; line-height:1.55; color:rgba(237,237,240,0.85); margin:0 0 24px;">
      Your full 20-section report is waiting at your permanent link. It's yours forever — no account, no login.
    </p>

    <div style="text-align:center; margin:32px 0;">
      <a href="${permalink}" style="display:inline-block; background:linear-gradient(135deg,#d4a017,#c08610); color:#0a0a10; text-decoration:none; font-weight:600; padding:14px 32px; border-radius:8px; font-size:15px;">
        Open your report
      </a>
    </div>

    <p style="font-size:14px; line-height:1.55; color:rgba(237,237,240,0.65); margin:32px 0 0; padding-top:24px; border-top:1px solid rgba(237,237,240,0.08);">
      <strong style="color:#d4a017;">Want a bonus compatibility chapter?</strong><br>
      Share your report with three friends. When they generate theirs using your code, we'll unlock a chapter showing how your pattern meets theirs.
    </p>

    <p style="font-size:13px; color:rgba(237,237,240,0.6); margin:12px 0 0;">
      Your code: <code style="background:rgba(212,160,23,0.12); color:#d4a017; padding:3px 6px; border-radius:4px;">${referralCode}</code>
    </p>

    <p style="font-size:13px; color:rgba(237,237,240,0.5); margin:48px 0 0; text-align:center;">
      Sol, via The Realm of Patterns · <a href="${appUrl}" style="color:rgba(212,160,23,0.7);">therealmofpatterns.com</a>
    </p>

  </div>
</body>
</html>`;
}

function buildReportEmailText(archetypeTitle: string, oracleSentence: string, permalink: string, referralCode: string): string {
  return `Your archetype report is ready.

You are ${archetypeTitle}.

"${oracleSentence}"

Open your full report:
${permalink}

Want a bonus compatibility chapter?
Share your report with three friends. When they generate theirs using your code, we'll unlock a chapter showing how your pattern meets theirs.

Your referral code: ${referralCode}

— Sol, via The Realm of Patterns`;
}

// ─────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON');
  }

  if (!body.birth_date) return errorResponse('MISSING_BIRTH_DATE', 'birth_date is required (YYYY-MM-DD)');

  const birthData = parseBirthData(body.birth_date, body.birth_time ?? null, body.birth_location ?? null);
  if (!birthData) return errorResponse('INVALID_BIRTH_DATE', 'birth_date must be a valid YYYY-MM-DD within 1900-2100');

  const language = body.language ?? 'en';
  const canonical = canonicalize(body.birth_date, body.birth_time ?? null, body.birth_location ?? null);
  const fullHash = await sha256Hex(canonical);
  const reportId = fullHash.slice(0, 16);
  const permalink = `${env.APP_URL}/report/${reportId}`;

  // ── Cache hit? return stored report, bump view count ──
  const cached = await env.DB.prepare(`
    SELECT report_data, referral_code, referral_count, bonus_unlocked
    FROM free_reports WHERE id = ? LIMIT 1
  `).bind(reportId).first<{
    report_data: string;
    referral_code: string;
    referral_count: number;
    bonus_unlocked: number;
  }>();

  if (cached) {
    await env.DB.prepare(`UPDATE free_reports SET view_count = view_count + 1, updated_at = datetime('now') WHERE id = ?`)
      .bind(reportId).run();
    const report = JSON.parse(cached.report_data) as ArchetypeReport;
    // Ensure latest referral stats are reflected in the returned object
    report.referral.count = cached.referral_count;
    report.referral.bonus_unlocked = cached.bonus_unlocked === 1;
    return new Response(JSON.stringify({
      success: true, report_id: reportId, permalink, cached: true, report,
    }), { status: 200, headers: CORS_HEADERS });
  }

  // ── Compute from physics ──
  let vector16d: number[];
  try {
    vector16d = compute16DFromBirthData(birthData);
  } catch (err) {
    return errorResponse('COMPUTE_FAILED', err instanceof Error ? err.message : String(err), 500);
  }
  const inner8D = vector16d.slice(0, 8);
  const shadow8D = vector16d.slice(8, 16);

  const archetypeResult = assignArchetype(inner8D);
  const dominantMeta = DIMENSION_METADATA[archetypeResult.dominantIndex];
  const weakestMeta = DIMENSION_METADATA[archetypeResult.weakestIndex];
  const dominant = getDominant(inner8D);
  const analyzed = analyzeDimensions(inner8D);

  // Match historical figures (top 5)
  const figures = await findHistoricalResonance(env.DB, inner8D, 5);

  // Jungian threads (3 max, based on top dimensions)
  const jungian = buildJungianThreads(
    archetypeResult.dominantIndex,
    archetypeResult.secondaryIndex,
    archetypeResult.weakestIndex,
  );

  // Practice prompts
  const practicePrompts = buildPracticePrompts(archetypeResult.dominantIndex, archetypeResult.weakestIndex);

  // Oracle sentence (deterministic fallback, Gemini-enhanced when key present)
  const oracle = await buildOracleSentence(
    env,
    archetypeResult.primary.title,
    dominantMeta.name,
    weakestMeta.name,
    archetypeResult.primary.shadowName,
    fullHash,
  );

  // Sol-voice journey content
  const journeyContent = getJourneyContent(archetypeResult);

  // Journey stage — v1 uses day-1 tier for everyone (intro). Future versions can match engagement.
  const journeyStage = 'Ordinary World';

  // Build dimensions_16d
  const dimensions16d: ArchetypeReport['dimensions_16d'] = [];
  for (let i = 0; i < 8; i++) {
    const meta = DIMENSION_METADATA[i];
    dimensions16d.push({
      octave: 'inner', index: i, name: meta.name, symbol: meta.symbol,
      domain: meta.domain, ruler: meta.ruler, value: Math.round(inner8D[i] * 1000) / 1000,
      rank: analyzed.findIndex(d => d.index === i) + 1,
    });
  }
  for (let i = 0; i < 8; i++) {
    const meta = DIMENSION_METADATA[i];
    dimensions16d.push({
      octave: 'shadow', index: i, name: meta.name, symbol: meta.symbol,
      domain: meta.domain, ruler: meta.ruler, value: Math.round(shadow8D[i] * 1000) / 1000,
      rank: 0,
    });
  }

  // Referral code
  const referralCode = buildReferralCode(archetypeResult.primary.id, reportId);

  // Resolve referrer (if code was passed and exists)
  let referrerReportId: string | null = null;
  if (body.referrer_code) {
    const referrer = await env.DB.prepare(`
      SELECT id, referral_count, bonus_unlocked FROM free_reports WHERE referral_code = ? LIMIT 1
    `).bind(body.referrer_code).first<{ id: string; referral_count: number; bonus_unlocked: number }>();
    if (referrer) {
      referrerReportId = referrer.id;
      const newCount = referrer.referral_count + 1;
      const unlock = newCount >= 3 ? 1 : referrer.bonus_unlocked;
      await env.DB.prepare(`
        UPDATE free_reports
        SET referral_count = ?, bonus_unlocked = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(newCount, unlock, referrer.id).run();
    }
  }

  // Build the final report object
  const report: ArchetypeReport = {
    report_id: reportId,
    generated_at: new Date().toISOString(),
    language,
    birth: {
      date: body.birth_date,
      time: body.birth_time ?? null,
      location: body.birth_location?.name ?? null,
    },
    identity: {
      primary_archetype: {
        id: archetypeResult.primary.id,
        title: archetypeResult.primary.title,
        planet: archetypeResult.primary.planet,
        gift: archetypeResult.primary.gift,
        quote: archetypeResult.primary.quote,
        quote_author: archetypeResult.primary.quoteAuthor,
      },
      shadow_archetype: {
        id: archetypeResult.shadow.id,
        title: archetypeResult.shadow.title,
        shadow_name: archetypeResult.primary.shadowName,
        shadow_description: archetypeResult.primary.shadow,
      },
      dominant_dimension: {
        name: dominantMeta.name,
        domain: dominantMeta.domain,
        ruler: dominantMeta.ruler,
        value: Math.round(dominant.value * 1000) / 1000,
      },
      weakest_dimension: {
        name: weakestMeta.name,
        domain: weakestMeta.domain,
        ruler: weakestMeta.ruler,
        value: Math.round(archetypeResult.weakestValue * 1000) / 1000,
      },
      journey_stage: journeyStage,
      profile_shape: archetypeResult.profileShape,
    },
    dimensions_16d: dimensions16d,
    jungian_threads: jungian,
    historical_resonance: figures,
    oracle_sentence: oracle,
    practice_prompts: practicePrompts,
    sol_voice: {
      intro: journeyContent.intro,
      strength: journeyContent.strength,
      shadow: journeyContent.shadowReveal ?? '',
    },
    referral: {
      code: referralCode,
      share_url: `${env.APP_URL}/free-report?ref=${referralCode}`,
      count: 0,
      bonus_unlocked: false,
      unlock_threshold: 3,
    },
  };

  // Persist
  const emailProvided = validEmail(body.email) ? body.email : null;
  const emailHash = emailProvided ? await sha256Hex(emailProvided.toLowerCase()) : null;

  await env.DB.prepare(`
    INSERT INTO free_reports (
      id, birth_canonical, birth_date, has_birth_time, has_birth_location,
      email, email_hash, language,
      primary_archetype, shadow_archetype, dominant_dimension, weakest_dimension,
      journey_stage, oracle_sentence, report_data,
      referral_code, referrer_report_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    reportId, canonical, body.birth_date,
    body.birth_time ? 1 : 0,
    body.birth_location?.latitude != null ? 1 : 0,
    emailProvided, emailHash, language,
    archetypeResult.primary.title, archetypeResult.primary.shadowName,
    dominantMeta.name, weakestMeta.name,
    journeyStage, oracle, JSON.stringify(report),
    referralCode, referrerReportId,
  ).run();

  // Subscriber capture (best-effort — existing v2 schema may differ, swallow errors)
  if (emailProvided && emailHash) {
    try {
      await env.DB.prepare(`
        INSERT INTO subscribers (email_hash, email, language_code, source, preview_data, subscribed_at, nurture_stage)
        VALUES (?, ?, ?, 'free_report', ?, datetime('now'), 0)
        ON CONFLICT(email_hash) DO UPDATE SET
          language_code = excluded.language_code,
          preview_data = excluded.preview_data
      `).bind(
        emailHash, emailProvided, language,
        JSON.stringify({ report_id: reportId, primary_archetype: archetypeResult.primary.title }),
      ).run();
    } catch (err) {
      console.warn('[ARCHETYPE-REPORT] subscriber upsert failed (non-fatal):', err);
    }
  }

  // Email delivery + Mirror engram (non-blocking, best-effort)
  if (emailProvided) {
    const emailPromise = sendEmail(env, {
      to: emailProvided,
      subject: `You are ${archetypeResult.primary.title} — your report is ready`,
      html: buildReportEmailHtml(
        archetypeResult.primary.title, oracle, permalink, referralCode, env.APP_URL,
      ),
      text: buildReportEmailText(
        archetypeResult.primary.title, oracle, permalink, referralCode,
      ),
      tags: [
        { name: 'source', value: 'free_report' },
        { name: 'archetype', value: archetypeResult.primary.id },
      ],
    }).catch(err => console.warn('[ARCHETYPE-REPORT] email send failed:', err));

    const mirrorPromise = remember(env, {
      text: `Free report generated: ${archetypeResult.primary.title} · dominant ${dominantMeta.name} · shadow ${archetypeResult.primary.shadowName}`,
      subject: `email:${emailHash ?? 'anon'}`,
      kind: 'reading',
      tags: ['free-report', archetypeResult.primary.id, dominantMeta.name.toLowerCase()],
      metadata: {
        report_id: reportId,
        archetype: archetypeResult.primary.title,
        dominant: dominantMeta.name,
        shadow: archetypeResult.primary.shadowName,
        language,
      },
    }).catch(err => console.warn('[ARCHETYPE-REPORT] mirror write failed:', err));

    // Fire-and-forget — don't block the response on email delivery
    if (typeof context.waitUntil === 'function') {
      context.waitUntil(Promise.all([emailPromise, mirrorPromise]));
    }
  }

  return new Response(JSON.stringify({
    success: true, report_id: reportId, permalink, cached: false, report,
  }), { status: 200, headers: CORS_HEADERS });
};
