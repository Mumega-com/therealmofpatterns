# Go-To-Market Roadmap — The Realm of Patterns

**Last Updated:** 2026-03-14
**Status:** Phase 1 In Progress
**Operator:** Autonomous agent (Claude Code, hourly runs)

---

## Strategic Thesis

Sol's daily reading is a **message**, not a webpage. The website is the computation engine and content hub. The interface is wherever the user already is.

**Two systems, one pipeline:**
- **OpenClaw** (local + VPS) = Multi-channel messaging gateway (Telegram, WhatsApp, Discord, Signal, iMessage, Slack — 31+ channels). Delivers Sol readings. Handles conversational check-ins.
- **GHL** = CRM + contact lifecycle + social media posting + workflow automation. Tracks contacts, triggers upgrade flows, posts content to socials.

```
User DMs birthday on any channel
        ↓
  OpenClaw receives message
        ↓
  Calls TROP Cloudflare API (8D compute + narrator)
        ↓
  Returns reading to user on same channel
        ↓
  Syncs contact to GHL (birth data, vector, kappa, streak)
        ↓
  GHL workflows trigger lifecycle actions (upgrade prompts, re-engagement)
```

---

## Phase 1: Foundation (Current — Week of 2026-03-14)

**Goal:** Website is solid, content engine runs, docs are current, agent can operate autonomously.

### 1.1 Documentation
- [x] Create `CLAUDE.md` (agent navigation guide)
- [x] Create `docs/GTM-ROADMAP.md` (this document)
- [x] Update `docs/PRODUCT-STRATEGY.md` (add GTM thesis, messaging-first)
- [x] Set up memory system (user profile, project state, GHL reference, OpenClaw reference)
- [x] Update `docs/ARCHITECTURE.md` — added OpenClaw (§12) + GHL (§13) integration sections
- [x] Update `docs/CONTENT-ENGINE-PLAN.md` — marked completed phases, updated to 11 Gemini keys, rebranded dimensions
- [x] Update `docs/CONTENT-AGENT-STRATEGY.md` — clarified Sol as only UI voice, added OpenClaw runtime
- [x] Create `docs/API-REFERENCE.md` — all 30+ endpoints documented with auth, deps, response shapes
- [x] Add `docs/OPENCLAW-INTEGRATION.md` — full integration spec with skill definition, channel formatting, cron

### 1.2 Site Audit & Fixes
- [x] Audit all user flows (homepage → discover → checkin → reading) — all clean
- [x] Verify no broken links or missing components — all present
- [x] Verify build passes (`npm run build` — 160 pages, 5.6s)
- [x] Audit live site at therealmofpatterns.com — all endpoints return 200, fast responses
- [x] Check `/sol/today` public page loads correctly for unauthenticated users — confirmed
- [x] Verify daily-brief API returns current data — returns today's data (UTC-based dates)
- [x] Fix homepage broken API call (`/api/weather/today` → `/api/daily-brief`)
- [x] Fix stale "FRC mathematics" branding in BaseLayout, llms.txt, manifest.json
- [x] Add JSON-LD structured data (WebApplication schema) to BaseLayout
- [x] Audit API endpoints — 23 used, 4 cron, 1 webhook, 18 orphaned identified
- [x] Deploy all fixes to Cloudflare (3 deploys: homepage fix, sitemap fix, JSON-LD)
- [ ] Clean up 18 orphaned API endpoints (or document as internal/future)

### 1.3 Content Engine
- [ ] Verify cron jobs running: daily-update (00:00 UTC), quality-check (12:00 UTC)
- [ ] Check cosmic_weather content freshness in D1 (all 6 languages generating?)
- [ ] Audit content_queue — any stuck/failed items?
- [ ] Verify dimension guides (48 generated) are accessible at `/[lang]/dimension/[slug]`
- [ ] Generate batch of historical figure pages (top 20 by search volume)
- [ ] Generate Jungian concept pages (shadow, anima, individuation — top 5)

### 1.4 SEO Foundation
- [x] Add structured data (JSON-LD WebApplication) to BaseLayout
- [x] Update llms.txt with current product framing
- [x] Fix static sitemap: epoch-zero dates bug, duplicate entry, missing pages (18 → 46 pages)
- [x] Add JSON-LD Article schema to dimension guide, figure, jungian concept pages
- [x] Verify content sitemap has 123 published CMS pages indexed
- [ ] Check Google Search Console — **needs TROP added to GSC** (currently only Viamar connected)
- [ ] Verify hreflang tags on all multi-language pages
- [ ] Submit sitemap to GSC once TROP site is added

