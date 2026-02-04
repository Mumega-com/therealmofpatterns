/**
 * GET /api/user/export
 *
 * GDPR Article 20: Right to Data Portability
 * Export all user data in machine-readable format (JSON).
 *
 * Query params:
 *   - deviceId: string (to verify ownership)
 */

import type { Env } from '../../../src/types';

interface ExportResponse {
  exportedAt: string;
  format: 'json';
  gdprArticle: string;
  userData: {
    vault: {
      birthDataEncrypted: string;
      keySalt: string;
      createdAt: string;
      note: string;
    };
    profile: {
      dominantDimension: number | null;
      secondaryDimension: number | null;
      currentStage: string | null;
      kappaAverage: number | null;
      checkinCount: number;
      streakCurrent: number;
      streakLongest: number;
    } | null;
    checkins: {
      id: string;
      date: string;
      vector: number[];
      stage: string;
      kappa: number;
      moodScore: number | null;
      createdAt: string;
    }[];
    consents: {
      type: string;
      grantedAt: string;
      withdrawnAt: string | null;
    }[];
  };
  instructions: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get('deviceId');

    if (!deviceId) {
      return errorResponse('INVALID_REQUEST', 'Device ID required as query parameter', 400);
    }

    // Generate user hash
    const pepper = env.HASH_PEPPER || 'default-pepper-change-in-production';
    const userHash = await generateHash(deviceId + pepper);

    // Get vault
    const vault = await env.DB.prepare(`
      SELECT birth_data_enc, key_salt, created_at
      FROM user_vault
      WHERE user_hash = ? AND deletion_requested_at IS NULL
    `).bind(userHash).first<{
      birth_data_enc: string;
      key_salt: string;
      created_at: string;
    }>();

    if (!vault) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    // Get profile
    const profile = await env.DB.prepare(`
      SELECT dominant_dimension, secondary_dimension, current_stage,
             kappa_average, checkin_count, streak_current, streak_longest
      FROM astrology_profiles
      WHERE user_hash = ?
    `).bind(userHash).first<{
      dominant_dimension: number | null;
      secondary_dimension: number | null;
      current_stage: string | null;
      kappa_average: number | null;
      checkin_count: number;
      streak_current: number;
      streak_longest: number;
    }>();

    // Get all check-ins
    const checkinsResult = await env.DB.prepare(`
      SELECT id, checkin_date, vector, stage, kappa, mood_score, created_at
      FROM checkins
      WHERE user_hash = ?
      ORDER BY checkin_date DESC
    `).bind(userHash).all<{
      id: string;
      checkin_date: string;
      vector: string;
      stage: string;
      kappa: number;
      mood_score: number | null;
      created_at: string;
    }>();

    // Get consents
    const consentsResult = await env.DB.prepare(`
      SELECT consent_type, granted_at, withdrawn_at
      FROM user_consents
      WHERE user_hash = ?
    `).bind(userHash).all<{
      consent_type: string;
      granted_at: string;
      withdrawn_at: string | null;
    }>();

    // Log export request
    await env.DB.prepare(`
      INSERT INTO data_export_requests (id, user_hash, requested_at, completed_at, status)
      VALUES (?, ?, ?, ?, 'completed')
    `).bind(crypto.randomUUID(), userHash, new Date().toISOString(), new Date().toISOString()).run();

    const response: ExportResponse = {
      exportedAt: new Date().toISOString(),
      format: 'json',
      gdprArticle: 'Article 20 - Right to Data Portability',
      userData: {
        vault: {
          birthDataEncrypted: vault.birth_data_enc,
          keySalt: vault.key_salt,
          createdAt: vault.created_at,
          note: 'Birth data is encrypted. Only you can decrypt it using your device.',
        },
        profile: profile
          ? {
              dominantDimension: profile.dominant_dimension,
              secondaryDimension: profile.secondary_dimension,
              currentStage: profile.current_stage,
              kappaAverage: profile.kappa_average,
              checkinCount: profile.checkin_count,
              streakCurrent: profile.streak_current,
              streakLongest: profile.streak_longest,
            }
          : null,
        checkins: checkinsResult.results.map((c) => ({
          id: c.id,
          date: c.checkin_date,
          vector: JSON.parse(c.vector),
          stage: c.stage,
          kappa: c.kappa,
          moodScore: c.mood_score,
          createdAt: c.created_at,
        })),
        consents: consentsResult.results.map((c) => ({
          type: c.consent_type,
          grantedAt: c.granted_at,
          withdrawnAt: c.withdrawn_at,
        })),
      },
      instructions:
        'This file contains all data we store about you. Your birth data is encrypted and can only be decrypted on your original device. To delete all data, use the /api/user/delete endpoint.',
    };

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="realm-of-patterns-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[USER] Export error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to export data', 500);
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
