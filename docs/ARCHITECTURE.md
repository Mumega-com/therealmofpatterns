# The Realm of Patterns: System Architecture

**Version:** 2.0
**Status:** CANONICAL REFERENCE
**Date:** 2026-02-03
**Pattern:** Microkernel + Message-Passing

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADAPTERS                                │
│         (Web, Mobile, CLI, API, Telegram, Discord)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       MESSAGE BUS                               │
│              (Redis Pub/Sub + Streams)                          │
│                                                                 │
│   Channels: global | private:{agent} | squad:{name}            │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    ENGINE     │    │    MEMORY     │    │    VOICE      │
│   (Core FRC)  │    │   (Vector +   │    │  (Kasra +     │
│               │    │    History)   │    │  River + Sol) │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         KERNEL                                  │
│           (Schema, Contracts, Capabilities)                     │
│                    NO HEAVY DEPENDENCIES                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Microkernel** | Kernel has no heavy deps. Services load their own. |
| **Message-Passing** | All inter-service communication via typed messages |
| **Contracts First** | Define interfaces before implementation |
| **Capability-Based** | Scoped, time-limited tokens for dangerous ops |
| **Observability** | Structured logging, tracing, metrics everywhere |
| **Offline-First** | Core functions work without network |

---

## 3. Kernel Layer

The kernel contains **only**:
- Type definitions
- Message schemas
- Contract interfaces
- Capability system
- NO network calls, NO heavy imports

### 3.1 Directory Structure

```
src/kernel/
├── schema.ts           # Message types, envelopes
├── contracts/
│   ├── engine.ts       # EngineContract
│   ├── memory.ts       # MemoryContract
│   ├── voice.ts        # VoiceContract
│   └── adapter.ts      # AdapterContract
├── capability.ts       # Token-based access control
├── types.ts            # Core type definitions
└── index.ts            # Public exports
```

### 3.2 Message Schema

```typescript
// src/kernel/schema.ts

export enum MessageType {
  // Engine
  COMPUTE_NATAL = 'compute_natal',
  COMPUTE_WEATHER = 'compute_weather',
  COMPUTE_FORECAST = 'compute_forecast',
  DETECT_FAILURE = 'detect_failure',

  // Memory
  STORE_CHECKIN = 'store_checkin',
  QUERY_HISTORY = 'query_history',
  STORE_FEEDBACK = 'store_feedback',

  // Voice
  GENERATE_KASRA = 'generate_kasra',
  GENERATE_RIVER = 'generate_river',
  GENERATE_SOL = 'generate_sol',

  // System
  HEALTH_CHECK = 'health_check',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

export interface Message<T = unknown> {
  id: string;                    // UUID
  type: MessageType;             // What operation
  source: string;                // "adapter:web" | "service:engine"
  target: string;                // "service:voice" | "user:123"
  payload: T;                    // Request-specific data
  traceId: string;               // Distributed tracing
  timestamp: Date;               // When sent
  version: string;               // "1.0"
  capabilityId?: string;         // For protected operations
}

export interface Response<T = unknown> {
  status: 'success' | 'error' | 'unauthorized';
  data?: T;
  error?: { code: string; message: string };
  traceId: string;
}
```

### 3.3 Service Contracts

```typescript
// src/kernel/contracts/engine.ts

export interface ComputeNatalRequest {
  birthData: BirthData;
}

export interface ComputeNatalResponse {
  configuration: NatalConfiguration;
}

export interface EngineContract {
  computeNatal(req: ComputeNatalRequest): Promise<ComputeNatalResponse>;
  computeWeather(date: Date): Promise<DailyWeather>;
  computeForecast(req: ComputeForecastRequest): Promise<PersonalForecast>;
  detectFailure(state: DiamondState): Promise<FailureMode>;
}
```

```typescript
// src/kernel/contracts/voice.ts

export interface GenerateVoiceRequest {
  forecast: PersonalForecast;
  voice: 'kasra' | 'river' | 'sol';
  context?: string;
}

export interface VoiceContract {
  generate(req: GenerateVoiceRequest): Promise<GenerateVoiceResponse>;
  generateAll(forecast: PersonalForecast): Promise<{
    kasra: string;
    river: string;
    sol: string;
  }>;
}
```

### 3.4 Capability System

```typescript
// src/kernel/capability.ts

export enum CapabilityAction {
  READ_NATAL = 'read:natal',
  READ_FORECAST = 'read:forecast',
  WRITE_CHECKIN = 'write:checkin',
  DELETE_DATA = 'delete:data',
  ADMIN_ACCESS = 'admin:access',
}

export interface Capability {
  id: string;
  subject: string;              // User ID
  action: CapabilityAction;
  resource: string;             // Glob pattern
  issuedAt: Date;
  expiresAt: Date;
  issuer: string;
}
```

---

## 4. Services Layer

