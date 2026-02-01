/**
 * POST /api/quality-check
 * Validate generated content quality and retry failed items
 *
 * Called by:
 * 1. Cloudflare Cron at 12:00 UTC
 * 2. Manual trigger from admin dashboard
 *
 * Features:
 * - Validates content quality (word count, structure, SEO)
 * - Retries failed queue items (up to max_retries)
 * - Updates quality scores in cosmic_content
 * - Reports validation results
 */

import { Env } from '../../src/types';

interface RequestBody {
  retry_failed?: boolean; // Whether to retry failed items
  max_retries?: number; // Max retry attempts (default: 3)
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
  status: string;
}

interface QueueItem {
  id: string;
  content_type: string;
  language: string;
  status: string;
  attempts: number;
  error_message: string;
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

    const maxRetries = body.max_retries || 3;
    const retryFailed = body.retry_failed !== false;

    console.log('[QC] Running quality check...');

    let checked = 0;
    let passed = 0;
    let failed = 0;
    let retried = 0;
    const errors: string[] = [];

    // ============================================
    // Part 1: Check recently published content
    // ============================================
    const recentContent = await getRecentContent(env.DB);
    console.log(`[QC] Checking ${recentContent.length} recent content items...`);

    for (const item of recentContent) {
      checked++;

      const issues = validateContent(item);

      if (issues.length === 0) {
        passed++;
        // Update quality score if needed
        await updateQualityScore(env.DB, item.id, 100);
      } else {
        failed++;
        errors.push(`${item.slug}: ${issues.join(', ')}`);

        // Calculate quality score based on issues
        const qualityScore = Math.max(0, 100 - issues.length * 20);
        await updateQualityScore(env.DB, item.id, qualityScore);

        // Mark as needing review if score too low
        if (qualityScore < 50) {
          await markForReview(env.DB, item.id);
        }
      }
    }

    // ============================================
    // Part 2: Retry failed queue items
    // ============================================
    if (retryFailed) {
      const failedItems = await getFailedQueueItems(env.DB, maxRetries);
      console.log(`[QC] Found ${failedItems.length} failed items eligible for retry...`);

      for (const item of failedItems) {
        // Reset status to pending for retry
        await resetForRetry(env.DB, item.id);
        retried++;
      }
    }

    const result: QualityCheckResult = {
      success: true,
      checked,
      passed,
      failed,
      retried,
      errors: errors.slice(0, 10), // Limit errors in response
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

async function getRecentContent(db: D1Database): Promise<ContentItem[]> {
  // Get content published in last 24 hours that hasn't been quality checked
  const { results } = await db.prepare(`
    SELECT id, slug, title, content_blocks, meta_description, status
    FROM cosmic_content
    WHERE published_at > datetime('now', '-24 hours')
    AND (quality_checked_at IS NULL OR quality_checked_at < datetime('now', '-24 hours'))
    LIMIT 50
  `).all();

  return (results || []) as unknown as ContentItem[];
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
      // Check total word count
      const totalText = blocks.map((b: any) => b.content || '').join(' ');
      const wordCount = totalText.split(/\s+/).filter((w: string) => w.length > 0).length;

      if (wordCount < 300) {
        issues.push('content too short (< 300 words)');
      }
    }
  } catch {
    issues.push('invalid content blocks JSON');
  }

  // Check for placeholder text
  const content = JSON.stringify(item);
  if (content.includes('Lorem ipsum') || content.includes('[PLACEHOLDER]')) {
    issues.push('contains placeholder text');
  }

  return issues;
}

async function updateQualityScore(db: D1Database, id: string, score: number): Promise<void> {
  try {
    await db.prepare(`
      UPDATE cosmic_content
      SET quality_score = ?, quality_checked_at = ?
      WHERE id = ?
    `).bind(score, new Date().toISOString(), id).run();
  } catch (error) {
    console.error(`[QC] Failed to update quality score for ${id}:`, error);
  }
}

async function markForReview(db: D1Database, id: string): Promise<void> {
  try {
    await db.prepare(`
      UPDATE cosmic_content
      SET status = 'review'
      WHERE id = ?
    `).bind(id).run();
  } catch (error) {
    console.error(`[QC] Failed to mark for review ${id}:`, error);
  }
}

// ============================================
// Queue Retry Logic
// ============================================

async function getFailedQueueItems(db: D1Database, maxRetries: number): Promise<QueueItem[]> {
  const { results } = await db.prepare(`
    SELECT id, content_type, language, status, attempts, error_message
    FROM content_queue
    WHERE status = 'failed'
    AND (attempts IS NULL OR attempts < ?)
    LIMIT 20
  `).bind(maxRetries).all();

  return (results || []) as unknown as QueueItem[];
}

async function resetForRetry(db: D1Database, id: string): Promise<void> {
  try {
    await db.prepare(`
      UPDATE content_queue
      SET status = 'pending', error_message = NULL
      WHERE id = ?
    `).bind(id).run();
  } catch (error) {
    console.error(`[QC] Failed to reset queue item ${id}:`, error);
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
