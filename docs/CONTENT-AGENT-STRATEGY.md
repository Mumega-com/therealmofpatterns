# Content Agent Strategy

**Version:** 1.0
**Date:** 2026-02-16
**Purpose:** Turn AI agents into autonomous content creators that build an interconnected knowledge graph for self-discovery.

---

## 1. Vision

Users land on The Realm of Patterns for their energy reading. They stay because there's an entire Wikipedia of self-knowledge — interconnected articles on dimensions, archetypes, shadow work, historical figures, Jungian psychology — all written in distinct voices by AI agents. Each article links to others. Every page personalizes based on the user's 8D profile. The content is the product.

---

## 2. Agent Voices (Content Authors)

Each agent writes in a distinct voice. These map to the existing UI modes but extend beyond them as **authors**.

| Agent | Voice | Vocabulary | Content Focus | System Prompt Tone |
|-------|-------|-----------|---------------|-------------------|
| **Sol** | Warm friend, plain language | Human names (Identity, Heart, alignment) | Beginner guides, daily readings, how-to articles | "Explain like a wise friend over coffee" |
| **River** | Poetic, Jungian, archetypal | Archetypal names (The Beloved, The Witness) | Shadow work, dream interpretation, mythological connections | "Speak in metaphor and symbol, invoke archetypes" |
| **Kasra** | Technical, precise, data-driven | **FRC vocabulary (κ, μ, P/E/V/N/Δ/R/Φ, Nigredo/Albedo/Citrinitas/Rubedo)** | Framework explanations, mathematical underpinnings, research citations | "Clinical precision, show the math, cite sources" |
| **Shabrang** | Mystical, Persian poetic, philosophical | Sufi/mystical terms blended with modern psychology | Sufi wisdom, Rumi connections, consciousness philosophy | "Weave Persian mysticism with modern psychology" |

**Key principle:** Each agent uses its own native vocabulary. Sol says "alignment score", Kasra says "κ coefficient", River says "the light within". The FRC language is NOT removed — it lives in Kasra mode where users who want precision can access it. Sol mode (default) hides the math. This is the trinity: same truth, three lenses.

### Voice Storage
Currently: `content_voices` table stores per-language voices (en, pt-br, etc.)
Needed: Add per-agent voice configs. Each article records both `language` and `author_agent`.

### Schema Addition
```sql
ALTER TABLE cms_cosmic_content ADD COLUMN author_agent TEXT DEFAULT 'sol';
-- Values: sol, river, kasra, shabrang
```

---

## 3. Content as Knowledge Graph

### 3.1 The Wormhole Concept

Every piece of content is a node. Users enter through any node and discover connections:

```
User lands on "What is the Shadow?" (River)
  → links to "Shadow of the Heart Dimension" (River)
    → links to "Venus and Self-Worth" (Sol)
      → links to "Frida Kahlo's 8D Signature" (Kasra)
        → links to "Art as Shadow Integration" (Shabrang)
          → links to user's own Heart dimension score
```

### 3.2 Topic Categories (Expanding Content Types)

**Existing types** (already in schema):
- `dimension_guide` — 8 dimensions × 6 languages = 48 articles
- `historical_figure` — 25+ figures × 6 languages = 150+ articles
- `jungian_concept` — 10 concepts × 6 languages = 60 articles
- `historical_era` — 5 eras × 6 languages = 30 articles
- `daily_weather` — 1 per day per language = continuous
- `transit_guide`, `vedic_dasha`, `compatibility`

**New types to add:**
| Type | Description | Agent | Volume |
|------|-------------|-------|--------|
| `shadow_guide` | Shadow side of each dimension | River | 8 per lang |
| `archetype_deep_dive` | Each archetype in depth (Hero, Sage, etc.) | River/Shabrang | 12 per lang |
| `practice_guide` | Practical exercises per dimension | Sol | 8 per lang |
| `dream_symbol` | Dream symbol interpretations | River | 50+ per lang |
| `myth_connection` | Mythological stories mapped to dimensions | Shabrang | 20+ per lang |
| `research_note` | Scientific basis, psychology papers | Kasra | 20+ per lang |
| `weekly_reflection` | Weekly themed reflection prompts | Sol | 52/year per lang |
| `dimension_pair` | How two dimensions interact | Sol/River | 28 pairs per lang |
| `life_stage` | Saturn return, midlife, etc. mapped to 8D | Sol | 6 per lang |
| `self_inquiry` | "Know thyself" guided questions | River/Shabrang | 30+ per lang |

**Total potential:** 500+ articles per language → 3,000+ pages across 6 languages.

