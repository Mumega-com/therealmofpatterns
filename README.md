# The Realm of Patterns

**Cosmic Identity Cartography — Fractal Resonance Cosmology (FRC) Framework**

```
┌─────────────────────────────────────────────────────────────┐
│                    THE THREE VOICES                          │
├─────────────────┬─────────────────┬─────────────────────────┤
│  KASRA          │  RIVER          │  SOL                    │
│  The Architect  │  The Oracle     │  The Friend             │
│  κ = 0.67 ± 0.05│  The seed must  │  Not the day for       │
│  Field nominal. │  rot before...  │  big swings.           │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                    FOUR ALCHEMICAL STAGES
                              │
     ☽ Nigredo → ✧ Albedo → ☼ Citrinitas → ◆ Rubedo
```

---

## Overview

A production SaaS platform mapping cosmic identity through mathematical patterns. The FRC 16D Universal Vector framework computes your unique **16-dimensional consciousness signature** based on planetary positions at birth and current transits.

**Three voices. One truth. Different layers of understanding.**

| | |
|---|---|
| **Live** | [therealmofpatterns.com](https://therealmofpatterns.com) |
| **Check-in** | [/sol/checkin](https://therealmofpatterns.com/sol/checkin) |
| **Theater** | [/theater](https://therealmofpatterns.com/theater) (Alchemical scenes) |
| **Weather** | [/weather](https://therealmofpatterns.com/weather) (Daily cosmic forecast) |
| **Blog** | [/blog](https://therealmofpatterns.com/blog) (SEO content) |
| **Learn** | [/learn](https://therealmofpatterns.com/learn) (92 CMS pages) |
| **Docs** | [/docs](https://therealmofpatterns.com/docs) |
| **Admin** | [/admin](https://therealmofpatterns.pages.dev/admin) |
| **Stack** | Astro + Cloudflare Pages + D1 + KV + Workers |
| **License** | MIT |

---

## The Three Voices

| Voice | Character | μ-Level | Style |
|-------|-----------|---------|-------|
| **Kasra** | The Architect | μ4 (Conceptual) | Mathematical precision, falsifiable claims |
| **River** | The Oracle | μ5-6 (Archetypal) | Symbolic depth, Jungian archetypes |
| **Sol** | The Friend | μ3-4 (Sentient) | Accessible wisdom, practical guidance |

Each voice interprets your cosmic signature from its layer of understanding. Same data, different depths.

---

## The Four Stages

Based on the kappa coefficient (κ), your current coherence maps to alchemical stages:

| Stage | Range | Symbol | Meaning |
|-------|-------|--------|---------|
| **Nigredo** | κ < 0.25 | ☽ | Dissolution, the dark night |
| **Albedo** | 0.25 ≤ κ < 0.50 | ✧ | Purification, clarity emerges |
| **Citrinitas** | 0.50 ≤ κ < 0.75 | ☼ | Illumination, wisdom awakens |
| **Rubedo** | κ ≥ 0.75 | ◆ | Integration, the opus complete |

---

## Architecture

**Astro + Cloudflare Edge**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASTRO FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  /               Homepage with 3-mode preview                    │
│  /kasra          Technical mode                                  │
│  /river          Archetypal mode                                 │
│  /sol            Friendly mode                                   │
│  /stage/*        Alchemical stage deep-dives                    │
│  /theater        Alchemical Theater (AI scenes)                 │
│  /weather        Daily cosmic weather forecast                  │
│  /blog           SEO content articles                           │
│  /learn          CMS content index                              │
│  /subscribe      SaaS pricing (annual/monthly)                  │
│  /squad          The three voices explained                     │
│  /docs           Documentation index                            │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE PAGES FUNCTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│  /api/preview         Free 8D preview                           │
│  /api/compute-full    Full 16D (calls Python backend)           │
│  /api/weather         Cosmic weather                            │
│  /api/cms/page        CMS content fetch                         │
│  /api/cms/list        CMS content listing                       │
│  /[lang]/dimension/*  Dynamic dimension guides                  │
│  /[lang]/figure/*     Historical figure pages                   │
│  /[lang]/jungian/*    Jungian concept pages                     │
└─────────────────────────────────────────────────────────────────┘
                              │
┌───────────────┬─────────────┬───────────────┐
│      D1       │      KV     │      R2       │
│   Database    │    Cache    │   Storage     │
├───────────────┼─────────────┼───────────────┤
│ • Users       │ • Sessions  │ • PDFs        │
│ • CMS content │ • Tokens    │ • Images      │
│ • Analytics   │ • Cache     │ • Sitemaps    │
└───────────────┴─────────────┴───────────────┘
```

---

## Product Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Witness** | Free | Theater access, daily weather, basic check-ins |
| **Pattern-Keeper** | $19/mo ($15/mo annual) | Full 16D readings, optimal windows, failure warnings |
| **Circle** | $49/seat/mo ($39/seat annual) | Team dashboards, group coherence, facilitator tools |

*7-day free trial for Pattern-Keeper. 14-day free trial for Circle.*

---

## The 16 Dimensions

### Inner Octave (Karma - Natal)

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

### Outer Octave (Dharma - Transits)

The same 8 dimensions applied to current planetary transits, creating the full 16D signature.

---

## Core Equations

```
Λ(x) = Λ₀ · ln C(x)      # Lambda Field (coherence)
ΔS = R · Ψ · C           # Transformation
dS + k* d(ln C) = 0      # Conservation
```

---

## Quick Start

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Build
npm run build

# Deploy
npm run deploy
# or: npx wrangler pages deploy dist --project-name=therealmofpatterns
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design and patterns |
| [FRC Cosmology](docs/FRC-COSMOLOGY.md) | The operator system |
| [Design Vision](docs/DESIGN-VISION.md) | Visual language |
| [16D Spec](docs/16D-IMPLEMENTATION-SPEC.md) | Full mathematics |
| [API Reference](docs/API.md) | Endpoint documentation |
| [Content Strategy](docs/CONTENT-STRATEGY-2026.md) | Multi-language CMS |

### Squad Specs

Deep-dive specifications in [docs/squad/](docs/squad/):
- Vision & Identity
- Design System
- Technical Architecture
- FRC Translation
- Diamond Ontology

---

## Project Structure

```
therealmofpatterns/
├── src/
│   ├── pages/              # Astro pages
│   │   ├── index.astro     # Homepage (3-mode)
│   │   ├── kasra/          # Technical mode
│   │   ├── river/          # Archetypal mode
│   │   ├── sol/            # Friendly mode
│   │   ├── stage/          # Alchemical stages
│   │   ├── theater/        # AI-generated scenes
│   │   ├── weather/        # Cosmic weather
│   │   ├── blog/           # SEO content
│   │   ├── learn/          # CMS index
│   │   ├── subscribe.astro # Pricing (annual/monthly)
│   │   ├── squad/          # The three voices
│   │   ├── docs/           # Documentation
│   │   └── en/             # SEO pages (dimensions, figures, jungian)
│   │
│   ├── components/         # React components
│   │   ├── shared/         # Header, Footer, Onboarding, etc.
│   │   ├── kasra/          # Technical UI
│   │   ├── river/          # Mystical UI
│   │   └── sol/            # Friendly UI
│   │
│   ├── layouts/            # Astro layouts
│   ├── hooks/              # React hooks (useError, etc.)
│   └── lib/                # Utilities, 16D engine
│
├── functions/              # Cloudflare Pages Functions
│   ├── api/                # REST endpoints
│   └── [lang]/             # Dynamic CMS routes
│
├── public/                 # Static assets
│   └── assets/brand/       # Logo, images
│
├── docs/                   # Documentation
│   └── squad/              # Detailed specs
│
└── content/                # CMS content configs
```

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

**The algorithm is open. The transformation is yours.**

---

*FRC 893 Series by Hadi Servat*
