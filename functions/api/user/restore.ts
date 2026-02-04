/**
 * POST /api/user/restore
 *
 * Restore user data on a new device using sync code.
 * Returns encrypted vault + decrypted astrology data.
 *
 * Body:
 *   - syncCode: string (e.g., "COSMIC-XXXX-XXXX")
 *   - newDeviceId: string (new device's ID)
 */

import type { Env } from '../../../src/types';

interface RestoreRequest {
  syncCode: string;
  newDeviceId: string;
}

interface RestoreResponse {
  success: boolean;
  vault: {
    birthDataEnc: string;
    keySalt: string;
  };
  profile: {
    dominantDimension: number | null;
    secondaryDimension: number | null;
    currentStage: string | null;
    kappaAverage: number | null;
    checkinCount: number;
    streakCurrent: number;
    streakLongest: number;
  };
  checkins: {
    id: string;
    date: string;
    vector: number[];
    stage: string;
    kappa: number;
    moodScore: number | null;
  }[];
  newUserHash: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RestoreRequest = await request.json();

    if (!body.syncCode || !body.newDeviceId) {
      return errorResponse('INVALID_REQUEST', 'Sync code and new device ID required', 400);
    }

    // Normalize sync code
    const syncCode = body.syncCode.toUpperCase().trim();

    // Find user by sync code
    const vault = await env.DB.prepare(`
      SELECT user_hash, birth_data_enc, key_salt
      FROM user_vault
      WHERE sync_code = ? AND deletion_requested_at IS NULL
    `).bind(syncCode).first<{
      user_hash: string;
      birth_data_enc: string;
      key_salt: string;
    }>();

    if (!vault) {
      return errorResponse('NOT_FOUND', 'Invalid sync code or account deleted', 404);
    }

    const oldUserHash = vault.user_hash;

    // Get profile
    const profile = await env.DB.prepare(`
      SELECT dominant_dimension, secondary_dimension, current_stage,
             kappa_average, checkin_count, streak_current, streak_longest
      FROM astrology_profiles
      WHERE user_hash = ?
    `).bind(oldUserHash).first<{
      dominant_dimension: number | null;
      secondary_dimension: number | null;
      current_stage: string | null;
      kappa_average: number | null;
      checkin_count: number;
      streak_current: number;
      streak_longest: number;
    }>();

    // Get check-ins
    const checkinsResult = await env.DB.prepare(`
      SELECT id, checkin_date, vector, stage, kappa, mood_score
      FROM checkins
      WHERE user_hash = ?
      ORDER BY checkin_date DESC
      LIMIT 365
    `).bind(oldUserHash).all<{
      id: string;
      checkin_date: string;
      vector: string;
      stage: string;
      kappa: number;
      mood_score: number | null;
    }>();

    // Generate new user hash for new device
    const pepper = env.HASH_PEPPER || 'default-pepper-change-in-production';
    const newUserHash = await generateHash(body.newDeviceId + pepper);

    // Create new vault entry for new device (linking same data)
    const now = new Date().toISOString();
    const newSyncCode = generateSyncCode();

    await env.DB.prepare(`
      INSERT INTO user_vault (user_hash, birth_data_enc, key_salt, sync_code, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_hash) DO UPDATE SET
        birth_data_enc = excluded.birth_data_enc,
        key_salt = excluded.key_salt,
        sync_code = excluded.sync_code,
        last_active_at = excluded.last_active_at
    `).bind(newUserHash, vault.birth_data_enc, vault.key_salt, newSyncCode, now, now).run();

    // Copy profile to new hash
    if (profile) {
      await env.DB.prepare(`
        INSERT INTO astrology_profiles (
          user_hash, dominant_dimension, secondary_dimension, current_stage,
          kappa_average, checkin_count, streak_current, streak_longest, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_hash) DO UPDATE SET
          dominant_dimension = excluded.dominant_dimension,
          secondary_dimension = excluded.secondary_dimension,
          current_stage = excluded.current_stage,
          kappa_average = excluded.kappa_average,
          checkin_count = excluded.checkin_count,
          streak_current = excluded.streak_current,
          streak_longest = excluded.streak_longest
      `).bind(
        newUserHash,
        profile.dominant_dimension,
        profile.secondary_dimension,
        profile.current_stage,
        profile.kappa_average,
        profile.checkin_count,
        profile.streak_current,
        profile.streak_longest,
        now
      ).run();
    }

    // Copy check-ins to new hash
    for (const checkin of checkinsResult.results) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO checkins (id, user_hash, checkin_date, vector, stage, kappa, mood_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), // New ID for new user
        newUserHash,
        checkin.checkin_date,
        checkin.vector,
        checkin.stage,
        checkin.kappa,
        checkin.mood_score,
        now
      ).run();
    }

    const response: RestoreResponse = {
      success: true,
      vault: {
        birthDataEnc: vault.birth_data_enc,
        keySalt: vault.key_salt,
      },
      profile: profile ? {
        dominantDimension: profile.dominant_dimension,
        secondaryDimension: profile.secondary_dimension,
        currentStage: profile.current_stage,
        kappaAverage: profile.kappa_average,
        checkinCount: profile.checkin_count,
        streakCurrent: profile.streak_current,
        streakLongest: profile.streak_longest,
      } : {
        dominantDimension: null,
        secondaryDimension: null,
        currentStage: null,
        kappaAverage: null,
        checkinCount: 0,
        streakCurrent: 0,
        streakLongest: 0,
      },
      checkins: checkinsResult.results.map((c) => ({
        id: c.id,
        date: c.checkin_date,
        vector: JSON.parse(c.vector),
        stage: c.stage,
        kappa: c.kappa,
        moodScore: c.mood_score,
      })),
      newUserHash,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USER] Restore error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to restore data', 500);
  }
};

async function generateHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'COSMIC-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}
