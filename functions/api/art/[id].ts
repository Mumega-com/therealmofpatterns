/**
 * GET /api/art/:id
 * Serve generated sacred art from R2
 */

import { Env, ErrorResponse } from '../../../src/types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, env } = context;
  const artId = params.id as string;

  try {
    // Fetch art from R2
    const key = `art/${artId}.png`;
    const object = await env.STORAGE.get(key);

    if (!object) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Art not found',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the image
    return new Response(object.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'ETag': object.etag,
      },
    });
  } catch (error) {
    console.error('Art fetch error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch art',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
