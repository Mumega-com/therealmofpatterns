/**
 * POST /api/remind
 * Schedule a Sol check-in reminder email for tomorrow morning.
 * The email contains tomorrow's actual cosmic brief — planet, archetypes,
 * frequency, moon phase, and Sol's narrative.
 *
 * Body: { email: string, timezoneOffset: number }
 *   timezoneOffset — minutes from UTC (from new Date().getTimezoneOffset())
 *   e.g. UTC-5 = 300, UTC+2 = -120
 *
 * Required secret: RESEND_API_KEY
 */

import type { Env } from '../../src/types';
import { approximateLongitudes, compute8D, getDominant } from '../../src/lib/16d-engine';
import { DIMENSION_METADATA } from '../../src/types';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ── Planet → frequency ────────────────────────────────────────
const PLANET_FREQ: Record<string, number> = {
  Sun: 126.22, Moon: 210.42, Mercury: 141.27, Venus: 221.23,
  Mars: 144.72, Jupiter: 183.58, Saturn: 147.85,
  'Uranus/Neptune': 207.36,
};

// ── Dimension → archetypes ────────────────────────────────────
const DIM_ARCHETYPES: Record<string, {
  yin:  { name: string; symbol: string; quality: string };
  yang: { name: string; symbol: string; quality: string };
}> = {
  Identity:   { yin: { name: 'The Soul',      symbol: '☽', quality: 'Inner radiance, authenticity' },    yang: { name: 'The Hero',       symbol: '☉', quality: 'Courage, self-expression' } },
  Structure:  { yin: { name: 'The Hermit',    symbol: '⚗', quality: 'Withdrawal, inner light' },          yang: { name: 'The Architect',  symbol: '◈', quality: 'Structure, mastery' } },
  Mind:       { yin: { name: 'The Weaver',    symbol: '∞', quality: 'Pattern-sensing, intuition' },       yang: { name: 'The Messenger',  symbol: '✦', quality: 'Clarity, articulation' } },
  Heart:      { yin: { name: 'The Beloved',   symbol: '♡', quality: 'Receptivity, depth of feeling' },   yang: { name: 'The Lover',      symbol: '◎', quality: 'Beauty, creative force' } },
  Growth:     { yin: { name: 'The Seeker',    symbol: '◉', quality: 'Longing, inner pilgrimage' },        yang: { name: 'The Explorer',   symbol: '⬡', quality: 'Expansion, meaning-making' } },
  Drive:      { yin: { name: 'The Alchemist', symbol: '△', quality: 'Directed will, quiet force' },       yang: { name: 'The Warrior',    symbol: '◆', quality: 'Action, decisive courage' } },
  Connection: { yin: { name: 'The Empath',    symbol: '◌', quality: 'Deep attunement, reflection' },     yang: { name: 'The Weaver',     symbol: '⊕', quality: 'Bonds, communal field' } },
  Awareness:  { yin: { name: 'The Mystic',    symbol: '◑', quality: 'Dissolution, cosmic attunement' },  yang: { name: 'The Witness',    symbol: '◐', quality: 'Presence, clear seeing' } },
};

