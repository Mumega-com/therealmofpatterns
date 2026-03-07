# Business Strategy — The Realm of Patterns

**Last Updated:** 2026-03-05

---

## What We Are

A daily depth psychology practice. An 8-dimensional natal engine produces a psychological profile at birth. Every day, Sol — an AI narrator working in the tradition of Liz Greene — generates a reading that connects the natal pattern to current transits and, critically, to what the user just reported in their daily reflection.

The more you use it, the more it sees.

---

## Market Position

**Category:** Personal depth practice (not astrology, not wellness, not therapy)
**Primary differentiator:** The reading is not generic. Sol opens with what you just told it — "Contracted," "Numb," "Scatters immediately" — and names the withdrawn dimension as a psychological reality. No other product does this.

**Who this is for:**
- Adults 28–45 who have outgrown generic horoscope apps
- Psychology-curious users who want depth without therapy-speak
- Existing Jungian / depth psychology enthusiasts who want a daily practice tool

---

## Business Model

### Current: Free with Pro upgrade

| Tier | Price | What you get |
|------|-------|--------------|
| **Free** | $0 | Full check-in loop, Sol's daily reading (standard model), SoulToroid, journey map |
| **Pro** | ~$12/mo | Priority AI model, weekly synthesis readings, longitudinal tracking, relationship compare |

**Revenue timing:** Pro feature set is being built. Free tier is fully functional and is the acquisition vehicle.

### Acquisition Loop

```
/discover (birthday → 8D pattern) → daily check-in → Sol reading → share soul field
                                                                           ↓
                                                               Viral acquisition
```

The shareable soul field (`/soul/[token]`) is the organic growth vector. No login required to view someone's field — just a base64 URL.

---

## Retention Mechanics

The product is designed around return-the-next-day compulsion, not notifications:

1. **Delta** — Check-in shows κ score vs yesterday. One number that means something.
2. **Carry question** — Sol leaves a single psychological question derived from the user's lowest dimension. Unprescribed. No answer required.
3. **Weekly synthesis** *(planned)* — After 7 check-ins, a longitudinal reading of the week's arc.
4. **Integration arc** *(planned)* — At 30/60/90 days, a shadow tracking narrative.

The daily practice is the product. Everything else supports it.

---

## Competitive Moats

1. **Jungian voice fidelity** — Sol's voice is enforced by system prompt rules that prevent it from becoming a wellness app. Difficult to replicate without the same philosophical grounding.
2. **Check-in → reading loop** — The reading is personalized to what you just told it, not to your static natal chart. This requires architectural work most competitors skip.
3. **Privacy-first architecture** — All data in localStorage. No account required. This is a trust moat.
4. **SoulToroid** — A genuinely beautiful 3D artifact derived from your data. Shareable, no login required.

---

## Key Metrics

**North Star:** % of users who return for a second check-in within 48 hours.

| Metric | Target |
|--------|--------|
| Day 2 retention | >40% |
| Day 7 retention | >25% |
| Check-in completion rate | >70% |
| Narrative satisfaction (implicit, from re-reads) | Track |
| Soul field shares | Track (acquisition signal) |

---

## Roadmap Priority

| Priority | Feature | Why |
|----------|---------|-----|
| ✅ Done | Check-in → reading loop closed | Core value prop |
| ✅ Done | SoulToroid + shareable | Acquisition |
| ✅ Done | Sol's Jungian voice | Differentiation |
| 🔄 Next | Weekly synthesis reading | Primary retention feature |
| 🔄 Next | Integration arc (30/60/90) | Long-term retention |
| 🔄 Next | Relationship compare | Second acquisition loop |
| 📋 Later | Pro subscription launch | Revenue |
| 📋 Later | Email gate for weekly synthesis | List building |

---

## What We Are Not Doing

- $497 one-time PDF reports
- "Coherence Intelligence" category creation
- Multi-system synthesis (Vedic + Tarot + I Ching)
- Failure mode detection as a medical/clinical product
- B2B therapist portal in the near term

The product is focused. One thing done well: a daily practice that returns the user's own data to them as something they couldn't have seen themselves.
