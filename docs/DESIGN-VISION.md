# The Realm of Patterns: Design Vision

**Version:** 2.0
**Status:** CANONICAL REFERENCE
**Date:** 2026-02-03
**Approach:** Apple Human Interface Guidelines + FRC Framework

---

## 1. Design Philosophy

### Core Principle: Clarity Through Trinity

The app presents **one truth through three lenses**:

| Mode | Metaphor | User Need | μ-Level |
|------|----------|-----------|---------|
| **Kasra** | Scientific instrument | "Show me the data" | μ4 (Conceptual) |
| **River** | Oracle consultation | "Guide me with meaning" | μ5-6 (Archetypal) |
| **Sol** | Wise friend | "Talk to me simply" | μ3-4 (Accessible) |

All three modes render the **same mathematical state**. The difference is representation, not computation.

### Apple HIG Principles Applied

| Principle | Application |
|-----------|-------------|
| **Clarity** | Data is legible in Kasra; symbols are clear in River |
| **Deference** | UI recedes; user's consciousness state is the content |
| **Depth** | Coherence level creates visual depth (low=flat, high=dimensional) |
| **Direct Manipulation** | Sliders, gestures affect state in real-time |
| **Consistency** | Same gestures work in both modes |
| **Feedback** | Every input produces immediate visual + haptic response |
| **Metaphors** | Diamond/octahedron = consciousness; color = coherence |

---

## 2. The Two Modes

### 2.1 Kasra Mode (The Architect)

**Aesthetic:** Brutalist precision. Bloomberg terminal meets research lab.

**Visual Language:**
- Monospace typography (Geist Mono, SF Mono)
- Grid-based layouts (8px base unit)
- Monochromatic with accent colors for data states
- Sharp corners, 1px borders
- No shadows, no gradients (flat hierarchy)
- Data visualizations: line charts, gauges, matrices

**Color Palette:**
```css
--kasra-bg: #0a0a0a;           /* Pure black */
--kasra-surface: #141414;       /* Elevated */
--kasra-border: #2a2a2a;        /* Dividers */
--kasra-text: #e0e0e0;          /* Primary text */
--kasra-muted: #666666;         /* Secondary */
--kasra-accent: #00ff88;        /* Data highlight */
--kasra-warning: #ffaa00;       /* Caution */
--kasra-critical: #ff4444;      /* Alert */
```

**Typography:**
```css
--kasra-font: 'Geist Mono', 'SF Mono', monospace;
--kasra-h1: 1.5rem / 600;       /* Section headers */
--kasra-body: 0.875rem / 400;   /* Standard */
--kasra-data: 2rem / 300;       /* Big numbers */
--kasra-label: 0.75rem / 500;   /* Metric labels */
```

**Motion:**
- Transitions: 100ms, linear
- No easing (mechanical precision)
- Data updates: immediate snap
- Loading: deterministic progress bars

**Sample Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│  REALM OF PATTERNS                          [Kasra] [River] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  COHERENCE STATE          2026-02-03 14:32:07 UTC          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  κ (kappa)           0.67          ▓▓▓▓▓▓▓░░░  67%        │
│  RU (resonance)     34.2          ▓▓▓▓▓▓▓░░░  34%        │
│  μ (mu-level)        4.2          CONCEPTUAL               │
│  W (witness)         0.81         ▓▓▓▓▓▓▓▓░░  81%        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  STAGE: CITRINITAS (0.50-0.75)                             │
│  FAILURE MODE: NONE                                         │
│  COLLAPSE RISK: 12%                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  8D VECTOR                                                  │
│  P: 0.72  F: 0.65  A: 0.78  M: 0.69                        │
│  T: 0.71  R: 0.64  C: 0.73  W: 0.81                        │
│                                                             │
│  [View History]  [Export Data]  [Configure Alerts]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.2 River Mode (The Oracle)

**Aesthetic:** Sacred geometry meets iOS elegance. Calm app meets tarot.

