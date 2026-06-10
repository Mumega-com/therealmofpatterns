import { describe, it, expect } from 'vitest';
import {
  computeNatalChart,
  getLilithLongitude,
  getNorthNodeLongitude,
  getRetrogradeStatus,
  formatChartForSol,
} from '../src/lib/natal';
import { SIGNS, getSign } from '../src/lib/ephemeris';
import type { BirthData } from '../src/types';

const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));

// Fixed reference chart: 2000-01-01 12:00 UTC, London
const REF_BD: BirthData = {
  year: 2000,
  month: 1,
  day: 1,
  hour: 12,
  minute: 0,
  latitude: 51.5,
  longitude: 0,
  timezone_offset: 0,
};

describe('Natal Chart Engine', () => {
  describe('computeNatalChart — known reference chart (2000-01-01 12:00 UTC, London)', () => {
    const chart = computeNatalChart(REF_BD, 'London');

    it('places the luminaries in their historically known signs', () => {
      expect(chart.summary.sunSign).toBe('Capricorn');
      expect(chart.summary.moonSign).toBe('Scorpio');
    });

    it('computes Libra rising with Venus as chart ruler', () => {
      expect(chart.hasTime).toBe(true);
      expect(chart.summary.risingSign).toBe('Libra');
      expect(chart.summary.chartRuler).toBe('Venus');
    });

    it('midheaven sits 90° behind the ascendant (equal house MC)', () => {
      expect(chart.ascendant).toBeDefined();
      expect(chart.midheaven).toBeCloseTo((chart.ascendant! + 270) % 360, 1);
      expect(chart.midheavenSign).toBe(getSign(chart.midheaven!));
    });

    it('detects the known Aquarius stellium (Mars, Uranus, Neptune)', () => {
      const aquarius = chart.stelliums.find((s) => s.sign === 'Aquarius');
      expect(aquarius).toBeDefined();
      expect(aquarius!.planets).toEqual(expect.arrayContaining(['Mars', 'Uranus', 'Neptune']));
    });

    it('detects Saturn retrograde (historically true on 2000-01-01)', () => {
      expect(chart.retrogradeplanets).toContain('Saturn');
      expect(chart.planets['Saturn'].isRetrograde).toBe(true);
      // Sun & Moon can never be retrograde
      expect(chart.planets['Sun'].isRetrograde).toBe(false);
      expect(chart.planets['Moon'].isRetrograde).toBe(false);
    });

    it('places Lilith in Gemini and the North Node in Leo', () => {
      expect(chart.summary.lilithSign).toBe('Gemini');
      expect(chart.summary.northNodeSign).toBe('Leo');
    });

    it('all planet positions are internally consistent', () => {
      for (const p of Object.values(chart.planets)) {
        expect(p.longitude).toBeGreaterThanOrEqual(0);
        expect(p.longitude).toBeLessThan(360);
        expect(p.sign).toBe(getSign(p.longitude));
        expect(p.degree).toBeGreaterThanOrEqual(0);
        expect(p.degree).toBeLessThan(30);
        expect(p.minutes).toBeGreaterThanOrEqual(0);
        expect(p.minutes).toBeLessThan(60);
        expect(p.house).toBeGreaterThanOrEqual(1);
        expect(p.house).toBeLessThanOrEqual(12);
        expect(['Fire', 'Earth', 'Air', 'Water']).toContain(p.element);
        expect(['Cardinal', 'Fixed', 'Mutable']).toContain(p.modality);
        expect(p.ruler.length).toBeGreaterThan(0);
      }
    });

    it('element and modality counts each sum to 10 planets', () => {
      const elSum = Object.values(chart.elementCounts).reduce((a, b) => a + b, 0);
      const moSum = Object.values(chart.modalityCounts).reduce((a, b) => a + b, 0);
      expect(elSum).toBe(10);
      expect(moSum).toBe(10);
    });

    it('south node is exactly opposite the north node', () => {
      const expected = (chart.northNode.longitude + 180) % 360;
      expect(chart.southNode.longitude).toBeCloseTo(expected, 1);
      // Leo's opposite sign is Aquarius
      expect(chart.southNode.sign).toBe('Aquarius');
    });

    it('aspects are valid: distinct bodies, orb within limits, known nature', () => {
      expect(chart.aspects.length).toBeGreaterThan(0);
      for (const a of chart.aspects) {
        expect(a.planet1).not.toBe(a.planet2);
        expect(a.orb).toBeGreaterThanOrEqual(0);
        expect(a.orb).toBeLessThanOrEqual(8); // largest defined orb
        expect(['harmonious', 'tense', 'neutral']).toContain(a.nature);
        expect(['Conjunction', 'Sextile', 'Square', 'Trine', 'Opposition']).toContain(a.aspectName);
      }
    });

    it('stelliums always contain at least 3 bodies', () => {
      for (const s of chart.stelliums) {
        expect(s.planets.length).toBeGreaterThanOrEqual(3);
        expect(SIGNS).toContain(s.sign as (typeof SIGNS)[number]);
      }
    });

    it('produces a non-empty key theme and formatted birth date/time', () => {
      expect(chart.summary.keyTheme.length).toBeGreaterThan(0);
      expect(chart.birthDate).toBe('2000-01-01');
      expect(chart.birthTime).toBe('12:00');
      expect(chart.birthLocation).toBe('London');
    });

    it('is deterministic — same input yields identical chart', () => {
      const again = computeNatalChart(REF_BD, 'London');
      expect(again).toEqual(chart);
    });
  });

  describe('computeNatalChart — unknown birth time', () => {
    const chart = computeNatalChart({ year: 2000, month: 1, day: 1 });

    it('marks hasTime false and omits time-dependent data', () => {
      expect(chart.hasTime).toBe(false);
      expect(chart.birthTime).toBeUndefined();
      expect(chart.ascendant).toBeUndefined();
      expect(chart.ascendantSign).toBeUndefined();
      expect(chart.midheaven).toBeUndefined();
      expect(chart.summary.risingSign).toBeUndefined();
      expect(chart.summary.chartRuler).toBeUndefined();
    });

    it('omits houses for all planets and special points', () => {
      for (const p of Object.values(chart.planets)) {
        expect(p.house).toBeUndefined();
      }
      expect(chart.lilith.house).toBeUndefined();
      expect(chart.northNode.house).toBeUndefined();
    });

    it('still computes signs from the default noon chart', () => {
      expect(chart.summary.sunSign).toBe('Capricorn');
      expect(chart.summary.moonSign.length).toBeGreaterThan(0);
    });

    it('time without location also omits the ascendant', () => {
      const c = computeNatalChart({ year: 2000, month: 1, day: 1, hour: 12 });
      expect(c.hasTime).toBe(true);
      expect(c.ascendant).toBeUndefined();
    });
  });

  describe('computeNatalChart — out-of-range input', () => {
    it('does not throw on month 13; JS Date rolls it into January of the next year', () => {
      const rolled = computeNatalChart({ year: 2000, month: 13, day: 1 });
      const jan2001 = computeNatalChart({ year: 2001, month: 1, day: 1 });
      expect(rolled.planets['Sun'].longitude).toBeCloseTo(jan2001.planets['Sun'].longitude, 1);
    });

    it('does not throw on day 32; rolls into the next month', () => {
      const rolled = computeNatalChart({ year: 2000, month: 1, day: 32 });
      const feb1 = computeNatalChart({ year: 2000, month: 2, day: 1 });
      expect(rolled.planets['Sun'].longitude).toBeCloseTo(feb1.planets['Sun'].longitude, 1);
    });
  });

  describe('getLilithLongitude', () => {
    it('matches the Meeus mean lunar apogee at J2000 (83.353°, Gemini)', () => {
      const l = getLilithLongitude(J2000);
      expect(l).toBeCloseTo(83.353, 2);
      expect(getSign(l)).toBe('Gemini');
    });

    it('advances ~40.7°/year (mean apogee cycle ~8.85 years)', () => {
      const l0 = getLilithLongitude(J2000);
      const l1 = getLilithLongitude(new Date(Date.UTC(2001, 0, 1, 12)));
      let delta = l1 - l0;
      if (delta < 0) delta += 360;
      expect(delta).toBeGreaterThan(39);
      expect(delta).toBeLessThan(42);
    });
  });

  describe('getNorthNodeLongitude', () => {
    it('matches the mean node at J2000 (125.045°, Leo)', () => {
      const n = getNorthNodeLongitude(J2000);
      expect(n).toBeCloseTo(125.0445, 2);
      expect(getSign(n)).toBe('Leo');
    });

    it('moves retrograde (~1.6° backward over 30 days)', () => {
      const n0 = getNorthNodeLongitude(J2000);
      const n30 = getNorthNodeLongitude(new Date(J2000.getTime() + 30 * 86400000));
      const delta = n0 - n30; // positive = retrograde motion
      expect(delta).toBeGreaterThan(1.4);
      expect(delta).toBeLessThan(1.8);
    });
  });

  describe('getRetrogradeStatus', () => {
    it('returns 10 booleans with Sun and Moon always direct', () => {
      for (const date of [J2000, new Date(Date.UTC(1986, 10, 29, 17)), new Date(Date.UTC(2024, 5, 1))]) {
        const status = getRetrogradeStatus(date);
        expect(status).toHaveLength(10);
        expect(status[0]).toBe(false); // Sun
        expect(status[1]).toBe(false); // Moon
        for (const s of status) expect(typeof s).toBe('boolean');
      }
    });

    it('detects Saturn retrograde on 2000-01-01 (stationed direct ~Jan 12, 2000)', () => {
      const status = getRetrogradeStatus(J2000);
      expect(status[6]).toBe(true); // Saturn at index 6
    });
  });

  describe('formatChartForSol', () => {
    it('includes all major chart sections', () => {
      const text = formatChartForSol(computeNatalChart(REF_BD, 'London'));
      expect(text).toContain('NATAL CHART');
      expect(text).toContain('Born: 2000-01-01 at 12:00, London');
      expect(text).toContain('PERSONAL PLANETS:');
      expect(text).toContain('SOCIAL/OUTER PLANETS:');
      expect(text).toContain('Lilith (BML):');
      expect(text).toContain('Rising (ASC): Libra');
      expect(text).toContain('RETROGRADE: Saturn');
      expect(text).toContain('KEY THEME:');
    });

    it('omits the angles section when birth time is unknown', () => {
      const text = formatChartForSol(computeNatalChart({ year: 2000, month: 1, day: 1 }));
      expect(text).not.toContain('Rising (ASC):');
      expect(text).not.toContain('ANGLES:');
    });
  });
});