### 1.5 OpenClaw Skill (Early Start)
- [x] Create `sol-reading` skill at `../openclaw/skills/sol-reading/SKILL.md`
- [ ] Test skill locally with OpenClaw gateway
- [ ] Register Telegram bot (needs BotFather — **requires human**)

---

## Phase 2: OpenClaw Integration (Next)

**Goal:** Sol speaks through messaging channels via OpenClaw gateway.

### 2.1 OpenClaw Skill: `sol-reading`
- [ ] Create OpenClaw skill at `../openclaw/skills/sol-reading/`
- [ ] Skill receives birthday → calls TROP `/api/preview` → returns 8D reading
- [ ] Skill handles `/sol` command → calls `/api/daily-brief` → returns today's reading
- [ ] Skill handles `/checkin` command → presents 3 quick questions → computes kappa
- [ ] Skill handles `compare [birthday]` → calls `/api/preview` twice → resonance score

### 2.2 OpenClaw Configuration
- [ ] Add TROP API base URL to OpenClaw config
- [ ] Configure Gemini API keys (shared or dedicated set)
- [ ] Set up cron in OpenClaw: daily reading push at 8am per user timezone
- [ ] Configure Telegram channel (priority — richest interface, no approval needed)
- [ ] Test WhatsApp delivery via Baileys
- [ ] Test Discord delivery

### 2.3 Webhook Bridge
- [ ] Create `functions/api/openclaw-webhook.ts` — receives user messages from OpenClaw
- [ ] Input: `{ channel, userId, message, birthData? }`
- [ ] Output: `{ reading, archetype, vector8d, kappa? }`
- [ ] Rate limiting per channel user
- [ ] Cache readings by natal-transit combination (same Sun sign + same day = similar base)

### 2.4 Telegram Bot (Priority Channel)
- [ ] Register Telegram bot via BotFather
- [ ] Connect to OpenClaw Telegram extension
- [ ] Conversational flow: `/start` → birthday capture → instant 8D reading
- [ ] `/sol` → today's personalized reading (if birthday stored)
- [ ] `/checkin` → inline keyboard (3 dimensions: energy, focus, mood — each 1-5)
- [ ] Daily push: 8am reading + evening 8pm micro-reflection
- [ ] "Sol was right ✓ / Sol missed ✗" buttons after each reading
- [ ] Telegram channel for daily cosmic weather broadcast (public, SEO-adjacent)

### 2.5 Data Persistence
- [ ] Store user birth data in OpenClaw memory (per channel user ID)
- [ ] Sync to TROP D1 via `/api/user/sync` (optional server-side backup)
- [ ] Track check-in streak in OpenClaw state
- [ ] Send daily digest to admin: active users, readings delivered, check-in rate

---

## Phase 3: GHL Integration

**Goal:** CRM lifecycle management + automated social media content.

### 3.1 GHL Sub-Account
- [ ] Create dedicated GHL sub-account for The Realm of Patterns
- [ ] Configure timezone, brand, logo

### 3.2 Contact Schema
- [ ] Custom fields: `birth_date` (DATE), `birth_time` (TEXT), `birth_lat` (NUMERICAL), `birth_lng` (NUMERICAL)
- [ ] Custom fields: `vector_8d` (LARGE_TEXT/JSON), `dominant_dimension` (TEXT), `archetype_match` (TEXT)
- [ ] Custom fields: `kappa_score` (NUMERICAL), `check_in_streak` (NUMERICAL), `last_check_in` (DATE)
- [ ] Custom fields: `subscription_tier` (DROPDOWN: free/pro/team), `acquisition_channel` (TEXT)
- [ ] Tags: `daily-active`, `checked-in-today`, `dormant-3d`, `dormant-7d`, `subscriber`, `advocate`, `gifted`

### 3.3 Pipeline: Soul Journey
```
Lead → Birthday Captured → First Reading Sent → Day 3 Active → Day 7 Active → Subscriber → Advocate
```
- [ ] Create pipeline in GHL
- [ ] Automation: move to "Birthday Captured" when birth_date custom field populated
- [ ] Automation: move to "First Reading Sent" when first reading delivered
- [ ] Automation: move to "Day 3/7 Active" based on check_in_streak
- [ ] Automation: move to "Subscriber" on Stripe webhook (subscription.active)
- [ ] Automation: move to "Advocate" when user shares or refers