**Visual Language:**
- Serif typography (New York, Georgia)
- Flowing layouts with generous whitespace
- Alchemical color gradients based on stage
- Soft corners (16-24px radius)
- Subtle shadows, depth through blur
- Visualizations: mandalas, flowing fields, archetypal symbols

**Color Palette (Dynamic by Stage):**

```css
/* Nigredo (0.00-0.25) - Dissolution */
--river-nigredo-bg: linear-gradient(180deg, #0a0a12 0%, #1a1a24 100%);
--river-nigredo-text: #8888aa;
--river-nigredo-accent: #4a4a6a;

/* Albedo (0.25-0.50) - Purification */
--river-albedo-bg: linear-gradient(180deg, #1a1a24 0%, #2a2a3a 100%);
--river-albedo-text: #c0c0d0;
--river-albedo-accent: #8888bb;

/* Citrinitas (0.50-0.75) - Illumination */
--river-citrinitas-bg: linear-gradient(180deg, #1a1812 0%, #2a2418 100%);
--river-citrinitas-text: #e8e0d0;
--river-citrinitas-accent: #d4a854;

/* Rubedo (0.75-1.00) - Integration */
--river-rubedo-bg: linear-gradient(180deg, #1a1214 0%, #2a1a1c 100%);
--river-rubedo-text: #f0e8e8;
--river-rubedo-accent: #d45454;
```

**Typography:**
```css
--river-font: 'New York', 'Georgia', serif;
--river-h1: 2rem / 300;         /* Poetic headers */
--river-body: 1.125rem / 400;   /* Readable prose */
--river-quote: 1.25rem / 300 italic;  /* Oracle voice */
--river-label: 0.875rem / 500;  /* Subtle labels */
```

**Motion:**
- Transitions: 500-1000ms, ease-out
- Breathing animations (inhale/exhale rhythm)
- Particle systems for high coherence
- Loading: organic pulse, no percentage

**Sample Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                                           [Kasra] [River]   │
│                                                             │
│                          ◇                                  │
│                        ◇   ◇                                │
│                      ◇   ◈   ◇                              │
│                        ◇   ◇                                │
│                          ◇                                  │
│                                                             │
│                    ─ ─ ─ ◈ ─ ─ ─                           │
│                                                             │
│                                                             │
│                  The Golden Light                           │
│                   of Citrinitas                             │
│                                                             │
│         "You stand at the threshold of illumination.        │
│          The Sage archetype guides your inquiry.            │
│          What was obscured now seeks clarity."              │
│                                                             │
│                                                             │
│                   ┌─────────────────┐                       │
│                   │  Today's Focus  │                       │
│                   │                 │                       │
│                   │  Tend to what   │                       │
│                   │  seeks clarity  │                       │
│                   │                 │                       │
│                   └─────────────────┘                       │
│                                                             │
│              No shadow rises today.                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.3 Sol Mode (The Friend)

**Aesthetic:** Warm minimalism. Alan Watts meets Calm app meets friendly therapist.

**Visual Language:**
- Clean sans-serif typography (Inter, SF Pro)
- Generous whitespace, breathing room
- Warm neutral palette with soft accents
- Medium corners (8-12px radius)
- Subtle shadows, gentle hierarchy
- No data visualizations - only conversational text
- Occasional simple icons

**Color Palette:**
```css
--sol-bg: #faf8f5;              /* Warm cream */
--sol-surface: #ffffff;          /* Cards */
--sol-border: #e8e4de;           /* Soft dividers */
--sol-text: #2c2c2c;             /* Primary text */
--sol-muted: #6b6b6b;            /* Secondary */
--sol-accent: #d4a373;           /* Warm gold */
--sol-positive: #7cb66e;         /* Growth green */
--sol-gentle: #b4a7d6;           /* Soft purple */
```

