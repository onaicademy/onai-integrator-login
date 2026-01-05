# 🤖 MCP Agent Instructions: Traffic Dashboard Database Repair

## Mission Statement
You are an MCP (Model Context Protocol) database repair agent tasked with diagnosing, fixing, and migrating the Traffic Dashboard database to restore full functionality. The dashboard is currently non-functional due to missing tables and schema inconsistencies.

---

## 📋 Pre-Flight Checklist

Before executing any migrations, perform these diagnostic tasks:

### 1. Database Connection Verification
```typescript
// Connect to Traffic DB
const trafficUrl = 'https://oetodaexnjcunklkdlkv.supabase.co';
const serviceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY;

// Verify connection
const { data, error } = await supabase.from('traffic_users').select('count');
// ✅ Expected: Connection successful
// ❌ If fails: Check service role key and network connectivity
```

### 2. Current Schema Audit
Run this query to list all existing tables:
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Expected Current State (PRE-migration):**
- ✅ `traffic_users` (exists)
- ✅ `traffic_leads` (exists, 191 records for Jan 1-4, 2026)
- ✅ `traffic_targetologist_settings` (exists)
- ✅ `challenge3d_sales` (exists, but MALFORMED - 1 record with NULL values)
- ✅ `journey_stages` (exists, but EMPTY)
- ❌ `traffic_aggregated_metrics` (MISSING - critical!)
- ❌ `traffic_sync_history` (MISSING)
- ❌ `traffic_facebook_ads_raw` (MISSING)
- ❌ `express_course_sales` (MISSING)
- ❌ `intensive1d_sales` (MISSING)

### 3. Data Quality Assessment

#### Check challenge3d_sales for malformed data:
```sql
SELECT
  id,
  lead_name,
  sale_amount,
  sale_type,
  sale_date,
  utm_source
FROM public.challenge3d_sales
WHERE sale_date >= '2026-01-01' AND sale_date <= '2026-01-04';
```

**Known Issue:** 1 record exists with:
- `lead_name`: NULL/undefined
- `sale_amount`: NULL/undefined
- `sale_type`: NULL/undefined
- `sale_date`: `2026-01-03T18:35:34.992+00:00`
- `utm_source`: `kenjifb`

**Action Required:** Either DELETE this malformed record OR fix it with proper values.

#### Check traffic_leads data:
```sql
SELECT
  COUNT(*) as total_leads,
  funnel_type,
  COUNT(*) FILTER (WHERE created_at >= '2026-01-01' AND created_at <= '2026-01-04T23:59:59') as jan_leads
FROM public.traffic_leads
GROUP BY funnel_type;
```

**Expected:** 191 Challenge3D leads for Jan 1-4, 2026

---

## 🔧 Migration Execution Plan

### Phase 1: Run MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql

**Method 1: Supabase SQL Editor (RECOMMENDED)**
1. Navigate to: `https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql/new`
2. Copy entire contents of `MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql`
3. Execute migration
4. Verify no errors in output

**Method 2: psql Command Line**
```bash
# Get database password from Supabase dashboard
psql "postgresql://postgres.oetodaexnjcunklkdlkv:[DB-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" \
  < migrations/MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql
```

**Method 3: Programmatic (Node.js)**
```typescript
// Note: This method has limitations with DDL statements
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const sql = fs.readFileSync('migrations/MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql', 'utf8');

// Split SQL into individual statements (simple approach)
const statements = sql.split(';').filter(s => s.trim());

for (const stmt of statements) {
  // Execute each statement
  // WARNING: This may fail for complex DDL
}
```

### Phase 2: Post-Migration Verification

After running the migration, verify all tables were created:

```sql
-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'traffic_aggregated_metrics',
  'traffic_sync_history',
  'traffic_facebook_ads_raw',
  'express_course_sales',
  'intensive1d_sales'
)
ORDER BY table_name;
```

**Expected Result:** All 5 tables should exist.

### Phase 3: Validate Table Schemas

