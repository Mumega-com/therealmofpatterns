/**
 * Cosmic Event Detection
 * Detects moon phases, retrogrades, major aspects, and season markers.
 */

import { getPlanetPosition, getAllPlanetPositions, calculateAspect, toJulianDay, SIGNS, SIGN_SYMBOLS } from './ephemeris-fallback';
import type { DateTime, PlanetPosition } from './ephemeris-fallback';

export type EventType = 'moon_phase' | 'retrograde' | 'aspect' | 'season';

export interface CosmicEvent {
  type: EventType;
  name: string;
  description: string;
  icon: string;
  color: string; // CSS color
}

const ZODIAC_SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function getZodiacSign(longitude: number): string {
  return ZODIAC_SIGNS[Math.floor(((longitude % 360) + 360) % 360 / 30)];
}

function getZodiacSymbol(longitude: number): string {
  return SIGN_SYMBOLS[Math.floor(((longitude % 360) + 360) % 360 / 30)];
}

/**
 * Detect moon phase for a given date.
 * Compares Sun-Moon elongation (angular distance).
 */
function getMoonPhase(sun: PlanetPosition, moon: PlanetPosition): CosmicEvent | null {
  let elongation = ((moon.longitude - sun.longitude) % 360 + 360) % 360;

  // Check within ±6° of exact phase angles
  const tolerance = 6;

  if (elongation < tolerance || elongation > 360 - tolerance) {
    return {
      type: 'moon_phase',
      name: `New Moon in ${moon.sign}`,
      description: 'A time for new beginnings, setting intentions, and planting seeds.',
      icon: '🌑',
      color: '#6b7280',
    };
  }
  if (Math.abs(elongation - 90) < tolerance) {
    return {
      type: 'moon_phase',
      name: `First Quarter Moon in ${moon.sign}`,
      description: 'A time for action, decisions, and pushing through challenges.',
      icon: '🌓',
      color: '#9ca3af',
    };
  }
  if (Math.abs(elongation - 180) < tolerance) {
    return {
      type: 'moon_phase',
      name: `Full Moon in ${moon.sign}`,
      description: 'Peak illumination — emotions heightened, culmination of efforts, release what no longer serves.',
      icon: '🌕',
      color: '#fbbf24',
    };
  }
  if (Math.abs(elongation - 270) < tolerance) {
    return {
      type: 'moon_phase',
      name: `Last Quarter Moon in ${moon.sign}`,
      description: 'A time for reflection, letting go, and preparing for renewal.',
      icon: '🌗',
      color: '#9ca3af',
    };
  }

  return null;
}

/**
 * Detect planets in retrograde.
 */
function getRetrogrades(positions: PlanetPosition[]): CosmicEvent[] {
  const events: CosmicEvent[] = [];
  const retroPlanets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

  for (const pos of positions) {
    if (retroPlanets.includes(pos.name) && pos.retrograde) {
      const descriptions: Record<string, string> = {
        Mercury: 'Communication, technology, and travel may feel disrupted. Review, revise, reflect.',
        Venus: 'Relationships and values are under review. Old connections may resurface.',
        Mars: 'Energy and motivation turn inward. Avoid forcing outcomes.',
        Jupiter: 'Expansion slows — a time for inner growth and philosophical reflection.',
        Saturn: 'Structures and responsibilities need reassessment. Patience is key.',
      };
      events.push({
        type: 'retrograde',
        name: `${pos.name} Retrograde in ${pos.sign}`,
        description: descriptions[pos.name] || 'A planet appears to move backward — time for review.',
        icon: '℞',
        color: '#ef4444',
      });
    }
  }
  return events;
}

/**
 * Detect major planetary aspects.
 */
