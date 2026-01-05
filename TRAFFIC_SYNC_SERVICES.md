# 📊 Traffic Sync Services - Documentation

## Overview

Three automated services keep the Traffic Dashboard updated with fresh data:

1. **Facebook Ads Sync** - Fetches ad spend data from Facebook Graph API
2. **Metrics Aggregation** - Computes dashboard metrics from raw data
3. **Sales Sync** - Syncs sales from AmoCRM webhooks (existing)

---

## 🔄 Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW PIPELINE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐      ┌──────────────────────────────┐               │
│  │ Facebook API  │──1──>│ traffic_facebook_ads_raw     │               │
│  │ (Graph v21.0) │      │ (Raw FB data cache)          │               │
│  └───────────────┘      └──────────────────────────────┘               │
│                                   │                                     │
│  ┌───────────────┐                │                                     │
│  │ AmoCRM        │──2──>│         │                                     │
│  │ (Webhooks)    │      │         v                                     │
│  └───────────────┘      │  ┌──────────────────────────────┐            │
│                         │  │ traffic_aggregated_metrics   │            │
│  ┌───────────────┐      └──>│ (Pre-computed dashboard)    │            │
│  │ traffic_leads │──3──────>│                              │            │
│  │ (Lead data)   │          └──────────────────────────────┘            │
│  └───────────────┘                   │                                  │
│                                      │                                  │
│                                      v                                  │
│                            ┌──────────────────┐                         │
│                            │ Dashboard API    │                         │
│                            │ /api/traffic/*   │                         │
│                            └──────────────────┘                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Service 1: Facebook Ads Sync

**File:** [backend/src/services/facebookAdsSync.ts](backend/src/services/facebookAdsSync.ts)

### Purpose
Fetches advertising metrics from Facebook Graph API and stores them in `traffic_facebook_ads_raw` table.

### Schedule
- **Automatic:** Every hour at :05 (1:05, 2:05, 3:05...)
- **Manual:** `npx tsx backend/scripts/manual-traffic-sync.ts`

### Data Collected
- Campaign ID, name
- Adset ID, name
- Ad ID, name
- Spend (USD)
- Impressions, Clicks, Reach
- Date range

### Configuration
Users configure in `traffic_targetologist_settings`:
```typescript
{
  facebook_access_token: "EAAxxxx...",
  fb_ad_accounts: ["act_964264512447589"],
  tracked_campaigns: ["120237149691640477", ...]
}
```

### API Endpoint Used
```
GET /v21.0/{campaign_id}/insights
?access_token={token}
&time_range={"since":"2026-01-01","until":"2026-01-07"}
&fields=campaign_id,campaign_name,spend,impressions,clicks,reach
&level=ad
```

### Output Table
**`traffic_facebook_ads_raw`**
```sql
user_id UUID
team_name TEXT
campaign_id TEXT
stat_date DATE
spend DECIMAL
impressions BIGINT
clicks BIGINT
reach BIGINT
```

### Error Handling
- Invalid token → Skip user, log error
- Rate limit → Retry with exponential backoff
- Missing campaigns → Log warning, continue

---

## 🧮 Service 2: Metrics Aggregation

**File:** [backend/src/services/trafficMetricsAggregation.ts](backend/src/services/trafficMetricsAggregation.ts)

### Purpose
Computes aggregated metrics for dashboard from multiple data sources.

### Schedule
- **Automatic:** Every 10 minutes
- **Manual:** `npx tsx backend/scripts/manual-traffic-sync.ts`

### Data Sources
1. `traffic_facebook_ads_raw` - Ad spend
2. `traffic_leads` - Lead counts
3. `challenge3d_sales` - Challenge3D sales
4. `express_course_sales` - Express sales
5. `intensive1d_sales` - Intensive1D sales

### Aggregation Logic
For each user and period (today, 7d, 30d):

```typescript
// 1. Sum Facebook Ads spend
spend_usd = SUM(traffic_facebook_ads_raw.spend)
spend_kzt = spend_usd * exchange_rate

// 2. Count leads
leads = COUNT(traffic_leads WHERE created_at IN period)

// 3. Count sales and revenue
challenge3d_prepayments = COUNT(challenge3d_sales WHERE sale_type = 'Prepayment')
challenge3d_revenue = SUM(challenge3d_sales.sale_amount)

// 4. Calculate ROAS
total_revenue = challenge3d_revenue + express_revenue + intensive1d_revenue
roas = total_revenue / spend_kzt

// 5. Calculate CPA
total_sales = challenge3d_prepayments + challenge3d_full + express + intensive1d
cpa_usd = spend_usd / total_sales
```

### Output Table
**`traffic_aggregated_metrics`**
```sql
user_id UUID
team_name TEXT
period TEXT ('today'|'7d'|'30d')
period_start DATE
period_end DATE

-- FB Ads
spend_usd DECIMAL
spend_kzt DECIMAL
impressions BIGINT
clicks BIGINT

-- Leads
leads INTEGER
challenge3d_leads INTEGER
express_leads INTEGER

-- Sales
challenge3d_prepayments INTEGER
challenge3d_prepayment_revenue DECIMAL
total_revenue DECIMAL
total_sales INTEGER

-- Computed
roas DECIMAL
cpa_usd DECIMAL
```

### Performance
- Processes ~3 users × 3 periods = 9 records
- Execution time: ~500-2000ms
- Writes to `traffic_sync_history` for monitoring

---

## ⏰ Cron Jobs

**File:** [backend/src/cron/traffic-sync-jobs.ts](backend/src/cron/traffic-sync-jobs.ts)

### Starting the Jobs

**In `server.ts` (production):**
```typescript
import { startAllTrafficSyncJobs } from './cron/traffic-sync-jobs.js';

// Start cron jobs
startAllTrafficSyncJobs();
```

**Manual execution:**
```bash
npx tsx backend/scripts/manual-traffic-sync.ts
```

### Schedules

| Job | Schedule | Cron Expression | Timezone |
|-----|----------|-----------------|----------|
| Facebook Ads Sync | Every hour at :05 | `5 * * * *` | Asia/Almaty |
| Metrics Aggregation | Every 10 minutes | `*/10 * * * *` | Asia/Almaty |

---

## 🛠️ Manual Sync Script

**File:** [backend/scripts/manual-traffic-sync.ts](backend/scripts/manual-traffic-sync.ts)

### Usage
```bash
# Set environment variables
cd /var/www/onai-integrator-login-main
source backend/.env

