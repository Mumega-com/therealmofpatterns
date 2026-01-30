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
| **Production URL** | `https://therealmofpatterns.pages.dev` |
| D1 Database | `f7396c67-c475-40ec-ae4a-acf7b22834a9` |
| R2 Bucket | `therealmofpatterns-assets` |
| KV Namespace | `9ec0ef8400f5430fbebb73ce6ce64995` |
| Account ID | `e39eaf94f33092c4efd029d94ae1e9dd` |

## Architecture

The Realm of Patterns runs on **Cloudflare Pages** with Pages Functions:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages                         │
│              (therealmofpatterns.pages.dev)                 │
├─────────────────────────────────────────────────────────────┤
│  Static Files (/)          │  Pages Functions (/api/*)     │
│  - public/index.html       │  - /api/preview               │
│  - public/success.html     │  - /api/checkout              │
│                            │  - /api/webhook               │
│                            │  - /api/compute               │
│                            │  - /api/report/:id            │
│                            │  - /api/art/:id               │
└─────────────────────────────────────────────────────────────┘
         │                        │                  │
         ▼                        ▼                  ▼
    ┌─────────┐              ┌─────────┐       ┌─────────┐
    │   R2    │              │   D1    │       │   KV    │
    │ Storage │              │  SQLite │       │  Cache  │
    └─────────┘              └─────────┘       └─────────┘
```

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

### 3. Run Database Migrations

```bash
wrangler d1 execute therealmofpatterns-db --file=src/db/schema.sql
wrangler d1 execute therealmofpatterns-db --file=src/db/seed.sql
```

### 4. Upload Static Files to R2

```bash
wrangler r2 object put therealmofpatterns-assets/public/index.html --file=public/index.html --content-type="text/html"
wrangler r2 object put therealmofpatterns-assets/public/success.html --file=public/success.html --content-type="text/html"
```

### 5. Set Environment Secrets

```bash
# Stripe (required)
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
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

### Manual Deploy

```bash
export CLOUDFLARE_API_TOKEN="your-token"
export CLOUDFLARE_ACCOUNT_ID="e39eaf94f33092c4efd029d94ae1e9dd"

# Deploy to Cloudflare Pages
npx wrangler pages deploy public --project-name=therealmofpatterns
```

### Automatic (GitHub Actions)

Push to `main` branch triggers automatic deployment.

**Required GitHub Secrets:**
- `CLOUDFLARE_API_TOKEN` - API token with Cloudflare Pages:Edit permission
- `CLOUDFLARE_ACCOUNT_ID` - `e39eaf94f33092c4efd029d94ae1e9dd`

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx wrangler pages deploy public --project-name=therealmofpatterns
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
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

## Custom Domain

### 1. Add Domain in Cloudflare Dashboard

Pages → therealmofpatterns → Custom domains → Add

Add domain: `therealmofpatterns.com`

### 2. Update Stripe Webhook

Update webhook URL to use custom domain.

## API Token Permissions Required

The Cloudflare API token needs these permissions:
- **Cloudflare Pages:Edit** - Deploy to Pages
- **Workers KV Storage:Edit** - Manage KV cache
- **D1:Edit** - Database access
- **Workers R2 Storage:Edit** - Object storage

## Monitoring

### Cloudflare Dashboard

- **Analytics**: Request volume, errors, latency
- **Workers Logs**: Real-time function logs (`wrangler tail`)
- **D1 Metrics**: Query performance

### Live Logs

```bash
wrangler tail
```

## Troubleshooting

### Common Issues

**D1 Query Errors**
```bash
wrangler d1 execute therealmofpatterns-db --command="SELECT * FROM users LIMIT 5"
```

**KV Not Found**
```bash
wrangler kv:namespace list
```

**R2 Permission Denied**
```bash
wrangler r2 bucket list
```

**Workers AI Timeout**
- AI calls can take 5-30 seconds
- Check Workers AI status

### View Logs

```bash
# Tail live logs
wrangler tail

# View specific deployment
wrangler deployments list
```

## Rollback

```bash
# List deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback <deployment-id>
```