Each service is **isolated**, **stateless**, and **independently deployable**.

### 4.1 Engine Service

The mathematical core. Computes all FRC operations.

```
src/services/engine/
├── index.ts              # Service entry point
├── natal.ts              # Birth configuration computation
├── weather.ts            # Daily weather computation
├── forecast.ts           # Personal forecast generation
├── failure.ts            # Failure mode detection
├── operators.ts          # Operator activation formulas
└── transit.ts            # Transit/aspect calculations
```

**Dependencies:** None (pure TypeScript math)

### 4.2 Memory Service

Stores user data, history, and feedback.

```
src/services/memory/
├── index.ts              # Service entry point
├── store.ts              # Data persistence
├── query.ts              # History queries
└── feedback.ts           # ARL feedback loop
```

**Dependencies:** D1 (Cloudflare), Redis (optional)

### 4.3 Voice Service

Generates text output in each voice.

```
src/services/voice/
├── index.ts              # Service entry point
├── kasra.ts              # Physics voice generator
├── river.ts              # Mythopoetic voice generator
├── sol.ts                # Accessible voice generator
└── templates/            # Voice templates
```

**Dependencies:** Templates (static), AI API (optional)

---

## 5. The Three Voices

### 5.1 Kasra (The Architect)

**μ-Level:** μ4 (Conceptual)
**Operators:** Logos, Nous
**Language:** Mathematical, falsifiable, precise

```typescript
// src/services/voice/kasra.ts

export function generateKasraForecast(forecast: PersonalForecast): string {
  const { kappa, RU, stage, muLevel, aspects } = forecast;

  let output = `κ = ${kappa.toFixed(2)} ± 0.05\n`;
  output += `RU = ${RU.toFixed(1)}\n`;
  output += `Stage: ${stage.name.toUpperCase()} (${stage.range[0]}-${stage.range[1]})\n`;
  output += `μ-level: ${muLevel.toFixed(1)} (${getMuLevelName(muLevel)})\n\n`;

  if (aspects.length > 0) {
    output += `Active Aspects:\n`;
    aspects.forEach(a => {
      output += `  ${a.transitOperator.name} ${a.type} ${a.natalAnchor} (${(a.strength * 100).toFixed(0)}%)\n`;
    });
  }

  output += `\nRecommendation: ${getKasraRecommendation(forecast)}`;

  return output;
}
```

### 5.2 River (The Oracle)

**μ-Level:** μ5-μ6 (Archetypal-Noetic)
**Operators:** Mythos, Telos
**Language:** Poetic, symbolic, Jungian

```typescript
// src/services/voice/river.ts

export function generateRiverForecast(forecast: PersonalForecast): string {
  const { stage, aspects, natal } = forecast;

  const stagePoetry = STAGE_POETRY[stage.id];
  const aspectNarrative = aspects.map(a =>
    ASPECT_NARRATIVES[a.type][a.transitOperator.id]
  ).join(' ');

  const archetypeCall = `The ${natal.primary.operator.archetype} within ${
    aspects.some(a => a.natalAnchor === 'primary') ? 'awakens' : 'rests'
  }.`;

  return `${stagePoetry}\n\n${archetypeCall}\n\n${aspectNarrative}`;
}
```

### 5.3 Sol (The Friend)

**μ-Level:** μ3-μ4 (Sentient-Conceptual)
**Style:** Alan Watts meets Ram Dass
**Language:** Conversational, playful, accessible

```typescript
// src/services/voice/sol.ts

export function generateSolForecast(forecast: PersonalForecast): string {
  const { kappa, aspects } = forecast;

  // No jargon, no numbers unless really needed
  const energyLevel = kappa > 0.7 ? 'good' : kappa > 0.4 ? 'okay' : 'low';

  let output = SOL_OPENERS[Math.floor(Math.random() * SOL_OPENERS.length)];

  if (energyLevel === 'good') {
    output += " Something wants to move today. Don't overthink it.";
  } else if (energyLevel === 'okay') {
    output += " Not the day for big swings. Do the small things well.";
  } else {
    output += " Gentle day. The fog will lift—just not yet.";
  }

  if (aspects.some(a => a.type === 'conjunction')) {
    output += " There's alignment here. Trust it.";
  }

  return output;
}
```

---

## 6. Data Flow

### 6.1 Check-in Flow

```
User opens /checkin
        │
        ▼
┌─────────────────┐
│  Web Adapter    │  1. Render check-in form
└────────┬────────┘
         │ User submits mood, energy, focus
         ▼
┌─────────────────┐
│  Engine Service │  2. Compute κ, RU, aspects
└────────┬────────┘
         │ Forecast computed
         ▼
┌─────────────────┐
│  Voice Service  │  3. Generate 3 voices
└────────┬────────┘
         │ kasra, river, sol texts
         ▼
┌─────────────────┐
│  Memory Service │  4. Store check-in + forecast
└────────┬────────┘
         │ Confirmation
         ▼
┌─────────────────┐
│  Web Adapter    │  5. Render forecast in user's mode
└─────────────────┘
```