### 3.4 Contact Sync
- [ ] Create `functions/api/ghl-sync.ts` — pushes user data to GHL on key events
- [ ] Events: first birthday capture, each check-in, subscription change, share
- [ ] Upsert contact by email (or phone for messaging-only users)
- [ ] Update custom fields + tags

### 3.5 Social Media Automation
- [ ] Connect Instagram account to GHL
- [ ] Connect Facebook Page to GHL
- [ ] Daily cosmic weather post (auto-generated from `/api/daily-brief`)
  - [ ] Image card: today's radar chart + ruling planet + one-line Sol insight
  - [ ] Caption: 2-3 sentences + "DM me your birthday for your personal reading"
  - [ ] Schedule: 7am EST daily
- [ ] Weekly archetype spotlight post (Wednesday)
- [ ] New/Full moon special post
- [ ] Reels/Stories template: "What's your 8D type?"

### 3.6 GHL Workflows (Automated Lifecycle)
- [ ] **Welcome sequence**: Birthday captured → send intro email with 8D overview
- [ ] **Activation nudge**: No check-in after 24h → "Sol noticed you haven't checked in"
- [ ] **Re-engagement**: 3 days dormant → "The field shifted while you were away"
- [ ] **Upgrade trigger**: 7-day streak → "Sol knows you now. Unlock your full 16D report"
- [ ] **Shadow trigger**: κ < 0.3 for 3 days → "Your shadow octave is active. Here's what it means"
- [ ] **Birthday month**: Solar return → annual forecast upsell
- [ ] **Referral prompt**: 14 days active → "Know someone who'd vibe with Sol?"

---

## Phase 4: Monetization

**Goal:** Clear free/paid boundary with automated upgrade paths.

### 4.1 Stripe Integration (Code exists, needs wiring)
- [ ] Verify Stripe webhook endpoint works end-to-end
- [ ] Test subscription checkout flow (`/api/create-subscription-checkout`)
- [ ] Test subscription status verification (`/api/subscription-status`)
- [ ] Wire up `/subscribe` page with clear value prop

### 4.2 Product Tiers
```
FREE:
- Daily cosmic weather (generic, all channels)
- Birthday → instant 8D reading (one-time)
- 3 check-ins per week
- Basic archetype match

SOL PRO ($7/mo):
- Unlimited check-ins
- Daily personalized Sol reading (natal + transit + check-in)
- Weekly synthesis (after 7 check-ins)
- Full 16D profile
- Priority narrator (Claude/Gemini Pro models)
- Messaging channel delivery (Telegram, WhatsApp, etc.)

GIFTS (one-time):
- Relationship Reading ($15) — two vectors compared
- Annual Transit Forecast ($29) — PDF, 12-month outlook
- Gift a Reading ($5) — send someone their first reading
```

### 4.3 Paywall Implementation
- [ ] Free tier: limit check-ins to 3/week (localStorage counter + server validation)
- [ ] Free tier: show teaser of personalized reading, then CTA to upgrade
- [ ] Pro tier: full reading, weekly synthesis, messaging delivery
- [ ] Gift flow: enter recipient birthday + email → Stripe checkout → send reading

### 4.4 GHL Monetization Triggers
- [ ] Connect Stripe webhooks to GHL (update contact tags + pipeline stage)
- [ ] Automate upgrade prompts based on engagement signals (see Phase 3.6)

---

## Phase 5: Growth & Viral Mechanics

**Goal:** Self-reinforcing acquisition loops.

### 5.1 Comparison Engine
- [ ] "Compare" command in all messaging channels
- [ ] Two-toroid image generation (side-by-side with resonance score)
- [ ] "Share this with them" → generates link → new user captured
- [ ] Comparison pages: `/compare/[token]` (pre-rendered, shareable)

### 5.2 Social Proof
- [ ] Aggregate stats: "This week, X people checked in. Average kappa: Y"
- [ ] Post weekly to socials (automated via GHL)
- [ ] "Most activated dimension this week" post

### 5.3 Type Shorthand
- [ ] Generate "P7-Δ3-Φ9" type code from 8D vector
- [ ] Shareable card with type code + archetype + one-liner
- [ ] "Add to your bio" CTA
- [ ] `/type` command in messaging channels

### 5.4 SEO Content Flywheel
- [ ] Archetype pages (300 historical figures = 300 indexable pages)
- [ ] Dimension interaction pages (28 pairs × 6 languages = 168 pages)
- [ ] "What does it mean to be [X]-dominant?" (search queries people actually make)
- [ ] Blog: weekly Sol commentary on transits

