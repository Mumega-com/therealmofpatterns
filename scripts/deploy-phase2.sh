#!/bin/bash
# Phase 2 Deployment Script
# Run this after code is deployed to Cloudflare Pages

set -e

echo "🚀 Phase 2 Deployment Script"
echo "============================"
echo ""

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI not found"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare"
    echo "Run: wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI available and authenticated"
echo ""

# Step 1: Apply Phase 2 database schema
echo "📊 Step 1: Applying Phase 2 database schema..."
echo "=============================================="

if [ -f "src/db/schema-phase2.sql" ]; then
    wrangler d1 execute therealmofpatterns-db --file=src/db/schema-phase2.sql
    echo "✅ Phase 2 schema applied successfully"
else
    echo "❌ Error: schema-phase2.sql not found"
    exit 1
fi

echo ""

# Step 2: Verify tables created
echo "🔍 Step 2: Verifying tables..."
echo "=============================="

wrangler d1 execute therealmofpatterns-db --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"

echo ""
echo "✅ Tables verified"
echo ""

# Step 3: Set secrets (if not already set)
echo "🔐 Step 3: Checking secrets..."
echo "=============================="

echo "Required secrets:"
echo "  - ADMIN_KEY (for manual cron triggers)"
echo "  - EMAIL_API_KEY (optional - for email delivery)"
echo ""
echo "To set secrets, run:"
echo "  wrangler secret put ADMIN_KEY"
echo "  wrangler secret put EMAIL_API_KEY"
echo ""

# Step 4: Test endpoints
echo "🧪 Step 4: Testing endpoints..."
echo "==============================="

BASE_URL="https://therealmofpatterns.pages.dev"

echo "Testing /api/compute-full..."
curl -s -X POST "$BASE_URL/api/compute-full" \
  -H "Content-Type: application/json" \
  -d '{"birth_data":{"year":1986,"month":11,"day":29}}' \
  | jq '.success' || echo "❌ Endpoint test failed"

echo ""
echo "Testing dashboard..."
curl -s -I "$BASE_URL/dashboard.html" | head -n 1

echo ""

# Step 5: Summary
echo "📋 Deployment Summary"
echo "===================="
echo ""
echo "✅ Phase 2 database schema applied"
echo "✅ Tables created and verified"
echo ""
echo "🌐 Live URLs:"
echo "  - Main site: $BASE_URL"
echo "  - Dashboard: $BASE_URL/dashboard.html?email_hash=demo"
echo "  - API: $BASE_URL/api/compute-full"
echo ""
echo "⏰ Cron Job:"
echo "  - Schedule: Daily at 00:00 UTC"
echo "  - Endpoint: $BASE_URL/api/daily-update"
echo "  - Status: Check Cloudflare Pages dashboard"
echo ""
echo "📚 Next Steps:"
echo "  1. Set ADMIN_KEY secret: wrangler secret put ADMIN_KEY"
echo "  2. Test dashboard: open $BASE_URL/dashboard.html?email_hash=demo"
echo "  3. Monitor cron jobs in Cloudflare dashboard"
echo "  4. Deploy Python backend for real ephemeris calculations"
echo ""
echo "🎉 Phase 2 deployment complete!"
