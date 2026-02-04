# Database Migrations

## Privacy-First Schema

The `privacy-schema.sql` file contains the D1 schema for the privacy-first architecture.

### Tables Created

| Table | Purpose |
|-------|---------|
| `user_vault` | Encrypted birth data (PII vault) |
| `astrology_profiles` | Pattern statistics (no PII) |
| `checkins` | Daily check-in records (no PII) |
| `user_consents` | GDPR consent tracking |
| `data_deletion_requests` | Deletion audit trail |
| `data_export_requests` | Export audit trail |
| `analytics_events` | Anonymous analytics |

### Views

| View | Purpose |
|------|---------|
| `analytics_checkin_patterns` | Aggregate check-in analytics |
| `analytics_stage_distribution` | Stage distribution metrics |
| `analytics_engagement` | Engagement metrics |

## Running the Migration

### 1. Set the HASH_PEPPER Secret

First, generate a secure pepper for user hash generation:

```bash
# Generate a random pepper
openssl rand -hex 32
```

Add it to your Cloudflare environment:

```bash
# For development
npx wrangler secret put HASH_PEPPER

# Or in wrangler.toml for local dev
[vars]
HASH_PEPPER = "your-generated-pepper-here"
```

### 2. Run the D1 Migration

```bash
# Preview the migration (dry run)
npx wrangler d1 execute realm-of-patterns-db --file=src/db/privacy-schema.sql --local

# Run against remote D1
npx wrangler d1 execute realm-of-patterns-db --file=src/db/privacy-schema.sql --remote
```

### 3. Verify Tables

```bash
# List tables
npx wrangler d1 execute realm-of-patterns-db --command="SELECT name FROM sqlite_master WHERE type='table';" --remote

# Check user_vault schema
npx wrangler d1 execute realm-of-patterns-db --command="PRAGMA table_info(user_vault);" --remote
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  localStorage                                                   │
│  ├── rop_device_id: UUID                                        │
│  ├── rop_birth_data: { year, month, day, ... }                  │
│  ├── rop_checkins: [ { id, date, vector, ... }, ... ]           │
│  └── rop_preferences: { mode, theme, language }                 │
│                                                                 │
│  usePrivacyStorage hook manages all local data                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ If sync enabled:
                              │ Birth data encrypted client-side
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER (D1)                             │
├─────────────────────────────────────────────────────────────────┤
│  user_vault (encrypted PII)                                     │
│  ├── user_hash: SHA-256(device_id + pepper)                     │
│  ├── birth_data_enc: AES-256-GCM encrypted                      │
│  ├── key_salt: PBKDF2 salt                                      │
│  └── sync_code: COSMIC-XXXX-XXXX                                │
│                                                                 │
│  astrology_profiles (no PII)                                    │
│  ├── user_hash: links to vault                                  │
│  ├── dominant_dimension, current_stage                          │
│  └── streak_current, streak_longest                             │
│                                                                 │
│  checkins (no PII)                                              │
│  ├── user_hash: links to vault                                  │
│  ├── vector: [8 floats]                                         │
│  └── stage, kappa, mood_score                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Privacy Guarantees

1. **Local-first**: Data stays on device unless user enables sync
2. **Encrypted vault**: Birth data encrypted before leaving device
3. **Pseudonymization**: User identity is SHA-256 hash (irreversible)
4. **Data separation**: PII separated from analytics data
5. **GDPR compliant**: Export, delete endpoints available
