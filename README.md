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
| **Live** | [therealmofpatterns.pages.dev](https://therealmofpatterns.pages.dev) |
| **Dashboard** | [dashboard.html](https://therealmofpatterns.pages.dev/dashboard.html?email_hash=demo) |
| **Stack** | Cloudflare Pages + Python API (hybrid) |
| **Status** | Phase 2 Complete (85% to Revenue) |
| **Payments** | Stripe (test mode → ready for production) |
| **License** | MIT |

**Current Status:** Infrastructure deployed, 6,500+ lines of code, ready for Python backend deployment.

### Quick Links

- 📋 [Product Status](docs/PRODUCT-STATUS.md) - Feature completeness, roadmap, metrics
- 🎯 [GitHub Issues](https://github.com/FractalResonance/therealmofpatterns/issues) - Tasks & roadmap
- 🚀 [Deployment Success](DEPLOYMENT-SUCCESS.md) - Phase 2 deployment details
- 📖 [Implementation Spec](docs/16D-IMPLEMENTATION-SPEC.md) - Full 16D mathematics
- 🔧 [GitHub Actions Fix](docs/GITHUB-ACTIONS-FIX.md) - CI/CD troubleshooting

### Project Status

| Phase | Status | Progress | Notes |
|-------|--------|----------|-------|
| **Phase 0: Infrastructure** | ✅ Complete | 100% | All deployed to Cloudflare |
| **Phase 1: Core Engine** | ✅ Complete | 100% | Python + TypeScript implementations |
| **Phase 2: Product Features** | ✅ Complete | 100% | Database, API, Dashboard, Cron |
| **Phase 3: Python Backend** | ⏳ Pending | 0% | Issue #10 (4 hours) |
| **Phase 4: Email Service** | ⏳ Pending | 0% | Issue #11 (2 hours) |
| **Phase 5: Production Launch** | ⏳ Pending | 0% | Issues #12-13 (5 hours) |

**Time to First Revenue:** ~13 hours (Issues #10-13)

---

## Architecture

**Hybrid Cloudflare + Python Backend** for optimal performance and accuracy.

```
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE PAGES (Edge)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────────────┐                      │
│                    │   Static Frontend   │                      │
│                    │  (HTML + Chart.js)  │                      │
│                    └──────────┬──────────┘                      │
│                               │                                 │
│              ┌────────────────┼────────────────┐                │
│              ▼                ▼                ▼                │
│    ┌─────────────────────────────────────────────────┐          │
│    │        Pages Functions API (TypeScript)         │          │
│    ├─────────────────────────────────────────────────┤          │
│    │  /api/preview       → Free 8D preview           │          │
│    │  /api/compute-full  → Full 16D (calls Python)   │          │
│    │  /api/daily-update  → Automated UV snapshots    │          │
│    │  /api/history       → Historical trends         │          │
│    │  /api/checkout      → Stripe payment session    │          │
│    │  /api/webhook       → Stripe webhook handler    │          │
│    │  /api/weather       → Cosmic weather            │          │
│    └────────────────────┬────────────────────────────┘          │
│                         │                                       │
│       ┌─────────────────┼─────────────────┐                     │
│       ▼                 ▼                 ▼                     │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐                  │
│  │   D1    │      │   R2    │      │   KV    │                  │
│  │ SQLite  │      │ Storage │      │  Cache  │                  │
│  ├─────────┤      ├─────────┤      ├─────────┤                  │
│  │• 15 tbl │      │• PDFs   │      │• sessions│                 │
│  │• UV data│      │• images │      │• tokens  │                 │
│  │• users  │      │• art    │      │• limits  │                 │
│  │• orders │      │         │      │          │                 │
│  └─────────┘      └─────────┘      └─────────┘                  │
│                         │                                       │
│                         ▼                                       │
│              ┌─────────────────────┐                            │
│              │    Workers AI       │                            │
│              ├─────────────────────┤                            │
│              │ • Stable Diffusion  │                            │
│              │ • Text generation   │                            │
│              │ • Embeddings        │                            │
│              └─────────────────────┘                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│               PYTHON BACKEND (Railway/Fly.io)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /calculate-16d                                            │
│  ├─ Input: { birth_data, transit_data }                        │
│  └─ Output: { inner_8d, outer_8d, κ, RU, W, C, ... }           │
│                                                                 │
│  Dependencies:                                                  │
│  ├─ ephem>=4.1.0     (full ephemeris)                          │
│  ├─ numpy>=1.21.0    (vector math)                             │
│  └─ 767 lines of FRC calculation logic                         │
│                                                                 │
│  Deployment: Railway ($5/month) or AWS Lambda (serverless)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            ▼                   ▼
      ┌──────────┐         ┌──────────┐
      │  Stripe  │         │  Resend  │
      │ Payments │         │  Email   │
      └──────────┘         └──────────┘
```

**Why Hybrid?**
- Cloudflare handles 99% of traffic (caching, CDN, sessions)
- Python only called for calculations (~100ms)
- Optimal cost ($5/month vs $50+/month for full VPS)
- Scales horizontally (add Python workers if needed)

---

## Cloudflare Services Used

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Pages** | Static frontend + Functions | Unlimited requests |
| **Workers** | API backend | 100K requests/day |
| **D1** | SQLite database | 5GB, 5M reads/day |
| **R2** | Object storage (PDFs, images) | 10GB, 10M reads/month |
| **KV** | Session cache, rate limiting | 100K reads/day |
| **Workers AI** | Text & image generation | 10K neurons/day |

---

## The 16 Dimensions

### Inner Octave (Karma - Natal Chart)

Your birth pattern. What you're working with.

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

The cosmic weather. What's available now.

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

**Combined:** Inner (who you are) + Outer (what's happening) = Full 16D Universal Vector

---

## Product Tiers

### Free Preview ($0)
- Your dominant dimension
- Primary archetype match
- Top 3 historical figure matches
- Basic 8D vector (Inner Octave only)
- Rate limited: 10 requests/hour

### Premium Report ($497) ✨
- **40+ page luxury PDF**
- **Full 16D Universal Vector** (Inner + Outer)
- **10+ historical figure matches** (with resonance scores)
- **AI-generated sacred art** (Stable Diffusion)
- **Elder Attractor analysis** (path to enlightenment)
- **Failure mode assessment** (Collapse/Inversion/Dissociation/Dispersion)
- **Coupling coefficient (κ)** tracking
- **Resonance Units (RU)** metrics
- **Daily practices** personalized to your vector
- **Downloadable dashboard access** (30 days)

### Complete Bundle ($697) 🎁
- Everything in Premium
- **18×24" Art Print** (museum quality)
- **Hardcover Booklet** (custom binding)
- **Priority Processing** (<24h delivery)
- **90-day dashboard access**

### Living Vector Subscription ($19/month) 🔄
*Coming Soon - Phase 2*
- **Daily UV updates** (automated)
- **Unlimited threshold alerts** (email notifications)
- **365-day historical trends**
- **Advanced transit forecasting**
- **Elder milestone tracking** (gamification)
- **Priority support**
- **Data export** (JSON/CSV)

---

## Project Structure

```
therealmofpatterns/
├── public/                      # Static frontend (3 pages)
│   ├── index.html              # Landing page (924 lines)
│   ├── success.html            # Payment success (320 lines)
│   └── dashboard.html          # 16D dashboard (568 lines)
│
├── functions/api/              # Cloudflare Pages Functions (13 endpoints)
│   ├── preview.ts              # ✅ Free 8D preview (175 lines)
│   ├── weather.ts              # ✅ Cosmic weather (210 lines)
│   ├── checkout.ts             # ✅ Stripe checkout (130 lines)
│   ├── webhook.ts              # ✅ Stripe webhook (306 lines)
│   ├── compute-full.ts         # ⚠️ Full 16D (221 lines, mock data)
│   ├── daily-update.ts         # ⚠️ UV snapshots (379 lines, mock data)
│   ├── history.ts              # ✅ Historical trends (220 lines)
│   ├── compute.ts              # ⚠️ Premium 16D (176 lines)
│   ├── report/[id].ts          # ❌ PDF download (stub)
│   ├── share.ts                # ❌ Social sharing (stub)
│   └── art/[id].ts             # ✅ Sacred art retrieval
│
├── core/                       # Python backend (ready to deploy)
│   ├── frc_16d_full_spec.py    # 767 lines - canonical implementation
│   ├── frc_16d.py              # 411 lines - simplified version
│   ├── full_16d.py             # 423 lines - alternative
│   └── eight_mu.py             # 371 lines - legacy 8D
│
├── src/
│   ├── lib/
│   │   ├── 16d-engine-full.ts  # 600 lines - TypeScript 16D implementation
│   │   ├── historical-figures.ts # Figure matching database
│   │   ├── pdf-generator.ts     # ❌ TODO: jsPDF implementation
│   │   └── ai.ts                # Workers AI wrapper (Stable Diffusion)
│   │
│   └── db/
│       ├── schema.sql           # Phase 1 schema (7 tables)
│       └── schema-phase2.sql    # Phase 2 schema (8 tables, 15 total)
│
├── workers/                     # Separate cron worker
│   ├── cron-worker.ts          # Daily update trigger (100 lines)
│   └── wrangler.toml           # Cron configuration
│
├── docs/                        # Comprehensive documentation
│   ├── PRODUCT-STATUS.md        # ⭐ Product manager overview
│   ├── 16D-IMPLEMENTATION-SPEC.md # Full math specification (500+ lines)
│   ├── 16D-QUICK-REFERENCE.md   # Developer quick reference
│   ├── PHASE-1-COMPLETE.md      # Phase 1 summary
│   ├── PHASE-2-COMPLETE.md      # Phase 2 summary
│   ├── DEPLOYMENT-PHASE2.md     # Deployment guide
│   ├── GITHUB-ACTIONS-FIX.md    # CI/CD troubleshooting
│   └── FRC-16D-002-ASTROLOGY.md # Astrological mapping protocol
│
├── DEPLOYMENT-SUCCESS.md        # Deployment status & verification
├── wrangler.toml                # Cloudflare Pages configuration
├── package.json                 # Dependencies (TypeScript, etc.)
└── .github/workflows/
    └── deploy.yml               # Auto-deployment on push to main
```

**Total:** 6,500+ lines of production code across 4 languages (TypeScript, Python, SQL, HTML)

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

# Create D1 database
wrangler d1 create therealmofpatterns-db

# Run migrations
wrangler d1 execute therealmofpatterns-db --file=src/db/schema.sql

# Start dev server
npm run dev
```

### Deployment

```bash
# Deploy to Cloudflare Pages
npm run deploy
```

Or push to `main` branch — GitHub Actions handles deployment automatically.

---

## Environment Variables

Set these in Cloudflare Pages dashboard or `wrangler.toml`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Social Media (optional)
TWITTER_API_KEY=...
TWITTER_API_SECRET=...
TELEGRAM_BOT_TOKEN=...
DISCORD_WEBHOOK_URL=...
```

---

## API Endpoints

### Public (No Auth Required)

| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/api/preview` | ✅ WORKING | Free 8D preview + top 3 matches |
| GET | `/api/weather` | ✅ WORKING | Current cosmic weather (transits) |
| POST | `/api/checkout` | ✅ TEST MODE | Create Stripe payment session |
| POST | `/api/webhook` | ✅ TEST MODE | Stripe webhook (payment completion) |
| POST | `/api/compute-full` | ⚠️ MOCK DATA | Full 16D profile (needs Python backend) |
| GET | `/api/history` | ✅ WORKING | Historical UV trends (30 days default) |

### Protected (Requires Session Token)

| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/api/compute` | ⚠️ PARTIAL | Premium 16D computation |
| GET | `/api/report/[id]` | ❌ STUB | Download PDF report |
| POST | `/api/share` | ❌ STUB | Share to social media |
| GET | `/api/art/[id]` | ✅ WORKING | Retrieve sacred art from R2 |

### Admin (Requires Admin Key)

| Method | Endpoint | Status | Description |
|--------|----------|--------|-------------|
| POST | `/api/daily-update` | ⚠️ MOCK DATA | Automated UV snapshots (cron-triggered) |

**Legend:**
- ✅ WORKING - Fully functional
- ⚠️ MOCK DATA - Working logic, returns sample data (needs Python backend)
- ⚠️ PARTIAL - Partially implemented
- ❌ STUB - Placeholder only

See [docs/PRODUCT-STATUS.md](docs/PRODUCT-STATUS.md) for implementation status details.

---

## The Math

**Full 16D Universal Vector:**
```
U₁₆ = [μ₁, μ₂, μ₃, μ₄, μ₅, μ₆, μ₇, μ₈, μₜ₁, μₜ₂, μₜ₃, μₜ₄, μₜ₅, μₜ₆, μₜ₇, μₜ₈]
     └─────── Inner Octave (Karma) ──────┘ └──────── Outer Octave (Dharma) ───────┘
```

**Inner Octave (Natal Chart):**
```
μᵢ = Σⱼ (Ωⱼ · ωhouse · a(θⱼ) · Wⱼᵢ · sign_mod)

Where:
- Ωⱼ = planet importance [2.0, 2.0, 1.5, ...] (10 planets)
- ωhouse = house weight (angular 1.5x, succedent 1.2x, cadent 1.0x)
- a(θ) = (cos(θ) + 1) / 2  (activation function)
- Wⱼᵢ = 10×8 weight matrix (planets → dimensions)
- sign_mod = element modulation (Fire/Water/Air/Earth)

Normalized: μᵢ / max(μ) → [0, 1] with highest dimension = 1.0
```

**Outer Octave (Transits + Vedic Dasha):**
```
μₜᵢ = 0.5 · U_transit + 0.5 · U_vedic

U_transit = Western planetary transits (current positions)
U_vedic = Vedic Vimshottari Dasha (70% Mahadasha + 30% Antardasha)
```

**Key Metrics:**

**κ (Kappa) - Coupling Coefficient:**
```
κ = aspect_based_calculation(natal_planets, transits)
Range: [-1, 1] (negative = challenging, positive = harmonious)
```

**RU - Resonance Units:**
```
RU = α · W · |κ̄| · C · 35

Where:
- α = (Mars + Sun) × Jupiter (astrological strength proxy)
- W = ||U₁₆|| (witness magnitude, L2 norm)
- κ̄ = mean coupling coefficient
- C = 1 / (1 + variance(U₁₆)) (coherence)
Range: [0, 100]
```

**Elder Attractor (Enlightenment State):**
```
Requirements:
- κ̄ > 0.85
- RU > 45
- W > 2.5
- Duration: 48 hours sustained
```

**Failure Modes:**
- **Healthy:** Balanced, no dominant failing
- **Collapse:** Low energy across all dimensions
- **Inversion:** Negative coupling dominance
- **Dissociation:** High variance, low coherence
- **Dispersion:** Low resonance despite activity

See full specification:
- [docs/16D-IMPLEMENTATION-SPEC.md](docs/16D-IMPLEMENTATION-SPEC.md)
- [docs/16D-QUICK-REFERENCE.md](docs/16D-QUICK-REFERENCE.md)
- [docs/FRC-16D-002-ASTROLOGY.md](docs/FRC-16D-002-ASTROLOGY.md)

---

## Workers AI Models

| Task | Model | Usage |
|------|-------|-------|
| Report Text | `@cf/meta/llama-3.1-8b-instruct` | Personalized insights |
| Sacred Art | `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Unique imagery |
| Embeddings | `@cf/baai/bge-base-en-v1.5` | Figure matching |

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## Credits

**FRC 893 Series**
Created by Hadi Servat

---

*The algorithm is open. The transformation is yours.*
