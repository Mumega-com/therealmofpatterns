# Technical Architecture

**Last Updated:** 2026-03-05

## System Overview

The Realm of Patterns is an Astro + React application deployed on Cloudflare Pages. All personal data lives in localStorage — no login required. Server infrastructure handles AI narration and optional sync only.

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
│  Cloudflare D1 (optional sync) + KV (rate limit) │
└──────────────────────────────────────────────────┘
```

**Privacy-first:** No login required. All check-in history, birth data, and patterns live in localStorage. Server sync is opt-in.

---

## 8D Vector Representation

The core data structure. Computed from birth data via planetary positions.

```typescript
// 8 values, each normalized 0..1
// [Identity, Structure, Mind, Heart, Growth, Drive, Connection, Awareness]
type NatalVector = [number, number, number, number, number, number, number, number];
```

Computed in `src/lib/16d-engine.ts` using `computeFromBirthData(birthData: BirthData)`.

The same function is used twice per reading:
1. Birth data → natal vector (static, cached after first compute)
2. Today's date/time at birth location → transit vector (changes daily)

---

## Narrator Pipeline

The core data flow that produces Sol's reading:

```
localStorage (birth data, check-in history)
    ↓
buildNarratorContext()       [narrator-context.ts]
    ↓
buildSystemPrompt(tier)      [narrator-context.ts]
buildUserPrompt(context)     [narrator-context.ts]
    ↓
POST /api/narrator           [functions/api/narrator.ts]
    ↓
Claude API (claude-haiku or claude-sonnet)
    ↓
NarratorResult { narrative, tier, model, cached }
    ↓
localStorage cache           [key: date + checkin ID]
```

**Cache invalidation:** The cache key includes the check-in ID from today's entry. A new check-in produces a fresh reading; the same check-in returns the cached result.

---

## API Endpoints

### POST /api/narrator
Generates Sol's daily narrative.

```typescript
interface NarratorRequest {
  userHash: string;
  context: NarratorContext;
  tier: PersonalizationTier;
  systemPrompt: string;
  userPrompt: string;
  isPro: boolean;
}

interface NarratorResponse {
  narrative: string;
  tier: string;
  model: string;
  cached: boolean;
}
```

### POST /api/preview
Returns archetype match for a birth vector (used on /discover).

---

## Personalization Tiers

Sol's system prompt and context depth scale with check-in history:

| Tier | Check-ins | What changes |
|------|-----------|--------------|
| `intro` | 0 | Template fallback, no natal data |
| `early` | 1–3 | Natal + transit context |
| `pattern` | 4–7 | + 7-day check-in patterns, kappa trend |
| `calibrated` | 8–14 | + dimension sensitivities, feedback accuracy |
| `deep` | 15+ | + shadow direct address, individuation arc |

---

## localStorage Schema

```
rop_birth_data_full    BirthData JSON
rop_checkin_history    CheckinHistory JSON (all entries)
rop_device_hash        Anonymous device identifier
rop_user               { isPro: boolean }
rop_narrative_{date}_{checkinId}   Cached narrative result
rop_calibration        CalibrationProfile JSON
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/16d-engine.ts` | 8D natal vector computation from birth data |
| `src/lib/narrator-context.ts` | Context builder: aggregates localStorage → AI prompt |
| `src/lib/narrator-client.ts` | Fetch + cache AI narrative, template fallback |
| `src/lib/checkin-storage.ts` | localStorage check-in persistence, kappa helpers |
| `src/lib/archetype-engine.ts` | Archetype assignment from natal vector |
| `src/lib/journey-engine.ts` | 8-stage Hero's Journey state |
| `src/lib/prediction-calibration.ts` | Dimension sensitivity tracking |
| `src/components/charts/SoulToroid.tsx` | 3D toroid visualization (@react-three/fiber) |
| `src/components/sol/SolCheckin.tsx` | 5-question check-in flow |
| `functions/api/narrator.ts` | Cloudflare Pages Function → Claude API |

---

## SoulToroid

3D toroid visualization encoding the natal 8D vector into geometry. Built with `@react-three/fiber`.

Encoding map:
- Tube radius → Identity (Sun)
- Spin speed → Drive (Mars)
- Helix amplitude → Growth (Jupiter)
- Particle density → Connection (Moon)
- Chakra node positions → all 8 dimensions

Modes: widget (embedded in dashboard), full (`/soul`), compare (two fields with cosine similarity), share (`/soul/[token]` — base64 birth data in URL, decoded client-side, no server required).

---

## Architecture Principles

1. **Privacy-first** — No login, no server-side user data except optional sync
2. **Client-heavy** — All computation runs in the browser; server is API gateway only
3. **Graceful degradation** — Template fallback when API is unavailable
4. **Cache by content** — Narrative cache key includes check-in ID, not just date
