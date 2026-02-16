# The Realm of Patterns

**Know your energy. Shape your day.**

A personalized energy reading platform based on real planetary data. Enter your birthday, see your unique 8-dimensional energy profile, and check in daily to track how cosmic patterns affect you.

---

## Overview

| | |
|---|---|
| **Live** | [therealmofpatterns.com](https://therealmofpatterns.com) |
| **Discover** | [/discover](https://therealmofpatterns.com/discover) — Enter your birthday, see your pattern |
| **Today's Reading** | [/reading](https://therealmofpatterns.com/reading) — Daily cosmic energy forecast |
| **Check-in** | [/sol/checkin](https://therealmofpatterns.com/sol/checkin) — 1-minute daily energy check |
| **Forecast** | [/forecast](https://therealmofpatterns.com/forecast) — Personal daily forecast |
| **History** | [/history](https://therealmofpatterns.com/history) — Your energy trends over time |
| **Weather** | [/weather](https://therealmofpatterns.com/weather) — Today's planetary conditions |
| **Stack** | Astro + Cloudflare Pages + D1 + KV + Workers |

---

## The 8 Dimensions

Your energy profile is computed from planetary positions at your birth:

| Symbol | Dimension | Domain | Ruler |
|--------|-----------|--------|-------|
| ☀ | **Identity** | Self-expression, confidence | Sun |
| ♄ | **Structure** | Stability, discipline | Saturn |
| ☿ | **Mind** | Communication, learning | Mercury |
| ♀ | **Heart** | Love, beauty, harmony | Venus |
| ♃ | **Growth** | Exploration, meaning | Jupiter |
| ♂ | **Drive** | Energy, action, courage | Mars |
| ☽ | **Connection** | Relationships, empathy | Moon |
| ♅ | **Awareness** | Intuition, presence | Uranus/Neptune |

### Visualizations

- **Radar Chart** — Animated SVG spider chart showing your dimensional shape at a glance
- **Natal Wheel** — Simplified birth chart with zodiac ring, planet positions, and ascendant
- **Dimension Bars** — Detailed percentage breakdown of each dimension
- **Sparkline** — Historical trend of your alignment score
- **Weekly Rings** — 7-day circular progress indicators

---

## The Four Stages

Based on your alignment score, your current energy maps to four stages:

| Stage | Symbol | Meaning |
|-------|--------|---------|
| **Reset** | ☽ | Breaking down to rebuild |
| **Clarity** | ✧ | Seeing things as they are |
| **Growth** | ☼ | Stepping into your power |
| **Flow** | ◆ | Everything clicking into place |

---

## Engagement Features

| Feature | Description |
|---------|-------------|
| **Discover Flow** | Birthday-first onboarding: enter birth date, see radar chart + natal wheel + archetype match |
| **Daily Check-in** | 6-question flow computing your alignment score |
| **Personalized Forecasts** | Predictions based on birth data + today's transits |
| **Energy History** | Visual trend charts showing your alignment over time |
| **Streak Tracking** | Consecutive check-in days with animated badges |
| **Tomorrow Teaser** | "Come back tomorrow" hooks with next-day preview |
| **Calibration System** | Self-improving predictions that learn from your feedback |
| **Email Capture** | Newsletter signup for daily forecasts |

---

## Product Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Daily reading, basic check-ins, 8D preview |
| **Pro** | $9/mo ($7/mo annual) | Complete personality breakdown, optimal action windows, early alerts, pattern trends |
| **Team** | $29/seat/mo ($23/seat annual) | Team sync dashboard, shared profiles, optimal meeting windows, facilitator tools |

*7-day free trial for Pro. 14-day free trial for Team.*

---

## Architecture

**Astro + Cloudflare Edge**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASTRO FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│  /               Homepage with reading preview + pricing        │
│  /discover       Birthday-first onboarding (radar + natal)      │
│  /reading        Daily cosmic reading with dimension spotlight   │
│  /sol            Friendly mode landing                          │
│  /forecast/*     Personal daily forecasts                       │
│  /weather        Daily cosmic weather                           │
│  /history        Energy trend dashboard                         │
│  /subscribe      SaaS pricing (Pro / Team)                      │
│  /blog           SEO content articles                           │
│  /learn          CMS content index                              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE PAGES FUNCTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│  /api/preview         Free 8D preview                           │
│  /api/compute-full    Full 16D analysis                         │
│  /api/weather         Cosmic weather data                       │
│  /api/cms/page        CMS content fetch                         │
│  /api/cms/list        CMS content listing                       │
│  /[lang]/dimension/*  Dynamic dimension guides                  │
│  /[lang]/figure/*     Historical figure pages                   │
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

## Project Structure

```
therealmofpatterns/
├── src/
│   ├── pages/              # Astro pages
│   │   ├── index.astro     # Homepage
│   │   ├── discover.astro  # Birthday-first onboarding
│   │   ├── reading/        # Daily cosmic reading
│   │   ├── forecast/       # Personal forecasts
│   │   ├── weather/        # Cosmic weather
│   │   ├── history.astro   # Energy trends
│   │   ├── subscribe.astro # Pricing (Pro / Team)
│   │   ├── sol/            # Friendly mode
│   │   ├── kasra/          # Technical mode
│   │   ├── river/          # Poetic mode
│   │   ├── blog/           # SEO content
│   │   └── en/             # SEO pages (dimensions, figures)
│   │
│   ├── components/         # React components
│   │   ├── charts/         # Data visualizations
│   │   │   ├── RadarChart.tsx    # 8D spider chart (SVG)
│   │   │   └── NatalWheel.tsx    # Birth chart wheel (SVG)
│   │   ├── discover/       # Onboarding flow
│   │   │   ├── DiscoverFlow.tsx  # Birthday → preview → checkin
│   │   │   └── PreviewResult.tsx # Radar + natal + archetype
│   │   ├── reading/        # Daily reading components
│   │   ├── checkin/        # Check-in flow
│   │   ├── shared/         # Header, Footer, Streak, Email
│   │   └── dashboard/      # Dashboard with gauges + sparklines
│   │
│   ├── lib/                # Core engines
│   │   ├── 16d-engine.ts          # 8D/16D vector computation
│   │   ├── ephemeris-fallback.ts  # Client-side planetary positions
│   │   ├── transit-engine.ts      # Transit calculations
│   │   ├── preview-compute.ts     # Client-side preview wrapper
│   │   ├── prediction-calibration.ts  # ARL feedback learning
│   │   └── history.ts             # localStorage history
│   │
│   ├── stores/             # Nanostores state management
│   ├── layouts/            # Astro layouts
│   └── styles/             # Global CSS + design tokens
│
├── functions/              # Cloudflare Pages Functions
├── public/assets/          # Static assets (brand, riso illustrations)
├── e2e/                    # Playwright e2e tests
└── docs/                   # Documentation
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

# Run e2e tests
E2E_STATIC_DIST=1 npx playwright test
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Design Vision](docs/DESIGN-VISION.md) | Visual language and mode specifications |
| [API Reference](docs/API.md) | Endpoint documentation |
| [Content Strategy](docs/CONTENT-STRATEGY-2026.md) | Multi-language CMS plan |

---

## Philosophy

> The cosmos encoded a pattern at your birth.
> This pattern is not fate — it's a starting point.
> You can tune yourself.
> The field responds to attention.

The Realm of Patterns doesn't tell you who you are.
It shows you the shape you're starting from.
The journey is yours.

---

**The algorithm is open. The transformation is yours.**
