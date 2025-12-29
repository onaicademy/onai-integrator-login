-- ============================================================
-- MIGRATION: 01_tripwire_security_hardening.sql
-- PURPOSE: Enable RLS for tripwire_users and create proper policies
-- RISK: CRITICAL - MUST TEST IN STAGING FIRST
-- ROLLBACK: Disable RLS and drop policies
-- ============================================================

-- ============================================================
-- PRE-CHECK: Verify pgcrypto extension
-- ============================================================

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
-- This step requires a backup of original data