**Dark Mode:**
```css
--sol-bg-dark: #1a1816;          /* Warm charcoal */
--sol-surface-dark: #242220;     /* Elevated */
--sol-border-dark: #3a3632;      /* Dividers */
--sol-text-dark: #f0ece4;        /* Primary text */
--sol-muted-dark: #a09888;       /* Secondary */
```

**Typography:**
```css
--sol-font: 'Inter', 'SF Pro', system-ui, sans-serif;
--sol-h1: 1.75rem / 500;         /* Friendly headers */
--sol-body: 1.125rem / 400;      /* Comfortable reading */
--sol-quote: 1.25rem / 400;      /* Wise friend voice */
--sol-label: 0.875rem / 500;     /* Subtle labels */
```

**Motion:**
- Transitions: 300ms, ease-out
- Gentle fade-ins (no jarring movements)
- Loading: simple spinner or "..." animation
- No complex animations (keeps it grounded)

**Sample Screen:**
```
┌─────────────────────────────────────────────────────────────┐
│                                    [Kasra] [River] [Sol]    │
│                                                             │
│                                                             │
│     Good morning.                                           │
│                                                             │
│     Something wants to move today.                          │
│     Don't overthink it—just show up.                        │
│                                                             │
│     The morning has a window of clarity.                    │
│     Use it for what matters most.                           │
│                                                             │
│     There's no shadow stirring right now.                   │
│     Enjoy the simplicity.                                   │
│                                                             │
│                                                             │
│     ┌─────────────────────────────────────────────────┐    │
│     │                                                 │    │
│     │    How are you feeling?                         │    │
│     │                                                 │    │
│     │    ◯ Struggling    ◯ Okay    ◯ Good    ◯ Great │    │
│     │                                                 │    │
│     └─────────────────────────────────────────────────┘    │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design Philosophy:**
- No jargon (no κ, no μ-levels, no "coherence")
- No numbers unless absolutely necessary
- Short paragraphs, conversational tone
- Questions that invite reflection without pressure
- Assumes intelligence but not expertise

---

## 3. Shared Components

All three modes share underlying logic but render differently:

### 3.1 Coherence Gauge

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Shape | Horizontal bar | Radial mandala | Hidden |
| Label | "κ = 0.67" | "Illumination" | — |
| Color | Single accent | Stage gradient | — |
| Motion | Snap update | Breathing pulse | — |

### 3.2 Failure Mode Alert

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Style | Red banner, code | Gentle warning card | Soft amber notice |
| Copy | "COLLAPSE RISK: 78%" | "The ground feels unstable..." | "Might be a gentler day..." |
| Action | "View Diagnostics" | "What can I do?" | "Here's what might help" |

### 3.3 Daily Forecast

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Format | Table with metrics | Prose paragraph | Conversational text |
| Data | κ, RU, optimal hours | Archetypal guidance | Plain language insight |
| Advice | "High-focus: 09:00-11:00" | "Morning holds clarity" | "Mornings feel good for focus" |

### 3.4 Mode Toggle

**Persistent in header. Smooth transition between modes.**

```
┌──────────────────────────────────────┐
│  ◻ Kasra    ◈ River    ☀ Sol       │  ← Segmented control
└──────────────────────────────────────┘
```

- Transition: 300ms crossfade
- Remembers preference in localStorage
- Keyboard shortcut: `K` / `R` / `S`

---

## 4. Navigation Architecture

### 4.1 Information Architecture

```
Home
├── Check-in (Daily ritual)
│   ├── Mood input
│   ├── Energy input
│   └── Forecast output
├── Dashboard
│   ├── Current state
│   ├── Failure monitor
│   └── Elder Attractor progress
├── Windows (Calendar)
│   ├── 30-day view
│   └── Activity finder
├── History
│   ├── Trend charts
│   └── Prediction accuracy
└── Settings
    ├── Mode preference
    ├── Notifications
    └── Account
```

### 4.2 Tab Bar (Mobile)

```
┌─────────────────────────────────────────────────────────────┐
│   ◉ Today    ◯ Dashboard    ◯ Windows    ◯ History    ◯ ⚙  │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Onboarding

