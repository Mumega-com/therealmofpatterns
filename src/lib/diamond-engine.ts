/**
 * Diamond Consciousness Engine
 *
 * Unified framework for consciousness based on the Diamond Ontology.
 * Core equations: dS + k* d(ln C) = 0, ΔS = R·Ψ·C, Λ = Λ₀ ln C
 *
 * @module diamond-engine
 */

// =============================================================================
// Type Definitions
// =============================================================================

export interface DiamondState {
  /** 8D consciousness vector: P, F, A, M, T, R, C, W */
  dimensions: [number, number, number, number, number, number, number, number];
  /** Depth level (μ): 0-7 */
  depth: number;
  /** Temporal axis: -1 (karma) to +1 (dharma) */
  time: number;
  /** Coherence λ: 0-1 */
  coherence: number;
  /** Entropy S */
  S: number;
  /** Coherence coefficient C */
  C: number;
  /** Process efficiency ψ */
  psi: number;
}

export interface Transformation {
  deltaS: number;
  R: number;
  psi: number;
  operator?: string;
  stage?: string;
}

export interface Zeitgeist {
  dimensions: Partial<DiamondState['dimensions']>;
  depth: number;
  time: number;
  coherence: number;
}

// =============================================================================
// Constants
// =============================================================================

export const DIMENSION_NAMES = [
  'Potential', 'Form', 'Awareness', 'Meaning',
  'Telos', 'Response', 'Connection', 'Witness'
] as const;

export const DIMENSION_SYMBOLS = ['P', 'F', 'A', 'M', 'T', 'R', 'C', 'W'] as const;

export const OPERATORS = [
  'Logos', 'Khaos', 'Harmonia', 'Chronos',
  'Mythos', 'Telos', 'Nous', 'Kenosis'
] as const;

export const STAGES = ['nigredo', 'albedo', 'citrinitas', 'rubedo'] as const;

export const MU_LEVELS = [
  'Quantum', 'Physical', 'Biological', 'Sentient',
  'Conceptual', 'Archetypal', 'Noetic', 'Unified'
] as const;

const LAMBDA_0 = 1.618033988749; // Golden ratio
const K_ENTROPY = 0.693147180559; // ln(2)

// =============================================================================
// Core Functions
// =============================================================================

/** Compute lambda field: Λ = Λ₀ ln C */
export function computeLambdaField(state: DiamondState): number {
  if (state.C <= 0) return 0;
  return LAMBDA_0 * Math.log(state.C);
}

/** Compute entropy: S = -Σ(pᵢ log pᵢ) */
export function computeEntropy(state: DiamondState): number {
  const dims = state.dimensions;
  const total = dims.reduce((sum, d) => sum + Math.abs(d), 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const d of dims) {
    if (d === 0) continue;
    const p = Math.abs(d) / total;
    entropy -= p * Math.log(p);
  }
  return entropy;
}

/** Compute coherence: C = 1 / (1 + S) */
export function computeCoherence(dimensions: DiamondState['dimensions']): number {
  const state = createState(dimensions);
  const S = computeEntropy(state);
  return 1 / (1 + S);
}

/** Transformation: ΔS = R · Ψ · C */
export function computeTransformation(s1: DiamondState, s2: DiamondState): Transformation {
  const deltaS = s2.S - s1.S;
  const avgC = (s1.C + s2.C) / 2;
  const avgPsi = (s1.psi + s2.psi) / 2;
  const R = avgC > 0 ? deltaS / (avgPsi * avgC) : 1;
  return { deltaS, R: Math.abs(R), psi: avgPsi };
}

/** Apply operator transformation */
export function applyOperator(state: DiamondState, operator: typeof OPERATORS[number]): DiamondState {
  const idx = OPERATORS.indexOf(operator);
  const newDims = [...state.dimensions] as DiamondState['dimensions'];

  const transfer = newDims[idx] * 0.382; // Golden ratio conjugate
  newDims[idx] -= transfer;
  newDims[(idx + 1) % 8] += transfer;

  const newState = createState(newDims);
  newState.depth = state.depth;
  newState.time = state.time + 0.125;
  return newState;
}

// =============================================================================
// Projection Functions
// =============================================================================

/** Project μ-level from state */
export function projectMuLevel(state: DiamondState): number {
  const dims = state.dimensions;
  const maxIdx = dims.findIndex(d => Math.abs(d) === Math.max(...dims.map(Math.abs)));
  return Math.floor(maxIdx * 7 / 8);
}

/** Project dominant operator */
export function projectDominantOperator(state: DiamondState): string {
  const maxIdx = state.dimensions.findIndex(d => d === Math.max(...state.dimensions));
  return OPERATORS[maxIdx];
}

/** Project alchemical stage */
export function projectAlchemicalStage(trajectory: DiamondState[]): string {
  if (trajectory.length === 0) return 'nigredo';
  const recent = trajectory.slice(-10);
  const avgC = recent.reduce((sum, s) => sum + s.coherence, 0) / recent.length;

  if (avgC < 0.25) return 'nigredo';
  if (avgC < 0.5) return 'albedo';
  if (avgC < 0.75) return 'citrinitas';
  return 'rubedo';
}

