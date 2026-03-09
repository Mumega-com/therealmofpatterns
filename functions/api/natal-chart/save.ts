/**
 * POST /api/natal-chart/save
 *
 * Saves (or updates) the authenticated user's natal chart.
 *
 * Body: { date, time?, location?, lat?, lon?, tz? }
 */

import { getSession } from '../../../src/lib/auth';
import { computeNatalChart } from '../../../src/lib/natal';
import type { BirthData } from '../../../src/types';

interface Env { DB: D1Database; KV: KVNamespace; RESEND_API_KEY?: string; }

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const e = env as unknown as Env;
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  // Auth check
  const session = await getSession(request, e as any);
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401, headers: cors });
  }

  let body: Record<string, string | number>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400, headers: cors });
  }

  const { date, time, location, lat, lon, tz } = body as Record<string, string>;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return Response.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400, headers: cors });
  }

  const [year, month, day] = String(date).split('-').map(Number);
  let hour: number | undefined, minute: number | undefined;

  if (time && /^\d{1,2}:\d{2}$/.test(String(time))) {
    [hour, minute] = String(time).split(':').map(Number);
  }

  const tzOffset = tz ? parseFloat(String(tz)) : 0;
  const latitude  = lat ? parseFloat(String(lat)) : undefined;
  const longitude = lon ? parseFloat(String(lon)) : undefined;

  const birthData: BirthData = {
    year, month, day,
    hour, minute,
    latitude, longitude,
    timezone_offset: tzOffset,
  };

  const chart = computeNatalChart(birthData, location ? String(location) : undefined);

  // Upsert into D1
  await e.DB.prepare(`
    INSERT INTO natal_charts
      (email_hash, birth_date, birth_time, birth_location, birth_lat, birth_lon, birth_tz, chart_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(email_hash) DO UPDATE SET
      birth_date     = excluded.birth_date,
      birth_time     = excluded.birth_time,
      birth_location = excluded.birth_location,
      birth_lat      = excluded.birth_lat,
      birth_lon      = excluded.birth_lon,
      birth_tz       = excluded.birth_tz,
      chart_json     = excluded.chart_json,
      updated_at     = datetime('now')
  `).bind(
    session.email_hash,
    date,
    time ?? null,
    location ?? null,
    latitude ?? null,
    longitude ?? null,
    tzOffset,
    JSON.stringify(chart),
  ).run();

  return Response.json({ ok: true, chart }, { headers: cors });
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
