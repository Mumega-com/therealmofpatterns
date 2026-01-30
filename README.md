# The Realm of Patterns

**Cosmic Identity Cartography — 100% Cloudflare Native**

```
     μ₁ · μ₂ · μ₃ · μ₄ · μ₅ · μ₆ · μ₇ · μ₈
      P    E    μ    V    N    Δ    R    Φ
```

---

## Overview

A system for mapping cosmic identity through mathematical patterns. Using astronomical calculations and the FRC 16D vector framework, we compute your unique 8-dimensional signature based on planetary positions at your birth moment.

**The algorithm is open. The transformation is yours.**

| | |
|---|---|
| **Live** | [therealmofpatterns.pages.dev](https://therealmofpatterns.pages.dev) |
| **Stack** | 100% Cloudflare (Pages, Workers, D1, R2, KV, Workers AI) |
| **Payments** | Stripe |
| **License** | MIT |

---

## Architecture

This app runs entirely on Cloudflare's free tier — no external servers required.

```
┌─────────────────────────────────────────────────────────────────┐
│              THE REALM OF PATTERNS - CLOUDFLARE NATIVE          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌─────────────────────┐                      │
│                    │   Cloudflare Pages  │                      │
│                    │  (Static Frontend)  │                      │
│                    └──────────┬──────────┘                      │
│                               │                                 │
│              ┌────────────────┼────────────────┐                │
│              ▼                ▼                ▼                │
│    ┌─────────────────────────────────────────────────┐          │
│    │              Pages Functions (API)              │          │
│    ├─────────────────────────────────────────────────┤          │
│    │  /api/preview     → Free 16D preview            │          │
│    │  /api/compute     → Full 16D + figure matching  │          │
│    │  /api/checkout    → Stripe payment session      │          │
│    │  /api/webhook     → Stripe webhook handler      │          │
│    │  /api/report      → Generate PDF report         │          │
│    │  /api/share       → Post to social media        │          │
│    └─────────────────────────────────────────────────┘          │
│                               │                                 │
│       ┌───────────────────────┼───────────────────────┐         │
│       ▼                       ▼                       ▼         │
│  ┌─────────┐            ┌─────────┐            ┌─────────┐      │
│  │   D1    │            │   R2    │            │   KV    │      │
│  │ SQLite  │            │ Storage │            │  Cache  │      │
│  ├─────────┤            ├─────────┤            ├─────────┤      │
│  │• users  │            │• PDFs   │            │• sessions│     │
│  │• figures│            │• images │            │• tokens  │     │
│  │• reports│            │• art    │            │• limits  │     │
│  │• orders │            │         │            │          │     │
│  └─────────┘            └─────────┘            └─────────┘      │
│                               │                                 │
│                               ▼                                 │
│                    ┌─────────────────────┐                      │
│                    │    Workers AI       │                      │
│                    ├─────────────────────┤                      │
│                    │ • Text generation   │                      │
│                    │ • Image generation  │                      │
│                    │ • Embeddings        │                      │
│                    └─────────────────────┘                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    EXTERNAL API CALLS                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Stripe  │  │ Twitter  │  │ Telegram │  │ Discord  │         │
│  │ Payments │  │   API    │  │ Bot API  │  │ Webhook  │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

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

## The 8 Dimensions (Mu)

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

---

## Product Tiers

### Free Preview
- Your dominant dimension
- Primary archetype match
- One historical figure
- Basic 8D vector

### Premium Report ($497)
- 40+ page luxury PDF
- Full 16D vector analysis
- 10 historical figure matches
- AI-generated sacred art
- Shadow work guidance
- Daily practices
- Downloadable identity token

### Complete Bundle ($697)
- Everything in Premium
- 18×24" Art Print
- Hardcover Booklet
- Priority Processing

---

## Project Structure

```
therealmofpatterns/
├── public/                      # Static frontend
│   └── index.html
├── functions/                   # Cloudflare Pages Functions
│   └── api/
│       ├── preview.ts           # Free preview endpoint
│       ├── compute.ts           # Full 16D computation
│       ├── checkout.ts          # Stripe checkout
│       ├── webhook.ts           # Stripe webhooks
│       ├── report.ts            # PDF generation
│       └── share.ts             # Social media posting
├── src/
│   ├── lib/
│   │   ├── 16d-engine.ts        # Core 16D calculation
│   │   ├── historical-figures.ts # Figure matching
│   │   ├── pdf-generator.ts     # jsPDF report generation
│   │   └── ai.ts                # Workers AI wrapper
│   ├── db/
│   │   └── schema.sql           # D1 database schema
│   └── types/
│       └── index.ts             # TypeScript types
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── 16D-MATH.md
├── wrangler.toml                # Cloudflare configuration
├── package.json
└── tsconfig.json
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

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/preview` | Generate free 8D preview |
| GET | `/api/weather` | Current cosmic weather |

### Authenticated (requires payment)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/compute` | Full 16D computation |
| POST | `/api/checkout` | Create Stripe session |
| POST | `/api/webhook` | Stripe webhook handler |
| GET | `/api/report/:id` | Download PDF report |
| POST | `/api/share` | Share to social media |

---

## The Math

**16D Vector Computation:**
```
U = [μ₁, μ₂, μ₃, μ₄, μ₅, μ₆, μ₇, μ₈]

For each dimension:
μᵢ = Σⱼ (ωⱼ × aⱼ × Wⱼᵢ)

Where:
- ωⱼ = planet weight (luminaries > personal > outer)
- aⱼ = activation(planetⱼ position)
- Wⱼᵢ = planet-to-dimension mapping weight
```

**Activation Function:**
```
a(θ) = (cos(θ) + 1) / 2

Where θ = ecliptic longitude in radians
```

**Resonance (Cosine Similarity):**
```
ρ = (U₁ · U₂) / (||U₁|| × ||U₂||)
```

See [docs/16D-MATH.md](docs/16D-MATH.md) for complete mathematical specification.

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
