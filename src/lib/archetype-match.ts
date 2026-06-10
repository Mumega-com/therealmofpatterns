/**
 * Historical-figure archetype matching against an 8D vector.
 * Shared by /api/preview and /api/openclaw-webhook.
 */

import type { D1Database } from '@cloudflare/workers-types';
import type { HistoricalFigure, FigureMatch } from '../types';
import { cosineResonance } from './16d-engine';

const FALLBACK_FIGURE: FigureMatch = {
  id: 0,
  name: 'Rumi',
  era: '1207-1273',
  culture: 'Persian',
  domains: ['poetry', 'mysticism', 'philosophy'],
  vector: [0.72, 0.45, 0.88, 0.91, 0.85, 0.33, 0.78, 0.95],
  quote: 'What you seek is seeking you.',
  resonance: 0.85,
};

export async function findBestMatch(db: D1Database, userVector: number[]): Promise<FigureMatch> {
  try {
    // Fetch all historical figures
    const { results } = await db.prepare('SELECT * FROM historical_figures').all<HistoricalFigure>();

    if (!results || results.length === 0) {
      return { ...FALLBACK_FIGURE };
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
    return { ...FALLBACK_FIGURE };
  }
}
