-- ═══════════════════════════════════════════════════════
-- 🔐 ИСПРАВЛЕНИЕ RLS ПОЛИТИК - TRAFFIC DASHBOARD (УПРОЩЁННАЯ ВЕРСИЯ)
-- ═══════════════════════════════════════════════════════
-- База данных: Traffic (oetodaexnjcunklkdlkv)
-- Дата: 2025-12-28
-- Приоритет: P0 - КРИТИЧЕСКИЙ
-- ═══════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════
-- ЭТАП 1: Включение RLS на всех таблицах
-- ═══════════════════════════════════════════════════════

ALTER TABLE public.traffic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_fb_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_fb_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_fb_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_sales_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_targetologist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_onboarding_step_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_sales_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════
-- ЭТАП 2: Удаление старых политик (если есть)
-- ═══════════════════════════════════════════════════════

DROP POLICY IF EXISTS "traffic_users_select" ON public.traffic_users;
DROP POLICY IF EXISTS "traffic_users_insert" ON public.traffic_users;
DROP POLICY IF EXISTS "traffic_users_update" ON public.traffic_users;
DROP POLICY IF EXISTS "traffic_users_delete" ON public.traffic_users;

DROP POLICY IF EXISTS "traffic_teams_select" ON public.traffic_teams;
DROP POLICY IF EXISTS "traffic_teams_insert" ON public.traffic_teams;
DROP POLICY IF EXISTS "traffic_teams_update" ON public.traffic_teams;
DROP POLICY IF EXISTS "traffic_teams_delete" ON public.traffic_teams;

DROP POLICY IF EXISTS "traffic_user_sessions_select" ON public.traffic_user_sessions;
DROP POLICY IF EXISTS "traffic_user_sessions_insert" ON public.traffic_user_sessions;
DROP POLICY IF EXISTS "traffic_user_sessions_update" ON public.traffic_user_sessions;
DROP POLICY IF EXISTS "traffic_user_sessions_delete" ON public.traffic_user_sessions;

DROP POLICY IF EXISTS "traffic_fb_campaigns_select" ON public.traffic_fb_campaigns;
DROP POLICY IF EXISTS "traffic_fb_campaigns_insert" ON public.traffic_fb_campaigns;
DROP POLICY IF EXISTS "traffic_fb_campaigns_update" ON public.traffic_fb_campaigns;
DROP POLICY IF EXISTS "traffic_fb_campaigns_delete" ON public.traffic_fb_campaigns;

DROP POLICY IF EXISTS "traffic_fb_ad_sets_select" ON public.traffic_fb_ad_sets;
DROP POLICY IF EXISTS "traffic_fb_ad_sets_insert" ON public.traffic_fb_ad_sets;
DROP POLICY IF EXISTS "traffic_fb_ad_sets_update" ON public.traffic_fb_ad_sets;
DROP POLICY IF EXISTS "traffic_fb_ad_sets_delete" ON public.traffic_fb_ad_sets;

DROP POLICY IF EXISTS "traffic_fb_ads_select" ON public.traffic_fb_ads;
DROP POLICY IF EXISTS "traffic_fb_ads_insert" ON public.traffic_fb_ads;
DROP POLICY IF EXISTS "traffic_fb_ads_update" ON public.traffic_fb_ads;
DROP POLICY IF EXISTS "traffic_fb_ads_delete" ON public.traffic_fb_ads;

DROP POLICY IF EXISTS "traffic_sales_stats_select" ON public.traffic_sales_stats;
DROP POLICY IF EXISTS "traffic_sales_stats_insert" ON public.traffic_sales_stats;
DROP POLICY IF EXISTS "traffic_sales_stats_update" ON public.traffic_sales_stats;
DROP POLICY IF EXISTS "traffic_sales_stats_delete" ON public.traffic_sales_stats;

DROP POLICY IF EXISTS "traffic_targetologist_settings_select" ON public.traffic_targetologist_settings;
DROP POLICY IF EXISTS "traffic_targetologist_settings_insert" ON public.traffic_targetologist_settings;
DROP POLICY IF EXISTS "traffic_targetologist_settings_update" ON public.traffic_targetologist_settings;
DROP POLICY IF EXISTS "traffic_targetologist_settings_delete" ON public.traffic_targetologist_settings;

DROP POLICY IF EXISTS "traffic_onboarding_progress_select" ON public.traffic_onboarding_progress;
DROP POLICY IF EXISTS "traffic_onboarding_progress_insert" ON public.traffic_onboarding_progress;
DROP POLICY IF EXISTS "traffic_onboarding_progress_update" ON public.traffic_onboarding_progress;
DROP POLICY IF EXISTS "traffic_onboarding_progress_delete" ON public.traffic_onboarding_progress;

