# Realm of Patterns - Content Engine Plan

> Learning from mumega-cms architecture for programmatic SEO at scale

**Created:** 2026-02-01
**Status:** Pre-Compaction Plan
**Goal:** 15,000+ unique pages across 6 languages

---

## Executive Summary

Apply mumega-cms patterns to Realm of Patterns:
- **Language × Dimension × Content-Type = Unique Page**
- **Gemini 3 Flash** with 6-key rotation (~1.2M tokens/day free)
- **Cloudflare edge** (D1 + KV + R2 + Pages)
- **Cultural voices** already built (Luz, Sophia, Citlali, Valentina, Isabel, Pattern Guide)
- **Daily automation** via cron workers

---

## 1. Content Matrix (Page Potential)

### Formula: `Language × Dimension × ContentType × Date = Page`

| Axis | Count | Examples |
|------|-------|----------|
| **Languages** | 6 | en, pt-br, pt-pt, es-mx, es-ar, es-es |
| **Dimensions** | 8 | phase, existence, cognition, value, expansion, action, relation, field |
| **Content Types** | 10 | daily_weather, dimension_guide, jungian_concept, historical_figure, historical_era, vedic_dasha, transit_guide, compatibility, blog_post, archetype_profile |
| **Historical Figures** | 50+ | Rumi, Jung, Tesla, Frida Kahlo, Marcus Aurelius... |
| **Jungian Concepts** | 10 | shadow, anima, animus, persona, self, individuation, archetype, complex, projection, synchronicity |
| **Historical Eras** | 5 | ancient-origins, classical-period, islamic-golden-age, renaissance-revival, modern-rebirth |

### Page Count Estimate

```
Static Content:
  6 languages × 8 dimension guides          =    48 pages
  6 languages × 10 jungian concepts         =    60 pages
  6 languages × 50 historical figures       =   300 pages
  6 languages × 5 historical eras           =    30 pages
  6 languages × 9 vedic dasha guides        =    54 pages
  6 languages × 10 transit guides           =    60 pages
  6 languages × 28 compatibility combos     =   168 pages
                                            ─────────────
                                Subtotal:      720 pages

Daily Content (Year 1):
  6 languages × 365 days × cosmic weather   = 2,190 pages

Total Year 1:                               ~3,000 pages
```

---

## 2. Priority Queue System (from mumega-cms)

### Priority Score Calculation

```python
def calculate_page_priority(language: str, content_type: str, dimension: str) -> int:
    score = 0

    # Language market size (bigger = more searches)
    language_weight = {
        'en': 10, 'es-mx': 8, 'es-ar': 7, 'es-es': 6,
        'pt-br': 7, 'pt-pt': 5
    }
    score += language_weight.get(language, 3)

    # Content type value (evergreen vs ephemeral)
    content_weight = {
        'dimension_guide': 10,      # Evergreen, high SEO value
        'jungian_concept': 9,       # Educational, shareable
        'historical_figure': 8,     # Celebrity effect
        'compatibility': 7,         # Viral potential
        'daily_weather': 5,         # Daily engagement
        'vedic_dasha': 6,           # Niche but loyal
    }
    score += content_weight.get(content_type, 3)

    # Dimension interest (based on search volume estimates)
    dimension_weight = {
        'phase': 10,      # Identity - universal appeal
        'relation': 9,    # Relationships - high search
        'value': 8,       # Self-worth topics
        'field': 7,       # Spirituality seekers
    }
    score += dimension_weight.get(dimension, 5)

    return score  # max ~30 pts
```

### Batch Strategy

```
Daily Generation Budget: ~1.2M tokens (6 keys × 200K each)

Allocation:
├── 6 × Daily Weather (~5K tokens each)     =  30K tokens
├── 2 × Dimension Guides (~8K tokens each)  =  16K tokens
├── 3 × Historical Figures (~6K tokens each)=  18K tokens
├── 2 × Jungian Concepts (~5K tokens each)  =  10K tokens
├── 1 × Compatibility Guide (~5K tokens)    =   5K tokens
└── Buffer for retries/images               =  20K tokens
                                            ─────────────
                              Daily Total:    ~100K tokens

Runway: 1.2M ÷ 100K = 12x safety margin
```