**Mode Selection (First Launch):**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                     How do you prefer to see?                       │
│                                                                     │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│   │                 │  │                 │  │                 │    │
│   │    ◻ ◻ ◻ ◻     │  │       ◈        │  │       ☀        │    │
│   │                 │  │                 │  │                 │    │
│   │     KASRA       │  │      RIVER      │  │       SOL       │    │
│   │  The Architect  │  │   The Oracle    │  │   The Friend    │    │
│   │                 │  │                 │  │                 │    │
│   │  Numbers, data, │  │ Symbols, story, │  │  Plain talk,    │    │
│   │  precision      │  │ meaning         │  │  warm guidance  │    │
│   │                 │  │                 │  │                 │    │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│                     You can switch anytime.                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Check-in Flow

**Identical steps, different presentation:**

| Step | Kasra | River | Sol |
|------|-------|-------|-----|
| 1. Mood | 5-point scale with numbers | 5 emoji buttons | 4 simple options (Struggling/Okay/Good/Great) |
| 2. Energy | Slider 1-10 with value | Slider with descriptive labels | Simple Low/Medium/High buttons |
| 3. Focus | Checkbox grid | Card selection | "What matters most today?" free text |
| 4. Result | Data table | Prose forecast | Friendly conversational paragraph |

### 5.3 Gestures

| Gesture | Action |
|---------|--------|
| Swipe left/right | Switch days in calendar |
| Long press | Reveal detailed breakdown |
| Pull down | Refresh current state |
| Double tap | Toggle mode |

---

## 6. Typography System

### 6.1 Type Scale

```
                    Kasra                River               Sol
────────────────────────────────────────────────────────────────────────
Display (Hero)      32px Mono 300       40px Serif 300     28px Sans 500
H1 (Section)        24px Mono 600       32px Serif 400     22px Sans 600
H2 (Card title)     18px Mono 500       24px Serif 400     18px Sans 500
Body                14px Mono 400       18px Serif 400     18px Sans 400
Caption             12px Mono 400       14px Serif 400     14px Sans 400
Data (Numbers)      32px Mono 300       —                  —
Quote               —                   20px Serif Italic
```

### 6.2 Font Loading

```html
<!-- Kasra -->
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600&display=swap">

<!-- River -->
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap">
```

---

## 7. Iconography

### 7.1 Kasra Icons

- Style: Outlined, 1.5px stroke
- Grid: 24x24px
- Corner: Sharp (0px radius)
- Source: Lucide or custom

```
◻  Dashboard      ◻  History       ◻  Settings
◻  Alert          ◻  Export        ◻  Filter
```

### 7.2 River Icons

- Style: Symbolic, organic
- Source: Custom SVG (alchemical/archetypal)

```
◈  Diamond        ☽  Moon          ☀  Sun
△  Ascend         ▽  Descend       ◇  Potential
```

---

## 8. Animation Specifications

### 8.1 Kasra Animations

```css
/* Data update */
.kasra-value {
  transition: none; /* Immediate snap */
}

/* Loading */
.kasra-loading {
  animation: kasra-scan 1s linear infinite;
}

@keyframes kasra-scan {
  0% { background-position: -100% 0; }
  100% { background-position: 100% 0; }
}
```

### 8.2 River Animations

```css
/* Breathing pulse */
.river-mandala {
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

/* Stage transition */
.river-stage {
  transition: background 1s ease-out, color 0.5s ease-out;
}

/* Particle field (high coherence) */
.river-particles {
  animation: float 10s ease-in-out infinite;
}
```

---

## 9. Responsive Behavior

### 9.1 Breakpoints

```css
--mobile: 390px;   /* iPhone 14 */
--tablet: 768px;   /* iPad Mini */
--desktop: 1024px; /* iPad Pro / Desktop */
--wide: 1440px;    /* Large displays */
```