DROP POLICY IF EXISTS "traffic_onboarding_step_tracking_select" ON public.traffic_onboarding_step_tracking;
DROP POLICY IF EXISTS "traffic_onboarding_step_tracking_insert" ON public.traffic_onboarding_step_tracking;
DROP POLICY IF EXISTS "traffic_onboarding_step_tracking_update" ON public.traffic_onboarding_step_tracking;
DROP POLICY IF EXISTS "traffic_onboarding_step_tracking_delete" ON public.traffic_onboarding_step_tracking;

DROP POLICY IF EXISTS "traffic_admin_settings_select" ON public.traffic_admin_settings;
DROP POLICY IF EXISTS "traffic_admin_settings_insert" ON public.traffic_admin_settings;
DROP POLICY IF EXISTS "traffic_admin_settings_update" ON public.traffic_admin_settings;
DROP POLICY IF EXISTS "traffic_admin_settings_delete" ON public.traffic_admin_settings;

DROP POLICY IF EXISTS "sales_activity_log_select" ON public.sales_activity_log;
DROP POLICY IF EXISTS "sales_activity_log_insert" ON public.sales_activity_log;
DROP POLICY IF EXISTS "sales_activity_log_update" ON public.sales_activity_log;
DROP POLICY IF EXISTS "sales_activity_log_delete" ON public.sales_activity_log;

DROP POLICY IF EXISTS "all_sales_tracking_select" ON public.all_sales_tracking;
DROP POLICY IF EXISTS "all_sales_tracking_insert" ON public.all_sales_tracking;
DROP POLICY IF EXISTS "all_sales_tracking_update" ON public.all_sales_tracking;
DROP POLICY IF EXISTS "all_sales_tracking_delete" ON public.all_sales_tracking;

DROP POLICY IF EXISTS "lead_tracking_select" ON public.lead_tracking;
DROP POLICY IF EXISTS "lead_tracking_insert" ON public.lead_tracking;
DROP POLICY IF EXISTS "lead_tracking_update" ON public.lead_tracking;
DROP POLICY IF EXISTS "lead_tracking_delete" ON public.lead_tracking;

DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_update" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_delete" ON public.audit_log;

-- ═════════════════════════════════════════════════════════
-- ЭТАП 3: Создание простых политик (без сложных проверок admin)
-- ═══════════════════════════════════════════════════════════

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_users"
ON public.traffic_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть всех пользователей
CREATE POLICY "Authenticated users can view all users"
ON public.traffic_users
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_teams"
ON public.traffic_teams
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все команды
CREATE POLICY "Authenticated users can view all teams"
ON public.traffic_teams
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_user_sessions"
ON public.traffic_user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все сессии
CREATE POLICY "Authenticated users can view all sessions"
ON public.traffic_user_sessions
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_fb_campaigns"
ON public.traffic_fb_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все кампании
CREATE POLICY "Authenticated users can view all fb_campaigns"
ON public.traffic_fb_campaigns
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все ad_sets
CREATE POLICY "Authenticated users can view all fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_fb_ads"
ON public.traffic_fb_ads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все ads
CREATE POLICY "Authenticated users can view all fb_ads"
ON public.traffic_fb_ads
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_sales_stats"
ON public.traffic_sales_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть всю статистику
CREATE POLICY "Authenticated users can view all sales_stats"
ON public.traffic_sales_stats
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_targetologist_settings"
ON public.traffic_targetologist_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все настройки
CREATE POLICY "Authenticated users can view all settings"
ON public.traffic_targetologist_settings
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_onboarding_progress"
ON public.traffic_onboarding_progress
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть весь onboarding
CREATE POLICY "Authenticated users can view all onboarding"
ON public.traffic_onboarding_progress
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_onboarding_step_tracking"
ON public.traffic_onboarding_step_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть весь tracking
CREATE POLICY "Authenticated users can view all step_tracking"
ON public.traffic_onboarding_step_tracking
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_admin_settings"
ON public.traffic_admin_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все admin_settings
CREATE POLICY "Authenticated users can view all admin_settings"
ON public.traffic_admin_settings
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to sales_activity_log"
ON public.sales_activity_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все логи активности
CREATE POLICY "Authenticated users can view all sales_activity_log"
ON public.sales_activity_log
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to all_sales_tracking"
ON public.all_sales_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все трекинги продаж
CREATE POLICY "Authenticated users can view all sales_tracking"
ON public.all_sales_tracking
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to lead_tracking"
ON public.lead_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все трекинги лидов
CREATE POLICY "Authenticated users can view all lead_tracking"
ON public.lead_tracking
FOR SELECT
TO authenticated
USING (true);

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to audit_log"
ON public.audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Все аутентифицированные пользователи могут видеть все audit логи
CREATE POLICY "Authenticated users can view all audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);

-- ═══════════════════════════════════════════════════════
-- ✅ RLS ПОЛИТИКИ УСТАНОВЛЕНЫ (УПРОЩЁННАЯ ВЕРСИЯ)
-- ═══════════════════════════════════════════════════════════
-- Следующий шаг: Выполнить этот SQL в Supabase Traffic Dashboard SQL Editor
-- https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql
-- ═════════════════════════════════════════════════════════════
