-- ═══════════════════════════════════════════════════════════════
-- 🔐 ИСПРАВЛЕНИЕ RLS ПОЛИТИК - TRAFFIC DASHBOARD
-- ═══════════════════════════════════════════════════════════════
-- База данных: Traffic (oetodaexnjcunklkdlkv)
-- Дата: 2025-12-28
-- Приоритет: P0 - КРИТИЧЕСКИЙ
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 1: Включение RLS на всех таблицах
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.traffic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_weekly_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facebook_campaigns ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 2: Удаление старых политик (если есть)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "traffic_users_select" ON public.traffic_users;
DROP POLICY IF EXISTS "traffic_users_insert" ON public.traffic_users;
DROP POLICY IF EXISTS "traffic_users_update" ON public.traffic_users;
DROP POLICY IF EXISTS "traffic_users_delete" ON public.traffic_users;

DROP POLICY IF EXISTS "traffic_teams_select" ON public.traffic_teams;
DROP POLICY IF EXISTS "traffic_teams_insert" ON public.traffic_teams;
DROP POLICY IF EXISTS "traffic_teams_update" ON public.traffic_teams;
DROP POLICY IF EXISTS "traffic_teams_delete" ON public.traffic_teams;

DROP POLICY IF EXISTS "traffic_sessions_select" ON public.traffic_sessions;
DROP POLICY IF EXISTS "traffic_sessions_insert" ON public.traffic_sessions;
DROP POLICY IF EXISTS "traffic_sessions_update" ON public.traffic_sessions;
DROP POLICY IF EXISTS "traffic_sessions_delete" ON public.traffic_sessions;

DROP POLICY IF EXISTS "utm_analytics_select" ON public.utm_analytics;
DROP POLICY IF EXISTS "utm_analytics_insert" ON public.utm_analytics;

DROP POLICY IF EXISTS "team_weekly_plans_select" ON public.team_weekly_plans;
DROP POLICY IF EXISTS "team_weekly_plans_insert" ON public.team_weekly_plans;
DROP POLICY IF EXISTS "team_weekly_plans_update" ON public.team_weekly_plans;
DROP POLICY IF EXISTS "team_weekly_plans_delete" ON public.team_weekly_plans;

DROP POLICY IF EXISTS "team_weekly_kpi_select" ON public.team_weekly_kpi;
DROP POLICY IF EXISTS "team_weekly_kpi_insert" ON public.team_weekly_kpi;
DROP POLICY IF EXISTS "team_weekly_kpi_update" ON public.team_weekly_kpi;

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 3: Создание политик для traffic_users
-- ═══════════════════════════════════════════════════════════════

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
USING (auth.uid() = id OR auth.uid()::text = id::text);

-- Пользователи могут обновлять только свою запись
CREATE POLICY "Users can update own record"
ON public.traffic_users
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR auth.uid()::text = id::text)
WITH CHECK (auth.uid() = id OR auth.uid()::text = id::text);

-- Админы могут видеть всех пользователей
CREATE POLICY "Admins can view all users"
ON public.traffic_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
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
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
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
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
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
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 4: Создание политик для traffic_teams
-- ═══════════════════════════════════════════════════════════════

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
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 5: Создание политик для traffic_sessions
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to traffic_sessions"
ON public.traffic_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view own sessions"
ON public.traffic_sessions
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions"
ON public.traffic_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions"
ON public.traffic_sessions
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all sessions"
ON public.traffic_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 6: Создание политик для utm_analytics
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to utm_analytics"
ON public.utm_analytics
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "All authenticated users can view utm_analytics"
ON public.utm_analytics
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service can insert utm_analytics"
ON public.utm_analytics
FOR INSERT
TO service_role
WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 7: Создание политик для team_weekly_plans
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to team_weekly_plans"
ON public.team_weekly_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view all team plans"
ON public.team_weekly_plans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage team plans"
ON public.team_weekly_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 8: Создание политик для team_weekly_kpi
-- ═══════════════════════════════════════════════════════════════

CREATE POLICY "Service role full access to team_weekly_kpi"
ON public.team_weekly_kpi
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view all team kpi"
ON public.team_weekly_kpi
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage team kpi"
ON public.team_weekly_kpi
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ЭТАП 9: Создание политик для остальных таблиц (все для админов)
-- ═══════════════════════════════════════════════════════════════

-- traffic_settings
CREATE POLICY "Service role full access to traffic_settings"
ON public.traffic_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage traffic_settings"
ON public.traffic_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- webhook_logs
CREATE POLICY "Service role full access to webhook_logs"
ON public.webhook_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view webhook_logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- facebook_ad_accounts
CREATE POLICY "Service role full access to facebook_ad_accounts"
ON public.facebook_ad_accounts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage facebook_ad_accounts"
ON public.facebook_ad_accounts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- facebook_campaigns
CREATE POLICY "Service role full access to facebook_campaigns"
ON public.facebook_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage facebook_campaigns"
ON public.facebook_campaigns
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.traffic_users
    WHERE (auth.uid() = id OR auth.uid()::text = id::text)
    AND role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════════
-- ✅ RLS ПОЛИТИКИ УСТАНОВЛЕНЫ
-- ═══════════════════════════════════════════════════════════════
-- Следующий шаг: Выполнить этот SQL в Supabase Traffic Dashboard SQL Editor
-- https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql
-- ═══════════════════════════════════════════════════════════════
