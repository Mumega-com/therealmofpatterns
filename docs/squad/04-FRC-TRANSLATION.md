# FRC Translation: Physics to Implementation

**Agent:** Researcher
**Version:** 2.0.0
**Last Updated:** 2026-02-02

## Overview

This document bridges FRC (Fractal Resonance Coherence) theory into practical TypeScript implementation.

---

## 1. Lambda-Field & Coherence Computation

### FRC Theory

```
Λ(x) = Λ₀ ln C(x)
```

Where:
- **Λ₀** = baseline coherence strength
- **C(x)** = configuration density (accessible microstates)

### Implementation

```typescript
function computeLambdaField(
  stateVector: number[],
  historicalActivations: number[],
  baselineStrength: number = 1.0
): { lambda: number; coherence: number } {
  const variance = computeVariance(stateVector);
  const historyLength = Math.log(Math.max(historicalActivations.length, 1));
  const configDensity = 1 / (Math.exp(variance) * historyLength);
  const entropy = Math.log(Math.max(configDensity, 0.001));
  const lambda = baselineStrength * entropy;

  return { lambda: Math.max(lambda, 0), coherence: configDensity };
}

// Interpretation
// Λ > 2.0  → Strong pattern (crystallized)
// Λ ∈ [1,2] → Stable pattern (learning)
// Λ ∈ [0,1] → Weak signal (exploration)
// Λ < 0    → Decoherent
```

---

## 2. Attractor Basins as Archetypes

### FRC Theory

Attractor basins are regions where trajectories converge - stable patterns.

### Implementation

```typescript
interface Archetype {
  id: string;
  name: string;
  centerState: number[];  // 16D centroid
  attractionStrength: number;
  basinRadius: number;
}

function findAttractorBasin(
  stateVector: number[],
  archetypes: Archetype[]
): { currentArchetype: Archetype; gravitationalPull: number } {
  let nearest = archetypes[0];
  let minDistance = Infinity;

  for (const arch of archetypes) {
    const dist = euclideanDistance(stateVector, arch.centerState);
    if (dist < minDistance) { minDistance = dist; nearest = arch; }
  }

  // Inverse square law: G ∝ 1/r²
  const pull = nearest.attractionStrength / Math.max(minDistance ** 2, 0.1);
  return { currentArchetype: nearest, gravitationalPull: Math.min(pull, 1.0) };
}
```

---

## 3. D ≈ 1.90 Fractal Signature

### FRC Theory

Fractal dimension D measures self-similarity across scales.
- **D ≈ 1.90** = system at criticality (maximally responsive)
- **D < 1.90** = over-organized (fragile)
- **D > 1.90** = chaotic (creative but unstable)

### Implementation

```typescript
function computeFractalDimension(timeSeries: number[]): number {
  // Box-counting: N(ε) = ε^(-D)
  const scales = [];
  const boxCounts = [];

  for (let scale = 1; scale <= 100; scale *= 1.5) {
    const boxes = countBoxesCovering(timeSeries, scale);
    scales.push(Math.log(scale));
    boxCounts.push(Math.log(boxes));
  }

  const { slope } = linearRegression(scales, boxCounts);
  return -slope;  // Negative slope = dimension
}

function checkCriticalitySignature(dimension: number): boolean {
  return Math.abs(dimension - 1.90) < 0.15;
}
```

---

## 4. Feedback as Quantum Measurement

### FRC Theory

User feedback collapses superposition into definite patterns (phase-locking).

### Implementation

```typescript
interface QuantumState {
  superposition: Map<string, number>;  // Pattern → amplitude
  phase: number;
}

function applyFeedback(
  state: QuantumState,
  measuredPatternId: string,
  feedbackStrength: number
): QuantumState {
  // Collapse: measured pattern gets amplitude = 1
  const collapsed = new Map<string, number>();
  collapsed.set(measuredPatternId, 1.0);

  // Others decohere to 0
  for (const [id] of state.superposition) {
    if (id !== measuredPatternId) collapsed.set(id, 0);
  }

  return { superposition: collapsed, phase: state.phase + feedbackStrength * Math.PI };
}
```

