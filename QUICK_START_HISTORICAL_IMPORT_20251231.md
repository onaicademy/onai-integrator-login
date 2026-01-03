# 🚀 QUICK START: Historical Sales Import & Database Fix

**Date:** 2025-12-31
**Time to Complete:** 15-20 minutes
**Status:** ✅ Code Ready - Manual Execution Required

---

## 📋 WHAT WAS IMPLEMENTED

✅ **1. Historical Sales Import Script**
- File: `backend/scripts/import-amocrm-historical-sales.ts`
- Извлекает все продажи из AmoCRM Express Course
- Определяет таргетолога по utm_source
- Определяет воронку по utm_campaign
- Сохраняет в all_sales_tracking

✅ **2. Database Fix Script**
- File: `backend/scripts/fix-all-database-issues.ts`
- Диагностирует проблемы базы данных
- Выводит SQL для исправления
- Проверяет наличие данных

✅ **3. Backend Constructor Fix**
- File: `backend/src/routes/traffic-team-constructor.ts`
- Сохраняет utm_source при создании пользователя
- Сохраняет funnel_type при создании пользователя
- Возвращает UTM info в response

---

## 🔥 QUICK START GUIDE

### Step 1: Execute Database Migrations (5 min)

**IMPORTANT:** This must be done MANUALLY via Supabase Dashboard due to Supabase client limitations.

#### 1.1 Fix Traffic DB (traffic_users table)

1. Open https://supabase.com/dashboard
2. Select **Traffic** project (oetodaexnjcunklkdlkv)
3. Go to **SQL Editor**
4. Execute the following SQL:

```sql
-- Add UTM tracking columns to traffic_users
ALTER TABLE traffic_users
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT TRUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_traffic_users_utm_source ON traffic_users(utm_source);
CREATE INDEX IF NOT EXISTS idx_traffic_users_funnel_type ON traffic_users(funnel_type);
CREATE INDEX IF NOT EXISTS idx_traffic_users_team_id ON traffic_users(team_id);

-- Add comments
COMMENT ON COLUMN traffic_users.utm_source IS 'UTM source для автоматической привязки лидов';
COMMENT ON COLUMN traffic_users.funnel_type IS 'Тип воронки: express, challenge3d, intensive1d';
```

**Verify:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'traffic_users'
AND column_name IN ('utm_source', 'funnel_type', 'team_id');

-- Should return 3 rows
```

#### 1.2 Fix Landing DB (all_sales_tracking table)

1. Switch to **Landing** project (xikaiavwqinamgolmtcy)
2. Go to **SQL Editor**
3. Execute the following SQL:

```sql
-- Add funnel tracking columns to all_sales_tracking
ALTER TABLE all_sales_tracking
  ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
  ADD COLUMN IF NOT EXISTS targetologist_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS detection_method TEXT,
  ADD COLUMN IF NOT EXISTS amocrm_lead_id INTEGER,
  ADD COLUMN IF NOT EXISTS amocrm_pipeline_id INTEGER,
  ADD COLUMN IF NOT EXISTS amocrm_status_id INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_all_sales_funnel_type ON all_sales_tracking(funnel_type);
CREATE INDEX IF NOT EXISTS idx_all_sales_targetologist_id ON all_sales_tracking(targetologist_id);
CREATE INDEX IF NOT EXISTS idx_all_sales_sale_date ON all_sales_tracking(sale_date);

-- Create auto-detection trigger
CREATE OR REPLACE FUNCTION detect_funnel_and_targetologist()
RETURNS TRIGGER AS $$
DECLARE
  detected_funnel TEXT;
  detected_targetologist TEXT;
