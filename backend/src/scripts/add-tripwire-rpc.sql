-- ================================================================
-- TRIPWIRE RPC FUNCTIONS: SALES DASHBOARD
-- Добавление функций для работы Sales Manager Dashboard
-- ================================================================

-- ================================================================
-- FUNCTION 1: rpc_get_sales_leaderboard
-- Получить рейтинг Sales менеджеров по количеству продаж
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_sales_leaderboard()
RETURNS TABLE (
  manager_id UUID,
  manager_name TEXT,
  total_students INTEGER,
  active_students INTEGER,
  completed_students INTEGER,
  total_revenue NUMERIC,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS manager_id,
    u.full_name AS manager_name,
    COUNT(tw.id)::INTEGER AS total_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active')::INTEGER AS active_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::INTEGER AS completed_students,
    0::NUMERIC AS total_revenue, -- Placeholder for future revenue tracking
    CASE 
      WHEN COUNT(tw.id) > 0 THEN 
        ROUND((COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::NUMERIC / COUNT(tw.id)::NUMERIC) * 100, 1)
      ELSE 0
    END AS completion_rate
  FROM public.users u
  LEFT JOIN public.tripwire_users tw ON tw.granted_by = u.id
  WHERE u.role = 'sales'
  GROUP BY u.id, u.full_name
  ORDER BY total_students DESC, completion_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_get_sales_leaderboard() IS 'Рейтинг Sales менеджеров по эффективности продаж';

-- ================================================================
-- FUNCTION 2: rpc_get_tripwire_users
-- Получить список студентов Tripwire с фильтрацией и пагинацией
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_users(
  p_manager_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  modules_completed INTEGER,
  granted_by UUID,
  manager_name TEXT,
  first_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  welcome_email_sent BOOLEAN,
  email_opened BOOLEAN,
  total_count BIGINT
) AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  RETURN QUERY
  WITH filtered_users AS (
    SELECT 
      tw.id,
      tw.user_id,
      tw.full_name,
      tw.email,
      tw.status,
      tw.modules_completed,
      tw.granted_by,
      tw.manager_name,
      tw.first_login_at,
      tw.last_active_at,
      tw.created_at,
      tw.welcome_email_sent,
      tw.email_opened
    FROM public.tripwire_users tw
    WHERE 
      (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
      AND (p_status IS NULL OR tw.status = p_status)
      AND (p_start_date IS NULL OR tw.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tw.created_at <= p_end_date)
    ORDER BY tw.created_at DESC
  ),
  total AS (
    SELECT COUNT(*)::BIGINT AS cnt FROM filtered_users
  )
  SELECT 
    fu.*,
    t.cnt AS total_count
  FROM filtered_users fu
  CROSS JOIN total t
  LIMIT p_limit
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_get_tripwire_users(UUID, INTEGER, INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Получить список студентов Tripwire с фильтрацией';

-- ================================================================
-- FUNCTION 3: rpc_get_sales_chart_data
-- Получить данные для графика продаж (по дням)
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_sales_chart_data(
  p_manager_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  date DATE,
  students_created INTEGER,
  students_active INTEGER,
  students_completed INTEGER,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      p_start_date::DATE,
      p_end_date::DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  )
  SELECT 
    ds.date,
    COUNT(tw.id) FILTER (WHERE tw.created_at::DATE = ds.date)::INTEGER AS students_created,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active' AND tw.created_at::DATE <= ds.date)::INTEGER AS students_active,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed' AND tw.created_at::DATE <= ds.date)::INTEGER AS students_completed,
    0::NUMERIC AS revenue -- Placeholder for future revenue tracking
  FROM date_series ds
  LEFT JOIN public.tripwire_users tw ON tw.created_at::DATE <= ds.date
    AND (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_get_sales_chart_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Данные для графика продаж по дням';

-- ================================================================
-- FUNCTION 4: rpc_get_tripwire_stats
-- Получить общую статистику Tripwire (для дашборда)
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_stats(
  p_manager_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(tw.id)::INTEGER AS total_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active')::INTEGER AS active_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::INTEGER AS completed_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'inactive')::INTEGER AS inactive_students,
    0::NUMERIC AS total_revenue, -- Placeholder
    CASE 
      WHEN COUNT(tw.id) > 0 THEN 
        ROUND((COUNT(tw.id) FILTER (WHERE tw.status = 'completed')::NUMERIC / COUNT(tw.id)::NUMERIC) * 100, 1)
      ELSE 0
    END AS avg_completion_rate,
    COUNT(tw.id) FILTER (WHERE tw.created_at >= DATE_TRUNC('month', NOW()))::INTEGER AS students_this_month,
    COUNT(tw.id) FILTER (WHERE tw.created_at >= DATE_TRUNC('week', NOW()))::INTEGER AS students_this_week,
    0::NUMERIC AS revenue_this_month, -- Placeholder
    ROUND(AVG(tw.modules_completed), 1) AS avg_modules_completed
  FROM public.tripwire_users tw
  WHERE 
    (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
    AND (p_start_date IS NULL OR tw.created_at >= p_start_date)
    AND (p_end_date IS NULL OR tw.created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_get_tripwire_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Общая статистика Tripwire для дашборда';

-- ================================================================
-- FUNCTION 5: rpc_get_sales_activity_log
-- Получить лог активности Sales менеджеров
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_sales_activity_log(
  p_manager_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  manager_id UUID,
  manager_name TEXT,
  action_type TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id,
    sal.manager_id,
    u.full_name AS manager_name,
    sal.action_type,
    sal.target_user_id,
    sal.target_user_email,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_get_sales_activity_log(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) IS 'Лог активности Sales менеджеров';

-- ================================================================
-- PERMISSIONS: Разрешить вызов функций для authenticated users
-- ================================================================

GRANT EXECUTE ON FUNCTION public.rpc_get_sales_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_tripwire_users(UUID, INTEGER, INTEGER, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_chart_data(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_tripwire_stats(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_activity_log(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ================================================================
-- NOTIFY PGRST: Обновить schema cache в Supabase PostgREST
-- ================================================================

NOTIFY pgrst, 'reload schema';

-- ================================================================
-- VERIFICATION: Проверка созданных функций
-- ================================================================

SELECT 
  proname AS function_name,
  pg_get_functiondef(oid) AS definition
FROM pg_proc
WHERE proname LIKE 'rpc_get_%'
  AND pronamespace = 'public'::regnamespace;

-- ================================================================
-- ГОТОВО!
-- ================================================================

SELECT '✅ Все RPC функции для Tripwire Sales Dashboard созданы!' AS status;