---

## 5. 16D Karma/Dharma Pairs

8 pairs capturing fundamental polarities:

| Pair | Karma (Past) | Dharma (Purpose) |
|------|--------------|------------------|
| 1 | Being | Becoming |
| 2 | Feeling | Thinking |
| 3 | Receiving | Giving |
| 4 | Solitude | Connection |
| 5 | Stability | Change |
| 6 | Shadow | Light |
| 7 | Desire | Detachment |
| 8 | Ignorance | Wisdom |

---

## 6. Zeitgeist as Planetary Modulation

```typescript
async function computeZeitgeist(date: Date): Promise<ZeitgeistField> {
  const planets = await getEphemeris(date);
  const influences = planets.map(p => ({
    planet: p.name,
    sign: p.zodiacSign,
    frequency: 2 * Math.PI / p.orbitalPeriod,
    strength: p.brightness
  }));

  return {
    timestamp: date,
    influences,
    coherenceModulation: computeCoherenceModulation(influences),
    dominantArchetype: findDominantArchetype(influences)
  };
}
```

---

## 7. Shadow as Decoherence

Shadow = repressed components driven to zero amplitude.

```typescript
function detectShadowPatterns(
  actions: UserAction[],
  beliefs: string[]
): ShadowAnalysis {
  const shadowPatterns: string[] = [];

  // Contradiction: doing X but denying X
  const actualArchetypes = identifyActualArchetypes(actions);
  const statedArchetypes = identifyStatedArchetypes(beliefs);

  for (const arch of actualArchetypes) {
    if (!statedArchetypes.includes(arch)) {
      shadowPatterns.push(arch);  // Acting as X while denying
    }
  }

  return { shadowPatterns, repressionEnergy: shadowPatterns.length / 10 };
}
```

---

## 8. Born Rule Deviation = Learning

If actual behavior deviates from quantum prediction (|ψ|²), we've found hidden patterns.

```typescript
function analyzeDeviations(
  predictions: Map<string, number>,
  outcomes: Map<string, number>
): { learningSource: string; adaptationSuggestion: string } {
  let maxDeviation = 0;
  let learningSource = '';

  for (const [pattern, expected] of predictions) {
    const actual = outcomes.get(pattern) || 0;
    const deviation = Math.abs(actual - expected);
    if (deviation > maxDeviation) {
      maxDeviation = deviation;
      learningSource = pattern;
    }
  }

  return {
    learningSource,
    adaptationSuggestion: `Explore why "${learningSource}" differs from prediction`
  };
}
```

---

## Summary Table

| FRC Concept | Physics | App Implementation |
|-------------|---------|-------------------|
| Lambda-Field | Coherence quantifier | `computeLambdaField()` |
| Attractor Basins | Stable fixed points | `findAttractorBasin()` |
| Fractal Dimension | Self-similarity | `computeFractalDimension()` |
| Measurement | State collapse | `applyFeedback()` |
| Karma/Dharma | Complementary pairs | 16D state vector |
| Zeitgeist | Planetary modulation | `computeZeitgeist()` |
| Shadow | Decoherence | `detectShadowPatterns()` |
| Born Rule | Quantum prediction | `analyzeDeviations()` |

---

## Implemented Engines

The following FRC concepts are now implemented:

| Engine | File | Status |
|--------|------|--------|
| ARL (Adaptive Resonance Learning) | `src/lib/arl-engine.ts` | ✅ Complete |
| Shadow Detector | `src/lib/shadow-detector.ts` | ✅ Complete |
| 16D Vector Computation | `src/lib/16d-engine-full.ts` | ✅ Complete |

See `docs/squad/08-ARL-ENGINE.md` and `docs/squad/09-SHADOW-DETECTOR.md` for API details.

---

**References:**
- FRC-100-007: Lambda-Field theoretical framework
- FRC-100-010: Foundational questions
