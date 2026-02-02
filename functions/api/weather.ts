/**
 * GET /api/weather
 * Get the current cosmic weather (today's 8D field state)
 */

import { Env, WeatherResponse, ErrorResponse } from '../../src/types';
import { approximateLongitudes, compute8D, getDominant } from '../../src/lib/16d-engine';

// Zodiac signs for position interpretation
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0];

    // Check cache first
    const cached = await env.CACHE.get(`weather:${dateKey}`);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Compute today's cosmic weather
    const birthData = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };

    const longitudes = approximateLongitudes(birthData);
    const vector = compute8D(longitudes);
    const dominant = getDominant(vector);

    // Get planetary positions for influences
    const influences = getInfluences(longitudes);

    const response: WeatherResponse = {
      date: dateKey,
      vector: Array.from(vector).map(v => Math.round(v * 100) / 100),
      dominant: {
        symbol: dominant.symbol,
        name: dominant.name,
        description: getDailyDescription(dominant.symbol),
      },
      influences,
    };

    const responseJson = JSON.stringify(response);

    // Cache for 1 hour
    await env.CACHE.put(`weather:${dateKey}`, responseJson, { expirationTtl: 3600 });

    return new Response(responseJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Weather error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to compute cosmic weather.',
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

function getZodiacSign(longitude: number): string {
  const index = Math.floor(longitude / 30) % 12;
  return ZODIAC_SIGNS[index];
}

function getInfluences(longitudes: number[]): WeatherResponse['influences'] {
  const influences: WeatherResponse['influences'] = [];

  // Get Sun and Moon positions (most significant)
  influences.push({
    planet: 'Sun',
    sign: getZodiacSign(longitudes[0]),
    meaning: getSunMeaning(getZodiacSign(longitudes[0])),
  });

  influences.push({
    planet: 'Moon',
    sign: getZodiacSign(longitudes[1]),
    meaning: getMoonMeaning(getZodiacSign(longitudes[1])),
  });

  // Check for significant aspects (simplified)
  const aspects = findAspects(longitudes);
  if (aspects.length > 0) {
    influences.push(aspects[0]);
  }

  return influences;
}

function getSunMeaning(sign: string): string {
  const meanings: Record<string, string> = {
    'Aries': 'Initiative and new beginnings',
    'Taurus': 'Grounding and material focus',
    'Gemini': 'Communication and curiosity',
    'Cancer': 'Emotional depth and nurturing',
    'Leo': 'Creative expression and confidence',
    'Virgo': 'Analysis and service',
    'Libra': 'Balance and relationships',
    'Scorpio': 'Transformation and intensity',
    'Sagittarius': 'Expansion and adventure',
    'Capricorn': 'Structure and ambition',
    'Aquarius': 'Innovation and community',
    'Pisces': 'Intuition and compassion',
  };
  return meanings[sign] || 'Cosmic energy flows';
}

function getMoonMeaning(sign: string): string {
  const meanings: Record<string, string> = {
    'Aries': 'Emotional courage and action',
    'Taurus': 'Comfort and stability seeking',
    'Gemini': 'Mental processing of feelings',
    'Cancer': 'Deep emotional receptivity',
    'Leo': 'Heart-centered expression',
    'Virgo': 'Emotional refinement',
    'Libra': 'Harmony in relationships',
    'Scorpio': 'Emotional intensity and truth',
    'Sagittarius': 'Optimism and faith',
    'Capricorn': 'Emotional maturity',
    'Aquarius': 'Detached observation',
    'Pisces': 'Spiritual sensitivity',
  };
  return meanings[sign] || 'Emotional flow';
}

function findAspects(longitudes: number[]): WeatherResponse['influences'] {
  const aspects: WeatherResponse['influences'] = [];

  // Check Venus-Jupiter trine (120° ± 8°) - harmonious, expansive love
  const venusJupiter = Math.abs(longitudes[3] - longitudes[5]);
  if (Math.abs(venusJupiter - 120) < 8 || Math.abs(venusJupiter - 240) < 8) {
    aspects.push({
      planet: 'Venus',
      sign: getZodiacSign(longitudes[3]),
      aspect: 'Trine Jupiter',
      meaning: 'Expansive love and creativity',
    });
  }

  // Check Mars-Saturn conjunction (0° ± 8°) - disciplined action
  const marsSaturn = Math.abs(longitudes[4] - longitudes[6]);
  if (marsSaturn < 8 || marsSaturn > 352) {
    aspects.push({
      planet: 'Mars',
      sign: getZodiacSign(longitudes[4]),
      aspect: 'Conjunct Saturn',
      meaning: 'Disciplined and focused action',
    });
  }

  // Check Mercury-Uranus sextile (60° ± 6°) - innovative thinking
  const mercuryUranus = Math.abs(longitudes[2] - longitudes[7]);
  if (Math.abs(mercuryUranus - 60) < 6 || Math.abs(mercuryUranus - 300) < 6) {
    aspects.push({
      planet: 'Mercury',
      sign: getZodiacSign(longitudes[2]),
      aspect: 'Sextile Uranus',
      meaning: 'Innovative and breakthrough thinking',
    });
  }

  return aspects;
}

function getDailyDescription(symbol: string): string {
  const descriptions: Record<string, string> = {
    'P': 'A day for self-discovery and identity work',
    'E': 'A day for building structure and foundations',
    'μ': 'A day for learning and communication',
    'V': 'A day for beauty and harmony',
    'N': 'A day for growth and expansion',
    'Δ': 'A day for action and movement',
    'R': 'A day for connection and relationships',
    'Φ': 'A day for witnessing and unity',
  };
  return descriptions[symbol] || 'A day for cosmic alignment';
}
