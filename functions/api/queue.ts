/**
 * Content Queue API
 *
 * Manages the priority-based content generation queue.
 *
 * Endpoints:
 * - GET  /api/queue/next?limit=10    Get next batch of items to process
 * - POST /api/queue/seed             Seed queue with content combinations
 * - POST /api/queue/complete         Mark item as complete/failed
 * - GET  /api/queue/stats            Get queue statistics
 */

import { Env } from '../../src/types';

// ============================================
// Types
// ============================================

interface QueueItem {
  id: string;
  content_type: string;
  language: string;
  params: Record<string, unknown>;
  priority_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avg_priority: number;
  by_language: Record<string, number>;
  by_content_type: Record<string, number>;
}

interface SeedRequest {
  languages?: string[];
  content_types?: string[];
  admin_key?: string;
}

interface CompleteRequest {
  id: string;
  success: boolean;
  error?: string;
  admin_key?: string;
}

// ============================================
// Constants - Priority Weights
// ============================================

const LANGUAGE_WEIGHTS: Record<string, number> = {
  'en': 10,
  'es-mx': 8,
  'es-ar': 7,
  'es-es': 6,
  'pt-br': 7,
  'pt-pt': 5,
};

const CONTENT_TYPE_WEIGHTS: Record<string, number> = {
  'dimension_guide': 10,
  'jungian_concept': 9,
  'historical_figure': 8,
  'historical_era': 7,
  'compatibility_type': 7,
  'vedic_dasha': 6,
  'transit_guide': 6,
  'daily_weather': 5,
  'weekly_forecast': 5,
  'blog_post': 4,
  'archetype_profile': 6,
};

const DIMENSION_WEIGHTS: Record<string, number> = {
  'phase': 10,
  'relation': 9,
  'value': 8,
  'field': 7,
  'action': 7,
  'expansion': 6,
  'cognition': 6,
  'existence': 5,
};

// All available options
const ALL_LANGUAGES = Object.keys(LANGUAGE_WEIGHTS);
const ALL_CONTENT_TYPES = Object.keys(CONTENT_TYPE_WEIGHTS);
const ALL_DIMENSIONS = Object.keys(DIMENSION_WEIGHTS);

const HISTORICAL_FIGURES = [
  'rumi', 'jung', 'tesla', 'frida-kahlo', 'marcus-aurelius',
  'hildegard-of-bingen', 'pythagoras', 'hypatia', 'lao-tzu',
  'rabindranath-tagore', 'marie-curie', 'leonardo-da-vinci',
  'buddha', 'krishna', 'jesus', 'muhammad', 'moses',
  'plato', 'aristotle', 'socrates', 'confucius',
  'albert-einstein', 'carl-sagan', 'nikola-tesla',
  'mahatma-gandhi', 'martin-luther-king', 'nelson-mandela',
];

const JUNGIAN_CONCEPTS = [
  'shadow', 'anima', 'animus', 'persona', 'self',
  'individuation', 'archetype', 'complex', 'projection', 'synchronicity',
];

const HISTORICAL_ERAS = [
  'ancient-origins', 'classical-period', 'islamic-golden-age',
  'renaissance-revival', 'modern-rebirth',
];

const VEDIC_PLANETS = [
  'sun', 'moon', 'mars', 'rahu', 'jupiter',
  'saturn', 'mercury', 'ketu', 'venus',
];

const TRANSIT_PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];

// Top-tier figures for priority bonus
const TOP_FIGURES = ['rumi', 'jung', 'buddha', 'jesus', 'leonardo-da-vinci', 'einstein'];

// ============================================
// Helper Functions
// ============================================

