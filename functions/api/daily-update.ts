/**
 * POST /api/daily-update
 * Trigger daily UV snapshot updates AND cosmic weather content generation
 *
 * Called by:
 * 1. Cloudflare Cron (scheduled daily at 00:00 UTC)
 * 2. Manual trigger from admin dashboard
 *
 * Features:
 * - UV snapshots for subscribed users
 * - Cosmic weather content for 6 languages (en, pt-br, pt-pt, es-mx, es-ar, es-es)
 * - Threshold alerts and Elder milestone tracking
 */

import { Env } from '../../src/types';

// Supported languages for content generation
const SUPPORTED_LANGUAGES = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 8 Mu Dimensions metadata
const MU_DIMENSIONS: Record<string, { symbol: string; name: string; planet: string }> = {
  phase: { symbol: 'P', name: 'Phase', planet: 'Sun' },
  existence: { symbol: 'E', name: 'Existence', planet: 'Saturn' },
  cognition: { symbol: 'mu', name: 'Cognition', planet: 'Mercury' },
  value: { symbol: 'V', name: 'Value', planet: 'Venus' },
  expansion: { symbol: 'N', name: 'Expansion', planet: 'Jupiter' },
  action: { symbol: 'Delta', name: 'Delta/Action', planet: 'Mars' },
  relation: { symbol: 'R', name: 'Relation', planet: 'Moon' },
  field: { symbol: 'Phi', name: 'Field', planet: 'Neptune' }
};

interface RequestBody {
  admin_key?: string; // Required for manual trigger
  user_email_hash?: string; // Optional: update specific user only
  skip_users?: boolean; // Skip user updates, only generate content
  skip_content?: boolean; // Skip content generation, only update users
  languages?: SupportedLanguage[]; // Optional: specific languages to generate
  date?: string; // Optional: specific date (YYYY-MM-DD), defaults to today
}

interface DailyUpdateResponse {
  success: boolean;
  users_updated: number;
  snapshots_created: number;
  notifications_queued: number;
  content_generated: number;
  languages_completed: string[];
  errors: number;
  error?: {
    code: string;
    message: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RequestBody = await request.json();

    // Check authorization
    // Cron requests have special header, manual requests need admin key
    const cronAuth = request.headers.get('Cf-Cron-Auth');
    const isValidCron = cronAuth !== null; // Cloudflare adds this header automatically

    if (!isValidCron) {
      // Manual trigger - check admin key
      const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
      const validAdminKey = env.ADMIN_KEY || 'change-me-in-production';

      if (adminKey !== validAdminKey) {
        return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
      }
    }

    // Get target date (default to today UTC)
    const targetDate = body.date || new Date().toISOString().split('T')[0];
    const languagesToGenerate = body.languages || [...SUPPORTED_LANGUAGES];

    let snapshotsCreated = 0;
    let notificationsQueued = 0;
    let contentGenerated = 0;
    const languagesCompleted: string[] = [];
    let errors = 0;

    // ============================================
    // Part 1: Generate Cosmic Weather Content
    // ============================================
    if (!body.skip_content) {
      console.log(`[DAILY] Generating cosmic weather content for ${targetDate}...`);

      for (const lang of languagesToGenerate) {
        try {
          // Check if content already exists for this date/language
          const existing = await env.DB.prepare(`
            SELECT id FROM cosmic_weather_content
            WHERE date = ? AND language_code = ?
          `).bind(targetDate, lang).first();

          if (existing) {
            console.log(`[DAILY] Content already exists for ${targetDate}/${lang}, skipping`);
            languagesCompleted.push(lang);
            continue;
          }

          // Generate content using Gemini
          const content = await generateCosmicWeatherContent(env, targetDate, lang);

          if (content) {
            // Store in D1
            await storeCosmicWeatherContent(env.DB, targetDate, lang, content);
            contentGenerated++;
            languagesCompleted.push(lang);
            console.log(`[DAILY] Generated content for ${targetDate}/${lang}`);
          }
        } catch (error) {
          console.error(`[DAILY] Error generating content for ${lang}:`, error);
          errors++;
        }
      }
    }

    // ============================================
    // Part 2: Update User UV Snapshots
    // ============================================
    let usersUpdated = 0;

    if (!body.skip_users) {
      const usersToUpdate = await getUsersForUpdate(env.DB, body.user_email_hash);

      if (usersToUpdate.length > 0) {
        console.log(`[DAILY] Updating ${usersToUpdate.length} user snapshots...`);

        for (const user of usersToUpdate) {
          try {
            // Compute today's UV snapshot
            const snapshot = await computeUserSnapshot(env, user);

            if (snapshot) {
              snapshotsCreated++;

              // Check for threshold alerts
              const alertsTriggered = await checkThresholdAlerts(env.DB, user.email_hash, snapshot);

              // Queue notification if needed
              const shouldNotify = user.email_notifications &&
                (alertsTriggered > 0 || shouldSendDailyUpdate(user));

              if (shouldNotify) {
                await queueNotification(env.DB, user.email_hash, snapshot, alertsTriggered);
                notificationsQueued++;
              }

              // Check for Elder milestones
              await checkElderMilestones(env.DB, user.email_hash, snapshot);
            }
          } catch (error) {
            console.error(`Error updating user ${user.email_hash}:`, error);
            errors++;
          }
        }
        usersUpdated = usersToUpdate.length;
      }
    }

    const response: DailyUpdateResponse = {
      success: true,
      users_updated: usersUpdated,
      snapshots_created: snapshotsCreated,
      notifications_queued: notificationsQueued,
      content_generated: contentGenerated,
      languages_completed: languagesCompleted,
      errors
    };

    console.log(`[DAILY] Completed: ${contentGenerated} content, ${snapshotsCreated} snapshots, ${errors} errors`);

    return jsonResponse(response);

  } catch (error) {
    console.error('Daily update error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to process daily updates', 500);
  }
};

