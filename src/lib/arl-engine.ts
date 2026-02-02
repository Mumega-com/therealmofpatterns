/**
 * Adaptive Resonance Learning (ARL) Engine
 *
 * Physics-inspired preference learning for The Realm of Patterns.
 * Models user preferences as a 16D vector that evolves through feedback.
 */

// Types are compatible with Vector16D from '../types'

// ============================================
// Configuration
// ============================================

export interface ARLConfig {
  learningRate: number;      // How fast to adapt (α)
  decayRate: number;         // Momentum decay (β)
  epsilon: number;           // Min change threshold
  maxValue: number;          // Stability bound
  clusterEps: number;        // DBSCAN radius
  clusterMinPts: number;     // DBSCAN min points
}

export const DEFAULT_CONFIG: ARLConfig = {
  learningRate: 0.15,
  decayRate: 0.95,
  epsilon: 0.001,
  maxValue: 1.0,
  clusterEps: 0.3,
  clusterMinPts: 3,
};

// ============================================
// Types
// ============================================

export interface UserSignature {
  vector: number[];
  baseline: number[];
  momentum: number[];
  updateCount: number;
  lastUpdate: number;
  history: FeedbackRecord[];
}

export interface FeedbackRecord {
  vector: number[];
  rating: number;
  timestamp: number;
}

export interface AttractorBasin {
  center: number[];
  radius: number;
  strength: number;
}

// ============================================
// Vector Math
// ============================================

export function addVectors(a: number[], b: number[]): number[] {
  return a.map((v, i) => v + b[i]);
}

export function subtractVectors(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

export function scaleVector(v: number[], s: number): number[] {
  return v.map(x => x * s);
}

export function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

export function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

export function magnitude(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

export function normalize(v: number[]): number[] {
  const mag = magnitude(v);
  return mag > 1e-10 ? scaleVector(v, 1 / mag) : v.map(() => 0);
}

export function clamp(v: number[], max: number): number[] {
  return v.map(x => Math.max(-max, Math.min(max, x)));
}

// ============================================
// Core Functions
// ============================================

export function initSignature(initial?: number[]): UserSignature {
  const dim = 16;
  const baseline = initial || new Array(dim).fill(0);
  return {
    vector: [...baseline],
    baseline: [...baseline],
    momentum: new Array(dim).fill(0),
    updateCount: 0,
    lastUpdate: Date.now(),
    history: [],
  };
}

/**
 * Update signature based on feedback
 * Physics: Δψ = α·δ·(pattern - ψ) + β·momentum
 */
export function updateSignature(
  sig: UserSignature,
  patternVector: number[],
  rating: number,
  config: ARLConfig = DEFAULT_CONFIG
): UserSignature {
  const { learningRate, decayRate, epsilon, maxValue } = config;

  // Direction to move
  const direction = subtractVectors(patternVector, sig.vector);

  // Scale by learning rate and feedback
  const adjustment = scaleVector(direction, learningRate * rating);

  // Apply momentum with decay
  const newMomentum = addVectors(
    adjustment,
    scaleVector(sig.momentum, decayRate)
  );

  // Update vector
  let newVector = addVectors(sig.vector, adjustment);
  newVector = addVectors(newVector, scaleVector(newMomentum, 0.5));
  newVector = clamp(newVector, maxValue);

  // Check significance
  if (euclideanDistance(newVector, sig.vector) < epsilon) {
    return sig;
  }

  // Update history (keep last 100)
  const newHistory = [
    ...sig.history.slice(-99),
    { vector: [...newVector], rating, timestamp: Date.now() }
  ];

  return {
    vector: newVector,
    baseline: sig.baseline,
    momentum: newMomentum,
    updateCount: sig.updateCount + 1,
    lastUpdate: Date.now(),
    history: newHistory,
  };
}

/**
 * Compute coherence between user signature and pattern
 * Returns 0-1 (cosine similarity normalized)
 */
export function coherenceScore(sig: UserSignature, pattern: number[]): number {
  const magSig = magnitude(sig.vector);
  const magPat = magnitude(pattern);

  if (magSig < 1e-10 || magPat < 1e-10) return 0.5;

  const cosine = dotProduct(sig.vector, pattern) / (magSig * magPat);
  return (cosine + 1) / 2; // Map [-1,1] to [0,1]
}

/**
 * DBSCAN clustering for attractor detection
 */
export function dbscan(
  vectors: number[][],
  eps: number,
  minPts: number
): number[] {
  const n = vectors.length;
  const labels = new Array(n).fill(-1);
  const visited = new Array(n).fill(false);
  let clusterId = 0;

  const getNeighbors = (idx: number): number[] => {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i !== idx && euclideanDistance(vectors[idx], vectors[i]) <= eps) {
        neighbors.push(i);
      }
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;
    visited[i] = true;

    const neighbors = getNeighbors(i);
    if (neighbors.length < minPts) continue;

    labels[i] = clusterId;
    const queue = [...neighbors];

    while (queue.length > 0) {
      const j = queue.shift()!;
      if (!visited[j]) {
        visited[j] = true;
        const jNeighbors = getNeighbors(j);
        if (jNeighbors.length >= minPts) {
          queue.push(...jNeighbors);
        }
      }
      if (labels[j] === -1) {
        labels[j] = clusterId;
      }
    }
    clusterId++;
  }

  return labels;
}

/**
 * Detect attractor basins from user history
 */
export function detectAttractors(
  sig: UserSignature,
  config: ARLConfig = DEFAULT_CONFIG
): AttractorBasin[] {
  const positives = sig.history
    .filter(h => h.rating > 0)
    .map(h => h.vector);

  if (positives.length < config.clusterMinPts) return [];

  const labels = dbscan(positives, config.clusterEps, config.clusterMinPts);
  const clusters = new Map<number, number[][]>();

  positives.forEach((vec, i) => {
    if (labels[i] === -1) return;
    if (!clusters.has(labels[i])) clusters.set(labels[i], []);
    clusters.get(labels[i])!.push(vec);
  });

  const attractors: AttractorBasin[] = [];

  for (const [, samples] of clusters) {
    if (samples.length < config.clusterMinPts) continue;

    // Compute centroid
    const center = new Array(16).fill(0);
    for (const s of samples) {
      for (let d = 0; d < 16; d++) center[d] += s[d];
    }
    for (let d = 0; d < 16; d++) center[d] /= samples.length;

    // Compute radius
    const radius = Math.max(...samples.map(s => euclideanDistance(s, center)));

    attractors.push({ center, radius, strength: samples.length });
  }

  return attractors.sort((a, b) => b.strength - a.strength);
}

/**
 * Predict user response to pattern
 */
export function predictResponse(
  sig: UserSignature,
  pattern: number[],
  attractors: AttractorBasin[]
): number {
  let prediction = coherenceScore(sig, pattern) * 2 - 1;

  // Boost if in attractor basin
  for (const att of attractors) {
    if (euclideanDistance(pattern, att.center) <= att.radius) {
      const boost = Math.min(att.strength / 20, 1) * 0.3;
      prediction += boost;
      break;
    }
  }

  return Math.max(-1, Math.min(1, prediction));
}
