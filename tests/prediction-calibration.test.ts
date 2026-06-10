import { describe, it, expect, beforeEach } from 'vitest';
import {
  getFeedbackHistory,
  storeFeedback,
  getCalibrationProfile,
  calibratePrediction,
  getCalibrationStats,
  getDimensionInsights,
  clearCalibration,
  type PredictionFeedback,
  type CalibrationProfile,
} from '../src/lib/prediction-calibration';
import type { Vector16D } from '../src/types';

// happy-dom provides window + localStorage, so the storage-backed pure logic
// is testable without mocks.

function seedHistory(entries: PredictionFeedback[]): void {
  localStorage.setItem('rop_prediction_feedback', JSON.stringify(entries));
}

function seedProfile(profile: CalibrationProfile): void {
  localStorage.setItem('rop_calibration_profile', JSON.stringify(profile));
}

function mkProfile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return {
    bias: 0,
    averageAccuracy: 75,
    recentAccuracy: 75,
    dimensionSensitivities: [1, 1, 1, 1, 1, 1, 1, 1],
    sampleCount: 10,
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

function mkFeedback(date: string, predicted: number, actual: number, transitDominant?: number): PredictionFeedback {
  const error = Math.abs(predicted - actual);
  return {
    date,
    predicted,
    actual,
    error,
    accuracy: Math.max(0, 1 - error) * 100,
    transitDominant,
  };
}

/** A 16D vector whose inner-octave maximum sits at the given index */
function vec16WithDominant(index: number): Vector16D {
  const v = new Array(16).fill(0.2);
  v[index] = 0.95;
  return v as Vector16D;
}

describe('Prediction Calibration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getFeedbackHistory', () => {
    it('returns an empty array when nothing is stored', () => {
      expect(getFeedbackHistory()).toEqual([]);
    });

    it('returns an empty array on corrupt storage instead of throwing', () => {
      localStorage.setItem('rop_prediction_feedback', '{not json');
      expect(getFeedbackHistory()).toEqual([]);
    });
  });

  describe('storeFeedback', () => {
    it('stores a feedback entry with computed error and accuracy', () => {
      storeFeedback(0.8, 0.5);
      const history = getFeedbackHistory();
      expect(history).toHaveLength(1);
      expect(history[0].predicted).toBe(0.8);
      expect(history[0].actual).toBe(0.5);
      expect(history[0].error).toBeCloseTo(0.3, 12);
      expect(history[0].accuracy).toBeCloseTo(70, 6);
      expect(history[0].date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('a perfect prediction yields 100 accuracy', () => {
      storeFeedback(0.6, 0.6);
      expect(getFeedbackHistory()[0].accuracy).toBeCloseTo(100, 12);
    });

    it('accuracy floors at 0 for wildly wrong predictions', () => {
      storeFeedback(0, 1.5);
      expect(getFeedbackHistory()[0].accuracy).toBe(0);
    });

    it('replaces the same-day entry instead of appending a duplicate', () => {
      storeFeedback(0.8, 0.5);
      storeFeedback(0.4, 0.4);
      const history = getFeedbackHistory();
      expect(history).toHaveLength(1);
      expect(history[0].predicted).toBe(0.4);
    });

    it('records the dominant transit and natal dimensions when vectors are given', () => {
      storeFeedback(0.7, 0.6, vec16WithDominant(5), vec16WithDominant(2));
      const entry = getFeedbackHistory()[0];
      expect(entry.transitDominant).toBe(5);
      expect(entry.natalDominant).toBe(2);
    });

    it('does not build a calibration profile with fewer than 3 samples', () => {
      storeFeedback(0.8, 0.5);
      expect(getCalibrationProfile()).toBeNull();
    });

    it('builds a profile with correct bias once 3+ samples exist', () => {
      // Two prior days seeded, third entry stored today
      seedHistory([
        mkFeedback('2026-06-08', 0.8, 0.6), // +0.2
        mkFeedback('2026-06-09', 0.7, 0.5), // +0.2
      ]);
      storeFeedback(0.9, 0.7); // +0.2

      const profile = getCalibrationProfile();
      expect(profile).not.toBeNull();
      expect(profile!.bias).toBeCloseTo(0.2, 6); // consistently over-predicting
      expect(profile!.sampleCount).toBe(3);
      expect(profile!.averageAccuracy).toBeCloseTo(80, 6);
    });

    it('caps stored history at 90 entries (oldest dropped)', () => {
      const old = Array.from({ length: 90 }, (_, i) =>
        mkFeedback(`2026-01-${String((i % 28) + 1).padStart(2, '0')}x${i}`, 0.5, 0.5)
      );
      seedHistory(old);
      storeFeedback(0.6, 0.6);
      const history = getFeedbackHistory();
      expect(history).toHaveLength(90);
      expect(history[history.length - 1].predicted).toBe(0.6);
    });
  });

  describe('calibratePrediction', () => {
    it('returns the raw prediction with no profile', () => {
      expect(calibratePrediction(0.7)).toBe(0.7);
    });

    it('returns the raw prediction when sample count is below 5', () => {
      seedProfile(mkProfile({ bias: 0.4, sampleCount: 4 }));
      expect(calibratePrediction(0.7)).toBe(0.7);
    });

    it('applies half the bias as correction', () => {
      seedProfile(mkProfile({ bias: 0.2 }));
      expect(calibratePrediction(0.7)).toBeCloseTo(0.6, 12); // 0.7 - 0.2*0.5
    });

    it('scales toward dimension sensitivity when a transit dominant is given', () => {
      seedProfile(mkProfile({ dimensionSensitivities: [1, 1, 1, 1, 1, 1.5, 1, 1] }));
      // raw * (1 + (1.5 - 1) * 0.3) = raw * 1.15
      expect(calibratePrediction(0.6, 5)).toBeCloseTo(0.69, 12);
    });

    it('clamps the calibrated prediction to [0, 1]', () => {
      seedProfile(mkProfile({ bias: -2 })); // would push above 1
      expect(calibratePrediction(0.9)).toBe(1);

      seedProfile(mkProfile({ bias: 2 })); // would push below 0
      expect(calibratePrediction(0.1)).toBe(0);
    });
  });

  describe('getCalibrationStats', () => {
    it('reports insufficient data when history is empty', () => {
      expect(getCalibrationStats()).toEqual({
        totalCheckins: 0,
        averageAccuracy: 0,
        bestDay: null,
        trend: 'stable',
        calibrationQuality: 'insufficient',
      });
    });

    it('quality is insufficient below 7 check-ins and learning below 14', () => {
      seedHistory(Array.from({ length: 5 }, (_, i) => mkFeedback(`d${i}`, 0.5, 0.5)));
      expect(getCalibrationStats().calibrationQuality).toBe('insufficient');

      seedHistory(Array.from({ length: 10 }, (_, i) => mkFeedback(`d${i}`, 0.5, 0.5)));
      expect(getCalibrationStats().calibrationQuality).toBe('learning');
    });

    it('quality is excellent with 14+ check-ins averaging >= 80 accuracy', () => {
      seedHistory(Array.from({ length: 14 }, (_, i) => mkFeedback(`d${i}`, 0.5, 0.55))); // 95 each
      const stats = getCalibrationStats();
      expect(stats.totalCheckins).toBe(14);
      expect(stats.averageAccuracy).toBeCloseTo(95, 6);
      expect(stats.calibrationQuality).toBe('excellent');
    });

    it('identifies the best day', () => {
      seedHistory([
        mkFeedback('2026-06-01', 0.5, 0.2), // 70
        mkFeedback('2026-06-02', 0.5, 0.45), // 95
        mkFeedback('2026-06-03', 0.5, 0.3), // 80
      ]);
      const stats = getCalibrationStats();
      expect(stats.bestDay).toEqual({ date: '2026-06-02', accuracy: expect.closeTo(95, 6) });
    });

    it('detects an improving trend (recent 7 beats previous 7 by > 5)', () => {
      const history = [
        ...Array.from({ length: 7 }, (_, i) => mkFeedback(`old${i}`, 0.5, 0.1)), // 60s
        ...Array.from({ length: 7 }, (_, i) => mkFeedback(`new${i}`, 0.5, 0.45)), // 95s
      ];
      seedHistory(history);
      expect(getCalibrationStats().trend).toBe('improving');
    });

    it('detects a declining trend', () => {
      const history = [
        ...Array.from({ length: 7 }, (_, i) => mkFeedback(`old${i}`, 0.5, 0.45)), // 95s
        ...Array.from({ length: 7 }, (_, i) => mkFeedback(`new${i}`, 0.5, 0.1)), // 60s
      ];
      seedHistory(history);
      expect(getCalibrationStats().trend).toBe('declining');
    });

    it('stays stable when the change is within 5 points', () => {
      const history = [
        ...Array.from({ length: 7 }, (_, i) => mkFeedback(`old${i}`, 0.5, 0.48)), // 98
        ...Array.from({ length: 7 }, (_, i) => mkFeedback(`new${i}`, 0.5, 0.46)), // 96
      ];
      seedHistory(history);
      expect(getCalibrationStats().trend).toBe('stable');
    });
  });

  describe('getDimensionInsights', () => {
    it('returns nulls without enough samples', () => {
      seedProfile(mkProfile({ sampleCount: 13 }));
      expect(getDimensionInsights()).toEqual({ mostSensitive: null, leastSensitive: null });
    });

    it('returns most and least sensitive dimensions when spread is meaningful', () => {
      seedProfile(
        mkProfile({
          sampleCount: 20,
          dimensionSensitivities: [1, 1, 0.7, 1, 1, 1.4, 1, 1],
        })
      );
      const insights = getDimensionInsights();
      expect(insights.mostSensitive?.index).toBe(5);
      expect(insights.mostSensitive?.sensitivity).toBe(1.4);
      expect(insights.leastSensitive?.index).toBe(2);
      expect(insights.leastSensitive?.sensitivity).toBe(0.7);
    });

    it('returns nulls when sensitivities are effectively flat (< 0.1 spread)', () => {
      seedProfile(
        mkProfile({
          sampleCount: 20,
          dimensionSensitivities: [1, 1.05, 1, 1, 1, 1, 1, 0.99],
        })
      );
      expect(getDimensionInsights()).toEqual({ mostSensitive: null, leastSensitive: null });
    });
  });

  describe('clearCalibration', () => {
    it('removes both feedback history and the profile', () => {
      storeFeedback(0.8, 0.5);
      seedProfile(mkProfile());
      clearCalibration();
      expect(getFeedbackHistory()).toEqual([]);
      expect(getCalibrationProfile()).toBeNull();
    });
  });
});