// ============================================
// Cosmic Weather Content Generation
// ============================================

interface CosmicWeatherContent {
  title: string;
  summary: string;
  detailed_content: {
    overview: string;
    morning_focus: string;
    afternoon_energy: string;
    evening_reflection: string;
    daily_question: string;
    practical_suggestions: string[];
    caution: string;
    affirmation: string;
  };
  vedic_insights: string;
  western_insights: string;
  practical_guidance: string;
  vector: number[];
  dominant: {
    dimension: string;
    symbol: string;
    name: string;
    value: number;
  };
}

/**
 * Generate cosmic weather content using Gemini API
 */
async function generateCosmicWeatherContent(
  env: Env,
  date: string,
  language: SupportedLanguage
): Promise<CosmicWeatherContent | null> {
  // Get the 8 Mu vector for this date (mock for now, integrate with Python later)
  const vector = generateDailyVector(date);
  const dominantIdx = vector.indexOf(Math.max(...vector));
  const dimKeys = Object.keys(MU_DIMENSIONS);
  const dominantKey = dimKeys[dominantIdx];
  const dominant = {
    dimension: dominantKey,
    symbol: MU_DIMENSIONS[dominantKey].symbol,
    name: MU_DIMENSIONS[dominantKey].name,
    value: vector[dominantIdx]
  };

  // Get voice configuration for this language
  const voice = await getVoiceConfig(env.DB, language);

  // Build prompt
  const prompt = buildDailyWeatherPrompt(date, vector, dominant, language, voice);

  try {
    // Call Gemini API
    const response = await callGeminiAPI(env.GEMINI_API_KEY, prompt);

    if (!response) {
      console.error(`[GEMINI] No response for ${language}`);
      return null;
    }

    // Parse and validate response
    const content = parseGeminiResponse(response);

    return {
      title: content.theme || `Cosmic Weather - ${date}`,
      summary: content.overview?.substring(0, 500) || '',
      detailed_content: {
        overview: content.overview || '',
        morning_focus: content.morning_focus || '',
        afternoon_energy: content.afternoon_energy || '',
        evening_reflection: content.evening_reflection || '',
        daily_question: content.daily_question || '',
        practical_suggestions: content.practical_suggestions || [],
        caution: content.caution || '',
        affirmation: content.affirmation || ''
      },
      vedic_insights: content.vedic_insights || '',
      western_insights: content.western_insights || '',
      practical_guidance: content.practical_guidance || '',
      vector,
      dominant
    };
  } catch (error) {
    console.error(`[GEMINI] Error generating content:`, error);
    return null;
  }
}

/**
 * Generate a deterministic 8D vector based on date
 * Uses a simple hash-based approach for consistency
 */
function generateDailyVector(date: string): number[] {
  // Simple seeded random based on date string
  const seed = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

  const vector: number[] = [];
  for (let i = 0; i < 8; i++) {
    // Generate pseudo-random values between 0.2 and 0.95
    const hash = Math.sin(seed * (i + 1) * 9973) * 10000;
    const value = 0.2 + (Math.abs(hash) % 7500) / 10000;
    vector.push(Math.round(value * 1000) / 1000);
  }

  return vector;
}

/**
 * Get voice configuration from database
 */
