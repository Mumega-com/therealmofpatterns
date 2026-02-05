import { atom, map, computed } from 'nanostores';
import { $stage, setStage, stageFromKappa, type Stage } from './app';
import { saveHistory } from '../lib/history';

// =====================
// FORECAST TYPES
// =====================
export type FailureMode = 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';

export interface Aspect {
  transitOperator: string;
  natalAnchor: string;
  type: 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile';
  strength: number;  // 0-1
  orb: number;       // degrees
}

export interface OptimalWindow {
  start: Date;
  end: Date;
  kappa: number;
  activities: string[];
}

export interface ForecastState {
  // Core metrics
  kappa: number;           // Coherence coupling [-1, 1]
  RU: number;              // Resonance units
  muLevel: number;         // μ-level (0-7)

  // Stage (derived from kappa)
  stage: Stage;

  // Failure mode
  failureMode: FailureMode;
  failureSeverity: number; // 0-1

  // Aspects
  aspects: Aspect[];

  // Optimal windows
  optimalWindows: OptimalWindow[];

  // Timestamps
  computedAt: string | null;
  date: string;            // YYYY-MM-DD
}

// =====================
// FORECAST STORE
// =====================
const defaultForecast: ForecastState = {
  kappa: 0.5,
  RU: 25,
  muLevel: 4,
  stage: 'citrinitas',
  failureMode: 'healthy',
  failureSeverity: 0,
  aspects: [],
  optimalWindows: [],
  computedAt: null,
  date: new Date().toISOString().split('T')[0],
};

export const $forecast = map<ForecastState>(defaultForecast);

// Sync stage with app store
$forecast.subscribe((forecast) => {
  if (forecast.stage !== $stage.get()) {
    setStage(forecast.stage);
  }
});

// =====================
// FORECAST ACTIONS
// =====================
export function updateForecast(partial: Partial<ForecastState>) {
  const current = $forecast.get();
  const updated = { ...current, ...partial };

  // Auto-compute stage from kappa
  if (partial.kappa !== undefined) {
    updated.stage = stageFromKappa(partial.kappa);
  }

  updated.computedAt = new Date().toISOString();
  $forecast.set(updated);

  // Save to history if we have a meaningful update (kappa or failureMode)
  if (partial.kappa !== undefined || partial.failureMode !== undefined) {
    saveHistory(updated);
  }
}

export function setKappa(kappa: number) {
  updateForecast({
    kappa,
    stage: stageFromKappa(kappa)
  });
}

export function setFailureMode(mode: FailureMode, severity: number = 0) {
  updateForecast({
    failureMode: mode,
    failureSeverity: severity,
  });
}

export function setAspects(aspects: Aspect[]) {
  updateForecast({ aspects });
}

export function setOptimalWindows(windows: OptimalWindow[]) {
  updateForecast({ optimalWindows: windows });
}

export function resetForecast() {
  $forecast.set(defaultForecast);
}

// =====================
// COMPUTED VALUES
// =====================
export const $isHealthy = computed($forecast, (f) => f.failureMode === 'healthy');
export const $isInFailure = computed($forecast, (f) => f.failureMode !== 'healthy');

export const $kappaPercent = computed($forecast, (f) => Math.round(f.kappa * 100));

export const $stageLabel = computed($forecast, (f) => {
  const labels: Record<Stage, string> = {
    nigredo: 'Nigredo (Dissolution)',
    albedo: 'Albedo (Purification)',
    citrinitas: 'Citrinitas (Illumination)',
    rubedo: 'Rubedo (Integration)',
  };
  return labels[f.stage];
});

export const $muLevelLabel = computed($forecast, (f) => {
  const labels = [
    'μ0 (Quantum)',
    'μ1 (Molecular)',
    'μ2 (Cellular)',
    'μ3 (Sentient)',
    'μ4 (Conceptual)',
    'μ5 (Archetypal)',
    'μ6 (Noetic)',
    'μ7 (Unified)',
  ];
  return labels[Math.round(f.muLevel)] || `μ${f.muLevel.toFixed(1)}`;
});

// Active aspects (strength > 0.5)
export const $activeAspects = computed($forecast, (f) =>
  f.aspects.filter(a => a.strength > 0.5)
);

// Next optimal window
export const $nextWindow = computed($forecast, (f) => {
  const now = new Date();
  return f.optimalWindows.find(w => new Date(w.start) > now) || null;
});