---

## 3. Content Generation Pipeline

### Flow (adapted from mumega-cms)

```
┌─────────────────────────────────────────────────────────────────┐
│                 REALM OF PATTERNS - CONTENT PIPELINE            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. QUEUE (Priority-based)                                      │
│     ├── Score calculation per page                              │
│     ├── Language rotation (avoid same-lang batches)             │
│     └── Daily limit: 10-15 pages                                │
│                                                                 │
│  2. DATA AGGREGATION                                            │
│     ├── Load voice config (content/voices/{lang}.json)          │
│     ├── Fetch dimension metadata (MU_DIMENSIONS)                │
│     ├── Get historical data (content/historical-astrology.json) │
│     └── Calculate current cosmic vector (8 Mu)                  │
│                                                                 │
│  3. PROMPT CONSTRUCTION                                         │
│     ├── Load cultural voice (Luz, Citlali, etc.)                │
│     ├── Inject FRC context (16D framework)                      │
│     ├── Add language-specific cultural references               │
│     └── Include dimension/figure/concept metadata               │
│                                                                 │
│  4. GENERATION (Gemini 3 Flash + Key Rotation)                  │
│     ├── Title + Meta (SEO optimized)                            │
│     ├── Hero content (cultural voice)                           │
│     ├── Content blocks (varied structure)                       │
│     ├── FAQ section (3-5 questions)                             │
│     └── Affirmation/meditation                                  │
│                                                                 │
│  5. POST-PROCESSING                                             │
│     ├── Schema markup (Article, FAQPage, Person)                │
│     ├── Internal linking (related dimensions, figures)          │
│     ├── Hreflang tags (6 language variants)                     │
│     └── Slug generation (localized URLs)                        │
│                                                                 │
│  6. QUALITY ASSURANCE                                           │
│     ├── Minimum word count check                                │
│     ├── Cultural appropriateness validation                     │
│     ├── SEO score (title length, meta, headings)                │
│     ├── JSON schema validation                                  │
│     └── Duplicate content check                                 │
│                                                                 │
│  7. PUBLISH                                                     │
│     ├── Save to D1 (cosmic_content table)                       │
│     ├── Store to R2 (static JSON backup)                        │
│     ├── Invalidate Cloudflare cache                             │
│     ├── Update sitemap.xml                                      │
│     └── Log to content_analytics                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. URL Structure

### Pattern: `/{lang}/{content-type}/{params}`

```
Static Pages:
├── /en/dimension/phase                      # Dimension guide
├── /pt-br/dimensao/fase                     # Portuguese localized
├── /es-mx/dimension/fase                    # Mexican Spanish
├── /en/jungian/shadow                       # Jungian concept
├── /en/figure/rumi                          # Historical figure
├── /en/era/islamic-golden-age               # Historical era
├── /en/dasha/saturn                         # Vedic dasha
├── /en/transit/jupiter                      # Transit guide
└── /en/resonance/phase-relation             # Compatibility

Daily Weather:
├── /en/cosmic-weather/2026-02-01            # English
├── /es-mx/clima-cosmico/2026-02-01          # Mexican Spanish
└── /pt-br/clima-cosmico/2026-02-01          # Brazilian Portuguese
```

### Slug Localization Map

```typescript
const SLUG_MAP = {
  'dimension': {
    'en': 'dimension', 'pt-br': 'dimensao', 'pt-pt': 'dimensao',
    'es-mx': 'dimension', 'es-ar': 'dimension', 'es-es': 'dimension'
  },
  'cosmic-weather': {
    'en': 'cosmic-weather', 'pt-br': 'clima-cosmico', 'pt-pt': 'clima-cosmico',
    'es-mx': 'clima-cosmico', 'es-ar': 'clima-cosmico', 'es-es': 'clima-cosmico'
  },
  'figure': {
    'en': 'figure', 'pt-br': 'figura', 'pt-pt': 'figura',
    'es-mx': 'figura', 'es-ar': 'figura', 'es-es': 'figura'
  }
  // ...
};
```

---

## 5. Data Model (D1 Schema Additions)

### New Tables Needed

```sql
-- Content generation queue
CREATE TABLE content_queue (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  language TEXT NOT NULL,
  params TEXT NOT NULL,  -- JSON: {dimension: 'phase'} or {figure: 'rumi'}
  priority_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',  -- pending, generating, completed, failed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT
);

