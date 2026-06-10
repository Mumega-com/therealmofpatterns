/**
 * POST /api/openclaw-webhook
 * Bridge endpoint for the OpenClaw messaging gateway (Telegram, WhatsApp,
 * Discord, ... via the sol-reading skill). See docs/OPENCLAW-INTEGRATION.md
 * and docs/GTM-ROADMAP.md §2.3.
 *
 * Auth:    Authorization: Bearer <OPENCLAW_WEBHOOK_SECRET>
 *          Returns 503 when the secret is not configured (integration off).
 * Input:   { channel, userId, message?, birthData? }
 * Output:  natal  → { success, type: 'natal', reading, vector8d, dominant, archetype }
 *          daily  → { success, type: 'daily', reading, date, dominant }
 */

import type { Env, BirthData } from '../../src/types';
import { computeFromBirthData, getDominant, getDimensionTeaser } from '../../src/lib/16d-engine';
import { findBestMatch } from '../../src/lib/archetype-match';

const RATE_LIMIT_PER_HOUR = 30;

export interface OpenClawPayload {
  channel: string;
  userId: string;
  message?: string;
  birthData?: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
  };
}

export function validatePayload(body: unknown): { ok: true; payload: OpenClawPayload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Body must be a JSON object.' };
  const b = body as Record<string, unknown>;

  if (typeof b.channel !== 'string' || !b.channel.trim()) return { ok: false, error: 'channel is required.' };
  if (typeof b.userId !== 'string' || !b.userId.trim()) return { ok: false, error: 'userId is required.' };

  if (b.birthData !== undefined) {
    const bd = b.birthData as Record<string, unknown>;
    if (!bd || typeof bd !== 'object') return { ok: false, error: 'birthData must be an object.' };
    const { year, month, day } = bd;
    if (typeof year !== 'number' || year < 1900 || year > 2100) return { ok: false, error: 'birthData.year must be 1900-2100.' };
    if (typeof month !== 'number' || month < 1 || month > 12) return { ok: false, error: 'birthData.month must be 1-12.' };
    if (typeof day !== 'number' || day < 1 || day > 31) return { ok: false, error: 'birthData.day must be 1-31.' };
  }

  if (b.birthData === undefined && typeof b.message !== 'string') {
    return { ok: false, error: 'Provide birthData for a natal reading or message for a daily reading.' };
  }

  return {
    ok: true,
    payload: {
      channel: (b.channel as string).trim(),
      userId: (b.userId as string).trim(),
      message: typeof b.message === 'string' ? b.message : undefined,
      birthData: b.birthData as OpenClawPayload['birthData'],
    },
  };
}

/** Deterministic natal reading text — no AI dependency, safe for any channel. */
export function composeNatalReading(input: {
  dominantName: string;
  dominantSymbol: string;
  teaser: string;
  archetypeName: string;
  archetypeQuote: string;
  resonance: number;
}): string {
  const pct = Math.round(input.resonance * 100);
  return [
    `${input.dominantSymbol} Your strongest dimension is ${input.dominantName}.`,
    input.teaser,
    `Your pattern resonates most with ${input.archetypeName} (${pct}% match): "${input.archetypeQuote}"`,
    `Reply /sol any day for your daily reading.`,
  ].join('\n\n');
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Integration is off until the shared secret is configured
  const secret = env.OPENCLAW_WEBHOOK_SECRET;
  if (!secret) {
    return json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'OpenClaw integration is not enabled.' } }, 503);
  }

  const auth = request.headers.get('Authorization') || '';
  if (auth !== `Bearer ${secret}`) {
    return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing bearer token.' } }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: { code: 'INVALID_JSON', message: 'Body must be valid JSON.' } }, 400);
  }

  const validated = validatePayload(body);
  if (!validated.ok) {
    return json({ success: false, error: { code: 'INVALID_INPUT', message: validated.error } }, 400);
  }
  const { channel, userId, birthData } = validated.payload;

  // Rate limit per channel user
  const rateKey = `rate:openclaw:${channel}:${userId}`;
  const count = parseInt((await env.CACHE.get(rateKey)) || '0');
  if (count >= RATE_LIMIT_PER_HOUR) {
    return json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again in an hour.', retry_after: 3600 } }, 429);
  }
  await env.CACHE.put(rateKey, String(count + 1), { expirationTtl: 3600 });

  try {
    if (birthData) {
      return await handleNatal(env, birthData);
    }
    return await handleDaily(env, request);
  } catch (error) {
    console.error('[openclaw-webhook] error:', error);
    return json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to compute reading.' } }, 500);
  }
};

async function handleNatal(env: Env, bd: NonNullable<OpenClawPayload['birthData']>): Promise<Response> {
  // Readings are deterministic per birth date — cache by date for a day
  const cacheKey = `openclaw:natal:${bd.year}-${bd.month}-${bd.day}:${bd.hour ?? 'x'}:${bd.minute ?? 'x'}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  const birth: BirthData = { year: bd.year, month: bd.month, day: bd.day, hour: bd.hour, minute: bd.minute };
  const vector = computeFromBirthData(birth);
  const dominant = getDominant(vector);
  const archetype = await findBestMatch(env.DB, Array.from(vector));
  const teaser = getDimensionTeaser(dominant);

  const payload = JSON.stringify({
    success: true,
    type: 'natal',
    reading: composeNatalReading({
      dominantName: dominant.name,
      dominantSymbol: dominant.symbol,
      teaser,
      archetypeName: archetype.name,
      archetypeQuote: archetype.quote,
      resonance: archetype.resonance,
    }),
    vector8d: Array.from(vector).map((v) => Math.round(v * 100) / 100),
    dominant: { index: dominant.index, name: dominant.name, symbol: dominant.symbol },
    archetype: { name: archetype.name, era: archetype.era, quote: archetype.quote, resonance: archetype.resonance },
  });

  await env.CACHE.put(cacheKey, payload, { expirationTtl: 86400 });
  return new Response(payload, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

async function handleDaily(env: Env, request: Request): Promise<Response> {
  const today = new Date().toISOString().split('T')[0];
  const cacheKey = `openclaw:daily:${today}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached) {
    return new Response(cached, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  // Reuse the public daily-brief endpoint on the same deployment
  const briefRes = await fetch(new URL('/api/daily-brief', request.url));
  if (!briefRes.ok) throw new Error(`daily-brief returned ${briefRes.status}`);
  const brief = (await briefRes.json()) as {
    narrative?: string;
    dimension?: { name?: string; symbol?: string };
    moonPhase?: string;
    moonEmoji?: string;
  };

  const reading = [
    `${brief.moonEmoji ?? ''} Today's field — ${today}`.trim(),
    brief.narrative ?? 'The field is quiet today.',
  ].join('\n\n');

  const payload = JSON.stringify({
    success: true,
    type: 'daily',
    date: today,
    reading,
    dominant: brief.dimension ?? null,
  });

  await env.CACHE.put(cacheKey, payload, { expirationTtl: 3600 });
  return new Response(payload, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
