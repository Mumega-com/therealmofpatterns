# Database Schema Documentation

**Agent:** Database
**Version:** 2.0.0
**Last Updated:** 2026-02-02

## Overview

Hybrid database architecture:
- **D1 (SQLite):** Primary relational storage at Cloudflare edge
- **KV:** High-performance cache for zeitgeist and computed data

---

## D1 Schema

### 1. users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  email_hash TEXT NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  preferences TEXT DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_hash ON users(email_hash);
```

### 2. orders

```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  product_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  birth_data TEXT NOT NULL,
  stripe_customer_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
);

CREATE INDEX idx_orders_email ON orders(email_hash);
CREATE INDEX idx_orders_status ON orders(status);
```

### 3. reports

```sql
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  email_hash TEXT NOT NULL,
  vector_8d TEXT NOT NULL,
  vector_16d TEXT NOT NULL,
  historical_matches TEXT,
  art_url TEXT,
  pdf_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_reports_order ON reports(order_id);
CREATE INDEX idx_reports_email ON reports(email_hash);
```

### 4. birth_charts

```sql
CREATE TABLE birth_charts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  email_hash TEXT,
  birth_date TEXT NOT NULL,
  birth_time TEXT NOT NULL,
  birth_lat REAL NOT NULL,
  birth_lon REAL NOT NULL,
  birth_tz TEXT NOT NULL,
  chart_data TEXT NOT NULL,
  initial_vector TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_birth_charts_user ON birth_charts(user_id);
CREATE INDEX idx_birth_charts_email ON birth_charts(email_hash);
```

### 5. user_vectors

```sql
CREATE TABLE user_vectors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vector_data TEXT NOT NULL,
  coherence REAL NOT NULL CHECK (coherence >= 0.0 AND coherence <= 1.0),
  snapshot_at INTEGER NOT NULL,
  trigger_event TEXT,
  delta_magnitude REAL,
  primary_dimension INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_user_vectors_user ON user_vectors(user_id, snapshot_at DESC);
CREATE INDEX idx_user_vectors_coherence ON user_vectors(coherence);
```

### 6. feedback_events

```sql
CREATE TABLE feedback_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL,
  response TEXT NOT NULL,
  intensity REAL,
  notes TEXT,
  vector_before TEXT NOT NULL,
  vector_after TEXT,
  coherence_delta REAL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_feedback_user ON feedback_events(user_id, created_at DESC);
CREATE INDEX idx_feedback_response ON feedback_events(response);
```

### 7. attractor_basins

```sql
CREATE TABLE attractor_basins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  centroid TEXT NOT NULL,
  radius REAL NOT NULL,
  pattern_type TEXT NOT NULL,
  strength REAL NOT NULL,
  visit_count INTEGER DEFAULT 1,
  first_detected_at INTEGER NOT NULL,
  last_visited_at INTEGER NOT NULL,
  archetype TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_attractor_user ON attractor_basins(user_id);
CREATE INDEX idx_attractor_strength ON attractor_basins(strength DESC);
```

### 8. shadow_patterns

```sql
CREATE TABLE shadow_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dimension INTEGER NOT NULL,
  deviation REAL NOT NULL,
  direction TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  confidence REAL NOT NULL,
  acknowledged INTEGER DEFAULT 0,
  integrated INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_shadow_user ON shadow_patterns(user_id, detected_at DESC);
CREATE INDEX idx_shadow_unintegrated ON shadow_patterns(integrated, acknowledged);
```

### 9. daily_proposals

```sql
CREATE TABLE daily_proposals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proposal_data TEXT NOT NULL,
  archetype TEXT NOT NULL,
  zeitgeist_alignment REAL NOT NULL,
  date TEXT NOT NULL,
  zeitgeist_snapshot TEXT NOT NULL,
  user_vector_snapshot TEXT NOT NULL,
  viewed_at INTEGER,
  feedback_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_proposals_user ON daily_proposals(user_id, date DESC);
```

### 10. zeitgeist_cache

```sql
CREATE TABLE zeitgeist_cache (
  date TEXT PRIMARY KEY,
  planetary_data TEXT NOT NULL,
  aspects TEXT NOT NULL,
  harmonic_resonance REAL NOT NULL,
  warrior_strength REAL NOT NULL,
  sage_strength REAL NOT NULL,
  lover_strength REAL NOT NULL,
  sovereign_strength REAL NOT NULL,
  computed_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
```

### 11. archetype_unlocks

```sql
CREATE TABLE archetype_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  archetype TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  unlocked_at INTEGER NOT NULL,
  last_expressed_at INTEGER,
  expression_count INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, archetype)
);

CREATE INDEX idx_unlocks_user ON archetype_unlocks(user_id, level DESC);
```

---

## KV Cache Layer

### Namespaces

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `zeitgeist:YYYY-MM-DD` | Full planetary data | 24h |
| `user_vector:{user_id}:latest` | Current 16D vector | 1h |
| `proposals:{user_id}:{date}` | Daily proposal | Until midnight |

---

## Query Patterns

### Latest Vector
```sql
SELECT * FROM user_vectors
WHERE user_id = ?
ORDER BY snapshot_at DESC LIMIT 1;
```

### Alignment Rate
```sql
SELECT response, COUNT(*) as count, AVG(intensity) as avg_intensity
FROM feedback_events
WHERE user_id = ? AND created_at >= ?
GROUP BY response;
```

### Active Shadows
```sql
SELECT * FROM shadow_patterns
WHERE user_id = ? AND integrated = 0
ORDER BY confidence DESC;
```

---

## Migration Strategy

```bash
# Phase 1: Schema creation
wrangler d1 migrations apply realm-of-patterns --local

# Phase 2: Production
wrangler d1 migrations apply realm-of-patterns --remote
```

---

## GDPR Compliance

```sql
-- User deletion (CASCADE handles all)
DELETE FROM users WHERE id = ?;

-- Data export
SELECT json_object(
  'user', (SELECT * FROM users WHERE id = ?),
  'vectors', (SELECT json_group_array(*) FROM user_vectors WHERE user_id = ?)
);
```

---

## Architecture Principles

1. **Edge-First:** All data at Cloudflare edge
2. **Vector-Native:** 16D tracking optimized
3. **Time-Series Optimized:** Pattern detection queries
4. **GDPR-Ready:** User data isolation
