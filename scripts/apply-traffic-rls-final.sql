-- ============================================
-- RLS (Row Level Security) для Traffic Dashboard
-- ============================================
-- Применить этот SQL в Supabase Dashboard: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql

-- 🎯 ЦЕЛЬ: Защита данных Traffic Dashboard
-- Без RLS любой с anon key может читать ВСЕ данные!

-- ============================================
-- 1. Политики для traffic_users
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
  auth.uid() = traffic_users.team_id
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
-- 2. Политики для traffic_teams
-- ============================================

-- Admin может видеть все команды
CREATE POLICY "admin_select_all_traffic_teams"
ON public.traffic_teams
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть только свою команду
CREATE POLICY "targetologist_select_own_team"
ON public.traffic_teams
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  auth.uid() = traffic_users.team_id
);

-- ============================================
-- 3. Политики для traffic_targetologist_settings
-- ============================================

-- Admin может видеть все настройки
CREATE POLICY "admin_select_all_targetologist_settings"
ON public.traffic_targetologist_settings
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть только свои настройки
CREATE POLICY "targetologist_select_own_settings"
ON public.traffic_targetologist_settings
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  auth.uid() = traffic_targetologist_settings.user_id
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  auth.uid() = traffic_targetologist_settings.user_id
);

-- ============================================
-- 4. Политики для traffic_fb_campaigns
-- ============================================

