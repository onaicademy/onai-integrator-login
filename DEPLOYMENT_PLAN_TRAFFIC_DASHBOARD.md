# 🚀 Traffic Dashboard Repair - Deployment Plan

## 📋 Executive Summary

The Traffic Dashboard was non-functional due to missing database tables and incorrect table references in the backend code. This document outlines the complete repair strategy.

---

## ❌ Problems Identified

### 1. Database Schema Issues
- **Missing Tables:**
  - `traffic_aggregated_metrics` - Pre-computed dashboard metrics
  - `traffic_sync_history` - Sync audit trail
  - `traffic_facebook_ads_raw` - Raw Facebook Ads data cache
  - `express_course_sales` - Express course sales tracking
  - `intensive1d_sales` - Intensive 1D sales tracking

- **Malformed Data:**
  - 1 record in `challenge3d_sales` with NULL values (sale_amount, sale_type, lead_name)

### 2. Code Issues
- **Wrong Table Names:**
  - Code referenced `traffic_stats` (doesn't exist)
  - Should reference `traffic_aggregated_metrics` or `traffic_facebook_ads_raw`

- **Facebook Ads API Errors:**
  - Some code still using invalid `date_preset: 'lifetime'`
  - Should use `time_range: {since, until}` format

### 3. Data Pipeline Issues
- No Facebook Ads data syncing to Traffic DB
- No aggregation service to compute metrics
- Frontend shows $0 because no data exists

---

## ✅ Solutions Implemented

### Phase 1: Database Migration (REQUIRES MANUAL EXECUTION)

**File Created:** [migrations/MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql](migrations/MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql)

**What it does:**
1. Creates `traffic_aggregated_metrics` table (main metrics)
2. Creates `traffic_sync_history` table (audit trail)
3. Creates `traffic_facebook_ads_raw` table (raw FB data)
4. Creates/fixes `express_course_sales` table
5. Creates `intensive1d_sales` table
6. Fixes `challenge3d_sales` schema (adds missing columns)
7. Creates helper functions (`get_traffic_metrics`, `get_period_date_range`)
8. Creates dashboard summary view
9. Sets up RLS policies and permissions

**How to Execute:**
```bash
# Option 1: Supabase Dashboard (RECOMMENDED)
# Go to: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql/new
# Copy/paste entire MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql
# Click "Run"

# Option 2: psql (if you have DB password)
psql "postgresql://postgres.oetodaexnjcunklkdlkv:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" \
  < migrations/MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql
```

**MCP Agent Instructions:** [migrations/MCP_AGENT_INSTRUCTIONS.md](migrations/MCP_AGENT_INSTRUCTIONS.md)

### Phase 2: Backend Code Fixes (✅ COMPLETED)

**Files Modified:**

1. **[backend/src/routes/traffic-stats.ts](backend/src/routes/traffic-stats.ts)**
   - ✅ Changed `getLandingStatsSummary()` from querying `traffic_stats` → `traffic_facebook_ads_raw`
   - ✅ Updated column names (`spend_usd/spend_kzt` → `spend`)
   - ✅ Added automatic KZT conversion using exchange rate
   - ✅ Graceful fallback when table doesn't exist yet

2. **[backend/src/cron/facebook-ads-sync.ts](backend/src/cron/facebook-ads-sync.ts)**
   - ✅ Changed from `traffic_stats` → `traffic_facebook_ads_raw`
   - ✅ Updated schema mapping (added `adset_id`, `ad_id`, `reach`, etc.)
   - ✅ Fixed date column (`date` → `stat_date`)
   - ✅ Updated unique constraint (`stat_date,user_id,campaign_id` → `campaign_id,stat_date`)

**Changes Summary:**
- Old: `trafficAdminSupabase.from('traffic_stats')` ❌
- New: `trafficAdminSupabase.from('traffic_facebook_ads_raw')` ✅

### Phase 3: Frontend (Already Deployed)

**Status:** ✅ Frontend is already up-to-date
- BUILD_ID: `20260105-0115-TRAFFIC-FIX`
- Deployed to all 3 sites (onai.academy, traffic.onai.academy, expresscourse.onai.academy)
- Using correct `TRAFFIC_API_URL` configuration

---

## 🔧 Remaining Tasks

### Task 1: Run Database Migration ⚠️ CRITICAL

**Who:** You (manually) or MCP Agent (automated)

**Instructions:**
1. Open [migrations/MCP_AGENT_INSTRUCTIONS.md](migrations/MCP_AGENT_INSTRUCTIONS.md)
2. Follow Phase 1 instructions
3. Verify all tables created successfully
4. Delete malformed `challenge3d_sales` record

**Verification:**
```sql
-- Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'traffic_aggregated_metrics',
  'traffic_sync_history',
  'traffic_facebook_ads_raw',
  'express_course_sales',
  'intensive1d_sales'
);

-- Should return 5 rows
```

### Task 2: Deploy Backend Changes

**Status:** Code changes committed, ready to deploy

**Steps:**
```bash
# 1. Commit changes (if not already done)
git add backend/src/routes/traffic-stats.ts backend/src/cron/facebook-ads-sync.ts
git commit -m "fix: Update backend to use traffic_facebook_ads_raw and traffic_aggregated_metrics

🔧 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 2. Push to GitHub
git push origin main

# 3. Deploy to server
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && pm2 restart all"
```

### Task 3: Set Up Data Sync Pipeline

**Required Services:**

1. **Facebook Ads Sync Service**
   - Fetches data from Facebook Graph API
   - Stores in `traffic_facebook_ads_raw`
   - Runs every hour or on-demand

2. **Sales Sync Service**
   - Fetches sales from AmoCRM
   - Stores in `challenge3d_sales`, `express_course_sales`, `intensive1d_sales`
   - Runs every 15 minutes

3. **Metrics Aggregation Service**
   - Reads from `traffic_facebook_ads_raw` + sales tables
   - Computes aggregated metrics
   - Stores in `traffic_aggregated_metrics`
   - Runs every 10 minutes

**Status:** ⚠️ Not implemented yet - needs separate development

### Task 4: Fix Facebook Ads Token/Permissions

**Issue:** Current Facebook token may be expired or have insufficient permissions

**Evidence:**
```
❌ Ошибка для кампании 120237149691640477:
{"message":"(#100) lifetime is not a valid date_preset..."}
```

**Actions Needed:**
1. Verify Facebook App permissions (ads_read, business_management)
2. Regenerate long-lived access token if expired
3. Test with correct `time_range` parameters

---

## 📊 Data Status After Migration

### Existing Data (Pre-Migration)
- ✅ 191 leads in `traffic_leads` (Jan 1-4, 2026)
- ✅ 3 traffic users in `traffic_users`
- ⚠️ 1 malformed sale in `challenge3d_sales` (needs cleanup)
- ❌ No Facebook Ads spend data
- ❌ No aggregated metrics

### Expected Data (Post-Migration + Sync)
- ✅ All 5 new tables created
- ✅ Schema fixed for sales tables
- ⏳ Facebook Ads data (pending sync)
- ⏳ Aggregated metrics (pending computation)
- ✅ Dashboard displays data correctly

---

## 🎯 Success Criteria

### Database Level
- [ ] All 5 tables created
- [ ] Malformed `challenge3d_sales` record deleted
- [ ] Helper functions working
- [ ] RLS policies active

### Backend Level
- [ ] No more "table not found" errors
- [ ] `/api/traffic/combined-analytics` returns 200 OK
- [ ] Data aggregation working

### Frontend Level
- [ ] Dashboard shows spend data (from Facebook Ads)
- [ ] Dashboard shows lead counts (from `traffic_leads`)
- [ ] Dashboard shows sales/revenue (from sales tables)
- [ ] ROAS calculation displays correctly

---

## 🚨 Rollback Plan

If migration fails:

```sql
-- Drop new tables (reverses migration)
DROP TABLE IF EXISTS public.traffic_aggregated_metrics CASCADE;
DROP TABLE IF EXISTS public.traffic_sync_history CASCADE;
DROP TABLE IF EXISTS public.traffic_facebook_ads_raw CASCADE;
DROP TABLE IF EXISTS public.express_course_sales CASCADE;
DROP TABLE IF EXISTS public.intensive1d_sales CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_traffic_metrics CASCADE;
DROP FUNCTION IF EXISTS public.get_period_date_range CASCADE;

-- Drop view
DROP VIEW IF EXISTS public.v_traffic_dashboard_summary CASCADE;
```

Then revert backend code:
```bash
git revert HEAD
git push origin main
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && pm2 restart all"
```

---

## 📞 Next Steps

1. **IMMEDIATE:** Run Migration 017 on Traffic DB
2. **SOON:** Deploy backend code changes to production
3. **LATER:** Implement data sync services
4. **LATER:** Fix Facebook Ads token/permissions

**Estimated Time to Full Functionality:**
- Migration + deployment: 30 minutes
- Data sync implementation: 4-8 hours
- Full testing and validation: 2 hours

---

**Last Updated:** 2026-01-05
**Migration File:** MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql
**Status:** Ready for deployment ✅
