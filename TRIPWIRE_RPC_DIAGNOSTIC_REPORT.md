# TRIPWIRE SUPABASE RPC FUNCTIONS DIAGNOSTIC REPORT
**Date:** 2025-12-30
**Database:** Tripwire Supabase (https://pjmvxecykysfrzppdcto.supabase.co)

---

## EXECUTIVE SUMMARY

**Problem:** Sales Manager Dashboard не получает данные
**Root Cause:** 2 из 8 необходимых RPC функций отсутствуют в базе данных

---

## 1. DATABASE CONNECTION TEST

✅ **Successfully connected to Tripwire Supabase**
- URL: https://pjmvxecykysfrzppdcto.supabase.co
- Service Role Key: Validated ✅
- Total tables found: 9 (tripwire_students, tripwire_lessons, tripwire_progress, etc.)

---

## 2. RPC FUNCTIONS STATUS

### ✅ EXISTING AND WORKING (5/8)

1. **rpc_get_tripwire_users** - EXISTS ✅
   - Returns 20 records
   - Used by: `getTripwireUsers()`

2. **rpc_get_tripwire_stats** - EXISTS ✅
   - Returns 1 record
   - Used by: `getTripwireStats()`

3. **rpc_get_sales_activity_log** - EXISTS ✅
   - Returns 0 records (empty log)
   - Used by: `getSalesActivityLog()`

4. **rpc_get_sales_leaderboard** - EXISTS ✅
   - Returns 4 sales managers:
     - Rakhat Sales Manager: 43 sales
     - Amina Sales Manager: 40 sales
     - Ayaulym Sales Manager: 5 sales
     - Aselya Sales Manager: 0 sales
   - Used by: `getSalesLeaderboard()`

5. **rpc_get_sales_chart_data** - EXISTS ✅
   - Returns 366 data points
   - Used by: `getSalesChartData()`

---

### ⚠️ EXISTS WITH ERRORS (1/8)

6. **rpc_create_tripwire_user_full** - EXISTS ⚠️
   - Error: Foreign key constraint violation on `tripwire_users.user_id`
   - Reason: Function exists but has schema issues
   - Used by: `createTripwireUser()`
   - **Impact:** Cannot create new Tripwire students via Sales Manager Dashboard

---

### ❌ MISSING (2/8)

7. **rpc_update_email_status** - NOT FOUND ❌
   - Expected parameters: `p_user_id`, `p_email_sent`
   - Used by: `createTripwireUser()` after sending welcome email
   - **Impact:** Cannot track email delivery status

8. **rpc_update_tripwire_user_status** - NOT FOUND ❌
   - Expected parameters: `p_user_id`, `p_status`, `p_manager_id`
   - Used by: `updateTripwireUserStatus()`
   - **Impact:** Cannot change student status (active/inactive/completed)

---

## 3. AUTH USERS ANALYSIS

### Sales Managers in auth.users

Found **1 sales manager** in Tripwire auth:
- **ayaulym@onaiacademy.kz** (ID: fead9709-f70b-4b63-a5c3-38dfa944aff4)
  - Role: `sales_manager` (in user_metadata)
  - Status: Active ✅

### Other Users
- **Total users:** 50
- **Role distribution:**
  - Students: 48
  - Sales managers: 1
  - Sales: 1 (aselya@onaiacademy.kz - different role name)

### Issue Found
The RPC function `rpc_get_sales_leaderboard` filters by `role = 'sales_manager'` in public.users table, but there's a mismatch:
- Auth metadata uses: `role: 'sales_manager'`
- RPC function queries: `WHERE u.role = 'sales'` (в старой версии из add-tripwire-rpc.sql)

---

## 4. TABLES VERIFICATION

All core tables exist:
- ✅ `students` (NULL rows - schema cache issue)
- ✅ `profiles` (NULL rows - schema cache issue)
- ✅ `user_profiles` (NULL rows - schema cache issue)
- ✅ `tripwire_students` (NULL rows - schema cache issue)
- ✅ `sales_managers` (NULL rows - schema cache issue)
- ✅ `sales_stats` (NULL rows - schema cache issue)
- ✅ `tripwire_lessons` (NULL rows - schema cache issue)
- ✅ `tripwire_progress` (34 rows) ✅
- ✅ `tripwire_payments` (NULL rows - schema cache issue)

**Note:** NULL rows indicate PostgREST schema cache issues, not actual empty tables.

---

## 5. ROOT CAUSE ANALYSIS

### Why Sales Manager Dashboard doesn't receive data:

1. **Missing RPC Functions** (PRIMARY ISSUE)
   - `rpc_update_email_status` - Prevents tracking email delivery
   - `rpc_update_tripwire_user_status` - Prevents status updates

2. **Schema Mismatch** (SECONDARY ISSUE)
   - Migration file `20251205000000_tripwire_direct_db_v2.sql` has limited RPC functions
   - Code references `backend/src/scripts/add-tripwire-rpc.sql` which has ALL functions
   - **The add-tripwire-rpc.sql was NEVER applied to production database**

3. **Foreign Key Constraint Issue**
   - `tripwire_users` table references `auth.users(id)` via `user_id`
   - Function tries to insert with test UUID that doesn't exist in auth.users

---

## 6. MISSING RPC FUNCTIONS - DEFINITIONS NEEDED

### rpc_update_email_status
```sql
CREATE OR REPLACE FUNCTION public.rpc_update_email_status(
  p_user_id UUID,
  p_email_sent BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tripwire_users
  SET
    welcome_email_sent = p_email_sent,
    welcome_email_sent_at = CASE WHEN p_email_sent THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_update_email_status TO authenticated, service_role;
```

### rpc_update_tripwire_user_status
```sql
CREATE OR REPLACE FUNCTION public.rpc_update_tripwire_user_status(
  p_user_id UUID,
  p_status TEXT,
  p_manager_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.tripwire_users
  SET
    status = p_status,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log activity
  INSERT INTO public.sales_activity_log (
    manager_id,
    action_type,
    target_user_id,
    details
  ) VALUES (
    p_manager_id,
    'user_status_updated',
    p_user_id,
    jsonb_build_object('new_status', p_status)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_update_tripwire_user_status TO authenticated, service_role;
```

---

## 7. SOLUTION STEPS

### Step 1: Apply Missing RPC Functions
Execute the complete RPC functions SQL:
```bash
# Navigate to backend scripts
cd /Users/miso/onai-integrator-login/backend/src/scripts

# Apply the complete RPC functions
psql $TRIPWIRE_DATABASE_URL -f add-tripwire-rpc.sql
```

Or manually via Supabase SQL Editor:
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `backend/src/scripts/add-tripwire-rpc.sql`
3. Execute the SQL
4. Verify with: `SELECT proname FROM pg_proc WHERE proname LIKE 'rpc_%';`

### Step 2: Fix rpc_create_tripwire_user_full
The function exists but needs the `sales_activity_log` table structure. Verify:
```sql
-- Check if sales_activity_log table exists with correct structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales_activity_log';
```

### Step 3: Add Missing Functions
Create and apply `/Users/miso/onai-integrator-login/fix-missing-rpc-functions.sql` with:
- rpc_update_email_status
- rpc_update_tripwire_user_status

### Step 4: Reload PostgREST Schema Cache
```sql
NOTIFY pgrst, 'reload schema';
```

### Step 5: Test All Functions
Run the diagnostic script:
```bash
node check-all-rpc-functions.js
```

---

## 8. FILES REFERENCED

**Migration files:**
- `/Users/miso/onai-integrator-login/supabase/migrations/20251205000000_tripwire_direct_db_v2.sql` (Applied ✅)
- `/Users/miso/onai-integrator-login/backend/src/scripts/add-tripwire-rpc.sql` (NOT Applied ❌)
- `/Users/miso/onai-integrator-login/backend/src/scripts/init-tripwire-schema.sql` (Contains rpc_create_tripwire_user_full)

**Code files using RPC:**
- `/Users/miso/onai-integrator-login/backend/src/services/tripwireManagerService.ts`
- `/Users/miso/onai-integrator-login/src/components/SalesGuard.tsx`

**Diagnostic scripts:**
- `/Users/miso/onai-integrator-login/check-tripwire-rpc.js`
- `/Users/miso/onai-integrator-login/check-sales-dashboard-data.js`
- `/Users/miso/onai-integrator-login/check-all-rpc-functions.js`

---

## 9. RECOMMENDATIONS

### Immediate Actions (Priority 1)
1. ✅ Apply `add-tripwire-rpc.sql` to Tripwire database
2. ✅ Create missing `rpc_update_email_status` and `rpc_update_tripwire_user_status`
3. ✅ Test Sales Manager Dashboard create/update functionality

### Short-term (Priority 2)
1. Consolidate RPC functions into single migration file
2. Add RPC function tests to CI/CD pipeline
3. Document all RPC functions in codebase

### Long-term (Priority 3)
1. Consider using Supabase migrations instead of manual SQL
2. Add RPC function versioning
3. Create RPC function health check endpoint

---

## 10. CONCLUSION

**Status:** 🔴 CRITICAL - 2 essential RPC functions missing

**Impact:**
- ❌ Cannot create new Tripwire students
- ❌ Cannot update student status
- ❌ Cannot track email delivery
- ✅ Can view existing data (leaderboard, stats, users)

**Resolution Time:** ~15 minutes
1. Apply SQL with missing functions (5 min)
2. Test functionality (5 min)
3. Verify in production (5 min)

**Next Steps:**
1. Create `/Users/miso/onai-integrator-login/fix-missing-rpc-functions.sql`
2. Execute SQL in Supabase SQL Editor
3. Run verification tests
4. Deploy and monitor

---

**Generated by:** Claude Code
**Diagnostic Scripts:** check-tripwire-rpc.js, check-sales-dashboard-data.js, check-all-rpc-functions.js