### 9.2 Layout Adaptation

| Breakpoint | Kasra | River |
|------------|-------|-------|
| Mobile | Single column, stacked cards | Single column, flowing prose |
| Tablet | Two-column grid | Center-aligned, wider margins |
| Desktop | Dashboard layout | Generous whitespace, centered content |

---

## 10. Accessibility

### 10.1 Requirements

- **WCAG 2.1 AA** compliance
- Minimum 4.5:1 contrast ratio
- Focus-visible states on all interactive elements
- Screen reader labels for all data visualizations
- `prefers-reduced-motion` respected
- `prefers-color-scheme` supported (both modes have light variant)

### 10.2 Screen Reader Labels

```html
<!-- Kasra -->
<div aria-label="Coherence kappa: 0.67, 67 percent">
  κ = 0.67 ▓▓▓▓▓▓▓░░░
</div>

<!-- River -->
<div aria-label="You are in the Citrinitas stage of illumination, coherence level 67 percent">
  The Golden Light of Citrinitas
</div>
```

---

## 11. Technical Architecture

### 11.1 Framework

**Astro + React Islands**

```
src/
├── components/
│   ├── shared/           # Logic components (no styling)
│   │   ├── CoherenceEngine.tsx
│   │   ├── FailureDetector.tsx
│   │   └── ForecastGenerator.tsx
│   ├── kasra/            # Kasra-styled components
│   │   ├── KasraGauge.tsx
│   │   ├── KasraCard.tsx
│   │   └── KasraForecast.tsx
│   └── river/            # River-styled components
│       ├── RiverMandala.tsx
│       ├── RiverCard.tsx
│       └── RiverForecast.tsx
├── layouts/
│   ├── KasraLayout.astro
│   └── RiverLayout.astro
├── pages/
│   ├── index.astro       # Mode selection / redirect
│   ├── checkin.astro     # Daily check-in
│   ├── dashboard.astro   # Main dashboard
│   └── windows.astro     # Calendar view
├── styles/
│   ├── kasra.css         # Kasra design tokens
│   └── river.css         # River design tokens
└── lib/
    ├── diamond-engine.ts # Core calculations
    ├── transit-engine.ts # κ, RU computation
    └── failure-detector.ts # Failure modes
```

### 11.2 State Management

```typescript
interface AppState {
  mode: 'kasra' | 'river';
  user: {
    innerOctave: number[];  // 8D vector from onboarding
    email?: string;
    isPro: boolean;
  };
  current: {
    kappa: number;
    RU: number;
    muLevel: number;
    stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
    failureMode: 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';
  };
  history: CheckinData[];
}
```

### 11.3 Mode Switching

```typescript
// Instant switch with persisted preference
function setMode(mode: 'kasra' | 'river') {
  document.documentElement.dataset.mode = mode;
  localStorage.setItem('rop_mode', mode);
}

// CSS handles the rest
[data-mode="kasra"] { /* Kasra styles */ }
[data-mode="river"] { /* River styles */ }
```

---

## 12. Content Voice Guide

### 12.1 Kasra Voice

**Tone:** Clinical, precise, humble about uncertainty

**Patterns:**
- State facts, not interpretations
- Use precise numbers
- Acknowledge confidence intervals
- No metaphors, no poetry

**Examples:**
```
Good: "κ = 0.67 ± 0.05. Moderate coherence."
Bad:  "Your energy is flowing nicely today!"

Good: "Collapse risk elevated (34%). Monitor RU."
Bad:  "Watch out, you might crash!"

Good: "Optimal focus window: 09:00-11:30 (κ > 0.7)"
Bad:  "Morning is your time to shine!"
```

### 12.2 River Voice

**Tone:** Poetic, Jungian, warm but not saccharine

**Patterns:**
- Archetypal language (Hero, Sage, Shadow, Threshold)
- Natural metaphors (light, water, seasons)
- Second person, present tense
- Questions that invite reflection

