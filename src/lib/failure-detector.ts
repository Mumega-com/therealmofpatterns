/**
 * Failure Mode Detector
 *
 * Detects consciousness failure modes using catastrophe theory.
 * Four primary modes derived from topological catastrophes:
 * - Collapse (Fold): RU<10 && κ<0.3
 * - Inversion (Pitchfork): κ<0
 * - Dissociation (Hopf): W>2.5 && κ<0.5 (scaled for normalized W)
 * - Dispersion (Saddle-Node): RU>45 && κ<0.5
 *
 * Also detects Elder Attractor (goal state): κ>0.85, RU>45, W>0.3, 48h+
 *
 * @module failure-detector
 */

import { DiamondState } from './diamond-engine';

// =============================================================================
// Types
// =============================================================================

export type FailureMode = 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';

export interface FailureDiagnosis {
  mode: FailureMode;
  severity: number; // 0-1
  urgency: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  interventions: string[];
  watchFor: string[];
  physicalSigns: string[];
}

export interface ElderAttractorStatus {
  active: boolean;
  progress: number; // 0-1
  missing: string[];
  hoursInState: number;
}

export interface FullDiagnosis {
  failure: FailureDiagnosis;
  elder: ElderAttractorStatus;
  shadows: string[];
  trajectory: 'improving' | 'stable' | 'declining';
}

// =============================================================================
// Constants
// =============================================================================

const FAILURE_DESCRIPTIONS: Record<FailureMode, string> = {
  healthy: 'System operating within normal parameters. Inner and outer octaves are coupling effectively.',
  collapse: 'Energy depletion detected. Low resonance units combined with weak coupling indicates burnout trajectory.',
  inversion: 'Self-sabotage pattern active. Inner and outer octaves are anti-correlated, leading to working against yourself.',
  dissociation: 'Witness function over-activated. High detachment with low coupling creates disconnection from embodied experience.',
  dispersion: 'Energy scattering detected. High resonance without coupling means energy is available but unfocused.',
};

const FAILURE_INTERVENTIONS: Record<FailureMode, string[]> = {
  healthy: [
    'Maintain current practices',
    'Consider expansion into new areas',
    'Share overflow with others',
  ],
  collapse: [
    'Immediate rest priority',
    'Cancel non-essential commitments',
    'Somatic practices (body scan, gentle movement)',
    'Increase sleep by 1-2 hours',
    'Simplify to 1-2 priorities maximum',
  ],
  inversion: [
    'Pause major decisions',
    'Journal to surface hidden beliefs',
    'Shadow work exercises',
    'External feedback from trusted source',
    'Check for "should" vs "want" conflicts',
  ],
  dissociation: [
    'Grounding exercises (5-4-3-2-1 senses)',
    'Physical activity with full attention',
    'Cold exposure (brief)',
    'Reduce screen time',
    'Connect with physical environment',
  ],
  dispersion: [
    'Single-task strictly for 2 hours',
    'Close all browser tabs',
    'One project until completion',
    'Physical constraint (stay in one room)',
    'Time-boxing with hard boundaries',
  ],
};

const FAILURE_WATCH_FOR: Record<FailureMode, string[]> = {
  healthy: [
    'Energy dips below 30 RU',
    'Coupling drops below 0.5',
    'Sleep quality decline',
  ],
  collapse: [
    'Complete inability to start tasks',
    'Physical illness onset',
    'Emotional numbness',
    'Social withdrawal',
  ],
  inversion: [
    'Increasing conflict in relationships',
    'Pattern of starting then abandoning',
    'Feeling of being "stuck"',
    'Unexplained resistance to good opportunities',
  ],
  dissociation: [
    'Losing track of time',
    'Difficulty feeling emotions',
    'Physical clumsiness',
    'Forgetting to eat/drink',
  ],
  dispersion: [
    'Starting many projects, finishing none',
    'Exhaustion despite "not doing much"',
    'Difficulty remembering what you worked on',
    'Feeling busy but unproductive',
  ],
};

const FAILURE_PHYSICAL_SIGNS: Record<FailureMode, string[]> = {
  healthy: ['Steady energy', 'Good sleep', 'Clear thinking'],
  collapse: ['Fatigue', 'Brain fog', 'Muscle tension', 'Sleep disruption'],
  inversion: ['Jaw clenching', 'Stomach tension', 'Headaches'],
  dissociation: ['Feeling "floaty"', 'Temperature regulation issues', 'Shallow breathing'],
  dispersion: ['Restlessness', 'Difficulty sitting still', 'Racing thoughts'],
};

// =============================================================================
// Core Detection
// =============================================================================

/**
 * Detect current failure mode
 * Priority order: inversion > collapse > dissociation > dispersion > healthy
 */
export function detectFailureMode(
  state: DiamondState,
  kappa: number,
  RU: number
): FailureMode {
  const W = state.dimensions[7]; // Witness dimension (normalized 0-1)
  const W_scaled = W * 5; // Scale to match original thresholds (W > 2.5 becomes W > 0.5)

  // Inversion: κ < 0 (anti-correlation)
  if (kappa < 0) {
    return 'inversion';
  }

  // Collapse: Low energy + low coupling
  if (RU < 10 && kappa < 0.3) {
    return 'collapse';
  }

  // Dissociation: High witness + low coupling
  if (W_scaled > 2.5 && kappa < 0.5) {
    return 'dissociation';
  }

  // Dispersion: High energy + low coupling
  if (RU > 45 && kappa < 0.5) {
    return 'dispersion';
  }

  return 'healthy';
}

/**
 * Calculate severity of failure mode (0-1)
 */
