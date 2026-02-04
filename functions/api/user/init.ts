/**
 * POST /api/user/init
 *
 * Initialize a new anonymous user vault.
 * Creates encrypted storage for user's birth data.
 * System cannot read the encrypted data.
 *
 * Body:
 *   - deviceId: string (from client localStorage)
 *   - birthDataEnc: string (AES-256 encrypted by client)
 *   - keySalt: string (used for key derivation)
 *   - generateSyncCode?: boolean (optional)
 */

import type { Env } from '../../../src/types';

interface InitRequest {
  deviceId: string;
  birthDataEnc: string;
  keySalt: string;
  generateSyncCode?: boolean;
}

interface InitResponse {
  success: boolean;
  userHash: string;
  syncCode?: string;
  created: boolean;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: InitRequest = await request.json();

    // Validate required fields
    if (!body.deviceId || !body.birthDataEnc || !body.keySalt) {
      return errorResponse('INVALID_REQUEST', 'Missing required fields', 400);
    }

    // Generate user hash (device_id + server pepper)
    const pepper = env.HASH_PEPPER || 'default-pepper-change-in-production';
    const userHash = await generateHash(body.deviceId + pepper);

    // Generate sync code if requested
    let syncCode: string | undefined;
    if (body.generateSyncCode) {
      syncCode = generateSyncCode();
    }

    const now = new Date().toISOString();

    // Check if user already exists
    const existing = await env.DB.prepare(
      'SELECT user_hash FROM user_vault WHERE user_hash = ?'
    ).bind(userHash).first();

    let created = false;

    if (existing) {
      // Update existing vault
      await env.DB.prepare(`
        UPDATE user_vault
        SET birth_data_enc = ?, key_salt = ?, last_active_at = ?
        ${syncCode ? ', sync_code = ?' : ''}
        WHERE user_hash = ?
      `).bind(
        body.birthDataEnc,
        body.keySalt,
        now,
        ...(syncCode ? [syncCode] : []),
        userHash
      ).run();
    } else {
      // Create new vault
      await env.DB.prepare(`
        INSERT INTO user_vault (user_hash, birth_data_enc, key_salt, sync_code, created_at, last_active_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(userHash, body.birthDataEnc, body.keySalt, syncCode || null, now, now).run();

      // Create astrology profile
      await env.DB.prepare(`
        INSERT INTO astrology_profiles (user_hash, created_at)
        VALUES (?, ?)
      `).bind(userHash, now).run();

      created = true;
    }

    // Record consent for data processing
    await env.DB.prepare(`
      INSERT OR REPLACE INTO user_consents (id, user_hash, consent_type, granted_at, ip_country)
      VALUES (?, ?, 'data_processing', ?, ?)
    `).bind(
      crypto.randomUUID(),
      userHash,
      now,
      request.cf?.country || 'unknown'
    ).run();

    const response: InitResponse = {
      success: true,
      userHash,
      syncCode,
      created,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USER] Init error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to initialize user', 500);
  }
};

// ============================================
// Helper Functions
// ============================================

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
