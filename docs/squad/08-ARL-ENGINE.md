# Adaptive Resonance Learning (ARL) Engine

**File:** `src/lib/arl-engine.ts`
**Status:** ✅ Implemented
**Date:** 2026-02-02

## Overview

Physics-inspired preference learning system that models user preferences as a 16D vector evolving through feedback. Based on FRC (Fractal Resonance Coherence) principles.

## Physics Mapping

| FRC Concept | Implementation |
|-------------|----------------|
| Quantum state \|ψ⟩ | `UserSignature.vector` |
| Ground state \|ψ₀⟩ | `UserSignature.baseline` |
| Velocity d\|ψ⟩/dt | `UserSignature.momentum` |
| Damping α | `ARLConfig.learningRate` |
| Dissipation β | `ARLConfig.decayRate` |
| Attractor basin | `AttractorBasin` |

## Core Equation

```
Δψ = α · δ · (pattern - ψ) + β · momentum
```

Where:
- α = learning rate (0.15 default)
- δ = feedback rating (-1 to 1)
- β = decay rate (0.95 default)

## API Reference

### Configuration

```typescript
interface ARLConfig {
  learningRate: number;    // 0.15 - adaptation speed
  decayRate: number;       // 0.95 - momentum decay
  epsilon: number;         // 0.001 - min change threshold
  maxValue: number;        // 1.0 - stability bound
  clusterEps: number;      // 0.3 - DBSCAN radius
  clusterMinPts: number;   // 3 - DBSCAN min points
}
```

### Types

```typescript
interface UserSignature {
  vector: number[];        // Current 16D state
  baseline: number[];      // Initial state
  momentum: number[];      // Accumulated velocity
  updateCount: number;     // Total updates
  lastUpdate: number;      // Timestamp
  history: FeedbackRecord[];
}

interface AttractorBasin {
  center: number[];        // Centroid in 16D space
  radius: number;          // Basin size
  strength: number;        // Sample count
}
```

### Functions

#### `initSignature(initial?: number[]): UserSignature`
Initialize a new user signature with optional starting vector.

#### `updateSignature(sig, patternVector, rating, config?): UserSignature`
Update signature based on feedback. Rating: -1 (dislike) to 1 (like).

#### `coherenceScore(sig, pattern): number`
Compute coherence (0-1) between user and pattern using cosine similarity.

#### `detectAttractors(sig, config?): AttractorBasin[]`
Find preference clusters using DBSCAN on positive feedback history.

#### `predictResponse(sig, pattern, attractors): number`
Predict user response (-1 to 1) combining coherence and attractor membership.

### Vector Math

```typescript
addVectors(a, b)          // Element-wise addition
subtractVectors(a, b)     // Element-wise subtraction
scaleVector(v, s)         // Scalar multiplication
euclideanDistance(a, b)   // L2 distance
dotProduct(a, b)          // Inner product
magnitude(v)              // Vector length
normalize(v)              // Unit vector
clamp(v, max)             // Bound to [-max, max]
```

## Usage Example

```typescript
import {
  initSignature,
  updateSignature,
  detectAttractors,
  predictResponse,
} from './lib/arl-engine';

// Initialize user
let user = initSignature();

// Process feedback
user = updateSignature(user, patternVector, 0.8); // liked it

// After 10+ interactions
const attractors = detectAttractors(user);

// Predict new patterns
const prediction = predictResponse(user, newPattern, attractors);
// > 0.5 = likely to like
// < -0.5 = likely to dislike
```

## Integration with 16D Engine

```typescript
import { compute16DVector } from './lib/16d-engine-full';
import { updateSignature } from './lib/arl-engine';

// Get 16D vector from birth data
const pattern = compute16DVector(birthData);

// Update user signature with feedback
user = updateSignature(user, pattern.vector, rating);
```

## DBSCAN Clustering

Density-based clustering detects stable preference regions:

1. Filter positive feedback samples
2. Find dense neighborhoods (eps radius)
3. Expand clusters from core points
4. Compute centroids and radii
5. Sort by strength (sample count)

## Performance

| Operation | Complexity | Typical Time |
|-----------|------------|--------------|
| updateSignature | O(16) | < 1ms |
| coherenceScore | O(16) | < 1ms |
| detectAttractors | O(n²) | < 50ms for n=100 |
| predictResponse | O(a·16) | < 1ms for a<10 |

## Storage Schema

```sql
-- D1 table for user signatures
CREATE TABLE user_signatures (
  user_id TEXT PRIMARY KEY,
  vector TEXT NOT NULL,        -- JSON array
  baseline TEXT NOT NULL,
  momentum TEXT NOT NULL,
  update_count INTEGER DEFAULT 0,
  last_update INTEGER,
  created_at INTEGER
);

-- Feedback history
CREATE TABLE feedback_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  vector TEXT NOT NULL,
  rating REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user_signatures(user_id)
);

-- Detected attractors
CREATE TABLE attractors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  center TEXT NOT NULL,
  radius REAL NOT NULL,
  strength INTEGER NOT NULL,
  detected_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES user_signatures(user_id)
);
```

## KV Cache Keys

```
user:signature:{user_id}     → UserSignature JSON (TTL: 1 hour)
user:attractors:{user_id}    → AttractorBasin[] JSON (TTL: 1 day)
```
