/**
 * POST /api/content-loop
 *
 * Daily cosmic content loop orchestrator. Wires the full TROP content pipeline:
 *   date → cosmic events → blog content (via daily-update) → social content → D1 persistence
 *
 * Given any date, the output is deterministic (computed from planetary positions).
 * Runs on cron (via cron-worker) or manually by admin.
 *
 * Body:
 *   {
 *     admin_key: string,
 *     date?: string,              // YYYY-MM-DD, defaults to today UTC
 *     languages?: string[],       // social content langs (default ['en'])
 *     skip_blog?: boolean,        // skip daily-update blog content
 *     skip_social?: boolean,      // skip social content generation
 *     skip_events?: boolean,      // skip cosmic event detection
 *   }
 *
 * Returns:
 *   {
 *     success: boolean,
 *     date: string,
 *     cosmic_events: CosmicEvent[],
 *     social_posts: { language: string; stored: boolean; caption_x_preview: string }[],
 *     blog_generated: number,
 *     languages_completed: string[],
 *     errors: string[],
 *   }
 */

import type { Env } from '../../src/types';
import { getCosmicEvents } from '../../src/lib/cosmic-events';

const SOCIAL_LANGS = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'] as const;
type SocialLang = typeof SOCIAL_LANGS[number];

interface RequestBody {
  admin_key?: string;
  date?: string;
  languages?: SocialLang[];
  skip_blog?: boolean;
  skip_social?: boolean;
  skip_events?: boolean;
}

interface SocialContentResponse {
  date: string;
  dateFormatted: string;
  dimension: string;
  planet: string;
  moonPhase: string;
  moonEmoji: string;
  isYangDay: boolean;
  caption_ig: string;
  caption_x: string;
  image_prompt: string;
  hashtags: string[];
  cta: string;
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

async function fetchSocialContent(
  origin: string,
  date: string,
): Promise<SocialContentResponse | null> {
  try {
    const res = await fetch(`${origin}/api/social-content?date=${date}`);
    if (!res.ok) return null;
    return await res.json() as SocialContentResponse;
  } catch {
    return null;
  }
}

async function triggerDailyUpdate(
  origin: string,
  adminKey: string,
  date: string,
  languages: readonly string[],
): Promise<{ content_generated: number; languages_completed: string[]; errors: number }> {
  try {
    const res = await fetch(`${origin}/api/daily-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({
        admin_key: adminKey,
        date,
        languages,
        skip_users: true, // content-loop only handles content; user snapshots are separate
      }),
    });
    if (!res.ok) return { content_generated: 0, languages_completed: [], errors: 1 };
    const data = await res.json() as { content_generated: number; languages_completed: string[]; errors: number };
    return {
      content_generated: data.content_generated ?? 0,
      languages_completed: data.languages_completed ?? [],
      errors: data.errors ?? 0,
    };
  } catch {
    return { content_generated: 0, languages_completed: [], errors: 1 };
  }
}

async function storeSocialPost(
  db: D1Database,
  date: string,
  language: string,
  content: SocialContentResponse,
  cosmicEvents: unknown[],
): Promise<boolean> {
  try {
    const id = `${date}-${language}`;
    await db.prepare(`
      INSERT INTO social_posts (
        id, date, language, dimension, planet, moon_phase, is_yang_day,
        cosmic_events, caption_ig, caption_x, image_prompt, hashtags, cta,
        source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        dimension = excluded.dimension,
        planet = excluded.planet,
        moon_phase = excluded.moon_phase,
        is_yang_day = excluded.is_yang_day,
        cosmic_events = excluded.cosmic_events,
        caption_ig = excluded.caption_ig,
        caption_x = excluded.caption_x,
        image_prompt = excluded.image_prompt,
        hashtags = excluded.hashtags,
        cta = excluded.cta,
        updated_at = excluded.updated_at
    `).bind(
      id, date, language, content.dimension, content.planet, content.moonPhase,
      content.isYangDay ? 1 : 0,
      JSON.stringify(cosmicEvents),
      content.caption_ig, content.caption_x, content.image_prompt,
      JSON.stringify(content.hashtags), content.cta,
      'content-loop',
      new Date().toISOString(), new Date().toISOString(),
    ).run();
    return true;
  } catch (err) {
    console.error(`[CONTENT-LOOP] Failed to store social post for ${date}/${language}:`, err);
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON');
  }

  const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
  if (!env.ADMIN_KEY) {
    return errorResponse('CONFIGURATION_ERROR', 'ADMIN_KEY not configured', 500);
  }
  if (adminKey !== env.ADMIN_KEY) {
    return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
  }

  const targetDate = body.date || new Date().toISOString().split('T')[0];
  const socialLanguages = (body.languages && body.languages.length > 0)
    ? body.languages
    : ['en'] as SocialLang[];

  const errors: string[] = [];

  // ─────────────────────────────────────
  // Step 1: Detect cosmic events
  // ─────────────────────────────────────
  let cosmicEvents: ReturnType<typeof getCosmicEvents> = [];
  if (!body.skip_events) {
    try {
      cosmicEvents = getCosmicEvents(new Date(targetDate + 'T12:00:00Z'));
      console.log(`[CONTENT-LOOP] ${targetDate}: ${cosmicEvents.length} cosmic events detected`);
    } catch (err) {
      errors.push(`cosmic_events_failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─────────────────────────────────────
  // Step 2: Blog content via daily-update
  // ─────────────────────────────────────
  let blogGenerated = 0;
  let languagesCompleted: string[] = [];
  if (!body.skip_blog) {
    const allLangs = (body.languages && body.languages.length > 0)
      ? body.languages
      : SOCIAL_LANGS;
    const result = await triggerDailyUpdate(origin, adminKey!, targetDate, allLangs);
    blogGenerated = result.content_generated;
    languagesCompleted = result.languages_completed;
    if (result.errors > 0) errors.push(`blog_errors: ${result.errors}`);
  }

  // ─────────────────────────────────────
  // Step 3: Social content per language → D1
  // ─────────────────────────────────────
  const socialResults: { language: string; stored: boolean; caption_x_preview: string }[] = [];
  if (!body.skip_social) {
    for (const lang of socialLanguages) {
      const content = await fetchSocialContent(origin, targetDate);
      if (!content) {
        errors.push(`social_content_fetch_failed: ${lang}`);
        socialResults.push({ language: lang, stored: false, caption_x_preview: '' });
        continue;
      }
      const stored = await storeSocialPost(env.DB, targetDate, lang, content, cosmicEvents);
      socialResults.push({
        language: lang,
        stored,
        caption_x_preview: content.caption_x.slice(0, 140),
      });
      if (!stored) errors.push(`social_store_failed: ${lang}`);
    }
  }

  return new Response(
    JSON.stringify({
      success: errors.length === 0,
      date: targetDate,
      cosmic_events: cosmicEvents,
      social_posts: socialResults,
      blog_generated: blogGenerated,
      languages_completed: languagesCompleted,
      errors,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  // Read-only: fetch stored social posts for a date
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const language = url.searchParams.get('language') || 'en';

  try {
    const row = await env.DB.prepare(`
      SELECT * FROM social_posts WHERE date = ? AND language = ? LIMIT 1
    `).bind(date, language).first();

    if (!row) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'No stored post for date/language' } }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true, post: row }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return errorResponse('DB_ERROR', err instanceof Error ? err.message : String(err), 500);
  }
};
