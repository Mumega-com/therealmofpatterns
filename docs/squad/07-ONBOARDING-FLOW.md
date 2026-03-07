# Onboarding Flow

**Last Updated:** 2026-03-05

---

## Overview

```
Homepage → /discover (birthday form) → 8D preview → /sol → /sol/checkin → /reading
   ↓              ↓                        ↓           ↓         ↓              ↓
  CTA           30sec                    10sec       Dashboard  5 questions   Sol's reading
```

New users land on `/discover`. Returning users (birth data in localStorage) go directly to `/sol`.

---

## /discover

Primary entry for new users. Three states in `DiscoverFlow.tsx`:

### State 1: Birthday input
- User enters birth date, time (optional), location (optional)
- Data saved to `localStorage` as `rop_birth_data_full`

### State 2: 8D Preview
- Instant client-side compute via `computeFromBirthData()` — no API wait
- Shows 8 dimension bars (identity, structure, mind, heart, growth, drive, connection, awareness)
- Dominant dimension card + archetype name
- SoulToroid widget preview
- Archetype enrichment loaded async from `/api/preview` (non-blocking)

### State 3: Continue
- CTA: "Begin your practice" → `/sol`
- Skip option available

---

## Smart Routing (Homepage)

```javascript
// src/pages/index.astro (inline script)
if (localStorage.getItem('rop_birth_data_full')) {
  document.querySelectorAll('a[href="/discover"]').forEach(a => {
    a.href = '/sol';
  });
}
```

Returning users with birth data are routed to the Sol dashboard, not the discover flow.

---

## /sol (Dashboard)

The daily practice home. Shows on arrival:
- Oracle sentence (transit-derived, refreshed daily)
- Field coherence energy ring (κ from today's check-in, or yesterday's if no check-in yet)
- "Begin today's reflection" CTA → `/sol/checkin`
- SoulToroid widget
- Journey stage + streak
- Field notes (rotating psychological prompts)

---

## /sol/checkin (Daily Reflection)

5 questions in Sol's voice, geometric scale (◦○◎●◉):

1. **Tone** — "What is the dominant tone in you right now?"
2. **Energy** — "What in you wants to move today?"
3. **Attention** — "Where does your attention rest when you stop directing it?"
4. **Body** — "How present is your body to what the day is asking?"
5. **Direction** — "What does the day feel like it wants from you?"

Each question shows one at a time. No progress bar countdown — a "5 dimensions" label in the header.

**On completion:**
- κ score with delta vs yesterday (↑/↓)
- "A question to carry today" (derived from lowest-scoring dimension)
- "Sol has something for you →" link to `/reading`

---

## /reading (Sol's Reading)

Sol's AI-generated narrative. Always personalized to:
1. **Today's check-in** (opened first — the specific words the user chose)
2. Their natal profile (archetype, dominant/shadow dimensions)
3. Current planetary transits
4. Check-in history patterns (if tier ≥ `pattern`)

200–300 words of flowing prose. Second person. No headers, no bullets.

Cached by `date + checkin ID` — a new check-in produces a fresh reading.

---

## /soul (Soul Field)

Full-screen SoulToroid visualization with anatomy panel showing all 8 dimension values.

**Share flow:**
- "Share your field" → generates `/soul/[token]` URL
- Token is base64-encoded birth data
- Recipient page decodes and renders the toroid client-side
- No server required, no login to view

---

## Implementation

```
src/
├── pages/
│   ├── index.astro              # Homepage with smart routing
│   ├── discover.astro           # Birthday onboarding
│   ├── sol/
│   │   ├── index.astro          # Sol dashboard
│   │   └── checkin.astro        # Daily reflection page
│   ├── reading/index.astro      # Sol's AI reading
│   ├── soul.astro               # Soul field full view
│   └── soul/[token].astro       # Shareable soul field
│
└── components/
    ├── discover/DiscoverFlow.tsx
    ├── sol/SolCheckin.tsx        # Check-in flow + result
    └── charts/SoulToroid.tsx     # 3D toroid
```

---

## Design

- Dark background (#0a0908), gold accents
- Geometric symbols ◦○◎◌◉ throughout (no emojis in Sol-facing UI)
- Cormorant Garamond for Sol's voice, clean sans-serif for structure
- Mobile-first, responsive
- No modal flows — each step is a full page

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Complete birthday form | 80%+ |
| Click "Begin practice" CTA | 60%+ |
| Complete first check-in | 50%+ |
| View Sol's reading | 80% of check-in completers |
| Return next day | 35%+ |
| Share soul field | 15%+ |
