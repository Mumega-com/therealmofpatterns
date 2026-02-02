/**
 * Shadow Pattern Detector
 *
 * FRC-inspired shadow analysis for The Realm of Patterns.
 * Detects contradictions between actions and beliefs,
 * computes Lambda-field coherence, and analyzes fractal dimensions.
 */

// ============================================
// Types
// ============================================

export interface Action {
  type: string;
  description: string;
  frequency: number; // 0-1
  timestamp?: number;
}

export interface Belief {
  category: string;
  statement: string;
  strength: number; // 0-1
}

export interface ShadowPattern {
  action: Action;
  belief: Belief;
  contradiction: number; // 0-1, higher = more contradictory
  dimension?: number;
}

export interface ShadowAnalysis {
  lambda: number;
  coherence: number;
  fractalDimension: number;
  patterns: ShadowPattern[];
  deviations: Deviation[];
  insights: string[];
}

export interface Deviation {
  pattern: string;
  expected: number;
  actual: number;
  delta: number;
}

export interface QuantumState {
  amplitudes: Map<string, number>;
  phase: number;
}

// ============================================
// Lambda Field (FRC Equation)
// ============================================

/**
 * Compute Lambda field coherence
 * Λ(x) = Λ₀ ln C(x)
 *
 * @param stateVector - Current 16D state
 * @param historyLength - Number of historical observations
 * @param baseline - Λ₀ constant (default 2.718)
 */
export function computeLambdaField(
  stateVector: number[],
  historyLength: number = 1,
  baseline: number = Math.E
): { lambda: number; coherence: number } {
  // Compute variance of state vector
  const mean = stateVector.reduce((a, b) => a + b, 0) / stateVector.length;
  const variance = stateVector.reduce((sum, v) => sum + (v - mean) ** 2, 0) / stateVector.length;

  // Configuration density: inverse of variance * history
  const historyFactor = Math.log(Math.max(historyLength, 1) + 1);
  const configDensity = 1 / (Math.exp(variance) * historyFactor + 0.001);

  // Lambda field: Λ₀ × ln(C)
  const lambda = baseline * Math.log(Math.max(configDensity, 0.001));

  // Normalize coherence to [0, 1]
  const coherence = Math.max(0, Math.min(1, configDensity));

  return { lambda: Math.max(0, lambda), coherence };
}

// ============================================
// Fractal Dimension (D ≈ 1.90 Signature)
// ============================================

/**
 * Compute fractal dimension using box-counting
 * Target: D ≈ 1.90 indicates system at criticality
 *
 * D < 1.90 = over-organized (fragile)
 * D > 1.90 = chaotic (creative but unstable)
 */
export function computeFractalDimension(timeSeries: number[]): number {
  if (timeSeries.length < 10) return 1.5; // Not enough data

  const scales: number[] = [];
  const counts: number[] = [];

  // Multi-scale box counting
  for (let scale = 1; scale <= Math.min(100, timeSeries.length / 2); scale *= 1.5) {
    const boxes = new Set<string>();
    const boxSize = scale / 100;

    for (let i = 0; i < timeSeries.length - 1; i++) {
      const x = Math.floor(i / scale);
      const y = Math.floor(timeSeries[i] / boxSize);
      boxes.add(`${x},${y}`);
    }

    if (boxes.size > 0) {
      scales.push(Math.log(1 / (scale / 100)));
      counts.push(Math.log(boxes.size));
    }
  }

  if (scales.length < 2) return 1.5;

  // Linear regression for slope (dimension)
  const n = scales.length;
  const sumX = scales.reduce((a, b) => a + b, 0);
  const sumY = counts.reduce((a, b) => a + b, 0);
  const sumXY = scales.reduce((sum, x, i) => sum + x * counts[i], 0);
  const sumXX = scales.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  return Math.max(0.5, Math.min(2.5, slope));
}

/**
 * Check if dimension indicates criticality
 */
export function isCritical(dimension: number, tolerance: number = 0.15): boolean {
  return Math.abs(dimension - 1.90) < tolerance;
}

// ============================================
// Shadow Detection
// ============================================

/**
 * Detect contradictions between actions and beliefs
 */