# Run sync
npx tsx backend/scripts/manual-traffic-sync.ts
```

### What it does
1. Syncs Facebook Ads for last 30 days
2. Aggregates metrics for all users
3. Logs results to console and `traffic_sync_history`

### Example Output
```
🚀 MANUAL TRAFFIC SYNC
═══════════════════════════════════════════════════════════

[Manual] 1️⃣ Facebook Ads Sync...
[FB Sync] 🔄 Starting Facebook Ads sync...
[FB Sync] Period: 2025-12-06 to 2026-01-05
[FB Sync] 📥 Found 3 users
[FB Sync] Processing Kenesary...
[FB Sync] Kenesary - Stored 45 insights
[FB Sync] ✅ Complete: 135 records synced in 4231ms
[Manual] ✅ Facebook Ads Sync complete

[Manual] 2️⃣ Metrics Aggregation...
[Aggregation] 🔄 Starting metrics aggregation...
[Aggregation] 📥 Found 3 users
[Aggregation] Processing Kenesary (today)...
[Aggregation] ✅ Kenesary (today) - Revenue: 59,000 ₸, ROAS: 0.05x
[Aggregation] ✅ Complete: 9 metrics updated in 1823ms
[Manual] ✅ Metrics Aggregation complete

✅ SYNC COMPLETE
```

---

## 📊 Monitoring

### Check Sync History
```sql
SELECT
  sync_type,
  started_at,
  success,
  users_processed,
  records_synced,
  duration_ms,
  error_message
FROM traffic_sync_history
ORDER BY started_at DESC
LIMIT 10;
```

### Check Last Aggregation
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

### Check Raw Facebook Data
```sql
SELECT
  team_name,
  stat_date,
  SUM(spend) as total_spend,
  SUM(impressions) as total_impressions,
  COUNT(*) as ad_count
FROM traffic_facebook_ads_raw
GROUP BY team_name, stat_date
ORDER BY stat_date DESC;
```

---

## 🚨 Troubleshooting

### Problem: No Facebook Ads data
**Diagnosis:**
```bash
# Check sync history
npx tsx -e "
import { trafficAdminSupabase } from './backend/src/config/supabase-traffic.js';
const { data } = await trafficAdminSupabase
  .from('traffic_sync_history')
  .select('*')
  .eq('sync_type', 'facebook_ads')
  .order('started_at', { ascending: false })
  .limit(1);
console.log(data);
"
```

**Solutions:**
1. Check Facebook token is valid
2. Check user has `fb_ad_accounts` configured
3. Check Facebook API rate limits
4. Run manual sync to see detailed errors

### Problem: Metrics show $0
**Diagnosis:**
```sql
-- Check if raw data exists
SELECT COUNT(*) FROM traffic_facebook_ads_raw;

-- Check if aggregation ran
SELECT * FROM traffic_sync_history
WHERE sync_type = 'full'
ORDER BY started_at DESC LIMIT 1;
```

**Solutions:**
1. Run Facebook Ads sync first
2. Then run metrics aggregation
3. Check `traffic_sync_history` for errors

### Problem: ROAS calculation incorrect
**Diagnosis:**
Check exchange rate:
```typescript
import { getAverageExchangeRate } from './backend/src/services/exchangeRateService.js';
const rate = await getAverageExchangeRate('2026-01-01', '2026-01-07');
console.log('Exchange rate:', rate);
```

**Solution:**
Ensure exchange rate service is working correctly.

---

## 🔐 Security

### Facebook Access Tokens
- Stored in `traffic_targetologist_settings.facebook_access_token`
- Falls back to `FACEBOOK_ADS_TOKEN` env var
- Should be long-lived tokens (60 days)
- Refresh before expiry

### Permissions Required
- `ads_read`
- `business_management`

### RLS Policies
All tables have Row Level Security enabled:
- Service role: Full access
- Authenticated users: Read own metrics only

---

## 📝 Next Steps

1. ✅ Run Migration 017 (creates tables)
2. ✅ Deploy backend with sync services
3. ⏳ Configure Facebook tokens for each user
4. ⏳ Run manual sync to populate initial data
5. ⏳ Enable cron jobs for automated updates

---

**Last Updated:** 2026-01-05
**Files:** 3 services, 2 cron jobs, 1 manual script
