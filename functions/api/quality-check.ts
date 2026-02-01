/**
 * POST /api/quality-check
 * Validate generated content quality and retry failed items
 *
 * Called by:
 * 1. Cloudflare Cron at 12:00 UTC
 * 2. Manual trigger from admin dashboard
 *
 * Features:
 * - Queries cms_cosmic_content for low quality_score items (< 0.5)
 * - Retries failed queue items (reset status to pending if attempts < max_retries)
 * - Updates quality scores based on content validation
 * - Reports validation results with QualityCheckResult
 */

import { Env } from '../../src/types';

// Quality threshold default (0.0 - 1.0 scale, stored as 0-100 in DB)
const DEFAULT_QUALITY_THRESHOLD = 0.5; // 50 in DB scale

interface RequestBody {
  retry_failed?: boolean; // Whether to retry failed items (default: true)
  max_retries?: number; // Max retry attempts (default: 3)
  quality_threshold?: number; // Quality score threshold 0-1 (default: 0.5)
  admin_key?: string;
}

interface QualityCheckResult {
  success: boolean;
  checked: number;
  passed: number;
  failed: number;
  retried: number;
  errors: string[];
  error?: {
    code: string;
    message: string;
  };
}

interface ContentItem {
  id: string;
  slug: string;
  title: string;
  content_blocks: string;
  meta_description: string;
  quality_score: number;
  word_count: number;
  language: string;
  content_type: string;
}

interface QueueItem {
  id: string;
  content_type: string;
  language: string;
  status: string;
  attempts: number;
  error_message: string;
  created_at: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body: RequestBody = await request.json();

    // Check authorization - ADMIN_KEY must be configured in environment
    const adminKey = body.admin_key || request.headers.get('X-Admin-Key');
    if (!env.ADMIN_KEY) {
      console.error('[QC] ADMIN_KEY not configured in environment');
      return errorResponse('CONFIGURATION_ERROR', 'Admin key not configured', 500);
    }

    if (adminKey !== env.ADMIN_KEY) {
      return errorResponse('UNAUTHORIZED', 'Invalid admin key', 401);
    }

    const maxRetries = body.max_retries ?? 3;
    const retryFailed = body.retry_failed ?? true;
    const qualityThreshold = body.quality_threshold ?? DEFAULT_QUALITY_THRESHOLD;
    // Convert 0-1 scale to 0-100 DB scale
    const dbThreshold = qualityThreshold * 100;

    console.log(`[QC] Running quality check (threshold=${qualityThreshold}, retry_failed=${retryFailed}, max_retries=${maxRetries})...`);

    let checked = 0;
    let passed = 0;
    let failed = 0;
    let retried = 0;
    const errors: string[] = [];

