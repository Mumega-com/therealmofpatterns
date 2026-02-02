# Technical Architecture

**Agent:** Engineer
**Version:** 2.0.0
**Last Updated:** 2026-02-02

## System Overview

**The Realm of Patterns** is a Lambda-field probe built on Cloudflare's edge infrastructure.

### Infrastructure Stack

```
┌─────────────────────────────────────────────────────┐
│                  Cloudflare Edge                     │
├─────────────────────────────────────────────────────┤
│  Pages (Static)  │  Workers (Compute)  │  D1 (DB)   │
│  - Static HTML   │  - API Routes       │  - SQLite  │
│  - Vanilla JS    │  - Scheduled Jobs   │  - Vectors │
├──────────────────┴─────────────────────┴────────────┤
│  KV (Cache)      │  R2 (Storage)       │  Analytics │
└─────────────────────────────────────────────────────┘
```

---

## 16D Vector Representation

```typescript
interface Vector16D {
  // 8 Inner (Karma) + 8 Outer (Dharma) dimensions
  dimensions: number[];  // 16 values, each 0.0 to 1.0
  timestamp: number;
  metadata?: VectorMetadata;
}

interface UserCoherenceSignature {
  user_id: string;
  mean_vector: Vector16D;
  covariance_matrix: number[][];  // 16x16
  total_feedback: number;
  learning_rate: number;
  last_updated: string;
}
```

---

## Adaptive Resonance Learning (ARL)

```typescript
interface ARLConfig {
  initial_learning_rate: 0.3;
  min_learning_rate: 0.01;
  decay_factor: 0.995;
  momentum: 0.1;
}

function updateCoherenceSignature(
  signature: UserCoherenceSignature,
  feedbackVector: Vector16D,
  isPositive: boolean,
  config: ARLConfig
): UserCoherenceSignature {
  const lr = Math.max(
    config.min_learning_rate,
    signature.learning_rate * config.decay_factor
  );

  if (isPositive) {
    const delta = subtractVectors(feedbackVector, signature.mean_vector);
    const update = scaleVector(delta, lr);
    return { ...signature, mean_vector: addVectors(signature.mean_vector, update) };
  }
  // Negative: move slightly away
  return signature;
}
```

---

## DBSCAN Clustering for Attractor Basins

```typescript
interface ClusterConfig {
  epsilon: 2.5;        // Radius in 16D space
  minPoints: 3;        // Minimum cluster size
  maxClusters: 12;     // Zodiac-aligned maximum
}

function detectAttractorBasins(
  feedbackVectors: Array<{vector: Vector16D, score: number}>,
  config: ClusterConfig
): Cluster[] {
  const positiveVectors = feedbackVectors
    .filter(f => f.score > 60)
    .map(f => f.vector);

  return dbscan(positiveVectors, config.epsilon, config.minPoints);
}
```

---

## API Specifications

### POST /api/compute
```typescript
interface ComputeRequest {
  birth_date: string;      // ISO 8601
  birth_time: string;      // HH:MM
  birth_place: string;
  timezone: string;
}

interface ComputeResponse {
  proposal: { moment: string; coherence_score: number; vector: Vector16D; };
  birth_chart: { sun_sign: string; moon_sign: string; ascendant: string; };
  user_id: string;
}
```

### POST /api/feedback
```typescript
interface FeedbackRequest {
  user_id: string;
  proposal_id: string;
  rating: 'resonant' | 'neutral' | 'dissonant';
}
```

### GET /api/history
### POST /api/report
### GET /api/weather

---

## Scheduled Jobs

```typescript
// /functions/scheduled.ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    if (event.cron === '0 0 * * *') {
      await generateDailyProposals(env);  // 00:00 UTC
    } else if (event.cron === '0 6 * * *') {
      await updateAttractorBasins(env);   // 06:00 UTC
    }
  }
};
```

---

## Caching Strategy

```typescript
// KV Keys
`proposal:${user_id}:${date}` -> ComputeResponse (TTL: 2 days)
`weather:${lat}:${lon}` -> WeatherResponse (TTL: 15 min)
`chart:${birth_hash}` -> BirthChart (permanent)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `/src/lib/16d-engine-full.ts` | Full vector computation with ephemeris |
| `/src/lib/arl-engine.ts` | Adaptive Resonance Learning |
| `/src/lib/shadow-detector.ts` | Shadow pattern detection |
| `/functions/scheduled.ts` | Daily cron jobs |
| `/functions/api/compute-full.ts` | Main computation API |
| `/functions/api/checkout.ts` | Stripe checkout |
| `/functions/api/webhook.ts` | Stripe webhook + report generation |

---

**Architecture Principles:**
1. Edge-First - Compute at the edge for <50ms latency
2. Privacy-First - No unnecessary data collection
3. Learning-First - System improves with every interaction