async function getVoiceConfig(
  db: D1Database,
  language: SupportedLanguage
): Promise<{ name: string; tone: string; style: string }> {
  try {
    const result = await db.prepare(`
      SELECT voice_name, tone, style FROM content_voices WHERE language_code = ?
    `).bind(language).first();

    if (result) {
      return {
        name: result.voice_name as string,
        tone: result.tone as string || 'warm, insightful',
        style: result.style as string || 'clear, poetic but grounded'
      };
    }
  } catch (error) {
    console.error(`[VOICE] Error fetching voice config:`, error);
  }

  // Default voice
  return {
    name: 'Pattern Guide',
    tone: 'warm, insightful, poetic without being flowery',
    style: 'grounded mysticism, invitational not prescriptive'
  };
}

/**
 * Build prompt for daily cosmic weather
 */
function buildDailyWeatherPrompt(
  date: string,
  vector: number[],
  dominant: { dimension: string; symbol: string; name: string; value: number },
  language: SupportedLanguage,
  voice: { name: string; tone: string; style: string }
): string {
  const languageNames: Record<SupportedLanguage, string> = {
    'en': 'English',
    'pt-br': 'Brazilian Portuguese',
    'pt-pt': 'European Portuguese',
    'es-mx': 'Mexican Spanish',
    'es-ar': 'Argentine Spanish',
    'es-es': 'Castilian Spanish'
  };

  return `You are a content generator for "The Realm of Patterns," a platform that bridges ancient wisdom traditions with modern psychology through the FRC 16D framework.

## Core Concepts

### The 8 Mu Dimensions (Inner Octave)
1. Phase (P) - Sun - Identity, Will, Direction
2. Existence (E) - Saturn - Structure, Stability, Form
3. Cognition (mu) - Mercury - Thought, Communication
4. Value (V) - Venus - Beauty, Worth, Harmony
5. Expansion (N) - Jupiter - Growth, Meaning
6. Delta/Action (Delta) - Mars - Will, Drive
7. Relation (R) - Moon - Connection, Emotion
8. Field (Phi) - Neptune - Presence, Transcendence

### Key Principles
- Describe patterns, not predictions
- Empower self-understanding, not dependency
- Use "resonance" not "compatibility"
- Speak of "tendencies" not "destinies"

## Writing Voice: ${voice.name}
Tone: ${voice.tone}
Style: ${voice.style}

## Task: Generate Daily Cosmic Weather

**Date:** ${date}
**Language:** ${languageNames[language]}
**Current 8 Mu Vector:** [${vector.map(v => v.toFixed(3)).join(', ')}]
**Dominant Dimension:** ${dominant.name} (${dominant.symbol}) at ${(dominant.value * 100).toFixed(1)}%

## Generate JSON matching this structure:

{
  "theme": "2-4 word theme",
  "overview": "2-3 paragraph overview (150-200 words)",
  "dimension_highlights": [
    {"dimension": "...", "value": 0.0, "guidance": "1-2 sentences"}
  ],
  "morning_focus": "2-3 sentences for morning energy",
  "afternoon_energy": "2-3 sentences for afternoon activities",
  "evening_reflection": "2-3 sentences for evening wind-down",
  "daily_question": "One contemplative question for self-reflection",
  "practical_suggestions": ["3-5 actionable items for the day"],
  "caution": "What to watch for today (1-2 sentences)",
  "affirmation": "Daily affirmation aligned with the dominant dimension",
  "vedic_insights": "1-2 paragraphs on Vedic/Jyotish perspective (100-150 words)",
  "western_insights": "1-2 paragraphs on Western astrological perspective (100-150 words)",
  "practical_guidance": "Synthesis of both traditions into practical wisdom (100-150 words)"
}

If language is not English, translate all content naturally into ${languageNames[language]}.
Return ONLY valid JSON, no markdown code blocks.`;
}

/**
 * Call Gemini API
 */
