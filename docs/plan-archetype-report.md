# Plan: Free Birth Chart Archetype Report

**Author:** TROP Agent
**Date:** 2026-04-16
**Status:** Approved by Kasra 2026-04-16 — Phase 1 in progress
**Execution order (Kasra):** 1 → 2 → 4 → 6 → 5 → 3
**Rationale:** See `docs/codebase-map.md` and the TROP Q2 strategy memo (distribution over building). This plan delivers the single asymmetric growth move on the board.

---

## Why This, Now

The product engine is ahead of distribution. Q2 is a distribution quarter. Every other growth move (SEO content, homepage rewrite, Telegram integration, creator outreach) is incremental. This one is asymmetric.

**The bet:** Package TROP's latent product advantage — 16D compute + historical figure matching + Jungian archetype assignment — as a genuinely excellent free report that becomes shareable marketing ammunition. Competitors using Co-Star-style single-paragraph generations cannot replicate this. It is a Trojan horse: email capture without friction, screenshot-worthy output, compounding organic surface.

## What Already Exists in the Repo

Everything needed, unglued:

| Asset | Location | Status |
|-------|----------|--------|
| 16D compute with shadow | `src/lib/16d-engine.ts` | production |
| Ephemeris (JPL-grade) | `src/lib/ephemeris.ts` | production |
| Natal chart (Placidus) | `src/lib/natal.ts` | production |
| Archetype assignment | `src/lib/archetype-engine.ts` | production |
| Historical figure matches | D1 `historical_figures` | production |
| Journey stage | `src/lib/journey-engine.ts` | production |
| PDF generation path | `functions/api/report/[id].ts` | partial |
| R2 bucket | `env.STORAGE` | production |
| Email capture flow | subscribers table + SocialShare | production |
| Stripe upgrade endpoints | `/api/create-subscription-checkout` | production |

What's missing is the **assembly + delivery layer**.

## Goal

A user submits their birth data and gets, within ~30 seconds:

1. A shareable PDF (15–20 pages, designed to be screenshot-worthy)
2. A permalink on our domain (`therealmofpatterns.com/report/<token>`)
3. An email with the PDF attached and the permalink
4. A visible "earn a bonus chapter" referral CTA at the bottom

## Non-Goals (Explicit Exclusions)

- No paywall for the free report itself. Upgrade pitch at end only.
- No account creation required. Email + birth data is the whole funnel.
- No multi-language in v1. English only.
- No Hero's Journey progression over time in v1. Point-in-time report.
- No shipping an image-generated cover per user in v1. Static beautiful template.

## Phases (6 Commits)

### Phase 1 — Report Generator
**Commit:** `feat: /api/archetype-report — structured JSON of full 16D profile`

New endpoint: `POST /api/archetype-report`

Input:
```json
{
  "birth_date": "YYYY-MM-DD",
  "birth_time": "HH:MM" | null,
  "birth_location": "City, Country" | null,
  "email": "user@example.com"
}
```

Output: a deterministic, structured report object:

```ts
{
  report_id: string,                    // UUID, used in URL
  token: string,                        // R2 lookup token
  identity: {
    core_archetype: string,             // "The Hero", "The Sage", ...
    shadow_archetype: string,           // the weakest dimension's archetype
    journey_stage: string,              // "Ordinary World" ... "Return"
    primary_planet: string,
  },
  dimensions_16d: Array<{ name, value, polarity, domain, ruler }>,
  historical_resonance: Array<{         // top 5 figures by cosine similarity
    name, era, culture, domains, quote, similarity_score
  }>,
  jungian_threads: Array<{              // top 3 Jungian concepts by dimension weight
    concept, description, how_it_shows_up
  }>,
  oracle_sentence: string,              // one-line narrative pulled from Gemini
  practice_prompts: Array<string>,      // 3 practice questions, one per top dimension
  chart: { planets: Array<...>, houses: ... | null },
  meta: { generated_at, vesion: '1.0', language: 'en' }
}
```

Persist to D1 table `free_reports` (new migration) with 90-day TTL on the permalink, but keep the report data indefinitely.

### Phase 2 — Landing Page
**Commit:** `feat: /free-report landing page — birthday form, single CTA`

New page: `src/pages/free-report/index.astro`

- Hero: *"Your birth chart as a 20-page Jungian archetype report. Free."*
- Below: three-bullet credibility line (16D depth-psychology framework · matches you against 200+ historical figures · written like a Jung seminar, not a horoscope)
- Single form: birth date + birth time (optional toggle for "I don't know") + city + email
- Submit → loading state ("I'm reading your field... ~30 seconds") → redirect to `/report/<id>`
- Mobile-first. Every element above the fold. No footer nav.

### Phase 3 — PDF Renderer
**Commit:** `feat: report PDF renderer — HTML template + Puppeteer → R2`

Template: `src/components/report/ReportPDFTemplate.astro`