### 5.5 Referral System
- [ ] Unique referral link per contact (GHL tracking)
- [ ] Referrer reward: 1 week free Pro extension
- [ ] Referred user: instant first reading (skip generic)

---

## Phase 6: Scale & Intelligence

**Goal:** The system gets smarter with usage.

### 6.1 Calibration System (code exists in `prediction-calibration.ts`)
- [ ] Surface calibration to users: "Sol's confidence in reading you: X%"
- [ ] Use check-in feedback to improve dimensional sensitivity predictions
- [ ] Publish anonymized aggregate findings: "Sun-dominant people report higher energy on Sun-transit days"

### 6.2 Failure Mode Detection (code exists in `failure-detector.ts`)
- [ ] Surface to users (gently): "You're in a contraction pattern this week"
- [ ] Link to relevant content (shadow guide for the contracting dimension)
- [ ] Trigger GHL workflow for targeted content delivery

### 6.3 Longitudinal Insights
- [ ] After 30 days: "Your top pattern: when Drive drops, Structure spikes"
- [ ] After 90 days: "Every March, your Connection dimension dips"
- [ ] After 1 year: "Here's your complete dimensional portrait"

### 6.4 Multi-Agent Content (via OpenClaw)
- [ ] Sol writes daily readings
- [ ] Kasra writes technical deep-dives (for content, not UI)
- [ ] River writes shadow guides and archetype poetry
- [ ] Each agent uses OpenClaw's skill system with different Gemini/Claude prompts

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER TOUCHPOINTS                              │
│   Website  │  Telegram  │  WhatsApp  │  Discord  │  Instagram DM    │
└──────┬─────┴──────┬─────┴──────┬─────┴─────┬─────┴──────┬───────────┘
       │            │            │           │            │
       │            └────────────┼───────────┘            │
       │                        │                        │
       ▼                        ▼                        ▼
┌──────────────┐    ┌───────────────────────┐    ┌──────────────────┐
│  Cloudflare  │    │      OpenClaw         │    │       GHL        │
│  Pages +     │◄──►│  (Gateway + Skills)   │───►│  (CRM + Social)  │
│  Workers     │    │                       │    │                  │
│  D1/KV/R2    │    │  - Telegram ext       │    │  - Contacts      │
│              │    │  - WhatsApp ext       │    │  - Pipelines     │
│  APIs:       │    │  - Discord ext        │    │  - Workflows     │
│  - daily-brief│   │  - Signal ext         │    │  - Social posts  │
│  - narrator  │    │  - sol-reading skill  │    │  - Email/SMS     │
│  - preview   │    │  - Cron (daily push)  │    │  - Analytics     │
│  - compute   │    │                       │    │                  │
│  - webhook   │    │  VPS: gateway.mumega  │    │  Cloud: GHL SaaS │
└──────────────┘    └───────────────────────┘    └──────────────────┘
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │     Stripe            │
                    │  (Payments + Subs)    │
                    └───────────────────────┘
```

---

## Agent Operation Protocol

This project is designed for autonomous agent runs (hourly via Claude Code).

### Each Session Should:
1. Read `CLAUDE.md` → understand project context
2. Read `docs/GTM-ROADMAP.md` → find next unchecked task in current phase
3. Do the work (code, content, config, docs)
4. Run `npm run build` → verify no breakage
5. Run `npm run test` if code changed
6. Update this roadmap (check off completed items, add notes)
7. Commit with descriptive message
8. Move to next task or report blockers

### Escalation (Needs Human Input):
- Creating GHL sub-account (requires admin access)
- Registering Telegram bot (requires BotFather interaction)
- Connecting social media accounts to GHL (requires OAuth)
- Stripe configuration changes (requires dashboard access)
- OpenClaw VPS deployment (requires SSH access)
- Any destructive database operations

### Agent Can Do Autonomously:
- Write/update code (API endpoints, components, skills)
- Write/update documentation
- Generate content (via content engine)
- Run tests and fix failures
- Clean up orphaned code
- SEO improvements (meta tags, structured data, sitemaps)
- Performance optimization
- Bug fixes found during audit

---

*This is a living document. Agent updates it after each work session.*
*Created: 2026-03-14 | Last agent run: 2026-03-14 session 1*
*Session 1 results: Phase 1.1 (docs) 9/9. Phase 1.2 (site) 11/12. Phase 1.4 (SEO) 5/8. Phase 1.5 (OpenClaw) 1/3. Total: 10 commits, 3 deploys, 1 bug fixed, 46 sitemap pages.*
