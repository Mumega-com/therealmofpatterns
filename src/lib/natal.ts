/**
 * Natal Chart Engine
 *
 * Full natal chart computation including:
 * - 10 planets with signs, houses, retrograde, degree
 * - Black Moon Lilith (Mean Lunar Apogee)
 * - North / South Node
 * - Major aspects between all bodies
 * - Stelliums, dominant element/modality
 * - Retrograde detection
 */

import {
  getPlanetaryLongitudes,
  getPlanetarySigns,
  getPlanetaryHouses,
  computeAscendant,
  getSign,
  SIGNS,
  ELEMENTS,
  birthDataToDate,
} from './ephemeris';
import type { BirthData } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────

const PLANET_NAMES = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;

export type PlanetName = typeof PLANET_NAMES[number];

const MODALITIES: Record<string, string> = {
  Aries: 'Cardinal', Taurus: 'Fixed', Gemini: 'Mutable',
  Cancer: 'Cardinal', Leo: 'Fixed', Virgo: 'Mutable',
  Libra: 'Cardinal', Scorpio: 'Fixed', Sagittarius: 'Mutable',
  Capricorn: 'Cardinal', Aquarius: 'Fixed', Pisces: 'Mutable',
};

// Ruling planet per sign
const RULERS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury',
  Cancer: 'Moon', Leo: 'Sun', Virgo: 'Mercury',
  Libra: 'Venus', Scorpio: 'Pluto', Sagittarius: 'Jupiter',
  Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
};