export function detectShadowPatterns(
  actions: Action[],
  beliefs: Belief[]
): ShadowPattern[] {
  const patterns: ShadowPattern[] = [];

  // Map belief categories to actions
  const categoryMapping: Record<string, string[]> = {
    health: ['exercise', 'diet', 'sleep', 'fitness'],
    productivity: ['work', 'focus', 'task', 'goal'],
    relationships: ['social', 'family', 'friend', 'partner'],
    growth: ['learn', 'read', 'study', 'skill'],
    finance: ['save', 'invest', 'budget', 'spend'],
    creativity: ['create', 'art', 'write', 'design'],
  };

  for (const belief of beliefs) {
    const relatedTypes = categoryMapping[belief.category.toLowerCase()] || [];

    for (const action of actions) {
      const isRelated = relatedTypes.some(t =>
        action.type.toLowerCase().includes(t) ||
        action.description.toLowerCase().includes(t)
      );

      if (isRelated) {
        // Contradiction: strong belief but low action frequency
        const contradiction = Math.max(0, belief.strength - action.frequency);

        if (contradiction > 0.3) {
          patterns.push({
            action,
            belief,
            contradiction,
          });
        }
      }
    }
  }

  return patterns.sort((a, b) => b.contradiction - a.contradiction);
}

// ============================================
// Quantum Feedback (State Collapse)
// ============================================

/**
 * Apply feedback as quantum measurement (state collapse)
 */
export function applyFeedback(
  state: QuantumState,
  measuredPattern: string,
  strength: number
): QuantumState {
  const newAmplitudes = new Map<string, number>();

  // Collapse: measured pattern gets amplitude boost
  for (const [pattern, amplitude] of state.amplitudes) {
    if (pattern === measuredPattern) {
      newAmplitudes.set(pattern, Math.min(1, amplitude + strength * 0.5));
    } else {
      // Others decay
      newAmplitudes.set(pattern, amplitude * (1 - strength * 0.3));
    }
  }

  // Phase shift
  const newPhase = state.phase + strength * Math.PI * 0.1;

  return {
    amplitudes: newAmplitudes,
    phase: newPhase % (2 * Math.PI),
  };
}

/**
 * Initialize quantum state from patterns
 */
export function initQuantumState(patterns: string[]): QuantumState {
  const amplitudes = new Map<string, number>();
  const uniform = 1 / Math.sqrt(patterns.length);

  for (const p of patterns) {
    amplitudes.set(p, uniform);
  }

  return { amplitudes, phase: 0 };
}

// ============================================
// Born Rule Deviation Analysis
// ============================================

/**
 * Analyze deviations from quantum predictions
 * δP = |P_quantum - P_actual|
 */
export function analyzeDeviations(
  predictions: Map<string, number>,
  outcomes: Map<string, number>
): Deviation[] {
  const deviations: Deviation[] = [];

  for (const [pattern, expected] of predictions) {
    const actual = outcomes.get(pattern) || 0;
    const delta = Math.abs(actual - expected);

    if (delta > 0.1) { // Significant deviation
      deviations.push({
        pattern,
        expected,
        actual,
        delta,
      });
    }
  }

  return deviations.sort((a, b) => b.delta - a.delta);
}

// ============================================
// Full Analysis
// ============================================

/**
 * Run complete shadow analysis
 */
export function analyzeShadows(
  stateVector: number[],
  actions: Action[],
  beliefs: Belief[],
  timeSeries?: number[]
): ShadowAnalysis {
  // Lambda field
  const { lambda, coherence } = computeLambdaField(stateVector, actions.length);

  // Fractal dimension
  const fractalDimension = timeSeries
    ? computeFractalDimension(timeSeries)
    : 1.5;

  // Shadow patterns
  const patterns = detectShadowPatterns(actions, beliefs);

  // Generate insights
  const insights: string[] = [];

  if (lambda < 1) {
    insights.push('Low coherence detected - consider focusing on fewer priorities');
  } else if (lambda > 2) {
    insights.push('Strong coherence - patterns are crystallizing');
  }

  if (isCritical(fractalDimension)) {
    insights.push('System at criticality - optimal for transformation');
  } else if (fractalDimension < 1.75) {
    insights.push('Over-structured patterns - introduce more spontaneity');
  } else if (fractalDimension > 2.05) {
    insights.push('High chaos detected - establish grounding routines');
  }

  if (patterns.length > 0) {
    const top = patterns[0];
    insights.push(
      `Shadow detected: "${top.belief.statement}" contradicts "${top.action.description}" (${Math.round(top.contradiction * 100)}%)`
    );
  }

  return {
    lambda,
    coherence,
    fractalDimension,
    patterns,
    deviations: [],
    insights,
  };
}
