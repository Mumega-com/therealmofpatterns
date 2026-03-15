# Realm of Patterns - Content Engine Plan

> Learning from mumega-cms architecture for programmatic SEO at scale

**Created:** 2026-02-01
**Updated:** 2026-03-14
**Status:** Phase 4 Mostly Complete - Schema markup, analytics tracking, admin dashboard all live. Sitemap submission to GSC pending.
**Goal:** 15,000+ unique pages across 6 languages

---

## Executive Summary

Apply mumega-cms patterns to Realm of Patterns:
- **Language x Dimension x Content-Type = Unique Page**
- **Gemini 3 Flash** with 11-key rotation (~2M tokens/day free)
- **Cloudflare edge** (D1 + KV + R2 + Pages)
- **Cultural voices** already built (Luz, Sophia, Citlali, Valentina, Isabel, Pattern Guide)
- **Daily automation** via cron workers
- **OpenClaw integration** for agent-based content delivery across messaging channels

---

## 1. Content Matrix (Page Potential)

### Formula: `Language x Dimension x ContentType x Date = Page`

| Axis | Count | Examples |
|------|-------|----------|
| **Languages** | 6 | en, pt-br, pt-pt, es-mx, es-ar, es-es |
| **Dimensions** | 8 | Identity, Structure, Mind, Heart, Growth, Drive, Connection, Awareness |
| **Content Types** | 10 | daily_weather, dimension_guide, jungian_concept, historical_figure, historical_era, vedic_dasha, transit_guide, compatibility, blog_post, archetype_profile |
| **Historical Figures** | 50+ | Rumi, Jung, Tesla, Frida Kahlo, Marcus Aurelius... |
| **Jungian Concepts** | 10 | shadow, anima, animus, persona, self, individuation, archetype, complex, projection, synchronicity |
| **Historical Eras** | 5 | ancient-origins, classical-period, islamic-golden-age, renaissance-revival, modern-rebirth |

### Page Count Estimate

```
Static Content:
  6 languages x 8 dimension guides          =    48 pages
  6 languages x 10 jungian concepts         =    60 pages
  6 languages x 50 historical figures       =   300 pages
  6 languages x 5 historical eras           =    30 pages
  6 languages x 9 vedic dasha guides        =    54 pages
  6 languages x 10 transit guides           =    60 pages
  6 languages x 28 compatibility combos     =   168 pages
                                            ─────────────
                                Subtotal:      720 pages

Daily Content (Year 1):
  6 languages x 365 days x cosmic weather   = 2,190 pages

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
    # User-facing names: Identity, Structure, Mind, Heart, Growth, Drive, Connection, Awareness
    # Internal keys: phase, existence, cognition, value, expansion, action, relation, field
    dimension_weight = {
        'phase': 10,      # Identity - universal appeal
        'relation': 9,    # Connection/Relationships - high search
        'value': 8,       # Heart/Self-worth topics
        'field': 7,       # Awareness/Spirituality seekers
    }
    score += dimension_weight.get(dimension, 5)

    return score  # max ~30 pts
```

### Batch Strategy

```
Daily Generation Budget: ~2M tokens (11 keys x ~180K each)

Allocation:
├── 6 x Daily Weather (~5K tokens each)     =  30K tokens
├── 2 x Dimension Guides (~8K tokens each)  =  16K tokens
├── 3 x Historical Figures (~6K tokens each)=  18K tokens
├── 2 x Jungian Concepts (~5K tokens each)  =  10K tokens
├── 1 x Compatibility Guide (~5K tokens)    =   5K tokens
└── Buffer for retries/images               =  20K tokens
                                            ─────────────
                              Daily Total:    ~100K tokens

Runway: 2M / 100K = 20x safety margin
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
│     └── Calculate current cosmic vector (8D)                    │
│                                                                 │
│  3. PROMPT CONSTRUCTION                                         │
│     ├── Load cultural voice (Luz, Citlali, etc.)                │
│     ├── Inject framework context (8D system)                    │
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
│  8. DELIVER VIA OPENCLAW (optional)                             │
│     ├── Push daily weather to messaging channels                │
│     ├── Sol skill formats content for Telegram/WhatsApp/etc.    │
│     └── Webhook triggers on new content publish                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. URL Structure

### Pattern: `/{lang}/{content-type}/{params}`

```
Static Pages:
├── /en/dimension/identity                  # Dimension guide (Identity)
├── /pt-br/dimensao/identidade              # Portuguese localized
├── /es-mx/dimension/identidad              # Mexican Spanish
├── /en/jungian/shadow                       # Jungian concept
├── /en/figure/rumi                          # Historical figure
├── /en/era/islamic-golden-age               # Historical era
├── /en/dasha/saturn                         # Vedic dasha
├── /en/transit/jupiter                      # Transit guide
└── /en/resonance/identity-connection        # Compatibility

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
| pt-br | Luz | Candomble, Orixas, Axe, Bahian warmth |
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
        self.keys = []  # Load from env: GEMINI_API_KEY, _2, ... _11
        self.current_index = 0
        self.error_counts = {}

    def get_next_key(self) -> str:
        # Round-robin with error tracking
        # Skip keys with 3+ errors (likely quota exhausted)
        ...
