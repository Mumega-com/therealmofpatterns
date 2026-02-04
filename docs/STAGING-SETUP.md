# Staging Environment Setup

This guide covers setting up a separate staging environment on Cloudflare Pages for safe testing before production deployments.

## Overview

| Resource | Production | Staging |
|----------|------------|---------|
| Pages Project | therealmofpatterns | therealmofpatterns-staging |
| URL | therealmofpatterns.com | therealmofpatterns-staging.pages.dev |
| D1 Database | therealmofpatterns-db | therealmofpatterns-staging-db |
| R2 Bucket | therealmofpatterns-assets | therealmofpatterns-staging-assets |
| KV Namespace | CACHE | STAGING_CACHE |
| Stripe | Live keys | Test keys |

## Step 1: Create Staging Resources

### D1 Database

```bash
# Create staging database
wrangler d1 create therealmofpatterns-staging-db

# Note the database_id from output, add to wrangler.staging.toml

# Run migrations
wrangler d1 execute therealmofpatterns-staging-db --file=src/db/schema.sql
wrangler d1 execute therealmofpatterns-staging-db --file=src/db/migration-analytics.sql
```

### R2 Bucket

```bash
# Create staging bucket
wrangler r2 bucket create therealmofpatterns-staging-assets
```

### KV Namespace

```bash
# Create staging KV
wrangler kv:namespace create "STAGING_CACHE"

# Note the id from output, add to wrangler.staging.toml
```

## Step 2: Create Staging Pages Project

### Option A: Via Cloudflare Dashboard

1. Go to **Workers & Pages** > **Create**
2. Select **Pages** > **Connect to Git**
3. Select your repository
4. Name: `therealmofpatterns-staging`
5. Build settings:
   - Build command: `npm run build`
   - Build output: `dist`
6. Environment variables (see Step 3)

### Option B: Via CLI

```bash
# Deploy staging
wrangler pages deploy dist \
  --project-name=therealmofpatterns-staging \
  --branch=staging
```

## Step 3: Configure Environment Variables

In Cloudflare Dashboard > Pages > therealmofpatterns-staging > Settings > Environment variables:

### Required Variables

| Variable | Value |
|----------|-------|
| `ENVIRONMENT` | `staging` |
| `APP_URL` | `https://therealmofpatterns-staging.pages.dev` |

### Secrets (use Stripe TEST keys)

| Secret | Description |
|--------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | From Stripe test webhook |
| `GEMINI_API_KEY` | Can use same as production |
| `ADMIN_KEY` | Generate new for staging |
| `SENDER_API_TOKEN` | Optional - disable emails |

## Step 4: Bind Resources

In Dashboard > Pages > therealmofpatterns-staging > Settings > Functions:

1. **D1 database bindings**
   - Variable name: `DB`
   - Database: `therealmofpatterns-staging-db`

2. **R2 bucket bindings**
   - Variable name: `STORAGE`
   - Bucket: `therealmofpatterns-staging-assets`

3. **KV namespace bindings**
   - Variable name: `CACHE`
   - Namespace: `STAGING_CACHE`

4. **AI bindings** (optional)
   - Variable name: `AI`

## Step 5: Stripe Webhook

Create a separate webhook in Stripe Dashboard for staging:

1. Go to Developers > Webhooks
2. Add endpoint: `https://therealmofpatterns-staging.pages.dev/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
4. Use **TEST mode**

## Step 6: Set Up Preview Deployments

Cloudflare Pages automatically creates preview deployments for each branch/PR.

To configure:

1. Dashboard > Pages > therealmofpatterns > Settings > Build & deployments
2. Enable **Preview deployments**
3. Set branch filter (optional): `staging`, `feature/*`

Preview URLs format: `<commit-hash>.therealmofpatterns.pages.dev`

## Step 7: Seed Test Data

```bash
# Seed staging with test data
wrangler d1 execute therealmofpatterns-staging-db --file=src/db/seed-staging.sql
```

Create `src/db/seed-staging.sql`:

```sql
-- Test users
INSERT INTO users (id, email, name, created_at) VALUES
  ('test-user-1', 'test@example.com', 'Test User', datetime('now')),
  ('test-user-2', 'demo@example.com', 'Demo User', datetime('now'));

-- Test check-ins
INSERT INTO checkins (id, user_id, kappa, scores, created_at) VALUES
  ('checkin-1', 'test-user-1', 0.72, '{"clarity":4,"energy":3,"focus":4}', datetime('now'));
```

## Deployment Workflow

### Development → Staging → Production

```bash
# 1. Work on feature branch
git checkout -b feature/new-feature
# ... make changes ...
git commit -m "feat: add new feature"

# 2. Deploy to staging for testing
git push origin feature/new-feature
# Opens PR → Preview deployment created automatically

# 3. Merge to staging branch
git checkout staging
git merge feature/new-feature
git push origin staging
# Triggers staging deployment

# 4. Test on staging
# https://therealmofpatterns-staging.pages.dev

# 5. Merge to main for production
git checkout main
git merge staging
git push origin main
# Triggers production deployment
```

### Quick Staging Deploy

```bash
# Build and deploy directly to staging
npm run build
wrangler pages deploy dist --project-name=therealmofpatterns-staging
```

## Monitoring Staging

### Logs

```bash
# Stream staging function logs
wrangler pages deployment tail --project-name=therealmofpatterns-staging
```

### Database Queries

```bash
# Query staging database
wrangler d1 execute therealmofpatterns-staging-db --command="SELECT COUNT(*) FROM users"
```

## Differences from Production

| Aspect | Production | Staging |
|--------|------------|---------|
| Email sending | Enabled | Disabled (or sandbox) |
| Stripe | Live payments | Test cards only |
| Analytics | Full tracking | Debug mode |
| Error alerts | Slack/Discord | Console only |
| Data | Real users | Test data |

## Cleanup

To remove staging resources:

```bash
# Delete Pages project
wrangler pages project delete therealmofpatterns-staging

# Delete D1 database
wrangler d1 delete therealmofpatterns-staging-db

# Delete R2 bucket
wrangler r2 bucket delete therealmofpatterns-staging-assets

# Delete KV namespace
wrangler kv:namespace delete --namespace-id=<STAGING_KV_ID>
```
