# 🔥 SUPABASE TRIGGER ON auth.users NOT FIRING - ULTRA-DETAILED DEBUGGING SESSION

## 🎯 EXECUTIVE SUMMARY

**Problem:** Database trigger on `auth.users` table in Supabase **NEVER fires** when creating users via `supabaseAdmin.auth.admin.createUser()` API.

**Context:** We're building a Tripwire course platform. When sales managers create students, we need to automatically initialize 8+ related tables. Trigger was created following official Supabase recommendations but **DOES NOT FIRE AT ALL**.

**Critical Finding:** After implementing solutions from GitHub #1280 and switching from `AFTER INSERT` to `AFTER UPDATE OF raw_app_meta_data`, the trigger **STILL does not fire**. NO logs appear in PostgreSQL logs (not even `RAISE LOG` or `RAISE WARNING`).

---

## 📋 COMPLETE PROBLEM TIMELINE

### ATTEMPT #1: AFTER INSERT Trigger ❌

**Code:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_tripwire_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE LOG 'Tripwire trigger fired for email: %', NEW.email;
  -- ... initialization code ...
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_tripwire
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tripwire_user();
```

**Result:**
- ❌ User shows "ACCOUNT CREATED!" in frontend
- ❌ User DOES NOT EXIST in `auth.users` table
- ❌ NO logs in PostgreSQL (no `RAISE LOG` output)
- ❌ Dashboard does NOT update (stays at 3 users, not 4)

**Hypothesis:** `app_metadata` not available in INSERT trigger (per GitHub #1280).

---

### ATTEMPT #2: AFTER UPDATE Trigger ❌

**Applied solution from GitHub #1280:**
```sql
-- ✅ Based on official GitHub recommendation
CREATE TRIGGER on_auth_user_created_tripwire_update
  AFTER UPDATE OF raw_app_meta_data, raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data
    OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_new_tripwire_user();
```

**Result:**
- ❌ **SAME PROBLEM!**
- ❌ User shows "ACCOUNT CREATED!" in frontend
- ❌ User DOES NOT EXIST in `auth.users` table
- ❌ NO logs in PostgreSQL (no `RAISE LOG` output)
- ❌ Dashboard does NOT update

**Critical observation:** Even `RAISE LOG` in the FIRST line of trigger function does NOT appear in logs!

---

### ATTEMPT #3: ALTER FUNCTION OWNER TO postgres ❌

**Applied solution from StackOverflow #78996250:**

Based on research that `supabase_auth_admin` role has restricted permissions on `public` schema:

```sql
-- ✅ STEP 1: DROP old function
DROP FUNCTION IF EXISTS public.handle_new_tripwire_user() CASCADE;

-- ✅ STEP 2: CREATE function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_tripwire_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
-- [Full trigger code with 8 table initializations]
$$;

-- ✅ STEP 3: SET OWNER to postgres (КРИТИЧНО!)
ALTER FUNCTION public.handle_new_tripwire_user() OWNER TO postgres;

-- ✅ STEP 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user() TO anon;

-- ✅ STEP 5: CREATE BOTH INSERT and UPDATE triggers
CREATE TRIGGER on_auth_user_created_tripwire
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tripwire_user();

CREATE TRIGGER on_auth_user_metadata_updated_tripwire
  AFTER UPDATE OF raw_user_meta_data, raw_app_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
    OR OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data
  )
  EXECUTE FUNCTION public.handle_new_tripwire_user();
```

**Verification queries confirmed:**
```sql
-- Function owner
SELECT proname, proowner::regrole FROM pg_proc WHERE proname = 'handle_new_tripwire_user';
-- Result: owner = 'postgres' ✅