```

### Cloudflare Secrets (11 Keys Configured)

```
GEMINI_API_KEY
GEMINI_API_KEY_2
GEMINI_API_KEY_3
GEMINI_API_KEY_4
GEMINI_API_KEY_5
GEMINI_API_KEY_6
GEMINI_API_KEY_7
GEMINI_API_KEY_8
GEMINI_API_KEY_9
GEMINI_API_KEY_10
GEMINI_API_KEY_11
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
│     └── Send summary (optional Telegram/Discord via OpenClaw)   │
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

### Phase 1: Foundation (Week 1) - COMPLETE

- [x] Add `content_queue` and `cosmic_content` tables to D1
- [x] Create `/api/generate` endpoint (triggers single page generation)
- [x] Implement priority queue logic
- [x] Add quality score calculation

### Phase 2: Batch Generation (Week 2) - COMPLETE

- [x] Create `/api/batch-generate` endpoint
- [x] Implement 06:00 UTC cron for static content
- [x] Add hreflang generation
- [x] Create sitemap.xml generator (8 language-specific sitemaps)

### Phase 3: Frontend (Week 3) - COMPLETE

- [x] Create dynamic routes: `/[lang]/[type]/[slug]`
- [x] Implement content rendering components
- [x] Add language switcher
- [x] Create navigation (by dimension, by type)

### Phase 4: SEO & Analytics (Week 4) - MOSTLY COMPLETE

- [x] Add schema markup injection (Article, FAQPage, Person schemas live on all CMS pages)
- [x] Implement content_analytics tracking (schema deployed, events logged)
- [x] Create admin dashboard for generation stats (at /admin)
- [ ] Submit sitemap to Google Search Console

### Phase 5: OpenClaw Content Delivery (Planned)

- [ ] Wire daily weather publish to OpenClaw webhook
- [ ] Create Sol reading skill for messaging channels (Telegram, WhatsApp)
- [ ] Add content push notifications via OpenClaw cron skills
- [ ] Enable cross-channel content discovery (users on Telegram get links to full articles on web)

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

- [x] 48 dimension guides generated (8 x 6 languages) - COMPLETE
- [ ] 720 static pages generated (all dimension guides, figures, concepts)
- [ ] 180 daily weather pages (30 days x 6 languages)
- [ ] Sitemap indexed by Google
- [x] < 2% generation error rate (currently 0% for dimension guides)

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

### Dimension Name Mapping (Internal -> User-Facing)

| Internal Key (FRC) | User-Facing Name | Planet |
|---------------------|-----------------|--------|
| phase | Identity | Sun |
| existence | Structure | Saturn |
| cognition | Mind | Mercury |
| value | Heart | Venus |
| expansion | Growth | Jupiter |
| action | Drive | Mars |
| relation | Connection | Moon |
| field | Awareness | Uranus/Neptune |

> **Note:** Internal code (`generate-batch.ts`, `generator.py`, DB schemas) retains FRC keys (phase, existence, etc.). All user-facing content, URLs, and generated articles should use the rebranded names above.

---

*Plan created: 2026-02-01*
*Last updated: 2026-03-14*
