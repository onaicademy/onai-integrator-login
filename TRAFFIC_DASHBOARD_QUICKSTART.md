# 🚀 Traffic Dashboard - Quick Start Guide

## ✅ Current Status

**Migration:** ✅ Complete (all 5 tables created)
**Backend Code:** ✅ Updated and committed
**Cron Jobs:** ✅ Enabled in server.ts
**Data:** ⏳ Needs initial population

---

## 🎯 What You Need To Do NOW

### Step 1: Deploy Backend to Production (2 минуты)

```bash
# SSH to production server
ssh root@207.154.231.30

# Navigate to project
cd /var/www/onai-integrator-login-main

# Pull latest code
git pull origin main

# Restart all services
pm2 restart all

# Check logs
pm2 logs traffic-backend --lines 20
```

**Expected Output:**
```
✅ Traffic Dashboard sync jobs started
   - Facebook Ads Sync: Every hour at :05
   - Metrics Aggregation: Every 10 minutes
```

---

### Step 2: Configure Facebook Tokens (5 минут)

Для каждого таргетолога настрой токены в базе данных:

```sql
-- Open: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/editor

-- Update settings for each user
UPDATE traffic_targetologist_settings
SET
  facebook_access_token = 'EAAP...', -- Long-lived token (60 days)
  fb_ad_accounts = '["act_964264512447589", "act_30779210298344970"]'::jsonb,
  tracked_campaigns = '["120237149691640477", "120237149468470477"]'::jsonb
WHERE user_id = '4609fee5-6627-4e78-92ed-8702e8c18c88'; -- Kenesary

-- Repeat for other users (Arystan, Muha, etc.)
```

**Where to get Facebook token:**
1. Go to https://developers.facebook.com/tools/explorer/
2. Select your app
3. Get Token → Get Long-Lived Access Token
4. Permissions needed: `ads_read`, `business_management`

---

### Step 3: Run Initial Sync (1 минута)

```bash
# Still on production server
cd /var/www/onai-integrator-login-main

# Load environment variables
source backend/.env

# Run manual sync (syncs last 30 days)
npx tsx backend/scripts/manual-traffic-sync.ts
```

**Expected Output:**
```
🚀 MANUAL TRAFFIC SYNC
═══════════════════════════════════════════════════════════

[Manual] 1️⃣ Facebook Ads Sync...
[FB Sync] 🔄 Starting Facebook Ads sync...
[FB Sync] Period: 2025-12-06 to 2026-01-05
[FB Sync] 📥 Found 3 users
[FB Sync] Processing Kenesary...
[FB Sync] Kenesary - Stored 45 insights
[FB Sync] Processing Arystan...
[FB Sync] Arystan - Stored 52 insights
[FB Sync] ✅ Complete: 97 records synced in 3421ms

[Manual] 2️⃣ Metrics Aggregation...
[Aggregation] 🔄 Starting metrics aggregation...
[Aggregation] 📥 Found 3 users
[Aggregation] Processing Kenesary (today)...
[Aggregation] ✅ Kenesary (today) - Revenue: 0 ₸, ROAS: 0.00x
[Aggregation] Processing Kenesary (7d)...
[Aggregation] ✅ Kenesary (7d) - Revenue: 59,000 ₸, ROAS: 0.15x
[Aggregation] ✅ Complete: 9 metrics updated in 892ms

✅ SYNC COMPLETE
```

---

### Step 4: Verify Dashboard Works (30 секунд)

1. **Open Dashboard:**
   https://traffic.onai.academy

2. **Hard Refresh:**
   `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

3. **Check Console (F12):**
   ```
   ✅ [CACHE] Build ID matches: 20260105-0115-TRAFFIC-FIX
   ✅ [TrafficGuard] Token found
   ✅ [TrafficGuard] Authorization successful
   ```

4. **Verify Data Displays:**
   - ✅ Spend shows (not $0)
   - ✅ Leads count displays
   - ✅ Sales and revenue shows
   - ✅ ROAS calculates

---

## 🔍 Troubleshooting

### Problem: No Facebook Ads data after sync

**Check:**
```sql
-- Check if raw data was stored
SELECT
  team_name,
  stat_date,
  SUM(spend) as total_spend,
  COUNT(*) as ad_count
