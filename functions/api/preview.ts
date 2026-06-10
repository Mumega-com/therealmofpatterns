/**
 * POST /api/preview
 * Generate a free 8D preview based on birth data
 */

import type { Env, BirthData, PreviewResponse, ErrorResponse } from '../../src/types';
import { computeFromBirthData, getDominant, getDimensionTeaser } from '../../src/lib/16d-engine';
import { findBestMatch } from '../../src/lib/archetype-match';

interface RequestBody {
  birth_data: BirthData;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Rate limiting check
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate:preview:${clientIP}`;

    const currentCount = await env.CACHE.get(rateLimitKey);
    if (currentCount && parseInt(currentCount) >= 10) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait 1 hour.',
          retry_after: 3600,
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body: RequestBody = await request.json();
    const { birth_data } = body;

    // Validate birth data
    if (!validateBirthData(birth_data)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid birth data. Please provide year, month, and day.',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Compute 8D vector
    const vector = computeFromBirthData(birth_data);
    const dominant = getDominant(vector);

    // Find best matching historical figure
    const archetype = await findBestMatch(env.DB, vector);

    // Generate teaser
    const teaser = getDimensionTeaser(dominant);

    // Update rate limit
    const newCount = currentCount ? parseInt(currentCount) + 1 : 1;
    await env.CACHE.put(rateLimitKey, newCount.toString(), { expirationTtl: 3600 });

    // Build response
    const response: PreviewResponse = {
      success: true,
      vector: Array.from(vector),
      dominant: {
        index: dominant.index,
        symbol: dominant.symbol,
        name: dominant.name,
        value: Math.round(dominant.value * 100) / 100,
        description: dominant.domain,
      },
      archetype,
      teaser,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to compute preview. Please try again.',
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// ============================================
// Helper Functions
// ============================================

function validateBirthData(data: BirthData): boolean {
  if (!data) return false;
  if (!data.year || data.year < 1900 || data.year > 2100) return false;
  if (!data.month || data.month < 1 || data.month > 12) return false;
  if (!data.day || data.day < 1 || data.day > 31) return false;
  return true;
}