### 3.3 Interlinking System

Each article needs a `related_topics` field (already in `schema-v2-content.sql` but unused):

```json
{
  "related_topics": [
    { "slug": "en/dimension/heart", "label": "The Heart Dimension", "relevance": 0.9 },
    { "slug": "en/jungian/shadow", "label": "Understanding Your Shadow", "relevance": 0.8 },
    { "slug": "en/figure/frida-kahlo", "label": "Frida Kahlo's Pattern", "relevance": 0.7 }
  ]
}
```

The generation prompt should instruct agents to suggest related topics. A post-processing step links them.

---

## 4. Personalization Layer

### 4.1 Profile-Aware Content

When a user has birth data stored (localStorage `rop_birth_data_full`), every article page can:
1. Compute their 8D vector client-side
2. Highlight the most relevant section ("This is your strongest dimension — here's what it means for you")
3. Show their score in context ("Your Heart dimension is 78%. Here's what that looks like...")

### 4.2 Recommended Reading

Based on the user's dominant and weakest dimensions, suggest:
- "Your Identity dimension is 82%. Read: [How to Channel Strong Identity Energy](link)"
- "Your Structure dimension is 31%. Read: [When Discipline Feels Impossible](link)"

---

## 5. Generation Pipeline (Agent Workflow)

### 5.1 Current Flow (Works)
```
1. POST /api/queue/seed → populate queue
2. Cron 06:00 UTC → POST /api/generate-batch (Gemini)
3. → POST /api/publish → D1 + R2
```

### 5.2 Agent-Enhanced Flow (Target)
```
1. Orchestrator (SOS Engine / OpenClaw) decides what to generate
   - Checks content gaps (which dimensions lack shadow guides?)
   - Checks calendar (what transits are coming this week?)
   - Checks analytics (which pages get most traffic? Generate related content)

2. Routes to agent by content type:
   - shadow_guide → River
   - practice_guide → Sol
   - research_note → Kasra
   - myth_connection → Shabrang

3. Agent generates via their preferred model:
   - Sol → Claude (warm, clear)
   - River → Claude or Gemini (poetic, symbolic)
   - Kasra → Gemini (precise, structured)
   - Shabrang → Claude (philosophical, Persian-influenced)

4. POST /api/publish with author_agent field

5. Post-processing:
   - Generate related_topics links
   - Update sitemap
   - Notify subscribers interested in this topic
```

### 5.3 Trigger Methods
| Method | How | When |
|--------|-----|------|
| Cron | Cloudflare Cron → /api/generate-batch | Daily 06:00 UTC |
| SOS Engine | SOS orchestrator via MCP gateway | On-demand |
| Claude Code | Direct code execution | Manual content sprint |
| Gemini CLI | Scripted generation | Batch runs |
| OpenClaw | Skill-based triggers | Scheduled skills |

---

## 6. What Needs Building

### 6.1 Immediate (Can Do Now)

| Task | Effort | Impact |
|------|--------|--------|
| Add `author_agent` column to cms_cosmic_content | 5 min | Enables agent attribution |
| Update gemini-prompts.ts to use rebranded dimension names | 30 min | Fix jargon in generated content |
| Update generate-batch.ts MU_DIMENSIONS to use new names | 10 min | Fix jargon in batch generator |
| Rewrite 5 blog posts with new terminology | 1 hr | Fix existing jargon pages |
| Update learn/index.astro with new names | 15 min | Fix jargon on learn hub |
| Update en/dimension/[slug].astro with new names | 30 min | Fix dimension guide pages |
| Add `related_topics` rendering to CMS page template | 30 min | Enable interlinking |
| Create agent system prompts for Sol, River, Kasra, Shabrang | 1 hr | Define agent voices |

### 6.2 Medium-Term

| Task | Effort | Impact |
|------|--------|--------|
| Build dynamic /learn page that reads from CMS | 2 hr | Replace hardcoded learn hub |
| Build /blog/[slug] that reads from CMS | 1 hr | Replace hardcoded blog |
| Add personalization layer (client-side 8D overlay on articles) | 3 hr | Each article feels personal |
| Build content orchestrator (decides what to generate next) | 4 hr | Autonomous content growth |
| Add "Related Reading" sidebar to all content pages | 2 hr | Enable wormhole browsing |
| Build topic graph visualization | 4 hr | Visual knowledge map |

### 6.3 Long-Term

