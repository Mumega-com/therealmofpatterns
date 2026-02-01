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
 * - Stores to cms_cosmic_content table with date-based slugs
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

    // Check authorization - ADMIN_KEY must be configured in environment
    const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
    if (!env.ADMIN_KEY) {
      console.error('[DAILY-UPDATE] ADMIN_KEY not configured in environment');
      return errorResponse('CONFIGURATION_ERROR', 'Admin key not configured', 500);
    }

    if (adminKey !== env.ADMIN_KEY) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
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
      console.log(`[DAILY-UPDATE] Generating cosmic weather content for ${targetDate}...`);

      // Initialize key rotator for multiple API keys
      const keyRotator = new GeminiKeyRotator(env);

      for (const lang of languagesToGenerate) {
        try {
          // Build slug: {lang}/cosmic-weather/{YYYY-MM-DD}
          const slug = `${lang}/cosmic-weather/${targetDate}`;

          // Check if content already exists for this date/language
          const existing = await env.DB.prepare(`
            SELECT id FROM cms_cosmic_content
            WHERE slug = ? AND content_type = 'daily_weather'
          `).bind(slug).first();

          if (existing) {
            console.log(`[DAILY-UPDATE] Content already exists for ${slug}, skipping`);
            languagesCompleted.push(lang);
            continue;
          }

          // Create placeholder entry (unpublished draft)
          const contentId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO cms_cosmic_content (
              id, slug, canonical_slug, content_type, language, title,
              content_blocks, published, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            contentId,
            slug,
            `cosmic-weather/${targetDate}`,
            'daily_weather',
            lang,
            `Cosmic Weather - ${targetDate}`,
            '[]', // Empty content blocks placeholder
            0, // Not published yet
            new Date().toISOString(),
            new Date().toISOString()
          ).run();

          // Generate content using Gemini with key rotation
          const content = await generateCosmicWeatherContent(env, targetDate, lang, keyRotator);

          if (content) {
            // Update the entry with generated content
            await updateCosmicWeatherContent(env.DB, contentId, content);
            contentGenerated++;
            languagesCompleted.push(lang);
            console.log(`[DAILY-UPDATE] Generated content for ${slug}`);
          } else {
            // Delete failed placeholder entry
            await env.DB.prepare(`
              DELETE FROM cms_cosmic_content WHERE id = ?
            `).bind(contentId).run();
            errors++;
          }
        } catch (error) {
          console.error(`[DAILY-UPDATE] Error generating content for ${lang}:`, error);
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
        console.log(`[DAILY-UPDATE] Updating ${usersToUpdate.length} user snapshots...`);

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

    console.log(`[DAILY-UPDATE] Completed: ${contentGenerated} content, ${snapshotsCreated} snapshots, ${errors} errors`);

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
  meta_description: string;
  hero_content: string;
  content_blocks: any[];
  faqs: { question: string; answer: string }[];
  schema_markup: any;
  word_count: number;
  quality_score: number;
  vector: number[];
  dominant: {
    dimension: string;
    symbol: string;
    name: string;
    value: number;
  };
}

/**
 * Generate cosmic weather content using Gemini API with key rotation
 */
async function generateCosmicWeatherContent(
  env: Env,
  date: string,
  language: SupportedLanguage,
  keyRotator: GeminiKeyRotator
): Promise<CosmicWeatherContent | null> {
  // Get the 8 Mu vector for this date
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
    // Get rotated API key
    const apiKey = keyRotator.getNextKey();

    // Call Gemini API with rotated key
    const response = await callGeminiAPI(apiKey, prompt, keyRotator);

    if (!response) {
      console.error(`[GEMINI] No response for ${language}`);
      return null;
    }

    // Parse and validate response
    const parsed = parseGeminiResponse(response);

    if (!parsed || !parsed.poetic_opening) {
      console.error(`[GEMINI] Invalid response structure for ${language}`);
      return null;
    }

    // Build content blocks
    const contentBlocks = [
      { type: 'poetic_opening', content: parsed.poetic_opening || '' },
      { type: 'overall_energy', content: parsed.overall_cosmic_energy || '' },
      { type: 'highlighted_dimensions', content: parsed.highlighted_dimensions || [] },
      { type: 'practical_guidance', content: parsed.practical_guidance || '' },
      { type: 'morning_focus', content: parsed.morning_focus || '' },
      { type: 'afternoon_energy', content: parsed.afternoon_energy || '' },
      { type: 'evening_reflection', content: parsed.evening_reflection || '' },
      { type: 'daily_question', content: parsed.daily_question || '' },
      { type: 'affirmation', content: parsed.affirmation || '' }
    ];

    // Build FAQs
    const faqs = parsed.faqs || [
      { question: 'What does today\'s cosmic weather mean for me?', answer: parsed.practical_guidance || '' }
    ];

    // Calculate word count
    const wordCount = countWords(JSON.stringify(parsed));

    // Calculate quality score
    const qualityScore = calculateQualityScore(parsed, wordCount);

    // Build schema markup
    const schemaMarkup = buildSchemaMarkup(date, parsed);

    return {
      title: parsed.title || `Cosmic Weather for ${date}`,
      meta_description: parsed.meta_description || parsed.overall_cosmic_energy?.substring(0, 160) || '',
      hero_content: parsed.poetic_opening || '',
      content_blocks: contentBlocks,
      faqs,
      schema_markup: schemaMarkup,
      word_count: wordCount,
      quality_score: qualityScore,
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

## Generate cosmic weather content including:
1. A poetic opening statement (2-3 sentences, evocative but grounded)
2. Overall cosmic energy for the day (2-3 paragraphs)
3. Which dimensions are highlighted and why (list top 3 with brief explanation)
4. Practical guidance for navigating the day (actionable, specific)

## Return JSON matching this structure:

{
  "title": "Cosmic Weather for ${date}",
  "meta_description": "SEO meta description (max 160 chars)",
  "poetic_opening": "A poetic 2-3 sentence opening that captures the day's essence",
  "overall_cosmic_energy": "2-3 paragraph overview of the day's energy (200-300 words)",
  "highlighted_dimensions": [
    {"dimension": "${dominant.symbol}", "name": "${dominant.name}", "value": ${dominant.value}, "guidance": "1-2 sentences"}
  ],
  "practical_guidance": "3-4 actionable suggestions for the day (150-200 words)",
  "morning_focus": "2-3 sentences for morning energy",
  "afternoon_energy": "2-3 sentences for afternoon activities",
  "evening_reflection": "2-3 sentences for evening wind-down",
  "daily_question": "One contemplative question for self-reflection",
  "affirmation": "Daily affirmation aligned with the dominant dimension",
  "faqs": [
    {"question": "What does ${dominant.name} dominant mean?", "answer": "Brief explanation"},
    {"question": "How can I work with today's energy?", "answer": "Practical guidance"}
  ]
}

If language is not English, translate all content naturally into ${languageNames[language]}.
Return ONLY valid JSON, no markdown code blocks.`;
}

/**
 * Update cosmic weather content in cms_cosmic_content table
 */
async function updateCosmicWeatherContent(
  db: D1Database,
  contentId: string,
  content: CosmicWeatherContent
): Promise<void> {
  await db.prepare(`
    UPDATE cms_cosmic_content SET
      title = ?,
      meta_description = ?,
      hero_content = ?,
      content_blocks = ?,
      faqs = ?,
      schema_markup = ?,
      quality_score = ?,
      word_count = ?,
      published = 1,
      updated_at = ?
    WHERE id = ?
  `).bind(
    content.title,
    content.meta_description,
    content.hero_content,
    JSON.stringify(content.content_blocks),
    JSON.stringify(content.faqs),
    JSON.stringify(content.schema_markup),
    content.quality_score,
    content.word_count,
    new Date().toISOString(),
    contentId
  ).run();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Calculate quality score based on content completeness
 */
function calculateQualityScore(parsed: any, wordCount: number): number {
  let score = 0;

  // Word count (0-30 points)
  if (wordCount >= 500) score += 30;
  else if (wordCount >= 300) score += 20;
  else if (wordCount >= 100) score += 10;

  // Has poetic opening (0-15 points)
  if (parsed.poetic_opening && parsed.poetic_opening.length >= 50) score += 15;

  // Has overall energy (0-15 points)
  if (parsed.overall_cosmic_energy && parsed.overall_cosmic_energy.length >= 200) score += 15;

  // Has highlighted dimensions (0-20 points)
  if (parsed.highlighted_dimensions && parsed.highlighted_dimensions.length >= 3) score += 20;
  else if (parsed.highlighted_dimensions && parsed.highlighted_dimensions.length >= 1) score += 10;

  // Has practical guidance (0-20 points)
  if (parsed.practical_guidance && parsed.practical_guidance.length >= 100) score += 20;
  else if (parsed.practical_guidance && parsed.practical_guidance.length >= 50) score += 10;

  return Math.min(score, 100);
}

/**
 * Build schema.org markup for SEO
 */
function buildSchemaMarkup(date: string, parsed: any): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: parsed.title || `Cosmic Weather for ${date}`,
    description: parsed.meta_description || parsed.overall_cosmic_energy?.substring(0, 160),
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: 'The Realm of Patterns'
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Realm of Patterns',
      logo: 'https://therealmofpatterns.com/logo.png'
    }
  };
}

/**
 * API Key Rotator - cycles through multiple Gemini keys for higher daily limits
 */
class GeminiKeyRotator {
  private keys: string[] = [];
  private currentIndex = 0;
  private errorCounts: Map<string, number> = new Map();

  constructor(env: Env) {
    // Load all available keys
    if (env.GEMINI_API_KEY) this.keys.push(env.GEMINI_API_KEY);
    if (env.GEMINI_API_KEY_2) this.keys.push(env.GEMINI_API_KEY_2);
    if (env.GEMINI_API_KEY_3) this.keys.push(env.GEMINI_API_KEY_3);
    if (env.GEMINI_API_KEY_4) this.keys.push(env.GEMINI_API_KEY_4);
    if (env.GEMINI_API_KEY_5) this.keys.push(env.GEMINI_API_KEY_5);
    if (env.GEMINI_API_KEY_6) this.keys.push(env.GEMINI_API_KEY_6);

    console.log(`[GEMINI] Loaded ${this.keys.length} API keys for rotation`);
  }

  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }

    // Skip keys with too many errors
    let attempts = 0;
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;

      const errors = this.errorCounts.get(key) || 0;
      if (errors < 3) {
        return key;
      }
      attempts++;
    }

    // All keys exhausted, return first anyway
    return this.keys[0];
  }

  reportError(key: string): void {
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
    console.warn(`[GEMINI] Key error count: ${current + 1}`);
  }
}

/**
 * Call Gemini API with key rotation
 */
async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  keyRotator?: GeminiKeyRotator
): Promise<any | null> {
  // Use Gemini 2.0 Flash - stable production model
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  try {
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[GEMINI] API error ${response.status}:`, error);

      // Report error for key rotation
      if (keyRotator) {
        keyRotator.reportError(apiKey);
      }
      return null;
    }

    const result = await response.json() as any;
    return result;
  } catch (error) {
    console.error('[GEMINI] Fetch error:', error);
    if (keyRotator) {
      keyRotator.reportError(apiKey);
    }
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
      return null;
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
    return null;
  }
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
    ? `Threshold Alert: ${snapshot.failure_mode} Mode`
    : `Daily UV Update: ${snapshot.dominant.symbol} Dominant`;

  const body = alertsTriggered > 0
    ? `Your UV metrics have triggered ${alertsTriggered} alert(s).\n\nCurrent Status:\n- kappa: ${snapshot.kappa_bar.toFixed(3)}\n- RU: ${snapshot.RU.toFixed(2)}\n- Failure Mode: ${snapshot.failure_mode}`
    : `Your daily Universal Vector update is ready.\n\nDominant: ${snapshot.dominant.name}\nkappa: ${snapshot.kappa_bar.toFixed(3)}\nRU: ${snapshot.RU.toFixed(2)}\nElder Progress: ${(snapshot.elder_progress * 100).toFixed(1)}%`;

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
    first_healthy: 'First Healthy State',
    kappa_85: 'High Coupling (kappa >= 0.85)',
    ru_45: 'High Resonance (RU >= 45)',
    w_25: 'Strong Witness (W >= 2.5)',
    elder_48h: 'Elder Attractor Reached'
  };

  const subject = `${milestoneNames[milestoneType]} - Milestone Achieved!`;
  const body = `Congratulations! You've achieved a new milestone in your journey.\n\n${milestoneNames[milestoneType]}\n\nYour current metrics:\n- kappa: ${snapshot.kappa_bar.toFixed(3)}\n- RU: ${snapshot.RU.toFixed(2)}\n- W: ${snapshot.W.toFixed(2)}\n- Elder Progress: ${(snapshot.elder_progress * 100).toFixed(1)}%`;

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
