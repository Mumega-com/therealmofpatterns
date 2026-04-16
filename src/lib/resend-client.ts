/**
 * Resend Client — minimal wrapper around the Resend REST API.
 *
 * Sends transactional emails (archetype report delivery, upgrades, re-engagement).
 * Graceful no-op when RESEND_API_KEY is not configured so call sites can be
 * wired without blocking on secrets.
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

export interface ResendEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_REPLY_TO?: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

const DEFAULT_FROM = 'Sol <sol@mumega.com>';

export async function sendEmail(env: ResendEnv, payload: EmailPayload): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    return { ok: true, skipped: true };
  }

  const body: Record<string, unknown> = {
    from: env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
  };
  if (payload.text) body.text = payload.text;
  if (env.RESEND_REPLY_TO) body.reply_to = env.RESEND_REPLY_TO;
  if (payload.tags) body.tags = payload.tags;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data = await res.json() as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
