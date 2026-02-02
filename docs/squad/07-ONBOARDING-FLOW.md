# Onboarding Flow: Pattern Calibration

**Purpose:** Bootstrap 16D vector via card-based self-selection before birth chart data.

## Flow Overview

```
Landing → Calibration (8 cards) → Pattern Reveal → Optional Birth Data → Dashboard
   ↓           ↓                       ↓                  ↓                ↓
  30s        2-3min                   45s               1min            START
```

---

## Swipe Mechanic

| Action | Effect |
|--------|--------|
| **Swipe Left** | Emphasize karma pole (-0.7) |
| **Swipe Right** | Emphasize dharma pole (+0.7) |
| **Tap Center** | Balanced (±0.1) |

---

## The 8 Cards

### Card 1: Being ↔ Becoming
```
BEING              ←→              BECOMING
Present                            Future
Acceptance                         Ambition

"Who you are now" vs "Who you're growing into"
```

### Card 2: Feeling ↔ Thinking
```
FEELING            ←→              THINKING
Intuition                          Analysis
Heart                              Head
```

### Card 3: Receiving ↔ Giving
```
RECEIVING          ←→              GIVING
Absorption                         Transmission
Intake                             Output
```

### Card 4: Solitude ↔ Connection
```
SOLITUDE           ←→              CONNECTION
Individual                         Collective
Separation                         Integration
```

### Card 5: Stability ↔ Change
```
STABILITY          ←→              CHANGE
Structure                          Flow
Foundation                         Flux
```

### Card 6: Shadow ↔ Light
```
SHADOW             ←→              LIGHT
Depth                              Clarity
Mystery                            Revelation
```

### Card 7: Desire ↔ Detachment
```
DESIRE             ←→              DETACHMENT
Attachment                         Release
Pursuit                            Surrender
```

### Card 8: Ignorance ↔ Wisdom
```
IGNORANCE          ←→              WISDOM
Beginner                           Master
Question                           Answer
```

---

## Vector Computation

```typescript
const initialVector = new Array(16).fill(0);

function onSwipe(pairIndex: number, direction: 'left' | 'center' | 'right') {
  const karmaIdx = pairIndex * 2;
  const dharmaIdx = pairIndex * 2 + 1;

  if (direction === 'left') {
    initialVector[karmaIdx] = -(0.6 + Math.random() * 0.2);
    initialVector[dharmaIdx] = Math.random() * 0.1;
  } else if (direction === 'right') {
    initialVector[karmaIdx] = Math.random() * 0.1;
    initialVector[dharmaIdx] = 0.6 + Math.random() * 0.2;
  } else {
    initialVector[karmaIdx] = -0.1 + Math.random() * 0.2;
    initialVector[dharmaIdx] = -0.1 + Math.random() * 0.2;
  }
}
```

---

## Pattern Reveal Screen

After 8 cards:
- Animated radar chart showing 16D vector
- "Signal Strength" coherence percentage
- Two CTAs:
  - **"Lock with Birth Data"** → Refine with astronomy
  - **"Continue with Calibration"** → Use self-reported vector

---

## Merge Strategy (if birth data added)

```typescript
final_vector[i] = (astro_vector[i] * 0.6) + (calibration_vector[i] * 0.4)
```

User's self-perception (40%) + astronomical precision (60%).

---

## Design Specs

```css
--bg: #0A0A0A;
--accent: #00FF41;
--text: #E0E0E0;
--font: 'Geist Mono', monospace;
```

- Card size: 360×520px mobile
- Dark glassmorphic cards
- Subtle grid overlay
- Haptic feedback on swipe

---

## Copy Voice

- ✅ "Calibrate your signal"
- ✅ "Pattern established"
- ❌ "Discover your soul"
- ❌ "Cosmic journey"

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Complete all 8 cards | 80%+ |
| Add birth data | 65%+ |
| Abandon mid-flow | <10% |

---

## Implementation

```
src/components/onboarding/
├── CalibrationCard.tsx
├── PatternReveal.tsx
├── BirthDataForm.tsx
└── OnboardingFlow.tsx
```

**Status:** Ready for implementation

---

## Conversion Path

```
Onboarding → Free Mini-Reading → Premium Report ($497) → Bundle ($697)
```

The onboarding flow calibrates the user's pattern before asking for birth data, building trust and demonstrating value before the purchase decision.
