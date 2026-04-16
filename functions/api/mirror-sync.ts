/**
 * POST /api/mirror-sync
 *
 * Backfills Mirror with historical user interactions from D1.
 * Use once to seed Mirror after connecting credentials, then ongoing
 * engrams flow in real-time from call sites (telegram/webhook, narrator, etc).
 *
 * Body:
 *   {
 *     admin_key: string,
 *     source?: 'telegram_checkins'|'telegram_users'|'narrator_reflections'|'analytics'|'all',  // default 'all'
 *     since?: string,     // ISO date, default 30 days ago
 *     max?: number,       // per-source limit, default 500
 *     dry_run?: boolean,
 *   }
 *
 * Returns:
 *   { success, synced: { [source]: count }, skipped, errors[] }
 */

import type { Env } from '../../src/types';
import { remember } from '../../src/lib/mirror-client';

type SourceName = 'telegram_checkins' | 'telegram_users' | 'narrator_reflections' | 'analytics' | 'all';

interface RequestBody {
  admin_key?: string;
  source?: SourceName;
  since?: string;
  max?: number;
  dry_run?: boolean;
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

async function syncCheckins(env: Env, since: string, max: number, dryRun: boolean): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  const { results } = await env.DB.prepare(`
    SELECT id, telegram_user_id, checkin_date, state_label, area_label, note_text, dominant_dimension, kappa
    FROM telegram_checkins
    WHERE created_at >= ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(since, max).all<{
    id: string;
    telegram_user_id: string;
    checkin_date: string;
    state_label: string | null;
    area_label: string | null;
    note_text: string | null;
    dominant_dimension: string | null;
    kappa: number | null;
  }>();

  if (dryRun) return { synced: (results ?? []).length, errors: [] };

  let synced = 0;
  for (const row of results ?? []) {
    const text = [
      `Check-in ${row.checkin_date}`,
      row.state_label ? `state: ${row.state_label}` : null,
      row.area_label ? `area: ${row.area_label}` : null,
      row.note_text ? `note: ${row.note_text}` : null,
      row.dominant_dimension ? `dim: ${row.dominant_dimension}` : null,
      row.kappa != null ? `kappa: ${row.kappa.toFixed(2)}` : null,
    ].filter(Boolean).join(' | ');

    const res = await remember(env, {
      text,
      subject: `telegram:${row.telegram_user_id}`,
      kind: 'checkin',
      tags: ['telegram', 'checkin', 'backfill',
        row.state_label, row.area_label, row.dominant_dimension,
      ].filter(Boolean) as string[],
      metadata: {
        date: row.checkin_date,
        state: row.state_label,
        area: row.area_label,
        dominant_dimension: row.dominant_dimension,
        kappa: row.kappa,
        source_id: row.id,
      },
    });
    if (res.ok) synced++;
    else errors.push(`checkin:${row.id}: ${res.error}`);
  }
  return { synced, errors };
}

async function syncUsers(env: Env, since: string, max: number, dryRun: boolean): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  // Only sync users that completed onboarding
  const { results } = await env.DB.prepare(`
    SELECT telegram_user_id, birth_date, birth_time, birth_location_name, subscription_status,
           checkin_count, streak_current, streak_longest, created_at
    FROM telegram_users
    WHERE birth_date IS NOT NULL AND updated_at >= ?
    ORDER BY updated_at DESC
    LIMIT ?
  `).bind(since, max).all<{
    telegram_user_id: string;
    birth_date: string;
    birth_time: string | null;
    birth_location_name: string | null;
    subscription_status: string;
    checkin_count: number;
    streak_current: number;
    streak_longest: number;
    created_at: string;
  }>();

  if (dryRun) return { synced: (results ?? []).length, errors: [] };

  let synced = 0;
  for (const row of results ?? []) {
    const text = [
      `User profile: birth ${row.birth_date}`,
      row.birth_time ? row.birth_time : '(time unknown)',
      row.birth_location_name ?? '(no location)',
      `tier: ${row.subscription_status}`,
      `check-ins: ${row.checkin_count}`,
      `streak: ${row.streak_current} (max ${row.streak_longest})`,
    ].join(' | ');

    const res = await remember(env, {
      text,
      subject: `telegram:${row.telegram_user_id}`,
      kind: 'event',
      tags: ['telegram', 'profile', row.subscription_status],
      metadata: {
        birth_date: row.birth_date,
        birth_time: row.birth_time,
        birth_location_name: row.birth_location_name,
        subscription_status: row.subscription_status,
        checkin_count: row.checkin_count,
        streak_current: row.streak_current,
        streak_longest: row.streak_longest,
      },
      occurred_at: row.created_at,
    });
    if (res.ok) synced++;
    else errors.push(`user:${row.telegram_user_id}: ${res.error}`);
  }
  return { synced, errors };
}

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

  // Early exit if Mirror not configured
  if (!env.MIRROR_API_URL || !env.MIRROR_API_TOKEN) {
    return errorResponse('MIRROR_NOT_CONFIGURED',
      'Set MIRROR_API_URL and MIRROR_API_TOKEN secrets to enable sync', 503);
  }

  const source = body.source ?? 'all';
  const since = body.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const max = body.max ?? 500;
  const dryRun = body.dry_run ?? false;

  const synced: Record<string, number> = {};
  const allErrors: string[] = [];

  if (source === 'telegram_checkins' || source === 'all') {
    const r = await syncCheckins(env, since, max, dryRun);
    synced.telegram_checkins = r.synced;
    allErrors.push(...r.errors);
  }

  if (source === 'telegram_users' || source === 'all') {
    const r = await syncUsers(env, since, max, dryRun);
    synced.telegram_users = r.synced;
    allErrors.push(...r.errors);
  }

  return new Response(JSON.stringify({
    success: allErrors.length === 0,
    dry_run: dryRun,
    synced,
    since,
    errors: allErrors.slice(0, 20),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