-- Triggers enabled
SELECT tgname, tgenabled, tgtype FROM pg_trigger WHERE tgname LIKE '%tripwire%';
-- Result: 
--   on_auth_user_created_tripwire: enabled='O', type=5 (AFTER INSERT) ✅
--   on_auth_user_metadata_updated_tripwire: enabled='O', type=17 (AFTER UPDATE) ✅
```

**Test: Created user `finaltriggertest@test.com`**

**Result:**
- ❌ **STILL THE SAME PROBLEM!**
- ❌ Backend logs: "✅ User created + Welcome email sent"
- ❌ Database: `SELECT * FROM auth.users WHERE email = 'finaltriggertest@test.com'` → `[]` (EMPTY!)
- ❌ PostgreSQL logs: NO "Tripwire trigger fired" messages AT ALL!
- ❌ Dashboard: STILL shows 3 students (NOT updated to 4)

**Critical finding:** 
- Function owner IS `postgres` ✅
- Both triggers ARE enabled ✅
- BUT trigger **NEVER executes** (no logs!)
- User creation **appears successful** in backend
- User **does NOT exist** in database (transaction rolled back?)

**Hypothesis:** `ALTER FUNCTION OWNER TO postgres` is NOT sufficient. Trigger still fails due to permissions, causing transaction rollback BEFORE any logs are written!

---

## 🔍 DETAILED CODE INSPECTION

### Backend User Creation (Node.js + Express)

**File:** `backend/src/services/tripwireManagerService.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Tripwire Admin Supabase Client (Service Role Key)
const tripwireAdminSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function createTripwireUser({
  full_name,
  email,
  password,
  currentUserId,
  currentUserEmail,
  currentUserName,
}: {
  full_name: string;
  email: string;
  password: string;
  currentUserId: string;
  currentUserEmail: string;
  currentUserName?: string;
}) {
  console.log('📝 Creating Tripwire user:', email);

  // ✅ Create user via Supabase Admin API
  const { data: newUser, error: createError } = await tripwireAdminSupabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm email
    user_metadata: {
      full_name: full_name,
      platform: 'tripwire',
      granted_by: currentUserId,
      manager_name: currentUserName || currentUserEmail,
    },
    app_metadata: {
      role: 'student',
    },
  });

  if (createError) {
    console.error('❌ Error creating user:', createError);
    throw new Error(createError.message);
  }

  if (!newUser.user) {
    throw new Error('User creation failed: no user returned');
  }

  console.log('✅ User created in auth.users:', newUser.user.id);
  console.log('📊 User metadata:', newUser.user.user_metadata);
  console.log('📊 App metadata:', newUser.user.app_metadata);

  // ⚠️ EXPECTED: Trigger should fire automatically here!
  // ⚠️ ACTUAL: Trigger DOES NOT FIRE!

  return {
    success: true,
    user_id: newUser.user.id,
    email: newUser.user.email,
    generated_password: password,
  };
}
```

**Backend logs show (ATTEMPT #3 - finaltriggertest@test.com):**
```
🚀 Creating Tripwire user: finaltriggertest@test.com
✅ Database trigger automatically created:
✅ Welcome email sent to finaltriggertest@test.com
✅ Welcome email sent to finaltriggertest@test.com
```

**BUT when checking database:**
```sql
SELECT * FROM auth.users WHERE email = 'finaltriggertest@test.com';
-- Result: [] (EMPTY!)

-- Verify trigger exists and enabled
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%tripwire%';
-- Result: 
--   on_auth_user_created_tripwire: enabled='O' ✅
--   on_auth_user_metadata_updated_tripwire: enabled='O' ✅

