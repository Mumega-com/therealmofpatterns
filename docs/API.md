# API Reference

Base URL: `https://therealmofpatterns.pages.dev/api`

---

## Table of Contents

1. [Public Endpoints](#public-endpoints)
2. [Payment Endpoints](#payment-endpoints)
3. [Authenticated Endpoints](#authenticated-endpoints)
4. [CMS Admin Endpoints](#cms-admin-endpoints)
5. [Sitemap Endpoints](#sitemap-endpoints)
6. [Error Responses](#error-responses)
7. [TypeScript Types](#typescript-types)

---

## Public Endpoints

### POST /api/preview

Generate a free 8D preview based on birth data.

**Request:**
```json
{
  "birth_data": {
    "year": 1990,
    "month": 6,
    "day": 15,
    "hour": 14,
    "minute": 30,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timezone_offset": -5
  }
}
```

**Response:**
```json
{
  "success": true,
  "vector": [0.72, 0.45, 0.88, 0.56, 0.91, 0.33, 0.67, 0.79],
  "dominant": {
    "index": 4,
    "symbol": "N",
    "name": "Expansion",
    "value": 0.91,
    "description": "Growth & Meaning"
  },
  "archetype": {
    "name": "Rumi",
    "era": "1207-1273",
    "culture": "Persian",
    "resonance": 0.87,
    "quote": "What you seek is seeking you."
  },
  "teaser": "Your Expansion dimension shows strong growth energy..."
}
```

**Rate Limit:** 10 requests/hour per IP

---

### GET /api/weather

Get the current cosmic weather (today's 8D field state).

**Response:**
```json
{
  "date": "2026-02-01",
  "vector": [0.65, 0.72, 0.58, 0.81, 0.44, 0.69, 0.53, 0.77],
  "dominant": {
    "symbol": "V",
    "name": "Value",
    "description": "A day for beauty and harmony"
  },
  "influences": [
    {
      "planet": "Venus",
      "sign": "Pisces",
      "aspect": "Trine Jupiter",
      "meaning": "Expansive love and creativity"
    }
  ]
}
```

---

## Payment Endpoints

### POST /api/checkout

Create a Stripe checkout session for premium report.

**Request:**
```json
{
  "product_id": "premium_16d_report",
  "birth_data": {
    "year": 1990,
    "month": 6,
    "day": 15,
    "hour": 14,
    "minute": 30,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timezone_offset": -5
  },
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Products:**
| ID | Price | Description |
|----|-------|-------------|
| `premium_16d_report` | $497 | 40+ page PDF report |
| `complete_bundle` | $697 | Report + print + booklet |

**Response:**
```json
{
  "session_id": "cs_live_...",
  "url": "https://checkout.stripe.com/..."
}
```

---

### POST /api/webhook

Stripe webhook handler. Called by Stripe, not by clients.

**Headers:**
- `Stripe-Signature`: Webhook signature

**Events Handled:**
- `checkout.session.completed` - Trigger report generation
- `payment_intent.payment_failed` - Log failure

---

## Authenticated Endpoints

These require a valid session token from a completed purchase.

### GET /api/report/:id

Download a generated PDF report.

**Headers:**
- `Authorization: Bearer <session_token>`

**Response:**
- Content-Type: `application/pdf`
- Body: PDF binary data

**Errors:**
- `401`: Invalid or expired session
- `404`: Report not found
- `403`: Report belongs to different user

---

### POST /api/compute

Compute full 16D vector with all matches (for premium users).

**Headers:**
- `Authorization: Bearer <session_token>`

**Response:**
```json
{
  "vector_8d": [0.72, 0.45, 0.88, 0.56, 0.91, 0.33, 0.67, 0.79],
  "vector_16d": [0.72, 0.45, 0.88, 0.56, 0.91, 0.33, 0.67, 0.79,
                 0.28, 0.55, 0.12, 0.44, 0.09, 0.67, 0.33, 0.21],
  "dimensions": {
    "P": { "value": 0.72, "rank": 3, "name": "Phase", "shadow": 0.28 },
    "E": { "value": 0.45, "rank": 6, "name": "Existence", "shadow": 0.55 }
  },
  "historical_matches": [
    {
      "name": "Rumi",
      "resonance": 0.87,
      "culture": "Persian",
      "quote": "What you seek is seeking you."
    }
  ],
  "art_url": "https://therealmofpatterns.pages.dev/art/abc123.png"
}
```

---

### POST /api/share

Share results to social media.

**Headers:**
- `Authorization: Bearer <session_token>`

**Request:**
```json
{
  "platform": "twitter",
  "message": "I just discovered my cosmic identity!",
  "include_image": true
}
```

**Platforms:** `twitter`, `telegram`, `discord`

**Response:**
```json
{
  "success": true,
  "post_url": "https://twitter.com/..."
}
```

---

## CMS Admin Endpoints

All CMS endpoints require authentication via `X-Admin-Key` header or `admin_key` body parameter.

### POST /api/queue/seed

Seed the content generation queue with items for specified languages and content types.

**Headers:**
- `X-Admin-Key: <ADMIN_KEY>`

**Request:**
```json
{
  "languages": ["en", "pt-br", "es-mx"],
  "content_types": ["dimension_guide"],
  "priority": 5
}
```

**Content Types:**
| Type | Description | Count per Language |
|------|-------------|-------------------|
| `dimension_guide` | 8 dimension explainers | 8 |
| `jungian_concept` | Jung psychology concepts | 12 |
| `historical_figure` | Famous historical figures | 20+ |
| `historical_era` | Historical era analysis | 10 |
| `daily_weather` | Cosmic weather reports | 1/day |

**Languages:**
| Code | Language |
|------|----------|
| `en` | English |
| `pt-br` | Brazilian Portuguese |
| `pt-pt` | European Portuguese |
| `es-mx` | Mexican Spanish |
| `es-ar` | Argentine Spanish |
| `es-es` | Castilian Spanish |

**Response:**
```json
{
  "success": true,
  "seeded": 24,
  "duplicates_skipped": 0,
  "items": [
    {
      "id": "uuid",
      "content_type": "dimension_guide",
      "language": "en",
      "dimension": "phase"
    }
  ]
}
```

---

### GET /api/queue/stats

Get content queue statistics.

**Headers:**
- `X-Admin-Key: <ADMIN_KEY>`

**Response:**
```json
{
  "queue": {
    "total": 90,
    "pending": 7,
    "processing": 0,
    "completed": 70,
    "failed": 13
  },
  "by_type": {
    "dimension_guide": { "total": 48, "completed": 48 },
    "jungian_concept": { "total": 12, "completed": 12 },
    "historical_figure": { "total": 20, "completed": 10 },
    "historical_era": { "total": 10, "completed": 0 }
  },
  "by_language": {
    "en": { "total": 15, "completed": 15 },
    "pt-br": { "total": 15, "completed": 15 },
    "pt-pt": { "total": 15, "completed": 15 },
    "es-mx": { "total": 15, "completed": 15 },
    "es-ar": { "total": 15, "completed": 10 },
    "es-es": { "total": 15, "completed": 10 }
  }
}
```

---

### POST /api/generate-batch

Generate content for pending queue items.

**Headers:**
- `X-Admin-Key: <ADMIN_KEY>`

**Request:**
```json
{
  "batch_size": 8,
  "content_type": "dimension_guide"
}
```

**Response:**
```json
{
  "success": true,
  "processed": 8,
  "generated": 7,
  "failed": 1,
  "results": [
    {
      "id": "uuid",
      "status": "completed",
      "slug": "en/dimension/phase",
      "word_count": 1250,
      "generation_time_ms": 3500
    }
  ],
  "errors": [
    {
      "id": "uuid",
      "error": "RATE_LIMITED",
      "message": "Gemini API rate limit exceeded"
    }
  ]
}
```

**Features:**
- **11-Key Rotation**: Automatically rotates through 11 Gemini API keys
- **Priority Queue**: Processes highest priority items first
- **Error Recovery**: Marks failed items for retry with exponential backoff

---

### POST /api/daily-update

Cron-triggered endpoint for daily content generation and weather updates.

**Headers:**
- `X-Admin-Key: <ADMIN_KEY>`

**Request:**
```json
{
  "generate_weather": true,
  "process_queue": true,
  "batch_size": 10
}
```

**Response:**
```json
{
  "success": true,
  "weather_generated": true,
  "weather_date": "2026-02-01",
  "queue_processed": 10,
  "queue_remaining": 7
}
```

**Cron Schedule:**
| Time (UTC) | Trigger |
|------------|---------|
| 00:00 | Daily weather generation |
| 06:00 | Queue processing batch |
| 12:00 | Queue processing batch |
| 18:00 | Sitemap regeneration |

---

### POST /api/quality-check

Validate content quality and retry failed queue items.

**Headers:**
- `X-Admin-Key: <ADMIN_KEY>`

**Request:**
```json
{
  "retry_failed": true,
  "max_retries": 3,
  "quality_threshold": 0.5
}
```

**Response:**
```json
{
  "success": true,
  "checked": 90,
  "passed": 87,
  "failed": 3,
  "retried": 5,
  "errors": [
    "en/dimension/phase: title too short, meta description too short"
  ]
}
```

**Quality Checks:**
- Title length (10-70 characters)
- Meta description length (50-160 characters)
- Content blocks validation (JSON structure)
- Word count minimum (300 words)
- Placeholder text detection

**Actions:**
- Updates quality scores in `cms_cosmic_content`
- Unpublishes critically low quality content (score < 30)
- Resets failed queue items for retry

---

### POST /api/sitemap-analytics

Regenerate sitemaps and aggregate analytics.

**Headers:**
- `X-Admin-Key: <ADMIN_KEY>`

**Request:**
```json
{
  "regenerate_sitemap": true,
  "include_analytics": true
}
```

**Response:**
```json
{
  "success": true,
  "pages_indexed": 90,
  "sitemap_updated": true,
  "sitemaps_generated": [
    "sitemap.xml",
    "sitemap-en.xml",
    "sitemap-pt-br.xml",
    "sitemap-pt-pt.xml",
    "sitemap-es-mx.xml",
    "sitemap-es-ar.xml",
    "sitemap-es-es.xml",
    "sitemap-index.xml"
  ],
  "analytics_summary": {
    "total_views": 1250,
    "unique_visitors": 890,
    "top_pages": [
      { "slug": "en/dimension/phase", "views": 120 },
      { "slug": "pt-br/dimensao/fase", "views": 85 }
    ],
    "views_by_language": {
      "en": 500,
      "pt-br": 300,
      "es-mx": 200
    },
    "views_by_content_type": {
      "dimension_guide": 800,
      "jungian_concept": 250
    }
  }
}
```

---

## Sitemap Endpoints

### GET /sitemap.xml

Main sitemap with all published content.

**Response:** XML sitemap following [sitemaps.org protocol](https://www.sitemaps.org/protocol.html)

**Caching:** 1 hour in R2/KV

---

### GET /sitemap-index.xml

Sitemap index listing all language-specific sitemaps.

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://therealmofpatterns.com/sitemaps/en.xml</loc>
    <lastmod>2026-02-01</lastmod>
  </sitemap>
  <!-- ... other languages ... -->
</sitemapindex>
```

---

### GET /sitemaps/:lang.xml

Language-specific sitemap with hreflang alternates.

**Languages:** `en`, `pt-br`, `pt-pt`, `es-mx`, `es-ar`, `es-es`

**Example:** `/sitemaps/pt-br.xml`

**Features:**
- Proper hreflang tags for all language variants
- Priority based on content type
- Change frequency based on content type
- Google's 50,000 URL limit per sitemap

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait 1 hour.",
    "retry_after": 3600
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Malformed request body |
| `UNAUTHORIZED` | 401 | Missing or invalid admin key |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `PAYMENT_REQUIRED` | 402 | Premium feature required |
| `RATE_LIMITED` | 429 | Too many requests |
| `CONFIGURATION_ERROR` | 500 | Missing environment variable |
| `INTERNAL_ERROR` | 500 | Server error |

---

## TypeScript Types

```typescript
// Birth Data
interface BirthData {
  year: number;       // 1900-2100
  month: number;      // 1-12
  day: number;        // 1-31
  hour?: number;      // 0-23, defaults to 12
  minute?: number;    // 0-59, defaults to 0
  latitude?: number;  // -90 to 90
  longitude?: number; // -180 to 180
  timezone_offset?: number; // -12 to 14
}

// 8D Vector
interface Vector8D {
  P: number;  // Phase
  E: number;  // Existence
  μ: number;  // Cognition
  V: number;  // Value
  N: number;  // Expansion
  Δ: number;  // Action
  R: number;  // Relation
  Φ: number;  // Field
}

// Historical Figure
interface HistoricalFigure {
  name: string;
  era: string;
  culture: string;
  vector: number[];
  resonance: number;
  quote: string;
  domains: string[];
}

// Preview Response
interface PreviewResponse {
  success: boolean;
  vector: number[];
  dominant: {
    index: number;
    symbol: string;
    name: string;
    value: number;
    description: string;
  };
  archetype: HistoricalFigure;
  teaser: string;
}

// Queue Item
interface QueueItem {
  id: string;
  content_type: string;
  language: string;
  dimension?: string;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// CMS Content
interface CMSContent {
  id: string;
  slug: string;
  canonical_slug: string;
  language: string;
  content_type: string;
  title: string;
  meta_description: string;
  content_blocks: ContentBlock[];
  quality_score: number;
  word_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// Content Block
interface ContentBlock {
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'callout';
  content: string;
  level?: number;
  items?: string[];
}

// Quality Check Result
interface QualityCheckResult {
  success: boolean;
  checked: number;
  passed: number;
  failed: number;
  retried: number;
  errors: string[];
}

// Sitemap Result
interface SitemapResult {
  success: boolean;
  pages_indexed: number;
  sitemap_updated: boolean;
  sitemaps_generated: string[];
  analytics_summary: {
    total_views: number;
    unique_visitors: number;
    top_pages: Array<{ slug: string; views: number }>;
    views_by_language: Record<string, number>;
    views_by_content_type: Record<string, number>;
  };
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/preview` | 10 requests | 1 hour |
| `/api/weather` | 100 requests | 1 hour |
| `/api/generate-batch` | 50 items | per call |
| Gemini API | 11 keys rotating | per-key limits |

---

## Environment Variables

Required for CMS endpoints:

| Variable | Description |
|----------|-------------|
| `ADMIN_KEY` | Authentication for admin endpoints |
| `GEMINI_API_KEY` | Primary Gemini API key |
| `GEMINI_API_KEY_2` - `GEMINI_API_KEY_11` | Additional keys for rotation |
| `APP_URL` | Base URL for sitemap generation |

---

## Admin Dashboard

Access the admin dashboard at `/admin` with the admin key.

**Features:**
- Real-time queue statistics
- Content generation controls
- Quality monitoring
- Sitemap management
- Analytics overview

**Dashboard Sections:**
1. **Overview** - Total content, queue status, generation stats
2. **Queue** - Pending, processing, completed, failed items
3. **Content** - Browse and preview generated content
4. **Analytics** - Views, visitors, top pages by language
5. **Settings** - Cron configuration, API key status
