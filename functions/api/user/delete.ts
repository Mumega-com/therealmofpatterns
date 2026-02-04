/**
 * DELETE /api/user/delete
 *
 * GDPR Article 17: Right to Erasure
 * Permanently delete all user data.
 *
 * Body:
 *   - deviceId: string (to verify ownership)
 *   - confirm: boolean (must be true)
 */

import type { Env } from '../../../src/types';

interface DeleteRequest {
  deviceId: string;
  confirm: boolean;
}

interface DeleteResponse {
  success: boolean;
  deleted: {
    vault: boolean;
    profile: boolean;
    checkins: number;
    consents: number;
  };
  message: string;
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: DeleteRequest = await request.json();

    if (!body.deviceId) {
      return errorResponse('INVALID_REQUEST', 'Device ID required', 400);
    }

    if (!body.confirm) {
      return errorResponse('CONFIRMATION_REQUIRED', 'Must confirm deletion with confirm: true', 400);
    }

    // Generate user hash
    const pepper = env.HASH_PEPPER || 'default-pepper-change-in-production';
    const userHash = await generateHash(body.deviceId + pepper);

    // Verify user exists
    const user = await env.DB.prepare(
      'SELECT user_hash FROM user_vault WHERE user_hash = ?'
    ).bind(userHash).first();

    if (!user) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    const now = new Date().toISOString();

    // Log deletion request first (for audit trail)
    await env.DB.prepare(`
      INSERT INTO data_deletion_requests (id, user_hash, requested_at, completed_at, status)
      VALUES (?, ?, ?, ?, 'completed')
    `).bind(crypto.randomUUID(), userHash, now, now).run();

    // Delete check-ins
    const checkinsResult = await env.DB.prepare(
      'DELETE FROM checkins WHERE user_hash = ?'
    ).bind(userHash).run();

    // Delete consents
    const consentsResult = await env.DB.prepare(
      'DELETE FROM user_consents WHERE user_hash = ?'
    ).bind(userHash).run();

    // Delete profile
    await env.DB.prepare(
      'DELETE FROM astrology_profiles WHERE user_hash = ?'
    ).bind(userHash).run();

    // Delete vault (this cascades due to foreign keys, but we do it explicitly)
    await env.DB.prepare(
      'DELETE FROM user_vault WHERE user_hash = ?'
    ).bind(userHash).run();

    const response: DeleteResponse = {
      success: true,
      deleted: {
        vault: true,
        profile: true,
        checkins: checkinsResult.meta.changes || 0,
        consents: consentsResult.meta.changes || 0,
      },
      message: 'All your data has been permanently deleted. This action cannot be undone.',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[USER] Delete error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to delete data', 500);
  }
};

// Also support POST for clients that don't support DELETE
export const onRequestPost: PagesFunction<Env> = onRequestDelete;

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