function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    error: { code, message }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({
    success: true,
    ...data
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function generateId(): string {
  return crypto.randomUUID();
}

function calculatePriority(
  language: string,
  contentType: string,
  dimension?: string,
  figure?: string
): number {
  let score = 0;

  // Language weight
  score += LANGUAGE_WEIGHTS[language] ?? 3;

  // Content type weight
  score += CONTENT_TYPE_WEIGHTS[contentType] ?? 3;

  // Dimension weight (if applicable)
  if (dimension) {
    score += DIMENSION_WEIGHTS[dimension] ?? 5;
  }

  // Figure popularity bonus
  if (figure && contentType === 'historical_figure') {
    if (TOP_FIGURES.includes(figure)) {
      score += 3;
    }
  }

  return score;
}

function getParamCombinations(contentType: string): Record<string, unknown>[] {
  switch (contentType) {
    case 'dimension_guide':
      return ALL_DIMENSIONS.map(dim => ({ dimension: dim }));

    case 'historical_figure':
    case 'archetype_profile':
      return HISTORICAL_FIGURES.map(fig => ({ figure: fig }));

    case 'jungian_concept':
      return JUNGIAN_CONCEPTS.map(concept => ({ concept }));

    case 'historical_era':
      return HISTORICAL_ERAS.map(era => ({ era }));

    case 'vedic_dasha':
      return VEDIC_PLANETS.map(planet => ({ planet }));

    case 'transit_guide':
      return TRANSIT_PLANETS.map(planet => ({ planet }));

    case 'compatibility_type':
      // Generate unique dimension pairs
      const pairs: Record<string, unknown>[] = [];
      for (let i = 0; i < ALL_DIMENSIONS.length; i++) {
        for (let j = i + 1; j < ALL_DIMENSIONS.length; j++) {
          pairs.push({
            dimension1: ALL_DIMENSIONS[i],
            dimension2: ALL_DIMENSIONS[j]
          });
        }
      }
      return pairs;

    case 'daily_weather':
    case 'weekly_forecast':
    case 'blog_post':
      // These are generated on-demand, not seeded
      return [];

    default:
      return [{}];
  }
}

function checkAuth(request: Request, env: Env, body?: { admin_key?: string }): boolean {
  // Check for cron header (Cloudflare adds this)
  const cronAuth = request.headers.get('Cf-Cron-Auth');
  if (cronAuth !== null) return true;

  // Check admin key - ADMIN_KEY must be configured in environment
  const adminKey = body?.admin_key || request.headers.get('X-Admin-Key');
  if (!env.ADMIN_KEY) {
    console.error('[QUEUE] ADMIN_KEY not configured in environment');
    return false;
  }

  return adminKey === env.ADMIN_KEY;
}

// ============================================
// Route Handler
// ============================================

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Route to appropriate handler
  if (path.endsWith('/next') && request.method === 'GET') {
    return handleGetNext(request, env);
  } else if (path.endsWith('/seed') && request.method === 'POST') {
    return handleSeed(request, env);
  } else if (path.endsWith('/complete') && request.method === 'POST') {
    return handleComplete(request, env);
  } else if (path.endsWith('/stats') && request.method === 'GET') {
    return handleStats(request, env);
  } else {
    return errorResponse('NOT_FOUND', 'Endpoint not found', 404);
  }
};

// ============================================
// GET /api/queue/next
// ============================================

async function handleGetNext(request: Request, env: Env): Promise<Response> {
  try {
    // Check auth
    if (!checkAuth(request, env)) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);

    // Get next batch of pending items
    const now = new Date().toISOString();
    const result = await env.DB.prepare(`
      SELECT * FROM content_queue
      WHERE status = 'pending'
      ORDER BY priority_score DESC, created_at ASC
      LIMIT ?
    `).bind(limit).all<QueueItem>();

    const items: QueueItem[] = [];

    // Update status to processing
    for (const row of result.results) {
      await env.DB.prepare(`
        UPDATE content_queue
        SET status = 'processing', started_at = ?
        WHERE id = ?
      `).bind(now, row.id).run();

      items.push({
        ...row,
        params: typeof row.params === 'string' ? JSON.parse(row.params) : row.params,
        status: 'processing',
        started_at: now,
      });
    }

    return successResponse({
      items,
      count: items.length,
      retrieved_at: now
    });

  } catch (error) {
    console.error('[QUEUE] Error getting next batch:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get queue items', 500);
  }
}

// ============================================
// POST /api/queue/seed
// ============================================

