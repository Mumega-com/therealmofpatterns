/**
 * Shared auth helpers — runs in Cloudflare edge (Web Crypto API).
 */
import type { Env } from '../types';

export async function hashEmail(email: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase().trim() + pepper);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return hex(buf);
}

export async function generateToken(): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return hex(buf);
}

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function getSessionId(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/rop_session=([^;]+)/);
  return m ? m[1] : null;
}

export async function getSession(
  request: Request,
  env: Env,
): Promise<{ email_hash: string; session_id: string } | null> {
  const sessionId = getSessionId(request);
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    `SELECT email_hash FROM sessions WHERE id = ? AND expires_at > datetime('now')`,
  ).bind(sessionId).first<{ email_hash: string }>();

  if (!row) return null;

  // Bump last_seen (fire-and-forget)
  env.DB.prepare(`UPDATE sessions SET last_seen_at = datetime('now') WHERE id = ?`)
    .bind(sessionId).run().catch(() => {});

  return { email_hash: row.email_hash, session_id: sessionId };
}

export function sessionCookie(sessionId: string, maxAge: number): string {
  return `rop_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `rop_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
