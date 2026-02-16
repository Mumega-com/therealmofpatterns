# The Realm of Patterns: Design Vision

**Version:** 3.0
**Status:** CANONICAL REFERENCE
**Date:** 2026-02-16
**Approach:** Apple Human Interface Guidelines + Energy Pattern Framework

---

## 1. Design Philosophy

### Core Principle: Clarity Through Trinity

The app presents **one truth through three lenses**:

| Mode | Metaphor | User Need |
|------|----------|-----------|
| **Kasra** | Scientific instrument | "Show me the data" |
| **River** | Oracle consultation | "Guide me with meaning" |
| **Sol** (default) | Wise friend | "Talk to me simply" |

All three modes render the **same mathematical state**. The difference is representation, not computation.

### Apple HIG Principles Applied

| Principle | Application |
|-----------|-------------|
| **Clarity** | Data is legible in Kasra; symbols are clear in River |
| **Deference** | UI recedes; user's consciousness state is the content |
| **Depth** | Alignment level creates visual depth (low=flat, high=dimensional) |
| **Direct Manipulation** | Sliders, gestures affect state in real-time |
| **Consistency** | Same gestures work in both modes |
| **Feedback** | Every input produces immediate visual + haptic response |
| **Metaphors** | Diamond/octahedron = energy; color = alignment |

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
│  REALM OF PATTERNS                    [Kasra] [River] [Sol] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ALIGNMENT STATE          2026-02-16 14:32:07 UTC          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Alignment          0.67          ▓▓▓▓▓▓▓░░░  67%        │
│  Stage              GROWTH        (0.50-0.75)              │
│  Pattern Alert      NONE                                    │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ENERGY PROFILE                                             │
│  ☀ Identity: 0.72  ♄ Structure: 0.65  ☿ Mind: 0.78        │
│  ♀ Heart: 0.69     ♃ Growth: 0.71     ♂ Drive: 0.64       │
│  ☽ Connection: 0.73  ♅ Awareness: 0.81                     │
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
/* Reset (0.00-0.25) - Breaking down to rebuild */
--river-nigredo-bg: linear-gradient(180deg, #0a0a12 0%, #1a1a24 100%);
--river-nigredo-text: #8888aa;
--river-nigredo-accent: #4a4a6a;

/* Clarity (0.25-0.50) - Seeing things as they are */
--river-albedo-bg: linear-gradient(180deg, #1a1a24 0%, #2a2a3a 100%);
--river-albedo-text: #c0c0d0;
--river-albedo-accent: #8888bb;

/* Growth (0.50-0.75) - Stepping into power */
--river-citrinitas-bg: linear-gradient(180deg, #1a1812 0%, #2a2418 100%);
--river-citrinitas-text: #e8e0d0;
--river-citrinitas-accent: #d4a854;

/* Flow (0.75-1.00) - Everything clicking */
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
│                                    [Kasra] [River] [Sol]    │
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
│                    of Growth                                │
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
- Data visualizations: Radar chart (8D), Natal wheel, dimension bars
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

### 3.1 Alignment Score Display

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Shape | Horizontal bar | Radial mandala | Arc gauge |
| Label | "κ = 0.67" | "Illumination" | "72% aligned" |
| Color | Single accent | Stage gradient | Gold gradient |
| Motion | Snap update | Breathing pulse | Smooth transition |

### 3.2 8D Visualization

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Primary | Data table | — | Radar chart (spider) |
| Secondary | Raw vector values | Poetic dimension names | Dimension bars with % |
| Birth chart | — | — | Natal wheel (zodiac + planets) |

**RadarChart component** (`src/components/charts/RadarChart.tsx`):
- Pure SVG, zero dependencies
- 8 axes with dimension symbols and names
- Animated polygon with gold gradient fill
- Pulsing dot on dominant dimension
- Optional overlay for comparing two vectors

**NatalWheel component** (`src/components/charts/NatalWheel.tsx`):
- Pure SVG, zero dependencies
- Computes planetary positions via ephemeris engine
- 12 zodiac segments with sign symbols
- 10 planet dots with distinct colors
- Ascendant marker, retrograde indicators
- Legend with top 5 placements

### 3.3 Pattern Alerts

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Style | Red banner, code | Gentle warning card | Soft amber notice |
| Copy | "DETECTED: COLLAPSE" | "The ground feels unstable..." | "Something feels off: energy drop" |
| Action | "View Diagnostics" | "What can I do?" | "Here's what might help" |

### 3.4 Daily Forecast

| Mode | Kasra | River | Sol |
|------|-------|-------|-----|
| Format | Table with metrics | Prose paragraph | Conversational text |
| Data | Raw scores, optimal hours | Archetypal guidance | Plain language insight |
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
Home (/)
├── Discover (/discover) — Birthday-first onboarding
│   ├── Birthday input
│   ├── Energy profile (radar chart + natal wheel)
│   └── Archetype match
├── Today's Reading (/reading) — Daily cosmic reading
│   ├── Cosmic events
│   ├── Dimension spotlight
│   └── Energy field radar
├── Check-in (/sol/checkin) — Daily energy check
│   ├── 6-question flow
│   ├── Alignment score
│   └── Personal forecast
├── Forecast (/forecast) — Personal daily forecast
├── History (/history) — Energy trends over time
├── Weather (/weather) — Planetary conditions
└── Subscribe (/subscribe) — Pro / Team pricing
```

### 4.2 Header Nav

```
┌─────────────────────────────────────────────────────────────┐
│  ◈ Realm    ☽ Today    ◈ My Pattern    ✦ Go Pro            │
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
<div aria-label="Alignment score: 0.67, 67 percent">
  Alignment = 0.67 ▓▓▓▓▓▓▓░░░
</div>

<!-- River -->
<div aria-label="You are in the Growth stage, alignment level 67 percent">
  The Golden Light of Growth
</div>

<!-- Sol -->
<div aria-label="You are 67 percent aligned today">
  67% aligned
</div>
```

---

## 11. Technical Architecture

### 11.1 Framework

**Astro + React Islands**

```
src/
├── components/
│   ├── charts/           # Data visualizations
│   │   ├── RadarChart.tsx     # 8D spider chart (SVG)
│   │   └── NatalWheel.tsx     # Birth chart wheel (SVG)
│   ├── discover/         # Onboarding flow
│   │   ├── DiscoverFlow.tsx   # Birthday → preview → checkin
│   │   └── PreviewResult.tsx  # Radar + natal + archetype
│   ├── reading/          # Daily reading components
│   │   └── DailyReading.tsx   # Daily cosmic reading
│   ├── checkin/          # Check-in flow
│   │   └── CheckinFlowEnhanced.tsx
│   ├── shared/           # Header, Footer, Streak, Email
│   └── dashboard/        # Dashboard gauges + sparklines
├── layouts/
│   └── Layout.astro      # Shared layout (mode-aware)
├── pages/
│   ├── index.astro       # Homepage
│   ├── discover.astro    # Birthday-first onboarding
│   ├── reading/          # Daily cosmic reading
│   ├── forecast/         # Personal forecasts
│   ├── weather/          # Cosmic weather
│   ├── history.astro     # Energy trends
│   ├── subscribe.astro   # Pricing (Free / Pro / Team)
│   └── sol/              # Sol mode pages (default)
├── stores/               # Nanostores state management
├── styles/               # Global CSS + design tokens
└── lib/
    ├── 16d-engine.ts           # 8D/16D vector computation
    ├── ephemeris-fallback.ts   # Client-side planetary positions
    ├── transit-engine.ts       # Transit calculations
    └── preview-compute.ts      # Client-side preview wrapper
```

### 11.2 State Management

```typescript
interface AppState {
  mode: 'kasra' | 'river' | 'sol';  // Sol is default
  user: {
    birthData?: BirthData;  // Year, month, day, optional time/location
    vector?: number[];       // 8D energy profile
    email?: string;
    isPro: boolean;
  };
  current: {
    kappa: number;           // Alignment score (0-1)
    stage: 'nigredo' | 'albedo' | 'citrinitas' | 'rubedo';
    failureMode: 'healthy' | 'collapse' | 'inversion' | 'dissociation' | 'dispersion';
  };
  history: CheckinData[];
}

// Display names for stages (user-facing)
const STAGE_DISPLAY = {
  nigredo:    { name: 'Reset',   tagline: 'Breaking down to rebuild', icon: '☽' },
  albedo:     { name: 'Clarity', tagline: 'Seeing clearly',          icon: '✧' },
  citrinitas: { name: 'Growth',  tagline: 'Stepping into power',     icon: '☼' },
  rubedo:     { name: 'Flow',    tagline: 'Everything clicking',     icon: '◆' },
};
```

### 11.3 Mode Switching

```typescript
// Instant switch with persisted preference (Sol is default)
function setMode(mode: 'kasra' | 'river' | 'sol') {
  document.documentElement.dataset.mode = mode;
  localStorage.setItem('rop_mode', mode);
}

// CSS handles the rest
[data-mode="kasra"] { /* Kasra styles */ }
[data-mode="river"] { /* River styles */ }
[data-mode="sol"]   { /* Sol styles (default) */ }
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
Good: "Alignment = 0.67 ± 0.05. Moderate alignment."
Bad:  "Your energy is flowing nicely today!"

Good: "Energy drop risk elevated (34%). Monitor alignment."
Bad:  "Watch out, you might crash!"

Good: "Optimal focus window: 09:00-11:30 (alignment > 0.7)"
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

## 13. Implementation Status

### Phase 1: Foundation — COMPLETE
- [x] Astro project setup with Cloudflare Pages
- [x] Design tokens (CSS custom properties)
- [x] Typography system (Inter, Cormorant Garamond, Geist Mono)
- [x] Core layout components
- [x] Mode switching mechanism (Sol default)

### Phase 2: Core Engine — COMPLETE
- [x] 8D/16D vector computation engine
- [x] Client-side ephemeris (VSOP87 orbital elements)
- [x] Transit engine
- [x] Nanostores state management

### Phase 3: Sol Mode (Default) — COMPLETE
- [x] Birthday-first onboarding (/discover)
- [x] Radar chart (8D spider visualization)
- [x] Natal wheel (birth chart)
- [x] Daily reading page (/reading)
- [x] Check-in flow with 6 questions
- [x] Personal forecast (/forecast)
- [x] Energy history dashboard (/history)
- [x] Streak tracking, email capture
- [x] Calibration system (self-improving predictions)

### Phase 4: UX Rebrand — COMPLETE
- [x] Human-friendly dimension names (Identity, Structure, Mind, Heart, Growth, Drive, Connection, Awareness)
- [x] Stage names (Reset, Clarity, Growth, Flow)
- [x] Jargon-free metrics (alignment score, energy profile)
- [x] Simplified navigation (3 links)
- [x] Clean pricing (Free / Pro $9/mo / Team $29/seat)

### Phase 5: Next
- [ ] Riso-style visual texture integration
- [ ] Team features (shared profiles, sync dashboard)
- [ ] River + Kasra mode parity with Sol
- [ ] Performance optimization + accessibility audit

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

1. **Light mode?** Should each mode have a light variant? (Sol already has warm light palette defined)
2. **River AI generation?** Should River's prose be AI-generated per user, or templated?
3. ~~**Hybrid view?** Some users may want numbers AND poetry. Third mode?~~ **RESOLVED:** Sol mode fills this gap
4. **Riso art integration?** Style3 risograph assets exist but aren't yet used in UI — decorative texture or functional illustration?
5. **Team features?** Shared profiles and sync dashboard are planned but not built

---

**Document Status:** Living reference (updated 2026-02-16)

**Current Focus:** Sol mode is live and default. Iterating on engagement and visual polish.

---

*"The map is not the territory—but a good map reveals the territory's structure."*
*— Kasra*

*"The symbol is the bridge between worlds."*
*— River*

*"Don't overthink it. Just show up."*
*— Sol*