-- Generated content (main storage)
CREATE TABLE cosmic_content (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  canonical_slug TEXT NOT NULL,
  content_type TEXT NOT NULL,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT,
  hero_content TEXT,
  content_blocks TEXT,  -- JSON array
  faqs TEXT,           -- JSON array
  schema_markup TEXT,  -- JSON
  hreflang_map TEXT,   -- JSON
  quality_score INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT FALSE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  expires_at TEXT      -- For daily weather
);

-- Content analytics
CREATE TABLE content_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- view, share, email_capture
  language TEXT,
  country TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES cosmic_content(id)
);

-- Generation stats
CREATE TABLE generation_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  api_key_suffix TEXT,  -- Last 8 chars for tracking
  tokens_used INTEGER DEFAULT 0,
  pages_generated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 6. Voice System (Already Built)

### Current Voices (content/voices/*.json)

| Language | Voice | Cultural Framework |
|----------|-------|-------------------|
| en | Pattern Guide | Jungian, Campbell, mathematical precision |
| pt-br | Luz | Candomblé, Orixás, Axé, Bahian warmth |
| pt-pt | Sophia | Saudade, Fado, Descobrimentos, Atlantic mysticism |
| es-mx | Citlali | Nahual/Tonal, Curanderismo, Maya cosmology |
| es-ar | Valentina | Heavy Jungian, Buenos Aires psychoanalytic |
| es-es | Isabel | Al-Andalus astronomy, Duende, Mediterranean |

### Voice Loading

```python
async def load_voice(language: str) -> Dict:
    """Load voice configuration from JSON file."""
    voice_path = Path(f"content/voices/{language}.json")
    if voice_path.exists():
        return json.loads(voice_path.read_text())
    return DEFAULT_VOICE
```

---

## 7. API Key Rotation (Already Built)

### GeminiKeyRotator (content-engine/generator.py)

```python
class GeminiKeyRotator:
    def __init__(self):
        self.keys = []  # Load from env: GEMINI_API_KEY, _2, _3, _4, _5, _6
        self.current_index = 0
        self.error_counts = {}

    def get_next_key(self) -> str:
        # Round-robin with error tracking
        # Skip keys with 3+ errors (likely quota exhausted)
        ...
```

### Cloudflare Secrets (Already Set)

```
✅ GEMINI_API_KEY
✅ GEMINI_API_KEY_2
✅ GEMINI_API_KEY_3
✅ GEMINI_API_KEY_4
✅ GEMINI_API_KEY_5
✅ GEMINI_API_KEY_6
```

---

## 8. Cron Schedule

### Daily Automation

```
┌─────────────────────────────────────────────────────────────────┐
│  CRON SCHEDULE                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  00:00 UTC - Daily Weather Generation                           │
│     ├── Generate for all 6 languages                            │
│     ├── Store in D1 (cosmic_weather_content)                    │
│     └── ~30K tokens                                             │
│                                                                 │
│  06:00 UTC - Static Content Batch                               │
│     ├── Pull top 10 from content_queue                          │
│     ├── Generate dimension guides, figures, etc.                │
│     └── ~70K tokens                                             │
│                                                                 │
│  12:00 UTC - Quality Check & Cleanup                            │
│     ├── Validate generated content                              │
│     ├── Mark failed items for retry                             │
│     └── Update sitemap                                          │
│                                                                 │
│  18:00 UTC - Analytics & Reporting                              │
│     ├── Aggregate daily stats                                   │
│     └── Send summary (optional Telegram/Discord)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. SEO Schema Markup

### Article Schema (for all content)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{title}}",
  "description": "{{meta_description}}",
  "author": {
    "@type": "Organization",
    "name": "The Realm of Patterns"
  },
  "publisher": {
    "@type": "Organization",
    "name": "The Realm of Patterns",
    "logo": "https://therealmofpatterns.com/logo.png"
  },
  "datePublished": "{{created_at}}",
  "dateModified": "{{updated_at}}",
  "inLanguage": "{{language}}"
}
```