// ── Moon phase ────────────────────────────────────────────────
function getMoonPhase(date: Date): { phase: string; emoji: string } {
  const REF_NEW_MOON = new Date('2025-01-29T12:36:00Z').getTime();
  const SYNODIC = 29.53058867 * 24 * 60 * 60 * 1000;
  const pct = (((date.getTime() - REF_NEW_MOON) % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;

  if (pct < 0.035) return { phase: 'New Moon',        emoji: '🌑' };
  if (pct < 0.25)  return { phase: 'Waxing Crescent', emoji: '🌒' };
  if (pct < 0.285) return { phase: 'First Quarter',   emoji: '🌓' };
  if (pct < 0.465) return { phase: 'Waxing Gibbous',  emoji: '🌔' };
  if (pct < 0.535) return { phase: 'Full Moon',       emoji: '🌕' };
  if (pct < 0.715) return { phase: 'Waning Gibbous',  emoji: '🌖' };
  if (pct < 0.75)  return { phase: 'Last Quarter',    emoji: '🌗' };
  if (pct < 0.965) return { phase: 'Waning Crescent', emoji: '🌘' };
  return { phase: 'New Moon', emoji: '🌑' };
}

// ── Compute tomorrow's brief ──────────────────────────────────
function computeBrief(date: Date) {
  const lons     = approximateLongitudes(date);
  const vector   = compute8D(lons);
  const dominant = getDominant(vector);
  const meta     = DIMENSION_METADATA[dominant.index];
  const planet   = meta.ruler;
  const freq     = Math.round((PLANET_FREQ[planet] ?? 126.22) * 100) / 100;
  const arcs     = DIM_ARCHETYPES[meta.name] ?? DIM_ARCHETYPES.Awareness;
  const isYang   = dominant.value > 0.6;
  const moon     = getMoonPhase(date);
  const narrative = `${planet} orients the field — the ${meta.name} dimension carries the most charge. A ${moon.phase} invites ${isYang ? 'expression' : 'depth'}. Meet the day with ${isYang ? 'active' : 'receptive'} presence.`;

  return {
    planet, freq, moon, isYang,
    dimension: meta.name,
    primary:   isYang ? arcs.yang : arcs.yin,
    secondary: isYang ? arcs.yin  : arcs.yang,
    primaryPolarity:   isYang ? 'Yang' : 'Yin',
    secondaryPolarity: isYang ? 'Yin'  : 'Yang',
    narrative,
  };
}

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
      console.warn('[Remind] RESEND_API_KEY not configured');
      return Response.json({ success: true, scheduled: false }, { headers: CORS });
    }

    // Tomorrow at 8am local time
    const now      = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    let utcHour = 8 + offsetMinutes / 60;
    if (utcHour < 0)  { utcHour += 24; tomorrow.setUTCDate(tomorrow.getUTCDate() - 1); }
    if (utcHour >= 24) { utcHour -= 24; tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); }
    tomorrow.setUTCHours(Math.round(utcHour), 0, 0, 0);

    const scheduledAt   = tomorrow.toISOString();
    const dateFormatted = tomorrow.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Compute tomorrow's field brief
    const brief = computeBrief(tomorrow);

    const html = briefEmailHtml(dateFormatted, brief);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sol <sol@therealmofpatterns.com>',
        to: [email],
        subject: `${brief.moon.emoji} ${brief.planet} field · ${dateFormatted}`,
        html,
        scheduled_at: scheduledAt,
        headers: {
          'List-Unsubscribe': '<https://therealmofpatterns.com/remind/off>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [{ name: 'type', value: 'daily-brief' }],
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.json() as { message?: string };
      console.error('[Remind] Resend error:', err.message);
      return Response.json(
        { success: false, error: 'Could not schedule reminder.' },
        { status: 422, headers: CORS },
      );
    }

    const result = await resendRes.json() as { id?: string };
    console.log(`[Remind] Scheduled brief for ${email} at ${scheduledAt} (id: ${result.id})`);

    return Response.json({ success: true, scheduled: true, scheduledAt }, { headers: CORS });
  } catch (err) {
    console.error('[Remind] Error:', err);
    return Response.json(
      { success: false, error: 'Something went wrong.' },
      { status: 500, headers: CORS },
    );
  }
};

