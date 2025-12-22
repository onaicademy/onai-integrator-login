# 🚀 Traffic Dashboard Migration Instructions

## ✅ Step-by-Step Guide

### Step 1: Apply Migration to Traffic DB

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql/new
   ```

2. **Copy SQL from file:**
   ```
   /Users/miso/onai-integrator-login/TRAFFIC_DB_MIGRATION_20251222.sql
   ```
   
   или открой файл в редакторе:
   ```bash
   open /Users/miso/onai-integrator-login/TRAFFIC_DB_MIGRATION_20251222.sql
   ```

3. **Paste and Run** in Supabase Dashboard

4. **Verify tables created:**
   - Go to: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/editor
   - Check for tables:
     ✅ traffic_teams (4 rows)
     ✅ traffic_users (5 rows)
     ✅ traffic_weekly_plans (5 rows)
     ✅ sales_notifications (1 row)
     ✅ exchange_rates (1 row)
     ✅ traffic_admin_settings
     ✅ traffic_targetologist_settings
     ✅ traffic_user_sessions
     ✅ traffic_onboarding_progress
     ✅ traffic_onboarding_step_tracking
     ✅ all_sales_tracking

---

### Step 2: After Migration Applied

Return to terminal and type:
```bash
# Confirm migration was applied successfully
echo "Migration applied!" 
```

Then I will:
1. ✅ Update backend code to use trafficSupabase
2. ✅ Drop tables from Tripwire DB
3. ✅ Test the migration

---

## 📊 What Will Be Migrated?

### Data:
- **4 Traffic Teams:** Kenesary, Arystan, Traf4, Muha
- **5 Users:** All targetologists + admin
- **5 Weekly Plans:** Current week plans for all teams
- **1 Exchange Rate:** Current USD/KZT rate
- **1 Test Sale:** Kenesary test sale

### Schema:
- 11 tables
- All foreign keys
- All indexes
- All constraints

---

## ⚠️ Important Notes

1. **Backup:** Migration includes `DROP TABLE IF EXISTS` - safe to run
2. **Data Loss:** This will DROP existing traffic tables in Traffic DB if any
3. **No Rollback:** Migration cannot be auto-rolled back
4. **Duration:** Should take ~10-30 seconds

---

## 🆘 Troubleshooting

### Error: "relation already exists"
- Tables already exist in Traffic DB
- Safe to ignore and continue

### Error: "foreign key constraint"
- Run migration again (idempotent)
- Tables will be dropped and recreated

### Error: "permission denied"
- Make sure you're logged into correct Supabase account
- Check project: oetodaexnjcunklkdlkv

---

## ✅ Ready?

1. Open link above
2. Copy & paste SQL
3. Click "Run"
4. Return here and confirm!
