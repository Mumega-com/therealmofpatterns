/**
 * GET /api/queue/next
 *
 * Get the next batch of items to process from the queue.
 * Query params:
 *   - limit: Max number of items to return (default: 10, max: 50)
 */

import type { Env } from '../../../src/types';
import type { QueueItem } from './_shared';
import { errorResponse, successResponse, checkAuth } from './_shared';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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
};
