/**
 * POST /api/queue/seed
 *
 * Seed the queue with content generation combinations.
 * Body params:
 *   - languages: Array of language codes (optional, defaults to all)
 *   - content_types: Array of content types (optional, defaults to all)
 *   - admin_key: Admin authentication key
 */

import { Env } from '../../../src/types';
import {
  SeedRequest,
  ALL_LANGUAGES,
  ALL_CONTENT_TYPES,
  errorResponse,
  successResponse,
  checkAuth,
  generateId,
  calculatePriority,
  getParamCombinations,
} from './_shared';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

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
};
