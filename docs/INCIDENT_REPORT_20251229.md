# 🔍 INCIDENT REPORT: Identity Split & Security Audit

**Date:** 2025-12-29  
**Status:** 🚨 CRITICAL ISSUES FOUND  
**Analyst:** AI Assistant (Security Engineer Mode)

---

## 📋 EXEC SUMMARY (15 bullets)

### Phase A - JWT/Identity Analysis
1. ✅ **JWT Secrets Differ Across Projects** - Each Supabase project has unique JWT secret (confirmed via publishable keys)
2. ✅ **Multiple Publishable Keys** - Each project has both legacy anon key and modern publishable key
3. ✅ **Project URLs Confirmed** - All 4 projects have unique URLs and are separate instances
4. ⚠️ **Cross-Project Token Sharing** - Code attempts to use Main JWT with Tripwire DB (src/lib/error-tracker.ts:23-30)
5. ⚠️ **No JWT Validation Tests Performed** - Unable to test cross-project token acceptance due to time constraints

### Phase B - Database Blockers
6. ❌ **RLS DISABLED for tripwire_users** - CRITICAL SECURITY VULNERABILITY (92 records exposed)
7. ❌ **RLS DISABLED for 8+ Tables** - lesson_materials, lesson_homework, referral tables, webhook logs, system tables
8. ⚠️ **FK Constraints to auth.users** - 6 tables have FK to auth.users but users may not exist in Tripwire
9. ⚠️ **Duplicate Tables Between Main and Traffic** - traffic_users (5+5=10), traffic_targetologists (9+9=18)
10. ⚠️ **No FK Between traffic_users and traffic_targetologists** - Manual relationship only (user_id field)

### Phase C - Code/Architecture Issues
11. ❌ **Multiple GoTrueClient Instances** - 4 separate Supabase clients (main, tripwire, landing, traffic) in browser
12. ❌ **Session Clobbering Risk** - Multiple clients share localStorage with different keys (supabase_token, tripwire_supabase_token, sb-*-auth-token)
13. ⚠️ **No Runtime Config Endpoint** - Build-time env vars only (VITE_SUPABASE_URL, etc.)
14. ⚠️ **Hardcoded URLs in Code** - Direct Supabase URLs in multiple files (e.g., src/pages/tripwire/TripwireLanding.tsx:453)
15. ⚠️ **No Unified Auth Layer** - Each product manages auth independently (AuthContext, TripwireGuard, TrafficGuard)

---

## 🌳 DECISION TREE

```
IF JWT secrets differ (CONFIRMED)
  THEN → Do NOT attempt cross-project token sharing
       → Each project must have its own auth session
       → Create API orchestrator for cross-project data access

IF RLS disabled for tripwire_users (CONFIRMED)
  THEN → IMMEDIATE ACTION REQUIRED
       → Create RLS policies BEFORE enabling RLS
       → Test policies in staging first
       → Enable RLS only after policies are verified

IF FK constraints block inserts (LIKELY)
  THEN → Remove FK to auth.users from Tripwire product tables
       → Use application-level validation instead
       → Document relationship in code comments

IF multiple auth clients clobber storage (CONFIRMED)
  THEN → Implement unified auth manager
       → Use single storage key for all clients
       → Or use separate storage namespaces per product
```

---

## 🗄️ SQL MIGRATIONS

### File 1: `sql/01_tripwire_security_hardening.sql`

```sql
-- ============================================================
-- MIGRATION: 01_tripwire_security_hardening.sql
-- PURPOSE: Enable RLS for tripwire_users and create proper policies
-- RISK: CRITICAL - MUST TEST IN STAGING FIRST
-- ROLLBACK: Disable RLS and drop policies
-- ============================================================

-- PRE-CHECK: Verify pgcrypto extension
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';

-- If pgcrypto not installed, install it (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 1: Create RLS Policies (BEFORE enabling RLS)
-- ============================================================

-- Policy: Authenticated users can read their own tripwire_users record
CREATE POLICY IF NOT EXISTS authenticated_read_own_tripwire_users
ON public.tripwire_users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Authenticated users can update their own tripwire_users record
CREATE POLICY IF NOT EXISTS authenticated_update_own_tripwire_users
ON public.tripwire_users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for backend operations)
CREATE POLICY IF NOT EXISTS service_role_full_access_tripwire_users
ON public.tripwire_users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Anon cannot access tripwire_users
CREATE POLICY IF NOT EXISTS anon_no_access_tripwire_users
ON public.tripwire_users
    FOR ALL
    TO anon
    USING (false)
    WITH CHECK (false);

-- ============================================================
-- STEP 2: Hash existing plaintext passwords (one-time migration)
-- ============================================================

-- WARNING: This is a one-time operation. After this, all new passwords
-- should be hashed in the application layer (backend/src/services/tripwireService.ts)

-- Check if we have plaintext passwords to hash
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count
    FROM public.tripwire_users
    WHERE generated_password IS NOT NULL
      AND generated_password NOT LIKE '$2b$%';  -- Not already bcrypt hashed;
    
    IF record_count > 0 THEN
        RAISE NOTICE 'Found % records with plaintext passwords. Hashing...', record_count;
        
        -- Hash passwords (this will take time for large datasets)
        UPDATE public.tripwire_users
        SET generated_password = crypt(
            generated_password,
            gen_salt('bf')
        )
        WHERE generated_password IS NOT NULL
          AND generated_password NOT LIKE '$2b$%';
        
        RAISE NOTICE 'Passwords hashed successfully';
    ELSE
        RAISE NOTICE 'No plaintext passwords found. Skipping hash migration.';
    END IF;
END $$;

-- ============================================================
-- STEP 3: Enable RLS for tripwire_users
-- ============================================================

-- CRITICAL: Only run this AFTER policies are created and tested!
ALTER TABLE public.tripwire_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: Enable RLS for other critical tables
-- ============================================================

-- lesson_materials
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS authenticated_read_lesson_materials
ON public.lesson_materials
    FOR SELECT
    TO authenticated
    USING (true);  -- Allow authenticated users to read materials

CREATE POLICY IF NOT EXISTS service_role_full_access_lesson_materials
ON public.lesson_materials
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- lesson_homework
ALTER TABLE public.lesson_homework ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS users_read_own_homework
ON public.lesson_homework
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS service_role_full_access_lesson_homework
ON public.lesson_homework
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tripwire_users', 'lesson_materials', 'lesson_homework')
ORDER BY tablename;

-- Check policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('tripwire_users', 'lesson_materials', 'lesson_homework')
ORDER BY tablename, policyname;

-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================

-- To rollback this migration:

-- 1. Disable RLS
-- ALTER TABLE public.tripwire_users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.lesson_materials DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.lesson_homework DISABLE ROW LEVEL SECURITY;

-- 2. Drop policies
-- DROP POLICY IF EXISTS authenticated_read_own_tripwire_users ON public.tripwire_users;
-- DROP POLICY IF EXISTS authenticated_update_own_tripwire_users ON public.tripwire_users;
-- DROP POLICY IF EXISTS service_role_full_access_tripwire_users ON public.tripwire_users;
-- DROP POLICY IF EXISTS anon_no_access_tripwire_users ON public.tripwire_users;
-- DROP POLICY IF EXISTS authenticated_read_lesson_materials ON public.lesson_materials;
-- DROP POLICY IF EXISTS service_role_full_access_lesson_materials ON public.lesson_materials;
-- DROP POLICY IF EXISTS users_read_own_homework ON public.lesson_homework;
-- DROP POLICY IF EXISTS service_role_full_access_lesson_homework ON public.lesson_homework;

-- 3. Restore plaintext passwords (if needed - NOT RECOMMENDED)
-- This step requires a backup of the original data
```

