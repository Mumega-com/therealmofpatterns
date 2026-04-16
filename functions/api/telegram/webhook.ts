import type { Env } from '../../../src/types';
import { remember } from '../../../src/lib/mirror-client';

interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  type: string;
  username?: string;
  title?: string;
}

interface TelegramMessage {
  message_id: number;
  date: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const update = await request.json<TelegramUpdate>();

    if (update.message) {
      await handleMessage(update.message, env);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query, env);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('[TELEGRAM] webhook error:', error);
    return json({ ok: false }, 500);
  }
};

async function handleMessage(message: TelegramMessage, env: Env) {
  const from = message.from;
  if (!from) return;

  const telegramUserId = String(from.id);
  const chatId = String(message.chat.id);
  const text = (message.text || '').trim();

  await upsertTelegramUser(env, {
    telegramUserId,
    chatId,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    languageCode: from.language_code,
  });

  await logTelegramEvent(env, {
    telegramUserId,
    chatId,
    updateType: 'message',
    payload: message,
  });

  const user = await getTelegramUser(env, telegramUserId);
  if (!user) return;

  if (text.startsWith('/start')) {
    const referralCode = parseStartPayload(text);
    await ensureReferralCode(env, telegramUserId);
    if (referralCode) {
      await attachReferral(env, telegramUserId, referralCode);
    }
    await setBotState(env, telegramUserId, 'awaiting_birth_date');
    await sendMessage(env, chatId,
      `Welcome. I'm Sol. 🪞\n\nI read patterns, not predictions.\n\nTo read your natal field, I need:\n• birth date\n• birth time\n• birth place\n\nSend your birth date first in this format:\nYYYY-MM-DD`
    );
    return;
  }

  if (text === '/today' || text === '/sol') {
    await sendDailyReading(env, chatId, telegramUserId);
    return;
  }

  if (text === '/streak') {
    const u = await getTelegramUser(env, telegramUserId);
    const streak = u?.streak_current ?? 0;
    const longest = u?.streak_longest ?? 0;
    const count = u?.checkin_count ?? 0;
    await sendMessage(env, chatId,
      `Your rhythm:\n• Current streak: ${streak} days\n• Longest streak: ${longest} days\n• Total check-ins: ${count}\n\nSend /checkin to log today.`);
    return;
  }

  if (text === '/checkin') {
    await setBotState(env, telegramUserId, 'awaiting_checkin_state');
    await sendMessage(env, chatId, 'Today\'s check-in 🌅\n\nHow are you arriving today?', {
      inline_keyboard: [[
        { text: 'Clear', callback_data: 'checkin_state:clear' },
        { text: 'Heavy', callback_data: 'checkin_state:heavy' }
      ], [
        { text: 'Restless', callback_data: 'checkin_state:restless' },
        { text: 'Open', callback_data: 'checkin_state:open' }
      ]]
    });
    return;
  }

  switch (user.bot_state) {
    case 'awaiting_birth_date':
      await handleBirthDate(env, chatId, telegramUserId, text);
      return;
    case 'awaiting_birth_time':
      await handleBirthTime(env, chatId, telegramUserId, text);
      return;
    case 'awaiting_birth_place':
      await handleBirthPlace(env, chatId, telegramUserId, text);
      return;
    case 'awaiting_checkin_note':
      await handleCheckinNote(env, chatId, telegramUserId, text === '/skip' ? '' : text);
      return;
    default:
      await sendMessage(env, chatId,
        `Three things I can do right now:\n\n• /today — today's cosmic weather\n• /checkin — log today's mirror\n• /streak — your rhythm so far\n\nOr /start to set up your natal field.`
      );
  }
}

