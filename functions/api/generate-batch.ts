/**
 * POST /api/generate-batch
 * Process content generation queue in batches
 *
 * Called by:
 * 1. Cloudflare Cron at 06:00 UTC
 * 2. Manual trigger from admin dashboard
 *
 * Features:
 * - Gets next N items from content_queue by priority
 * - Loads voice config for each language
 * - Generates content using Gemini API with key rotation
 * - Publishes to D1 (cosmic_content table)
 * - Marks queue items as complete/failed
 * - Returns summary with token usage
 */

import { Env } from '../../src/types';

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'pt-br', 'pt-pt', 'es-mx', 'es-ar', 'es-es'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Content types for generation
type ContentType =
  | 'dimension_guide'
  | 'jungian_concept'
  | 'historical_figure'
  | 'historical_era'
  | 'vedic_dasha'
  | 'transit_guide'
  | 'compatibility';

// 8 Mu Dimensions metadata
const MU_DIMENSIONS: Record<string, { symbol: string; name: string; planet: string; domain: string }> = {
  phase: { symbol: 'P', name: 'Phase', planet: 'Sun', domain: 'Identity, Will, Direction' },
  existence: { symbol: 'E', name: 'Existence', planet: 'Saturn', domain: 'Structure, Form, Stability' },
  cognition: { symbol: 'mu', name: 'Cognition', planet: 'Mercury', domain: 'Mind, Communication, Thought' },
  value: { symbol: 'V', name: 'Value', planet: 'Venus', domain: 'Beauty, Harmony, Worth' },
  expansion: { symbol: 'N', name: 'Expansion', planet: 'Jupiter', domain: 'Growth, Meaning, Philosophy' },
  action: { symbol: 'Delta', name: 'Delta/Action', planet: 'Mars', domain: 'Force, Will, Movement' },
  relation: { symbol: 'R', name: 'Relation', planet: 'Moon', domain: 'Connection, Emotion, Care' },
  field: { symbol: 'Phi', name: 'Field', planet: 'Neptune', domain: 'Presence, Unity, Transcendence' }
};

interface RequestBody {
  batch_size?: number; // Default: 10
  content_types?: ContentType[]; // Optional: filter by content type
  languages?: SupportedLanguage[]; // Optional: filter by language
  admin_key?: string; // Required for manual trigger
}

interface QueueItem {
  id: string;
  content_type: ContentType;
  language: SupportedLanguage;
  params: string; // JSON string
  priority_score: number;
  status: string;
  created_at: string;
  attempts?: number;
}

interface GenerationResult {
  id: string;
  status: 'completed' | 'failed';
  tokens_used?: number;
  error?: string;
}

interface BatchResponse {
  success: boolean;
  generated: number;
  failed: number;
  tokens_used: number;
  items: GenerationResult[];
  error?: {
    code: string;
    message: string;
  };
}

interface VoiceConfig {
  voice_name: string;
  tone: string;
  style: string;
  cultural_references?: string[];
  unique_concepts?: Record<string, string>;
}

interface GeneratedContent {
  title: string;
  meta_description: string;
  slug: string;
  content_blocks: any[];
  faqs?: { question: string; answer: string }[];
  schema_markup?: any;
  word_count: number;
  quality_score: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RequestBody = await request.json();

    // Check authorization - ADMIN_KEY must be configured in environment
    const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
    if (!env.ADMIN_KEY) {
      console.error('[BATCH] ADMIN_KEY not configured in environment');
      return errorResponse('CONFIGURATION_ERROR', 'Admin key not configured', 500);
    }

    if (adminKey !== env.ADMIN_KEY) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    const batchSize = Math.min(body.batch_size || 10, 20); // Max 20 items per batch
    console.log(`[BATCH] Processing up to ${batchSize} items from queue...`);

    // Get next items from queue
    const queueItems = await getQueueItems(env.DB, batchSize, body.content_types, body.languages);

    if (queueItems.length === 0) {
      console.log('[BATCH] No items in queue to process');
      return jsonResponse({
        success: true,
        generated: 0,
        failed: 0,
        tokens_used: 0,
        items: [],
      });
    }

    console.log(`[BATCH] Found ${queueItems.length} items to process`);