Page-by-page structure:
1. Cover (name, birth data, date of report)
2. Your core archetype (one page, hero layout)
3. Your shadow archetype
4. The 8 dimensions — radar chart + one-line each
5. The top-weighted dimension (full page treatment)
6. The weakest dimension (shadow work)
7. Historical resonance #1 (Jung / da Vinci / Hypatia / ...)
8. Historical resonance #2
9. Historical resonance #3
10. Three Jungian threads (shadow, anima/animus, individuation, etc. — whichever 3 are highest-weighted)
11. Your journey stage
12. Oracle sentence (full-page typographic treatment)
13. Three practice prompts
14. What next (soft upgrade pitch to Pro monthly + Telegram bot link)
15. References & credits

Rendering: reuse the existing `functions/api/report/[id].ts` pattern (HTML → Puppeteer-compatible PDF endpoint). Store to R2 at `free-reports/<report_id>.pdf`.

Typography + color: must look good enough to screenshot. Any page that doesn't screenshot well gets cut.

### Phase 4 — Public Permalink Page
**Commit:** `feat: /report/[id] — viewable report page with share buttons`

New dynamic page: `src/pages/report/[id].astro`

- Loads report from D1 + R2
- Renders same layout as PDF but as HTML for browser viewing
- Prominent share buttons (Twitter, Instagram carousel copy, Telegram, direct link)
- "Download PDF" button → R2 signed URL
- Below fold: upgrade pitch to Pro monthly + referral link ("earn your bonus compatibility chapter")

### Phase 5 — Email Delivery
**Commit:** `feat: send report email via Resend/SendGrid + R2 permalink`

New endpoint hook: called after Phase 1 generator completes.

- Minimal HTML email: cover image + "Your report is ready" + permalink + PDF attachment link + one-line upgrade CTA
- Use existing email infra (check what's wired — `functions/api/auth/magic.ts` likely has a provider)
- Unsubscribe-compliant (single-click opt-out, honor via subscribers table)
- Mirror write: `kind='reading', subject='email:<hash>', tags=['free-report']` for retention signal

### Phase 6 — Referral Hook
**Commit:** `feat: referral codes on free reports — earn compatibility chapter`

- Each report gets a unique referral code embedded in the URL: `/free-report?ref=<code>`
- When 3 people use the referral code, unlock a bonus "compatibility" chapter PDF that shows how their 8D vector resonates with a second person's
- Track via D1 `referrals` table (existing `telegram_referrals` pattern, generalize)
- Auto-email notification when unlocked

## Timeline

One focused session per phase. All six can land in a single extended session (~1 day wall-clock) or across two sessions if I want a review pass between Phase 3 and Phase 4.

## Success Metrics (First 30 Days Post-Launch)

- **Primary:** 500+ reports generated
- **Secondary:** 20% of reports generate a share click
- **Tertiary:** 5% convert to Telegram bot signup → daily reading flow
- **Economic:** cost per report ~$0.01 (Gemini for oracle sentence + R2 storage)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| PDF takes >60s to generate | Pre-render HTML synchronously, enqueue PDF async, email when ready |
| Gemini oracle sentence quality varies | Template fallback for consistent output floor |
| Users abandon form at "time unknown" | Default to noon chart, show warmly that some readings need birth time for full accuracy |
| Emails go to spam | Warm up Resend/SendGrid domain beforehand; use SPF/DKIM from our DNS |
| Report is shared without attribution | Watermark with `therealmofpatterns.com` on each page; OG image on permalink includes logo |

## Operator Actions Needed Before Go-Live

1. Set Resend/SendGrid API key: `wrangler secret put RESEND_API_KEY` (or equivalent)
2. Verify SPF/DKIM records on DNS for the sending domain
3. Run the new D1 migration for `free_reports` table
4. Configure an R2 public access policy for `free-reports/*` signed URLs
5. Add the `/free-report` page to the sitemap

## Decisions (from Kasra 2026-04-16)

1. **Email:** Resend directly. `RESEND_API_KEY` already set. `mumega.com` domain verified. POST to `https://api.resend.com/emails` from Pages Functions.
2. **PDF:** Skip for v1. HTML permalink page IS the report. Users screenshot it — screenshots on Instagram/Twitter drive more traffic than PDFs. Defer PDF to v1.1.
3. **Referral:** 3 referrals is correct. Keep.
4. **Cannibalization:** No risk. The free report is point-in-time. Pro is daily practice with Mirror learning. The report makes people want the daily. It's a ladder.
5. **Priority:** This IS the highest priority. Acquisition magnet. Telegram/Stripe/daily content are retention — acquisition comes first.

## Revised Build Order

`Phase 1 → Phase 2 → Phase 4 → Phase 6 → Phase 5 → Phase 3`

- Phase 3 (PDF) deferred to v1.1 — HTML permalink is the v1 artifact
- Phase 5 (email) runs after referral, not after permalink — screenshot-first flow doesn't block on email

---

**Phase 1 in progress.**
