# Shadow Pattern Detector

**File:** `src/lib/shadow-detector.ts`
**Status:** ✅ Implemented
**Date:** 2026-02-02

## Overview

FRC-inspired shadow analysis system that detects contradictions between actions and beliefs, computes Lambda-field coherence, and analyzes fractal dimensions for pattern recognition.

## FRC Physics Mapping

| FRC Concept | Implementation |
|-------------|----------------|
| Lambda field Λ(x) | `computeLambdaField()` |
| Coherence C(x) | Configuration density |
| Fractal dimension D | `computeFractalDimension()` |
| Quantum measurement | `applyFeedback()` |
| Born Rule deviation | `analyzeDeviations()` |
| Shadow (repressed) | `detectShadowPatterns()` |

## Core Equations

### Lambda Field
```
Λ(x) = Λ₀ × ln(C(x))
```
Where:
- Λ₀ = baseline (e ≈ 2.718)
- C(x) = configuration density

### Fractal Dimension
```
D = lim(ε→0) [ln(N(ε)) / ln(1/ε)]
```
Target: **D ≈ 1.90** (system at criticality)

## API Reference

### Types

```typescript
interface Action {
  type: string;
  description: string;
  frequency: number;      // 0-1
  timestamp?: number;
}

interface Belief {
  category: string;
  statement: string;
  strength: number;       // 0-1
}

interface ShadowPattern {
  action: Action;
  belief: Belief;
  contradiction: number;  // 0-1
}

interface ShadowAnalysis {
  lambda: number;
  coherence: number;
  fractalDimension: number;
  patterns: ShadowPattern[];
  deviations: Deviation[];
  insights: string[];
}
```

### Functions

#### `computeLambdaField(stateVector, historyLength?, baseline?)`
Compute Lambda field coherence from 16D state vector.

**Returns:** `{ lambda: number, coherence: number }`

**Interpretation:**
- λ > 2.0 → Strong pattern (crystallized)
- λ ∈ [1,2] → Stable pattern (learning)
- λ ∈ [0,1] → Weak signal (exploration)
- λ < 0 → Decoherent

#### `computeFractalDimension(timeSeries)`
Box-counting algorithm for fractal dimension.

**Returns:** `number` (typically 0.5 - 2.5)

**Interpretation:**
- D < 1.75 → Over-organized (fragile)
- D ≈ 1.90 → Criticality (optimal)
- D > 2.05 → Chaotic (unstable)

#### `isCritical(dimension, tolerance?)`
Check if dimension indicates system at criticality.

#### `detectShadowPatterns(actions, beliefs)`
Find contradictions between stated beliefs and actual behavior.

**Returns:** `ShadowPattern[]` sorted by contradiction level

#### `applyFeedback(state, measuredPattern, strength)`
Quantum-inspired state collapse based on observation.

#### `analyzeDeviations(predictions, outcomes)`
Born Rule deviation analysis for learning opportunities.

#### `analyzeShadows(stateVector, actions, beliefs, timeSeries?)`
Run complete shadow analysis with insights.

## Usage Example

```typescript
import {
  computeLambdaField,
  computeFractalDimension,
  detectShadowPatterns,
  analyzeShadows,
} from './lib/shadow-detector';

// Lambda field analysis
const { lambda, coherence } = computeLambdaField(vector16D, 50);
console.log(`Lambda: ${lambda}, Coherence: ${coherence}`);

// Fractal dimension
const D = computeFractalDimension(coherenceHistory);
console.log(`Fractal D: ${D}, Critical: ${Math.abs(D - 1.90) < 0.15}`);

// Shadow detection
const actions = [
  { type: 'exercise', description: 'Go to gym', frequency: 0.2 }
];
const beliefs = [
  { category: 'health', statement: 'Fitness is my priority', strength: 0.9 }
];
const shadows = detectShadowPatterns(actions, beliefs);
// → [{contradiction: 0.7, ...}] // Says fitness priority but rarely exercises

// Full analysis
const analysis = analyzeShadows(vector16D, actions, beliefs, history);
console.log(analysis.insights);
// → ["Shadow detected: 'Fitness is my priority' contradicts 'Go to gym' (70%)"]
```

## Category Mappings

Shadow detection maps belief categories to action types:

| Category | Related Action Types |
|----------|---------------------|
| health | exercise, diet, sleep, fitness |
| productivity | work, focus, task, goal |
| relationships | social, family, friend, partner |
| growth | learn, read, study, skill |
| finance | save, invest, budget, spend |
| creativity | create, art, write, design |

## Quantum State Model

```typescript
interface QuantumState {
  amplitudes: Map<string, number>;  // Pattern → probability amplitude
  phase: number;                     // Global phase
}

// Initialize uniform superposition
const state = initQuantumState(['pattern1', 'pattern2', 'pattern3']);

// Collapse on measurement
const collapsed = applyFeedback(state, 'pattern1', 0.8);
// pattern1 amplitude increases, others decay
```

## Integration with 16D Engine

```typescript
import { compute16DVector } from './lib/16d-engine-full';
import { computeLambdaField, analyzeShadows } from './lib/shadow-detector';

// Get user's 16D vector
const result = compute16DVector(birthData);

// Analyze coherence
const { lambda } = computeLambdaField(result.vector_16d);

// Full shadow analysis with behavior data
const analysis = analyzeShadows(
  result.vector_16d,
  userActions,
  userBeliefs,
  coherenceHistory
);
```

## Insights Generation

The `analyzeShadows` function generates contextual insights:

| Condition | Insight |
|-----------|---------|
| λ < 1 | "Low coherence detected - consider focusing on fewer priorities" |
| λ > 2 | "Strong coherence - patterns are crystallizing" |
| D ≈ 1.90 | "System at criticality - optimal for transformation" |
| D < 1.75 | "Over-structured patterns - introduce more spontaneity" |
| D > 2.05 | "High chaos detected - establish grounding routines" |
| Shadow found | "Shadow detected: [belief] contradicts [action] (X%)" |

## Performance

| Operation | Complexity | Typical Time |
|-----------|------------|--------------|
| computeLambdaField | O(n) | < 1ms |
| computeFractalDimension | O(n log n) | < 10ms |
| detectShadowPatterns | O(a × b) | < 5ms |
| analyzeShadows | O(n log n) | < 20ms |

## Storage Schema

```sql
-- Shadow patterns detected
CREATE TABLE shadow_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  belief_category TEXT NOT NULL,
  contradiction REAL NOT NULL,
  detected_at INTEGER NOT NULL,
  resolved_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Coherence history for fractal analysis
CREATE TABLE coherence_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lambda REAL NOT NULL,
  coherence REAL NOT NULL,
  fractal_d REAL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_coherence_user ON coherence_history(user_id, timestamp);
```

## References

- **FRC Theory:** `docs/squad/04-FRC-TRANSLATION.md`
- **16D Engine:** `src/lib/16d-engine-full.ts`
- **ARL Engine:** `src/lib/arl-engine.ts`