-- Verify function owner
SELECT proname, proowner::regrole FROM pg_proc WHERE proname = 'handle_new_tripwire_user';
-- Result: owner='postgres' ✅
```

**PostgreSQL logs (last 100 entries):**
- ✅ Shows CREATE TRIGGER statements
- ✅ Shows ALTER FUNCTION OWNER TO postgres
- ✅ Shows connection logs from authenticator
- ❌ NO "Tripwire trigger fired" messages
- ❌ NO "RAISE LOG" or "RAISE WARNING" from our trigger
- ❌ NO errors related to our trigger

---

## 🚨 CRITICAL FINDINGS

### 1. User Appears Created (Backend) but NOT in Database ❗

**Backend says:**
- ✅ `createUser()` returns success
- ✅ `newUser.user.id` exists
- ✅ Metadata is present

**Database says:**
- ❌ `SELECT * FROM auth.users WHERE email = ...` returns `[]`
- ❌ User does NOT exist!

**Hypothesis:** Transaction rollback? But why? Trigger should NOT block user creation (we have `RETURN NEW` and `EXCEPTION` handler).

---

### 2. NO PostgreSQL Logs AT ALL ❗

**Expected in logs:**
```
LOG: Tripwire UPDATE trigger fired for email: updatetrigger@test.com
LOG: Extracted metadata - platform: tripwire, manager: Amina, name: UPDATE Trigger Test User
LOG: Starting initialization for student: updatetrigger@test.com
```

**Actual in logs:**
```
(NOTHING! No RAISE LOG, no RAISE WARNING, no errors)
```

**What logs DO show:**
- ✅ CREATE TRIGGER statements (our SQL commands)
- ✅ Connection logs (authenticator, postgrest)
- ❌ NO trigger execution logs

---

### 3. Frontend Shows Success, Backend Logs Success, Database Empty ❗

**Flow:**
1. Frontend → POST `/api/admin/tripwire/users` ✅
2. Backend → `createUser()` called ✅
3. Supabase Admin API → returns `{ user: { id: '...' } }` ✅
4. Backend → Returns `{ success: true }` ✅
5. Frontend → Shows "ACCOUNT CREATED!" ✅
6. **Database → User does NOT exist** ❌

**This is IMPOSSIBLE unless:**
- Transaction was rolled back (but why? no errors!)
- User was created in WRONG database (but we verified `TRIPWIRE_SUPABASE_URL`)
- Trigger is blocking and causing rollback (but we have `EXCEPTION` handler!)

---

## 🔬 DATABASE SCHEMA DETAILS

### Tables Structure

```sql
-- 1. auth.users (Supabase managed)
CREATE TABLE auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- ... other Supabase auth columns
);

-- 2. public.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. public.tripwire_users
CREATE TABLE public.tripwire_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  granted_by UUID REFERENCES auth.users(id),
  manager_name TEXT,
  status TEXT DEFAULT 'active',
  modules_completed INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 5000,
  generated_password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4-8. Other tables (tripwire_user_profile, module_unlocks, student_progress, user_achievements, user_statistics)
-- All have foreign keys to auth.users(id)
```

---

## 📝 COMPLETE TRIGGER CODE (Current Version)

```sql
-- ✅ FUNCTION with extensive logging
CREATE OR REPLACE FUNCTION public.handle_new_tripwire_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_manager_id UUID;
  v_manager_name TEXT;
  v_full_name TEXT;
  v_platform TEXT;
  v_lesson RECORD;
BEGIN
  -- ✅ FIRST LINE: Should ALWAYS appear if trigger fires!
  RAISE LOG 'Tripwire UPDATE trigger fired for email: %', NEW.email;
  
  -- ✅ Check if already initialized (idempotency)
  IF EXISTS (SELECT 1 FROM public.tripwire_users WHERE user_id = NEW.id) THEN
    RAISE LOG 'User already initialized, skipping: %', NEW.email;
    RETURN NEW;
  END IF;
  
  -- Extract metadata
  v_platform := COALESCE(NEW.raw_app_meta_data->>'platform', NEW.raw_user_meta_data->>'platform', 'manual');
  v_manager_id := COALESCE(
    (NEW.raw_app_meta_data->>'granted_by')::UUID,
    (NEW.raw_user_meta_data->>'granted_by')::UUID
  );
  v_manager_name := COALESCE(
    NEW.raw_app_meta_data->>'manager_name',
    NEW.raw_user_meta_data->>'manager_name',
    'Manual Entry'
  );
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );
  
  RAISE LOG 'Metadata available - platform: %, manager: %, name: %', v_platform, v_manager_name, v_full_name;
  
  -- Skip admin/sales users
  IF (NEW.raw_app_meta_data->>'role' IN ('admin', 'sales', 'sales_manager')) THEN
    RAISE LOG 'Skipping initialization for admin/sales user: %', NEW.email;
    RETURN NEW;
  END IF;
  
  RAISE LOG 'Starting initialization for student: %', NEW.email;
  
  -- Initialize all tables (8 INSERT statements with ON CONFLICT)
  -- [Full code omitted for brevity - includes public.users, tripwire_users, etc.]
  
  RAISE LOG '✅ Tripwire user fully initialized: %', NEW.email;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Tripwire initialization FAILED for %: % (SQLSTATE: %)', 
      NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW; -- ✅ DON'T block signup!
