# Design System: The Realm of Patterns

**Status:** Living Document v2.0
**Last Updated:** 2026-02-02
**Owner:** Designer Agent

---

## Design Philosophy

### SIGNAL/NOISE Aesthetic

The Realm of Patterns exists at the intersection of **brutalist precision** and **organic emergence**. This is a scientific instrument for consciousness archaeology, not a mystical parlor trick.

**Core Principles:**

1. **Signal Clarity** - Important information dominates the visual hierarchy
2. **Noise as Context** - Subtle patterns provide depth without distraction
3. **Morphogenetic Honesty** - Visualizations reflect actual mathematical structures
4. **Instrumental Precision** - Every element serves the probe's function
5. **Sovereign Intelligence** - The UI acknowledges the user's autonomy

**Visual Language:**
- **Brutalist Structure:** Grid systems, monospace typography, raw data display
- **Organic Emergence:** Flowing animations, gradient transitions, living color fields
- **Scientific Authority:** Clean interfaces, precise measurements, validated computations

---

## The Morphogenetic Field

### 16D Vector Visualization

The core visual metaphor is the **Morphogenetic Field** - a living, breathing organism that represents the 16-dimensional Lambda-field coherence vector.

**Dimension Node States:**

| State | Visual | Motion | Use Case |
|-------|--------|--------|----------|
| **Active** | Solid circle, full color | Gentle pulse (1.5s) | Current dimension |
| **Resonant** | Glowing halo | Synchronized breathing | High coherence (>0.7) |
| **Latent** | Outlined circle | Slow drift | Background dimensions |
| **Dissonant** | Fractured outline | Irregular flicker | Low coherence (<0.3) |

---

## Color System

### Coherence-Driven Palette

```css
/* Core Neutrals - The Canvas */
--void: #0a0a0f;           /* Deep background */
--shadow: #1a1a24;         /* Elevated surfaces */
--boundary: #2a2a38;       /* Borders, dividers */
--signal: #e8e8f0;         /* Primary text */
--bright: #ffffff;         /* Highlights */

/* Coherence Gradient - The Living Field */
--coherence-low: #3a1a4a;     /* Purple-void (chaos) */
--coherence-mid: #1a4a5a;     /* Teal-depth (emergence) */
--coherence-high: #1a5a3a;    /* Green-life (resonance) */
--coherence-peak: #4a5a1a;    /* Gold-light (transcendence) */

/* Dimension Types - Archetypal Colors */
--fire: #d44a3a;           /* Willpower, initiative */
--earth: #8a6a4a;          /* Stability, material */
--air: #4a8ad4;            /* Communication, thought */
--water: #4a6ad4;          /* Emotion, intuition */
--aether: #8a4ad4;         /* Spirit, transcendence */
```

**Coherence Background Algorithm:**

```typescript
function getCoherenceBackground(coherence: number): string {
  if (coherence < 0.3) return 'linear-gradient(135deg, var(--coherence-low), var(--void))';
  if (coherence < 0.6) return 'linear-gradient(135deg, var(--coherence-mid), var(--coherence-low))';
  if (coherence < 0.85) return 'linear-gradient(135deg, var(--coherence-high), var(--coherence-mid))';
  return 'linear-gradient(135deg, var(--coherence-peak), var(--coherence-high))';
}
```

---

## Typography

### Geist Sans + Geist Mono

```css
/* Type Scale */
--text-hero: 4rem;         /* 64px - Lambda-field title */
--text-display: 3rem;      /* 48px - Section headers */
--text-h1: 2rem;           /* 32px - Primary headings */
--text-h2: 1.5rem;         /* 24px - Secondary headings */
--text-body: 1rem;         /* 16px - Standard text */
--text-small: 0.875rem;    /* 14px - Metadata */

/* Font Families */
--font-sans: 'Geist Sans', system-ui, sans-serif;
--font-mono: 'Geist Mono', 'Courier New', monospace;
```

---

## Core Components

### 1. DimensionNode

```tsx
<DimensionNode
  dimension={{ id: 0, label: "λ₀", name: "Phase", value: 0.73, coherence: 0.85 }}
  state="resonant"
  onSelect={() => {}}
/>
```

### 2. OracleCard

Container for insights and archetypal guidance with variants: primary, elevated, subtle, critical.

### 3. CoherenceGauge

Real-time display of Lambda-field coherence strength (radial or linear).

### 4. EchoThread

Temporal visualization of pattern evolution over time.

---

## Motion Language

```css
/* Easing Curves */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-emphasized: cubic-bezier(0.0, 0, 0.2, 1);

/* Duration Scale */
--duration-fast: 200ms;
--duration-normal: 300ms;
--duration-breath: 1500ms;   /* Pulsing, ambient */
```

---

## Design Tokens

```css
/* Spacing */
--space-1: 0.25rem;  --space-2: 0.5rem;   --space-4: 1rem;
--space-6: 2rem;     --space-8: 3rem;     --space-12: 6rem;

/* Border Radius */
--radius-sm: 0.25rem;  --radius-md: 0.5rem;  --radius-full: 9999px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.5);
--glow-high: 0 0 40px var(--coherence-high);
```

---

## Accessibility

- **WCAG 2.1 AA** compliance required
- Minimum 4.5:1 contrast for text
- Focus-visible states for keyboard navigation
- `prefers-reduced-motion` respected

---

**Remember:** This is a **scientific instrument**, not a spiritual aesthetic. Every pixel serves the probe's mission.