async function callGeminiAPI(
  apiKey: string,
  prompt: string
): Promise<any | null> {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  try {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[GEMINI] API error ${response.status}:`, error);
      return null;
    }

    const result = await response.json() as any;
    return result;
  } catch (error) {
    console.error('[GEMINI] Fetch error:', error);
    return null;
  }
}

/**
 * Parse Gemini API response
 */
function parseGeminiResponse(response: any): any {
  try {
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[GEMINI] No text in response');
      return {};
    }

    // Clean up potential markdown code blocks
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    }
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }

    return JSON.parse(cleanText.trim());
  } catch (error) {
    console.error('[GEMINI] Parse error:', error);
    return {};
  }
}

/**
 * Store cosmic weather content in D1
 */
async function storeCosmicWeatherContent(
  db: D1Database,
  date: string,
  language: SupportedLanguage,
  content: CosmicWeatherContent
): Promise<void> {
  const id = `${date}-${language}`;

  await db.prepare(`
    INSERT OR REPLACE INTO cosmic_weather_content (
      id, date, language_code, title, summary,
      detailed_content, vedic_insights, western_insights, practical_guidance,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    date,
    language,
    content.title,
    content.summary,
    JSON.stringify(content.detailed_content),
    content.vedic_insights,
    content.western_insights,
    content.practical_guidance,
    new Date().toISOString()
  ).run();
}

// ============================================
// User Snapshot Functions
// ============================================

async function getUsersForUpdate(
  db: D1Database,
  specificUserHash?: string
): Promise<any[]> {
  let query = `
    SELECT email, email_hash, birth_datetime, birth_latitude, birth_longitude,
           birth_timezone_offset, subscription_status, email_notifications
    FROM user_profiles
    WHERE subscription_status IN ('living_vector', 'premium')
  `;

  if (specificUserHash) {
    query += ` AND email_hash = ?`;
    const { results } = await db.prepare(query).bind(specificUserHash).all();
    return results || [];
  } else {
    const { results } = await db.prepare(query).all();
    return results || [];
  }
}

async function computeUserSnapshot(env: Env, user: any): Promise<any | null> {
  // For Phase 2 MVP: This would call the Python backend
  // For now, return mock snapshot

  // In production:
  // 1. Call Python API with user.birth_datetime, lat, lon, tz
  // 2. Get back full 16D profile
  // 3. Save to uv_snapshots table

  const mockSnapshot = {
    inner_8d: [0.78, 0.28, 0.24, 0.32, 1.00, 0.89, 0.15, 0.78],
    outer_8d: [1.00, 0.59, 0.72, 0.90, 0.62, 0.95, 0.51, 0.68],
    U_16: [
      0.78, 0.28, 0.24, 0.32, 1.00, 0.89, 0.15, 0.78,
      1.00, 0.59, 0.72, 0.90, 0.62, 0.95, 0.51, 0.68
    ],
    kappa_bar: 0.014,
    kappa_dims: [0.02, -0.15, 0.18, 0.24, -0.08, 0.12, 0.05, -0.03],
    RU: 1.58,
    W: 2.82,
    C: 0.93,
    dominant: { index: 4, symbol: 'N', value: 1.0, name: 'Narrative/Growth' },
    failure_mode: 'Collapse',
    elder_progress: 0.219,
    timestamp: new Date().toISOString()
  };

  // Save to DB
  try {
    await env.DB.prepare(`
      INSERT INTO uv_snapshots (
        user_email_hash, timestamp, inner_8d, outer_8d, u_16,
        kappa_bar, kappa_dims, RU, W, C,
        failure_mode, elder_progress,
        dominant_index, dominant_symbol, dominant_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.email_hash,
      mockSnapshot.timestamp,
      JSON.stringify(mockSnapshot.inner_8d),
      JSON.stringify(mockSnapshot.outer_8d),
      JSON.stringify(mockSnapshot.U_16),
      mockSnapshot.kappa_bar,
      JSON.stringify(mockSnapshot.kappa_dims),
      mockSnapshot.RU,
      mockSnapshot.W,
      mockSnapshot.C,
      mockSnapshot.failure_mode,
      mockSnapshot.elder_progress,
      mockSnapshot.dominant.index,
      mockSnapshot.dominant.symbol,
      mockSnapshot.dominant.value
    ).run();

    return mockSnapshot;
  } catch (error) {
    console.error('Failed to save snapshot:', error);
    return null;
  }
}

async function checkThresholdAlerts(
  db: D1Database,
  emailHash: string,
  snapshot: any
): Promise<number> {
  // Get user's active alerts
  const { results: alerts } = await db.prepare(`
    SELECT * FROM threshold_alerts
    WHERE user_email_hash = ? AND enabled = 1
  `).bind(emailHash).all();

  if (!alerts || alerts.length === 0) return 0;

  let triggered = 0;

  for (const alert of alerts) {
    const metric = alert.metric as string;
    const metricValue = snapshot[metric as keyof typeof snapshot] as number;
    const shouldTrigger = evaluateCondition(
      metricValue,
      alert.condition as string,
      alert.threshold_value as number
    );

    if (shouldTrigger) {
      triggered++;

      // Update alert
      await db.prepare(`
        UPDATE threshold_alerts
        SET last_triggered_at = ?, trigger_count = trigger_count + 1
        WHERE id = ?
      `).bind(new Date().toISOString(), alert.id as string).run();
    }
  }

  return triggered;
}

function evaluateCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'eq': return Math.abs(value - threshold) < 0.001;
    default: return false;
  }
}

function shouldSendDailyUpdate(user: any): boolean {
  // Send daily updates to living_vector subscribers
  return user.subscription_status === 'living_vector';
}

async function queueNotification(
  db: D1Database,
  emailHash: string,
  snapshot: any,
  alertsTriggered: number
): Promise<void> {
  const notificationType = alertsTriggered > 0 ? 'threshold_alert' : 'daily_update';

  const subject = alertsTriggered > 0
    ? `⚠️ Threshold Alert: ${snapshot.failure_mode} Mode`
    : `🌌 Daily UV Update: ${snapshot.dominant.symbol} Dominant`;

  const body = alertsTriggered > 0
    ? `Your UV metrics have triggered ${alertsTriggered} alert(s).\n\nCurrent Status:\n- κ̄: ${snapshot.kappa_bar.toFixed(3)}\n- RU: ${snapshot.RU.toFixed(2)}\n- Failure Mode: ${snapshot.failure_mode}`
    : `Your daily Universal Vector update is ready.\n\nDominant: ${snapshot.dominant.name}\nκ̄: ${snapshot.kappa_bar.toFixed(3)}\nRU: ${snapshot.RU.toFixed(2)}\nElder Progress: ${(snapshot.elder_progress * 100).toFixed(1)}%`;

  await db.prepare(`
    INSERT INTO notification_queue (
      user_email_hash, notification_type, subject, body, data, scheduled_for
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    emailHash,
    notificationType,
    subject,
    body,
    JSON.stringify(snapshot),
    new Date().toISOString()
  ).run();
}

async function checkElderMilestones(
  db: D1Database,
  emailHash: string,
  snapshot: any
): Promise<void> {
  // Check for Elder Attractor milestones
  const milestones: { type: string; condition: boolean }[] = [
    { type: 'first_healthy', condition: snapshot.failure_mode === 'Healthy' },
    { type: 'kappa_85', condition: snapshot.kappa_bar >= 0.85 },
    { type: 'ru_45', condition: snapshot.RU >= 45 },
    { type: 'w_25', condition: snapshot.W >= 2.5 },
    { type: 'elder_48h', condition: snapshot.elder_progress >= 1.0 }
  ];

  for (const milestone of milestones) {
    if (milestone.condition) {
      // Check if already achieved
      const { results } = await db.prepare(`
        SELECT id FROM elder_milestones
        WHERE user_email_hash = ? AND milestone_type = ?
      `).bind(emailHash, milestone.type).all();

      if (!results || results.length === 0) {
        // First time achieving this milestone
        await db.prepare(`
          INSERT INTO elder_milestones (
            user_email_hash, milestone_type, achieved_at,
            kappa_bar, RU, W, elder_progress
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
          emailHash,
          milestone.type,
          new Date().toISOString(),
          snapshot.kappa_bar,
          snapshot.RU,
          snapshot.W,
          snapshot.elder_progress
        ).run();

        // Queue special notification
        await queueMilestoneNotification(db, emailHash, milestone.type, snapshot);
      }
    }
  }
}

async function queueMilestoneNotification(
  db: D1Database,
  emailHash: string,
  milestoneType: string,
  snapshot: any
): Promise<void> {
  const milestoneNames: { [key: string]: string } = {
    first_healthy: '🎉 First Healthy State',
    kappa_85: '⭐ High Coupling (κ̄ ≥ 0.85)',
    ru_45: '🔥 High Resonance (RU ≥ 45)',
    w_25: '👁️ Strong Witness (W ≥ 2.5)',
    elder_48h: '🏆 Elder Attractor Reached'
  };

  const subject = `${milestoneNames[milestoneType]} - Milestone Achieved!`;
  const body = `Congratulations! You've achieved a new milestone in your journey.\n\n${milestoneNames[milestoneType]}\n\nYour current metrics:\n- κ̄: ${snapshot.kappa_bar.toFixed(3)}\n- RU: ${snapshot.RU.toFixed(2)}\n- W: ${snapshot.W.toFixed(2)}\n- Elder Progress: ${(snapshot.elder_progress * 100).toFixed(1)}%`;

  await db.prepare(`
    INSERT INTO notification_queue (
      user_email_hash, notification_type, subject, body, data, scheduled_for
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    emailHash,
    'elder_milestone',
    subject,
    body,
    JSON.stringify({ milestone_type: milestoneType, snapshot }),
    new Date().toISOString()
  ).run();
}

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    users_updated: 0,
    snapshots_created: 0,
    notifications_queued: 0,
    content_generated: 0,
    languages_completed: [],
    errors: 0,
    error: { code, message }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