END;
$$;

-- ✅ PERMISSIONS (comprehensive)
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_tripwire_user TO anon;

GRANT SELECT, INSERT, UPDATE ON public.users TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.tripwire_users TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.tripwire_user_profile TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.module_unlocks TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.student_progress TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.user_achievements TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.user_statistics TO supabase_auth_admin;
GRANT SELECT, INSERT, UPDATE ON public.sales_activity_log TO supabase_auth_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;

-- ✅ TRIGGER (UPDATE variant based on GitHub #1280)
DROP TRIGGER IF EXISTS on_auth_user_created_tripwire ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_tripwire_update ON auth.users;

CREATE TRIGGER on_auth_user_created_tripwire_update
  AFTER UPDATE OF raw_app_meta_data, raw_user_meta_data ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.raw_app_meta_data IS DISTINCT FROM NEW.raw_app_meta_data
    OR OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data
  )
  EXECUTE FUNCTION public.handle_new_tripwire_user();

-- ✅ VERIFY trigger is enabled
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  tgtype AS trigger_type
FROM pg_trigger 
WHERE tgname LIKE '%tripwire%';

-- Result:
-- trigger_name: on_auth_user_created_tripwire_update
-- enabled: O (Origin/Always)
-- trigger_type: 17 (AFTER UPDATE)
```

---

## 🧪 TEST SCENARIOS EXECUTED

### Test #1: Create via Frontend Form ❌

```typescript
// Frontend: CreateUserForm.tsx
const response = await fetch(`${API_URL}/api/admin/tripwire/users`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({
    full_name: 'UPDATE Trigger Test User',
    email: 'updatetrigger@test.com',
    password: '6keXzA96hLuu',
  }),
});
```

**Result:**
- Frontend: ✅ "ACCOUNT CREATED!" message
- Backend logs: ✅ User created successfully
- Database: ❌ User NOT in `auth.users`
- Trigger logs: ❌ NO `RAISE LOG` output

---

### Test #2: Direct SQL Check ❌

```sql
-- Check auth.users
SELECT id, email, created_at, raw_user_meta_data, raw_app_meta_data
FROM auth.users
WHERE email = 'updatetrigger@test.com';
-- Result: [] (EMPTY!)

-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname LIKE '%tripwire%';
-- Result: ✅ Trigger exists, enabled: 'O'

-- Check function exists
SELECT proname, prosecdef, provolatile 
FROM pg_proc 
WHERE proname = 'handle_new_tripwire_user';
-- Result: ✅ Function exists, prosecdef: true (SECURITY DEFINER)

-- Check permissions
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'users' 
  AND grantee = 'supabase_auth_admin';
