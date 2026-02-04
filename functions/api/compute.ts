/**
 * POST /api/compute
 * Compute full 16D vector with all matches (for premium users)
 */

import type { Env, BirthData, ComputeResponse, ErrorResponse, FigureMatch, DimensionInfo } from '../../src/types';
import { compute16DFromBirthData, cosineResonance, analyzeDimensions } from '../../src/lib/16d-engine';

interface RequestBody {
  birth_data: BirthData;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse('Missing authorization token');
    }

    const token = authHeader.split(' ')[1];

    // Verify session token
    const sessionData = await env.CACHE.get(`session:${token}`);
    if (!sessionData) {
      return unauthorizedResponse('Invalid or expired session');
    }

    const session = JSON.parse(sessionData);

    // Parse request body
    const body: RequestBody = await request.json();
    const { birth_data } = body;

    // Validate birth data
    if (!validateBirthData(birth_data)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid birth data.',
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Compute full 16D vector
    const vector16d = compute16DFromBirthData(birth_data);
    const vector8d = vector16d.slice(0, 8);

    // Get dimension analysis
    const dimensionsArray = analyzeDimensions(vector8d);
    const dimensions: Record<string, DimensionInfo> = {};
    for (const dim of dimensionsArray) {
      dimensions[dim.symbol] = dim;
    }

    // Find top 10 historical matches
    const matches = await findTopMatches(env.DB, vector8d, 10);

    // Get art URL if report exists
    let artUrl: string | undefined;
    if (session.reportId) {
      const report = await env.DB.prepare(
        'SELECT art_url FROM reports WHERE id = ?'
      ).bind(session.reportId).first();
      if (report && report.art_url) {
        artUrl = report.art_url as string;
      }
    }

    const response: ComputeResponse = {
      success: true,
      vector_8d: Array.from(vector8d).map(v => Math.round(v * 1000) / 1000),
      vector_16d: Array.from(vector16d).map(v => Math.round(v * 1000) / 1000),
      dimensions,
      historical_matches: matches,
      art_url: artUrl,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Compute error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to compute 16D vector.',
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

function unauthorizedResponse(message: string): Response {
  const error: ErrorResponse = {
    success: false,
    error: { code: 'UNAUTHORIZED', message },
  };
  return new Response(JSON.stringify(error), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function findTopMatches(
  db: D1Database,
  userVector: number[],
  limit: number
): Promise<FigureMatch[]> {
  try {
    const { results } = await db.prepare('SELECT * FROM historical_figures').all();

    if (!results || results.length === 0) {
      return [];
    }

    const matches: FigureMatch[] = [];

    for (const figure of results) {
      const figureVector = typeof figure.vector === 'string'
        ? JSON.parse(figure.vector as string)
        : figure.vector;
      const domains = typeof figure.domains === 'string'
        ? JSON.parse(figure.domains as string)
        : figure.domains;

      const resonance = cosineResonance(userVector, figureVector);

      matches.push({
        id: figure.id as number,
        name: figure.name as string,
        era: figure.era as string,
        culture: figure.culture as string,
        domains,
        vector: figureVector,
        quote: figure.quote as string,
        bio: figure.bio as string,
        resonance: Math.round(resonance * 100) / 100,
      });
    }

    // Sort by resonance and return top N
    matches.sort((a, b) => b.resonance - a.resonance);
    return matches.slice(0, limit);
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}
