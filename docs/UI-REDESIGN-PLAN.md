# Phase 8: State-of-Art UI Redesign Plan

## Vision
Transform The Realm of Patterns into a visually stunning, immersive experience that sets it apart from generic wellness/astrology apps. Each mode should feel like entering a distinct world.

---

## Skills Available
| Skill | Purpose |
|-------|---------|
| `frontend-design` | Creative, production-grade interfaces |
| `heroui-react` | HeroUI v3 components (Tailwind + React Aria) |
| `tailwind-v4-shadcn` | Tailwind v4 + Shadcn patterns |
| `shadcn-layouts` | Layout patterns (flex, grid, scroll) |
| `ui-design-system` | Design system architecture |

---

## Design Direction by Mode

### Kasra Mode (The Architect)
**Aesthetic**: Cyberpunk terminal / Mission control / Bloomberg terminal

- **Colors**: Deep black (#0a0a0a), cyan glow (#00ff88), amber warnings
- **Typography**: Geist Mono, tabular numbers, uppercase labels
- **Effects**:
  - Scanline overlay (subtle)
  - Glow on active elements
  - Data streaming animations
  - Matrix-style number rain (subtle background)
- **Components**:
  - Gauges with neon glow
  - Cards with terminal borders
  - Blinking status indicators
  - Grid layouts with harsh lines

### River Mode (The Oracle)
**Aesthetic**: Mystical / Alchemical manuscript / Sacred geometry

- **Colors**: Stage-aware (nigredo→albedo→citrinitas→rubedo)
- **Typography**: Cormorant Garamond, elegant serifs, generous spacing
- **Effects**:
  - Breathing/pulsing animations
  - Particle systems (floating symbols)
  - Mandala rotations
  - Gradient transitions between stages
- **Components**:
  - Cards with soft borders, glass effect
  - Quotes with decorative flourishes
  - Stage glyphs with glow
  - Flowing dividers

### Sol Mode (The Friend)
**Aesthetic**: Warm minimalism / Friendly app / Notion-like

- **Colors**: Cream (#faf8f5), warm amber (#d4a373), soft shadows
- **Typography**: Inter, friendly weights, comfortable reading
- **Effects**:
  - Subtle hover lifts
  - Smooth transitions
  - Confetti on completion
  - Encouraging progress animations
- **Components**:
  - Rounded cards with soft shadows
  - Emoji-enhanced badges
  - Progress rings with gradients
  - Friendly buttons with micro-bounce

---

## Priority Order

### 1. Homepage Heroes (Issue #68)
Each mode's hero should immediately communicate its personality:
- Kasra: Data visualization, live metrics preview
- River: Animated mandala, stage glyph
- Sol: Warm greeting, simple CTA

### 2. Check-in Flows (Issue #69)
Transform from static forms to engaging journeys:
- Multi-step with progress indicator
- Animated transitions between questions
- Celebratory completion state

### 3. Dashboards (Issue #70)
Elevate data presentation:
- Kasra: Real-time feel, streaming data aesthetic
- River: Contemplative, stage-aware atmosphere
- Sol: Clear, friendly, actionable

### 4. Stage Pages (Issue #71)
Immersive educational content:
- Full-screen visual experiences
- Scroll-triggered animations
- Stage-specific atmospheres

---

## Technical Approach

### Component Architecture
```
src/components/
├── ui/                    # Shared primitives (from shadcn)
│   ├── button.tsx
│   ├── card.tsx
│   ├── progress.tsx
│   └── ...
├── kasra/                 # Kasra-specific (extend ui/)
├── river/                 # River-specific (extend ui/)
└── sol/                   # Sol-specific (extend ui/)
```

### Animation Strategy
- **Framer Motion** for React components
- **CSS animations** for simple effects
- **requestAnimationFrame** for canvas/particles

### Performance Targets
- Lighthouse: 90+ on all metrics
- FCP < 1.5s
- TTI < 3s
- Animations at 60fps

---

## Execution Order

1. **Install shadcn/ui base** → Add primitives
2. **Homepage heroes** → Visual impact first
3. **Check-in flows** → User engagement
4. **Dashboards** → Data viz excellence
5. **Stage pages** → Immersive content

---

## GitHub Issues
- #68: Homepage hero sections
- #69: Check-in flows
- #70: Dashboards
- #71: Stage pages

---

*Ready to execute with `/frontend-design`*
