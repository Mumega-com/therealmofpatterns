import { describe, it, expect } from 'vitest';
import {
  approximateLongitudes,
  compute8D,
  getDominant,
} from '../src/lib/16d-engine';

describe('16D Engine', () => {
  describe('approximateLongitudes', () => {
    it('should compute planetary longitudes for a given date', () => {
      const birthData = { year: 1990, month: 6, day: 15 };
      const longitudes = approximateLongitudes(birthData);

      // Returns array of 10 planetary longitudes
      expect(Array.isArray(longitudes)).toBe(true);
      expect(longitudes.length).toBeGreaterThanOrEqual(7);

      // All values should be degrees (0-360)
      for (const long of longitudes) {
        expect(long).toBeGreaterThanOrEqual(0);
        expect(long).toBeLessThanOrEqual(360);
      }

      // Sun (first element) should be in Gemini (around 80-90 degrees) in mid-June
      expect(longitudes[0]).toBeGreaterThan(70);
      expect(longitudes[0]).toBeLessThan(100);
    });

    it('should return different longitudes for different dates', () => {
      const date1 = { year: 1990, month: 1, day: 1 };
      const date2 = { year: 1990, month: 7, day: 1 };

      const long1 = approximateLongitudes(date1);
      const long2 = approximateLongitudes(date2);

      // Sun positions should differ by about 180 degrees (6 months apart)
      expect(long1[0]).not.toBe(long2[0]);
    });
  });

  describe('compute8D', () => {
    it('should compute 8D vector from longitudes', () => {
      const birthData = { year: 2000, month: 1, day: 1 };
      const longitudes = approximateLongitudes(birthData);
      const vector = compute8D(longitudes);

      expect(vector).toHaveLength(8);
      expect(vector.every((v) => v >= 0 && v <= 1)).toBe(true);
    });

    it('should normalize vector values between 0 and 1', () => {
      const birthData = { year: 1985, month: 12, day: 25 };
      const longitudes = approximateLongitudes(birthData);
      const vector = compute8D(longitudes);

      for (const value of vector) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getDominant', () => {
    it('should return the dominant dimension', () => {
      const birthData = { year: 1988, month: 3, day: 21 };
      const longitudes = approximateLongitudes(birthData);
      const vector = compute8D(longitudes);
      const dominant = getDominant(vector);

      expect(dominant).toHaveProperty('index');
      expect(dominant).toHaveProperty('name');
      expect(dominant).toHaveProperty('symbol');

      expect(dominant.index).toBeGreaterThanOrEqual(0);
      expect(dominant.index).toBeLessThan(8);
      expect(typeof dominant.name).toBe('string');
      expect(typeof dominant.symbol).toBe('string');
    });

    it('should return the index of the maximum value', () => {
      const vector = [0.1, 0.3, 0.8, 0.2, 0.5, 0.1, 0.4, 0.6];
      const dominant = getDominant(vector);

      expect(dominant.index).toBe(2); // 0.8 is at index 2
    });
  });
});
