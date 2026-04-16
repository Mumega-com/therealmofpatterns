/**
 * POST /api/telegram/push-daily
 *
 * Pushes today's reading to all active Telegram subscribers.
 * Called by cron (08:00 UTC) or manually by admin.
 *
 * Selection rules:
 *   - bot_state is NOT 'new' (completed onboarding)
 *   - subscription_status in ('free', 'premium', 'founder') (not banned/paused)
 *   - last_interaction_at is within the last 30 days (skip dormant)
 *
 * Rate limiting: Telegram allows 30 msgs/sec to different users.
 * We sleep 100ms between users for safety.
 *
 * Body:
 *   { admin_key: string, dry_run?: boolean, max?: number }
 *
 * Returns:
 *   { success, attempted, delivered, failed, skipped_dormant, errors[] }
 */

import type { Env } from '../../../src/types';

interface RequestBody {
  admin_key?: string;
  dry_run?: boolean;
  max?: number;
}

interface TelegramSubscriber {
  telegram_user_id: string;
  chat_id: string;
  first_name: string | null;
  bot_state: string;
  subscription_status: string;
  streak_current: number;
  last_interaction_at: string | null;
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

async function fetchDailyBrief(origin: string): Promise<string | null> {
  try {
    const res = await fetch(`${origin}/api/daily-brief`);
    if (!res.ok) return null;
    const brief = await res.json() as {
      dateFormatted: string;
      planet: string;
      dimension: { name: string };
      archetypes: { primary: { name: string; symbol: string; quality: string } };
      moonPhase: string;
      moonEmoji: string;
      narrative: string;
    };
    return [
      `🪞 *${brief.dateFormatted}*`,
      '',
      `*${brief.dimension.name}* · ruled by ${brief.planet}`,
      `${brief.moonEmoji} ${brief.moonPhase}`,
      '',
      brief.narrative,
      '',
      `Archetype today: *${brief.archetypes.primary.name}* ${brief.archetypes.primary.symbol}`,
      `_${brief.archetypes.primary.quality}_`,
      '',
      'Log today\'s mirror? /checkin',
    ].join('\n');
  } catch {
    return null;
  }
}

async function sendToUser(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description ?? 'unknown' };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
  if (!env.ADMIN_KEY) return errorResponse('CONFIGURATION_ERROR', 'ADMIN_KEY not configured', 500);
  if (adminKey !== env.ADMIN_KEY) return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
  if (!env.TELEGRAM_BOT_TOKEN) return errorResponse('CONFIGURATION_ERROR', 'TELEGRAM_BOT_TOKEN not configured', 500);

  const origin = new URL(request.url).origin;
  const reading = await fetchDailyBrief(origin);
  if (!reading) return errorResponse('BRIEF_FAILED', 'Could not fetch daily brief', 500);

  // Select eligible subscribers (onboarded + active in 30d)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const limit = body.max ?? 500;

  const { results } = await env.DB.prepare(`
    SELECT telegram_user_id, chat_id, first_name, bot_state, subscription_status,
           streak_current, last_interaction_at
    FROM telegram_users
    WHERE bot_state != 'new'
      AND subscription_status IN ('free', 'premium', 'founder')
      AND (last_interaction_at IS NULL OR last_interaction_at >= ?)
    ORDER BY last_interaction_at DESC NULLS LAST
    LIMIT ?
  `).bind(thirtyDaysAgo, limit).all<TelegramSubscriber>();

  const subs = results ?? [];
  let delivered = 0;
  let failed = 0;
  const errors: string[] = [];

  if (body.dry_run) {
    return new Response(JSON.stringify({
      success: true,
      dry_run: true,
      attempted: 0,
      delivered: 0,
      failed: 0,
      eligible_count: subs.length,
      reading_preview: reading.slice(0, 200),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  for (const sub of subs) {
    const res = await sendToUser(env.TELEGRAM_BOT_TOKEN, sub.chat_id, reading);
    if (res.ok) {
      delivered++;
      await env.DB.prepare(`
        UPDATE telegram_users
        SET last_interaction_at = datetime('now'), updated_at = datetime('now')
        WHERE telegram_user_id = ?
      `).bind(sub.telegram_user_id).run();
    } else {
      failed++;
      errors.push(`${sub.telegram_user_id}: ${res.error}`);
      // If user blocked the bot, mark as dormant
      if (res.error?.includes('bot was blocked') || res.error?.includes('user is deactivated')) {
        await env.DB.prepare(`
          UPDATE telegram_users SET bot_state = 'blocked', updated_at = datetime('now')
          WHERE telegram_user_id = ?
        `).bind(sub.telegram_user_id).run();
      }
    }
    await sleep(100); // stay well under 30 msg/sec to different users
  }

  return new Response(JSON.stringify({
    success: failed === 0,
    attempted: subs.length,
    delivered,
    failed,
    errors: errors.slice(0, 20),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