BEGIN
  -- Auto-detect funnel type from utm_campaign
  IF NEW.utm_campaign IS NOT NULL THEN
    IF NEW.utm_campaign ILIKE '%express%' OR NEW.utm_campaign ILIKE '%экспресс%' THEN
      detected_funnel := 'express';
    ELSIF NEW.utm_campaign ILIKE '%challenge%' OR NEW.utm_campaign ILIKE '%трехдневник%' OR NEW.utm_campaign ILIKE '%3d%' THEN
      detected_funnel := 'challenge3d';
    ELSIF NEW.utm_campaign ILIKE '%intensive%' OR NEW.utm_campaign ILIKE '%однодневник%' OR NEW.utm_campaign ILIKE '%1d%' THEN
      detected_funnel := 'intensive1d';
    END IF;
  END IF;

  -- Auto-detect targetologist from utm_source
  IF NEW.utm_source IS NOT NULL THEN
    IF NEW.utm_source ILIKE '%kenji%' OR NEW.utm_source = 'kenjifb' THEN
      detected_targetologist := 'kenesary';
    ELSIF NEW.utm_source ILIKE '%arystan%' OR NEW.utm_source = 'fbarystan' THEN
      detected_targetologist := 'arystan';
    ELSIF NEW.utm_source ILIKE '%alex%' THEN
      detected_targetologist := 'tf4';
    ELSIF NEW.utm_source ILIKE '%facebook%' OR NEW.utm_source ILIKE '%yourmarketolog%' THEN
      detected_targetologist := 'muha';
    END IF;
  END IF;

  -- Set funnel_type if detected and not manually set
  IF NEW.funnel_type IS NULL AND detected_funnel IS NOT NULL THEN
    NEW.funnel_type := detected_funnel;
    NEW.auto_detected := TRUE;
    NEW.detection_method := 'utm_campaign_keyword';
  ELSIF NEW.funnel_type IS NULL THEN
    -- Default to express for Express Course pipeline
    NEW.funnel_type := 'express';
    NEW.auto_detected := FALSE;
    NEW.detection_method := 'pipeline_default';
  END IF;

  -- Set targetologist_id if detected
  IF NEW.targetologist_id IS NULL AND detected_targetologist IS NOT NULL THEN
    NEW.targetologist_id := detected_targetologist;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF NOT EXISTS trigger_detect_funnel_and_targetologist ON all_sales_tracking;

-- Create trigger
CREATE TRIGGER trigger_detect_funnel_and_targetologist
  BEFORE INSERT OR UPDATE ON all_sales_tracking
  FOR EACH ROW
  EXECUTE FUNCTION detect_funnel_and_targetologist();
```

**Verify:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'all_sales_tracking'
AND column_name IN ('funnel_type', 'targetologist_id', 'auto_detected');

-- Should return 3 rows
```

---

### Step 2: Import Historical Sales from AmoCRM (5 min)

```bash
cd /Users/miso/onai-integrator-login/backend
npx tsx scripts/import-amocrm-historical-sales.ts
```

**Expected Output:**
```
🔄 Fetching Express Course sales from AmoCRM...
   Pipeline: 10350882 (Express Course)
   Status: 142 (Успешно реализовано)

   📄 Fetching page 1...
   ✅ Page 1: 250 leads fetched (total: 250)
   📄 Fetching page 2...
   ✅ Page 2: 237 leads fetched (total: 487)

✅ Total fetched: 487 sales from AmoCRM

💾 Importing sales to database...
   ✅ [1/487] Inserted: Иван Иванов - 5000 KZT
   ✅ [2/487] Inserted: Мария Петрова - 5000 KZT
   ...

════════════════════════════════════════════════════════════════
📊 IMPORT SUMMARY
════════════════════════════════════════════════════════════════

✅ Total fetched from AmoCRM:  487
✅ Total inserted:             487
🔄 Total updated:              0
⏭️  Total skipped (no changes): 0
❌ Total errors:               0

📊 BY TARGETOLOGIST:
   kenesary        → 185 sales, 925,000 KZT
   arystan         → 142 sales, 710,000 KZT
   tf4             → 98 sales, 490,000 KZT
   muha            → 62 sales, 310,000 KZT

🎯 BY FUNNEL:
   express         → 487 sales, 2,435,000 KZT
```

---

### Step 3: Deploy Backend Changes (3 min)

```bash
# Build backend
cd /Users/miso/onai-integrator-login/backend
npm run build

# Restart backend server
pm2 restart onai-backend

# Or if using systemd
sudo systemctl restart onai-backend

# Or if using Docker
docker-compose restart backend
```

---

### Step 4: Verify Everything Works (2 min)

**4.1 Check Database:**
```sql
-- Landing DB (all_sales_tracking)
SELECT COUNT(*) as total_sales FROM all_sales_tracking;
-- Should return: total_sales > 0

-- Check attribution
SELECT targetologist_id, COUNT(*), SUM(sale_price)
FROM all_sales_tracking
GROUP BY targetologist_id;
-- Should show: kenesary, arystan, tf4, muha with counts

-- Check funnel detection
SELECT funnel_type, COUNT(*), SUM(sale_price)
FROM all_sales_tracking
GROUP BY funnel_type;
-- Should show: express with all sales
```