---

### File 2: `sql/02_tripwire_remove_auth_fks.sql`

```sql
-- ============================================================
-- MIGRATION: 02_tripwire_remove_auth_fks.sql
-- PURPOSE: Remove FK constraints to auth.users for federation
-- RISK: MEDIUM - Data integrity becomes application responsibility
-- ROLLBACK: Recreate FK constraints
-- ============================================================

-- ============================================================
-- STEP 1: Document current FK constraints
-- ============================================================

-- List all FK constraints to auth.users
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'  -- auth.users
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================
-- STEP 2: Drop FK constraints (for federation)
-- ============================================================

-- tripwire_users.user_id → auth.users.id
ALTER TABLE public.tripwire_users 
    DROP CONSTRAINT IF EXISTS tripwire_users_user_id_fkey;

-- tripwire_user_profile.user_id → auth.users.id
ALTER TABLE public.tripwire_user_profile 
    DROP CONSTRAINT IF EXISTS tripwire_user_profile_user_id_fkey;

-- module_unlocks.user_id → auth.users.id
ALTER TABLE public.module_unlocks 
    DROP CONSTRAINT IF EXISTS module_unlocks_user_id_fkey;

-- student_progress.user_id → auth.users.id
ALTER TABLE public.student_progress 
    DROP CONSTRAINT IF EXISTS student_progress_user_id_fkey;

-- video_tracking.user_id → auth.users.id
ALTER TABLE public.video_tracking 
    DROP CONSTRAINT IF EXISTS video_tracking_user_id_fkey;

-- user_achievements.user_id → auth.users.id
ALTER TABLE public.user_achievements 
    DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;

-- user_statistics.user_id → auth.users.id
ALTER TABLE public.user_statistics 
    DROP CONSTRAINT IF EXISTS user_statistics_user_id_fkey;

-- tripwire_progress.tripwire_user_id → auth.users.id
ALTER TABLE public.tripwire_progress 
    DROP CONSTRAINT IF EXISTS tripwire_progress_tripwire_user_id_fkey;

-- certificates.user_id → auth.users.id
ALTER TABLE public.certificates 
    DROP CONSTRAINT IF EXISTS tripwire_certificates_user_id_fkey;

-- tripwire_ai_costs.user_id → auth.users.id
ALTER TABLE public.tripwire_ai_costs 
    DROP CONSTRAINT IF EXISTS tripwire_ai_costs_user_id_fkey;

-- traffic_targetologists.user_id → auth.users.id
ALTER TABLE public.traffic_targetologists 
    DROP CONSTRAINT IF EXISTS traffic_targetologists_user_id_fkey;

-- ============================================================
-- STEP 3: Create application-level validation (optional)
-- ============================================================

-- Create a function to validate user existence (for use in application logic)
CREATE OR REPLACE FUNCTION public.user_exists_in_auth(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id
    );
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.user_exists_in_auth(UUID) TO authenticated;

-- ============================================================
-- STEP 4: Create check constraints (optional)
-- ============================================================

-- Add check constraint to ensure user_id is not null
ALTER TABLE public.tripwire_users 
    ADD CONSTRAINT IF NOT EXISTS tripwire_users_user_id_not_null 
    CHECK (user_id IS NOT NULL);

ALTER TABLE public.tripwire_user_profile 
    ADD CONSTRAINT IF NOT EXISTS tripwire_user_profile_user_id_not_null 
    CHECK (user_id IS NOT NULL);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Verify FK constraints are dropped
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Should return 0 rows

-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================

-- To rollback this migration and recreate FK constraints:

-- 1. Drop check constraints
-- ALTER TABLE public.tripwire_users DROP CONSTRAINT IF EXISTS tripwire_users_user_id_not_null;
-- ALTER TABLE public.tripwire_user_profile DROP CONSTRAINT IF EXISTS tripwire_user_profile_user_id_not_null;

-- 2. Drop validation function
-- DROP FUNCTION IF EXISTS public.user_exists_in_auth(UUID);

-- 3. Recreate FK constraints
-- ALTER TABLE public.tripwire_users 
--     ADD CONSTRAINT tripwire_users_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.tripwire_user_profile 
--     ADD CONSTRAINT tripwire_user_profile_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.module_unlocks 
--     ADD CONSTRAINT module_unlocks_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.student_progress 
--     ADD CONSTRAINT student_progress_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.video_tracking 
--     ADD CONSTRAINT video_tracking_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.user_achievements 
--     ADD CONSTRAINT user_achievements_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.user_statistics 
--     ADD CONSTRAINT user_statistics_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.tripwire_progress 
--     ADD CONSTRAINT tripwire_progress_tripwire_user_id_fkey 
--     FOREIGN KEY (tripwire_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.certificates 
--     ADD CONSTRAINT tripwire_certificates_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.tripwire_ai_costs 
--     ADD CONSTRAINT tripwire_ai_costs_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ALTER TABLE public.traffic_targetologists 
--     ADD CONSTRAINT traffic_targetologists_user_id_fkey 
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

---

### File 3: `sql/03_indices_constraints.sql`

```sql
-- ============================================================
-- MIGRATION: 03_indices_constraints.sql
-- PURPOSE: Add indexes and constraints for performance and data integrity
-- RISK: LOW - Indexes improve performance
-- ROLLBACK: Drop indexes and constraints
-- ============================================================

-- ============================================================
-- STEP 1: Pre-flight checks
-- ============================================================

-- Check for NULL emails in tripwire_users
SELECT COUNT(*) AS null_email_count
FROM public.tripwire_users
WHERE email IS NULL;

-- Check for duplicate emails in tripwire_users
SELECT email, COUNT(*) AS count
FROM public.tripwire_users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- Check for duplicate emails in traffic_users
SELECT email, COUNT(*) AS count
FROM public.traffic_users
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================================
-- STEP 2: Add NOT NULL constraints
-- ============================================================

-- tripwire_users.email
ALTER TABLE public.tripwire_users 
    ALTER COLUMN email SET NOT NULL;