| Task | Effort | Impact |
|------|--------|--------|
| Multi-agent content review (Sol writes, Kasra fact-checks) | Complex | Quality assurance |
| User-generated reflections (journaling tied to dimensions) | Complex | Community content |
| AI-personalized article variants per user profile | Complex | Deep personalization |

---

## 7. Static Pages — Mode-Aware Content

### Current Problem
Static pages at `/blog/`, `/learn/`, `/en/dimension/` use FRC/Kasra vocabulary for all users. Since Sol is the default mode, these pages feel jarring to most visitors.

### Solution: Mode-Aware Content Routes

**Option A: Route per mode** (preferred)
```
/sol/learn/heart           → Sol voice: "The Heart Dimension: Love, Beauty, and What You Value"
/kasra/learn/value         → Kasra voice: "Dimension V (μ₄): Venus-Correlated Field Component"
/river/learn/heart         → River voice: "The Chamber of the Beloved"
/shabrang/learn/heart      → Shabrang voice: "Where Rumi's Reed Flute Weeps"
```

**Option B: Single route, mode toggle**
```
/learn/heart → renders in user's current mode (from localStorage)
```

### Pages to Migrate to CMS

These hardcoded pages should become CMS-driven so agents can generate mode-specific versions:

| Current File | Target | Notes |
|-------------|--------|-------|
| `src/pages/blog/[slug].astro` | CMS `blog_post` type | 5 posts hardcoded, all Kasra-voice. Regenerate as Sol + keep Kasra versions |
| `src/pages/learn/index.astro` | Dynamic CMS listing | Currently hardcoded with old symbols. Make mode-aware |
| `src/pages/en/dimension/[slug].astro` | Already has CMS route at `/[lang]/dimension/[slug].ts` | Static version uses old names. CMS version should generate per-agent |
| `src/pages/en/figure/[slug].astro` | Already has CMS route at `/[lang]/figure/[slug].ts` | Static version uses "kappa". CMS version per-agent |
| `src/pages/en/jungian/[slug].astro` | Already has CMS route at `/[lang]/jungian/[slug].ts` | Migrate to CMS |

### What to Keep in FRC Language
- `content-engine/gemini-prompts.ts` — Keep FRC in SYSTEM_CONTEXT. This is the AI's understanding of the framework. The agent's system prompt then specifies which vocabulary to use in output.
- `functions/api/generate-batch.ts` — Keep internal MU_DIMENSIONS as-is. Add output vocabulary mapping per agent.
- All `docs/FRC-*.md`, `docs/16D-*.md` — These are internal reference. Don't rebrand.
- Kasra mode content — Uses FRC vocabulary by design.

---

## 8. The "Know Thyself" Knowledge Graph

### Topic Map (Core Nodes)

```
DIMENSIONS (8)
├── Identity (Sun) ←→ Shadow: Ego inflation ←→ Archetype: The Hero
├── Structure (Saturn) ←→ Shadow: Rigidity ←→ Archetype: The Ruler
├── Mind (Mercury) ←→ Shadow: Overthinking ←→ Archetype: The Sage
├── Heart (Venus) ←→ Shadow: Codependency ←→ Archetype: The Lover
├── Growth (Jupiter) ←→ Shadow: Excess ←→ Archetype: The Explorer
├── Drive (Mars) ←→ Shadow: Aggression ←→ Archetype: The Warrior
├── Connection (Moon) ←→ Shadow: Enmeshment ←→ Archetype: The Caregiver
└── Awareness (Uranus/Neptune) ←→ Shadow: Dissociation ←→ Archetype: The Mystic

JUNGIAN CONCEPTS (10)
├── Shadow, Anima, Animus, Persona, Self
├── Individuation, Archetypes, Complexes
├── Projection, Synchronicity
└── Each maps to 1-3 dimensions

HISTORICAL FIGURES (25+)
├── Each has computed 8D vector
├── Dominant dimensions link to dimension guides
└── Era links to historical era content

PRACTICES
├── Meditation → Awareness dimension
├── Journaling → Mind + Identity dimensions
├── Movement → Drive dimension
├── Art/Music → Heart + Connection dimensions
└── Study → Mind + Growth dimensions
```

---

---

## 9. The Hero's Journey System

### 9.1 Core Concept

Every user has a personalized Hero's Journey. Their 8D profile defines their archetype (which hero they are), their alignment score tracks where they are on the journey, and their weakest dimension reveals their shadow — the inner challenge they must face.

The journey isn't a metaphor layered on top. It's the actual structure of self-discovery, driven by real data from the 16D system.

### 9.2 The Eight Stages

