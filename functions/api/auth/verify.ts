/**
 * GET /api/auth/verify?token=xxx&redirect=/sol/checkin
 * Validates magic link token, creates session, sets cookie, redirects.
 */
import type { Env } from '../../../src/types';
import { hashToken, sessionCookie } from '../../../src/lib/auth';

const SESSION_DAYS = 30;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const redirect = url.searchParams.get('redirect') || '/sol/checkin';

  // Sanitize redirect (only allow relative paths)
  const safePath = redirect.startsWith('/') ? redirect : '/sol/checkin';
  const appUrl = env.APP_URL || 'https://therealmofpatterns.com';

  if (!token) {
    return Response.redirect(`${appUrl}/sol?auth=invalid`, 302);
  }

  try {
    const tokenHash = await hashToken(token);

    // Look up token
    const row = await env.DB.prepare(`
      SELECT id, email_hash, expires_at, used_at
      FROM auth_tokens
      WHERE token_hash = ?
    `).bind(tokenHash).first<{ id: string; email_hash: string; expires_at: string; used_at: string | null }>();

    if (!row) {
      return Response.redirect(`${appUrl}/sol?auth=invalid`, 302);
    }

    if (row.used_at) {
      return Response.redirect(`${appUrl}/sol?auth=used`, 302);
    }

    if (new Date(row.expires_at) < new Date()) {
      return Response.redirect(`${appUrl}/sol?auth=expired`, 302);
    }

    // Mark token as used
    await env.DB.prepare(`UPDATE auth_tokens SET used_at = datetime('now') WHERE id = ?`)
      .bind(row.id).run();

    // Create session
    const sessionId = generateId();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString();

    await env.DB.prepare(`
      INSERT INTO sessions (id, email_hash, expires_at)
      VALUES (?, ?, ?)
    `).bind(sessionId, row.email_hash, expiresAt).run();

    // Mark subscriber as confirmed
    await env.DB.prepare(`
      UPDATE subscribers SET confirmed_at = datetime('now')
      WHERE email_hash = ? AND confirmed_at IS NULL
    `).bind(row.email_hash).run();

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${appUrl}${safePath}?auth=ok`,
        'Set-Cookie': sessionCookie(sessionId, SESSION_MAX_AGE),
      },
    });
  } catch (err) {
    console.error('[Auth] verify error:', err);
    return Response.redirect(`${appUrl}/sol?auth=error`, 302);
  }
};

function generateId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