---

## 7. Deployment Modes

### 7.1 Edge Mode (Cloudflare) - Default

```
┌─────────────────────────────────────────┐
│           Cloudflare Edge               │
├─────────────────────────────────────────┤
│  Pages (Static)  │  Workers (Compute)   │
│  - Astro SSG     │  - Engine Service    │
│  - Assets        │  - Voice Service     │
│                  │  - API Gateway       │
├─────────────────────────────────────────┤
│  D1 (Database)   │  KV (Cache)          │
│  - User data     │  - Sessions          │
│  - History       │  - Rate limits       │
├─────────────────────────────────────────┤
│  R2 (Storage)    │  Queues (Async)      │
│  - Reports       │  - Email jobs        │
└─────────────────────────────────────────┘
```

### 7.2 Self-Hosted Mode

```yaml
# docker-compose.yml

services:
  redis:
    image: redis:alpine
    ports: ["6379:6379"]

  engine:
    build: ./services/engine
    ports: ["6060:6060"]
    depends_on: [redis]

  memory:
    build: ./services/memory
    ports: ["7070:7070"]
    depends_on: [redis]

  voice:
    build: ./services/voice
    ports: ["8080:8080"]
    depends_on: [redis]

  web:
    build: ./adapters/web
    ports: ["3000:3000"]
    depends_on: [engine, memory, voice]
```

### 7.3 Hybrid Mode (Offline + Sync)

```
Local (offline-capable)          Cloud (optional)
┌─────────────────────┐         ┌─────────────────────┐
│  Engine Service     │ ──────► │  Memory Sync        │
│  Voice Templates    │         │  AI Voice Service   │
│  SQLite             │         │  Analytics          │
└─────────────────────┘         └─────────────────────┘
```

---

## 8. File Structure

```
the-realm-of-patterns/
├── src/
│   ├── kernel/                    # Core (no deps)
│   │   ├── schema.ts
│   │   ├── contracts/
│   │   ├── capability.ts
│   │   └── types.ts
│   │
│   ├── services/                  # Independent services
│   │   ├── engine/
│   │   │   ├── natal.ts
│   │   │   ├── weather.ts
│   │   │   ├── forecast.ts
│   │   │   └── failure.ts
│   │   │
│   │   ├── memory/
│   │   │   ├── store.ts
│   │   │   └── query.ts
│   │   │
│   │   ├── voice/
│   │   │   ├── kasra.ts
│   │   │   ├── river.ts
│   │   │   ├── sol.ts
│   │   │   └── templates/
│   │   │
│   │   └── bus/
│   │
│   └── adapters/                  # Client adapters
│       ├── web/                   # Astro frontend
│       │   ├── components/
│       │   │   ├── kasra/
│       │   │   ├── river/
│       │   │   └── sol/
│       │   └── pages/
│       │
│       ├── api/                   # REST API
│       └── telegram/              # Telegram bot
│
├── docs/
│   ├── ARCHITECTURE.md            # This file
│   ├── FRC-COSMOLOGY.md           # Operator system
│   ├── DESIGN-VISION.md           # Visual design
│   └── SUB-PROJECT-SPEC.md        # Cultural adapters
│
├── functions/                     # Cloudflare Pages Functions
├── public/                        # Static assets (legacy)
├── docker-compose.yml
└── wrangler.toml
```

---

## 9. Migration Path

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **1. Kernel** | Week 1 | Schema, contracts, capability system |
| **2. Engine** | Week 2 | Natal, weather, forecast, failure detection |
| **3. Voice** | Week 3 | Kasra, River, Sol generators |
| **4. Memory** | Week 4 | D1 migration, history queries |
| **5. Astro** | Week 5-6 | Components for each mode |
| **6. Integration** | Week 7 | E2E testing, deployment |

---

## 10. Security

- **JWT Authentication** with tier info (free/pro)
- **Rate Limiting** per-user, per-endpoint
- **Capability Tokens** for dangerous operations
- **Data Encryption** at rest
- **GDPR Compliance** with export/delete

---

## 11. Observability

```typescript
// Every log entry
{
  ts: "2026-02-03T14:30:00.123Z",
  level: "info",
  service: "engine",
  traceId: "abc123",
  userId: "user_789",
  msg: "Forecast computed",
  kappa: 0.67,
  stage: "citrinitas"
}
```

**Health Endpoints:** `GET /health` on every service

**Metrics:** Prometheus-format at `GET /metrics`

---

**STATUS:** CANONICAL REFERENCE

---

*"Architecture is frozen music."* — Kasra

*"The system is the shape through which meaning flows."* — River

*"Keep it simple. Then keep it simpler."* — Sol