export function calculateSeverity(
  mode: FailureMode,
  kappa: number,
  RU: number,
  W: number
): number {
  const W_scaled = W * 5;

  switch (mode) {
    case 'healthy':
      return 0;

    case 'collapse':
      // Severity increases as RU and kappa approach 0
      return 1 - Math.min(RU / 10, kappa / 0.3);

    case 'inversion':
      // Severity is magnitude of negative coupling
      return Math.abs(kappa);

    case 'dissociation':
      // Severity based on W excess and coupling deficit
      return ((W_scaled - 2.5) * (0.5 - kappa)) / 2;

    case 'dispersion':
      // Severity based on RU excess and coupling deficit
      return ((RU - 45) * (0.5 - kappa)) / 50;

    default:
      return 0;
  }
}

/**
 * Get full failure diagnosis
 */
export function diagnoseFailureState(
  state: DiamondState,
  kappa: number,
  RU: number,
  hoursInState: number = 0
): FailureDiagnosis {
  const mode = detectFailureMode(state, kappa, RU);
  const W = state.dimensions[7];
  const severity = Math.min(1, Math.max(0, calculateSeverity(mode, kappa, RU, W)));

  // Determine urgency
  let urgency: FailureDiagnosis['urgency'];
  if (mode === 'healthy') {
    urgency = 'low';
  } else if (severity > 0.7 || hoursInState > 72) {
    urgency = 'critical';
  } else if (severity > 0.4 || hoursInState > 24) {
    urgency = 'high';
  } else {
    urgency = 'moderate';
  }

  return {
    mode,
    severity,
    urgency,
    description: FAILURE_DESCRIPTIONS[mode],
    interventions: FAILURE_INTERVENTIONS[mode],
    watchFor: FAILURE_WATCH_FOR[mode],
    physicalSigns: FAILURE_PHYSICAL_SIGNS[mode],
  };
}

// =============================================================================
// Elder Attractor Detection
// =============================================================================

/**
 * Elder Attractor thresholds:
 * - κ > 0.85 (high coupling)
 * - RU > 45 (high resonance)
 * - W > 0.3 (witness active, scaled from >2.5)
 * - Duration > 48 hours
 */
export function checkElderAttractor(
  state: DiamondState,
  kappa: number,
  RU: number,
  hoursInState: number = 0
): ElderAttractorStatus {
  const W = state.dimensions[7];

  const missing: string[] = [];
  let progress = 0;

  // Check each threshold
  if (kappa > 0.85) {
    progress += 0.25;
  } else {
    missing.push(`κ: ${kappa.toFixed(2)} (need >0.85)`);
  }

  if (RU > 45) {
    progress += 0.25;
  } else {
    missing.push(`RU: ${RU.toFixed(0)} (need >45)`);
  }

  if (W > 0.3) {
    progress += 0.25;
  } else {
    missing.push(`W: ${W.toFixed(2)} (need >0.3)`);
  }

  if (hoursInState > 48) {
    progress += 0.25;
  } else {
    missing.push(`Duration: ${hoursInState}h (need >48h)`);
  }

  const active = progress === 1;

  return {
    active,
    progress,
    missing,
    hoursInState,
  };
}

// =============================================================================
// Full Analysis
// =============================================================================

/**
 * Get comprehensive diagnosis including failure mode, elder status, and trajectory
 */
export function getFullDiagnosis(
  state: DiamondState,
  kappa: number,
  RU: number,
  hoursInState: number = 0,
  previousKappa: number | null = null
): FullDiagnosis {
  const failure = diagnoseFailureState(state, kappa, RU, hoursInState);
  const elder = checkElderAttractor(state, kappa, RU, hoursInState);

  // Detect shadow patterns from dimension imbalances
  const shadows: string[] = [];
  const dims = state.dimensions;

  // Check for dimension pairs that indicate shadow patterns
  if (dims[0] > 0.2 && dims[4] < 0.1) {
    shadows.push('Potential without direction (P high, T low)');
  }
  if (dims[2] > 0.2 && dims[3] < 0.1) {
    shadows.push('Awareness without meaning (A high, M low)');
  }
  if (dims[5] > 0.2 && dims[6] < 0.1) {
    shadows.push('Response without connection (R high, C low)');
  }
  if (dims[7] > 0.25 && dims[1] < 0.1) {
    shadows.push('Witness without form (W high, F low)');
  }

  // Determine trajectory
  let trajectory: FullDiagnosis['trajectory'];
  if (previousKappa === null) {
    trajectory = 'stable';
  } else if (kappa - previousKappa > 0.1) {
    trajectory = 'improving';
  } else if (previousKappa - kappa > 0.1) {
    trajectory = 'declining';
  } else {
    trajectory = 'stable';
  }

  return {
    failure,
    elder,
    shadows,
    trajectory,
  };
}

// =============================================================================
// Quick Risk Assessment
// =============================================================================

/**
 * Get risk level as simple string for UI display
 */
export function getRiskLevel(kappa: number, RU: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (kappa < -0.3) return 'critical';
  if (kappa < 0) return 'high';
  if (kappa < 0.3 && RU < 20) return 'high';
  if (kappa < 0.5 || RU < 30) return 'moderate';
  return 'low';
}

/**
 * Get risk color for UI
 */
export function getRiskColor(risk: 'low' | 'moderate' | 'high' | 'critical'): string {
  switch (risk) {
    case 'low': return '#4ade80'; // green
    case 'moderate': return '#fbbf24'; // yellow
    case 'high': return '#f97316'; // orange
    case 'critical': return '#ef4444'; // red
  }
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  detectFailureMode,
  calculateSeverity,
  diagnoseFailureState,
  checkElderAttractor,
  getFullDiagnosis,
  getRiskLevel,
  getRiskColor,
};