    // ============================================
    // Part 1: Check low quality content from cms_cosmic_content
    // ============================================
    try {
      const lowQualityContent = await getLowQualityContent(env.DB, dbThreshold);
      console.log(`[QC] Found ${lowQualityContent.length} items with quality_score < ${dbThreshold}...`);

      // Also get total published count for accurate passed count
      const totalPublished = await getTotalPublishedCount(env.DB);
      checked = totalPublished;
      failed = lowQualityContent.length;
      passed = totalPublished - failed;

      // Re-validate and potentially update scores for low quality items
      for (const item of lowQualityContent) {
        const issues = validateContent(item);

        if (issues.length > 0) {
          errors.push(`${item.slug}: ${issues.join(', ')}`);

          // Recalculate quality score based on validation
          const newScore = calculateQualityScore(item, issues);
          if (newScore !== item.quality_score) {
            await updateQualityScore(env.DB, item.id, newScore);
            console.log(`[QC] Updated quality score for ${item.slug}: ${item.quality_score} -> ${newScore}`);
          }

          // Unpublish if score is critically low (< 30)
          if (newScore < 30) {
            await unpublishContent(env.DB, item.id);
            console.log(`[QC] Unpublished critically low quality content: ${item.slug}`);
          }
        }
      }

      console.log(`[QC] Content check: ${passed} passed, ${failed} failed out of ${checked} total`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[QC] Error checking content quality:', errorMsg);
      errors.push(`Content quality check failed: ${errorMsg}`);
    }

    // ============================================
    // Part 2: Retry failed queue items
    // ============================================
    if (retryFailed) {
      try {
        const failedItems = await getFailedQueueItems(env.DB, maxRetries);
        console.log(`[QC] Found ${failedItems.length} failed queue items eligible for retry (attempts < ${maxRetries})...`);

        for (const item of failedItems) {
          try {
            // Reset status to pending for retry
            await resetForRetry(env.DB, item.id);
            retried++;
            console.log(`[QC] Reset queue item ${item.id} for retry (was attempt ${item.attempts})`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[QC] Failed to reset queue item ${item.id}:`, errorMsg);
            errors.push(`Failed to reset ${item.id}: ${errorMsg}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('[QC] Error retrying failed items:', errorMsg);
        errors.push(`Queue retry failed: ${errorMsg}`);
      }
    }

    // ============================================
    // Part 3: Log stats
    // ============================================
    try {
      await logQualityCheckStats(env.DB, checked, passed, failed, retried);
    } catch (error) {
      console.error('[QC] Failed to log stats:', error);
      // Non-fatal error, don't add to errors array
    }

    const result: QualityCheckResult = {
      success: errors.length === 0,
      checked,
      passed,
      failed,
      retried,
      errors: errors.slice(0, 20), // Limit errors in response
    };

    console.log(`[QC] Completed: ${checked} checked, ${passed} passed, ${failed} failed, ${retried} retried`);

    return jsonResponse(result);

  } catch (error) {
    console.error('Quality check error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to run quality check', 500);
  }
};

// ============================================
// Content Validation
// ============================================

async function getLowQualityContent(db: D1Database, threshold: number): Promise<ContentItem[]> {
  // Get published content with quality_score below threshold
  const { results } = await db.prepare(`
    SELECT id, slug, title, content_blocks, meta_description, quality_score, word_count, language, content_type
    FROM cms_cosmic_content
    WHERE published = 1 AND quality_score < ?
    ORDER BY quality_score ASC
    LIMIT 100
  `).bind(threshold).all();

  return (results || []) as unknown as ContentItem[];
}

async function getTotalPublishedCount(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count
    FROM cms_cosmic_content
    WHERE published = 1
  `).first();

  return (result?.count as number) || 0;
}

function validateContent(item: ContentItem): string[] {
  const issues: string[] = [];

  // Check title
  if (!item.title || item.title.length < 10) {
    issues.push('title too short');
  }
  if (item.title && item.title.length > 70) {
    issues.push('title too long for SEO');
  }

  // Check meta description
  if (!item.meta_description || item.meta_description.length < 50) {
    issues.push('meta description too short');
  }
  if (item.meta_description && item.meta_description.length > 160) {
    issues.push('meta description too long');
  }

  // Check content blocks
  try {
    const blocks = JSON.parse(item.content_blocks || '[]');
    if (!Array.isArray(blocks) || blocks.length === 0) {
      issues.push('no content blocks');
    } else {
      // Check total word count from blocks
      const totalText = blocks.map((b: any) => b.content || '').join(' ');
      const wordCount = totalText.split(/\s+/).filter((w: string) => w.length > 0).length;

      if (wordCount < 300) {
        issues.push('content too short (< 300 words)');
      }
    }
  } catch {
    issues.push('invalid content blocks JSON');
  }

  // Check word count from DB
  if (item.word_count < 100) {
    issues.push('word count critically low');
  }

  // Check for placeholder text
  const content = JSON.stringify(item);
  if (content.includes('Lorem ipsum') || content.includes('[PLACEHOLDER]') || content.includes('[TODO]')) {
    issues.push('contains placeholder text');
  }

  return issues;
}

function calculateQualityScore(item: ContentItem, issues: string[]): number {
  let score = 100;

  // Deduct points based on issues
  score -= issues.length * 15;

  // Bonus/penalty based on word count
  if (item.word_count >= 800) score += 10;
  else if (item.word_count >= 500) score += 5;
  else if (item.word_count < 200) score -= 10;

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

async function updateQualityScore(db: D1Database, id: string, score: number): Promise<void> {
  try {
    await db.prepare(`
      UPDATE cms_cosmic_content
      SET quality_score = ?, updated_at = ?
      WHERE id = ?
    `).bind(score, new Date().toISOString(), id).run();
  } catch (error) {
    console.error(`[QC] Failed to update quality score for ${id}:`, error);
  }
}

async function unpublishContent(db: D1Database, id: string): Promise<void> {
  try {
    await db.prepare(`
      UPDATE cms_cosmic_content
      SET published = 0, updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), id).run();
  } catch (error) {
    console.error(`[QC] Failed to unpublish content ${id}:`, error);
  }
}

// ============================================
// Queue Retry Logic
// ============================================

async function getFailedQueueItems(db: D1Database, maxRetries: number): Promise<QueueItem[]> {
  const { results } = await db.prepare(`
    SELECT id, content_type, language, status, attempts, error_message, created_at
    FROM content_queue
    WHERE status = 'failed'
    AND (attempts IS NULL OR attempts < ?)
    ORDER BY created_at ASC
    LIMIT 50
  `).bind(maxRetries).all();

  return (results || []) as unknown as QueueItem[];
}

async function resetForRetry(db: D1Database, id: string): Promise<void> {
  await db.prepare(`
    UPDATE content_queue
    SET status = 'pending',
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL
    WHERE id = ?
  `).bind(id).run();
}

// ============================================
// Stats Logging
// ============================================

async function logQualityCheckStats(
  db: D1Database,
  _checked: number, // Total checked (included for completeness, not logged separately)
  passed: number,
  failed: number,
  retried: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const apiKeySuffix = 'quality-check';

  try {
    const id = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO generation_stats (id, date, api_key_suffix, pages_generated, errors, tokens_used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date, api_key_suffix) DO UPDATE SET
        pages_generated = excluded.pages_generated,
        errors = excluded.errors,
        tokens_used = excluded.tokens_used
    `).bind(
      id,
      today,
      apiKeySuffix,
      passed,   // pages_generated = passed count
      failed,   // errors = failed count
      retried,  // tokens_used = retried count (repurposing field for this endpoint)
      new Date().toISOString()
    ).run();
  } catch (error) {
    console.error('[QC] Failed to log quality check stats:', error);
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
    checked: 0,
    passed: 0,
    failed: 0,
    retried: 0,
    errors: [],
    error: { code, message },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