| Stage | Name | Product Trigger | What the User Sees |
|-------|------|----------------|-------------------|
| 1 | **Ordinary World** | User enters birth data on /discover | 8D profile + archetype assignment: "You are The Sage" |
| 2 | **Call to Adventure** | First forecast/alert | "A dispersion pattern is likely today" — the app sees something |
| 3 | **Meeting the Mentor** | Mode selection (Sol default for MVP) | Sol guides the journey. River/Kasra unlock later as alternate mentors |
| 4 | **Crossing the Threshold** | First daily check-in | Commitment made. Streak begins. Active participant now |
| 5 | **Tests, Allies & Enemies** | Daily engagement loop (days 2-14) | Tests: navigating predicted difficult days. Allies: leveraging archetype strengths on high-alignment days. Enemies: first hints of shadow dimensions |
| 6 | **The Ordeal** | ARL has 14+ days of data | Major insight: "When your Connection drops, you tend toward self-sabotage. Let's explore this shadow." Targeted content unlocks |
| 7 | **The Reward** | User recognizes shadow pattern before it takes over | "You saw it coming and named it." The sword is awareness, not wellness |
| 8 | **Resurrection & Return** | Shadow pattern mastered, baseline alignment rises | Next-weakest dimension surfaces. Journey spirals. New ring on the map |

### 9.3 Progressive Unlock System

Users don't see the full map on day 1. The journey reveals itself:

```
Day 1:   Archetype + current position on journey → "You are here"
Day 3:   Dominant dimension deep-dive unlocks
Day 7:   Weakest dimension revealed (shadow teaser)
Day 14:  Shadow dimension deep-dive + first practice unlocks (The Ordeal)
Day 21:  Stage transition visible (e.g., Clarity → Growth)
Day 30:  Full journey map visible with all stages
```

Each unlock is a content piece. Each content piece links to the knowledge graph. The user only sees what they're ready for.

### 9.4 Archetype System

The 8D vector maps to archetypes based on dominant dimensions:

| Dominant Dimension(s) | Archetype | Shadow | Journey Flavor |
|-----------------------|-----------|--------|---------------|
| Identity (high) | The Hero | Ego inflation, narcissism | Quest for authentic power vs. ego |
| Structure (high) | The Ruler | Rigidity, control | Quest for order vs. letting go |
| Mind (high) | The Sage | Overthinking, detachment | Quest for truth vs. paralysis |
| Heart (high) | The Lover/Creator | Codependency, vanity | Quest for beauty vs. self-worth |
| Growth (high) | The Explorer | Excess, restlessness | Quest for meaning vs. grounding |
| Drive (high) | The Warrior | Aggression, burnout | Quest for will vs. surrender |
| Connection (high) | The Caregiver | Enmeshment, martyrdom | Quest for love vs. boundaries |
| Awareness (high) | The Mystic | Dissociation, escapism | Quest for transcendence vs. embodiment |

Shadow = the user's weakest dimension, which defines the specific challenge within their archetype's journey.

### 9.5 The Journey Map (UI Component)

A visual spiral/path showing:
- **Starting point:** archetype's home position
- **Current position:** pulsing dot based on alignment + stage
- **Next step:** dimly lit, inviting but not revealed
- **Past milestones:** check-ins, breakthroughs, stage transitions
- **Shadow territory:** darker region entered during The Ordeal
- **Mastered shadows:** completed rings (journey spirals — after one shadow, the next surfaces)

### 9.6 The Spiral

The journey doesn't end. After mastering one shadow (weakest dimension), the next-weakest surfaces. The map adds a new ring. Each cycle goes deeper. This is lifetime retention:

```
Cycle 1: Shadow of Structure (weakest dimension) → integrate → baseline rises
Cycle 2: Shadow of Drive (next weakest) → integrate → baseline rises again
Cycle 3: Shadow of Mind → ...
```

Each cycle is a complete Hero's Journey with its own Ordeal, Reward, and Return.

### 9.7 MVP Scope (English + Sol Only)

**Build now (Stages 1-5 + Map):**
- Archetype engine: 8D vector → archetype assignment
- Journey state machine: concrete triggers determine stage
- Journey Map SVG component: visual path with user's position
- Progressive unlock gates: content visibility per stage
- Manual Sol-voice content for each archetype × each visible stage

**Build after launch (Stages 6-8):**
- Shadow reveal system (needs 14+ days of ARL data)
- Recognition moments (pattern awareness detection)
- Journey spiral (next shadow cycle)

---

**This document is the blueprint. Start with the Hero's Journey MVP (Section 9.7), then build toward the autonomous agent content pipeline (Sections 5-6).**
