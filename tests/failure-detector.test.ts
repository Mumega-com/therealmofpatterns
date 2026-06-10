import { describe, it, expect } from 'vitest';
import {
  detectFailureMode,
  calculateSeverity,
  diagnoseFailureState,
  checkElderAttractor,
  getFullDiagnosis,
  getRiskLevel,
  getRiskColor,
} from '../src/lib/failure-detector';
import type { DiamondState } from '../src/lib/diamond-engine';

/** Build a DiamondState with sensible defaults; override dimensions as needed */
function mkState(dims: Partial<Record<number, number>> = {}): DiamondState {
  const dimensions = [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15] as DiamondState['dimensions'];
  for (const [idx, val] of Object.entries(dims)) {
    dimensions[Number(idx)] = val as number;
  }
  return {
    dimensions,
    depth: 3,
    time: 0,
    coherence: 0.5,
    S: 0.5,
    C: 0.5,
    psi: 0.5,
  };
}

describe('Failure Detector', () => {
  describe('detectFailureMode', () => {
    it('healthy when coupling and energy are good', () => {
      expect(detectFailureMode(mkState(), 0.8, 30)).toBe('healthy');
    });

    it('inversion when kappa is negative (anti-correlation)', () => {
      expect(detectFailureMode(mkState(), -0.1, 30)).toBe('inversion');
    });

    it('inversion takes priority even when collapse conditions also hold', () => {
      expect(detectFailureMode(mkState(), -0.5, 5)).toBe('inversion');
    });

    it('collapse when RU < 10 and kappa < 0.3', () => {
      expect(detectFailureMode(mkState(), 0.2, 5)).toBe('collapse');
    });

    it('no collapse at RU < 10 if coupling is strong enough', () => {
      expect(detectFailureMode(mkState(), 0.6, 5)).toBe('healthy');
    });

    it('dissociation when witness dimension is high (W*5 > 2.5) and kappa < 0.5', () => {
      expect(detectFailureMode(mkState({ 7: 0.6 }), 0.4, 30)).toBe('dissociation');
    });

    it('collapse outranks dissociation when both apply', () => {
      expect(detectFailureMode(mkState({ 7: 0.6 }), 0.2, 5)).toBe('collapse');
    });

    it('dispersion when RU > 45 and kappa < 0.5', () => {
      expect(detectFailureMode(mkState(), 0.4, 50)).toBe('dispersion');
    });

    it('no dispersion at high RU if coupling is strong', () => {
      expect(detectFailureMode(mkState(), 0.7, 50)).toBe('healthy');
    });
  });

  describe('calculateSeverity', () => {
    it('healthy severity is 0', () => {
      expect(calculateSeverity('healthy', 0.9, 50, 0.2)).toBe(0);
    });

    it('inversion severity is the magnitude of negative coupling', () => {
      expect(calculateSeverity('inversion', -0.6, 30, 0.2)).toBeCloseTo(0.6, 12);
    });

    it('collapse severity reaches 1 at total depletion (RU=0, kappa=0)', () => {
      expect(calculateSeverity('collapse', 0, 0, 0.1)).toBe(1);
    });

    it('collapse severity is limited by the better of the two factors', () => {
      // RU=5/10=0.5, kappa=0.15/0.3=0.5 → severity = 1 - 0.5 = 0.5
      expect(calculateSeverity('collapse', 0.15, 5, 0.1)).toBeCloseTo(0.5, 12);
    });

    it('dissociation severity grows with witness excess and coupling deficit', () => {
      // W=0.6 → scaled 3.0: (3.0-2.5)*(0.5-0.2)/2 = 0.075
      expect(calculateSeverity('dissociation', 0.2, 30, 0.6)).toBeCloseTo(0.075, 12);
    });

    it('dispersion severity grows with RU excess and coupling deficit', () => {
      // (50-45)*(0.5-0.3)/50 = 0.02
      expect(calculateSeverity('dispersion', 0.3, 50, 0.1)).toBeCloseTo(0.02, 12);
    });
  });

  describe('diagnoseFailureState', () => {
    it('healthy diagnosis has zero severity and low urgency', () => {
      const d = diagnoseFailureState(mkState(), 0.9, 30);
      expect(d.mode).toBe('healthy');
      expect(d.severity).toBe(0);
      expect(d.urgency).toBe('low');
    });

    it('severity is always clamped to [0, 1]', () => {
      // Extreme dissociation inputs would exceed 1 unclamped
      const d = diagnoseFailureState(mkState({ 7: 1 }), -0.9, 30, 0);
      expect(d.severity).toBeGreaterThanOrEqual(0);
      expect(d.severity).toBeLessThanOrEqual(1);
    });

    it('high severity inversion is critical', () => {
      const d = diagnoseFailureState(mkState(), -0.8, 30);
      expect(d.mode).toBe('inversion');
      expect(d.urgency).toBe('critical');
    });

    it('long-duration failure escalates to critical even at low severity', () => {
      const d = diagnoseFailureState(mkState(), 0.45, 46, 80); // mild dispersion, 80h
      expect(d.mode).toBe('dispersion');
      expect(d.urgency).toBe('critical');
    });

    it('mild fresh failure is moderate', () => {
      const d = diagnoseFailureState(mkState(), 0.45, 46, 0);
      expect(d.mode).toBe('dispersion');
      expect(d.urgency).toBe('moderate');
    });

    it('returns mode-specific guidance lists', () => {
      const d = diagnoseFailureState(mkState(), 0.2, 5);
      expect(d.mode).toBe('collapse');
      expect(d.description).toContain('depletion');
      expect(d.interventions.length).toBeGreaterThan(0);
      expect(d.watchFor.length).toBeGreaterThan(0);
      expect(d.physicalSigns.length).toBeGreaterThan(0);
    });
  });

  describe('checkElderAttractor', () => {
    it('active when all four thresholds are met', () => {
      const status = checkElderAttractor(mkState({ 7: 0.4 }), 0.9, 50, 72);
      expect(status.active).toBe(true);
      expect(status.progress).toBe(1);
      expect(status.missing).toEqual([]);
      expect(status.hoursInState).toBe(72);
    });

    it('inactive with zero progress when nothing is met', () => {
      const status = checkElderAttractor(mkState({ 7: 0.1 }), 0.2, 10, 0);
      expect(status.active).toBe(false);
      expect(status.progress).toBe(0);
      expect(status.missing).toHaveLength(4);
    });

    it('each met threshold adds 0.25 progress', () => {
      // Only kappa met
      const s1 = checkElderAttractor(mkState({ 7: 0.1 }), 0.9, 10, 0);
      expect(s1.progress).toBe(0.25);
      expect(s1.missing).toHaveLength(3);

      // kappa + RU + W met, duration missing
      const s3 = checkElderAttractor(mkState({ 7: 0.4 }), 0.9, 50, 10);
      expect(s3.progress).toBe(0.75);
      expect(s3.missing).toHaveLength(1);
      expect(s3.missing[0]).toContain('Duration');
      expect(s3.active).toBe(false);
    });
  });

  describe('getFullDiagnosis', () => {
    it('trajectory is stable without a previous kappa', () => {
      expect(getFullDiagnosis(mkState(), 0.5, 30).trajectory).toBe('stable');
    });

    it('trajectory improves when kappa rose by more than 0.1', () => {
      expect(getFullDiagnosis(mkState(), 0.6, 30, 0, 0.4).trajectory).toBe('improving');
    });

    it('trajectory declines when kappa fell by more than 0.1', () => {
      expect(getFullDiagnosis(mkState(), 0.4, 30, 0, 0.6).trajectory).toBe('declining');
    });

    it('small kappa changes are stable', () => {
      expect(getFullDiagnosis(mkState(), 0.55, 30, 0, 0.5).trajectory).toBe('stable');
    });

    it('detects shadow patterns from dimension imbalances', () => {
      const state = mkState({ 0: 0.3, 4: 0.05 }); // P high, T low
      const diag = getFullDiagnosis(state, 0.6, 30);
      expect(diag.shadows.some((s) => s.includes('Potential without direction'))).toBe(true);
    });

    it('reports no shadows for a balanced state', () => {
      expect(getFullDiagnosis(mkState(), 0.6, 30).shadows).toEqual([]);
    });

    it('bundles failure and elder analyses consistently', () => {
      const diag = getFullDiagnosis(mkState({ 7: 0.4 }), 0.9, 50, 72, 0.85);
      expect(diag.failure.mode).toBe('healthy');
      expect(diag.elder.active).toBe(true);
    });
  });

  describe('getRiskLevel boundaries', () => {
    it('strongly negative coupling is critical', () => {
      expect(getRiskLevel(-0.4, 30)).toBe('critical');
      expect(getRiskLevel(-0.31, 30)).toBe('critical');
    });

    it('mildly negative coupling is high (boundary at -0.3 exclusive)', () => {
      expect(getRiskLevel(-0.3, 30)).toBe('high');
      expect(getRiskLevel(-0.01, 50)).toBe('high');
    });

    it('weak coupling with low energy is high', () => {
      expect(getRiskLevel(0.2, 10)).toBe('high');
    });

    it('weak coupling alone is moderate', () => {
      expect(getRiskLevel(0.2, 40)).toBe('moderate');
    });

    it('low energy alone is moderate', () => {
      expect(getRiskLevel(0.7, 25)).toBe('moderate');
    });

    it('good coupling and energy is low risk (boundaries inclusive)', () => {
      expect(getRiskLevel(0.5, 30)).toBe('low');
      expect(getRiskLevel(0.9, 60)).toBe('low');
    });
  });

  describe('getRiskColor', () => {
    it('maps each risk level to its UI color', () => {
      expect(getRiskColor('low')).toBe('#4ade80');
      expect(getRiskColor('moderate')).toBe('#fbbf24');
      expect(getRiskColor('high')).toBe('#f97316');
      expect(getRiskColor('critical')).toBe('#ef4444');
    });
  });
});