```sql
-- Check traffic_aggregated_metrics columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'traffic_aggregated_metrics'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Critical Columns to Verify:**
- `user_id` (UUID, NOT NULL, FK to traffic_users)
- `team_name` (TEXT, NOT NULL)
- `period` (TEXT, CHECK constraint)
- `spend_usd` (DECIMAL)
- `spend_kzt` (DECIMAL)
- `challenge3d_prepayments` (INTEGER)
- `challenge3d_full_purchases` (INTEGER)
- `express_sales` (INTEGER)
- `total_revenue` (DECIMAL)
- `roas` (DECIMAL)

### Phase 4: Test Helper Functions

```sql
-- Test get_period_date_range function
SELECT * FROM public.get_period_date_range('7d');
-- Expected: Returns (CURRENT_DATE - 6 days, CURRENT_DATE)

SELECT * FROM public.get_period_date_range('30d');
-- Expected: Returns (CURRENT_DATE - 29 days, CURRENT_DATE)

SELECT * FROM public.get_period_date_range('today');
-- Expected: Returns (CURRENT_DATE, CURRENT_DATE)
```

### Phase 5: Clean Up Malformed Data

```sql
-- Option 1: Delete malformed challenge3d_sales record
DELETE FROM public.challenge3d_sales
WHERE sale_amount IS NULL
  AND sale_type IS NULL
  AND lead_name IS NULL;

-- Option 2: Fix malformed record (if you know the correct values)
UPDATE public.challenge3d_sales
SET
  lead_name = 'Test Lead',
  sale_amount = 5000.00,
  sale_type = 'Prepayment'
WHERE sale_amount IS NULL
  AND sale_date = '2026-01-03T18:35:34.992+00:00';
```

**Recommendation:** DELETE the malformed record unless you have the actual sale data.

---

## 🚀 Data Population Strategy

After migration, the tables will be EMPTY. You need to populate them:

### Strategy 1: Facebook Ads Sync

The backend needs to fetch Facebook Ads data and populate `traffic_facebook_ads_raw`:

**Issue Found:** The script `scripts/fetch-facebook-spend.cjs` is using invalid `date_preset: 'lifetime'`

**Fix Required:**
```javascript
// ❌ WRONG:
date_preset: 'lifetime'

// ✅ CORRECT:
time_range: {
  since: '2026-01-01',
  until: '2026-01-04'
}
```

### Strategy 2: AmoCRM Sales Sync

Sales data should be synced from AmoCRM to:
- `challenge3d_sales`
- `express_course_sales`
- `intensive1d_sales`

### Strategy 3: Aggregation Service

Once raw data exists, run aggregation to populate `traffic_aggregated_metrics`:

```typescript
// Pseudo-code for aggregation logic
async function aggregateMetrics(userId: string, period: string) {
  const { start_date, end_date } = getPeriodRange(period);

  // 1. Aggregate Facebook Ads spend
  const { data: fbAds } = await supabase
    .from('traffic_facebook_ads_raw')
    .select('*')
    .eq('user_id', userId)
    .gte('stat_date', start_date)
    .lte('stat_date', end_date);

  const spend_usd = sum(fbAds.map(ad => ad.spend));
  const impressions = sum(fbAds.map(ad => ad.impressions));
  const clicks = sum(fbAds.map(ad => ad.clicks));

  // 2. Aggregate sales
  const { data: c3dSales } = await supabase
    .from('challenge3d_sales')
    .select('*')
    .gte('sale_date', start_date)
    .lte('sale_date', end_date);

  const prepayments = c3dSales.filter(s => s.sale_type === 'Prepayment').length;
  const prepayment_revenue = sum(c3dSales.filter(s => s.sale_type === 'Prepayment').map(s => s.sale_amount));

  // 3. Calculate ROAS
  const total_revenue = prepayment_revenue; // + other funnels
  const roas = spend_usd > 0 ? total_revenue / (spend_usd * 475) : 0;

  // 4. Upsert to traffic_aggregated_metrics
  await supabase.from('traffic_aggregated_metrics').upsert({
    user_id: userId,
    period,
    spend_usd,
    impressions,
    clicks,
    challenge3d_prepayments: prepayments,
    challenge3d_prepayment_revenue: prepayment_revenue,
    total_revenue,
    roas,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_id,period,period_start,period_end'
  });
}
```

---

## ✅ Success Criteria

After completing all phases, verify:

1. **Schema Completeness:**
   - [ ] All 5 new tables created
   - [ ] All indexes created
   - [ ] All RLS policies active
   - [ ] All helper functions working

2. **Data Quality:**
   - [ ] No malformed records in `challenge3d_sales`
   - [ ] 191 leads exist in `traffic_leads`
   - [ ] Facebook Ads data synced to `traffic_facebook_ads_raw`
   - [ ] Sales data synced to sales tables

3. **Aggregation Working:**
   - [ ] `traffic_aggregated_metrics` contains records
   - [ ] ROAS calculations are accurate
   - [ ] Dashboard API returns data

4. **Frontend Display:**
   - [ ] Dashboard shows spend data
   - [ ] Dashboard shows lead counts
   - [ ] Dashboard shows sales and revenue
   - [ ] ROAS displays correctly

---

## 🐛 Troubleshooting Guide

### Problem: Migration fails with "relation already exists"
**Solution:** Some tables already exist. This is OK - the migration uses `CREATE TABLE IF NOT EXISTS`. Continue to next steps.

### Problem: FK constraint fails for `user_id`
**Solution:** Ensure `traffic_users` table has the referenced user IDs. Run:
```sql
SELECT id, team_name FROM public.traffic_users;
```

### Problem: No data appears in dashboard after migration
**Diagnosis:** Migration only creates schema, NOT data. You need to:
1. Fix Facebook Ads sync script (change `date_preset` to `time_range`)
2. Run sync services to populate raw data
3. Run aggregation service to compute metrics

### Problem: "Invalid date_preset" error from Facebook API
**Solution:** Update `scripts/fetch-facebook-spend.cjs`:
```javascript
// Change from:
const params = {
  date_preset: 'lifetime', // ❌ INVALID
  fields: 'spend,impressions,clicks',
};

