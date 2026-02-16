# Onboarding Flow: Birthday-First Discovery

**Purpose:** Instantly show users their cosmic pattern via birthday input, then deepen with daily check-ins.

## Flow Overview (V2)

```
Homepage → /discover (birthday form) → 8D Preview (instant) → /mode/checkin
   ↓           ↓                            ↓                       ↓
  CTA        30sec                         10sec                  2-3min
```

### New vs Returning Users

| User Type | Homepage CTA | Destination |
|-----------|-------------|-------------|
| **New** (no birth data) | "Discover Your Pattern" | `/discover` → birthday form |
| **Returning** (has birth data) | "Discover Your Pattern" | `/{mode}/checkin` (smart redirect) |

---

## /discover Page

The primary entry point for new users. Three states managed by `DiscoverFlow.tsx`:

### State 1: Birth Input
- `BirthDataPrompt` component with `autoExpand={true}`, `timing="before-checkin"`
- User enters birthday (month/day/year)
- Data saved to `localStorage` as `rop_birth_data_full`

### State 2: 8D Preview
- **Instant** client-side computation via `computeLocalPreview()` (no API wait)
- Shows: 8 dimension bars, dominant dimension card, archetype match
- Archetype enrichment loaded async from `/api/preview` (non-blocking)
- Share buttons for social distribution

### State 3: Continue
- "Go Deeper: 1-Min Check-in" CTA → navigates to `/{mode}/checkin`
- Skip option also available

---

## 8D Preview Display

| Section | Content |
|---------|---------|
| **Header** | "Your Cosmic Pattern" (mode-dependent) |
| **Dimension Bars** | 8 horizontal bars, dominant highlighted in gold |
| **Dominant Card** | Symbol, name, value, description |
| **Archetype Match** | Historical figure, era, quote, resonance % |
| **Share** | Twitter, Facebook, copy link |
| **CTA** | "Go Deeper: 1-Min Check-in" |

---

## Vector Computation

Client-side via `src/lib/preview-compute.ts`:

```typescript
import { computeFromBirthData, getDominant, getDimensionTeaser } from './16d-engine';

export function computeLocalPreview(birthData: BirthData): LocalPreviewResult {
  const vector = computeFromBirthData(birthData);
  const dominant = getDominant(vector);
  const teaser = getDimensionTeaser(dominant.index);
  // Returns vector, dominant, teaser, all 8 dimensions
}
```

API enrichment via `fetchArchetype()` calls `/api/preview` for archetype matching using cosine similarity against historical figure vectors.

---

## Smart Routing (Homepage)

Inline script on `index.astro` checks localStorage:

```javascript
if (localStorage.getItem('rop_birth_data_full')) {
  const mode = localStorage.getItem('rop_mode') || 'sol';
  document.querySelectorAll('a[href="/discover"]').forEach((a) => {
    a.href = `/${mode}/checkin`;
  });
}
```

---

## Implementation

```
src/components/discover/
├── DiscoverFlow.tsx       # Orchestrator (birth → preview → checkin)
└── PreviewResult.tsx      # 8D preview with archetype match

src/lib/
└── preview-compute.ts     # Client-side preview computation

src/pages/
└── discover.astro         # /discover page
```

**Status:** Implemented (V2)

---

## Design

- Dark background (#0a0908) with gold accent glows
- Mode-aware styling (Sol/River/Kasra) via `data-mode` attribute
- Responsive — optimized for mobile
- Minimal chrome: no header/footer, just back link + branding

---

## Conversion Path

```
/discover → Free 8D Preview → Daily Check-in → Premium 16D ($19/mo) → Circle ($49/seat/mo)
```

The birthday-first flow demonstrates value instantly (your unique pattern) before asking for engagement (daily check-ins) or payment.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Complete birthday form | 85%+ |
| View 8D preview | 90%+ (of form completers) |
| Click "Go Deeper" CTA | 60%+ |
| Share pattern | 15%+ |
| Return next day | 30%+ |
