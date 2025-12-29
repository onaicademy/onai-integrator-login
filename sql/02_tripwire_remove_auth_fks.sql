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
