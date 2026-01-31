# Phase 2 Deployment Guide

Complete guide for deploying Phase 2 to Cloudflare.

---

## Prerequisites

1. **Cloudflare Account** with Pages and Workers enabled
2. **Wrangler CLI** installed: `npm install -g wrangler`
3. **GitHub Repository** connected to Cloudflare Pages
4. **Authenticated** with Cloudflare: `wrangler login`

---

## Deployment Overview

Phase 2 requires deploying:
1. ✅ **Code** (automatic via GitHub → Cloudflare Pages)
2. 📊 **Database schema** (manual D1 migration)
3. ⏰ **Cron worker** (manual Worker deployment)
4. 🔐 **Secrets** (manual configuration)

---

## Step 1: Fix Deployment Error

### Issue
The GitHub Actions deployment failed because `wrangler.toml` had `[triggers]` which is not supported for Pages projects.

### Solution
✅ **Already fixed** - `wrangler.toml` updated to remove `[triggers]` section.

### Redeploy
```bash
# Commit the fix
git add wrangler.toml workers/
git commit -m "fix: Remove unsupported triggers config from Pages wrangler.toml"
git push
```

This will trigger a new GitHub Actions deployment.

---

## Step 2: Apply Database Schema

Once the Pages deployment succeeds, apply the Phase 2 database schema:

```bash
# Navigate to project root
cd /home/mumega/therealmofpatterns

# Apply Phase 2 schema
wrangler d1 execute therealmofpatterns-db --file=src/db/schema-phase2.sql

# Verify tables created
wrangler d1 execute therealmofpatterns-db --command="
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
"
```

Expected tables:
- `uv_snapshots`
- `user_profiles`
- `notification_queue`
- `threshold_alerts`
- `daily_transits`
- `elder_milestones`
- `user_analytics`
- Plus existing tables from Phase 1

---

## Step 3: Deploy Cron Worker

Pages doesn't support cron triggers directly, so we use a separate Worker:

```bash
# Deploy the cron worker
cd workers/
wrangler deploy

# Verify deployment
wrangler deployments list --name therealmofpatterns-cron
```

The worker will automatically call `/api/daily-update` every day at 00:00 UTC.

---

## Step 4: Configure Secrets

### For Pages (API endpoints)
```bash
cd /home/mumega/therealmofpatterns

# Set admin key for manual cron triggers
wrangler pages secret put ADMIN_KEY --project-name therealmofpatterns

# Optional: Email service key
wrangler pages secret put EMAIL_API_KEY --project-name therealmofpatterns
```

### For Cron Worker
```bash
cd workers/

# Set admin key (same value as Pages)
wrangler secret put ADMIN_KEY --name therealmofpatterns-cron
```

---

## Step 5: Verify Deployment

### Test Dashboard
```bash
# Open in browser
open https://therealmofpatterns.pages.dev/dashboard.html?email_hash=demo
```

### Test API Endpoints
```bash
BASE_URL="https://therealmofpatterns.pages.dev"

# Test /api/compute-full
curl -X POST "$BASE_URL/api/compute-full" \
  -H "Content-Type: application/json" \
  -d '{
    "birth_data": {
      "year": 1986,
      "month": 11,
      "day": 29
    }
  }' | jq '.'

# Test /api/history
curl "$BASE_URL/api/history?email_hash=demo&days=30" | jq '.'

# Test /api/daily-update (with admin key)
curl -X POST "$BASE_URL/api/daily-update" \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -d '{}' | jq '.'
```

### Verify Cron Worker
```bash
# Check worker status
wrangler tail --name therealmofpatterns-cron

# Trigger manual cron (for testing)
wrangler deployments view --name therealmofpatterns-cron
```

---

## Step 6: Monitor Deployment

### Cloudflare Dashboard
1. Go to **Cloudflare Dashboard** → **Pages** → **therealmofpatterns**
2. Check **Deployments** tab for build status
3. Check **Functions** tab for API function logs
4. Go to **Workers & Pages** → **therealmofpatterns-cron** for cron logs

### GitHub Actions
1. Go to **GitHub** → **Actions** tab
2. Verify "Deploy to Cloudflare Pages" workflow succeeded
3. Check logs if deployment failed

---

## Automated Deployment Script

For convenience, use the provided script:

```bash
# Make executable
chmod +x scripts/deploy-phase2.sh

# Run deployment
./scripts/deploy-phase2.sh
```

This script:
- ✅ Verifies wrangler CLI
- ✅ Applies database schema
- ✅ Verifies tables
- ✅ Tests endpoints
- ✅ Provides deployment summary

---

## Troubleshooting

### Deployment Failed in GitHub Actions

**Error:** "Configuration file for Pages projects does not support 'triggers'"

**Fix:**
```bash
# Already fixed in wrangler.toml
# Just push to trigger new deployment
git add wrangler.toml
git commit -m "fix: Remove triggers from Pages config"
git push
```

### Database Migration Failed

**Error:** "Error: No such database"

**Fix:**
```bash
# List databases
wrangler d1 list

# If database doesn't exist, create it
wrangler d1 create therealmofpatterns-db

# Update wrangler.toml with new database_id
```

### Cron Worker Not Triggering

**Check:**
```bash
# Verify worker deployed
wrangler deployments list --name therealmofpatterns-cron

# Check logs
wrangler tail --name therealmofpatterns-cron

# Verify trigger configured
wrangler deployments view --name therealmofpatterns-cron
```

### API Endpoints Returning Errors

**Debug:**
```bash
# Check function logs in Cloudflare Dashboard
# OR tail logs locally
wrangler pages deployment tail --project-name therealmofpatterns
```

---

## Rollback Procedure

If Phase 2 deployment fails:

```bash
# Revert to previous commit
git revert HEAD
git push

# OR restore previous schema
wrangler d1 execute therealmofpatterns-db --command="
DROP TABLE IF EXISTS uv_snapshots;
DROP TABLE IF EXISTS user_profiles;
-- ... drop other Phase 2 tables
"
```

---

## Post-Deployment Checklist

- [ ] GitHub Actions deployment succeeded
- [ ] Database schema applied (8 new tables)
- [ ] Cron worker deployed and scheduled
- [ ] Secrets configured (ADMIN_KEY)
- [ ] Dashboard loads successfully
- [ ] `/api/compute-full` returns valid data
- [ ] `/api/history` returns trends
- [ ] Cron worker logs show successful runs

---

## Live URLs

After successful deployment:

- **Main Site:** https://therealmofpatterns.pages.dev
- **Dashboard:** https://therealmofpatterns.pages.dev/dashboard.html?email_hash=demo
- **API Base:** https://therealmofpatterns.pages.dev/api/

---

## Next Steps

After Phase 2 deploys successfully:

1. **Python Backend**
   - Deploy `core/frc_16d_full_spec.py` as separate service
   - Replace mock data in API endpoints
   - Use real ephemeris calculations

2. **Email Delivery**
   - Integrate Resend or SendGrid
   - Process notification queue
   - Send daily updates and alerts

3. **User Authentication**
   - Add login/signup flow
   - Protect premium endpoints
   - User profile management

4. **Testing**
   - Create test users
   - Verify daily cron runs
   - Test notification delivery
   - Monitor database growth

---

## Support

If you encounter issues:

1. Check **Cloudflare Dashboard** → Pages → Logs
2. Check **GitHub Actions** logs
3. Review **wrangler.toml** configuration
4. Verify **secrets** are set correctly

---

**Deployment Status:** Ready to deploy ✅

**Estimated Time:** 10-15 minutes