// Major aspect definitions
const ASPECTS = [
  { name: 'Conjunction',  angle: 0,   orb: 8,  nature: 'neutral' },
  { name: 'Sextile',      angle: 60,  orb: 5,  nature: 'harmonious' },
  { name: 'Square',       angle: 90,  orb: 7,  nature: 'tense' },
  { name: 'Trine',        angle: 120, orb: 7,  nature: 'harmonious' },
  { name: 'Opposition',   angle: 180, orb: 8,  nature: 'tense' },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlanetPosition {
  name: string;
  longitude: number;       // 0–360°
  sign: string;
  degree: number;          // degree within sign (0–29)
  minutes: number;         // arcminutes within degree
  house?: number;          // 1–12 if birth time known
  isRetrograde: boolean;
  element: string;
  modality: string;
  ruler: string;           // the sign's ruling planet
}

export interface SpecialPoint {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
  minutes: number;
  house?: number;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  aspectName: string;
  angle: number;           // exact angle between planets
  orb: number;             // deviation from exact (degrees)
  nature: string;          // harmonious / tense / neutral
}

export interface NatalChart {
  // Birth info
  birthDate: string;
  birthTime?: string;
  birthLocation?: string;
  hasTime: boolean;        // true if birth time was provided

  // Planets
  planets: Record<string, PlanetPosition>;

  // Special points
  lilith: SpecialPoint;        // Black Moon Lilith (Mean Lunar Apogee)
  northNode: SpecialPoint;     // Mean North Node (Rahu)
  southNode: SpecialPoint;     // Mean South Node (Ketu)

  // Angles (only if birth time provided)
  ascendant?: number;
  ascendantSign?: string;
  midheaven?: number;
  midheavenSign?: string;

  // Analysis
  aspects: Aspect[];
  stelliums: { sign: string; planets: string[] }[];  // 3+ planets in same sign

  // Distribution
  elementCounts: Record<string, number>;
  modalityCounts: Record<string, number>;
  dominantElement: string;
  dominantModality: string;

  // Retrograde planets
  retrogradeplanets: string[];

  // Key summary for Sol
  summary: {
    sunSign: string;
    moonSign: string;
    risingSign?: string;
    lilithSign: string;
    northNodeSign: string;
    chartRuler?: string;     // ruler of Ascendant sign
    dominantElement: string;
    dominantModality: string;
    stelliums: string[];     // e.g. ["Sagittarius (Sun, Moon, Lilith)"]
    retrogradeplanets: string[];
    keyTheme: string;        // computed narrative theme
  };
}

// ── Julian Day helper (mirrors ephemeris.ts internal) ───────────────────────

function dateToJD(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;

  let yr = y, mo = m;
  if (mo <= 2) { yr -= 1; mo += 12; }

  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5 + h / 24;
}

// ── Black Moon Lilith (Mean Lunar Apogee) ────────────────────────────────────

/**
 * Computes Black Moon Lilith (Mean Lunar Apogee) longitude.
 * Based on Meeus "Astronomical Algorithms" ch. 48.
 * Accuracy: ~0.5° (sufficient for natal astrology).
 */
export function getLilithLongitude(date: Date): number {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525;  // Julian centuries from J2000.0

  // Mean Lunar Apogee (Meeus formula)
  const L = 83.3532430
    + 4069.0137287 * T
    - 0.0103077 * T * T
    - T * T * T / 80053;

  return ((L % 360) + 360) % 360;
}

// ── Mean Lunar Nodes ─────────────────────────────────────────────────────────

/**
 * Computes Mean North Node (Rahu) longitude.
 * Mean Node moves retrograde ~19.3°/year.
 */
export function getNorthNodeLongitude(date: Date): number {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525;

  const N = 125.04452
    - 1934.136261 * T
    + 0.0020708 * T * T
    + T * T * T / 450000;

  return ((N % 360) + 360) % 360;
}

// ── Retrograde detection ─────────────────────────────────────────────────────

/**
 * Detects which planets are retrograde on a given date.
 * Compares longitude to yesterday — retrograde if moving backward.
 */
export function getRetrogradeStatus(date: Date): boolean[] {
  const yesterday = new Date(date.getTime() - 86400000);
  const today = getPlanetaryLongitudes(date);
  const yest = getPlanetaryLongitudes(yesterday);

  return today.map((lon, i) => {
    let diff = lon - yest[i];
    // Normalize for 0°/360° wraparound
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    // Sun and Moon never retrograde
    if (i === 0 || i === 1) return false;
    return diff < 0;
  });
}

// ── Aspect computation ───────────────────────────────────────────────────────

function angleBetween(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function computeAspects(
  bodies: { name: string; longitude: number }[]
): Aspect[] {
  const aspects: Aspect[] = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const angle = angleBetween(bodies[i].longitude, bodies[j].longitude);

      for (const asp of ASPECTS) {
        const orb = Math.abs(angle - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({
            planet1: bodies[i].name,
            planet2: bodies[j].name,
            aspectName: asp.name,
            angle: Math.round(angle * 10) / 10,
            orb: Math.round(orb * 10) / 10,
            nature: asp.nature,
          });
          break;
        }
      }
    }
  }

  return aspects;
}

// ── Stellium detection ───────────────────────────────────────────────────────

function findStelliums(positions: { name: string; sign: string }[]): { sign: string; planets: string[] }[] {
  const bySign: Record<string, string[]> = {};
  for (const p of positions) {
    if (!bySign[p.sign]) bySign[p.sign] = [];
    bySign[p.sign].push(p.name);
  }
  return Object.entries(bySign)
    .filter(([, planets]) => planets.length >= 3)
    .map(([sign, planets]) => ({ sign, planets }));
}

// ── Key theme generator ──────────────────────────────────────────────────────