/** Project archetypes */
export function projectArchetypes(state: DiamondState): Record<string, number> {
  const [P, F, A, M, T, R, C, W] = state.dimensions;
  return {
    Creator: P * 0.5 + F * 0.5,
    Destroyer: F * 0.5 + A * 0.5,
    Sage: A * 0.5 + M * 0.5,
    Lover: M * 0.5 + T * 0.5,
    Hero: T * 0.5 + R * 0.5,
    Magician: R * 0.5 + C * 0.5,
    Sovereign: C * 0.5 + W * 0.5,
    Fool: W * 0.5 + P * 0.5
  };
}

// =============================================================================
// State Evolution
// =============================================================================

/** Evolve state forward in time */
export function evolveState(
  state: DiamondState,
  deltaTime: number,
  influences: Partial<DiamondState> = {}
): DiamondState {
  const newDims = state.dimensions.map((d, i) => {
    const influence = influences.dimensions?.[i] ?? 0;
    const decay = d * Math.exp(-deltaTime * 0.1);
    return decay + influence * deltaTime;
  }) as DiamondState['dimensions'];

  const newState = createState(newDims);
  newState.depth = influences.depth ?? state.depth;
  newState.time = state.time + deltaTime;
  newState.psi = state.psi * 0.9 + (influences.psi ?? state.psi) * 0.1;
  return newState;
}

// =============================================================================
// Planetary Integration
// =============================================================================

/** Compute zeitgeist for date/location */
export function computeZeitgeist(date: Date): Zeitgeist {
  const year = date.getFullYear();
  const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
  const season = dayOfYear / 365;

  const postModern = Math.min(1, (year - 1960) / 100);
  const digital = Math.min(1, (year - 1990) / 30);
  const interconnected = Math.min(1, (year - 2000) / 25);

  return {
    dimensions: {
      0: Math.sin(season * Math.PI * 2) * 0.5 + 0.5,
      1: 0.5 + postModern * 0.3,
      2: 0.3 + digital * 0.4,
      3: 0.4 + interconnected * 0.3,
      4: 0.5,
      5: 0.4 + digital * 0.2,
      6: 0.3 + interconnected * 0.5,
      7: 0.2 + postModern * 0.3
    },
    depth: Math.floor(postModern * 3),
    time: season * 2 - 1,
    coherence: 0.3 + interconnected * 0.2
  };
}

/** Blend personal state with zeitgeist */
export function applyZeitgeist(personal: DiamondState, zeitgeist: Zeitgeist): DiamondState {
  const blendedDims = personal.dimensions.map((d, i) => {
    const z = zeitgeist.dimensions[i] ?? 0.5;
    return d * 0.7 + z * 0.3;
  }) as DiamondState['dimensions'];

  const newState = createState(blendedDims);
  newState.depth = Math.floor(personal.depth * 0.7 + zeitgeist.depth * 0.3);
  newState.time = personal.time * 0.7 + zeitgeist.time * 0.3;
  newState.psi = personal.psi;
  return newState;
}

// =============================================================================
// Serialization & Utilities
// =============================================================================

export function toJSON(state: DiamondState): string {
  return JSON.stringify(state);
}

export function fromJSON(json: string): DiamondState {
  return JSON.parse(json);
}

export function validateState(state: DiamondState): boolean {
  if (state.dimensions.length !== 8) return false;
  if (state.depth < 0 || state.depth > 7) return false;
  if (state.time < -1 || state.time > 1) return false;
  if (state.coherence < 0 || state.coherence > 1) return false;
  return true;
}

export function normalizeState(state: DiamondState): DiamondState {
  const total = state.dimensions.reduce((sum, d) => sum + Math.abs(d), 0);
  const normalized = total > 0
    ? state.dimensions.map(d => d / total) as DiamondState['dimensions']
    : [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125] as DiamondState['dimensions'];

  return {
    ...state,
    dimensions: normalized,
    depth: Math.max(0, Math.min(7, Math.round(state.depth))),
    time: Math.max(-1, Math.min(1, state.time)),
    coherence: Math.max(0, Math.min(1, state.coherence))
  };
}

/** Create state from dimensions */
export function createState(
  dimensions: DiamondState['dimensions'],
  overrides: Partial<DiamondState> = {}
): DiamondState {
  const state: DiamondState = {
    dimensions,
    depth: 0,
    time: 0,
    coherence: 0,
    S: 0,
    C: 1,
    psi: 1,
    ...overrides
  };

  state.S = computeEntropy(state);
  state.C = computeCoherence(dimensions);
  state.coherence = state.C;
  return state;
}

/** Create initial balanced state */
export function createInitialState(): DiamondState {
  return createState(
    [0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125, 0.125],
    { depth: 0, time: 0, psi: 1 }
  );
}

// =============================================================================
// Default Export
// =============================================================================

export default {
  DIMENSION_NAMES, DIMENSION_SYMBOLS, OPERATORS, STAGES, MU_LEVELS,
  computeLambdaField, computeEntropy, computeCoherence, computeTransformation, applyOperator,
  projectMuLevel, projectDominantOperator, projectAlchemicalStage, projectArchetypes,
  evolveState, computeZeitgeist, applyZeitgeist,
  toJSON, fromJSON, validateState, normalizeState, createState, createInitialState
};
