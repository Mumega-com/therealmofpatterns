/**
 * POST /api/queue/complete
 *
 * Mark a queue item as completed or failed.
 * Body params:
 *   - id: The queue item ID (required)
 *   - success: Whether the item was processed successfully (required)
 *   - error: Error message if failed (optional)
 *   - admin_key: Admin authentication key
 */

import type { Env } from '../../../src/types';
import type { CompleteRequest } from './_shared';
import { errorResponse, successResponse, checkAuth } from './_shared';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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
};
