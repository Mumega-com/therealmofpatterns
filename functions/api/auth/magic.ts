/**
 * POST /api/auth/magic
 * Send a magic link to the given email address.
 *
 * Body: { email: string, redirect?: string }
 * Returns: { success: true }
 */
import type { Env } from '../../../src/types';
import { hashEmail, generateToken, hashToken } from '../../../src/lib/auth';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = await request.json() as { email?: string; redirect?: string };
    const email = (body.email || '').trim().toLowerCase();
    const redirect = body.redirect || '/sol/checkin';

    if (!email || !email.includes('@')) {
      return Response.json({ success: false, error: 'Valid email required.' }, { status: 400, headers: CORS });
    }

    const pepper = env.HASH_PEPPER || 'dev-pepper';
    const emailHash = await hashEmail(email, pepper);

    // Upsert subscriber so they exist in the system
    await env.DB.prepare(`
      INSERT INTO subscribers (id, email, email_hash, source, subscribed_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, 'magic-link', datetime('now'))
      ON CONFLICT(email_hash) DO NOTHING
    `).bind(email, emailHash).run();

    // Generate token (stored as hash, sent in plaintext)
    const token = await generateToken();
    const tokenHash = await hashToken(token);

    const appUrl = env.APP_URL || 'https://therealmofpatterns.com';
    const verifyUrl = `${appUrl}/api/auth/verify?token=${token}&redirect=${encodeURIComponent(redirect)}`;

    // Store token (expires in 15 min)
    await env.DB.prepare(`
      INSERT INTO auth_tokens (id, email_hash, token_hash, expires_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, datetime('now', '+15 minutes'))
    `).bind(emailHash, tokenHash).run();

    // Send email
    if (env.RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Sol <sol@therealmofpatterns.com>',
          to: [email],
          subject: 'Your entry to Sol',
          html: magicLinkEmail(verifyUrl),
        }),
      });
    } else {
      console.log('[Auth] Magic link (no Resend):', verifyUrl);
    }

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    console.error('[Auth] magic error:', err);
    return Response.json({ success: false, error: 'Something went wrong.' }, { status: 500, headers: CORS });
  }
};

function magicLinkEmail(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0a0908;font-family:Georgia,'Times New Roman',serif;color:#f0e8d8;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0908;">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

        <tr><td style="padding-bottom:48px;">
          <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(212,168,84,0.45);">
            ◆ &nbsp;The Realm of Patterns
          </span>
        </td></tr>

        <tr><td style="padding-bottom:12px;border-left:2px solid rgba(212,168,84,0.25);padding-left:20px;">
          <p style="margin:0;font-size:1.15rem;line-height:1.85;color:rgba(240,232,216,0.88);">
            Your entry point is ready. This link expires in 15 minutes.
          </p>
        </td></tr>

        <tr><td style="height:32px;"></td></tr>

        <tr><td>
          <a href="${url}"
             style="display:inline-block;padding:13px 28px;background:#d4a854;color:#0a0908;text-decoration:none;font-size:0.95rem;font-weight:600;font-family:Georgia,serif;letter-spacing:0.02em;">
            Enter Sol &nbsp;→
          </a>
        </td></tr>

        <tr><td style="height:32px;"></td></tr>

        <tr><td>
          <p style="margin:0;font-size:11px;line-height:1.8;color:rgba(240,232,216,0.22);">
            If you didn't request this, you can ignore it safely.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