function computeKeyTheme(chart: Omit<NatalChart, 'summary'>): string {
  const stelliums = chart.stelliums;
  const retro = chart.retrogradeplanets;
  const { sunSign, moonSign } = {
    sunSign: chart.planets['Sun']?.sign ?? '',
    moonSign: chart.planets['Moon']?.sign ?? '',
  };
  const lilithSign = chart.lilith.sign;

  const parts: string[] = [];

  if (stelliums.length > 0) {
    const s = stelliums[0];
    if (s.planets.includes('Sun') && s.planets.includes('Moon') && s.planets.includes('Lilith')) {
      parts.push(`Triple ${s.sign} stellium (Sun + Moon + Lilith) — identity, emotion, and shadow unified`);
    } else {
      parts.push(`${s.sign} stellium: ${s.planets.join(', ')}`);
    }
  } else if (sunSign === moonSign) {
    parts.push(`Sun and Moon both in ${sunSign} — identity and emotional nature aligned`);
  }

  if (lilithSign === sunSign) {
    parts.push(`Lilith conjunct Sun energy — the wild truth is inseparable from the self`);
  }

  if (retro.includes('Saturn')) parts.push('Saturn retrograde — karmic restructuring, internal discipline');
  if (retro.includes('Jupiter')) parts.push('Jupiter retrograde — expansion turned inward, inner wisdom phase');
  if (retro.includes('Venus')) parts.push('Venus retrograde — deep reassessment of values and relationships');

  if (parts.length === 0) {
    parts.push(`${sunSign} Sun, ${moonSign} Moon — ${ELEMENTS[sunSign] ?? ''} identity meeting ${ELEMENTS[moonSign] ?? ''} feeling`);
  }

  return parts.join('. ');
}

// ── Main natal chart function ─────────────────────────────────────────────────