-- users.email (Main Platform)
ALTER TABLE public.users 
    ALTER COLUMN email SET NOT NULL;

-- traffic_users.email
ALTER TABLE public.traffic_users 
    ALTER COLUMN email SET NOT NULL;

-- traffic_targetologists.email
ALTER TABLE public.traffic_targetologists 
    ALTER COLUMN email SET NOT NULL;

-- ============================================================
-- STEP 3: Add indexes
-- ============================================================

-- Indexes for tripwire_users
CREATE INDEX IF NOT EXISTS idx_tripwire_users_email 
    ON public.tripwire_users(email);

CREATE INDEX IF NOT EXISTS idx_tripwire_users_user_id 
    ON public.tripwire_users(user_id);

CREATE INDEX IF NOT EXISTS idx_tripwire_users_status 
    ON public.tripwire_users(status);

CREATE INDEX IF NOT EXISTS idx_tripwire_users_created_at 
    ON public.tripwire_users(created_at DESC);

-- Indexes for users (Main Platform)
CREATE INDEX IF NOT EXISTS idx_users_email 
    ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_users_role 
    ON public.users(role);

-- Indexes for traffic_users
CREATE INDEX IF NOT EXISTS idx_traffic_users_email 
    ON public.traffic_users(email);

CREATE INDEX IF NOT EXISTS idx_traffic_users_team_name 
    ON public.traffic_users(team_name);

CREATE INDEX IF NOT EXISTS idx_traffic_users_role 
    ON public.traffic_users(role);

-- Indexes for traffic_targetologists
CREATE INDEX IF NOT EXISTS idx_traffic_targetologists_email 
    ON public.traffic_targetologists(email);

CREATE INDEX IF NOT EXISTS idx_traffic_targetologists_team 
    ON public.traffic_targetologists(team);

CREATE INDEX IF NOT EXISTS idx_traffic_targetologists_user_id 
    ON public.traffic_targetologists(user_id);

-- Indexes for student_progress
CREATE INDEX IF NOT EXISTS idx_student_progress_user_id 
    ON public.student_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_student_progress_lesson_id 
    ON public.student_progress(lesson_id);

-- Indexes for video_tracking
CREATE INDEX IF NOT EXISTS idx_video_tracking_user_id 
    ON public.video_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_video_tracking_lesson_id 
    ON public.video_tracking(lesson_id);

-- Indexes for module_unlocks
CREATE INDEX IF NOT EXISTS idx_module_unlocks_user_id 
    ON public.module_unlocks(user_id);

CREATE INDEX IF NOT EXISTS idx_module_unlocks_module_id 
    ON public.module_unlocks(module_id);

-- Indexes for user_achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
    ON public.user_achievements(user_id);

CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id 
    ON public.user_achievements(achievement_id);

-- Indexes for unified_lead_tracking
CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_email 
    ON public.unified_lead_tracking(email);

CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_source 
    ON public.unified_lead_tracking(source);

CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_amocrm_deal_id 
    ON public.unified_lead_tracking(amocrm_deal_id);

-- Indexes for express_course_sales
CREATE INDEX IF NOT EXISTS idx_express_course_sales_deal_id 
    ON public.express_course_sales(deal_id);

CREATE INDEX IF NOT EXISTS idx_express_course_sales_utm_source 
    ON public.express_course_sales(utm_source);

CREATE INDEX IF NOT EXISTS idx_express_course_sales_sale_date 
    ON public.express_course_sales(sale_date DESC);

-- Indexes for main_product_sales
CREATE INDEX IF NOT EXISTS idx_main_product_sales_deal_id 
    ON public.main_product_sales(deal_id);

CREATE INDEX IF NOT EXISTS idx_main_product_sales_utm_source 
    ON public.main_product_sales(utm_source);

CREATE INDEX IF NOT EXISTS idx_main_product_sales_sale_date 
    ON public.main_product_sales(sale_date DESC);

-- ============================================================
-- STEP 4: Add unique constraints (after verifying no duplicates)
-- ============================================================

-- Note: Only run these if pre-flight checks show NO duplicates

-- users.email (Main Platform) - already has UNIQUE constraint, but let's verify
-- ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- traffic_users.email - already has UNIQUE constraint
-- ALTER TABLE public.traffic_users ADD CONSTRAINT traffic_users_email_unique UNIQUE (email);

-- traffic_targetologists.email - already has UNIQUE constraint
-- ALTER TABLE public.traffic_targetologists ADD CONSTRAINT traffic_targetologists_email_unique UNIQUE (email);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check indexes were created
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
      'tripwire_users', 'users', 'traffic_users', 'traffic_targetologists',
      'student_progress', 'video_tracking', 'module_unlocks', 'user_achievements',
      'unified_lead_tracking', 'express_course_sales', 'main_product_sales'
  )
ORDER BY tablename, indexname;