async function handleSeed(request: Request, env: Env): Promise<Response> {
  try {
    const body: SeedRequest = await request.json();

    // Check auth
    if (!checkAuth(request, env, body)) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    const languages = body.languages || ALL_LANGUAGES;
    const contentTypes = body.content_types || ALL_CONTENT_TYPES;

    let addedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const lang of languages) {
      for (const contentType of contentTypes) {
        const paramSets = getParamCombinations(contentType);

        for (const params of paramSets) {
          const dimension = params.dimension as string | undefined;
          const figure = params.figure as string | undefined;
          const priority = calculatePriority(lang, contentType, dimension, figure);

          const id = generateId();
          const paramsJson = JSON.stringify(params);

          try {
            await env.DB.prepare(`
              INSERT INTO content_queue
              (id, content_type, language, params, priority_score, status, created_at)
              VALUES (?, ?, ?, ?, ?, 'pending', ?)
            `).bind(id, contentType, lang, paramsJson, priority, now).run();

            addedCount++;
          } catch (error) {
            // Likely duplicate (unique constraint)
            skippedCount++;
          }
        }
      }
    }

    return successResponse({
      added: addedCount,
      skipped: skippedCount,
      languages: languages.length,
      content_types: contentTypes.length
    });

  } catch (error) {
    console.error('[QUEUE] Error seeding queue:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to seed queue', 500);
  }
}

// ============================================
// POST /api/queue/complete
// ============================================

async function handleComplete(request: Request, env: Env): Promise<Response> {
  try {
    const body: CompleteRequest = await request.json();

    // Check auth
    if (!checkAuth(request, env, body)) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    if (!body.id) {
      return errorResponse('INVALID_REQUEST', 'Item ID is required', 400);
    }

    const status = body.success ? 'completed' : 'failed';
    const now = new Date().toISOString();
    const errorMessage = body.error || null;

    const result = await env.DB.prepare(`
      UPDATE content_queue
      SET status = ?, completed_at = ?, error_message = ?
      WHERE id = ?
    `).bind(status, now, errorMessage, body.id).run();

    if (!result.meta.changes) {
      return errorResponse('NOT_FOUND', 'Item not found', 404);
    }

    return successResponse({
      id: body.id,
      status,
      completed_at: now
    });

  } catch (error) {
    console.error('[QUEUE] Error completing item:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to complete item', 500);
  }
}

// ============================================
// GET /api/queue/stats
// ============================================

async function handleStats(request: Request, env: Env): Promise<Response> {
  try {
    // Check auth
    if (!checkAuth(request, env)) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    // Status counts
    const statusResult = await env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM content_queue
      GROUP BY status
    `).all<{ status: string; count: number }>();

    const statusCounts: Record<string, number> = {};
    for (const row of statusResult.results) {
      statusCounts[row.status] = row.count;
    }

    // Total and average
    const totalResult = await env.DB.prepare(`
      SELECT COUNT(*) as total, AVG(priority_score) as avg_priority
      FROM content_queue
    `).first<{ total: number; avg_priority: number }>();

    // By language (pending only)
    const langResult = await env.DB.prepare(`
      SELECT language, COUNT(*) as count
      FROM content_queue
      WHERE status = 'pending'
      GROUP BY language
    `).all<{ language: string; count: number }>();

    const byLanguage: Record<string, number> = {};
    for (const row of langResult.results) {
      byLanguage[row.language] = row.count;
    }

    // By content type (pending only)
    const typeResult = await env.DB.prepare(`
      SELECT content_type, COUNT(*) as count
      FROM content_queue
      WHERE status = 'pending'
      GROUP BY content_type
    `).all<{ content_type: string; count: number }>();

    const byContentType: Record<string, number> = {};
    for (const row of typeResult.results) {
      byContentType[row.content_type] = row.count;
    }

    const stats: QueueStats = {
      total: totalResult?.total || 0,
      pending: statusCounts['pending'] || 0,
      processing: statusCounts['processing'] || 0,
      completed: statusCounts['completed'] || 0,
      failed: statusCounts['failed'] || 0,
      avg_priority: totalResult?.avg_priority || 0,
      by_language: byLanguage,
      by_content_type: byContentType,
    };

    return successResponse({ stats });

  } catch (error) {
    console.error('[QUEUE] Error getting stats:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to get stats', 500);
  }
}