export function computeNatalChart(
  birthData: BirthData,
  locationLabel?: string,
): NatalChart {
  const date = birthDataToDate(birthData);
  const hasTime = birthData.hour !== undefined && birthData.hour !== null;

  // Planetary longitudes & signs
  const longitudes = getPlanetaryLongitudes(date);
  const signs = getPlanetarySigns(longitudes);
  const retrograde = getRetrogradeStatus(date);

  // Houses & ascendant (only if birth time + location provided)
  let houses: number[] | undefined;
  let ascendant: number | undefined;
  let midheaven: number | undefined;

  if (hasTime && birthData.latitude !== undefined && birthData.longitude !== undefined) {
    ascendant = computeAscendant(date, birthData.latitude, birthData.longitude);
    houses = getPlanetaryHouses(longitudes, date, birthData.latitude, birthData.longitude);

    // Midheaven (MC): 90° before ascendant in equal house
    midheaven = ((ascendant + 270) % 360);
  }

  // Build planet positions
  const planets: Record<string, PlanetPosition> = {};
  PLANET_NAMES.forEach((name, i) => {
    const lon = longitudes[i];
    const sign = signs[i];
    const degInSign = lon % 30;
    planets[name] = {
      name,
      longitude: Math.round(lon * 100) / 100,
      sign,
      degree: Math.floor(degInSign),
      minutes: Math.floor((degInSign % 1) * 60),
      house: houses?.[i],
      isRetrograde: retrograde[i],
      element: ELEMENTS[sign] ?? '',
      modality: MODALITIES[sign] ?? '',
      ruler: RULERS[sign] ?? '',
    };
  });

  // Special points
  const lilithLon = getLilithLongitude(date);
  const lilithSign = getSign(lilithLon);
  const lilithDeg = lilithLon % 30;

  const northNodeLon = getNorthNodeLongitude(date);
  const northNodeSign = getSign(northNodeLon);
  const nnDeg = northNodeLon % 30;

  const southNodeLon = ((northNodeLon + 180) % 360);
  const southNodeSign = getSign(southNodeLon);
  const snDeg = southNodeLon % 30;

  // House positions for special points (if we have ascendant)
  const lilithHouse = ascendant !== undefined
    ? Math.floor(((lilithLon - ascendant + 360) % 360) / 30) + 1
    : undefined;
  const nnHouse = ascendant !== undefined
    ? Math.floor(((northNodeLon - ascendant + 360) % 360) / 30) + 1
    : undefined;
  const snHouse = ascendant !== undefined
    ? Math.floor(((southNodeLon - ascendant + 360) % 360) / 30) + 1
    : undefined;

  const lilith: SpecialPoint = {
    name: 'Lilith',
    longitude: Math.round(lilithLon * 100) / 100,
    sign: lilithSign,
    degree: Math.floor(lilithDeg),
    minutes: Math.floor((lilithDeg % 1) * 60),
    house: lilithHouse,
  };

  const northNode: SpecialPoint = {
    name: 'North Node',
    longitude: Math.round(northNodeLon * 100) / 100,
    sign: northNodeSign,
    degree: Math.floor(nnDeg),
    minutes: Math.floor((nnDeg % 1) * 60),
    house: nnHouse,
  };

  const southNode: SpecialPoint = {
    name: 'South Node',
    longitude: Math.round(southNodeLon * 100) / 100,
    sign: southNodeSign,
    degree: Math.floor(snDeg),
    minutes: Math.floor((snDeg % 1) * 60),
    house: snHouse,
  };

  // Aspects (all planets + lilith + nodes)
  const allBodies = [
    ...PLANET_NAMES.map(n => ({ name: n, longitude: longitudes[PLANET_NAMES.indexOf(n)] })),
    { name: 'Lilith', longitude: lilithLon },
    { name: 'North Node', longitude: northNodeLon },
  ];
  const aspects = computeAspects(allBodies);

  // Element & modality distribution
  const elementCounts: Record<string, number> = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalityCounts: Record<string, number> = { Cardinal: 0, Fixed: 0, Mutable: 0 };
  const stelliumBodies: { name: string; sign: string }[] = [];

  PLANET_NAMES.forEach(name => {
    const p = planets[name];
    elementCounts[p.element] = (elementCounts[p.element] ?? 0) + 1;
    modalityCounts[p.modality] = (modalityCounts[p.modality] ?? 0) + 1;
    stelliumBodies.push({ name, sign: p.sign });
  });
  // Add Lilith to stellium check
  stelliumBodies.push({ name: 'Lilith', sign: lilithSign });

  const dominantElement = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0][0];
  const dominantModality = Object.entries(modalityCounts).sort((a, b) => b[1] - a[1])[0][0];

  const stelliums = findStelliums(stelliumBodies);
  const retrogradeplanets = PLANET_NAMES.filter((_, i) => retrograde[i]);

  const partialChart = {
    birthDate: `${birthData.year}-${String(birthData.month).padStart(2, '0')}-${String(birthData.day).padStart(2, '0')}`,
    birthTime: hasTime ? `${String(birthData.hour).padStart(2, '0')}:${String(birthData.minute ?? 0).padStart(2, '0')}` : undefined,
    birthLocation: locationLabel,
    hasTime,
    planets,
    lilith,
    northNode,
    southNode,
    ascendant: ascendant !== undefined ? Math.round(ascendant * 100) / 100 : undefined,
    ascendantSign: ascendant !== undefined ? getSign(ascendant) : undefined,
    midheaven: midheaven !== undefined ? Math.round(midheaven * 100) / 100 : undefined,
    midheavenSign: midheaven !== undefined ? getSign(midheaven) : undefined,
    aspects,
    stelliums,
    elementCounts,
    modalityCounts,
    dominantElement,
    dominantModality,
    retrogradeplanets,
  };

  const keyTheme = computeKeyTheme(partialChart);

  const summary = {
    sunSign: planets['Sun'].sign,
    moonSign: planets['Moon'].sign,
    risingSign: partialChart.ascendantSign,
    lilithSign,
    northNodeSign,
    chartRuler: partialChart.ascendantSign ? RULERS[partialChart.ascendantSign] : undefined,
    dominantElement,
    dominantModality,
    stelliums: stelliums.map(s => `${s.sign} (${s.planets.join(', ')})`),
    retrogradeplanets,
    keyTheme,
  };

  return { ...partialChart, summary };
}

// ── Current transits (for cross-referencing with natal) ──────────────────────

export interface Transit {
  planet: string;
  currentSign: string;
  currentLongitude: number;
  isRetrograde: boolean;
  aspectsToNatal: Aspect[];
}

