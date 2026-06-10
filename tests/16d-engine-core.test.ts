import { describe, it, expect } from 'vitest';
import {
  W,
  OMEGA,
  activation,
  compute8D,
  computeInner8D,
  compute16D,
  computeFromBirthData,
  compute16DFromBirthData,
  cosineResonance,
  getDominant,
  analyzeDimensions,
  interpretResonance,
  getDimensionTeaser,
} from '../src/lib/16d-engine';
import { getLongitudesFromBirthData, getPlanetarySigns } from '../src/lib/ephemeris';
import type { BirthData, DimensionInfo } from '../src/types';

const BD: BirthData = { year: 2000, month: 1, day: 1, hour: 12, minute: 0, timezone_offset: 0 };

describe('16D Engine — core math', () => {
  describe('activation', () => {
    it('is 1 at 0° (cosine peak)', () => {
      expect(activation(0)).toBe(1);
    });

    it('is 0 at 180° (cosine trough)', () => {
      expect(activation(180)).toBeCloseTo(0, 12);
    });

    it('is 0.5 at 90° and 270°', () => {
      expect(activation(90)).toBeCloseTo(0.5, 12);
      expect(activation(270)).toBeCloseTo(0.5, 12);
    });

    it('stays within [0, 1] across the full circle', () => {
      for (let deg = 0; deg < 360; deg += 7) {
        const a = activation(deg);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('weight matrices', () => {
    it('W is 10 planets x 8 dimensions with non-negative weights', () => {
      expect(W).toHaveLength(10);
      for (const row of W) {
        expect(row).toHaveLength(8);
        for (const w of row) {
          expect(w).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('OMEGA has 10 weights with luminaries weighted highest', () => {
      expect(OMEGA).toHaveLength(10);
      expect(OMEGA[0]).toBe(2.0); // Sun
      expect(OMEGA[1]).toBe(2.0); // Moon
      expect(Math.max(...OMEGA)).toBe(2.0);
      expect(Math.min(...OMEGA)).toBeGreaterThan(0);
    });
  });

  describe('compute8D', () => {
    it('returns 8 values in [0, 1] with the max exactly 1 (max-normalized)', () => {
      const lons = getLongitudesFromBirthData(BD);
      const v = compute8D(lons);
      expect(v).toHaveLength(8);
      for (const x of v) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
      expect(Math.max(...v)).toBe(1);
    });

    it('is deterministic for the same input', () => {
      const lons = getLongitudesFromBirthData(BD);
      expect(compute8D(lons)).toEqual(compute8D(lons));
    });

    it('produces different vectors for different planetary configurations', () => {
      const v1 = compute8D(getLongitudesFromBirthData({ year: 1990, month: 1, day: 1 }));
      const v2 = compute8D(getLongitudesFromBirthData({ year: 1990, month: 7, day: 1 }));
      expect(v1).not.toEqual(v2);
    });
  });

  describe('computeInner8D', () => {
    it('returns 8 max-normalized values in [0, 1]', () => {
      const lons = getLongitudesFromBirthData(BD);
      const signs = getPlanetarySigns(lons);
      const houses = [1, 4, 7, 10, 2, 5, 8, 11, 3, 6];
      const v = computeInner8D(lons, signs, houses);
      expect(v).toHaveLength(8);
      for (const x of v) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
      expect(Math.max(...v)).toBe(1);
    });

    it('house placement changes the vector (mixed angular vs all-cadent)', () => {
      const lons = getLongitudesFromBirthData(BD);
      const signs = getPlanetarySigns(lons);
      const mixed = computeInner8D(lons, signs, [1, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
      const cadent = computeInner8D(lons, signs, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
      expect(mixed).not.toEqual(cadent);
    });

    it('a uniform house shift (all angular vs all cadent) is normalized away', () => {
      // House weights scale OMEGA uniformly when all houses share a class,
      // so max-normalization should cancel the difference.
      const lons = getLongitudesFromBirthData(BD);
      const signs = getPlanetarySigns(lons);
      const angular = computeInner8D(lons, signs, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
      const cadent = computeInner8D(lons, signs, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
      angular.forEach((x, i) => expect(x).toBeCloseTo(cadent[i], 10));
    });
  });

  describe('compute16D / compute16DFromBirthData', () => {
    it('compute16D returns inner 8D plus its exact shadow (1 - v)', () => {
      const lons = getLongitudesFromBirthData(BD);
      const v16 = compute16D(lons);
      expect(v16).toHaveLength(16);
      for (let i = 0; i < 8; i++) {
        expect(v16[i + 8]).toBeCloseTo(1 - v16[i], 12);
      }
    });

    it('compute16DFromBirthData returns 16 values with shadow octave', () => {
      const v16 = compute16DFromBirthData(BD);
      expect(v16).toHaveLength(16);
      for (let i = 0; i < 8; i++) {
        expect(v16[i]).toBeGreaterThanOrEqual(0);
        expect(v16[i]).toBeLessThanOrEqual(1);
        expect(v16[i + 8]).toBeCloseTo(1 - v16[i], 12);
      }
    });

    it('uses house weighting when location is provided (different from no-location)', () => {
      const noLoc = computeFromBirthData(BD);
      const withLoc = computeFromBirthData({ ...BD, latitude: 51.5, longitude: 0 });
      expect(noLoc).toHaveLength(8);
      expect(withLoc).toHaveLength(8);
      expect(withLoc).not.toEqual(noLoc);
    });
  });

  describe('cosineResonance', () => {
    it('returns 1 for identical vectors', () => {
      const v = [0.2, 0.5, 0.9, 0.1, 0.7, 0.3, 0.6, 0.4];
      expect(cosineResonance(v, v)).toBeCloseTo(1, 12);
    });

    it('returns 1 for parallel vectors regardless of scale', () => {
      const v = [0.2, 0.5, 0.9, 0.1];
      const scaled = v.map((x) => x * 7.3);
      expect(cosineResonance(v, scaled)).toBeCloseTo(1, 12);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(cosineResonance([1, 0, 0, 0], [0, 1, 0, 0])).toBe(0);
    });

    it('returns -1 for opposite vectors', () => {
      expect(cosineResonance([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 12);
    });

    it('is symmetric', () => {
      const a = [0.1, 0.9, 0.4, 0.6];
      const b = [0.8, 0.2, 0.5, 0.3];
      expect(cosineResonance(a, b)).toBeCloseTo(cosineResonance(b, a), 12);
    });

    it('throws on length mismatch', () => {
      expect(() => cosineResonance([1, 2, 3], [1, 2])).toThrow('Vectors must have same length');
    });

    it('returns 0 when one vector is all zeros (no division by zero)', () => {
      expect(cosineResonance([0, 0, 0], [1, 2, 3])).toBe(0);
    });
  });

  describe('getDominant', () => {
    it('returns the index of the maximum value with value and shadow fields', () => {
      const v = [0.1, 0.3, 0.8, 0.2, 0.5, 0.1, 0.4, 0.6];
      const dom = getDominant(v);
      expect(dom.index).toBe(2);
      expect(dom.value).toBe(0.8);
      expect(dom.shadow).toBeCloseTo(0.2, 12);
      expect(dom.rank).toBe(1);
      expect(typeof dom.name).toBe('string');
      expect(typeof dom.symbol).toBe('string');
    });

    it('only considers the first 8 entries of a 16D vector', () => {
      const v16 = new Array(16).fill(0.1);
      v16[3] = 0.9; // inner max
      v16[12] = 1.0; // shadow octave — must be ignored
      expect(getDominant(v16).index).toBe(3);
    });

    it('picks the first index on ties', () => {
      const v = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
      expect(getDominant(v).index).toBe(0);
    });
  });

  describe('analyzeDimensions', () => {
    it('assigns ranks 1-8 in descending value order', () => {
      const v = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
      const dims = analyzeDimensions(v);
      expect(dims).toHaveLength(8);
      expect(dims.map((d) => d.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(dims[0].value).toBe(0.8);
      expect(dims[7].value).toBe(0.1);
      // values must be non-increasing
      for (let i = 1; i < dims.length; i++) {
        expect(dims[i].value).toBeLessThanOrEqual(dims[i - 1].value);
      }
    });

    it('rank-1 dimension agrees with getDominant', () => {
      const v = compute8D(getLongitudesFromBirthData(BD));
      const top = analyzeDimensions(v).find((d) => d.rank === 1)!;
      expect(top.index).toBe(getDominant(v).index);
    });

    it('shadow is the complement of value', () => {
      const dims = analyzeDimensions([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
      for (const d of dims) {
        expect(d.shadow).toBeCloseTo(1 - d.value, 12);
      }
    });
  });

  describe('interpretResonance boundaries', () => {
    it('classifies each band correctly, inclusive at thresholds', () => {
      expect(interpretResonance(1.0)).toBe('Near-identical pattern');
      expect(interpretResonance(0.95)).toBe('Near-identical pattern');
      expect(interpretResonance(0.949)).toBe('Strong resonance');
      expect(interpretResonance(0.85)).toBe('Strong resonance');
      expect(interpretResonance(0.84)).toBe('Moderate resonance');
      expect(interpretResonance(0.7)).toBe('Moderate resonance');
      expect(interpretResonance(0.69)).toBe('Weak resonance');
      expect(interpretResonance(0.5)).toBe('Weak resonance');
      expect(interpretResonance(0.49)).toBe('Complementary/opposite');
      expect(interpretResonance(-1)).toBe('Complementary/opposite');
    });
  });

  describe('getDimensionTeaser', () => {
    it('returns a teaser for every known dimension symbol', () => {
      for (const sym of ['P', 'E', 'μ', 'V', 'N', 'Δ', 'R', 'Φ']) {
        const teaser = getDimensionTeaser({ symbol: sym } as DimensionInfo);
        expect(teaser.length).toBeGreaterThan(10);
        expect(teaser).not.toBe('Your unique pattern awaits discovery.');
      }
    });

    it('falls back gracefully on unknown symbols', () => {
      const teaser = getDimensionTeaser({ symbol: '??' } as DimensionInfo);
      expect(teaser).toBe('Your unique pattern awaits discovery.');
    });
  });
});