### FAQPage Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{{question}}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{{answer}}"
      }
    }
  ]
}
```

### Person Schema (Historical Figures)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "{{figure_name}}",
  "description": "{{bio_summary}}",
  "birthDate": "{{birth_date}}",
  "deathDate": "{{death_date}}"
}
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Add `content_queue` and `cosmic_content` tables to D1
- [ ] Create `/api/generate` endpoint (triggers single page generation)
- [ ] Implement priority queue logic
- [ ] Add quality score calculation

### Phase 2: Batch Generation (Week 2)

- [ ] Create `/api/batch-generate` endpoint
- [ ] Implement 06:00 UTC cron for static content
- [ ] Add hreflang generation
- [ ] Create sitemap.xml generator

### Phase 3: Frontend (Week 3)

- [ ] Create dynamic routes: `/[lang]/[type]/[slug]`
- [ ] Implement content rendering components
- [ ] Add language switcher
- [ ] Create navigation (by dimension, by type)

### Phase 4: SEO & Analytics (Week 4)

- [ ] Add schema markup injection
- [ ] Implement content_analytics tracking
- [ ] Create admin dashboard for generation stats
- [ ] Submit sitemap to Google Search Console

---

## 11. Files to Create/Modify

### New Files

```
content-engine/
├── queue.py              # Priority queue management
├── publisher.py          # D1/R2 publishing
├── schema_generator.py   # JSON-LD schema markup
└── sitemap_generator.py  # Dynamic sitemap.xml

functions/api/
├── generate.ts           # Single page generation
├── batch-generate.ts     # Batch generation endpoint
├── content/[slug].ts     # Content retrieval API
└── sitemap.xml.ts        # Dynamic sitemap

src/
├── pages/[lang]/[type]/[slug].tsx  # Dynamic content pages
└── components/
    ├── ContentRenderer.tsx
    ├── LanguageSwitcher.tsx
    └── DimensionNav.tsx
```

### Modify Existing

```
content-engine/generator.py    # Add queue integration, hreflang
workers/cron-worker.ts         # Add 06:00, 12:00, 18:00 triggers
src/db/schema-v2-content.sql   # Add new tables
wrangler.toml                  # Add new cron schedules
```

---

## 12. Success Metrics

### Month 1

- [ ] 720 static pages generated (all dimension guides, figures, concepts)
- [ ] 180 daily weather pages (30 days × 6 languages)
- [ ] Sitemap indexed by Google
- [ ] < 2% generation error rate

### Month 3

- [ ] 2,000+ total pages
- [ ] Organic traffic from long-tail keywords
- [ ] Email capture > 100/month
- [ ] Average quality score > 80

### Month 6

- [ ] 5,000+ total pages
- [ ] Top 10 for "[dimension] meaning" queries
- [ ] Living Vector subscription conversions
- [ ] < $0 infrastructure cost (all free tier)

---

## 13. Quick Reference for Post-Compaction

### Key Commands

```bash
# Generate single page
python content-engine/generator.py --type dimension_guide --dimension phase --lang en

# Run priority queue
python content-engine/queue.py --batch 10

# Check generation stats
python content-engine/generator.py --stats

# Deploy
npm run deploy
```

### Key Files

| File | Purpose |
|------|---------|
| `content-engine/generator.py` | Main content generation |
| `content/voices/*.json` | Cultural voice configs |
| `functions/api/daily-update.ts` | Daily weather cron |
| `workers/cron-worker.ts` | Scheduled triggers |
| `docs/CONTENT-STRATEGY-2026.md` | Full content strategy |

### Key Tables

| Table | Purpose |
|-------|---------|
| `content_queue` | Generation priority queue |
| `cosmic_content` | Generated pages |
| `cosmic_weather_content` | Daily weather cache |
| `content_analytics` | Page view tracking |

---

*Plan created: 2026-02-01*
*Ready for compaction and implementation*