// To:
const params = {
  time_range: {
    since: startDate, // e.g., '2026-01-01'
    until: endDate,   // e.g., '2026-01-04'
  },
  fields: 'spend,impressions,clicks,reach',
};
```

---

## 📊 Final Report Template

After completing all tasks, provide this report:

```
═══════════════════════════════════════════════════════════
🎯 MCP AGENT MIGRATION REPORT
═══════════════════════════════════════════════════════════

✅ Phase 1: Migration Execution
   - Status: [SUCCESS / FAILED]
   - Tables Created: [List]
   - Errors: [None / Details]

✅ Phase 2: Schema Verification
   - traffic_aggregated_metrics: [EXISTS / MISSING]
   - traffic_sync_history: [EXISTS / MISSING]
   - traffic_facebook_ads_raw: [EXISTS / MISSING]
   - express_course_sales: [EXISTS / MISSING]
   - intensive1d_sales: [EXISTS / MISSING]

✅ Phase 3: Data Quality Fixes
   - Malformed challenge3d_sales: [DELETED / FIXED]
   - traffic_leads count: [191 / OTHER]

✅ Phase 4: Data Population
   - Facebook Ads synced: [YES / NO / PENDING]
   - AmoCRM sales synced: [YES / NO / PENDING]
   - Metrics aggregated: [YES / NO / PENDING]

✅ Phase 5: Dashboard Verification
   - API /api/traffic/combined-analytics: [200 OK / ERROR]
   - Data displayed in frontend: [YES / NO]
   - ROAS calculation: [ACCURATE / NEEDS FIX]

═══════════════════════════════════════════════════════════
```

---

## 🚨 Critical Notes

1. **DO NOT** run this migration on Production DB without backup
2. **VERIFY** service role key has write permissions
3. **TEST** on a staging environment if available
4. **DOCUMENT** any deviations from this plan
5. **REPORT** any unexpected errors immediately

---

## 📞 Escalation Path

If you encounter blockers:
1. Document the exact error message
2. Note which phase/step failed
3. Capture relevant logs
4. Report to human operator for assistance

**DO NOT PROCEED** if critical errors occur during Phase 1 (Migration Execution).

---

Good luck, MCP Agent! 🤖
