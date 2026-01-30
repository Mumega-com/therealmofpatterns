# Deployment Guide

## Prerequisites

1. **Cloudflare Account** (free tier is sufficient)
2. **Node.js 18+**
3. **Wrangler CLI**
4. **Stripe Account** (for payments)

```bash
npm install -g wrangler
wrangler login
```

## Current Production Resources

| Resource | ID/Name |
|----------|---------|
| D1 Database | `f7396c67-c475-40ec-ae4a-acf7b22834a9` |
| R2 Bucket | `therealmofpatterns-assets` |
| KV Namespace | `9ec0ef8400f5430fbebb73ce6ce64995` |
| Account ID | `e39eaf94f33092c4efd029d94ae1e9dd` |

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/FractalResonance/therealmofpatterns.git
cd therealmofpatterns
npm install
```

### 2. Create Cloudflare Resources (if not exists)

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="e39eaf94f33092c4efd029d94ae1e9dd"

# Create D1 database
wrangler d1 create therealmofpatterns-db

# Create R2 bucket
wrangler r2 bucket create therealmofpatterns-assets

# Create KV namespace
wrangler kv namespace create CACHE
```

### 3. Configure Cloudflare Pages Bindings

In Cloudflare Dashboard → Workers & Pages → therealmofpatterns → Settings → Functions:

**D1 Database:**
- Variable name: `DB`
- Database: `therealmofpatterns-db`

**R2 Bucket:**
- Variable name: `STORAGE`
- Bucket: `therealmofpatterns-assets`

**KV Namespace:**
- Variable name: `CACHE`
- Namespace ID: `9ec0ef8400f5430fbebb73ce6ce64995`

**Workers AI:**
- Variable name: `AI`

### 4. wrangler.toml Reference

```toml
name = "therealmofpatterns"
compatibility_date = "2024-01-01"
pages_build_output_dir = "public"

[[d1_databases]]
binding = "DB"
database_name = "therealmofpatterns-db"
database_id = "f7396c67-c475-40ec-ae4a-acf7b22834a9"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "therealmofpatterns-assets"

[[kv_namespaces]]
binding = "CACHE"
id = "9ec0ef8400f5430fbebb73ce6ce64995"

[ai]
binding = "AI"
```

### 4. Run Database Migrations

```bash
wrangler d1 execute therealmofpatterns-db --file=src/db/schema.sql
wrangler d1 execute therealmofpatterns-db --file=src/db/seed.sql
```

### 5. Set Environment Secrets

```bash
# Stripe (required)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Social Media (optional)
wrangler secret put TWITTER_BEARER_TOKEN
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put DISCORD_WEBHOOK_URL
```

## Local Development

```bash
# Start local dev server with all bindings
npm run dev

# This starts:
# - Pages dev server on http://localhost:8788
# - Local D1 database
# - Local KV store
# - Workers AI (remote)
```

### Testing Stripe Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks to local
stripe listen --forward-to localhost:8788/api/webhook
```

## Deployment

### Automatic (GitHub Actions)

Push to `main` branch triggers automatic deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: therealmofpatterns
          directory: public
```

### Manual

```bash
npm run deploy
# or
wrangler pages deploy public --project-name=therealmofpatterns
```

## Stripe Configuration

### 1. Create Products in Stripe Dashboard

| Product | Price | Price ID |
|---------|-------|----------|
| Premium 16D Report | $497 | `price_...` |
| Complete Bundle | $697 | `price_...` |

### 2. Configure Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://therealmofpatterns.pages.dev/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Update Price IDs

Edit `src/lib/stripe.ts`:

```typescript
export const PRODUCTS = {
  premium_16d_report: {
    price_id: 'price_xxx',
    amount: 49700,
  },
  complete_bundle: {
    price_id: 'price_yyy',
    amount: 69700,
  },
};
```

## Custom Domain

### 1. Add Domain in Cloudflare

1. Go to Pages → therealmofpatterns → Custom domains
2. Add domain: `therealmofpatterns.com`
3. Follow DNS setup instructions

### 2. Update Stripe Webhook

Update webhook URL to use custom domain.

### 3. Update CORS (if needed)

Edit `functions/_middleware.ts`:

```typescript
const ALLOWED_ORIGINS = [
  'https://therealmofpatterns.com',
  'https://therealmofpatterns.pages.dev',
];
```

## Monitoring

### Cloudflare Dashboard

- **Analytics**: Request volume, errors, latency
- **Workers Logs**: Real-time function logs
- **D1 Metrics**: Query performance

### Recommended Additions

```bash
# Add Sentry for error tracking
npm install @sentry/cloudflare

# Configure in functions
import * as Sentry from '@sentry/cloudflare';
Sentry.init({ dsn: 'https://...' });
```

## Troubleshooting

### Common Issues

**D1 Query Errors**
```bash
# Check database state
wrangler d1 execute therealmofpatterns-db --command="SELECT * FROM users LIMIT 5"
```

**KV Not Found**
```bash
# Verify namespace exists
wrangler kv:namespace list
```

**R2 Permission Denied**
```bash
# Check bucket exists
wrangler r2 bucket list
```

**Workers AI Timeout**
- AI calls can take 5-30 seconds
- Increase timeout in wrangler.toml if needed

### Logs

```bash
# Tail live logs
wrangler pages deployment tail

# View specific deployment
wrangler pages deployment list
```

## Rollback

```bash
# List deployments
wrangler pages deployment list --project-name=therealmofpatterns

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id>
```
