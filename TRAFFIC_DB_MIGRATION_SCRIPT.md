# 📦 Traffic Dashboard Database Migration

**Date:** 2025-12-22  
**From:** Tripwire DB (pjmvxecykysfrzppdcto.supabase.co)  
**To:** Traffic DB (oetodaexnjcunklkdlkv.supabase.co)

---

## 🎯 Migration Plan

### Tables to Migrate:
1. ✅ `traffic_teams` (4 rows)
2. ✅ `traffic_users` (5 rows)
3. ✅ `traffic_weekly_plans` (5 rows)
4. ✅ `traffic_admin_settings` (0 rows)
5. ✅ `traffic_targetologist_settings` (0 rows)
6. ✅ `traffic_user_sessions` (18 rows)
7. ✅ `traffic_onboarding_progress` (5 rows)
8. ✅ `traffic_onboarding_step_tracking` (10 rows)
9. ✅ `sales_notifications` (1 row)
10. ✅ `all_sales_tracking` (1 row)
11. ✅ `exchange_rates` (1 row)

---

## 📊 Data Export

### traffic_teams:
- Kenesary (Nutcab)
- Arystan (Arystan)
- Traf4 (ProfTest)
- Muha (OnAI)

### traffic_users:
- kenesary@onai.academy
- arystan@onai.academy
- traf4@onai.academy
- muha@onai.academy
- admin@onai.academy

---

## 🔧 Migration Steps

### Step 1: Apply Schema
```sql
-- Run migration script in Traffic DB
-- File: /tmp/traffic_migration.sql
```

### Step 2: Insert Data
```sql
-- Insert traffic_teams
INSERT INTO traffic_teams (id, name, company, direction, fb_ad_account_id, color, emoji, created_at, updated_at) VALUES
('51e0e842-c9a2-4023-ae8c-a7ffc51431b0', 'Kenesary', 'Nutcab', 'nutcab_tripwire', '1296178948690331', '#00FF88', '👑', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00'),
('a6dae756-db51-45e1-92fc-9c80d0d0fd24', 'Arystan', 'Arystan', 'arystan', '1296178948690331', '#3B82F6', '⚡', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00'),
('b302434f-a9b1-4a00-a33e-7b4269a503ad', 'Muha', 'OnAI', 'onai_zapusk', '1296178948690331', '#F59E0B', '🚀', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00'),
('059175a1-88f9-414d-ba8a-4557f08c83d2', 'Traf4', 'ProfTest', 'proftest', '1296178948690331', '#8B5CF6', '🎯', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00');

-- Insert traffic_users (5 users)
-- Insert traffic_weekly_plans (5 plans)
-- Insert exchange_rates (1 rate)
-- Insert sales_notifications (1 sale)
```

### Step 3: Update Backend Code
```typescript
// Update all files to use trafficAdminSupabase instead of tripwireSupabase
// Files to update:
- backend/src/integrations/traffic-webhook.ts
- backend/src/routes/traffic-auth.ts
- backend/src/routes/traffic-team-constructor.ts
- backend/src/routes/traffic-reports.ts
- backend/src/routes/traffic-detailed-analytics.ts
```

### Step 4: Drop Tables from Tripwire DB
```sql
-- After verification, drop tables from Tripwire DB
DROP TABLE IF EXISTS traffic_onboarding_step_tracking CASCADE;
DROP TABLE IF EXISTS traffic_user_sessions CASCADE;
DROP TABLE IF EXISTS traffic_onboarding_progress CASCADE;
DROP TABLE IF EXISTS traffic_targetologist_settings CASCADE;
DROP TABLE IF EXISTS traffic_weekly_plans CASCADE;
DROP TABLE IF EXISTS traffic_admin_settings CASCADE;
DROP TABLE IF EXISTS traffic_users CASCADE;
DROP TABLE IF EXISTS traffic_teams CASCADE;
DROP TABLE IF EXISTS sales_notifications CASCADE;
DROP TABLE IF EXISTS all_sales_tracking CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
```

---

## ✅ Status

- [ ] Schema applied to Traffic DB
- [ ] Data migrated to Traffic DB
- [ ] Backend code updated
- [ ] Tables dropped from Tripwire DB
- [ ] Testing completed

---

## 📝 Notes

This migration is needed because:
1. Traffic Dashboard should have its own isolated database
2. Tripwire DB should only contain Tripwire-related tables
3. Better separation of concerns and easier maintenance