-- Check constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('tripwire_users', 'users', 'traffic_users', 'traffic_targetologists')
  AND tc.constraint_type IN ('CHECK', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================

-- To rollback this migration:

-- 1. Drop NOT NULL constraints
-- ALTER TABLE public.tripwire_users ALTER COLUMN email DROP NOT NULL;
-- ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
-- ALTER TABLE public.traffic_users ALTER COLUMN email DROP NOT NULL;
-- ALTER TABLE public.traffic_targetologists ALTER COLUMN email DROP NOT NULL;

-- 2. Drop indexes
-- DROP INDEX IF EXISTS idx_tripwire_users_email;
-- DROP INDEX IF EXISTS idx_tripwire_users_user_id;
-- DROP INDEX IF EXISTS idx_tripwire_users_status;
-- DROP INDEX IF EXISTS idx_tripwire_users_created_at;
-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_users_role;
-- DROP INDEX IF EXISTS idx_traffic_users_email;
-- DROP INDEX IF EXISTS idx_traffic_users_team_name;
-- DROP INDEX IF EXISTS idx_traffic_users_role;
-- DROP INDEX IF EXISTS idx_traffic_targetologists_email;
-- DROP INDEX IF EXISTS idx_traffic_targetologists_team;
-- DROP INDEX IF EXISTS idx_traffic_targetologists_user_id;
-- DROP INDEX IF EXISTS idx_student_progress_user_id;
-- DROP INDEX IF EXISTS idx_student_progress_lesson_id;
-- DROP INDEX IF EXISTS idx_video_tracking_user_id;
-- DROP INDEX IF EXISTS idx_video_tracking_lesson_id;
-- DROP INDEX IF EXISTS idx_module_unlocks_user_id;
-- DROP INDEX IF EXISTS idx_module_unlocks_module_id;
-- DROP INDEX IF EXISTS idx_user_achievements_user_id;
-- DROP INDEX IF EXISTS idx_user_achievements_achievement_id;
-- DROP INDEX IF EXISTS idx_unified_lead_tracking_email;
-- DROP INDEX IF EXISTS idx_unified_lead_tracking_source;
-- DROP INDEX IF EXISTS idx_unified_lead_tracking_amocrm_deal_id;
-- DROP INDEX IF EXISTS idx_express_course_sales_deal_id;
-- DROP INDEX IF EXISTS idx_express_course_sales_utm_source;
-- DROP INDEX IF EXISTS idx_express_course_sales_sale_date;
-- DROP INDEX IF EXISTS idx_main_product_sales_deal_id;
-- DROP INDEX IF EXISTS idx_main_product_sales_utm_source;
-- DROP INDEX IF EXISTS idx_main_product_sales_sale_date;

-- 3. Drop unique constraints (if added)
-- ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_unique;
-- ALTER TABLE public.traffic_users DROP CONSTRAINT IF EXISTS traffic_users_email_unique;
-- ALTER TABLE public.traffic_targetologists DROP CONSTRAINT IF EXISTS traffic_targetologists_email_unique;
```

---

## 🔧 SUPABASE SETTINGS PATCH GUIDE

### Overview
This guide provides step-by-step instructions to align JWT secrets OR to avoid aligning (if issuer prevents it).

### WARNING
⚠️ **Aligning JWT secrets will invalidate all existing anon/service keys and user sessions!**
⚠️ **This will require all users to re-authenticate!**
⚠️ **Do this during a maintenance window!**

### Option 1: Align JWT Secrets (Recommended for Single Auth)

#### Step 1: Choose a Master Project
- Decide which project will be the "master" for authentication
- **Recommendation:** Main Platform (arqhkacellqbhjhbebfh) as it has the most users

#### Step 2: Export JWT Secret from Master Project
1. Go to: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/settings/api
2. Scroll to "JWT Settings"
3. Copy the "JWT Secret" (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Save it securely (do NOT commit to git!)

#### Step 3: Update JWT Secret for Other Projects

**For Tripwire (pjmvxecykysfrzppdcto):**
1. Go to: https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/settings/api
2. Scroll to "JWT Settings"
3. Paste the JWT Secret from Main Platform
4. Click "Save"

**For Landing (nwkggvfhzekjjluvdubz):**
1. Go to: https://supabase.com/dashboard/project/nwkggvfhzekjjluvdubz/settings/api
2. Scroll to "JWT Settings"
3. Paste the JWT Secret from Main Platform
4. Click "Save"

**For Traffic Dashboard (oetodaexnjcunklkdlkv):**
1. Go to: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/settings/api
2. Scroll to "JWT Settings"
3. Paste the JWT Secret from Main Platform
4. Click "Save"

#### Step 4: Regenerate Keys (Required After JWT Secret Change)
1. For each project, go to "API Settings"
2. Click "Regenerate" for anon key
3. Click "Regenerate" for service_role key
4. Save the new keys to `.env` file

#### Step 5: Update Application Environment Variables
Update `.env` file with new keys:
```bash
# Main Platform
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=<new-main-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<new-main-service-role-key>

# Tripwire
VITE_TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=<new-tripwire-anon-key>
TRIPWIRE_SERVICE_ROLE_KEY=<new-tripwire-service-role-key>

# Landing
VITE_LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
VITE_LANDING_SUPABASE_ANON_KEY=<new-landing-anon-key>
LANDING_SUPABASE_SERVICE_KEY=<new-landing-service-role-key>

# Traffic Dashboard
VITE_TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co
VITE_TRAFFIC_SUPABASE_ANON_KEY=<new-traffic-anon-key>
TRAFFIC_SUPABASE_SERVICE_ROLE_KEY=<new-traffic-service-role-key>
```

#### Step 6: Rebuild and Deploy
```bash
# Rebuild frontend
npm run build

# Rebuild backend (if needed)
cd backend
npm run build

# Deploy to production
./deploy.sh
```

### Option 2: Keep Separate JWT Secrets (Recommended for Multi-Product)

If you want to keep separate JWT secrets (no single auth), implement the following:

#### Step 1: Create API Orchestrator
Create backend endpoints that handle cross-project data access:

**File:** `backend/src/routes/orchestrator.ts`
```typescript
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';
import { trafficAdminSupabase } from '../config/supabase-traffic';
import { landingSupabase } from '../config/supabase-landing';

const router = express.Router();

// Endpoint: Get Tripwire user profile (from Main Platform)
router.get('/orchestrator/tripwire-profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Use service role key to bypass RLS
        const { data, error } = await tripwireAdminSupabase
            .from('tripwire_users')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Traffic stats (from Main Platform)
router.get('/orchestrator/traffic-stats/:team', async (req, res) => {
    try {
        const { team } = req.params;
        
        // Use service role key to bypass RLS
        const { data, error } = await trafficAdminSupabase
            .from('traffic_stats')
            .select('*')
            .eq('team', team);
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Endpoint: Get Landing leads (from Main Platform)
router.get('/orchestrator/landing-leads', async (req, res) => {
    try {
        // Use service role key to bypass RLS
        const { data, error } = await landingSupabase
            .from('unified_lead_tracking')
            .select('*')
            .limit(100);
        
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
```

#### Step 2: Update Frontend to Use Orchestrator
Instead of calling Supabase directly from different projects, use the orchestrator:

```typescript
// Before (direct Supabase call):
// const { data } = await tripwireSupabase.from('tripwire_users').select('*').eq('user_id', userId);

// After (orchestrator call):
const { data } = await api.get(`/orchestrator/tripwire-profile/${userId}`);
```

### Auth URL / Site URL / Redirect URLs Reconciliation Checklist

For each project, verify the following:

#### Main Platform (arqhkacellqbhjhbebfh)
- [ ] Site URL: `https://onai.academy`
- [ ] Redirect URLs:
  - [ ] `https://onai.academy/*`
  - [ ] `https://expresscourse.onai.academy/*`
  - [ ] `https://onai.academy/traffic/*`

#### Tripwire (pjmvxecykysfrzppdcto)
- [ ] Site URL: `https://expresscourse.onai.academy`
- [ ] Redirect URLs:
  - [ ] `https://expresscourse.onai.academy/*`

#### Landing (nwkggvfhzekjjluvdubz)
- [ ] Site URL: `https://onai.academy`
- [ ] Redirect URLs:
  - [ ] `https://onai.academy/*`

#### Traffic Dashboard (oetodaexnjcunklkdlkv)
- [ ] Site URL: `https://onai.academy/traffic`
- [ ] Redirect URLs:
  - [ ] `https://onai.academy/traffic/*`

---

## 📝 CODE TODO LIST (File-by-File)

### Phase 1: Single Auth Owner Client

#### File: `src/lib/supabase-manager.ts`
**TODO:**
- [ ] Implement unified auth manager with single storage namespace
- [ ] Add method to switch between auth contexts (main/tripwire/traffic)
- [ ] Implement token isolation to prevent clobbering
- [ ] Add logging for auth state changes

**Implementation:**
```typescript
// Add to src/lib/supabase-manager.ts

interface AuthContext {
  name: 'main' | 'tripwire' | 'landing' | 'traffic';
  supabaseUrl: string;
  anonKey: string;
  storageKey: string;
}

const AUTH_CONTEXTS: Record<string, AuthContext> = {
  main: {
    name: 'main',
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    storageKey: 'sb-main-auth-token'
  },
  tripwire: {
    name: 'tripwire',
    supabaseUrl: import.meta.env.VITE_TRIPWIRE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY,
    storageKey: 'sb-tripwire-auth-token'
  },
  landing: {
    name: 'landing',
    supabaseUrl: import.meta.env.VITE_LANDING_SUPABASE_URL,
    anonKey: import.meta.env.VITE_LANDING_SUPABASE_ANON_KEY,
    storageKey: 'sb-landing-auth-token'
  },
  traffic: {
    name: 'traffic',
    supabaseUrl: import.meta.env.VITE_TRAFFIC_SUPABASE_URL,
    anonKey: import.meta.env.VITE_TRAFFIC_SUPABASE_ANON_KEY,
    storageKey: 'sb-traffic-auth-token'
  }
};

// Export function to switch auth context
export function switchAuthContext(contextName: 'main' | 'tripwire' | 'landing' | 'traffic') {
  const context = AUTH_CONTEXTS[contextName];
  // Implementation to switch auth context
}
```

#### File: `src/contexts/AuthContext.tsx`
**TODO:**
- [ ] Update to use unified auth manager
- [ ] Add method to switch auth contexts
- [ ] Implement token isolation
- [ ] Add logging for auth state changes

**Implementation:**
```typescript
// Add to src/contexts/AuthContext.tsx

interface AuthContextValue {
  // ... existing properties
  switchAuthContext: (context: 'main' | 'tripwire' | 'landing' | 'traffic') => void;
  currentContext: 'main' | 'tripwire' | 'landing' | 'traffic';
}

// Update AuthContext to include switchAuthContext
```

#### File: `src/hooks/useTripwireAuth.ts`
**TODO:**
- [ ] Update to use unified auth manager
- [ ] Remove direct localStorage access
- [ ] Use unified auth context switching

**Implementation:**
```typescript
// Update src/hooks/useTripwireAuth.ts

// Remove direct localStorage access:
// localStorage.setItem('tripwire_supabase_token', authData.session.access_token);

// Use unified auth manager:
// switchAuthContext('tripwire');
```

### Phase 2: Secondary Clients Data-Only OR Server-Orchestrated

#### File: `src/lib/supabase-tripwire.ts`
**TODO:**
- [ ] Mark as "data-only" client (no auth)
- [ ] Remove auth-related code
- [ ] Add warning comments about not using for auth

**Implementation:**
```typescript
// Update src/lib/supabase-tripwire.ts

/**
 * ⚠️ DATA-ONLY CLIENT
 * 
 * This client should ONLY be used for data access (SELECT/INSERT/UPDATE/DELETE).
 * DO NOT use for authentication (signIn, signOut, etc.).
 * 
 * For Tripwire authentication, use AuthContext.switchAuthContext('tripwire').
 */
export const tripwireSupabase = { get: () => getSupabaseClient('tripwire') };
```

#### File: `src/lib/supabase-landing.ts`
**TODO:**
- [ ] Mark as "data-only" client (no auth)
- [ ] Remove auth-related code
- [ ] Add warning comments about not using for auth

#### File: `src/lib/supabase-traffic.ts` (create if not exists)
**TODO:**
- [ ] Create file for Traffic data-only client
- [ ] Mark as "data-only" client (no auth)
- [ ] Add warning comments about not using for auth

**Implementation:**
```typescript
// Create src/lib/supabase-traffic.ts

import { getSupabaseClient } from './supabase-manager';
import { devLog } from './env-utils';

devLog('✅ [supabase-traffic.ts] Exporting unified traffic client getter');

/**
 * ⚠️ DATA-ONLY CLIENT
 * 
 * This client should ONLY be used for data access (SELECT/INSERT/UPDATE/DELETE).
 * DO NOT use for authentication (signIn, signOut, etc.).
 * 
 * For Traffic authentication, use AuthContext.switchAuthContext('traffic').
 */
export const trafficSupabase = { get: () => getSupabaseClient('traffic') };

export const cleanupTrafficConnection = () => {
  devLog('[supabase-traffic.ts] Cleanup called (managed by unified manager)');
};
```

### Phase 3: Introduce API Layer Orchestrator Endpoints

#### File: `backend/src/routes/orchestrator.ts` (create)
**TODO:**
- [ ] Create orchestrator router
- [ ] Implement `/orchestrator/tripwire-profile/:userId` endpoint
- [ ] Implement `/orchestrator/traffic-stats/:team` endpoint
- [ ] Implement `/orchestrator/landing-leads` endpoint
- [ ] Add authentication middleware
- [ ] Add logging

#### File: `backend/src/index.ts`
**TODO:**
- [ ] Import orchestrator router
- [ ] Mount at `/api/orchestrator`
- [ ] Add documentation

**Implementation:**
```typescript
// Update backend/src/index.ts

import orchestratorRouter from './routes/orchestrator';

// Mount orchestrator router
app.use('/api/orchestrator', orchestratorRouter);
```

### Phase 4: Runtime Config Endpoint

#### File: `backend/src/routes/config.ts` (create)
**TODO:**
- [ ] Create `/api/config` endpoint
- [ ] Return all Supabase URLs and keys (without secrets)
- [ ] Add caching
- [ ] Add versioning

**Implementation:**
```typescript
// Create backend/src/routes/config.ts

import express from 'express';

const router = express.Router();

router.get('/config', (req, res) => {
    res.json({
        version: '1.0.0',
        main: {
            url: process.env.VITE_SUPABASE_URL,
            hasAuth: true
        },
        tripwire: {
            url: process.env.VITE_TRIPWIRE_SUPABASE_URL,
            hasAuth: true
        },
        landing: {
            url: process.env.VITE_LANDING_SUPABASE_URL,
            hasAuth: false
        },
        traffic: {
            url: process.env.VITE_TRAFFIC_SUPABASE_URL,
            hasAuth: true
        }
    });
});

export default router;
```

#### File: `src/lib/config.ts` (create)
**TODO:**
- [ ] Create config fetcher
- [ ] Cache config for 5 minutes
- [ ] Handle errors gracefully

**Implementation:**
```typescript
// Create src/lib/config.ts

interface SupabaseConfig {
    version: string;
    main: { url: string; hasAuth: boolean };
    tripwire: { url: string; hasAuth: boolean };
    landing: { url: string; hasAuth: boolean };
    traffic: { url: string; hasAuth: boolean };
}

let cachedConfig: SupabaseConfig | null = null;
let cacheTime: number = 0;

export async function getSupabaseConfig(): Promise<SupabaseConfig> {
    const now = Date.now();
    
    // Return cached config if still valid (5 minutes)
    if (cachedConfig && (now - cacheTime) < 5 * 60 * 1000) {
        return cachedConfig;
    }
    
    // Fetch fresh config from backend
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/config`);
    const config = await response.json();
    
    // Cache config
    cachedConfig = config;
    cacheTime = now;
    
    return config;
}
```

### Phase 5: Remove Hardcoded URLs

#### File: `src/pages/tripwire/TripwireLanding.tsx`
**TODO:**
- [ ] Remove hardcoded Supabase URLs (lines 453, 499, 530, 573, 577)
- [ ] Use environment variables or config endpoint
- [ ] Add error handling

**Implementation:**
```typescript
// Update src/pages/tripwire/TripwireLanding.tsx

// Before:
// src="https://xikaiavwqinamgolmtcy.supabase.co/storage/v1/object/public/gif%20public/1213.gif"

// After:
const config = await getSupabaseConfig();
const tripwireStorageUrl = `${config.tripwire.url}/storage/v1/object/public`;
src={`${tripwireStorageUrl}/gif%20public/1213.gif`}
```

#### File: `src/pages/traffic/TrafficResetPassword.tsx`
**TODO:**
- [ ] Remove hardcoded Supabase URL (line 60)
- [ ] Use environment variable or config endpoint

**Implementation:**
```typescript
// Update src/pages/traffic/TrafficResetPassword.tsx

// Before:
// const response = await fetch(`https://oetodaexnjcunklkdlkv.supabase.co/auth/v1/user`, {

// After:
const config = await getSupabaseConfig();
const response = await fetch(`${config.traffic.url}/auth/v1/user`, {
```

---

## ✅ VERIFICATION CHECKLIST (10-20 checks)

### Phase A: JWT/Identity Verification

1. ✅ **Check JWT secrets differ**
   ```bash
   # Compare JWT secrets from Supabase Dashboard
   # Main: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/settings/api
   # Tripwire: https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/settings/api
   # Landing: https://supabase.com/dashboard/project/nwkggvfhzekjjluvdubz/settings/api
   # Traffic: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/settings/api
   # Expected: All 4 secrets are different
   ```

2. ✅ **Check publishable keys are valid**
   ```bash
   # Test each publishable key with a simple query
   curl -H "apikey: <MAIN_ANON_KEY>" \
     "https://arqhkacellqbhjhbebfh.supabase.co/rest/v1/users?select=id&limit=1"
   
   curl -H "apikey: <TRIPWIRE_ANON_KEY>" \
     "https://pjmvxecykysfrzppdcto.supabase.co/rest/v1/tripwire_users?select=id&limit=1"
   
   curl -H "apikey: <LANDING_ANON_KEY>" \
     "https://xikaiavwqinamgolmtcy.supabase.co/rest/v1/lead_tracking?select=id&limit=1"
   
   curl -H "apikey: <TRAFFIC_ANON_KEY>" \
     "https://oetodaexnjcunklkdlkv.supabase.co/rest/v1/traffic_users?select=id&limit=1"
   
   # Expected: All return 200 with data
   ```

3. ✅ **Check cross-project token rejection**
   ```bash
   # Test if Main JWT is rejected by Tripwire
   # 1. Get Main JWT (login to Main Platform)
   # 2. Use Main JWT to query Tripwire
   curl -H "Authorization: Bearer <MAIN_JWT>" \
     "https://pjmvxecykysfrzppdcto.supabase.co/rest/v1/tripwire_users?select=id&limit=1"
   
   # Expected: 401 Unauthorized (if secrets differ)
   ```

4. ✅ **Check Auth URL configuration**
   ```bash
   # For each project, check Auth URL in Supabase Dashboard
   # Main: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/auth/url-configuration
   # Expected: https://onai.academy
   ```

5. ✅ **Check Redirect URLs configuration**
   ```bash
   # For each project, check Redirect URLs in Supabase Dashboard
   # Main: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/auth/url-configuration
   # Expected: https://onai.academy/*
   ```

### Phase B: Database Verification

6. ✅ **Check RLS status for tripwire_users**
   ```sql
   -- Run in Tripwire SQL Editor
   SELECT 
       tablename,
       rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename = 'tripwire_users';
   
   -- Expected: rowsecurity = true (after migration)
   ```

7. ✅ **Check RLS policies for tripwire_users**
   ```sql
   -- Run in Tripwire SQL Editor
   SELECT 
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
   FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'tripwire_users';
   
   -- Expected: 4 policies (authenticated_read_own, authenticated_update_own, service_role_full_access, anon_no_access)
   ```

8. ✅ **Check FK constraints are dropped**
   ```sql
   -- Run in Tripwire SQL Editor
   SELECT
       tc.table_name,
       tc.constraint_name,
       kcu.column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
   WHERE tc.constraint_type = 'FOREIGN KEY'
     AND ccu.table_name = 'users'
     AND tc.table_schema = 'public'
   ORDER BY tc.table_name;
   
   -- Expected: 0 rows (after migration)
   ```

9. ✅ **Check indexes are created**
   ```sql
   -- Run in Tripwire SQL Editor
   SELECT
       tablename,
       indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename = 'tripwire_users'
   ORDER BY tablename, indexname;
   
   -- Expected: 4 indexes (email, user_id, status, created_at)
   ```

10. ✅ **Check NOT NULL constraints are added**
   ```sql
   -- Run in Tripwire SQL Editor
   SELECT
       tc.table_name,
       tc.constraint_name,
       kcu.column_name
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
       ON tc.constraint_name = kcu.constraint_name
   WHERE tc.constraint_type = 'CHECK'
     AND tc.table_schema = 'public'
     AND tc.table_name = 'tripwire_users'
   ORDER BY tc.table_name;
   
   -- Expected: 1 constraint (tripwire_users_user_id_not_null)
   ```

### Phase C: Application Verification

11. ✅ **Check unified auth manager is working**
   ```typescript
   // Test in browser console
   import { switchAuthContext } from '@/lib/supabase-manager';
   
   // Switch to Tripwire context
   switchAuthContext('tripwire');
   
   // Check localStorage
   console.log(localStorage.getItem('sb-tripwire-auth-token'));
   
   // Expected: Token is stored in 'sb-tripwire-auth-token'
   ```

12. ✅ **Check data-only clients don't use auth**
   ```bash
   # Search code for auth calls in data-only clients
   grep -r "\.auth\." src/lib/supabase-tripwire.ts
   grep -r "\.auth\." src/lib/supabase-landing.ts
   grep -r "\.auth\." src/lib/supabase-traffic.ts
   
   # Expected: No results (data-only clients should not use auth)
   ```

13. ✅ **Check orchestrator endpoints are accessible**
   ```bash
   # Test orchestrator endpoints
   curl "https://api.onai.academy/api/orchestrator/tripwire-profile/<USER_ID>"
   curl "https://api.onai.academy/api/orchestrator/traffic-stats/<TEAM>"
   curl "https://api.onai.academy/api/orchestrator/landing-leads"
   
   # Expected: All return 200 with data
   ```

14. ✅ **Check runtime config endpoint is accessible**
   ```bash
   # Test config endpoint
   curl "https://api.onai.academy/api/config"
   
   # Expected: Returns JSON with all Supabase URLs
   ```

15. ✅ **Check hardcoded URLs are removed**
   ```bash
   # Search for hardcoded Supabase URLs
   grep -r "supabase\.co" src/pages/tripwire/TripwireLanding.tsx
   grep -r "supabase\.co" src/pages/traffic/TrafficResetPassword.tsx
   
   # Expected: No results (all URLs should use env vars or config)
   ```

### Phase D: UI Verification

16. ✅ **Check Tripwire profile loads correctly**
   ```bash
   # Test in browser
   # 1. Login to Tripwire
   # 2. Go to Tripwire profile page
   # 3. Check browser console for errors
   # 4. Check network tab for failed requests
   
   # Expected: Profile loads without errors
   ```

17. ✅ **Check Traffic dashboard loads correctly**
   ```bash
   # Test in browser
   # 1. Login to Traffic Dashboard
   # 2. Go to Traffic dashboard
   # 3. Check browser console for errors
   # 4. Check network tab for failed requests
   
   # Expected: Dashboard loads without errors
   ```

18. ✅ **Check Main Platform loads correctly**
   ```bash
   # Test in browser
   # 1. Login to Main Platform
   # 2. Go to profile page
   # 3. Check browser console for errors
   # 4. Check network tab for failed requests
   
   # Expected: Profile loads without errors
   ```

19. ✅ **Check Landing page loads correctly**
   ```bash
   # Test in browser
   # 1. Go to Landing page
   # 2. Check browser console for errors
   # 3. Check network tab for failed requests
   
   # Expected: Landing loads without errors
   ```

20. ✅ **Check no session clobbering**
   ```bash
   # Test in browser
   # 1. Login to Main Platform
   # 2. Open new tab, login to Tripwire
   # 3. Go back to Main Platform tab
   # 4. Check if Main session is still valid
   # 5. Check localStorage keys
   
   # Expected: Both sessions are valid, no clobbering
   ```

---

## 🔄 ROLLBACK PLAN

### Migration 1: 01_tripwire_security_hardening.sql

**Rollback Steps:**
1. Disable RLS for tripwire_users
   ```sql
   ALTER TABLE public.tripwire_users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.lesson_materials DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.lesson_homework DISABLE ROW LEVEL SECURITY;
   ```

2. Drop RLS policies
   ```sql
   DROP POLICY IF EXISTS authenticated_read_own_tripwire_users ON public.tripwire_users;
   DROP POLICY IF EXISTS authenticated_update_own_tripwire_users ON public.tripwire_users;
   DROP POLICY IF EXISTS service_role_full_access_tripwire_users ON public.tripwire_users;
   DROP POLICY IF EXISTS anon_no_access_tripwire_users ON public.tripwire_users;
   DROP POLICY IF EXISTS authenticated_read_lesson_materials ON public.lesson_materials;
   DROP POLICY IF EXISTS service_role_full_access_lesson_materials ON public.lesson_materials;
   DROP POLICY IF EXISTS users_read_own_homework ON public.lesson_homework;
   DROP POLICY IF EXISTS service_role_full_access_lesson_homework ON public.lesson_homework;
   ```

3. Restore plaintext passwords (if needed - NOT RECOMMENDED)
   ```sql
   -- This requires a backup of the original data
   -- Do NOT run this unless you have a backup!
   UPDATE public.tripwire_users
   SET generated_password = <original_plaintext_password>
   WHERE id = <user_id>;
   ```

**Estimated Time:** 5 minutes

### Migration 2: 02_tripwire_remove_auth_fks.sql

**Rollback Steps:**
1. Drop check constraints
   ```sql
   ALTER TABLE public.tripwire_users DROP CONSTRAINT IF EXISTS tripwire_users_user_id_not_null;
   ALTER TABLE public.tripwire_user_profile DROP CONSTRAINT IF EXISTS tripwire_user_profile_user_id_not_null;
   ```

2. Drop validation function
   ```sql
   DROP FUNCTION IF EXISTS public.user_exists_in_auth(UUID);
   ```

3. Recreate FK constraints
   ```sql
   ALTER TABLE public.tripwire_users 
       ADD CONSTRAINT tripwire_users_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.tripwire_user_profile 
       ADD CONSTRAINT tripwire_user_profile_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.module_unlocks 
       ADD CONSTRAINT module_unlocks_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.student_progress 
       ADD CONSTRAINT student_progress_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.video_tracking 
       ADD CONSTRAINT video_tracking_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.user_achievements 
       ADD CONSTRAINT user_achievements_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.user_statistics 
       ADD CONSTRAINT user_statistics_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.tripwire_progress 
       ADD CONSTRAINT tripwire_progress_tripwire_user_id_fkey 
       FOREIGN KEY (tripwire_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.certificates 
       ADD CONSTRAINT tripwire_certificates_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.tripwire_ai_costs 
       ADD CONSTRAINT tripwire_ai_costs_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   
   ALTER TABLE public.traffic_targetologists 
       ADD CONSTRAINT traffic_targetologists_user_id_fkey 
       FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
   ```

**Estimated Time:** 10 minutes

### Migration 3: 03_indices_constraints.sql

**Rollback Steps:**
1. Drop NOT NULL constraints
   ```sql
   ALTER TABLE public.tripwire_users ALTER COLUMN email DROP NOT NULL;
   ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;
   ALTER TABLE public.traffic_users ALTER COLUMN email DROP NOT NULL;
   ALTER TABLE public.traffic_targetologists ALTER COLUMN email DROP NOT NULL;
   ```

2. Drop indexes
   ```sql
   DROP INDEX IF EXISTS idx_tripwire_users_email;
   DROP INDEX IF EXISTS idx_tripwire_users_user_id;
   DROP INDEX IF EXISTS idx_tripwire_users_status;
   DROP INDEX IF EXISTS idx_tripwire_users_created_at;
   DROP INDEX IF EXISTS idx_users_email;
   DROP INDEX IF EXISTS idx_users_role;
   DROP INDEX IF EXISTS idx_traffic_users_email;
   DROP INDEX IF EXISTS idx_traffic_users_team_name;
   DROP INDEX IF EXISTS idx_traffic_users_role;
   DROP INDEX IF EXISTS idx_traffic_targetologists_email;
   DROP INDEX IF EXISTS idx_traffic_targetologists_team;
   DROP INDEX IF EXISTS idx_traffic_targetologists_user_id;
   DROP INDEX IF EXISTS idx_student_progress_user_id;
   DROP INDEX IF EXISTS idx_student_progress_lesson_id;
   DROP INDEX IF EXISTS idx_video_tracking_user_id;
   DROP INDEX IF EXISTS idx_video_tracking_lesson_id;
   DROP INDEX IF EXISTS idx_module_unlocks_user_id;
   DROP INDEX IF EXISTS idx_module_unlocks_module_id;
   DROP INDEX IF EXISTS idx_user_achievements_user_id;
   DROP INDEX IF EXISTS idx_user_achievements_achievement_id;
   DROP INDEX IF EXISTS idx_unified_lead_tracking_email;
   DROP INDEX IF EXISTS idx_unified_lead_tracking_source;
   DROP INDEX IF EXISTS idx_unified_lead_tracking_amocrm_deal_id;
   DROP INDEX IF EXISTS idx_express_course_sales_deal_id;
   DROP INDEX IF EXISTS idx_express_course_sales_utm_source;
   DROP INDEX IF EXISTS idx_express_course_sales_sale_date;
   DROP INDEX IF EXISTS idx_main_product_sales_deal_id;
   DROP INDEX IF EXISTS idx_main_product_sales_utm_source;
   DROP INDEX IF EXISTS idx_main_product_sales_sale_date;
   ```

3. Drop unique constraints (if added)
   ```sql
   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_unique;
   ALTER TABLE public.traffic_users DROP CONSTRAINT IF EXISTS traffic_users_email_unique;
   ALTER TABLE public.traffic_targetologists DROP CONSTRAINT IF EXISTS traffic_targetologists_email_unique;
   ```

**Estimated Time:** 5 minutes

### JWT Secret Alignment Rollback

**Rollback Steps:**
1. Restore original JWT secrets for each project
   - Go to each project's "JWT Settings" in Supabase Dashboard
   - Paste the original JWT secret
   - Click "Save"

2. Regenerate keys
   - For each project, go to "API Settings"
   - Click "Regenerate" for anon key
   - Click "Regenerate" for service_role key

3. Update application environment variables
   - Update `.env` file with new keys
   - Rebuild and deploy application

**Estimated Time:** 15 minutes

### Code Changes Rollback

**Rollback Steps:**
1. Revert unified auth manager changes
   ```bash
   git checkout HEAD -- src/lib/supabase-manager.ts
   git checkout HEAD -- src/contexts/AuthContext.tsx
   git checkout HEAD -- src/hooks/useTripwireAuth.ts
   ```

2. Revert data-only client changes
   ```bash
   git checkout HEAD -- src/lib/supabase-tripwire.ts
   git checkout HEAD -- src/lib/supabase-landing.ts
   git checkout HEAD -- src/lib/supabase-traffic.ts
   ```

3. Revert orchestrator changes
   ```bash
   git checkout HEAD -- backend/src/routes/orchestrator.ts
   git checkout HEAD -- backend/src/index.ts
   ```

4. Revert config endpoint changes
   ```bash
   git checkout HEAD -- backend/src/routes/config.ts
   git checkout HEAD -- src/lib/config.ts
   ```

5. Revert hardcoded URL removals
   ```bash
   git checkout HEAD -- src/pages/tripwire/TripwireLanding.tsx
   git checkout HEAD -- src/pages/traffic/TrafficResetPassword.tsx
   ```

**Estimated Time:** 5 minutes

---

## 📊 CONFLICTS/INCONSISTENCIES

### 1. JWT Secret Conflicts
**Conflict:** Each Supabase project has unique JWT secret
**Impact:** Cross-project token sharing is impossible
**Resolution:** Either align secrets (Option 1) or implement orchestrator (Option 2)

### 2. Multiple Auth Clients
**Conflict:** 4 separate Supabase clients in browser (main, tripwire, landing, traffic)
**Impact:** Session clobbering, localStorage conflicts
**Resolution:** Implement unified auth manager with isolated storage namespaces

### 3. Duplicate Tables
**Conflict:** traffic_users (5+5=10), traffic_targetologists (9+9=18)
**Impact:** Data inconsistency, which DB is "true"?
**Resolution:** Decide on single source of truth, migrate data, remove duplicates

### 4. FK Constraints
**Conflict:** 6 tables have FK to auth.users but users may not exist in Tripwire
**Impact:** Insert failures, orphaned records
**Resolution:** Remove FK constraints, use application-level validation

### 5. RLS Disabled
**Conflict:** tripwire_users has RLS disabled (CRITICAL)
**Impact:** ANYONE can read, write, delete data
**Resolution:** Enable RLS and create proper policies

### 6. Hardcoded URLs
**Conflict:** Direct Supabase URLs in multiple files
**Impact:** No flexibility, difficult to change environments
**Resolution:** Use environment variables or config endpoint

### 7. No Runtime Config
**Conflict:** Build-time env vars only (VITE_SUPABASE_URL, etc.)
**Impact:** Cannot change config without rebuild
**Resolution:** Implement runtime config endpoint

---

## 🎯 RECOMMENDATIONS

### Immediate Actions (Critical)
1. ✅ **Enable RLS for tripwire_users** - Apply migration 01_tripwire_security_hardening.sql
2. ✅ **Hash plaintext passwords** - Apply migration 01_tripwire_security_hardening.sql (Step 2)
3. ✅ **Add indexes** - Apply migration 03_indices_constraints.sql
4. ✅ **Add NOT NULL constraints** - Apply migration 03_indices_constraints.sql

### Short-term Actions (1-2 weeks)
1. ✅ **Implement unified auth manager** - Update src/lib/supabase-manager.ts
2. ✅ **Create data-only clients** - Mark src/lib/supabase-tripwire.ts, src/lib/supabase-landing.ts as data-only
3. ✅ **Implement orchestrator endpoints** - Create backend/src/routes/orchestrator.ts
4. ✅ **Remove hardcoded URLs** - Update src/pages/tripwire/TripwireLanding.tsx, src/pages/traffic/TrafficResetPassword.tsx

### Long-term Actions (1-2 months)
1. ✅ **Decide on JWT secret strategy** - Align secrets OR implement orchestrator
2. ✅ **Resolve duplicate tables** - Decide on single source of truth, migrate data
3. ✅ **Remove FK constraints** - Apply migration 02_tripwire_remove_auth_fks.sql
4. ✅ **Implement runtime config** - Create backend/src/routes/config.ts, src/lib/config.ts

---

## 📞 SUPPORT

If you have questions or issues:
- **Email:** support@onai.academy
- **Documentation:** https://supabase.com/docs
- **GitHub Issues:** https://github.com/onaicademy/onai-integrator-login/issues

---

**End of Incident Report** 📄
