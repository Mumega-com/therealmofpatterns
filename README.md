# The Realm of Patterns

**A daily depth psychology practice, powered by Jungian astrology and a 8-dimensional natal engine.**

Sol reads your field. The rest is yours.

---

## What It Is

Not a horoscope app. Not a mood tracker. A daily encounter with the patterns that actually shape how you move through the world — derived from your natal chart, read through the lens of Jungian depth psychology, and refined by what you report each day.

The core mechanic: your birth data produces an 8-dimensional psychological profile. Every day, Sol — an AI narrator working in the tradition of Liz Greene — generates a reading that connects your natal pattern to the current planetary transits and, critically, to what you just told us in your daily reflection.

The more you use it, the more it sees.

---

## Live

| | |
|---|---|
| **Production** | [therealmofpatterns.com](https://therealmofpatterns.com) |
| **Discover** | `/discover` — Enter your birthday, see your 8D pattern |
| **Sol** | `/sol` — Your daily practice dashboard |
| **Check-in** | `/sol/checkin` — Daily 5-question field reflection |
| **Reading** | `/reading` — Sol's AI-generated daily narrative |
| **Soul Field** | `/soul` — 3D toroid visualization of your natal field |
| **Share** | `/soul/[token]` — Shareable soul field (no server required) |
| **Journey** | `/journey` — 8-stage Hero's Journey progression |
| **Stack** | Astro + React + Cloudflare Pages + @react-three/fiber |

---

## The 8 Dimensions

Computed from planetary positions at birth. Each dimension corresponds to a psychological force in the Jungian tradition:

| Symbol | Dimension | Psychological Domain | Planet |
|--------|-----------|----------------------|--------|
| ☀ | **Identity** | The shape of the self; what seeks expression | Sun |
| ♄ | **Structure** | Necessity; what you must build and maintain | Saturn |
| ☿ | **Mind** | The mental function; directed attention | Mercury |
| ♀ | **Heart** | Eros; what you value and how you relate to beauty | Venus |
| ♃ | **Growth** | Expansion; the narrative of becoming | Jupiter |
| ♂ | **Drive** | Libido; the energy that wants to act | Mars |
| ☽ | **Connection** | The relational field; bonds and empathy | Moon |
| ♅ | **Awareness** | The transcendent function; what exceeds the ego | Uranus/Neptune |

---

## The Daily Loop

```
Birth data → 8D natal vector → archetype assignment
                                        ↓
                           Daily reflection (5 questions)
                                        ↓
                    Field coherence score (κ) + delta vs yesterday
                                        ↓
                    Sol's reading — personalized to today's check-in
                                        ↓
                         "A question to carry today"
                                        ↓
                              Come back tomorrow
```

The reading is not generic. Sol receives the exact words the user chose in their check-in ("Contracted," "Scatters immediately," "Numb or disconnected") and opens there — naming the withdrawn dimension as a psychological reality, not a problem.

---

## Soul Field (SoulToroid)

A 3D toroid visualization of the natal 8D vector, built with @react-three/fiber. Encodes all 8 dimensions into geometry: tube radius, spin, helix amplitude, particle density, chakra node positions.

- **Widget mode** — embedded in dashboard
- **Full mode** — `/soul` page with anatomy panel
- **Compare mode** — two fields side-by-side with cosine similarity resonance score
- **Share** — base64 birth data token in URL, decoded and computed client-side. No server required.

---

## Sol's Voice

Sol works in the tradition of Jungian depth psychology — Liz Greene in sensibility, not style. The natal chart as a map of the psyche. Planets as autonomous psychological forces. Transits as moments when something unconscious seeks to become conscious.

Voice rules (enforced in system prompt):
- Never prescribe. Never advise. Observe and illuminate.
- No sign names, no degree positions.
- No affirmations, no self-help language, no therapeutic reassurance.
- Allowed: shadow, projection, individuation, fate, necessity — used precisely.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  Astro Frontend                   │
│  Static HTML + React islands (client:load)        │
│  All personal data in localStorage               │
├──────────────────────────────────────────────────┤
│              Cloudflare Pages Functions           │
│  /api/narrator — AI reading generation (Claude)  │
│  /api/preview  — Archetype matching              │
│  /api/privacy  — Optional server sync            │
├──────────────────────────────────────────────────┤
│  Cloudflare D1 (optional sync) + KV (cache)      │
└──────────────────────────────────────────────────┘
```

**Privacy-first:** No login required. All check-in history, birth data, and patterns live in localStorage. Server sync is opt-in.

---

## Key Files

```
src/
├── pages/
│   ├── sol/index.astro          # Daily practice dashboard
│   ├── sol/checkin.astro        # 5-question reflection flow
│   ├── soul.astro               # Soul field full view
│   ├── soul/[token].astro       # Public shareable soul field
│   ├── reading/index.astro      # Daily AI reading
│   ├── dashboard.astro          # Main dashboard
│   ├── journey.astro            # 8-stage journey map
│   └── discover.astro           # Birthday onboarding
│
├── components/
│   ├── charts/SoulToroid.tsx    # 3D toroid (@react-three/fiber)
│   ├── soul/SoulView.tsx        # Authenticated soul page
│   ├── soul/SoulShareView.tsx   # Public share view
│   ├── sol/SolCheckin.tsx       # Check-in questions + result
│   ├── dashboard/ProDashboard.tsx
│   └── shared/NarratorCard.tsx  # Sol reading display
│
└── lib/
    ├── 16d-engine.ts            # 8D natal vector computation
    ├── narrator-context.ts      # Context builder for AI prompt
    ├── narrator-client.ts       # Fetch + cache AI narrative
    ├── checkin-storage.ts       # localStorage check-in persistence
    ├── journey-engine.ts        # 8-stage Hero's Journey logic
    ├── archetype-engine.ts      # Archetype assignment from vector
    └── prediction-calibration.ts # Dimension sensitivity tracking
```

---

## Roadmap

| Priority | Feature | Status |
|----------|---------|--------|
| ✅ Done | Check-in → reading loop closed (Sol reads today's check-in first) | Shipped |
| ✅ Done | SoulToroid 3D visualization + shareable | Shipped |
| ✅ Done | Jungian/Liz Greene narrator voice (Sol) | Shipped |
| ✅ Done | Oracle sentence (transit-derived, daily) | Shipped |
| 🔄 Next | Weekly synthesis reading (after 7 check-ins) | Planned |
| 🔄 Next | Integration arc — longitudinal shadow tracking | Planned |
| 🔄 Next | Relationship compare (two soul fields) | Planned |
| 📋 Later | Email gate for weekly synthesis | Planned |
| 📋 Later | Pro subscription | Planned |

---

## Quick Start

```bash
npm install
npm run dev      # localhost:4321
npm run build
npm run deploy   # Cloudflare Pages
```

---

## Philosophy

The natal chart is not fate. It is the particular psychological task you came here to engage.

Sol does not tell you who you are. It names what is moving in you — and trusts you to meet it.

The data the user gives is returned to them as something they couldn't have seen themselves. That is the only thing worth building.