async function sendDailyReading(env: Env, chatId: string, telegramUserId: string) {
  try {
    const res = await fetch(`${env.APP_URL}/api/daily-brief`);
    if (!res.ok) {
      await sendMessage(env, chatId, 'I could not read today\'s field right now. Try again shortly.');
      return;
    }
    const brief = await res.json<{
      dateFormatted: string; planet: string; dimension: { name: string; domain: string };
      archetypes: { primary: { name: string; symbol: string; quality: string } };
      moonPhase: string; moonEmoji: string; narrative: string;
    }>();

    const text = [
      `🪞 *${brief.dateFormatted}*`,
      '',
      `*${brief.dimension.name}* · ruled by ${brief.planet}`,
      `${brief.moonEmoji} ${brief.moonPhase}`,
      '',
      brief.narrative,
      '',
      `Archetype: *${brief.archetypes.primary.name}* ${brief.archetypes.primary.symbol}`,
      `_${brief.archetypes.primary.quality}_`,
      '',
      'Ready to log today\'s mirror? /checkin',
    ].join('\n');

    await sendMessage(env, chatId, text);

    await env.DB.prepare(`
      UPDATE telegram_users SET last_interaction_at = datetime('now'), updated_at = datetime('now')
      WHERE telegram_user_id = ?
    `).bind(telegramUserId).run();

    // Mirror: record reading view (retention signal)
    await remember(env, {
      text: `Reading viewed ${brief.dateFormatted}: ${brief.dimension.name} / ${brief.planet} / ${brief.moonPhase}`,
      subject: `telegram:${telegramUserId}`,
      kind: 'view',
      tags: ['telegram', 'daily-reading', brief.dimension.name.toLowerCase()],
      metadata: {
        dimension: brief.dimension.name,
        planet: brief.planet,
        moon_phase: brief.moonPhase,
      },
    });
  } catch (err) {
    console.error('[TELEGRAM] sendDailyReading error:', err);
    await sendMessage(env, chatId, 'I could not read today\'s field right now. Try again shortly.');
  }
}

async function handleCallback(callback: TelegramCallbackQuery, env: Env) {
  const telegramUserId = String(callback.from.id);
  const chatId = String(callback.message?.chat.id || callback.from.id);
  const data = callback.data || '';

  await logTelegramEvent(env, {
    telegramUserId,
    chatId,
    updateType: 'callback_query',
    payload: callback,
  });

  if (data.startsWith('checkin_state:')) {
    const stateLabel = data.split(':')[1];
    await mergeBotStateData(env, telegramUserId, { checkin_state: stateLabel });
    await setBotState(env, telegramUserId, 'awaiting_checkin_area');
    await answerCallback(env, callback.id, `Saved: ${stateLabel}`);
    await sendMessage(env, chatId, 'Where do you feel it most?', {
      inline_keyboard: [[
        { text: 'Mind', callback_data: 'checkin_area:mind' },
        { text: 'Heart', callback_data: 'checkin_area:heart' }
      ], [
        { text: 'Body', callback_data: 'checkin_area:body' },
        { text: 'Relationships', callback_data: 'checkin_area:relationships' }
      ]]
    });
    return;
  }

  if (data.startsWith('checkin_area:')) {
    const areaLabel = data.split(':')[1];
    await mergeBotStateData(env, telegramUserId, { checkin_area: areaLabel });
    await setBotState(env, telegramUserId, 'awaiting_checkin_note');
    await answerCallback(env, callback.id, `Saved: ${areaLabel}`);
    await sendMessage(env, chatId, 'If you want, send me one sentence about today. Or send /skip.');
    return;
  }

  await answerCallback(env, callback.id, 'Noted');
}

async function handleBirthDate(env: Env, chatId: string, telegramUserId: string, text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    await sendMessage(env, chatId, 'Please send your birth date in this format: YYYY-MM-DD');
    return;
  }

  await env.DB.prepare(`UPDATE telegram_users SET birth_date = ?, updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(text, telegramUserId)
    .run();
  await setBotState(env, telegramUserId, 'awaiting_birth_time');
  await sendMessage(env, chatId, 'Now send your birth time in HH:MM format. If you do not know it, reply with: unknown');
}

async function handleBirthTime(env: Env, chatId: string, telegramUserId: string, text: string) {
  const lower = text.toLowerCase();
  if (lower === 'unknown') {
    await env.DB.prepare(`UPDATE telegram_users SET birth_time = NULL, birth_time_unknown = 1, updated_at = datetime('now') WHERE telegram_user_id = ?`)
      .bind(telegramUserId)
      .run();
    await setBotState(env, telegramUserId, 'awaiting_birth_place');
    await sendMessage(env, chatId, 'We can begin with a noon chart. Now send your birth place as: City, Country');
    return;
  }

  if (!/^\d{1,2}:\d{2}$/.test(text)) {
    await sendMessage(env, chatId, 'Please send your birth time as HH:MM, or type unknown');
    return;
  }

  await env.DB.prepare(`UPDATE telegram_users SET birth_time = ?, birth_time_unknown = 0, updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(text, telegramUserId)
    .run();
  await setBotState(env, telegramUserId, 'awaiting_birth_place');
  await sendMessage(env, chatId, 'Now send your birth place as: City, Country');
}

