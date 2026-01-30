/**
 * POST /api/preview
 * Generate a free 8D preview based on birth data
 */

import { Env, BirthData, PreviewResponse, ErrorResponse, HistoricalFigure, FigureMatch } from '../../src/types';
import { computeFromBirthData, getDominant, cosineResonance, getDimensionTeaser } from '../../src/lib/16d-engine';

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

async function findBestMatch(db: D1Database, userVector: number[]): Promise<FigureMatch> {
  try {
    // Fetch all historical figures
    const { results } = await db.prepare('SELECT * FROM historical_figures').all<HistoricalFigure>();

    if (!results || results.length === 0) {
      // Return fallback if no figures in database
      return {
        id: 0,
        name: 'Rumi',
        era: '1207-1273',
        culture: 'Persian',
        domains: ['poetry', 'mysticism', 'philosophy'],
        vector: [0.72, 0.45, 0.88, 0.91, 0.85, 0.33, 0.78, 0.95],
        quote: 'What you seek is seeking you.',
        resonance: 0.85,
      };
    }

    // Find best match by cosine similarity
    let bestMatch: FigureMatch | null = null;
    let bestScore = -1;

    for (const figure of results) {
      const figureVector = typeof figure.vector === 'string' ? JSON.parse(figure.vector) : figure.vector;
      const domains = typeof figure.domains === 'string' ? JSON.parse(figure.domains) : figure.domains;

      const resonance = cosineResonance(userVector, figureVector);

      if (resonance > bestScore) {
        bestScore = resonance;
        bestMatch = {
          ...figure,
          vector: figureVector,
          domains,
          resonance: Math.round(resonance * 100) / 100,
        };
      }
    }

    return bestMatch!;
  } catch (error) {
    console.error('Database error:', error);
    // Return fallback
    return {
      id: 0,
      name: 'Rumi',
      era: '1207-1273',
      culture: 'Persian',
      domains: ['poetry', 'mysticism', 'philosophy'],
      vector: [0.72, 0.45, 0.88, 0.91, 0.85, 0.33, 0.78, 0.95],
      quote: 'What you seek is seeking you.',
      resonance: 0.85,
    };
  }
}