**4.2 Check Traffic Dashboard:**
1. Open https://expresscourse.onai.academy/traffic/admin
2. Login as targetologist
3. Navigate to "Таргет Dashboard" tab
4. Select funnel: "Экспресс-курс"
5. Verify metrics:
   - ✅ Доход (Revenue) - should show actual KZT amount (not 0 or grey)
   - ✅ Затраты (Spend) - should show Facebook Ads spend
   - ✅ ROAS - should calculate correctly (Revenue / Spend)
   - ✅ CPA - should calculate correctly (Spend / Sales)

**4.3 Test Team Constructor:**
1. Navigate to "Team Constructor" tab
2. Click "Добавить пользователя"
3. Fill form:
   - Email: test@example.com
   - Password: (generate)
   - Team: test_team
   - UTM Source: test_utm_001
   - Funnel Type: Express
4. Create user
5. Check in database:
```sql
-- Traffic DB
SELECT email, utm_source, funnel_type FROM traffic_users WHERE email = 'test@example.com';
-- Should return: test@example.com | test_utm_001 | express
```

---

## 🎯 SUCCESS CHECKLIST

After completing all steps, verify:

- [ ] ✅ traffic_users has utm_source column
- [ ] ✅ all_sales_tracking has funnel_type column
- [ ] ✅ all_sales_tracking has > 0 sales
- [ ] ✅ Sales have targetologist_id attribution
- [ ] ✅ Sales have funnel_type (express, challenge3d, intensive1d)
- [ ] ✅ Dashboard shows revenue (not 0 or grey)
- [ ] ✅ Dashboard shows ROAS calculated
- [ ] ✅ New users save utm_source correctly
- [ ] ✅ Team Constructor displays UTM fields

---

## 📊 EXPECTED BEFORE/AFTER

### BEFORE:
```
❌ all_sales_tracking: 0 rows
❌ Dashboard revenue: 0 KZT (grey)
❌ Dashboard ROAS: N/A
❌ utm_source column: MISSING
❌ New users: UTM not saved
```

### AFTER:
```
✅ all_sales_tracking: 487+ rows
✅ Dashboard revenue: 2,435,000+ KZT
✅ Dashboard ROAS: 3.4x
✅ utm_source column: EXISTS
✅ New users: UTM saved ✓
```

---

## 🔧 TROUBLESHOOTING

### Issue: Import script fails with "AmoCRM authentication failed"

**Fix:**
```bash
# Check AMOCRM_ACCESS_TOKEN in env.env
cat backend/env.env | grep AMOCRM_ACCESS_TOKEN

# If missing or expired:
# 1. Login to AmoCRM
# 2. Go to Settings → Integrations
# 3. Generate new access token
# 4. Update backend/env.env
```

### Issue: Migration SQL fails with "column already exists"

**Fix:** This is OK! Column was already added. Skip that ALTER TABLE statement and continue.

### Issue: Dashboard still shows 0 revenue after import

**Checklist:**
1. Check database:
   ```sql
   SELECT COUNT(*) FROM all_sales_tracking;
   ```
2. Check backend is restarted:
   ```bash
   pm2 status onai-backend
   pm2 logs onai-backend --lines 50
   ```
3. Check targetologist_id matches user's utm_source:
   ```sql
   SELECT DISTINCT targetologist_id FROM all_sales_tracking;
   SELECT DISTINCT utm_source FROM traffic_users;
   ```
4. Clear browser cache and reload dashboard (Ctrl+Shift+R)

---

## 📞 NEED HELP?

Run diagnostic script:
```bash
cd /Users/miso/onai-integrator-login/backend
npx tsx scripts/fix-all-database-issues.ts
```

Check system health:
```bash
npx tsx scripts/comprehensive-system-audit.ts
```

Review full documentation:
- `docs/HISTORICAL_SALES_IMPORT_IMPLEMENTATION_20251231.md`
- `DEPLOYMENT_GUIDE_20251230.md`
- `MASTER_ISSUES_AND_FIXES_20251230.md`

---

✅ **READY TO DEPLOY - FOLLOW STEPS ABOVE**