    // Initialize key rotator
    const keyRotator = new GeminiKeyRotator(env);

    // Process each item
    const results: GenerationResult[] = [];
    let totalTokens = 0;
    let generated = 0;
    let failed = 0;

    for (const item of queueItems) {
      // Mark as processing
      await updateQueueStatus(env.DB, item.id, 'processing');

      try {
        // Load voice config for language
        const voice = await getVoiceConfig(env.DB, item.language);

        // Parse params
        const params = JSON.parse(item.params || '{}');

        // Generate content based on type
        const content = await generateContent(
          env,
          item.content_type,
          item.language,
          params,
          voice,
          keyRotator
        );

        if (content) {
          // Publish to D1
          await publishContent(env.DB, item.content_type, item.language, content);

          // Mark queue item as completed
          await updateQueueStatus(env.DB, item.id, 'completed');

          totalTokens += content.word_count * 1.5; // Rough token estimate
          generated++;

          results.push({
            id: item.id,
            status: 'completed',
            tokens_used: Math.round(content.word_count * 1.5),
          });

          console.log(`[BATCH] Generated ${item.content_type}/${item.language}: ${content.title}`);
        } else {
          throw new Error('No content generated');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[BATCH] Failed to generate ${item.id}:`, errorMessage);

        // Mark as failed with error message
        await updateQueueStatus(env.DB, item.id, 'failed', errorMessage);

        failed++;
        results.push({
          id: item.id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    // Log stats
    await logGenerationStats(env.DB, generated, failed, Math.round(totalTokens));

    const response: BatchResponse = {
      success: true,
      generated,
      failed,
      tokens_used: Math.round(totalTokens),
      items: results,
    };

    console.log(`[BATCH] Completed: ${generated} generated, ${failed} failed, ~${Math.round(totalTokens)} tokens`);

    return jsonResponse(response);

  } catch (error) {
    console.error('Batch generation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to process batch', 500);
  }
};

// ============================================
// Queue Management
// ============================================

async function getQueueItems(
  db: D1Database,
  limit: number,
  contentTypes?: ContentType[],
  languages?: SupportedLanguage[]
): Promise<QueueItem[]> {
  let query = `
    SELECT id, content_type, language, params, priority_score, status, created_at, attempts
    FROM content_queue
    WHERE status = 'pending'
  `;

  const bindings: any[] = [];

  if (contentTypes && contentTypes.length > 0) {
    query += ` AND content_type IN (${contentTypes.map(() => '?').join(', ')})`;
    bindings.push(...contentTypes);
  }

  if (languages && languages.length > 0) {
    query += ` AND language IN (${languages.map(() => '?').join(', ')})`;
    bindings.push(...languages);
  }

  query += ` ORDER BY priority_score DESC, created_at ASC LIMIT ?`;
  bindings.push(limit);

  const stmt = db.prepare(query);
  const { results } = await stmt.bind(...bindings).all();

  return (results || []) as unknown as QueueItem[];
}

async function updateQueueStatus(
  db: D1Database,
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  if (status === 'processing') {
    await db.prepare(`
      UPDATE content_queue
      SET status = ?, started_at = ?, attempts = COALESCE(attempts, 0) + 1
      WHERE id = ?
    `).bind(status, new Date().toISOString(), id).run();
  } else if (status === 'completed') {
    await db.prepare(`
      UPDATE content_queue
      SET status = ?, completed_at = ?
      WHERE id = ?
    `).bind(status, new Date().toISOString(), id).run();
  } else if (status === 'failed') {
    await db.prepare(`
      UPDATE content_queue
      SET status = ?, error_message = ?
      WHERE id = ?
    `).bind(status, errorMessage || 'Unknown error', id).run();
  }
}

async function logGenerationStats(
  db: D1Database,
  generated: number,
  failed: number,
  tokensUsed: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const apiKeySuffix = 'batch-gen'; // Identifier for batch generation

  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO generation_stats (id, date, api_key_suffix, pages_generated, errors, tokens_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date, api_key_suffix) DO UPDATE SET
        pages_generated = pages_generated + excluded.pages_generated,
        errors = errors + excluded.errors,
        tokens_used = tokens_used + excluded.tokens_used
    `).bind(
      id,
      today,
      apiKeySuffix,
      generated,
      failed,
      tokensUsed,
      new Date().toISOString()
    ).run();
  } catch (error) {
    console.error('[STATS] Failed to log generation stats:', error);
  }
}

// ============================================
// Voice Configuration
// ============================================

async function getVoiceConfig(
  db: D1Database,
  language: SupportedLanguage
): Promise<VoiceConfig> {
  try {
    const result = await db.prepare(`
      SELECT voice_name, tone, style, cultural_references, unique_concepts
      FROM content_voices
      WHERE language_code = ?
    `).bind(language).first();

    if (result) {
      return {
        voice_name: result.voice_name as string,
        tone: result.tone as string || 'warm, insightful',
        style: result.style as string || 'clear, poetic but grounded',
        cultural_references: result.cultural_references
          ? JSON.parse(result.cultural_references as string)
          : [],
        unique_concepts: result.unique_concepts
          ? JSON.parse(result.unique_concepts as string)
          : {},
      };
    }
  } catch (error) {
    console.error(`[VOICE] Error fetching voice config for ${language}:`, error);
  }

  // Default voice
  return {
    voice_name: 'Pattern Guide',
    tone: 'warm, insightful, poetic without being flowery',
    style: 'grounded mysticism, invitational not prescriptive',
  };
}

// ============================================
// Content Generation
// ============================================

async function generateContent(
  _env: Env,
  contentType: ContentType,
  language: SupportedLanguage,
  params: Record<string, any>,
  voice: VoiceConfig,
  keyRotator: GeminiKeyRotator
): Promise<GeneratedContent | null> {
  // Build prompt based on content type
  const prompt = buildContentPrompt(contentType, language, params, voice);

  // Get API key
  const apiKey = keyRotator.getNextKey();

  // Call Gemini API
  const response = await callGeminiAPI(apiKey, prompt, keyRotator);

  if (!response) {
    return null;
  }

  // Parse response
  const parsed = parseGeminiResponse(response);

  if (!parsed || !parsed.title) {
    return null;
  }

  // Build slug
  const slug = buildSlug(contentType, language, params, parsed.title);

  // Calculate quality score
  const wordCount = countWords(JSON.stringify(parsed));
  const qualityScore = calculateQualityScore(parsed, wordCount);

  return {
    title: parsed.title,
    meta_description: parsed.meta_description || parsed.summary?.substring(0, 160) || '',
    slug,
    content_blocks: parsed.content_blocks || [
      { type: 'intro', content: parsed.overview || parsed.summary || '' },
      { type: 'body', content: parsed.main_content || '' },
      { type: 'guidance', content: parsed.practical_guidance || '' },
    ],
    faqs: parsed.faqs,
    schema_markup: buildSchemaMarkup(contentType, parsed),
    word_count: wordCount,
    quality_score: qualityScore,
  };
}

function buildContentPrompt(
  contentType: ContentType,
  language: SupportedLanguage,
  params: Record<string, any>,
  voice: VoiceConfig
): string {
  const languageNames: Record<SupportedLanguage, string> = {
    'en': 'English',
    'pt-br': 'Brazilian Portuguese',
    'pt-pt': 'European Portuguese',
    'es-mx': 'Mexican Spanish',
    'es-ar': 'Argentine Spanish',
    'es-es': 'Castilian Spanish',
  };

  const baseContext = `You are a content generator for "The Realm of Patterns," a platform that bridges ancient wisdom traditions with modern psychology through the FRC 16D framework.

## Writing Voice: ${voice.voice_name}
Tone: ${voice.tone}
Style: ${voice.style}
${voice.cultural_references ? `Cultural References: ${voice.cultural_references.join(', ')}` : ''}

## Core Principles
- Describe patterns, not predictions
- Empower self-understanding, not dependency
- Use "resonance" not "compatibility"
- Speak of "tendencies" not "destinies"

## Language: ${languageNames[language]}
`;

  // Content type specific prompts
  switch (contentType) {
    case 'dimension_guide':
      const dim = params.dimension || 'phase';
      const dimInfo = MU_DIMENSIONS[dim];
      return `${baseContext}

## Task: Generate Dimension Guide for "${dimInfo?.name || dim}"

Symbol: ${dimInfo?.symbol}
Planet: ${dimInfo?.planet}
Domain: ${dimInfo?.domain}

Create a comprehensive guide covering:
1. Core meaning and essence
2. How it manifests in personality
3. Shadow aspects when unbalanced
4. Integration practices
5. Famous figures who embody this dimension
6. 3-5 FAQs

Return JSON:
{
  "title": "Guide title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "2-3 paragraph intro",
  "main_content": "Detailed content (500-800 words)",
  "practical_guidance": "Actionable practices",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON, no markdown code blocks.`;

    case 'jungian_concept':
      const concept = params.concept || 'shadow';
      return `${baseContext}

## Task: Generate Jungian Concept Guide for "${concept}"

Create content explaining:
1. Jung's original definition and context
2. How it maps to the 16D FRC framework
3. Practical recognition of this concept in daily life
4. Integration exercises
5. Common misconceptions
6. 3-5 FAQs

Return JSON:
{
  "title": "Guide title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Jung's definition in accessible terms",
  "main_content": "Deep exploration (600-900 words)",
  "practical_guidance": "Integration practices",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;

    case 'historical_figure':
      const figure = params.figure || 'rumi';
      const figureName = params.name || figure;
      return `${baseContext}

## Task: Generate Historical Figure Profile for "${figureName}"

Create content including:
1. Brief biographical context
2. Their cosmic signature (hypothetical 8D profile based on their life/work)
3. Key teachings or contributions through the lens of FRC
4. How to resonate with their pattern
5. Quotes that illustrate their dimensions
6. 3-5 FAQs

Return JSON:
{
  "title": "Profile title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Who they were and their significance",
  "main_content": "Deep analysis (600-800 words)",
  "cosmic_signature": [0.8, 0.4, 0.7, 0.9, 0.6, 0.5, 0.8, 0.9],
  "key_quotes": ["Quote 1", "Quote 2", "Quote 3"],
  "practical_guidance": "How to learn from their pattern",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;

    case 'historical_era':
      const era = params.era || 'islamic-golden-age';
      return `${baseContext}

## Task: Generate Historical Era Guide for "${era}"

Create content covering:
1. Time period and cultural context
2. Major figures and their contributions
3. How this era understood cosmic patterns
4. Legacy in modern understanding
5. Key concepts that originated in this era
6. 3-5 FAQs

Return JSON:
{
  "title": "Era title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Historical context",
  "main_content": "Deep exploration (600-900 words)",
  "key_figures": ["Figure 1", "Figure 2"],
  "key_concepts": ["Concept 1", "Concept 2"],
  "practical_guidance": "What we can learn today",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;

    case 'vedic_dasha':
      const dasha = params.dasha || 'saturn';
      return `${baseContext}

## Task: Generate Vedic Dasha Guide for "${dasha}"

Create content including:
1. Traditional Vedic understanding
2. How it maps to FRC dimensions
3. Typical life themes during this period
4. Integration practices
5. Common experiences
6. 3-5 FAQs

Return JSON:
{
  "title": "Dasha title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Vedic foundation",
  "main_content": "Comprehensive guide (600-800 words)",
  "practical_guidance": "Navigation strategies",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;

    case 'transit_guide':
      const transit = params.transit || 'jupiter';
      return `${baseContext}

## Task: Generate Transit Guide for "${transit}"

Create content covering:
1. Nature of this transit
2. Which dimensions it activates
3. Typical duration and phases
4. Opportunities and challenges
5. Practical navigation tips
6. 3-5 FAQs

Return JSON:
{
  "title": "Transit title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Transit overview",
  "main_content": "Detailed exploration (500-700 words)",
  "practical_guidance": "How to work with this transit",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;

    case 'compatibility':
      const dim1 = params.dimension1 || 'phase';
      const dim2 = params.dimension2 || 'relation';
      return `${baseContext}

## Task: Generate Resonance Guide for "${dim1}" + "${dim2}"

Create content exploring:
1. How these dimensions interact
2. Strengths of this combination
3. Potential tensions
4. Integration practices for both
5. Famous partnerships with this dynamic
6. 3-5 FAQs

Return JSON:
{
  "title": "Resonance title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Dynamic overview",
  "main_content": "Deep exploration (600-800 words)",
  "practical_guidance": "How to harmonize these dimensions",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;

    default:
      return `${baseContext}

## Task: Generate content about ${contentType}

Parameters: ${JSON.stringify(params)}

Return JSON:
{
  "title": "Content title",
  "meta_description": "SEO meta (max 160 chars)",
  "overview": "Introduction",
  "main_content": "Main content (500-800 words)",
  "practical_guidance": "Actionable guidance",
  "faqs": [{"question": "...", "answer": "..."}]
}

Return ONLY valid JSON.`;
  }
}

function buildSlug(
  contentType: ContentType,
  language: SupportedLanguage,
  params: Record<string, any>,
  _title: string
): string {
  // Localized type slugs
  const typeSlugMap: Record<ContentType, Record<SupportedLanguage, string>> = {
    'dimension_guide': {
      'en': 'dimension', 'pt-br': 'dimensao', 'pt-pt': 'dimensao',
      'es-mx': 'dimension', 'es-ar': 'dimension', 'es-es': 'dimension',
    },
    'jungian_concept': {
      'en': 'jungian', 'pt-br': 'junguiano', 'pt-pt': 'junguiano',
      'es-mx': 'junguiano', 'es-ar': 'junguiano', 'es-es': 'junguiano',
    },
    'historical_figure': {
      'en': 'figure', 'pt-br': 'figura', 'pt-pt': 'figura',
      'es-mx': 'figura', 'es-ar': 'figura', 'es-es': 'figura',
    },
    'historical_era': {
      'en': 'era', 'pt-br': 'era', 'pt-pt': 'era',
      'es-mx': 'era', 'es-ar': 'era', 'es-es': 'era',
    },
    'vedic_dasha': {
      'en': 'dasha', 'pt-br': 'dasha', 'pt-pt': 'dasha',
      'es-mx': 'dasha', 'es-ar': 'dasha', 'es-es': 'dasha',
    },
    'transit_guide': {
      'en': 'transit', 'pt-br': 'transito', 'pt-pt': 'transito',
      'es-mx': 'transito', 'es-ar': 'transito', 'es-es': 'transito',
    },
    'compatibility': {
      'en': 'resonance', 'pt-br': 'ressonancia', 'pt-pt': 'ressonancia',
      'es-mx': 'resonancia', 'es-ar': 'resonancia', 'es-es': 'resonancia',
    },
  };

  const typeSlug = typeSlugMap[contentType]?.[language] || contentType;

  // Get the primary param value for the slug
  let paramSlug = '';
  if (params.dimension) paramSlug = params.dimension;
  else if (params.concept) paramSlug = params.concept;
  else if (params.figure) paramSlug = params.figure;
  else if (params.era) paramSlug = params.era;
  else if (params.dasha) paramSlug = params.dasha;
  else if (params.transit) paramSlug = params.transit;
  else if (params.dimension1 && params.dimension2) {
    paramSlug = `${params.dimension1}-${params.dimension2}`;
  }

  // Sanitize slug
  paramSlug = paramSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${language}/${typeSlug}/${paramSlug}`;
}

function buildSchemaMarkup(_contentType: ContentType, parsed: any): any {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: parsed.title,
    description: parsed.meta_description || parsed.overview?.substring(0, 160),
    author: {
      '@type': 'Organization',
      name: 'The Realm of Patterns',
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Realm of Patterns',
      logo: 'https://therealmofpatterns.com/logo.png',
    },
    datePublished: new Date().toISOString(),
    dateModified: new Date().toISOString(),
  };

  // Add FAQPage schema if FAQs present
  if (parsed.faqs && parsed.faqs.length > 0) {
    return [
      baseSchema,
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: parsed.faqs.map((faq: any) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ];
  }

  return baseSchema;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function calculateQualityScore(parsed: any, wordCount: number): number {
  let score = 0;

  // Word count (0-30 points)
  if (wordCount >= 500) score += 30;
  else if (wordCount >= 300) score += 20;
  else if (wordCount >= 100) score += 10;

  // Has title (0-15 points)
  if (parsed.title && parsed.title.length >= 10) score += 15;

  // Has meta description (0-15 points)
  if (parsed.meta_description && parsed.meta_description.length >= 50) score += 15;

  // Has FAQs (0-20 points)
  if (parsed.faqs && parsed.faqs.length >= 3) score += 20;
  else if (parsed.faqs && parsed.faqs.length >= 1) score += 10;

  // Has practical guidance (0-20 points)
  if (parsed.practical_guidance && parsed.practical_guidance.length >= 100) score += 20;
  else if (parsed.practical_guidance && parsed.practical_guidance.length >= 50) score += 10;

  return Math.min(score, 100);
}

// ============================================
// Content Publishing
// ============================================

async function publishContent(
  db: D1Database,
  contentType: ContentType,
  language: SupportedLanguage,
  content: GeneratedContent
): Promise<void> {
  const id = crypto.randomUUID();
  const canonicalSlug = content.slug.split('/').slice(1).join('/'); // Remove language prefix

  await db.prepare(`
    INSERT OR REPLACE INTO cms_cosmic_content (
      id, slug, canonical_slug, content_type, language, title, meta_description,
      hero_content, content_blocks, faqs, schema_markup, quality_score, word_count,
      published, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    content.slug,
    canonicalSlug,
    contentType,
    language,
    content.title,
    content.meta_description,
    content.content_blocks[0]?.content || '', // Hero content from first block
    JSON.stringify(content.content_blocks),
    JSON.stringify(content.faqs || []),
    JSON.stringify(content.schema_markup),
    content.quality_score,
    content.word_count,
    1, // published = true
    new Date().toISOString(),
    new Date().toISOString()
  ).run();
}

// ============================================
// Gemini API
// ============================================

class GeminiKeyRotator {
  private keys: string[] = [];
  private currentIndex = 0;
  private errorCounts: Map<string, number> = new Map();

  constructor(env: Env) {
    if (env.GEMINI_API_KEY) this.keys.push(env.GEMINI_API_KEY);
    if (env.GEMINI_API_KEY_2) this.keys.push(env.GEMINI_API_KEY_2);
    if (env.GEMINI_API_KEY_3) this.keys.push(env.GEMINI_API_KEY_3);
    if (env.GEMINI_API_KEY_4) this.keys.push(env.GEMINI_API_KEY_4);
    if (env.GEMINI_API_KEY_5) this.keys.push(env.GEMINI_API_KEY_5);
    if (env.GEMINI_API_KEY_6) this.keys.push(env.GEMINI_API_KEY_6);
    if (env.GEMINI_API_KEY_7) this.keys.push(env.GEMINI_API_KEY_7);
    if (env.GEMINI_API_KEY_8) this.keys.push(env.GEMINI_API_KEY_8);
    if (env.GEMINI_API_KEY_9) this.keys.push(env.GEMINI_API_KEY_9);
    if (env.GEMINI_API_KEY_10) this.keys.push(env.GEMINI_API_KEY_10);
    if (env.GEMINI_API_KEY_11) this.keys.push(env.GEMINI_API_KEY_11);

    console.log(`[GEMINI] Loaded ${this.keys.length} API keys for rotation`);
  }

  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured');
    }

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

    return this.keys[0];
  }

  reportError(key: string): void {
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);
    console.warn(`[GEMINI] Key error count: ${current + 1}`);
  }
}

async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  keyRotator?: GeminiKeyRotator
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
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[GEMINI] API error ${response.status}:`, error);
      if (keyRotator) keyRotator.reportError(apiKey);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[GEMINI] Fetch error:', error);
    if (keyRotator) keyRotator.reportError(apiKey);
    return null;
  }
}

function parseGeminiResponse(response: any): any {
  try {
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[GEMINI] No text in response');
      return null;
    }

    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
    if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
    if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);

    return JSON.parse(cleanText.trim());
  } catch (error) {
    console.error('[GEMINI] Parse error:', error);
    return null;
  }
}

// ============================================
// Response Helpers
// ============================================

function jsonResponse(data: any): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    generated: 0,
    failed: 0,
    tokens_used: 0,
    items: [],
    error: { code, message },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
