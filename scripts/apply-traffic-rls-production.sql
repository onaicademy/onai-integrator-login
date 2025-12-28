-- ============================================
-- RLS (Row Level Security) для Traffic Dashboard
-- ============================================
-- Применить этот SQL в Supabase Dashboard: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql

-- 🎯 ЦЕЛЬ: Защита данных Traffic Dashboard
-- Без RLS любой с anon key может читать ВСЕ данные!

-- ============================================
-- 1. Включение RLS на всех таблицах Traffic
-- ============================================

-- Таблица traffic_users
ALTER TABLE public.traffic_users ENABLE ROW LEVEL SECURITY;

-- Таблица traffic_leads
ALTER TABLE public.traffic_leads ENABLE ROW LEVEL SECURITY;

-- Таблица traffic_sales
ALTER TABLE public.traffic_sales ENABLE ROW LEVEL SECURITY;

-- Таблица traffic_analytics
ALTER TABLE public.traffic_analytics ENABLE ROW LEVEL SECURITY;

-- Таблица traffic_daily_reports
ALTER TABLE public.traffic_daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Политики для traffic_users
-- ============================================

-- Admin может видеть всех пользователей
CREATE POLICY "admin_select_all_traffic_users"
ON public.traffic_users
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть пользователей своей команды
CREATE POLICY "targetologist_select_team_traffic_users"
ON public.traffic_users
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  auth.jwt() ->> 'team' = traffic_users.team
);

-- Admin может создавать/обновлять/удалять пользователей
CREATE POLICY "admin_manage_traffic_users"
ON public.traffic_users
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может обновлять только себя
CREATE POLICY "targetologist_update_self"
ON public.traffic_users
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  auth.uid() = traffic_users.id
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  auth.uid() = traffic_users.id
);

-- ============================================
-- 3. Политики для traffic_leads
-- ============================================

-- Admin может видеть все лиды
CREATE POLICY "admin_select_all_traffic_leads"
ON public.traffic_leads
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть лиды своей команды
CREATE POLICY "targetologist_select_team_traffic_leads"
ON public.traffic_leads
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_leads.team = auth.jwt() ->> 'team'
);

-- Admin может создавать/обновлять/удалять лиды
CREATE POLICY "admin_manage_traffic_leads"
ON public.traffic_leads
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может создавать лиды для своей команды
CREATE POLICY "targetologist_insert_team_traffic_leads"
ON public.traffic_leads
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team = auth.jwt() ->> 'team'
);

-- Targetologist может обновлять лиды своей команды
CREATE POLICY "targetologist_update_team_traffic_leads"
ON public.traffic_leads
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_leads.team = auth.jwt() ->> 'team'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team = auth.jwt() ->> 'team'
);

-- ============================================
-- 4. Политики для traffic_sales
-- ============================================

-- Admin может видеть все продажи
CREATE POLICY "admin_select_all_traffic_sales"
ON public.traffic_sales
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть продажи своей команды
CREATE POLICY "targetologist_select_team_traffic_sales"
ON public.traffic_sales
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_sales.team = auth.jwt() ->> 'team'
);

-- Admin может создавать/обновлять/удалять продажи
CREATE POLICY "admin_manage_traffic_sales"
ON public.traffic_sales
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может создавать продажи для своей команды
CREATE POLICY "targetologist_insert_team_traffic_sales"
ON public.traffic_sales
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team = auth.jwt() ->> 'team'
);

-- Targetologist может обновлять продажи своей команды
CREATE POLICY "targetologist_update_team_traffic_sales"
ON public.traffic_sales
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_sales.team = auth.jwt() ->> 'team'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team = auth.jwt() ->> 'team'
);

-- ============================================
-- 5. Политики для traffic_analytics
-- ============================================

-- Admin может видеть всю аналитику
CREATE POLICY "admin_select_all_traffic_analytics"
ON public.traffic_analytics
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть аналитику своей команды
CREATE POLICY "targetologist_select_team_traffic_analytics"
ON public.traffic_analytics
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_analytics.team = auth.jwt() ->> 'team'
);

-- ============================================
-- 6. Политики для traffic_daily_reports
-- ============================================

-- Admin может видеть все отчеты
CREATE POLICY "admin_select_all_traffic_daily_reports"
ON public.traffic_daily_reports
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть отчеты своей команды
CREATE POLICY "targetologist_select_team_traffic_daily_reports"
ON public.traffic_daily_reports
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_daily_reports.team = auth.jwt() ->> 'team'
);

-- ============================================
-- 7. Удаление старых политик (если были)
-- ============================================

-- Удаляем старые политики если они существуют
DROP POLICY IF EXISTS "anon_select_traffic_users" ON public.traffic_users;
DROP POLICY IF EXISTS "anon_select_traffic_leads" ON public.traffic_leads;
DROP POLICY IF EXISTS "anon_select_traffic_sales" ON public.traffic_sales;
DROP POLICY IF EXISTS "anon_select_traffic_analytics" ON public.traffic_analytics;
DROP POLICY IF EXISTS "anon_select_traffic_daily_reports" ON public.traffic_daily_reports;

-- ============================================
-- 8. Проверка применения
-- ============================================

-- Проверка, что RLS включен
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('traffic_users', 'traffic_leads', 'traffic_sales', 'traffic_analytics', 'traffic_daily_reports')
ORDER BY tablename, policyname;

-- ============================================
-- ✅ ГОТОВО!
-- ============================================
-- Теперь Traffic Dashboard защищен RLS политиками
-- Admin имеет полный доступ
-- Targetologist имеет доступ только к своей команде
-- Anon (неавторизованные) НЕ имеют доступа к данным