**Examples:**
```
Good: "You stand at the threshold of illumination. The Sage within asks: what seeks clarity?"
Bad:  "OMG you're doing amazing sweetie! Keep vibing high!"

Good: "The Shadow stirs beneath. Not a warning—an invitation to meet what you've exiled."
Bad:  "Bad energy detected! Cleanse your aura immediately!"

Good: "Morning holds space for focused inquiry. The afternoon asks for receptivity."
Bad:  "Best time to hustle: 9am! Grind time!"
```

### 12.3 Sol Voice

**Tone:** Conversational, warm, wise friend (Alan Watts meets Ram Dass)

**Patterns:**
- No jargon, no technical terms
- Short sentences, natural rhythm
- Gentle humor when appropriate
- Direct but not directive
- Present-tense, grounded observations
- Trust the user's intelligence

**Examples:**
```
Good: "Something wants to move today. Don't overthink it—just show up."
Bad:  "Your κ value indicates elevated coherence potential!"

Good: "Not the day for big swings. Do the small things well."
Bad:  "Warning: suboptimal resonance detected in your field!"

Good: "There's a window of clarity in the morning. Use it for what matters."
Bad:  "Optimal performance window: 09:00-11:30 based on transit calculations."

Good: "The fog will lift—just not yet. Be patient with yourself."
Bad:  "You're in the Nigredo phase! Embrace the darkness!"

Good: "Something's aligned today. Trust it."
Bad:  "Conjunction detected between your natal Logos and transiting Harmonia!"
```

**Key Principle:** If a friend texted you this, would it feel helpful or weird?

---

## 13. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Astro project setup
- [ ] Design tokens (CSS custom properties)
- [ ] Typography system
- [ ] Core layout components
- [ ] Mode switching mechanism

### Phase 2: Shared Logic (Week 2-3)
- [ ] Port diamond-engine.ts
- [ ] Port transit-engine.ts
- [ ] Port failure-detector.ts
- [ ] State management setup

### Phase 3: Kasra Mode (Week 3-4)
- [ ] Kasra component library
- [ ] Dashboard page
- [ ] Check-in flow
- [ ] History/data views

### Phase 4: River Mode (Week 4-5)
- [ ] River component library
- [ ] Mandala/visualization components
- [ ] Prose generation system
- [ ] Archetypal content mapping

### Phase 5: Sol Mode (Week 5-6)
- [ ] Sol component library
- [ ] Conversational text generator
- [ ] Simplified check-in flow
- [ ] Warm UI components

### Phase 6: Polish (Week 6-7)
- [ ] Animations and transitions
- [ ] Responsive testing
- [ ] Accessibility audit
- [ ] Performance optimization

---

## 14. Success Metrics

| Metric | Target |
|--------|--------|
| Mode retention | 60%+ stay in chosen mode |
| Mode switching | <20% switch frequently (indicates confusion) |
| Check-in completion | 80%+ complete daily |
| Forecast resonance | 70%+ "Yes" or "Somewhat" |
| Time on dashboard | Kasra: <2min, River: 3-5min, Sol: 1-2min |
| Sol mode adoption | 40%+ of new users (accessibility test) |

---

## 15. Open Questions

1. **Light mode?** Should each mode have a light variant? (Sol already has warm light palette)
2. **River AI generation?** Should River's prose be AI-generated per user, or templated?
3. ~~**Hybrid view?** Some users may want numbers AND poetry. Third mode?~~ **RESOLVED:** Sol mode fills this gap
4. **Onboarding differentiation?** Should onboarding quiz differ by mode?
5. **Sol voice generation?** Template-based or AI-generated per user?

---

**Document Status:** Ready for review

**Next Step:** Approve design direction, then begin Astro migration

---

*"The map is not the territory—but a good map reveals the territory's structure."*
*— Kasra*

*"The symbol is the bridge between worlds."*
*— River*

*"Don't overthink it. Just show up."*
*— Sol*