function getMajorAspects(positions: PlanetPosition[]): CosmicEvent[] {
  const events: CosmicEvent[] = [];
  const significantPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

  for (let i = 0; i < significantPlanets.length; i++) {
    for (let j = i + 1; j < significantPlanets.length; j++) {
      const p1 = positions.find(p => p.name === significantPlanets[i]);
      const p2 = positions.find(p => p.name === significantPlanets[j]);
      if (!p1 || !p2) continue;

      const aspect = calculateAspect(p1.longitude, p2.longitude);
      if (!aspect) continue;

      // Only report conjunction, opposition, and trine (most impactful)
      if (!['Conjunction', 'Opposition', 'Trine'].includes(aspect.aspect)) continue;

      const aspectDescriptions: Record<string, string> = {
        Conjunction: `${p1.name} and ${p2.name} merge energies — intensified focus in their shared domain.`,
        Opposition: `${p1.name} opposes ${p2.name} — tension that drives awareness and balance.`,
        Trine: `${p1.name} trines ${p2.name} — harmonious flow and natural support.`,
      };

      const aspectIcons: Record<string, string> = {
        Conjunction: '☌',
        Opposition: '☍',
        Trine: '△',
      };

      const aspectColors: Record<string, string> = {
        Conjunction: '#d4a854',
        Opposition: '#f87171',
        Trine: '#34d399',
      };

      events.push({
        type: 'aspect',
        name: `${p1.name} ${aspect.aspect} ${p2.name}`,
        description: aspectDescriptions[aspect.aspect] || '',
        icon: aspectIcons[aspect.aspect] || '⚹',
        color: aspectColors[aspect.aspect] || '#d4a854',
      });
    }
  }
  return events;
}

/**
 * Detect season markers (equinoxes and solstices).
 * Sun at 0° Aries (spring equinox), 0° Cancer (summer solstice), etc.
 */
function getSeasonMarker(sun: PlanetPosition): CosmicEvent | null {
  const degree = sun.longitude % 360;
  const tolerance = 1.5;

  if (Math.abs(degree - 0) < tolerance || Math.abs(degree - 360) < tolerance) {
    return { type: 'season', name: 'Spring Equinox', description: 'The astrological new year. Equal day and night — a moment of balance and fresh starts.', icon: '🌱', color: '#34d399' };
  }
  if (Math.abs(degree - 90) < tolerance) {
    return { type: 'season', name: 'Summer Solstice', description: 'Peak light. The longest day — celebrate fullness and outward expression.', icon: '☀', color: '#fbbf24' };
  }
  if (Math.abs(degree - 180) < tolerance) {
    return { type: 'season', name: 'Autumn Equinox', description: 'Balance returns. Equal day and night — a time for gratitude and release.', icon: '🍂', color: '#f59e0b' };
  }
  if (Math.abs(degree - 270) < tolerance) {
    return { type: 'season', name: 'Winter Solstice', description: 'The longest night. Turn inward, rest, and plant seeds for the next cycle.', icon: '❄', color: '#93c5fd' };
  }
  return null;
}

/**
 * Get all cosmic events for a given date.
 */
export function getCosmicEvents(date: Date): CosmicEvent[] {
  const dt: DateTime = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: 12,
    minute: 0,
  };

  const positions = getAllPlanetPositions(dt);
  const sun = positions.find(p => p.name === 'Sun')!;
  const moon = positions.find(p => p.name === 'Moon')!;

  const events: CosmicEvent[] = [];

  // Moon phase
  const moonPhase = getMoonPhase(sun, moon);
  if (moonPhase) events.push(moonPhase);

  // Season marker
  const season = getSeasonMarker(sun);
  if (season) events.push(season);

  // Retrogrades
  events.push(...getRetrogrades(positions));

  // Major aspects (limit to 3 most notable)
  const aspects = getMajorAspects(positions);
  events.push(...aspects.slice(0, 3));

  return events;
}

/**
 * Get cosmic events for every day of a given month.
 * Returns a Map of day number → events array.
 */
export function getMonthEvents(year: number, month: number): Map<number, CosmicEvent[]> {
  const map = new Map<number, CosmicEvent[]>();
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const events = getCosmicEvents(new Date(year, month - 1, day));
    if (events.length > 0) {
      map.set(day, events);
    }
  }
  return map;
}

/**
 * Get sun and moon signs for a date (for SEO content).
 */
export function getDaySigns(date: Date): { sunSign: string; moonSign: string; sunSymbol: string; moonSymbol: string } {
  const dt: DateTime = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), hour: 12 };
  const sun = getPlanetPosition('Sun', dt);
  const moon = getPlanetPosition('Moon', dt);
  return {
    sunSign: sun.sign,
    moonSign: moon.sign,
    sunSymbol: SIGN_SYMBOLS[sun.signIndex],
    moonSymbol: SIGN_SYMBOLS[moon.signIndex],
  };
}
