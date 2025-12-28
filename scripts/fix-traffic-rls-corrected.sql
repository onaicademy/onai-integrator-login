-- ═══════════════════════════════════════════════════════════
-- 🔐 ИСПРАВЛЕНИЕ RLS ПОЛИТИК - TRAFFIC DASHBOARD (ИСПРАВЛЕННАЯ ВЕРСИЯ)
-- ═══════════════════════════════════════════════════════════
-- База данных: Traffic (oetodaexnjcunklkdlkv)
-- Дата: 2025-12-28
-- Приоритет: P0 - КРИТИЧЕСКИЙ
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- ЭТАП 1: Включение RLS на всех таблицах (только существующие)
-- ═══════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 2: Удаление старых политик (если есть)
-- ═══════════════════════════════════════════════════════════

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

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 3: Создание политик для traffic_users
-- ═════════════════════════════════════════════════════════════

-- Service role имеет полный доступ ко всем таблицам
CREATE POLICY "Service role full access to traffic_users"
ON public.traffic_users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Пользователи могут видеть только свою запись
CREATE POLICY "Users can view own record"
ON public.traffic_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Пользователи могут обновлять только свою запись
CREATE POLICY "Users can update own record"
ON public.traffic_users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Админы могут видеть всех пользователей
CREATE POLICY "Admins can view all users"
ON public.traffic_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- Админы могут создавать пользователей
CREATE POLICY "Admins can insert users"
ON public.traffic_users
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- Админы могут обновлять пользователей
CREATE POLICY "Admins can update users"
ON public.traffic_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- Админы могут удалять пользователей
CREATE POLICY "Admins can delete users"
ON public.traffic_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 4: Создание политик для traffic_teams
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_teams"
ON public.traffic_teams
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view all teams"
ON public.traffic_teams
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage teams"
ON public.traffic_teams
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 5: Создание политик для traffic_user_sessions
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_user_sessions"
ON public.traffic_user_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own sessions"
ON public.traffic_user_sessions
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.traffic_user_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions"
ON public.traffic_user_sessions
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.traffic_user_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid()::text = id::text
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 6: Создание политик для traffic_fb_campaigns
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_fb_campaigns"
ON public.traffic_fb_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view traffic_fb_campaigns"
ON public.traffic_fb_campaigns
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert traffic_fb_campaigns"
ON public.traffic_fb_campaigns
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 7: Создание политик для traffic_fb_ad_sets
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view traffic_fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert traffic_fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 8: Создание политик для traffic_fb_ads
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_fb_ads"
ON public.traffic_fb_ads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view traffic_fb_ads"
ON public.traffic_fb_ads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert traffic_fb_ads"
ON public.traffic_fb_ads
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 9: Создание политик для traffic_sales_stats
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_sales_stats"
ON public.traffic_sales_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view traffic_sales_stats"
ON public.traffic_sales_stats
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert traffic_sales_stats"
ON public.traffic_sales_stats
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 10: Создание политик для traffic_targetologist_settings
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_targetologist_settings"
ON public.traffic_targetologist_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own settings"
ON public.traffic_targetologist_settings
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own settings"
ON public.traffic_targetologist_settings
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all settings"
ON public.traffic_targetologist_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 11: Создание политик для traffic_onboarding_progress
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_onboarding_progress"
ON public.traffic_onboarding_progress
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own onboarding"
ON public.traffic_onboarding_progress
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can update own onboarding"
ON public.traffic_onboarding_progress
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all onboarding"
ON public.traffic_onboarding_progress
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 12: Создание политик для traffic_onboarding_step_tracking
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_onboarding_step_tracking"
ON public.traffic_onboarding_step_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own step tracking"
ON public.traffic_onboarding_step_tracking
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own step tracking"
ON public.traffic_onboarding_step_tracking
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own step tracking"
ON public.traffic_onboarding_step_tracking
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all step tracking"
ON public.traffic_onboarding_step_tracking
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 13: Создание политик для traffic_admin_settings
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_admin_settings"
ON public.traffic_admin_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage admin_settings"
ON public.traffic_admin_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 14: Создание политик для sales_activity_log
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to sales_activity_log"
ON public.sales_activity_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view sales_activity_log"
ON public.sales_activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 15: Создание политик для all_sales_tracking
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to all_sales_tracking"
ON public.all_sales_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view all_sales_tracking"
ON public.all_sales_tracking
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert all_sales_tracking"
ON public.all_sales_tracking
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 16: Создание политик для lead_tracking
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to lead_tracking"
ON public.lead_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view lead_tracking"
ON public.lead_tracking
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert lead_tracking"
ON public.lead_tracking
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═════════════════════════════════════════════════════════════
-- ЭТАП 17: Создание политик для audit_log
-- ═════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to audit_log"
ON public.audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE auth.uid() = id
    AND role = 'admin'
  )
);

-- ═════════════════════════════════════════════════════════════
-- ✅ RLS ПОЛИТИКИ УСТАНОВЛЕНЫ
-- ═════════════════════════════════════════════════════════════
-- Следующий шаг: Выполнить этот SQL в Supabase Traffic Dashboard SQL Editor
-- https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql
-- ═════════════════════════════════════════════════════════════
