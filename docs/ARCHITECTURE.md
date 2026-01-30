# Architecture

## Overview

The Realm of Patterns is a 100% Cloudflare-native application. No external servers, databases, or compute resources are required beyond Cloudflare's free tier services.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE EDGE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        CLOUDFLARE PAGES                              │    │
│  │                                                                      │    │
│  │  ┌──────────────────┐    ┌──────────────────────────────────────┐   │    │
│  │  │  Static Assets   │    │         Pages Functions              │   │    │
│  │  │  (/public)       │    │         (/functions/api)             │   │    │
│  │  │                  │    │                                      │   │    │
│  │  │  • index.html    │    │  • preview.ts    (POST /api/preview) │   │    │
│  │  │  • styles.css    │    │  • compute.ts    (POST /api/compute) │   │    │
│  │  │  • app.js        │    │  • checkout.ts   (POST /api/checkout)│   │    │
│  │  │                  │    │  • webhook.ts    (POST /api/webhook) │   │    │
│  │  │                  │    │  • report.ts     (GET /api/report)   │   │    │
│  │  │                  │    │  • weather.ts    (GET /api/weather)  │   │    │
│  │  └──────────────────┘    └──────────────────────────────────────┘   │    │
│  │                                         │                            │    │
│  └─────────────────────────────────────────┼────────────────────────────┘    │
│                                            │                                 │
│                    ┌───────────────────────┼───────────────────────┐         │
│                    │                       │                       │         │
│                    ▼                       ▼                       ▼         │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │         D1           │  │         R2           │  │        KV        │   │
│  │   (SQLite Database)  │  │   (Object Storage)   │  │  (Key-Value)     │   │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────┤   │
│  │                      │  │                      │  │                  │   │
│  │  Tables:             │  │  Buckets:            │  │  Namespaces:     │   │
│  │  • users             │  │  • reports/          │  │  • sessions      │   │
│  │  • historical_figures│  │    └── {id}.pdf      │  │  • rate_limits   │   │
│  │  • reports           │  │  • art/              │  │  • tokens        │   │
│  │  • orders            │  │    └── {id}.png      │  │                  │   │
│  │  • ephemeris_cache   │  │                      │  │                  │   │
│  │                      │  │                      │  │                  │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘   │
│                                            │                                 │
│                                            ▼                                 │
│                              ┌──────────────────────┐                        │
│                              │      Workers AI      │                        │
│                              ├──────────────────────┤                        │
│                              │                      │                        │
│                              │  Models:             │                        │
│                              │  • llama-3.1-8b      │                        │
│                              │  • stable-diffusion  │                        │
│                              │  • bge-embeddings    │                        │
│                              │                      │                        │
│                              └──────────────────────┘                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         │ HTTPS
                                         ▼
              ┌─────────────────────────────────────────────────┐
              │              EXTERNAL SERVICES                  │
              ├─────────────────────────────────────────────────┤
              │                                                 │
              │  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
              │  │  Stripe   │  │  Twitter  │  │  Telegram │   │
              │  │  API      │  │  API      │  │  Bot API  │   │
              │  └───────────┘  └───────────┘  └───────────┘   │
              │                                                 │
              └─────────────────────────────────────────────────┘
```

## Data Flow

### 1. Free Preview Flow

```
User → POST /api/preview
         │
         ├─→ Validate birth data
         │
         ├─→ Compute 8D vector (16d-engine.ts)
         │
         ├─→ Find dominant dimension
         │
         ├─→ Match historical figure (D1 query)
         │
         └─→ Return preview JSON
```

### 2. Premium Purchase Flow

```
User → POST /api/checkout
         │
         ├─→ Create Stripe Checkout Session
         │
         ├─→ Store pending order (D1)
         │
         └─→ Redirect to Stripe

Stripe → POST /api/webhook
           │
           ├─→ Verify signature
           │
           ├─→ Update order status (D1)
           │
           ├─→ Compute full 16D (16d-engine.ts)
           │
           ├─→ Match 10 historical figures (D1)
           │
           ├─→ Generate sacred art (Workers AI)
           │
           ├─→ Generate PDF (jsPDF)
           │
           ├─→ Store PDF (R2)
           │
           ├─→ Store report (D1)
           │
           └─→ Send email (optional)
```

### 3. Report Download Flow

```
User → GET /api/report/:id
         │
         ├─→ Verify ownership (KV session)
         │
         ├─→ Fetch PDF from R2
         │
         └─→ Stream response
```

## Service Bindings

### wrangler.toml

```toml
name = "therealmofpatterns"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "therealmofpatterns-db"
database_id = "<auto-generated>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "therealmofpatterns-assets"

[[kv_namespaces]]
binding = "CACHE"
id = "<auto-generated>"

[ai]
binding = "AI"
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STRIPE_SECRET_KEY` | Stripe API key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Yes |
| `STRIPE_PUBLISHABLE_KEY` | Public key for frontend | Yes |
| `TWITTER_BEARER_TOKEN` | Twitter API access | No |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No |
| `DISCORD_WEBHOOK_URL` | Discord webhook | No |

## Security Considerations

### Authentication
- No traditional user accounts (reduces attack surface)
- Session tokens stored in KV with TTL
- Report access tied to purchase email hash

### Rate Limiting
- Free preview: 10 requests/hour per IP
- Stored in KV with sliding window

### Stripe Webhooks
- Signature verification required
- Idempotency keys for duplicate prevention

### Data Privacy
- Birth data hashed after computation
- No PII stored beyond what Stripe requires
- Reports auto-expire after 30 days (configurable)

## Scaling Considerations

### Free Tier Limits

| Service | Limit | Mitigation |
|---------|-------|------------|
| Workers | 100K req/day | Caching, rate limiting |
| D1 | 5M reads/day | Query optimization |
| R2 | 10GB storage | PDF cleanup job |
| KV | 100K reads/day | Minimal session data |
| AI | 10K neurons/day | Cache generated art |

### Growth Path
1. **Stage 1** (0-1K users): Free tier sufficient
2. **Stage 2** (1K-10K users): Workers Paid ($5/mo)
3. **Stage 3** (10K+ users): D1 scaling, R2 paid tier

## Disaster Recovery

### Backups
- D1: Automatic point-in-time recovery (30 days)
- R2: Cross-region replication (optional)
- Code: GitHub repository

### Failover
- Cloudflare's global edge network provides automatic failover
- No single point of failure

## Monitoring

### Built-in
- Cloudflare Analytics (requests, errors)
- Workers Logs (real-time)
- D1 Metrics (query performance)

### Recommended Additions
- Sentry for error tracking
- Custom metrics via Workers Analytics Engine
