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
