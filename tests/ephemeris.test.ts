import { describe, it, expect } from 'vitest';
import {
  SIGNS,
  ELEMENTS,
  birthDataToDate,
  getPlanetaryLongitudes,
  getLongitudesFromBirthData,
  getSign,
  getPlanetarySigns,
  getPlanetaryHouses,
  computeAscendant,
} from '../src/lib/ephemeris';
import type { BirthData } from '../src/types';

// J2000 epoch: 2000-01-01 12:00 UTC
const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

describe('Ephemeris (astronomy-engine)', () => {
  describe('getPlanetaryLongitudes', () => {
    it('returns 10 longitudes, all in [0, 360)', () => {
      const lons = getPlanetaryLongitudes(J2000);
      expect(lons).toHaveLength(10);
      for (const lon of lons) {
        expect(Number.isFinite(lon)).toBe(true);
        expect(lon).toBeGreaterThanOrEqual(0);
        expect(lon).toBeLessThan(360);
      }
    });

    it('matches known geocentric positions at J2000 (2000-01-01 12:00 UTC)', () => {
      // Reference values (geocentric apparent ecliptic longitude, JPL-grade)
      const lons = getPlanetaryLongitudes(J2000);
      expect(lons[0]).toBeCloseTo(280.37, 1); // Sun
      expect(lons[1]).toBeCloseTo(223.32, 0); // Moon
      expect(lons[2]).toBeCloseTo(271.89, 0); // Mercury
      expect(lons[3]).toBeCloseTo(241.57, 0); // Venus
      expect(lons[4]).toBeCloseTo(327.96, 0); // Mars
      expect(lons[5]).toBeCloseTo(25.25, 0); // Jupiter
      expect(lons[6]).toBeCloseTo(40.4, 0); // Saturn
      expect(lons[7]).toBeCloseTo(314.81, 0); // Uranus
      expect(lons[8]).toBeCloseTo(303.2, 0); // Neptune
      expect(lons[9]).toBeCloseTo(251.45, 0); // Pluto
    });

    it('places all 10 planets in their historically known signs at J2000', () => {
      const signs = getPlanetarySigns(getPlanetaryLongitudes(J2000));
      expect(signs).toEqual([
        'Capricorn', // Sun
        'Scorpio', // Moon
        'Capricorn', // Mercury
        'Sagittarius', // Venus
        'Aquarius', // Mars
        'Aries', // Jupiter
        'Taurus', // Saturn
        'Aquarius', // Uranus
        'Aquarius', // Neptune
        'Sagittarius', // Pluto
      ]);
    });

    it('Sun in Capricorn on 2000-01-01 (known-date sanity check)', () => {
      const lons = getPlanetaryLongitudes(J2000);
      expect(getSign(lons[0])).toBe('Capricorn');
    });

    it('Sun crosses 0° Aries at the March 2024 equinox', () => {
      // Equinox was 2024-03-20 ~03:06 UTC
      const before = getPlanetaryLongitudes(new Date(Date.UTC(2024, 2, 19, 12)));
      const after = getPlanetaryLongitudes(new Date(Date.UTC(2024, 2, 20, 12)));
      expect(getSign(before[0])).toBe('Pisces');
      expect(getSign(after[0])).toBe('Aries');
      expect(after[0]).toBeLessThan(1.5); // just past 0° Aries
    });

    it('Sun advances roughly 1 degree per day', () => {
      const d1 = getPlanetaryLongitudes(new Date(Date.UTC(2010, 5, 1, 0)));
      const d2 = getPlanetaryLongitudes(new Date(Date.UTC(2010, 5, 2, 0)));
      let diff = d2[0] - d1[0];
      if (diff < -180) diff += 360;
      expect(diff).toBeGreaterThan(0.9);
      expect(diff).toBeLessThan(1.05);
    });

    it('Moon advances roughly 13 degrees per day', () => {
      const d1 = getPlanetaryLongitudes(new Date(Date.UTC(2010, 5, 1, 0)));
      const d2 = getPlanetaryLongitudes(new Date(Date.UTC(2010, 5, 2, 0)));
      let diff = d2[1] - d1[1];
      if (diff < 0) diff += 360;
      expect(diff).toBeGreaterThan(11);
      expect(diff).toBeLessThan(16);
    });
  });

  describe('getSign boundaries', () => {
    it('maps 0° to Aries', () => {
      expect(getSign(0)).toBe('Aries');
    });

    it('maps 29.9° to Aries (still inside first sign)', () => {
      expect(getSign(29.9)).toBe('Aries');
    });

    it('maps exactly 30° to Taurus', () => {
      expect(getSign(30)).toBe('Taurus');
    });

    it('maps 359.9° to Pisces', () => {
      expect(getSign(359.9)).toBe('Pisces');
    });

    it('wraps 360° back to Aries', () => {
      expect(getSign(360)).toBe('Aries');
    });

    it('wraps negative longitudes (-10° → Pisces)', () => {
      expect(getSign(-10)).toBe('Pisces');
    });

    it('covers all 12 signs at 30° steps', () => {
      const got = Array.from({ length: 12 }, (_, i) => getSign(i * 30 + 15));
      expect(got).toEqual([...SIGNS]);
    });
  });

  describe('birthDataToDate', () => {
    it('treats hour as UTC when timezone_offset is 0', () => {
      const d = birthDataToDate({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, timezone_offset: 0 });
      expect(d.toISOString()).toBe('2000-01-01T12:00:00.000Z');
    });

    it('subtracts a positive timezone offset (UTC+3 local noon → 09:00 UTC)', () => {
      const d = birthDataToDate({ year: 2000, month: 1, day: 1, hour: 12, timezone_offset: 3 });
      expect(d.toISOString()).toBe('2000-01-01T09:00:00.000Z');
    });

    it('adds a negative timezone offset (UTC-5 local noon → 17:00 UTC)', () => {
      const d = birthDataToDate({ year: 2000, month: 1, day: 1, hour: 12, timezone_offset: -5 });
      expect(d.toISOString()).toBe('2000-01-01T17:00:00.000Z');
    });

    it('rolls over to the previous UTC day when offset pushes hour negative', () => {
      const d = birthDataToDate({ year: 2000, month: 1, day: 1, hour: 1, timezone_offset: 3 });
      expect(d.toISOString()).toBe('1999-12-31T22:00:00.000Z');
    });

    it('defaults to 12:00 when no hour is given (noon chart convention)', () => {
      const d = birthDataToDate({ year: 2000, month: 1, day: 1 });
      expect(d.toISOString()).toBe('2000-01-01T12:00:00.000Z');
    });

    it('defaults minute to 0', () => {
      const d = birthDataToDate({ year: 1986, month: 11, day: 29, hour: 17 });
      expect(d.getUTCMinutes()).toBe(0);
    });
  });

  describe('getLongitudesFromBirthData', () => {
    it('is consistent with getPlanetaryLongitudes(birthDataToDate(bd))', () => {
      const bd: BirthData = { year: 1990, month: 6, day: 15, hour: 8, minute: 30, timezone_offset: 2 };
      const viaBd = getLongitudesFromBirthData(bd);
      const viaDate = getPlanetaryLongitudes(birthDataToDate(bd));
      expect(viaBd).toEqual(viaDate);
    });
  });

  describe('getPlanetaryHouses', () => {
    it('returns house numbers 1-12 for all planets', () => {
      const lons = getPlanetaryLongitudes(J2000);
      const houses = getPlanetaryHouses(lons, J2000, 51.5, 0);
      expect(houses).toHaveLength(10);
      for (const h of houses) {
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(12);
      }
    });

    it('a planet exactly on the ascendant is in house 1', () => {
      const asc = computeAscendant(J2000, 51.5, 0);
      const houses = getPlanetaryHouses([asc], J2000, 51.5, 0);
      expect(houses[0]).toBe(1);
    });
  });

  describe('computeAscendant', () => {
    it('returns a longitude in [0, 360)', () => {
      const asc = computeAscendant(J2000, 51.5, 0);
      expect(asc).toBeGreaterThanOrEqual(0);
      expect(asc).toBeLessThan(360);
    });

    it('depends on geographic longitude (rotates with location)', () => {
      const ascLondon = computeAscendant(J2000, 51.5, 0);
      const ascTokyo = computeAscendant(J2000, 35.7, 139.7);
      expect(ascLondon).not.toBeCloseTo(ascTokyo, 0);
    });

    it('advances over a few hours of sidereal rotation', () => {
      const asc1 = computeAscendant(J2000, 51.5, 0);
      const asc2 = computeAscendant(new Date(J2000.getTime() + 2 * 3600 * 1000), 51.5, 0);
      expect(asc1).not.toBeCloseTo(asc2, 0);
    });
  });

  describe('constants', () => {
    it('SIGNS has 12 entries starting with Aries, ending with Pisces', () => {
      expect(SIGNS).toHaveLength(12);
      expect(SIGNS[0]).toBe('Aries');
      expect(SIGNS[11]).toBe('Pisces');
    });

    it('ELEMENTS assigns each sign one of the four classical elements (3 each)', () => {
      const counts: Record<string, number> = {};
      for (const sign of SIGNS) {
        const el = ELEMENTS[sign];
        expect(['Fire', 'Earth', 'Air', 'Water']).toContain(el);
        counts[el] = (counts[el] ?? 0) + 1;
      }
      expect(counts).toEqual({ Fire: 3, Earth: 3, Air: 3, Water: 3 });
    });
  });
});
