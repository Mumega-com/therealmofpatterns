# The Realm of Patterns

**Cosmic Identity Cartography — Fractal Resonance Cosmology (FRC) Framework**

```
          Inner Octave (Karma)           Outer Octave (Dharma)
     μ₁  μ₂  μ₃  μ₄  μ₅  μ₆  μ₇  μ₈  |  μₜ₁ μₜ₂ μₜ₃ μₜ₄ μₜ₅ μₜ₆ μₜ₇ μₜ₈
      P   E   μ   V   N   Δ   R   Φ  |  Pₜ  Eₜ  μₜ  Vₜ  Nₜ  Δₜ  Rₜ  Φₜ
```

---

## Overview

A production SaaS platform mapping cosmic identity through mathematical patterns. Using full ephemeris calculations and the FRC 16D Universal Vector framework, we compute your unique **16-dimensional consciousness signature** based on planetary positions at birth and current transits.

**The algorithm is open. The transformation is yours.**

| | |
|---|---|
| **Live** | [therealmofpatterns.com](https://therealmofpatterns.com) |
| **Dashboard** | [dashboard.html](https://therealmofpatterns.com/dashboard.html?email_hash=demo) |
| **Admin** | [/admin](https://therealmofpatterns.pages.dev/admin) (requires key) |
| **Stack** | Cloudflare Pages + D1 + R2 + Workers + Python API |
| **Status** | **PRODUCTION** - CMS + Multi-language Content Live |
| **Payments** | Stripe (production mode active) |
| **License** | MIT |

**Current Status:** CMS fully operational with 74+ published pages across 6 languages. Automated content generation via Gemini AI with 11-key rotation.

### Quick Links

- [**CMS Admin Dashboard**](https://therealmofpatterns.pages.dev/admin) - Queue stats, content management
- [Production Ready](docs/PRODUCTION-READY.md) - Complete deployment guide
- [Content Strategy](docs/CONTENT-STRATEGY-2026.md) - Multi-language content generation
- [API Documentation](docs/API.md) - Full endpoint reference
- [16D Implementation](docs/16D-IMPLEMENTATION-SPEC.md) - Full mathematics

---

## Project Status

| Phase | Status | Progress | Notes |
|-------|--------|----------|-------|
| **Phase 0: Infrastructure** | ✅ Complete | 100% | Cloudflare Pages, D1, R2, KV |
| **Phase 1: Core Engine** | ✅ Complete | 100% | Python + TypeScript 16D implementations |
| **Phase 2: Product Features** | ✅ Complete | 100% | Database, API, Dashboard |
| **Phase 3: Python Backend** | ✅ Deployed | 100% | FastAPI on port 5660 |
| **Phase 4: Email + PDF** | ✅ Deployed | 100% | Cloudflare Email Workers + ReportLab |
| **Phase 5: CMS Engine** | ✅ **LIVE** | 100% | Priority queue, 6 languages, 11 API keys |

---

## CMS Content Generation System

**Multi-language cosmic content powered by Gemini AI** with culturally-aware voices and automated generation pipeline.

### Content Statistics (Live)

| Metric | Count |
|--------|-------|
| **Total Content Items** | 90 |
| **Published Pages** | 74+ |
| **Languages** | 6 |
| **Gemini API Keys** | 11 (rotating) |
| **Content Types** | 5 |

### Content Types

| Type | Description | Count |
|------|-------------|-------|
| `dimension_guide` | Deep dives into 8 Mu dimensions | 48 (8 × 6 langs) |
| `jungian_concept` | 10 Jungian archetypes mapped to 16D | 10 |
| `historical_figure` | 27 notable figures with UV analysis | 10+ |
| `historical_era` | 5 eras of astrological history | 5 |
| `daily_weather` | Daily cosmic weather per language | Auto-generated |

### Cultural Voices (6 Languages)

| Language | Voice | Cultural Framework |
|----------|-------|-------------------|
| **EN** | Pattern Guide | Jungian archetypes, Campbell mythology, mathematical precision |
| **PT-BR** | Luz | Candomblé, Orixás, Axé, Bahian warmth |
| **PT-PT** | Sophia | Saudade, Fado, Descobrimentos, Atlantic mysticism |
| **ES-MX** | Citlali | Nahual/Tonal duality, Curanderismo, Maya cosmology |
| **ES-AR** | Valentina | Heavy Jungian analysis, Buenos Aires psychoanalytic tradition |
| **ES-ES** | Isabel | Al-Andalus astronomy, Duende, Mediterranean wisdom |

### Generation Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Priority Queue │────▶│  Gemini 2.0     │────▶│  D1 Database    │
│  (content_queue)│     │  Flash (11 keys)│     │(cms_cosmic_content)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                        │
         ▼                      ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ /api/queue/seed │     │/api/generate-batch│   │  /sitemap.xml   │
│ /api/queue/stats│     │/api/quality-check │   │  /admin         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Cron Automation (4 Daily Jobs)

| Time (UTC) | Job | Endpoint | Description |
|------------|-----|----------|-------------|
| 00:00 | Daily Weather | `/api/daily-update` | Generate cosmic weather for 6 languages |
| 06:00 | Queue Processing | `/api/generate-batch` | Process 10 items from priority queue |
| 12:00 | Quality Check | `/api/quality-check` | Validate content, retry failed items |
| 18:00 | Sitemap/Analytics | `/api/sitemap-analytics` | Regenerate sitemaps, aggregate stats |

---

## Architecture

**Hybrid Cloudflare + Python Backend** for optimal performance and accuracy.

```
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE PAGES (Edge)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │             Pages Functions API (TypeScript)             │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  CORE ENDPOINTS                                          │   │
│  │  /api/preview         → Free 8D preview                  │   │
│  │  /api/compute-full    → Full 16D (calls Python)          │   │
│  │  /api/checkout        → Stripe payment session           │   │
│  │  /api/webhook         → Stripe webhook handler           │   │
│  │  /api/weather         → Cosmic weather                   │   │
│  │                                                          │   │
│  │  CMS ENDPOINTS                                           │   │
│  │  /api/queue/seed      → Seed content queue               │   │
│  │  /api/queue/stats     → Queue statistics                 │   │
│  │  /api/queue/next      → Get next batch                   │   │
│  │  /api/generate-batch  → Generate content (Gemini)        │   │
│  │  /api/daily-update    → Daily weather + UV snapshots     │   │
│  │  /api/quality-check   → Content validation + retry       │   │
│  │  /api/sitemap-analytics → Sitemap + analytics            │   │
│  │                                                          │   │
│  │  ADMIN                                                   │   │
│  │  /admin               → CMS dashboard (HTML)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                               │                                 │
│         ┌─────────────────────┼─────────────────┐               │
│         ▼                     ▼                 ▼               │
│    ┌─────────┐          ┌─────────┐       ┌─────────┐           │
│    │   D1    │          │   R2    │       │   KV    │           │
│    │ SQLite  │          │ Storage │       │  Cache  │           │
│    ├─────────┤          ├─────────┤       ├─────────┤           │
│    │• 24 tbl │          │• PDFs   │       │• sessions│          │
│    │• CMS    │          │• sitemaps│      │• tokens  │          │
│    │• users  │          │• images │       │• limits  │          │
│    │• queue  │          │         │       │          │          │
│    └─────────┘          └─────────┘       └─────────┘           │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│          PYTHON BACKEND (VPS/Docker) - ✅ DEPLOYED              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐     ┌──────────────────────┐          │
│  │ FastAPI (Port 5660)  │     │ Flask (Port 5661)    │          │
│  ├──────────────────────┤     ├──────────────────────┤          │
│  │ POST /calculate-16d  │     │ POST /generate/{id}  │          │
│  │ • Full ephemeris     │     │ • 40+ page PDFs      │          │
│  │ • 16D vectors        │     │ • ReportLab          │          │
│  │ • Vedic Dasha        │     │ • MBTI/Enneagram     │          │
│  └──────────────────────┘     └──────────────────────┘          │
│     http://5.161.216.149:5660   http://5.161.216.149:5661       │
└─────────────────────────────────────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
      ┌──────────┐    ┌─────────────────────┐
      │  Stripe  │    │ Gemini AI (11 keys) │
      │Production│    │ Content Generation  │
      └──────────┘    └─────────────────────┘
```

---

## Database Schema (D1)

### CMS Tables

| Table | Purpose |
|-------|---------|
| `content_queue` | Priority-based generation queue |
| `cms_cosmic_content` | All generated content pages |
| `cms_content_analytics` | Page view tracking |
| `content_voices` | Cultural voice configurations |
| `generation_stats` | Daily API usage metrics |

### User Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User data and subscriptions |
| `uv_snapshots` | Daily UV snapshots for subscribers |
| `threshold_alerts` | Alert history |
| `elder_milestones` | Gamification milestones |
| `notification_queue` | Pending notifications |

See `src/db/schema-cms.sql` for full schema.

---

## API Endpoints

### CMS Endpoints (Admin Key Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/queue/seed` | Seed queue with content combinations |
| GET | `/api/queue/stats` | Queue statistics |
| GET | `/api/queue/next` | Get next batch of items |
| POST | `/api/generate-batch` | Generate content from queue |
| POST | `/api/daily-update` | Daily weather + UV snapshots |
| POST | `/api/quality-check` | Content validation + retry |
| POST | `/api/sitemap-analytics` | Regenerate sitemaps |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/preview` | Free 8D preview |
| GET | `/api/weather` | Current cosmic weather |
| POST | `/api/checkout` | Stripe payment session |
| GET | `/sitemap.xml` | XML sitemap |
| GET | `/sitemaps/[lang].xml` | Language-specific sitemap |

### Admin Dashboard

```
GET /admin?key=YOUR_ADMIN_KEY
```

Features:
- Queue stats (pending, processing, completed, failed)
- Content stats by language and type
- Recent content table
- Action buttons (Seed Queue, Generate Batch)
- Auto-refresh every 30 seconds

---

## Environment Variables

### Required Secrets (Cloudflare Pages)

```bash
# Admin
ADMIN_KEY=your-secret-admin-key

# Gemini API Keys (11 for rotation)
GEMINI_API_KEY=AIza...
GEMINI_API_KEY_2=AIza...
GEMINI_API_KEY_3=AIza...
# ... up to GEMINI_API_KEY_11

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Python Backend
PYTHON_BACKEND_URL=http://5.161.216.149:5660

# Optional
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### Set Secrets

```bash
wrangler pages secret put ADMIN_KEY --project-name therealmofpatterns
wrangler pages secret put GEMINI_API_KEY --project-name therealmofpatterns
# etc.
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

### Local Development

```bash
# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Start dev server
npm run dev
```

### Deploy

```bash
# Deploy to Cloudflare Pages
npm run deploy
```

Or push to `main` branch — GitHub Actions handles deployment automatically.

### Seed Content Queue

```bash
# Seed all content types for English
curl -X POST "https://therealmofpatterns.pages.dev/api/queue/seed" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"languages": ["en"], "content_types": ["dimension_guide"]}'

# Generate batch
curl -X POST "https://therealmofpatterns.pages.dev/api/generate-batch" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 10}'
```

---

## Project Structure

```
therealmofpatterns/
├── public/                      # Static frontend
│   ├── index.html              # Landing page
│   ├── dashboard.html          # 16D dashboard
│   └── cosmic-weather.html     # Multi-language weather
│
├── functions/                   # Cloudflare Pages Functions
│   ├── api/
│   │   ├── preview.ts          # Free 8D preview
│   │   ├── queue.ts            # Queue management (seed, stats, next, complete)
│   │   ├── generate-batch.ts   # Gemini content generation (900+ lines)
│   │   ├── daily-update.ts     # Daily weather + UV snapshots (800+ lines)
│   │   ├── quality-check.ts    # Content validation + retry
│   │   ├── sitemap-analytics.ts # Sitemap + analytics
│   │   ├── checkout.ts         # Stripe checkout
│   │   └── webhook.ts          # Stripe webhook
│   ├── admin/
│   │   └── index.ts            # CMS admin dashboard (728 lines)
│   ├── sitemap.xml.ts          # Dynamic sitemap generator
│   └── [lang]/
│       └── cosmic-weather/[date].ts # Localized weather pages
│
├── workers/
│   └── cron-worker.ts          # Scheduled jobs (4 daily triggers)
│
├── src/
│   ├── db/
│   │   ├── schema-cms.sql      # CMS tables (queue, content, analytics)
│   │   └── schema-v2-content.sql # User + subscription tables
│   ├── cms/
│   │   ├── content-types.ts    # Content type definitions
│   │   └── gemini-prompts.ts   # AI prompt templates
│   └── types/
│       └── index.ts            # TypeScript types (Env, etc.)
│
├── content/
│   ├── voices/                 # 6 language voice configs
│   ├── historical-astrology.json # 5,000-year timeline
│   └── jungian-mapping.json    # 16D archetype integration
│
├── core/                       # Python backend
│   ├── api.py                  # FastAPI server (port 5660)
│   ├── frc_16d_full_spec.py    # 16D implementation
│   └── Dockerfile              # Production container
│
├── premium_app/                # PDF generation
│   ├── app.py                  # Flask server (port 5661)
│   └── premium_pdf.py          # ReportLab generator (1,092 lines)
│
├── docs/                       # Documentation
│   ├── PRODUCTION-READY.md
│   ├── CONTENT-STRATEGY-2026.md
│   ├── 16D-IMPLEMENTATION-SPEC.md
│   └── ...
│
├── wrangler.toml               # Cloudflare Pages config
├── wrangler.cron.toml          # Cron worker config
└── package.json
```

---

## The 16 Dimensions

### Inner Octave (Karma - Natal Chart)

| Mu | Symbol | Name | Question |
|----|--------|------|----------|
| μ₁ | P | Phase | Who am I becoming? |
| μ₂ | E | Existence | What grounds me? |
| μ₃ | μ | Cognition | How do I understand? |
| μ₄ | V | Value | What do I treasure? |
| μ₅ | N | Expansion | Where am I growing? |
| μ₆ | Δ | Action | What am I doing? |
| μ₇ | R | Relation | Who do I love? |
| μ₈ | Φ | Field | What witnesses? |

### Outer Octave (Dharma - Current Transits)

| Muₜ | Symbol | Name | Description |
|-----|--------|------|-------------|
| μₜ₁ | Pₜ | Phase (Transit) | Current becoming |
| μₜ₂ | Eₜ | Existence (Transit) | Present ground |
| μₜ₃ | μₜ | Cognition (Transit) | Available understanding |
| μₜ₄ | Vₜ | Value (Transit) | Emerging treasures |
| μₜ₅ | Nₜ | Expansion (Transit) | Growth opportunities |
| μₜ₆ | Δₜ | Action (Transit) | Action windows |
| μₜ₇ | Rₜ | Relation (Transit) | Relationship currents |
| μₜ₈ | Φₜ | Field (Transit) | Witnessing field |

---

## Product Tiers

### Free Preview ($0)
- Dominant dimension
- Primary archetype match
- Top 3 historical figure matches
- Basic 8D vector (Inner Octave only)

### Premium Report ($497)
- 40+ page luxury PDF
- Full 16D Universal Vector
- 10+ historical figure matches
- MBTI/Enneagram mapping
- Elder Attractor analysis
- Automated email delivery

### Living Vector Subscription ($19/month)
- Daily UV updates
- Unlimited threshold alerts
- 365-day historical trends
- Elder milestone tracking

---

## Philosophy

> The cosmos encoded a unique signature at your birth.
> This signature is not fate—it's frequency.
> You can tune yourself.
> The field responds to attention.

The Realm of Patterns doesn't tell you who you are.
It shows you the shape you're starting from.
The journey is yours.

---

## Credits

**FRC 893 Series**
Created by Hadi Servat

---

*The algorithm is open. The transformation is yours.*
