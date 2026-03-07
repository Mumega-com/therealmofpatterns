/**
 * POST /api/remind
 * Schedule a Sol check-in reminder email for tomorrow morning.
 *
 * Body: { email: string, timezoneOffset: number }
 *   timezoneOffset — minutes from UTC (from new Date().getTimezoneOffset())
 *   e.g. UTC-5 = 300, UTC+2 = -120
 *
 * Uses Resend's scheduled_at to send exactly once — tomorrow at 8am local.
 * Each check-in reschedules the next one, creating a self-maintaining loop.
 *
 * Required secret: RESEND_API_KEY
 */

import type { Env } from '../../src/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export const onRequestOptions: PagesFunction = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json() as { email?: string; timezoneOffset?: number };
    const email = (body.email || '').trim().toLowerCase();
    const offsetMinutes = typeof body.timezoneOffset === 'number' ? body.timezoneOffset : 0;

    if (!email || !email.includes('@')) {
      return Response.json(
        { success: false, error: 'Valid email required.' },
        { status: 400, headers: CORS },
      );
    }

    if (!env.RESEND_API_KEY) {
      // Silently succeed so the UI doesn't break — log for visibility
      console.warn('[Remind] RESEND_API_KEY not configured');
      return Response.json({ success: true, scheduled: false }, { headers: CORS });
    }

    // Compute tomorrow 8am in the user's local timezone
    // offsetMinutes: positive = west of UTC (UTC-), negative = east (UTC+)
    // 8am local = (8 + offsetMinutes/60) UTC hours
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // UTC hour for 8am local
    let utcHour = 8 + offsetMinutes / 60;
    // Handle day wrap (e.g. UTC+14 would make utcHour negative)
    if (utcHour < 0) { utcHour += 24; tomorrow.setUTCDate(tomorrow.getUTCDate() - 1); }
    if (utcHour >= 24) { utcHour -= 24; tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); }

    tomorrow.setUTCHours(Math.round(utcHour), 0, 0, 0);
    const scheduledAt = tomorrow.toISOString();

    const html = reminderEmailHtml();

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sol <sol@therealmofpatterns.com>',
        to: [email],
        subject: 'The field is ready.',
        html,
        scheduled_at: scheduledAt,
        headers: {
          'List-Unsubscribe': '<https://therealmofpatterns.com/remind/off>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [{ name: 'type', value: 'daily-reminder' }],
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json() as { message?: string };
      console.error('[Remind] Resend error:', err.message);
      return Response.json(
        { success: false, error: 'Could not schedule reminder.' },
        { status: 502, headers: CORS },
      );
    }

    const result = await resendRes.json() as { id?: string };
    console.log(`[Remind] Scheduled for ${email} at ${scheduledAt} (id: ${result.id})`);

    return Response.json({ success: true, scheduled: true, scheduledAt }, { headers: CORS });
  } catch (err) {
    console.error('[Remind] Error:', err);
    return Response.json(
      { success: false, error: 'Something went wrong.' },
      { status: 500, headers: CORS },
    );
  }
};

function reminderEmailHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>The field is ready.</title>
</head>
<body style="margin:0;padding:0;background:#0a0908;font-family:Georgia,'Times New Roman',serif;color:#f0e8d8;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0908;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:48px;">
              <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(212,168,84,0.45);font-family:Georgia,serif;">
                ◆ &nbsp;The Realm of Patterns
              </span>
            </td>
          </tr>

          <!-- Sol voice -->
          <tr>
            <td style="padding-bottom:12px;border-left:2px solid rgba(212,168,84,0.25);padding-left:20px;">
              <p style="margin:0;font-size:1.25rem;line-height:1.85;color:rgba(240,232,216,0.88);">
                The field is ready for today's reflection.
              </p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:32px;"></td></tr>

          <!-- CTA -->
          <tr>
            <td>
              <a href="https://therealmofpatterns.com/sol/checkin"
                 style="display:inline-block;padding:13px 28px;background:#d4a854;color:#0a0908;text-decoration:none;font-size:0.95rem;font-weight:600;font-family:Georgia,serif;letter-spacing:0.02em;">
                Begin today's check-in &nbsp;→
              </a>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:56px;border-bottom:1px solid rgba(212,168,84,0.08);"></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td>
              <p style="margin:0;font-size:11px;line-height:1.8;color:rgba(240,232,216,0.22);">
                Sol &nbsp;·&nbsp; The Realm of Patterns<br />
                <a href="https://therealmofpatterns.com/remind/off"
                   style="color:rgba(212,168,84,0.35);text-decoration:none;">
                  Stop reminders
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
