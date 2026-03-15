# API Reference — The Realm of Patterns

**Last Updated:** 2026-03-14
**Base URL:** `https://therealmofpatterns.com/api`

---

## Active Endpoints

### Public (No Auth)

| Method | Path | Purpose | External Deps |
|--------|------|---------|---------------|
| GET | `/api/daily-brief` | Today's cosmic field (planet, archetypes, moon, narrative) | None (KV cache) |
| GET | `/api/health` | Health check + optional full diagnostics | None |
| POST | `/api/preview` | Quick 8D vector from birthday (no birth time needed) | None |
| GET | `/api/natal-chart` | Full natal chart from birth data | None |
| POST | `/api/remind` | Schedule email reminder for tomorrow | Resend |
| POST | `/api/analytics` | Batch event tracking | None |

### Authenticated (Session Cookie or Bearer Token)

| Method | Path | Purpose | External Deps |
|--------|------|---------|---------------|
| POST | `/api/compute` | 16D vector + historical figure matches | None |
| POST | `/api/compute-full` | Full 16D profile (inner/outer, kappa, failure) | Python VPS (fallback) |
| POST | `/api/personal-reading` | Personalized Sol reading (natal × transit) | Gemini |
| POST | `/api/narrator` | AI narrative generation (daily/weekly) | Gemini → OpenAI → Workers AI |
| POST | `/api/share` | Share to Twitter/Telegram/Discord | Twitter, Telegram, Discord APIs |
| GET | `/api/auth/me` | Current session info | None |
| POST | `/api/auth/magic` | Send magic link email | Resend |
| GET | `/api/auth/verify` | Verify magic link token, create session | None |
| POST | `/api/auth/logout` | Destroy session | None |

### Stripe (Webhook + Checkout)

| Method | Path | Purpose | External Deps |
|--------|------|---------|---------------|
| POST | `/api/webhook` | Stripe event handler (subscriptions, payments) | Stripe |
| POST | `/api/create-subscription-checkout` | Create Stripe checkout session | Stripe |
| POST | `/api/subscription-status` | Verify subscription status | Stripe (optional) |

### Cron (Admin Key Required)

| Method | Path | Purpose | Schedule |
|--------|------|---------|----------|
| POST | `/api/daily-update` | Daily content generation + user snapshots | 00:00 UTC |
| POST | `/api/quality-check` | Content QA + retry failed items | 12:00 UTC |

### Content Engine

| Method | Path | Purpose | External Deps |
|--------|------|---------|---------------|
| POST | `/api/publish` | Publish generated content to D1 + R2 | None |
| POST | `/api/generate-batch` | Batch content generation | Gemini |
| GET | `/api/cms/list` | List CMS content | None |
| GET | `/api/cms/page` | Get single CMS page | None |

### User Data

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/user/init` | Initialize user profile |
| POST | `/api/user/sync` | Sync user data to server |
| POST | `/api/user/export` | GDPR data export |
| POST | `/api/user/delete` | GDPR account deletion |

### Analytics (Admin)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/analytics` | Dashboard: funnel metrics, top pages, traffic |

---

## Key Endpoint Details

### GET `/api/daily-brief`

Returns today's cosmic field reading. Public, cached in KV for 24h.

**Query Params:** `?date=YYYY-MM-DD` (optional, defaults to today)

**Response:**
```json
{
  "date": "2026-03-14",
  "planet": { "name": "Saturn", "symbol": "♄", "dimension": "Structure" },
  "frequency": 0.67,
  "dimension": { "name": "Structure", "symbol": "♄", "index": 1 },
  "archetypes": {
    "primary": { "name": "The Ruler", "dimension": "Structure" },
    "secondary": { "name": "The Sage", "dimension": "Mind" }
  },
  "moonPhase": { "name": "Waning Gibbous", "illumination": 0.82 },
  "narrative": "..."
}
```

### POST `/api/preview`

Quick 8D vector from birthday. No birth time needed.

**Body:**
```json
{ "birth_data": { "year": 1990, "month": 3, "day": 15 } }
```

**Response:**
```json
{
  "vector_8d": [0.82, 0.45, 0.71, 0.63, 0.55, 0.91, 0.48, 0.67],
  "dominant": { "name": "Drive", "symbol": "♂", "value": 0.91 },
  "archetype": { "name": "The Warrior", "figure": "Alexander the Great" },
  "dimensions": [...]
}
```

### POST `/api/narrator`

Generate AI narrative. Uses model fallback chain: Gemini 3 Flash → OpenAI → Gemini 2.5 Flash → Workers AI.

**Body:**
```json
{
  "userHash": "abc123",
  "systemPrompt": "You are Sol...",
  "userPrompt": "Today's check-in: energy=4, focus=2...",
  "tier": "free",
  "checkinId": "2026-03-14-abc",
  "type": "daily"
}
```

**Response:**
```json
{
  "narrative": "Something in your attention is scattered today...",
  "tier": "free",
  "model": "gemini-2.5-flash",
  "cached": false
}
```

---

## Planned Endpoints (Phase 2-3)

| Method | Path | Purpose | Phase |
|--------|------|---------|-------|
| POST | `/api/openclaw-webhook` | Receive messages from OpenClaw gateway | 2 |
| POST | `/api/ghl-sync` | Sync contact data to GHL CRM | 3 |
| GET | `/api/reading-for-contact` | Generate reading given birth data (for messaging) | 2 |
| POST | `/api/compare` | Compare two birth vectors, return resonance | 5 |

---

## Middleware

`functions/_middleware.ts` runs on all requests:
- **CORS:** Allows `therealmofpatterns.com`, `localhost:*`
- **Security headers:** CSP, X-Frame-Options, X-Content-Type-Options
- **Geo-language detection:** Auto-redirects to localized paths
- **Language cookie:** Persists user language preference

---

## Authentication

Two auth methods:
1. **Magic link:** POST `/api/auth/magic` → email sent → GET `/api/auth/verify?token=xxx` → session cookie set
2. **Session cookie:** `rop_session` cookie, validated via D1 sessions table

Session info: GET `/api/auth/me` returns `{ authenticated, email_hash, isPro, plan }`

---

## Rate Limiting

- Narrator: 10 requests/hour per user hash (KV-backed)
- Preview: 30 requests/hour per IP
- Analytics: 100 events/batch
- All cron endpoints: admin key required

---

*This document reflects actual deployed endpoints as of 2026-03-14.*
