# Product Strategy — The Realm of Patterns

**Last Updated:** 2026-03-14

---

## What We're Building

A daily depth psychology practice powered by a Jungian natal engine and an AI narrator (Sol) who works in the tradition of Liz Greene. The core mechanic: your birth data produces an 8-dimensional psychological profile. Every day, Sol generates a reading that connects that profile to current planetary transits and to what you just told us in your reflection.

The reading opens with the check-in. That is the design decision that makes this different.

---

## The Problem We Solve

Most personal insight tools have the same failure mode: they describe you generically and call it personalization. Your birth sign doesn't tell you why today feels contracted. Your meditation app doesn't know that your attention is scattered specifically in the way that your natal Mercury makes likely under this transit.

We return the user's data to them as something they couldn't have seen themselves. That requires:
1. An 8D natal profile grounded in Jungian psychological theory
2. A daily check-in that captures the actual texture of their inner state
3. A narrator who reads both together and names what is moving

---

## Core Value Proposition

**Sol reads what you just told it, then explains it in terms of your natal pattern and today's sky.**

Not: "Sun in Scorpio means you're intense." That's Co-Star.
Not: "Your energy is at 72% today." That's a biometric.
Yes: "Something in you is contracted right now — not as a failure, but as the particular way your natal Saturn meets this moment. The question is what necessity it's pointing toward."

---

## Daily Loop (Shipped)

```
Birth data → 8D natal vector → archetype assignment
                                        ↓
                           Daily reflection (5 questions)
                           in Sol's voice, geometric scale
                                        ↓
                    Field coherence (κ) + delta vs yesterday
                                        ↓
                    Sol's reading — OPENS with today's check-in
                    (natal pattern + transit as depth, not opening)
                                        ↓
                         "A question to carry today"
                         (derived from lowest dimension)
                                        ↓
                              Come back tomorrow
```

---

## Engagement Architecture

### What keeps users coming back

**The delta.** κ vs yesterday. One number. It means something because it's derived from what you actually said.

**The carry question.** A single psychological question derived from the dimension the user scored lowest. Not prescriptive. No answer required. Just something to hold.

**The oracle sentence.** A single transit-derived statement at the top of the Sol dashboard, refreshed daily. Something worth reading before the check-in.

**The reading itself.** When Sol names what you reported — "Scatters immediately" — as a psychological reality rather than a problem, and then connects it to your natal Mind dimension and today's transit, users feel seen in a way generic content can't produce.

### What we're building next

**Messaging-first delivery (GTM priority).** Sol's daily reading belongs in the user's DM, not behind a website visit. Telegram bot first (richest interface, no approval needed), then Instagram DM and WhatsApp via GHL. The website remains the computation engine and content hub. See `docs/GTM-ROADMAP.md` for the full phased plan.

**GHL integration.** GoHighLevel as the CRM and messaging orchestrator. Contact lifecycle: birthday captured → first reading → daily active → subscriber → advocate. Custom fields store birth data, 8D vector, kappa, streak.

**Weekly synthesis** (after 7 check-ins): A longitudinal reading of the week's arc. What pattern has been moving? What dimension has been consistently withdrawn? Delivered via messaging channel, not just website.

**Relationship compare**: Two soul fields side-by-side with a cosine similarity resonance score. In messaging: "Reply with a friend's birthday" → instant comparison. Viral acquisition loop.

---

## Check-in Design

5 questions, each framed as a field observation rather than a mood rating:

1. "What is the dominant tone in you right now?" — coherence dimension
2. "What in you wants to move today?" — energy dimension
3. "Where does your attention rest when you stop directing it?" — focus dimension
4. "How present is your body to what the day is asking?" — embodiment dimension
5. "What does the day feel like it wants from you?" — direction dimension

Options use ◦○◎●◉ geometric scale. No emojis. No "Great!", "Awesome!" language.

The specific words users choose ("Contracted," "Scatters immediately," "Numb or disconnected") are passed verbatim to Sol's context. Sol opens with them.

---

## Sol's Voice (Enforced)

System prompt rules enforced on every generation:

- **Never prescribe.** Never say "you should," "try to," "remember to."
- **No affirmations.** No gratitude prompts, no motivational language.
- **No sign names.** No degree positions. No "Sun in Scorpio."
- **Planets as psychology.** Saturn is necessity, not a planet. Moon is the relational field.
- **Allowed vocabulary:** shadow, projection, individuation, fate, necessity, the unconscious, the Self — used precisely, never gratuitously.
- **Structure:** Open with the check-in. Body connects check-in to natal + transit. Close in the territory of soul, not self-improvement.

---

## Personalization Tiers

Sol's depth and context scale with check-in history:

| Tier | Check-ins | Sol's context |
|------|-----------|--------------|
| `intro` | 0 | Template. No natal data. |
| `early` | 1–3 | Natal + transit + today's check-in |
| `pattern` | 4–7 | + 7-day kappa patterns, trend |
| `calibrated` | 8–14 | + dimension sensitivities, which dimensions they overlook |
| `deep` | 15+ | + shadow addressed directly, individuation arc acknowledged |

---

## Technical Status

### Shipped ✅
- 8D natal vector computation (`src/lib/16d-engine.ts`)
- Check-in → reading loop (check-in data opens Sol's reading)
- Cache invalidation by check-in ID (new check-in → fresh reading)
- Sol's Jungian voice (system prompt + fallback templates)
- SoulToroid 3D visualization + shareable token
- Oracle sentence (transit-derived, daily)
- Delta display (κ vs yesterday)
- Carry question (derived from lowest dimension)
- Hero's Journey 8-stage progression
- Personalization tiers (intro through deep)

### Planned 🔄
- Messaging-first delivery (Telegram → IG DM → WhatsApp)
- GHL integration (contact lifecycle, pipelines, automated workflows)
- Weekly synthesis reading (delivered via messaging)
- Relationship compare (two soul fields, triggered via DM)
- Automated content posting (daily cosmic weather to socials)
- Monetization triggers (streak-based, kappa-based upgrade prompts)

---

## Go-To-Market Strategy

**Core thesis:** Sol is a message, not a webpage.

The website is the engine (computation, content, SEO). Messaging channels are the interface (daily delivery, check-in, upgrade prompts). GHL orchestrates the lifecycle.

**Acquisition:** Social content (automated daily cosmic weather posts) + SEO (dimension guides, archetype pages, historical figures) → DM CTA ("send me your birthday")

**Activation:** Birthday → instant 8D reading via DM → "Want daily readings? Say yes" → tagged in GHL

**Retention:** Daily Sol message in user's preferred channel → evening micro-check-in → weekly synthesis

**Monetization:** Automated triggers based on streak, kappa patterns, and engagement (see `docs/GTM-ROADMAP.md`)

**Viral:** Comparison mode ("reply with a friend's birthday"), shareable toroid images, "What's your 8D type?" shorthand

---

## What We Stopped Doing

The earlier product strategy documents reference features that were either never built or have been superseded:

- **$497 PDF reports** — not built, not planned
- **Kasra/River narrator modes** — removed from UI; Sol is the only narrator
- **"Coherence Intelligence" positioning** — replaced by depth psychology framing
- **Failure mode detection** — code exists but not exposed in UI, not planned for current roadmap
- **ARL (Adaptive Resonance Learning)** — research concept, not implemented
- **DBSCAN attractor basin clustering** — research concept, not implemented
- **Stripe checkout** — not yet implemented (planned for Phase 5)
- **Integration arc (30/60/90 day)** — deferred; weekly synthesis comes first

The product is simpler and more focused than the early research docs suggest. That is intentional.
