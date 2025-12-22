-- =====================================================
-- DROP TRAFFIC TABLES FROM TRIPWIRE DB
-- Database: pjmvxecykysfrzppdcto.supabase.co
-- Date: 2025-12-22
-- 
-- ⚠️ ONLY RUN AFTER TRAFFIC DB MIGRATION IS COMPLETE!
-- =====================================================

-- Drop all Traffic Dashboard tables from Tripwire DB
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

-- ✅ Cleanup complete!
-- Traffic Dashboard now uses its own dedicated database.