export function getCurrentTransits(natal: NatalChart): Transit[] {
  const now = new Date();
  const currentLons = getPlanetaryLongitudes(now);
  const currentSigns = currentLons.map(l => getSign(l));
  const retros = getRetrogradeStatus(now);

  const natalBodies = [
    ...PLANET_NAMES.map((n, i) => ({ name: n, longitude: natal.planets[n].longitude })),
    { name: 'Lilith', longitude: natal.lilith.longitude },
    { name: 'North Node', longitude: natal.northNode.longitude },
  ];

  return PLANET_NAMES.map((name, i) => {
    const transitBody = { name: `Transit ${name}`, longitude: currentLons[i] };
    const aspectsToNatal = computeAspects([transitBody, ...natalBodies])
      .filter(a => a.planet1 === transitBody.name || a.planet2 === transitBody.name)
      .map(a => ({
        ...a,
        planet1: a.planet1.replace('Transit ', ''),
        planet2: a.planet2.replace('Transit ', ''),
      }));

    return {
      planet: name,
      currentSign: currentSigns[i],
      currentLongitude: Math.round(currentLons[i] * 100) / 100,
      isRetrograde: retros[i],
      aspectsToNatal,
    };
  });
}

// ── Format chart as readable text (for Sol) ──────────────────────────────────

export function formatChartForSol(chart: NatalChart): string {
  const lines: string[] = [];

  lines.push(`═══ NATAL CHART ═══`);
  lines.push(`Born: ${chart.birthDate}${chart.birthTime ? ' at ' + chart.birthTime : ''}${chart.birthLocation ? ', ' + chart.birthLocation : ''}`);
  lines.push('');

  lines.push('PERSONAL PLANETS:');
  ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'].forEach(name => {
    const p = chart.planets[name];
    if (!p) return;
    const retro = p.isRetrograde ? ' ℞' : '';
    const house = p.house ? ` [H${p.house}]` : '';
    lines.push(`  ${name}: ${p.degree}°${p.minutes}' ${p.sign}${retro}${house}`);
  });

  lines.push('');
  lines.push('SOCIAL/OUTER PLANETS:');
  ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].forEach(name => {
    const p = chart.planets[name];
    if (!p) return;
    const retro = p.isRetrograde ? ' ℞' : '';
    lines.push(`  ${name}: ${p.degree}°${p.minutes}' ${p.sign}${retro}`);
  });

  lines.push('');
  lines.push('SPECIAL POINTS:');
  lines.push(`  Lilith (BML): ${chart.lilith.degree}°${chart.lilith.minutes}' ${chart.lilith.sign}`);
  lines.push(`  North Node: ${chart.northNode.degree}°${chart.northNode.minutes}' ${chart.northNode.sign}`);
  lines.push(`  South Node: ${chart.southNode.degree}°${chart.southNode.minutes}' ${chart.southNode.sign}`);

  if (chart.ascendantSign) {
    lines.push('');
    lines.push('ANGLES:');
    lines.push(`  Rising (ASC): ${chart.ascendantSign}`);
    lines.push(`  Midheaven (MC): ${chart.midheavenSign}`);
    lines.push(`  Chart Ruler: ${chart.summary.chartRuler}`);
  }

  lines.push('');
  lines.push(`DOMINANT ELEMENT: ${chart.dominantElement}`);
  lines.push(`DOMINANT MODALITY: ${chart.dominantModality}`);

  if (chart.stelliums.length > 0) {
    lines.push('');
    lines.push('STELLIUMS:');
    chart.stelliums.forEach(s => {
      lines.push(`  ${s.sign}: ${s.planets.join(', ')}`);
    });
  }

  if (chart.retrogradeplanets.length > 0) {
    lines.push('');
    lines.push(`RETROGRADE: ${chart.retrogradeplanets.join(', ')}`);
  }

  lines.push('');
  lines.push(`KEY THEME: ${chart.summary.keyTheme}`);

  return lines.join('\n');
}