-- Admin может видеть все кампании
CREATE POLICY "admin_select_all_fb_campaigns"
ON public.traffic_fb_campaigns
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть кампании своей команды
CREATE POLICY "targetologist_select_team_fb_campaigns"
ON public.traffic_fb_campaigns
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_fb_campaigns.team_id IN (
    SELECT id FROM public.traffic_teams WHERE id = (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- Targetologist может создавать кампании для своей команды
CREATE POLICY "targetologist_insert_team_fb_campaigns"
ON public.traffic_fb_campaigns
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team_id IN (
    SELECT id FROM public.traffic_teams WHERE id = (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- Targetologist может обновлять кампании своей команды
CREATE POLICY "targetologist_update_team_fb_campaigns"
ON public.traffic_fb_campaigns
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team_id IN (
    SELECT id FROM public.traffic_teams WHERE id = (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team_id IN (
    SELECT id FROM public.traffic_teams WHERE id = (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 5. Политики для traffic_sales_stats
-- ============================================

-- Admin может видеть всю статистику
CREATE POLICY "admin_select_all_sales_stats"
ON public.traffic_sales_stats
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть статистику своей команды
CREATE POLICY "targetologist_select_team_sales_stats"
ON public.traffic_sales_stats
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_sales_stats.team_id IN (
    SELECT id FROM public.traffic_teams WHERE id = (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 6. Политики для traffic_user_sessions
-- ============================================

-- Admin может видеть все сессии
CREATE POLICY "admin_select_all_user_sessions"
ON public.traffic_user_sessions
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть сессии своей команды
CREATE POLICY "targetologist_select_team_user_sessions"
ON public.traffic_user_sessions
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_user_sessions.team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 7. Политики для traffic_onboarding_progress
-- ============================================

-- Admin может видеть весь прогресс
CREATE POLICY "admin_select_all_onboarding_progress"
ON public.traffic_onboarding_progress
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть прогресс своей команды
CREATE POLICY "targetologist_select_team_onboarding_progress"
ON public.traffic_onboarding_progress
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_onboarding_progress.user_id IN (
    SELECT id FROM public.traffic_users WHERE team_id IN (
      SELECT id FROM public.traffic_teams WHERE id IN (
        SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
      )
    )
  )
);

-- ============================================
-- 8. Политики для traffic_onboarding_step_tracking
-- ============================================

-- Admin может видеть все шаги
CREATE POLICY "admin_select_all_onboarding_steps"
ON public.traffic_onboarding_step_tracking
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть шаги своей команды
CREATE POLICY "targetologist_select_team_onboarding_steps"
ON public.traffic_onboarding_step_tracking
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_onboarding_step_tracking.user_id IN (
    SELECT id FROM public.traffic_users WHERE team_id IN (
      SELECT id FROM public.traffic_teams WHERE id IN (
        SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
      )
    )
  )
);

-- ============================================
-- 9. Политики для lead_tracking
-- ============================================

-- Admin может видеть все лиды
CREATE POLICY "admin_select_all_lead_tracking"
ON public.lead_tracking
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть лиды своей команды
CREATE POLICY "targetologist_select_team_lead_tracking"
ON public.lead_tracking
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  lead_tracking.team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- Targetologist может создавать лиды для своей команды
CREATE POLICY "targetologist_insert_team_lead_tracking"
ON public.lead_tracking
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- Targetologist может обновлять лиды своей команды
CREATE POLICY "targetologist_update_team_lead_tracking"
ON public.lead_tracking
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  lead_tracking.team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'targetologist' AND
  team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 10. Политики для sales_activity_log
-- ============================================

-- Admin может видеть все логи активности
CREATE POLICY "admin_select_all_sales_activity"
ON public.sales_activity_log
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть логи своей команды
CREATE POLICY "targetologist_select_team_sales_activity"
ON public.sales_activity_log
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  sales_activity_log.team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 11. Политики для traffic_fb_ads
-- ============================================

-- Admin может видеть всю FB рекламу
CREATE POLICY "admin_select_all_fb_ads"
ON public.traffic_fb_ads
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть FB рекламу своей команды
CREATE POLICY "targetologist_select_team_fb_ads"
ON public.traffic_fb_ads
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_fb_ads.fb_campaign_id IN (
    SELECT id FROM public.traffic_fb_campaigns WHERE team_id IN (
      SELECT id FROM public.traffic_teams WHERE id IN (
        SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
      )
    )
  )
);

-- ============================================
-- 12. Политики для traffic_fb_ad_sets
-- ============================================

-- Admin может видеть все наборы FB рекламы
CREATE POLICY "admin_select_all_fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть наборы FB рекламы своей команды
CREATE POLICY "targetologist_select_team_fb_ad_sets"
ON public.traffic_fb_ad_sets
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  traffic_fb_ad_sets.fb_campaign_id IN (
    SELECT id FROM public.traffic_fb_campaigns WHERE team_id IN (
      SELECT id FROM public.traffic_teams WHERE id IN (
        SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
      )
    )
  )
);

-- ============================================
-- 13. Политики для audit_log
-- ============================================

-- Admin может видеть весь аудит
CREATE POLICY "admin_select_all_audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть аудит своей команды
CREATE POLICY "targetologist_select_team_audit_log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  audit_log.user_id IN (
    SELECT id FROM public.traffic_users WHERE team_id IN (
      SELECT id FROM public.traffic_teams WHERE id IN (
        SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
      )
    )
  )
);

-- ============================================
-- 14. Политики для all_sales_tracking
-- ============================================

-- Admin может видеть все продажи
CREATE POLICY "admin_select_all_sales_tracking"
ON public.all_sales_tracking
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Targetologist может видеть продажи своей команды
CREATE POLICY "targetologist_select_team_sales_tracking"
ON public.all_sales_tracking
FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'targetologist' AND
  all_sales_tracking.team_name IN (
    SELECT name FROM public.traffic_teams WHERE id IN (
      SELECT team_id FROM public.traffic_users WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- 15. Политики для traffic_admin_settings
-- ============================================

-- Admin может видеть все настройки
CREATE POLICY "admin_select_all_admin_settings"
ON public.traffic_admin_settings
FOR ALL
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
)
WITH CHECK (
  auth.jwt() ->> 'role' = 'admin'
);

-- ============================================
-- 16. Проверка применения
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
  AND tablename IN (
    'traffic_users',
    'traffic_teams',
    'traffic_targetologist_settings',
    'traffic_fb_campaigns',
    'traffic_sales_stats',
    'traffic_user_sessions',
    'traffic_onboarding_progress',
    'traffic_onboarding_step_tracking',
    'lead_tracking',
    'sales_activity_log',
    'traffic_fb_ads',
    'traffic_fb_ad_sets',
    'audit_log',
    'all_sales_tracking',
    'traffic_admin_settings'
  )
ORDER BY tablename, policyname;

-- ============================================
-- ✅ ГОТОВО!
-- ============================================
-- Теперь Traffic Dashboard защищен RLS политиками
-- Admin имеет полный доступ
-- Targetologist имеет доступ только к своей команде
-- Anon (неавторизованные) НЕ имеют доступа к данным
