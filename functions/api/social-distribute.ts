/**
 * POST /api/social-distribute
 *
 * Distributes stored daily social content to configured platforms.
 * Reads from social_posts D1 table (populated by content-loop).
 *
 * Body:
 *   {
 *     admin_key: string,
 *     date?: string,                     // YYYY-MM-DD, default today
 *     language?: string,                 // default 'en'
 *     platforms?: ('telegram'|'discord'|'twitter')[],  // default all configured
 *     queue_for_approval?: boolean,      // if true, send preview to Telegram admin, don't publish yet
 *     image_url?: string,                // optional R2 URL to attach
 *   }
 *
 * Returns:
 *   {
 *     success: boolean,
 *     date: string,
 *     language: string,
 *     published: { telegram?: string; discord?: string; twitter?: string },
 *     errors: string[],
 *   }
 */

import type { Env } from '../../src/types';

type Platform = 'telegram' | 'discord' | 'twitter';

interface RequestBody {
  admin_key?: string;
  date?: string;
  language?: string;
  platforms?: Platform[];
  queue_for_approval?: boolean;
  image_url?: string;
}

interface StoredSocialPost {
  id: string;
  date: string;
  language: string;
  dimension: string;
  planet: string;
  moon_phase: string;
  caption_ig: string;
  caption_x: string;
  hashtags: string;            // JSON array
  cta: string;
  image_url: string | null;
  published_platforms: string | null;  // JSON: { platform: ISO ts }
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

// ────────────────────────────────
// Platform adapters
// ────────────────────────────────

async function postTelegram(
  botToken: string,
  channelId: string,
  text: string,
  imageUrl?: string,
): Promise<{ ok: boolean; messageId?: number; error?: string }> {
  try {
    const endpoint = imageUrl
      ? `https://api.telegram.org/bot${botToken}/sendPhoto`
      : `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = imageUrl
      ? { chat_id: channelId, photo: imageUrl, caption: text, parse_mode: 'Markdown' }
      : { chat_id: channelId, text, parse_mode: 'Markdown', disable_web_page_preview: false };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json() as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? 'unknown' };
    return { ok: true, messageId: data.result?.message_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function postDiscord(
  webhookUrl: string,
  text: string,
  imageUrl?: string,
  title = 'The Realm of Patterns',
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      embeds: [{
        title,
        description: text,
        color: 0x6b5b95,  // cosmic purple
        ...(imageUrl ? { image: { url: imageUrl } } : {}),
        footer: { text: 'therealmofpatterns.com' },
        timestamp: new Date().toISOString(),
      }],
    };
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Twitter/X posting requires OAuth 1.0a or OAuth 2.0 user context.
// Bearer token is read-only. Posting requires a write-scoped token we don't have yet.
// Stub for now — returns "unsupported" until a proper write token is provisioned.
async function postTwitter(
  _bearerToken: string,
  _text: string,
): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: 'twitter_posting_not_configured (bearer is read-only; needs OAuth 2 user token)' };
}

// ────────────────────────────────
// Handler
// ────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON');
  }

  const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
  if (!env.ADMIN_KEY) return errorResponse('CONFIGURATION_ERROR', 'ADMIN_KEY not configured', 500);
  if (adminKey !== env.ADMIN_KEY) return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);

  const targetDate = body.date || new Date().toISOString().split('T')[0];
  const language = body.language || 'en';

  // Fetch stored post
  const post = await env.DB.prepare(`
    SELECT id, date, language, dimension, planet, moon_phase,
           caption_ig, caption_x, hashtags, cta, image_url, published_platforms
    FROM social_posts
    WHERE date = ? AND language = ?
    LIMIT 1
  `).bind(targetDate, language).first<StoredSocialPost>();

  if (!post) {
    return errorResponse('NOT_FOUND', `No social post for ${targetDate}/${language}. Run /api/content-loop first.`, 404);
  }

  // Determine platforms — default to all configured
  const requested = body.platforms && body.platforms.length > 0
    ? body.platforms
    : (['telegram', 'discord', 'twitter'] as Platform[]);

  const imageUrl = body.image_url || post.image_url || undefined;
  const hashtags = JSON.parse(post.hashtags) as string[];
  const existingPublished: Record<string, string> = post.published_platforms
    ? JSON.parse(post.published_platforms)
    : {};

  const published: Record<string, string> = { ...existingPublished };
  const errors: string[] = [];

  // Build platform-specific copy
  const telegramText = [
    post.caption_ig,
    hashtags.slice(0, 6).join(' '),
  ].filter(Boolean).join('\n\n');

  const discordText = [
    post.caption_ig,
    '',
    `*${post.dimension} · ${post.planet} · ${post.moon_phase}*`,
    hashtags.slice(0, 5).join(' '),
  ].join('\n');

  const twitterText = post.caption_x;

  // Approval mode: send preview only to Telegram, don't mark published
  if (body.queue_for_approval) {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) {
      return errorResponse('NO_TELEGRAM', 'queue_for_approval requires Telegram bot + channel configured');
    }
    const preview = `📋 *PREVIEW — ${targetDate}/${language}*\n\n${telegramText}\n\n_Reply to approve or reject._`;
    const tg = await postTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHANNEL_ID, preview, imageUrl);
    if (!tg.ok) errors.push(`telegram_preview: ${tg.error}`);
    return new Response(JSON.stringify({
      success: tg.ok, date: targetDate, language, queued: tg.ok, errors,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Publish loop
  for (const platform of requested) {
    // Skip if already published today to this platform
    if (published[platform]) {
      continue;
    }

    if (platform === 'telegram') {
      if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHANNEL_ID) {
        errors.push('telegram: not_configured');
        continue;
      }
      const res = await postTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHANNEL_ID, telegramText, imageUrl);
      if (res.ok) {
        published.telegram = new Date().toISOString();
      } else {
        errors.push(`telegram: ${res.error}`);
      }
    } else if (platform === 'discord') {
      if (!env.DISCORD_WEBHOOK_URL) {
        errors.push('discord: not_configured');
        continue;
      }
      const res = await postDiscord(env.DISCORD_WEBHOOK_URL, discordText, imageUrl,
        `${post.dimension} · ${post.moon_phase} · ${targetDate}`);
      if (res.ok) {
        published.discord = new Date().toISOString();
      } else {
        errors.push(`discord: ${res.error}`);
      }
    } else if (platform === 'twitter') {
      if (!env.TWITTER_BEARER_TOKEN) {
        errors.push('twitter: not_configured');
        continue;
      }
      const res = await postTwitter(env.TWITTER_BEARER_TOKEN, twitterText);
      if (res.ok) {
        published.twitter = new Date().toISOString();
      } else {
        errors.push(`twitter: ${res.error}`);
      }
    }
  }

  // Persist published_platforms
  await env.DB.prepare(`
    UPDATE social_posts
    SET published_platforms = ?, updated_at = ?
    WHERE id = ?
  `).bind(JSON.stringify(published), new Date().toISOString(), post.id).run();

  return new Response(JSON.stringify({
    success: errors.length === 0,
    date: targetDate,
    language,
    published,
    errors,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  // Status: show distribution state for a date
  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const language = url.searchParams.get('language') || 'en';

  const post = await env.DB.prepare(`
    SELECT date, language, dimension, published_platforms, created_at, updated_at
    FROM social_posts WHERE date = ? AND language = ? LIMIT 1
  `).bind(date, language).first();

  if (!post) {
    return errorResponse('NOT_FOUND', `No post for ${date}/${language}`, 404);
  }
  return new Response(JSON.stringify({ success: true, post }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
};
