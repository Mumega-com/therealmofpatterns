/**
 * GET /api/queue/stats
 *
 * Get queue statistics including counts by status, language, and content type.
 */

import type { Env } from '../../../src/types';
import type { QueueStats } from './_shared';
import { errorResponse, successResponse, checkAuth } from './_shared';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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
};
