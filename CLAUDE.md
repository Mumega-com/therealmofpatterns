# The Realm of Patterns — Agent Guide

**Last Updated:** 2026-03-14

## What This Is

A daily depth psychology practice powered by Jungian astrology. Birth data → 8D psychological vector → daily AI reading (Sol) that connects natal pattern to current transits + user's daily check-in. Live at [therealmofpatterns.com](https://therealmofpatterns.com).

**Core insight:** Sol IS a message, not a website. The daily reading belongs in DMs, Telegram, WhatsApp — wherever users already are. The website is the engine; messaging is the interface.

## Tech Stack

- **Frontend:** Astro 5 + React 19 + Tailwind + Three.js (SoulToroid)
- **Backend:** 100% Cloudflare — Pages Functions, D1, KV, R2
- **AI:** Gemini 2.0 Flash (primary, 11 API keys) → OpenAI → Workers AI fallback
- **Payments:** Stripe (not yet implemented in current product)
- **Python (optional VPS):** `core/` — Flask + astronomy-engine for heavy batch jobs

## Key Commands

```bash
npm run dev          # Local dev server
npm run build        # Astro build
npm run deploy       # Build + deploy to Cloudflare Pages
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run typecheck    # Astro check + tsc
```

## Project Structure

```
src/
├── pages/           # Astro routes (static + dynamic)
├── components/      # React islands (sol/, kasra/, river/, shared/, charts/)
├── lib/             # Core engine (16d-engine.ts, natal.ts, ephemeris.ts, narrator-*.ts)
├── stores/          # Nanostores ($mode, $stage, $forecast, $user)
├── hooks/           # React hooks
├── layouts/         # BaseLayout
├── styles/          # Global CSS
├── db/              # D1 schemas + migrations
└── types/           # TypeScript types

functions/api/       # 42 Cloudflare Pages Functions endpoints
core/                # Python ephemeris + batch engine (Docker)
content-engine/      # Content generation pipeline (Gemini)
docs/                # Architecture, strategy, specs
```

## The 8 Dimensions

| Symbol | Name | Planet | Psychology |
|--------|------|--------|-----------|
| ☀ | Identity | Sun | Core self, ego |
| ♄ | Structure | Saturn | Necessity, discipline |
| ☿ | Mind | Mercury | Attention, thought |
| ♀ | Heart | Venus | Values, beauty, relating |
| ♃ | Growth | Jupiter | Expansion, becoming |
| ♂ | Drive | Mars | Energy, action, will |
| ☽ | Connection | Moon | Bonds, empathy |
| ♅ | Awareness | Uranus/Neptune | Transcendence, witness |

## Three Voices (Only Sol is active in UI)

- **Sol** — Warm, accessible (Alan Watts + Ram Dass). Default and only active narrator.
- **Kasra** — Technical, data-driven. Removed from UI; lives in internal docs.
- **River** — Poetic, Jungian. Removed from UI; available for content generation.

## Current Product State (What's Shipped)

- 8D natal vector computation (client-side)
- Check-in → reading loop (Sol opens with user's words)
- SoulToroid 3D visualization + shareable token
- Oracle sentence, delta display, carry question
- Hero's Journey 8-stage progression
- Personalization tiers (intro → deep, based on check-in count)
- Content engine: 48 dimension guides generated, batch pipeline working
- Multi-language geo-routing (en, pt-br, pt-pt, es-mx, es-ar, es-es)

## What's NOT Shipped (Despite Docs Suggesting Otherwise)

- Stripe checkout / subscriptions
- Weekly synthesis
- Relationship compare
- Failure mode detection (code exists, not exposed)
- ARL / shadow tracking
- Telegram / messaging integration
- GHL connection

## Current Priority: Go-To-Market

See `docs/GTM-ROADMAP.md` for the phased plan. Summary:

**Phase 1 (Current):** Website polish + content automation + workflow documentation
**Phase 2 (Next):** GHL integration — contacts, pipelines, custom fields for birth data
**Phase 3:** Messaging interfaces — Telegram bot, Instagram DM, WhatsApp via GHL
**Phase 4:** Automated daily reading delivery via messaging channels
**Phase 5:** Monetization triggers + viral mechanics

## Conventions

- **Sol is the only user-facing voice.** No FRC jargon, no κ/μ symbols in UI.
- **Privacy-first:** localStorage by default. Optional email sync via magic link.
- **No prescriptive language in readings.** Never "you should." Planets as psychology.
- **Geometric scale in check-in:** ◦○◎●◉ (no emojis, no "Great!" language)
- **Keep it simple.** The product is intentionally simpler than the research docs suggest.

## Key Files for Common Tasks

| Task | Files |
|------|-------|
| Modify the 8D engine | `src/lib/16d-engine.ts` |
| Change Sol's voice | `src/lib/narrator-context.ts` |
| Add API endpoint | `functions/api/` |
| Modify check-in | `src/components/checkin/`, `src/pages/sol/checkin.astro` |
| Update database | `src/db/schema.sql`, `src/db/migration-*.sql` |
| Content generation | `content-engine/generator.py`, `functions/api/generate-batch.ts` |
| 3D visualization | `src/components/charts/SoulToroid.tsx` |

## External Systems

- **OpenClaw** (`../openclaw`): Multi-channel AI gateway. 31+ channel plugins (Telegram, WhatsApp, Discord, Signal, iMessage, Slack, etc.). Skills system for Sol reading delivery. Deployed on VPS at `gateway.mumega.com` (Docker). This is how Sol reaches users via messaging.
- **GHL (GoHighLevel):** CRM + workflow automation + social media posting. Current instance is Viamar (shipping). TROP needs its own sub-account. Handles contact lifecycle, pipeline (Soul Journey), automated upgrade prompts, and social content posting.
- **Cloudflare:** Dashboard for D1 queries, KV, R2, deployments. All computation + API lives here.
- **Stripe:** Webhook endpoint exists (`/api/webhook`), subscription checkout exists (`/api/create-subscription-checkout`). Not yet fully wired to product.
- **Google Search Console:** Sitemap submitted, monitoring indexing.

## Active API Endpoints (Key Ones)

| Endpoint | Purpose | External Deps |
|----------|---------|---------------|
| `GET /api/daily-brief` | Today's field (public) | None |
| `POST /api/narrator` | AI reading (Gemini → OpenAI → Workers AI) | Gemini (11 keys) |
| `POST /api/personal-reading` | Personalized reading (auth required) | Gemini |
| `POST /api/preview` | Quick 8D from birthday | None |
| `POST /api/compute` | Full 16D with archetypes | None |
| `POST /api/webhook` | Stripe events | Stripe |
| `POST /api/daily-update` | Cron: content + snapshots | Gemini |
| `POST /api/quality-check` | Cron: content QA | None |
| `POST /api/analytics` | Event tracking | None |
| `GET /api/auth/me` | Session check | None |

## Autonomous Operation Notes

This project is designed for agent-assisted development. When running autonomously:

1. Check `docs/GTM-ROADMAP.md` for current phase and next tasks
2. Check `docs/PRODUCT-STRATEGY.md` for product decisions
3. Run `npm run typecheck` before committing
4. Run `npm run test` to verify changes
5. Keep commits focused and descriptive
6. Don't modify Sol's voice rules without explicit approval
7. Don't add complexity — the product should get simpler, not more complex
