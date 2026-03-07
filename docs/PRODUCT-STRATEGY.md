# Product Strategy — The Realm of Patterns

**Last Updated:** 2026-03-05

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

**Weekly synthesis** (after 7 check-ins): A longitudinal reading of the week's arc. What pattern has been moving? What dimension has been consistently withdrawn? This is the primary planned retention feature.

**Integration arc** (30/60/90 days): A shadow tracking narrative. What has appeared repeatedly? What has the user been consistently not looking at? This is the long-term retention mechanic.

**Relationship compare**: Two soul fields side-by-side with a cosine similarity resonance score. The secondary acquisition loop — users share their field, someone else checks theirs.

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
- Weekly synthesis reading (after 7 check-ins)
- Integration arc (30/60/90 day longitudinal)
- Relationship compare (two soul fields)
- Pro subscription gating weekly synthesis
- Email capture for weekly synthesis

---

## What We Stopped Doing

The earlier product strategy documents reference features that were either never built or have been superseded:

- **$497 PDF reports** — not built, not planned
- **Kasra/River narrator modes** — removed from UI; Sol is the only narrator
- **"Coherence Intelligence" positioning** — replaced by depth psychology framing
- **Failure mode detection** — not shipped, not planned in current roadmap
- **ARL (Adaptive Resonance Learning)** — research concept, not implemented
- **DBSCAN attractor basin clustering** — research concept, not implemented
- **Stripe checkout** — not implemented

The product is simpler and more focused than the early research docs suggest. That is intentional.
