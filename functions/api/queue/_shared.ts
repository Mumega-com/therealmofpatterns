/**
 * Shared types, constants, and utilities for Content Queue API
 */

import type { Env } from '../../../src/types';

// ============================================
// Types
// ============================================

export interface QueueItem {
  id: string;
  content_type: string;
  language: string;
  params: Record<string, unknown>;
  priority_score: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avg_priority: number;
  by_language: Record<string, number>;
  by_content_type: Record<string, number>;
}

export interface SeedRequest {
  languages?: string[];
  content_types?: string[];
  admin_key?: string;
}

export interface CompleteRequest {
  id: string;
  success: boolean;
  error?: string;
  admin_key?: string;
}

// ============================================
// Constants - Priority Weights
// ============================================

export const LANGUAGE_WEIGHTS: Record<string, number> = {
  'en': 10,
  'es-mx': 8,
  'es-ar': 7,
  'es-es': 6,
  'pt-br': 7,
  'pt-pt': 5,
};

export const CONTENT_TYPE_WEIGHTS: Record<string, number> = {
  'dimension_guide': 10,
  'jungian_concept': 9,
  'historical_figure': 8,
  'historical_era': 7,
  'compatibility_type': 7,
  'vedic_dasha': 6,
  'transit_guide': 6,
  'daily_weather': 5,
  'weekly_forecast': 5,
  'blog_post': 4,
  'archetype_profile': 6,
};

export const DIMENSION_WEIGHTS: Record<string, number> = {
  'phase': 10,
  'relation': 9,
  'value': 8,
  'field': 7,
  'action': 7,
  'expansion': 6,
  'cognition': 6,
  'existence': 5,
};

// All available options
export const ALL_LANGUAGES = Object.keys(LANGUAGE_WEIGHTS);
export const ALL_CONTENT_TYPES = Object.keys(CONTENT_TYPE_WEIGHTS);
export const ALL_DIMENSIONS = Object.keys(DIMENSION_WEIGHTS);

export const HISTORICAL_FIGURES = [
  'rumi', 'jung', 'tesla', 'frida-kahlo', 'marcus-aurelius',
  'hildegard-of-bingen', 'pythagoras', 'hypatia', 'lao-tzu',
  'rabindranath-tagore', 'marie-curie', 'leonardo-da-vinci',
  'buddha', 'krishna', 'jesus', 'muhammad', 'moses',
  'plato', 'aristotle', 'socrates', 'confucius',
  'albert-einstein', 'carl-sagan', 'nikola-tesla',
  'mahatma-gandhi', 'martin-luther-king', 'nelson-mandela',
];

export const JUNGIAN_CONCEPTS = [
  'shadow', 'anima', 'animus', 'persona', 'self',
  'individuation', 'archetype', 'complex', 'projection', 'synchronicity',
];

export const HISTORICAL_ERAS = [
  'ancient-origins', 'classical-period', 'islamic-golden-age',
  'renaissance-revival', 'modern-rebirth',
];

export const VEDIC_PLANETS = [
  'sun', 'moon', 'mars', 'rahu', 'jupiter',
  'saturn', 'mercury', 'ketu', 'venus',
];

export const TRANSIT_PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];

// Top-tier figures for priority bonus
export const TOP_FIGURES = ['rumi', 'jung', 'buddha', 'jesus', 'leonardo-da-vinci', 'einstein'];

// ============================================
// Helper Functions
// ============================================

export function errorResponse(code: string, message: string, status: number): Response {
  return new Response(JSON.stringify({
    success: false,
    error: { code, message }
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function successResponse(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({
    success: true,
    ...data
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function calculatePriority(
  language: string,
  contentType: string,
  dimension?: string,
  figure?: string
): number {
  let score = 0;

  // Language weight
  score += LANGUAGE_WEIGHTS[language] ?? 3;

  // Content type weight
  score += CONTENT_TYPE_WEIGHTS[contentType] ?? 3;

  // Dimension weight (if applicable)
  if (dimension) {
    score += DIMENSION_WEIGHTS[dimension] ?? 5;
  }

  // Figure popularity bonus
  if (figure && contentType === 'historical_figure') {
    if (TOP_FIGURES.includes(figure)) {
      score += 3;
    }
  }

  return score;
}

export function getParamCombinations(contentType: string): Record<string, unknown>[] {
  switch (contentType) {
    case 'dimension_guide':
      return ALL_DIMENSIONS.map(dim => ({ dimension: dim }));

    case 'historical_figure':
    case 'archetype_profile':
      return HISTORICAL_FIGURES.map(fig => ({ figure: fig }));

    case 'jungian_concept':
      return JUNGIAN_CONCEPTS.map(concept => ({ concept }));

    case 'historical_era':
      return HISTORICAL_ERAS.map(era => ({ era }));

    case 'vedic_dasha':
      return VEDIC_PLANETS.map(planet => ({ planet }));

    case 'transit_guide':
      return TRANSIT_PLANETS.map(planet => ({ planet }));

    case 'compatibility_type':
      // Generate unique dimension pairs
      const pairs: Record<string, unknown>[] = [];
      for (let i = 0; i < ALL_DIMENSIONS.length; i++) {
        for (let j = i + 1; j < ALL_DIMENSIONS.length; j++) {
          pairs.push({
            dimension1: ALL_DIMENSIONS[i],
            dimension2: ALL_DIMENSIONS[j]
          });
        }
      }
      return pairs;

    case 'daily_weather':
    case 'weekly_forecast':
    case 'blog_post':
      // These are generated on-demand, not seeded
      return [];

    default:
      return [{}];
  }
}

export function checkAuth(request: Request, env: Env, body?: { admin_key?: string }): boolean {
  // Check for cron header (Cloudflare adds this)
  const cronAuth = request.headers.get('Cf-Cron-Auth');
  if (cronAuth !== null) return true;

  // Check admin key - ADMIN_KEY must be configured in environment
  const adminKey = body?.admin_key || request.headers.get('X-Admin-Key');
  if (!env.ADMIN_KEY) {
    console.error('[QUEUE] ADMIN_KEY not configured in environment');
    return false;
  }

  return adminKey === env.ADMIN_KEY;
}