FROM traffic_facebook_ads_raw
WHERE stat_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY team_name, stat_date
ORDER BY stat_date DESC;
```

**If empty:**
- Check Facebook token is valid (not expired)
- Check token has `ads_read` permission
- Check `fb_ad_accounts` are correct
- Run sync with more verbose logs

### Problem: Dashboard shows $0

**Check aggregated metrics:**
```sql
SELECT
  team_name,
  period,
  spend_usd,
  total_revenue,
  roas,
  updated_at
FROM traffic_aggregated_metrics
ORDER BY updated_at DESC;
```

**If empty:**
- Run metrics aggregation manually
- Check sync history for errors:
```sql
SELECT * FROM traffic_sync_history
ORDER BY started_at DESC LIMIT 5;
```

### Problem: Cron jobs not running

**Check PM2 logs:**
```bash
pm2 logs traffic-backend | grep "Cron"
```

**Expected every hour:**
```
[Cron] 🕒 Facebook Ads Sync triggered
[Cron] ✅ Facebook Ads Sync complete
```

**Expected every 10 minutes:**
```
[Cron] 🕒 Metrics Aggregation triggered
[Cron] ✅ Metrics Aggregation complete
```

### Problem: Facebook API errors

**Common errors:**

1. **"Invalid access token"**
   - Token expired (get new long-lived token)
   - Token revoked (check Facebook app permissions)

2. **"Rate limit exceeded"**
   - Too many requests
   - Wait 1 hour and retry
   - Reduce sync frequency if needed

3. **"Unsupported get request"**
   - Campaign ID doesn't exist
   - Check `tracked_campaigns` IDs are correct

---

## 📊 Monitoring

### Check Sync Status

```sql
-- Last 5 syncs
SELECT
  sync_type,
  started_at,
  completed_at,
  success,
  users_processed,
  records_synced,
  duration_ms,
  error_message
FROM traffic_sync_history
ORDER BY started_at DESC
LIMIT 5;
```

### Check Data Freshness

```sql
-- How fresh is the aggregated data?
SELECT
  team_name,
  period,
  updated_at,
  NOW() - updated_at AS age
FROM traffic_aggregated_metrics
ORDER BY updated_at DESC;
```

**Expected:** Data should be < 15 minutes old

### Check Raw Data Volume

```sql
-- How much Facebook Ads data do we have?
SELECT
  DATE(stat_date) as date,
  COUNT(*) as ads_count,
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions
FROM traffic_facebook_ads_raw
GROUP BY DATE(stat_date)
ORDER BY date DESC
LIMIT 7;
```

---

## 🎉 Success Criteria

Dashboard is **fully operational** when:

- ✅ Migration 017 executed
- ✅ Backend deployed with cron jobs
- ✅ Facebook tokens configured
- ✅ Initial sync completed successfully
- ✅ Dashboard displays spend data (not $0)
- ✅ Dashboard displays lead counts
- ✅ Dashboard displays sales and revenue
- ✅ ROAS calculates correctly
- ✅ Data auto-updates every 10 minutes

---

## 📝 Maintenance

### Daily Checks

```bash
# Check sync status
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && \
  psql $DATABASE_URL -c 'SELECT * FROM traffic_sync_history ORDER BY started_at DESC LIMIT 1;'"
```

### Weekly Tasks

1. Verify Facebook tokens haven't expired
2. Check sync success rate > 95%
3. Verify data freshness < 15 minutes
4. Review error logs for issues

### Monthly Tasks

1. Refresh Facebook long-lived tokens (before 60-day expiry)
2. Review and optimize cron job schedules if needed
3. Clean up old sync history (> 90 days)

---

## 🚨 Emergency Contacts

**If dashboard is down:**
1. Check PM2 services: `pm2 list`
2. Check backend logs: `pm2 logs traffic-backend`
3. Run manual sync: `npx tsx backend/scripts/manual-traffic-sync.ts`
4. Check database connection: Test API endpoint `/api/traffic/health`

**Critical Issues:**
- All sync jobs failing → Check database connectivity
- Facebook API errors → Verify tokens and permissions
- ROAS = 0 despite sales → Check exchange rate service

---

**Last Updated:** 2026-01-05
**Version:** 1.0 - Initial Release
**Status:** Ready for Production ✅
