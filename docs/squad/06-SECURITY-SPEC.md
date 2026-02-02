# Security Specification

**Agent:** Security
**Version:** 2.0.0
**Last Updated:** 2026-02-02

## Overview

Security requirements for Cloudflare Workers application (Hono framework, Stripe, D1).

---

## 1. Threat Model

| Threat | Risk | Mitigation |
|--------|------|------------|
| **Auth Bypass** | Unauthorized API access | Clerk integration, rate limiting |
| **Data Injection** | SQL/prompt injection | Input validation, parameterized queries |
| **Stripe Forgery** | Fake webhooks | Signature verification |
| **DDoS** | Service disruption | Rate limiting, Cloudflare protection |
| **Info Disclosure** | Data leaks | Generic errors, secure logging |

---

## 2. Authentication (Clerk)

```typescript
// functions/_middleware.ts
import { clerkMiddleware, auth } from "@clerk/cloudflare";

export const middleware = clerkMiddleware();

// Protected endpoint
export default async (req: Request, env: Env) => {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  // ... logic
};
```

### Key Storage
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put CLERK_SECRET_KEY
# NEVER in code
```

---

## 3. API Security

### Input Validation (Zod)
```typescript
import { z } from "zod";

const computeSchema = z.object({
  query: z.string().min(1).max(5000),
  temperature: z.number().min(0).max(2),
});

const input = computeSchema.parse(await req.json());
```

### Rate Limiting
| Endpoint | Limit |
|----------|-------|
| /api/compute | 100/min, 10K/day |
| /api/history | 1K/min |
| Public | 1K/min per IP |

### Error Handling
```typescript
try {
  // logic
} catch (error) {
  console.error("[INTERNAL]", error);
  return new Response(JSON.stringify({ error: "Processing failed" }), { status: 500 });
}
```

### CORS
```typescript
const ALLOWED_ORIGINS = [
  "https://therealmofpatterns.com",
  "https://www.therealmofpatterns.com",
];

if (ALLOWED_ORIGINS.includes(origin)) {
  headers.set("Access-Control-Allow-Origin", origin);
}
```

---

## 4. Webhook Security (Stripe)

```typescript
import crypto from "crypto";

export default async (req: Request, env: Env) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  const expectedSig = crypto
    .createHmac("sha256", env.STRIPE_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!crypto.timingSafeEqual(
    Buffer.from(signature.split("=")[1]),
    Buffer.from(expectedSig)
  )) {
    return new Response("Invalid signature", { status: 400 });
  }

  // Process webhook
};
```

**Best Practices:**
- Always verify signature before processing
- Track processed webhook IDs (idempotency)
- Respond within 5 seconds (async processing)

---

## 5. Data Protection

- **Encryption at rest:** Cloudflare KV + D1 automatic
- **HTTPS only:** Workers enforce by default
- **GDPR deletion:** CASCADE deletes on user removal

```typescript
// DELETE /api/user
await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(userId).run();
```

---

## 6. Security Headers

```typescript
const headers = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};
```

### CSP
```
default-src 'self';
script-src 'self' https://cdn.clerk.com;
connect-src 'self' https://api.clerk.com https://api.stripe.com;
frame-ancestors 'none';
```

---

## 7. Implementation Checklist

### Phase 1: Critical (Week 1)
- [ ] Clerk integration on all protected endpoints
- [ ] Stripe webhook signature verification
- [ ] Input validation (Zod) on compute/history
- [ ] Move secrets to Wrangler secrets
- [ ] Add HSTS header
- [ ] Basic rate limiting (IP-based)

### Phase 2: High (Week 2-3)
- [ ] Per-user rate limiter (Durable Objects)
- [ ] Webhook idempotency in D1
- [ ] CSP header with nonce
- [ ] GDPR deletion endpoint
- [ ] CORS whitelist middleware
- [ ] Error logging with redaction

### Phase 3: Medium (Week 4)
- [ ] D1 encryption enabled
- [ ] Audit logging table
- [ ] Request signing for internal calls
- [ ] Security header audit

### Phase 4: Ongoing
- [ ] Monthly secret rotation
- [ ] Quarterly `npm audit`
- [ ] Annual penetration testing

---

## 8. Testing

```bash
# Check headers
curl -I https://therealmofpatterns.com

# Test rate limiting
for i in {1..101}; do curl https://api.../compute; done

# Test CORS
curl -H "Origin: http://evil.com" https://api.../compute
```

---

## 9. Incident Response

1. **Detection:** Monitor for auth failures, rate limit spikes
2. **Containment:** Disable compromised users, revoke tokens
3. **Root Cause:** Audit logs, review changes
4. **Remediation:** Rotate secrets, patch vulnerabilities
5. **Postmortem:** Document, update procedures

---

## Compliance

- **GDPR:** User deletion, data export
- **PCI DSS:** Never store card data (Stripe handles)
- **SOC 2:** Audit logging, access controls

---

**Review Cadence:** Quarterly
