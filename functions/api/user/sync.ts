/**
 * POST /api/user/sync
 *
 * Sync check-ins and astrology data to server.
 * PII remains encrypted, astrology data stored separately.
 *
 * Body:
 *   - deviceId: string
 *   - checkins: CheckinData[]
 *   - profile: { dominantDimension, stage, kappa, ... }
 */

import type { Env } from '../../../src/types';

interface CheckinSync {
  id: string;
  date: string;
  vector: number[];
  stage: string;
  kappa: number;
  moodScore?: number;
  dominantToday?: number;
}

interface ProfileSync {
  dominantDimension?: number;
  secondaryDimension?: number;
  currentStage?: string;
  kappaAverage?: number;
  streakCurrent?: number;
  streakLongest?: number;
}

interface SyncRequest {
  deviceId: string;
  checkins: CheckinSync[];
  profile?: ProfileSync;
}

interface SyncResponse {
  success: boolean;
  synced: {
    checkins: number;
    profile: boolean;
  };
  lastSyncAt: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: SyncRequest = await request.json();

    if (!body.deviceId) {
      return errorResponse('INVALID_REQUEST', 'Device ID required', 400);
    }

    // Generate user hash
    const pepper = env.HASH_PEPPER || 'default-pepper-change-in-production';
    const userHash = await generateHash(body.deviceId + pepper);

    // Verify user exists
    const user = await env.DB.prepare(
      'SELECT user_hash FROM user_vault WHERE user_hash = ?'
    ).bind(userHash).first();

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found. Call /api/user/init first.', 404);
    }

    const now = new Date().toISOString();
    let checkinsSynced = 0;

    // Sync check-ins (upsert)
    for (const checkin of body.checkins) {
      try {
        await env.DB.prepare(`
          INSERT INTO checkins (id, user_hash, checkin_date, vector, stage, kappa, mood_score, dominant_today, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            vector = excluded.vector,
            stage = excluded.stage,
            kappa = excluded.kappa,
            mood_score = excluded.mood_score,
            dominant_today = excluded.dominant_today
        `).bind(
          checkin.id,
          userHash,
          checkin.date,
          JSON.stringify(checkin.vector),
          checkin.stage,
          checkin.kappa,
          checkin.moodScore || null,
          checkin.dominantToday || null,
          now
        ).run();
        checkinsSynced++;
      } catch (err) {
        console.error('[SYNC] Checkin error:', err);
      }
    }

    // Update astrology profile
    let profileSynced = false;
    if (body.profile) {
      const p = body.profile;
      await env.DB.prepare(`
        UPDATE astrology_profiles SET
          dominant_dimension = COALESCE(?, dominant_dimension),
          secondary_dimension = COALESCE(?, secondary_dimension),
          current_stage = COALESCE(?, current_stage),
          kappa_average = COALESCE(?, kappa_average),
          streak_current = COALESCE(?, streak_current),
          streak_longest = COALESCE(?, streak_longest),
          checkin_count = (SELECT COUNT(*) FROM checkins WHERE user_hash = ?),
          last_checkin_date = (SELECT MAX(checkin_date) FROM checkins WHERE user_hash = ?),
          updated_at = ?
        WHERE user_hash = ?
      `).bind(
        p.dominantDimension ?? null,
        p.secondaryDimension ?? null,
        p.currentStage ?? null,
        p.kappaAverage ?? null,
        p.streakCurrent ?? null,
        p.streakLongest ?? null,
        userHash,
        userHash,
        now,
        userHash
      ).run();
      profileSynced = true;
    }

    // Update last active
    await env.DB.prepare(
      'UPDATE user_vault SET last_active_at = ? WHERE user_hash = ?'
    ).bind(now, userHash).run();

    const response: SyncResponse = {
      success: true,
      synced: {
        checkins: checkinsSynced,
        profile: profileSynced,
      },
      lastSyncAt: now,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USER] Sync error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to sync data', 500);
  }
};

async function generateHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
