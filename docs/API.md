# API Reference

Base URL: `https://therealmofpatterns.pages.dev/api`

## Endpoints

### Public Endpoints

#### POST /api/preview

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

#### GET /api/weather

Get the current cosmic weather (today's 8D field state).

**Response:**
```json
{
  "date": "2025-01-30",
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

### Payment Endpoints

#### POST /api/checkout

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

#### POST /api/webhook

Stripe webhook handler. Called by Stripe, not by clients.

**Headers:**
- `Stripe-Signature`: Webhook signature

**Events Handled:**
- `checkout.session.completed` - Trigger report generation
- `payment_intent.payment_failed` - Log failure

---

### Authenticated Endpoints

These require a valid session token from a completed purchase.

#### GET /api/report/:id

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

#### POST /api/compute

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

#### POST /api/share

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
| `RATE_LIMITED` | 429 | Too many requests |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `PAYMENT_REQUIRED` | 402 | Premium feature |
| `INTERNAL_ERROR` | 500 | Server error |

---

## TypeScript Types

```typescript
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

interface HistoricalFigure {
  name: string;
  era: string;
  culture: string;
  vector: number[];
  resonance: number;
  quote: string;
  domains: string[];
}

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
```