-- Result: ✅ SELECT, INSERT, UPDATE granted
```

---

## 🎯 CRITICAL QUESTIONS FOR RESEARCH

### Question 1: Why does `createUser()` return success but user doesn't exist in DB?

**Evidence (ATTEMPT #3 - with postgres owner):**
- Backend: `createUser()` returns success ✅
- Backend: "Welcome email sent" logged ✅
- Database: `SELECT * FROM auth.users` returns `[]` ❌
- PostgreSQL logs: NO trigger execution (no RAISE LOG) ❌
- Function owner: `postgres` ✅
- Triggers enabled: Both INSERT and UPDATE ✅

**NEW CRITICAL HYPOTHESIS:** 
The trigger IS firing but SILENTLY FAILING due to missing permissions, causing the ENTIRE TRANSACTION (including user creation) to ROLL BACK.

**Why no logs?**
- `RAISE LOG` happens INSIDE the failed transaction
- When transaction rolls back, ALL logs are discarded
- Backend receives "success" from API BEFORE rollback completes

**Need to find:**
- How to debug SILENT trigger failures in Supabase
- Whether `ALTER FUNCTION OWNER TO postgres` is sufficient or if additional GRANTS are needed
- Real examples of triggers successfully writing to multiple tables in `public` schema from `auth.users` trigger

---

### Question 2: Why does user disappear after creation?

**Evidence:**
- Backend: `createUser()` returns `{ user: { id: 'xxx' } }`
- Database: User does NOT exist

**Possible causes:**
- Transaction rollback (but why? no errors in logs!)
- Deferred constraint violation (but which one?)
- Trigger is blocking (but we have `RETURN NEW` and `EXCEPTION` handler!)
- GoTrue creates user in temporary table then moves it (and fails?)

**Need to find:**
- How GoTrue internally handles user creation
- Whether `createUser()` response means "user is COMMITTED to DB" or just "user was ATTEMPTED"

---

### Question 3: Is AFTER UPDATE trigger correct for this use case?

**Based on GitHub #1280:**
> "the user is being created in the DB **BEFORE** the `app_metadata` object is passed into the user row"

**But:** If trigger fires on UPDATE, and we see NO logs, does UPDATE even happen?

**Alternative interpretations:**
1. Maybe GoTrue does NOT update `raw_app_meta_data` at all (stores elsewhere?)
2. Maybe UPDATE happens but trigger condition `WHEN (OLD IS DISTINCT FROM NEW)` fails
3. Maybe we need `AFTER INSERT OR UPDATE` (hybrid approach)

**Need to find:**
- Exact GoTrue SQL sequence for user creation
- Whether `app_metadata` goes to `raw_app_meta_data` or somewhere else
- Real examples of triggers handling BOTH INSERT and UPDATE

---

### Question 4: Should we use Database Webhooks instead?

**From documentation:**
- Supabase Database Webhooks can listen to table changes
- Webhooks call external HTTP endpoint
- More reliable than triggers for auth schema?

**Trade-offs:**
- ✅ Webhooks: Reliable, external execution, can't block user creation
- ❌ Webhooks: Network latency, need external endpoint, harder to debug

**Need to find:**
- Production examples using Database Webhooks for `auth.users`
- Performance comparison: triggers vs webhooks
- Best practices for user initialization in Supabase

---

## 📚 SOURCES TO INVESTIGATE

### Mandatory Reading:
1. https://github.com/supabase/auth/issues/1280 (app_metadata timing)
2. https://github.com/supabase/supabase/issues/17186 (SECURITY DEFINER requirement)
3. https://github.com/orgs/supabase/discussions/7317 (production user creation)
4. https://github.com/orgs/supabase/discussions/20714 (trigger timing issues)

### Additional Sources:
- https://www.reddit.com/r/Supabase/comments/16uiokd/why_cant_i_create_a_trigger_on_authusers_table/
- https://stackoverflow.com/questions/77600776/trigger-function-permissions-issue-in-supabase
- https://www.reddit.com/r/Supabase/comments/1if4ugx/what_is_the_best_way_to_debug_your_trigger/
- https://supabase.com/docs/guides/auth/managing-user-data

### Search Terms:
- "supabase auth.users trigger not firing createUser"
- "gotre user creation bypass triggers"
- "supabase trigger after insert auth schema production"
- "supabase database webhooks vs triggers auth"
- "createUser admin api trigger not working supabase"

---

## 🎓 WHAT WE NEED FROM RESEARCH

### 1. ROOT CAUSE Identification

**Must answer:**
- WHY does user disappear after `createUser()` returns success?
- WHY do triggers (INSERT and UPDATE) NEVER fire?
- WHAT is GoTrue's exact SQL sequence for user creation?

### 2. WORKING Solution (Production-Ready)

**Requirements:**
- ✅ 100% reliable user initialization
- ✅ Works with `admin.createUser()` API
- ✅ Automatic (no manual RPC calls)
- ✅ Idempotent (safe to run multiple times)
- ✅ Production-tested (real examples from GitHub/Reddit)

**Acceptable approaches:**
1. Fixed trigger (if possible)
2. Database Webhooks (if triggers impossible)
3. Auth Hooks (Supabase feature, if stable)
4. Edge Functions (post-signup)
5. Hybrid (trigger + manual backfill + RPC)

### 3. CODE Examples (Copy-Paste Ready)

**Must include:**
- Complete SQL for trigger/webhook setup
- TypeScript code for `createUser()` with correct options
- Verification queries to check if working
- Debug queries to troubleshoot issues

---

## 🚨 ENVIRONMENT DETAILS

- **Supabase Version:** Hosted (supabase.co)
- **PostgreSQL Version:** 15.1 (Supabase-managed)
- **Node.js Version:** 20.x
- **@supabase/supabase-js Version:** 2.x
- **Backend:** Express + TypeScript
- **Authentication:** Service Role Key (admin access)

---

## 💬 FINAL NOTES

This is a **PRODUCTION BLOCKER**. Without automatic user initialization, we cannot launch the platform. Students will have no access to course content.

We've tried (ALL FAILED):
1. ✅ AFTER INSERT trigger → doesn't fire
2. ✅ AFTER UPDATE trigger → doesn't fire  
3. ✅ SECURITY DEFINER → applied
4. ✅ `ALTER FUNCTION OWNER TO postgres` → applied
5. ✅ Comprehensive GRANT statements → applied
6. ✅ RAISE LOG debugging → no output (logs discarded on rollback?)
7. ✅ EXCEPTION handler → included
8. ✅ Idempotency checks → implemented
9. ✅ Both INSERT and UPDATE triggers → created
10. ✅ `SET search_path = public, auth, pg_temp` → applied

**Result: User creation ALWAYS fails silently. Backend returns "success", database shows EMPTY.**

**NEW CRITICAL FINDING:**
Despite `ALTER FUNCTION OWNER TO postgres`, the trigger appears to be SILENTLY FAILING and causing transaction rollback. The `createUser()` API returns success BEFORE the rollback completes, creating false positive.

**We need DEEP RESEARCH to find:
- Real production examples
- Root cause of trigger not firing
- Alternative approaches (webhooks, auth hooks)
- Step-by-step working solution

**Please focus on:**
- GitHub issues with WORKING solutions (not just theory!)
- Reddit/StackOverflow posts with ACTUAL CODE that works in production
- Official Supabase docs about auth triggers and common pitfalls
- Real-world production examples of triggers on `auth.users` successfully writing to `public` schema tables
- Why `ALTER FUNCTION OWNER TO postgres` might NOT be sufficient
- Whether additional table-level GRANTS or POLICIES are needed
- How to debug SILENT trigger failures that cause transaction rollback

**BONUS QUESTIONS:**
1. Does GoTrue use a special transaction isolation level that affects triggers?
2. Are there Row-Level Security (RLS) policies blocking the trigger?
3. Should we use Database Webhooks instead of triggers?
4. Are there any Supabase-specific trigger limitations not documented?

**We are DESPERATE for a working solution!** This is a production blocker. 

Thank you! 🙏

---

## 🔴 LATEST TEST RESULTS (Dec 5, 2025 - 02:22 AM)

**User:** `finaltriggertest@test.com`

**Backend Response:**
```
✅ User created + Welcome email sent
```

**Database State:**
```sql
SELECT * FROM auth.users WHERE email = 'finaltriggertest@test.com';
-- []

SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%tripwire%';
-- on_auth_user_created_tripwire: O (enabled)
-- on_auth_user_metadata_updated_tripwire: O (enabled)

SELECT proname, proowner::regrole FROM pg_proc WHERE proname = 'handle_new_tripwire_user';
-- handle_new_tripwire_user: postgres
```

**Conclusion:** Despite ALL recommended fixes applied, trigger STILL fails silently. User NEVER appears in database.