// ── Email template ────────────────────────────────────────────
function briefEmailHtml(dateFormatted: string, brief: ReturnType<typeof computeBrief>): string {
  const { planet, freq, moon, primary, secondary, primaryPolarity, secondaryPolarity, dimension, narrative } = brief;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${moon.emoji} ${planet} field · ${dateFormatted}</title>
</head>
<body style="margin:0;padding:0;background:#0a0908;font-family:Georgia,'Times New Roman',serif;color:#f0e8d8;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0908;">
    <tr>
      <td align="center" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:8px;">
              <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(212,168,84,0.45);font-family:Georgia,serif;">
                ◆ &nbsp;The Realm of Patterns
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:36px;border-bottom:1px solid rgba(212,168,84,0.1);">
              <p style="margin:0;font-size:24px;font-weight:300;color:#f0e8d8;letter-spacing:0.01em;">${dateFormatted}</p>
            </td>
          </tr>

          <tr><td style="height:32px;"></td></tr>

          <!-- Moon + planet row -->
          <tr>
            <td style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="50%" style="vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,168,84,0.55);font-family:'Helvetica Neue',Arial,sans-serif;">Moon</p>
                    <p style="margin:0;font-size:17px;color:#f0e8d8;">${moon.emoji} &nbsp;${moon.phase}</p>
                  </td>
                  <td width="50%" style="vertical-align:top;">
                    <p style="margin:0 0 4px;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(212,168,84,0.55);font-family:'Helvetica Neue',Arial,sans-serif;">Ruling Planet · ${dimension}</p>
                    <p style="margin:0;font-size:17px;color:#d4a854;">${planet} &nbsp;<span style="font-size:13px;color:rgba(240,232,216,0.5);font-family:'Helvetica Neue',Arial,sans-serif;">${freq} Hz</span></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:28px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,168,84,0.2),transparent);"></div>
            </td>
          </tr>

          <!-- Archetypes -->
          <tr>
            <td style="padding-bottom:8px;">
              <p style="margin:0 0 18px;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(212,168,84,0.5);font-family:'Helvetica Neue',Arial,sans-serif;">Active Archetypes</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="48%" style="vertical-align:top;background:rgba(20,18,16,0.6);border:1px solid rgba(212,168,84,0.12);padding:18px 16px;border-radius:8px;">
                    <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#d4a854;font-family:'Helvetica Neue',Arial,sans-serif;">${primaryPolarity}</p>
                    <p style="margin:0 0 8px;font-size:26px;color:#d4a854;">${primary.symbol}</p>
                    <p style="margin:0 0 6px;font-size:16px;color:#f0e8d8;font-weight:500;">${primary.name}</p>
                    <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(240,232,216,0.5);font-family:'Helvetica Neue',Arial,sans-serif;">${primary.quality}</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="vertical-align:top;background:rgba(20,18,16,0.6);border:1px solid rgba(167,139,250,0.12);padding:18px 16px;border-radius:8px;">
                    <p style="margin:0 0 6px;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(167,139,250,0.8);font-family:'Helvetica Neue',Arial,sans-serif;">${secondaryPolarity}</p>
                    <p style="margin:0 0 8px;font-size:26px;color:rgba(167,139,250,0.85);">${secondary.symbol}</p>
                    <p style="margin:0 0 6px;font-size:16px;color:#f0e8d8;font-weight:500;">${secondary.name}</p>
                    <p style="margin:0;font-size:12px;line-height:1.5;color:rgba(240,232,216,0.5);font-family:'Helvetica Neue',Arial,sans-serif;">${secondary.quality}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr><td style="height:32px;"></td></tr>

          <!-- Narrative -->
          <tr>
            <td style="padding-bottom:32px;border-left:2px solid rgba(212,168,84,0.25);padding-left:20px;">
              <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(212,168,84,0.6);font-family:'Helvetica Neue',Arial,sans-serif;">☉ Sol's Field Reading</p>
              <p style="margin:0;font-size:1.15rem;line-height:1.85;color:rgba(240,232,216,0.88);">
                ${narrative}
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding-bottom:48px;">
              <a href="https://therealmofpatterns.com/sol/today"
                 style="display:inline-block;padding:14px 32px;background:#d4a854;color:#0a0908;text-decoration:none;font-size:0.95rem;font-weight:600;font-family:Georgia,serif;letter-spacing:0.02em;margin-bottom:12px;">
                Read your full brief &nbsp;→
              </a>
              <br />
              <a href="https://therealmofpatterns.com/sol/checkin"
                 style="font-size:13px;color:rgba(212,168,84,0.5);text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">
                or go straight to check-in
              </a>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:24px;border-top:1px solid rgba(212,168,84,0.08);"></td>
          </tr>

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
