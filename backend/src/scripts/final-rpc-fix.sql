-- =================================================================
-- TRIPWIRE RPC FUNCTIONS - BULLETPROOF FIX
-- =================================================================
-- 🔥 ФИНАЛЬНОЕ решение проблемы PostgREST schema cache
-- Based on Perplexity AI deep research
-- =================================================================
-- КЛЮЧЕВЫЕ ФАКТОРЫ:
-- 1. undefined параметры → используем ?? null вместо || null
-- 2. search_path → SET search_path = public, pg_temp;
-- 3. Алфавитный порядок параметров (КРИТИЧНО!)
-- 4. Гонка транзакций → COMMIT + pg_sleep(3) + NOTIFY
-- =================================================================

-- =================================================================
-- STEP 1: Убиваем ВСЕ "призраки" функций
-- =================================================================
-- Удаляем функции со ВСЕМИ возможными сигнатурами

-- Function 1: rpc_get_sales_leaderboard (без параметров)
DROP FUNCTION IF EXISTS public.rpc_get_sales_leaderboard();
DROP FUNCTION IF EXISTS public.rpc_get_sales_leaderboard() CASCADE;

-- Function 2: rpc_get_sales_activity_log (все возможные сигнатуры)
DROP FUNCTION IF EXISTS public.rpc_get_sales_activity_log(TIMESTAMPTZ, INTEGER, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_sales_activity_log(TIMESTAMPTZ, INTEGER, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_sales_activity_log(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_sales_activity_log(p_end_date TIMESTAMPTZ, p_limit INTEGER, p_manager_id UUID, p_start_date TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_sales_activity_log(p_manager_id UUID, p_limit INTEGER, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ);

-- Function 3: rpc_get_sales_chart_data (все возможные сигнатуры)
DROP FUNCTION IF EXISTS public.rpc_get_sales_chart_data(TIMESTAMPTZ, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_sales_chart_data(TIMESTAMPTZ, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_sales_chart_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_sales_chart_data(p_end_date TIMESTAMPTZ, p_manager_id UUID, p_start_date TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_sales_chart_data(p_manager_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ);

-- Function 4: rpc_get_tripwire_stats (все возможные сигнатуры)
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_stats(TIMESTAMPTZ, UUID, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_stats(TIMESTAMPTZ, UUID, TIMESTAMPTZ) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_stats(p_end_date TIMESTAMPTZ, p_manager_id UUID, p_start_date TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_stats(p_manager_id UUID, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ);

-- Function 5: rpc_get_tripwire_users (все возможные сигнатуры)
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_users(TIMESTAMPTZ, INTEGER, UUID, INTEGER, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_users(TIMESTAMPTZ, INTEGER, UUID, INTEGER, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_users(UUID, TEXT, INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_users(p_end_date TIMESTAMPTZ, p_limit INTEGER, p_manager_id UUID, p_page INTEGER, p_start_date TIMESTAMPTZ, p_status TEXT);
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_users(p_manager_id UUID, p_status TEXT, p_page INTEGER, p_limit INTEGER, p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ);

-- =================================================================
-- STEP 2: Создаем функции с BULLETPROOF настройками
-- =================================================================

-- ================================================================
-- FUNCTION 1: rpc_get_sales_leaderboard (БЕЗ ПАРАМЕТРОВ)
-- ================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_sales_leaderboard()
RETURNS TABLE (
  manager_id UUID,
  manager_name TEXT,
  total_sales INTEGER,
  active_students INTEGER,
  completed_students INTEGER,
  total_revenue NUMERIC,
  rank INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tw.granted_by AS manager_id,
    u.full_name AS manager_name,
    COUNT(tw.id)::INTEGER AS total_sales,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active')::INTEGER AS active_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::INTEGER AS completed_students,
    0::NUMERIC AS total_revenue,
    ROW_NUMBER() OVER (ORDER BY COUNT(tw.id) DESC)::INTEGER AS rank
  FROM public.tripwire_users tw
  LEFT JOIN public.users u ON u.id = tw.granted_by
  WHERE tw.granted_by IS NOT NULL
  GROUP BY tw.granted_by, u.full_name
  ORDER BY COUNT(tw.id) DESC;
END;
$$;

-- ================================================================
-- FUNCTION 2: rpc_get_sales_activity_log
-- 🔥 ПАРАМЕТРЫ В СТРОГОМ АЛФАВИТНОМ ПОРЯДКЕ: end, limit, manager, start
-- ================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_sales_activity_log(
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_manager_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  manager_id UUID,
  manager_name TEXT,
  action_type TEXT,
  target_user_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id,
    sal.manager_id,
    COALESCE(u.full_name, u.email, 'Unknown') AS manager_name,
    sal.action_type,
    sal.target_user_id,
    sal.details,
    sal.created_at
  FROM public.sales_activity_log sal
  LEFT JOIN public.users u ON u.id = sal.manager_id
  WHERE 
    (p_manager_id IS NULL OR sal.manager_id = p_manager_id)
    AND (p_start_date IS NULL OR sal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR sal.created_at <= p_end_date)
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- ================================================================
-- FUNCTION 3: rpc_get_sales_chart_data
-- 🔥 ПАРАМЕТРЫ В СТРОГОМ АЛФАВИТНОМ ПОРЯДКЕ: end, manager, start
-- ================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_sales_chart_data(
  p_end_date TIMESTAMPTZ DEFAULT NOW(),
  p_manager_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '30 days')
)
RETURNS TABLE (
  date DATE,
  total_sales INTEGER,
  cumulative_sales INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      DATE(p_start_date),
      DATE(p_end_date),
      '1 day'::INTERVAL
    )::DATE AS date
  )
  SELECT 
    ds.date,
    COUNT(tw.id)::INTEGER AS total_sales,
    COUNT(tw.id)::INTEGER AS cumulative_sales
  FROM date_series ds
  LEFT JOIN public.tripwire_users tw ON tw.created_at::DATE <= ds.date
    AND (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$;

-- ================================================================
-- FUNCTION 4: rpc_get_tripwire_stats
-- 🔥 ПАРАМЕТРЫ В СТРОГОМ АЛФАВИТНОМ ПОРЯДКЕ: end, manager, start
-- ================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_stats(
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_students INTEGER,
  active_students INTEGER,
  completed_students INTEGER,
  inactive_students INTEGER,
  total_revenue NUMERIC,
  avg_completion_rate NUMERIC,
  students_this_month INTEGER,
  students_this_week INTEGER,
  revenue_this_month NUMERIC,
  avg_modules_completed NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(tw.id)::INTEGER AS total_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active')::INTEGER AS active_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::INTEGER AS completed_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'inactive')::INTEGER AS inactive_students,
    0::NUMERIC AS total_revenue,
    CASE 
      WHEN COUNT(tw.id) > 0 THEN 
        ROUND((COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::NUMERIC / COUNT(tw.id)::NUMERIC) * 100, 1)
      ELSE 0
    END AS avg_completion_rate,
    COUNT(tw.id) FILTER (WHERE tw.created_at >= DATE_TRUNC('month', NOW()))::INTEGER AS students_this_month,
    COUNT(tw.id) FILTER (WHERE tw.created_at >= DATE_TRUNC('week', NOW()))::INTEGER AS students_this_week,
    0::NUMERIC AS revenue_this_month,
    ROUND(AVG(tw.modules_completed), 1) AS avg_modules_completed
  FROM public.tripwire_users tw
  WHERE 
    (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
    AND (p_start_date IS NULL OR tw.created_at >= p_start_date)
    AND (p_end_date IS NULL OR tw.created_at <= p_end_date);
END;
$$;

-- ================================================================
-- FUNCTION 5: rpc_get_tripwire_users
-- 🔥 ПАРАМЕТРЫ В СТРОГОМ АЛФАВИТНОМ ПОРЯДКЕ: end, limit, manager, page, start, status
-- ================================================================
CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_users(
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_manager_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  status TEXT,
  modules_completed INTEGER,
  granted_by UUID,
  manager_name TEXT,
  created_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  RETURN QUERY
  WITH filtered_users AS (
    SELECT 
      tw.id,
      u.email,
      u.full_name,
      tw.status,
      tw.modules_completed,
      tw.granted_by,
      manager.full_name AS manager_name,
      tw.created_at,
      tw.last_active_at
    FROM public.tripwire_users tw
    LEFT JOIN public.users u ON u.id = tw.user_id
    LEFT JOIN public.users manager ON manager.id = tw.granted_by
    WHERE 
      (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
      AND (p_status IS NULL OR tw.status = p_status)
      AND (p_start_date IS NULL OR tw.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tw.created_at <= p_end_date)
  )
  SELECT 
    fu.id,
    fu.email,
    fu.full_name,
    fu.status,
    fu.modules_completed,
    fu.granted_by,
    fu.manager_name,
    fu.created_at,
    fu.last_active_at,
    (SELECT COUNT(*) FROM filtered_users) AS total_count
  FROM filtered_users fu
  ORDER BY fu.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- =================================================================
-- STEP 3: ПРАВА ДОСТУПА
-- =================================================================
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_leaderboard() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_activity_log(TIMESTAMPTZ, INTEGER, UUID, TIMESTAMPTZ) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_chart_data(TIMESTAMPTZ, UUID, TIMESTAMPTZ) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_tripwire_stats(TIMESTAMPTZ, UUID, TIMESTAMPTZ) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_tripwire_users(TIMESTAMPTZ, INTEGER, UUID, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated, anon, service_role;

-- =================================================================
-- STEP 4: 🔥 BULLETPROOF ЗАВЕРШЕНИЕ ТРАНЗАКЦИИ
-- =================================================================
-- 1. COMMIT - закрываем транзакцию (критично!)
COMMIT;

-- 2. pg_sleep(3) - ждем 3 секунды (избегаем гонки)
SELECT pg_sleep(3);

-- 3. NOTIFY - перезагружаем schema cache PostgREST
NOTIFY pgrst, 'reload schema';

-- =================================================================
-- ✅ BULLETPROOF МИГРАЦИЯ ЗАВЕРШЕНА
-- =================================================================
-- Следующие шаги:
-- 1. Запусти миграцию через SQL Editor в Supabase Dashboard
-- 2. Перезапусти бэкенд: pm2 restart onai-backend
-- 3. Проверь через verify-rpc-functions.ts
-- =================================================================

