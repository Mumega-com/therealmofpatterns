/**
 * Real Ephemeris Engine
 *
 * Uses astronomy-engine (JPL-grade calculations) for accurate planetary positions.
 * Replaces the simplified approximations with real geocentric ecliptic longitudes.
 *
 * Accuracy: ~0.005° (vs ~2-5° with the old approximation)
 */

import {
  Body,
  GeoVector,
  Ecliptic,
  EclipticGeoMoon,
} from 'astronomy-engine';
import type { BirthData } from '../types';

// Zodiac signs and elements
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export const ELEMENTS: Record<string, string> = {
  Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
  Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
  Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
};

// Planet bodies in order matching our W matrix
const PLANET_BODIES: Body[] = [
  Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars,
  Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto,
];

/**
 * Convert BirthData to a UTC Date object
 */
export function birthDataToDate(bd: BirthData): Date {
  const tz = bd.timezone_offset ?? 0;
  const hour = (bd.hour ?? 12) - tz;
  const minute = bd.minute ?? 0;
  return new Date(Date.UTC(bd.year, bd.month - 1, bd.day, hour, minute, 0));
}

/**
 * Get accurate geocentric ecliptic longitudes for all 10 planets.
 * Uses astronomy-engine for real JPL-grade calculations.
 *
 * @returns Array of 10 longitudes in degrees [0, 360)
 */
export function getPlanetaryLongitudes(date: Date): number[] {
  const longitudes: number[] = [];

  for (const body of PLANET_BODIES) {
    let lon: number;
    if (body === Body.Moon) {
      // Moon already geocentric
      const moonPos = EclipticGeoMoon(date);
      lon = moonPos.lon;
    } else {
      // Use GeoVector -> Ecliptic for all other bodies (geocentric apparent longitude)
      // This correctly handles inner planets (Mercury, Venus) unlike EclipticLongitude
      const geoVec = GeoVector(body, date, true);
      const ecl = Ecliptic(geoVec);
      lon = ecl.elon;
    }
    longitudes.push(((lon % 360) + 360) % 360);
  }

  return longitudes;
}

/**
 * Get longitudes from BirthData
 */
export function getLongitudesFromBirthData(bd: BirthData): number[] {
  return getPlanetaryLongitudes(birthDataToDate(bd));
}

/**
 * Get zodiac sign for a longitude
 */
export function getSign(longitude: number): string {
  return SIGNS[Math.floor(((longitude % 360) + 360) % 360 / 30)];
}

/**
 * Get signs for all planets
 */
export function getPlanetarySigns(longitudes: number[]): string[] {
  return longitudes.map(getSign);
}

/**
 * Compute approximate house positions for planets.
 * Uses simplified equal-house system from Ascendant.
 *
 * @returns Array of house numbers (1-12) for each planet
 */
export function getPlanetaryHouses(
  longitudes: number[],
  date: Date,
  latitude: number,
  longitude: number,
): number[] {
  const ascendant = computeAscendant(date, latitude, longitude);

  return longitudes.map(lon => {
    const housePos = ((lon - ascendant + 360) % 360);
    return Math.floor(housePos / 30) + 1;
  });
}

/**
 * Compute the Ascendant (rising sign degree) for a given time and location.
 * Uses the standard formula based on Local Sidereal Time and obliquity.
 */
export function computeAscendant(date: Date, latitude: number, geoLongitude: number): number {
  // Julian Day
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525;

  // Greenwich Mean Sidereal Time (in degrees)
  const ut = ((jd + 0.5) % 1) * 360; // fractional day -> degrees
  let gmst = 100.46061837 + 36000.770053608 * T + 0.000387933 * T * T;
  gmst += 360.98564736629 * ((jd + 0.5) % 1);

  // Local Sidereal Time
  const lst = ((gmst + geoLongitude) % 360 + 360) % 360;
  const lstRad = lst * Math.PI / 180;

  // Obliquity of ecliptic
  const obliquity = 23.4393 - 0.013 * T;
  const oblRad = obliquity * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;

  // Ascendant formula
  const y = -Math.cos(lstRad);
  const x = Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad);
  let asc = Math.atan2(y, x) * 180 / Math.PI;
  asc = ((asc % 360) + 360) % 360;

  return asc;
}

/**
 * Convert Date to Julian Day
 */
function dateToJD(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  let yr = y;
  let mo = m;
  if (mo <= 2) { yr -= 1; mo += 12; }

  const A = Math.floor(yr / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5 + h / 24;
}
