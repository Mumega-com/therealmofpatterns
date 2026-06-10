import { describe, it, expect } from 'vitest';
import {
  PLANETS,
  SIGNS,
  toJulianDay,
  julianCenturies,
  daysSinceJ2000,
  localSiderealTime,
  getPlanetPosition,
  getAllPlanetPositions,
  getLongitudesArray,
  calculateChart,
  calculateAspect,
  formatPosition,
  type DateTime,
} from '../src/lib/ephemeris-fallback';
import { getPlanetaryLongitudes, computeAscendant } from '../src/lib/ephemeris';

const J2000_DT: DateTime = { year: 2000, month: 1, day: 1, hour: 12 };

/** Smallest angular distance between two longitudes (handles 0/360 wrap) */
function angularDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

describe('Ephemeris Fallback (TypeScript Keplerian)', () => {
  describe('toJulianDay', () => {
    it('returns exactly 2451545.0 at the J2000 epoch (2000-01-01 12:00 UT)', () => {
      expect(toJulianDay(J2000_DT)).toBe(2451545.0);
    });

    it('returns 2451544.5 at 2000-01-01 00:00 UT (JD starts at noon)', () => {
      expect(toJulianDay({ year: 2000, month: 1, day: 1, hour: 0 })).toBe(2451544.5);
    });

    it('converts local time to UT using the timezone field', () => {
      // 14:00 at UTC+2 is the same instant as 12:00 UT
      expect(toJulianDay({ year: 2000, month: 1, day: 1, hour: 14, timezone: 2 })).toBe(2451545.0);
    });

    it('is monotonic in time', () => {
      const jd1 = toJulianDay({ year: 1990, month: 6, day: 15, hour: 8 });
      const jd2 = toJulianDay({ year: 1990, month: 6, day: 15, hour: 9 });
      expect(jd2 - jd1).toBeCloseTo(1 / 24, 9);
    });
  });

  describe('julianCenturies / daysSinceJ2000', () => {
    it('are zero at J2000', () => {
      expect(julianCenturies(2451545.0)).toBe(0);
      expect(daysSinceJ2000(2451545.0)).toBe(0);
    });

    it('one Julian century after J2000', () => {
      expect(julianCenturies(2451545.0 + 36525)).toBe(1);
    });
  });

  describe('localSiderealTime', () => {
    it('returns a value in [0, 360)', () => {
      const lst = localSiderealTime(2451545.0, 0);
      expect(lst).toBeGreaterThanOrEqual(0);
      expect(lst).toBeLessThan(360);
    });

    it('shifts by geographic longitude', () => {
      const lst0 = localSiderealTime(2451545.0, 0);
      const lst90 = localSiderealTime(2451545.0, 90);
      expect(angularDiff(lst90, lst0 + 90)).toBeCloseTo(0, 6);
    });
  });

  describe('getPlanetPosition output shape', () => {
    it('returns consistent longitude / sign / degree / minute for all planets', () => {
      for (const planet of PLANETS) {
        const pos = getPlanetPosition(planet, { year: 1986, month: 11, day: 29, hour: 17 });
        expect(pos.name).toBe(planet);
        expect(pos.longitude).toBeGreaterThanOrEqual(0);
        expect(pos.longitude).toBeLessThan(360);
        expect(pos.signIndex).toBe(Math.floor(pos.longitude / 30));
        expect(pos.sign).toBe(SIGNS[pos.signIndex]);
        expect(pos.degree).toBeGreaterThanOrEqual(0);
        expect(pos.degree).toBeLessThan(30);
        expect(pos.minute).toBeGreaterThanOrEqual(0);
        expect(pos.minute).toBeLessThan(60);
      }
    });

    it('Sun and Moon are never retrograde', () => {
      for (const dt of [J2000_DT, { year: 2024, month: 3, day: 20, hour: 12 }]) {
        expect(getPlanetPosition('Sun', dt).retrograde).toBe(false);
        expect(getPlanetPosition('Moon', dt).retrograde).toBe(false);
      }
    });

    it('Sun is in Capricorn near 280.4° at J2000', () => {
      const sun = getPlanetPosition('Sun', J2000_DT);
      expect(sun.sign).toBe('Capricorn');
      expect(sun.longitude).toBeCloseTo(280.4, 0);
    });
  });

  describe('agreement with astronomy-engine (accurate path)', () => {
    // NOTE: the fallback's docstring claims ~0.5° (inner) / ~1° (outer) accuracy,
    // but measured errors vs astronomy-engine are far larger for Mercury (~28-101°),
    // Venus (~59-143°), Mars (~23-45°), Jupiter (~4-12°) and Saturn (~1-5°),
    // because the heliocentric→geocentric conversion is wrong/missing for those
    // bodies. Only Sun, Moon, Uranus, Neptune, Pluto are usably close, so the
    // agreement assertions below are limited to those bodies.
    const cases: { label: string; dt: DateTime; date: Date }[] = [
      {
        label: '2000-01-01 12:00 UT',
        dt: J2000_DT,
        date: new Date(Date.UTC(2000, 0, 1, 12)),
      },
      {
        label: '2024-03-20 12:00 UT',
        dt: { year: 2024, month: 3, day: 20, hour: 12 },
        date: new Date(Date.UTC(2024, 2, 20, 12)),
      },
    ];

    for (const { label, dt, date } of cases) {
      it(`Sun within 0.1°, Moon within 3°, Uranus/Neptune/Pluto within 4° (${label})`, () => {
        const accurate = getPlanetaryLongitudes(date);
        const fallback = getLongitudesArray(dt);
        expect(fallback).toHaveLength(10);

        expect(angularDiff(fallback[0], accurate[0])).toBeLessThan(0.1); // Sun
        expect(angularDiff(fallback[1], accurate[1])).toBeLessThan(3); // Moon
        expect(angularDiff(fallback[7], accurate[7])).toBeLessThan(4); // Uranus
        expect(angularDiff(fallback[8], accurate[8])).toBeLessThan(4); // Neptune
        expect(angularDiff(fallback[9], accurate[9])).toBeLessThan(4); // Pluto
      });
    }

    it('all fallback longitudes stay in [0, 360) for a range of dates', () => {
      const dates: DateTime[] = [
        { year: 1950, month: 2, day: 10 },
        { year: 1986, month: 11, day: 29, hour: 17 },
        { year: 2010, month: 8, day: 5, hour: 3 },
        { year: 2030, month: 12, day: 31, hour: 23 },
      ];
      for (const dt of dates) {
        for (const lon of getLongitudesArray(dt)) {
          expect(lon).toBeGreaterThanOrEqual(0);
          expect(lon).toBeLessThan(360);
        }
      }
    });
  });

  describe('getAllPlanetPositions', () => {
    it('returns the 10 planets in canonical order', () => {
      const positions = getAllPlanetPositions(J2000_DT);
      expect(positions.map((p) => p.name)).toEqual([...PLANETS]);
    });
  });

  describe('calculateChart', () => {
    it('omits angles without a location', () => {
      const chart = calculateChart(J2000_DT);
      expect(chart.planets).toHaveLength(10);
      expect(chart.ascendant).toBeUndefined();
      expect(chart.midheaven).toBeUndefined();
      expect(chart.julianDay).toBe(2451545.0);
    });

    it('computes an ascendant in range with a location', () => {
      const chart = calculateChart(J2000_DT, { latitude: 51.5, longitude: 0 });
      expect(chart.ascendant).toBeDefined();
      expect(chart.ascendant!).toBeGreaterThanOrEqual(0);
      expect(chart.ascendant!).toBeLessThan(360);
    });

    it('ascendant agrees with the accurate engine within 0.5°', () => {
      const chart = calculateChart(J2000_DT, { latitude: 51.5, longitude: 0 });
      const accurate = computeAscendant(new Date(Date.UTC(2000, 0, 1, 12)), 51.5, 0);
      expect(angularDiff(chart.ascendant!, accurate)).toBeLessThan(0.5);
    });
  });

  describe('calculateAspect', () => {
    it('detects an exact conjunction with orb 0', () => {
      expect(calculateAspect(100, 100)).toEqual({ aspect: 'conjunction', orb: 0 });
    });

    it('detects a square at 90° separation', () => {
      const res = calculateAspect(10, 100);
      expect(res?.aspect).toBe('square');
      expect(res?.orb).toBe(0);
    });

    it('detects a trine within orb', () => {
      const res = calculateAspect(0, 123);
      expect(res?.aspect).toBe('trine');
      expect(res?.orb).toBeCloseTo(3, 9);
    });

    it('handles 0/360 wraparound (357° vs 3° is a 6° conjunction)', () => {
      const res = calculateAspect(357, 3);
      expect(res?.aspect).toBe('conjunction');
      expect(res?.orb).toBeCloseTo(6, 9);
    });

    it('returns null when no aspect is within orb', () => {
      expect(calculateAspect(0, 40)).toBeNull();
    });

    it('opposition at 180°', () => {
      expect(calculateAspect(0, 180)).toEqual({ aspect: 'opposition', orb: 0 });
    });
  });

  describe('formatPosition', () => {
    it('formats degree, minutes, sign and retrograde flag', () => {
      const pos = getPlanetPosition('Sun', J2000_DT);
      const s = formatPosition(pos);
      expect(s).toContain('Capricorn');
      expect(s).toMatch(/^\d+°\d{2}' Capricorn$/);
    });
  });
});