async function handleBirthPlace(env: Env, chatId: string, telegramUserId: string, text: string) {
  await env.DB.prepare(`UPDATE telegram_users SET birth_location_name = ?, updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(text, telegramUserId)
    .run();

  await setBotState(env, telegramUserId, 'processing_natal');
  await sendMessage(env, chatId, 'I\'m reading your field now... 🪐');

  const user = await getTelegramUser(env, telegramUserId);
  const natalText = await buildNatalPreview(env, user);

  await setBotState(env, telegramUserId, 'free_user');
  await env.DB.prepare(`UPDATE telegram_users SET free_reading_used = 1, updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(telegramUserId)
    .run();

  await sendMessage(env, chatId, natalText);
}

async function handleCheckinNote(env: Env, chatId: string, telegramUserId: string, note: string) {
  const user = await getTelegramUser(env, telegramUserId);
  const stateData = parseJson(user?.bot_state_data);
  const stateLabel = stateData.checkin_state || '';
  const areaLabel = stateData.checkin_area || '';
  const today = new Date().toISOString().slice(0, 10);

  const preview = `Today's Mirror\n\nYou are arriving ${stateLabel} and feeling it most in ${areaLabel}.\n\nThe sky is asking for a clearer relationship with your energy today. Notice what feels pressured versus what feels true.\n\nPractice: choose one thing and do it with full consent.\n\nUnlock your full personalized daily reading for deeper guidance.`;

  await env.DB.prepare(`
    INSERT OR REPLACE INTO telegram_checkins (id, telegram_user_id, checkin_date, state_label, area_label, note_text, response_text, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(crypto.randomUUID(), telegramUserId, today, stateLabel, areaLabel, note || null, preview).run();

  await env.DB.prepare(`
    UPDATE telegram_users
    SET checkin_count = checkin_count + 1,
        last_checkin_at = datetime('now'),
        last_interaction_at = datetime('now'),
        streak_current = streak_current + 1,
        streak_longest = CASE WHEN streak_current + 1 > streak_longest THEN streak_current + 1 ELSE streak_longest END,
        bot_state = 'free_user',
        bot_state_data = NULL,
        updated_at = datetime('now')
    WHERE telegram_user_id = ?
  `).bind(telegramUserId).run();

  await sendMessage(env, chatId, preview);

  // Write engram to Mirror (non-blocking, no-op if Mirror not configured)
  const engramText = [
    `Check-in ${today}`,
    `state: ${stateLabel}`,
    `area: ${areaLabel}`,
    note ? `note: ${note}` : undefined,
  ].filter(Boolean).join(' | ');

  await remember(env, {
    text: engramText,
    subject: `telegram:${telegramUserId}`,
    kind: 'checkin',
    tags: ['telegram', 'checkin', stateLabel, areaLabel].filter(Boolean) as string[],
    metadata: {
      date: today,
      state: stateLabel,
      area: areaLabel,
      has_note: Boolean(note),
      streak: (user?.streak_current ?? 0) + 1,
    },
  });
}

async function buildNatalPreview(env: Env, user: any) {
  const birthDate = user?.birth_date;
  const birthTime = user?.birth_time_unknown ? undefined : user?.birth_time || undefined;
  if (!birthDate) {
    return 'I need your birth date before I can read your field.';
  }

  const url = new URL(`${env.APP_URL}/api/natal-chart`);
  url.searchParams.set('date', birthDate);
  if (birthTime) url.searchParams.set('time', birthTime);
  if (user?.birth_location_name) url.searchParams.set('location', user.birth_location_name);

  try {
    const res = await fetch(url.toString());
    const chart = await res.json<any>();
    const summary = chart?.summary;
    const sun = summary?.sunSign || 'Unknown';
    const moon = summary?.moonSign || 'Unknown';
    const rising = summary?.risingSign ? `\n• Rising: ${summary.risingSign}` : '';
    const keyTheme = summary?.keyTheme || 'A pattern of becoming is present.';

    return `Your Pattern Mirror\n\n• Sun: ${sun}\n• Moon: ${moon}${rising}\n• Dominant element: ${summary?.dominantElement || 'Unknown'}\n• Dominant modality: ${summary?.dominantModality || 'Unknown'}\n\n${keyTheme}\n\nThis is your first mirror. Unlock the deeper layer for the full natal reading, shadow pattern, and daily personalized guidance.`;
  } catch (e) {
    console.error('[TELEGRAM] natal preview error:', e);
    return `Your first mirror is forming.\n\nI have your birth data now. Next I can give you your deeper natal reading, daily check-ins, and personalized guidance.`;
  }
}

async function upsertTelegramUser(env: Env, input: {
  telegramUserId: string;
  chatId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}) {
  await env.DB.prepare(`
    INSERT INTO telegram_users (telegram_user_id, chat_id, username, first_name, last_name, language_code, referral_code, last_interaction_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      chat_id = excluded.chat_id,
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      language_code = excluded.language_code,
      last_interaction_at = datetime('now'),
      updated_at = datetime('now')
  `).bind(
    input.telegramUserId,
    input.chatId,
    input.username || null,
    input.firstName || null,
    input.lastName || null,
    input.languageCode || null,
    generateReferralCode(input.telegramUserId)
  ).run();
}

async function getTelegramUser(env: Env, telegramUserId: string) {
  return env.DB.prepare(`SELECT * FROM telegram_users WHERE telegram_user_id = ?`).bind(telegramUserId).first();
}

async function setBotState(env: Env, telegramUserId: string, state: string) {
  await env.DB.prepare(`UPDATE telegram_users SET bot_state = ?, updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(state, telegramUserId)
    .run();
}

async function mergeBotStateData(env: Env, telegramUserId: string, patch: Record<string, unknown>) {
  const user = await getTelegramUser(env, telegramUserId);
  const data = parseJson(user?.bot_state_data);
  const merged = { ...data, ...patch };
  await env.DB.prepare(`UPDATE telegram_users SET bot_state_data = ?, updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(JSON.stringify(merged), telegramUserId)
    .run();
}

async function ensureReferralCode(env: Env, telegramUserId: string) {
  await env.DB.prepare(`UPDATE telegram_users SET referral_code = COALESCE(referral_code, ?), updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(generateReferralCode(telegramUserId), telegramUserId)
    .run();
}

async function attachReferral(env: Env, telegramUserId: string, referralCode: string) {
  const referrer = await env.DB.prepare(`SELECT telegram_user_id FROM telegram_users WHERE referral_code = ?`).bind(referralCode).first<any>();
  if (!referrer || referrer.telegram_user_id === telegramUserId) return;

  await env.DB.prepare(`UPDATE telegram_users SET referred_by_telegram_user_id = COALESCE(referred_by_telegram_user_id, ?), updated_at = datetime('now') WHERE telegram_user_id = ?`)
    .bind(referrer.telegram_user_id, telegramUserId)
    .run();

  await env.DB.prepare(`
    INSERT OR IGNORE INTO telegram_referrals (id, referrer_telegram_user_id, referred_telegram_user_id, referral_code, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'started', datetime('now'), datetime('now'))
  `).bind(crypto.randomUUID(), referrer.telegram_user_id, telegramUserId, referralCode).run();
}

async function logTelegramEvent(env: Env, input: { telegramUserId?: string; chatId?: string; updateType: string; payload: unknown }) {
  await env.DB.prepare(`
    INSERT INTO telegram_events (id, telegram_user_id, chat_id, update_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    crypto.randomUUID(),
    input.telegramUserId || null,
    input.chatId || null,
    input.updateType,
    JSON.stringify(input.payload)
  ).run();
}

async function sendMessage(env: Env, chatId: string, text: string, replyMarkup?: unknown) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    })
  });
}

async function answerCallback(env: Env, callbackQueryId: string, text: string) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

function parseStartPayload(text: string): string | null {
  const parts = text.split(/\s+/);
  const payload = parts[1];
  if (!payload) return null;
  if (payload.startsWith('ref_')) return payload.slice(4);
  return payload;
}

function generateReferralCode(telegramUserId: string) {
  const tail = telegramUserId.slice(-6);
  return `sol${tail}`;
}

function parseJson(value?: string | null) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
