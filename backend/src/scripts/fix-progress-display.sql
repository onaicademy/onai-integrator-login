-- =================================================================
-- FIX: SALES MANAGER DASHBOARD - ПРОГРЕСС СТУДЕНТОВ 0/3
-- =================================================================
-- ПРОБЛЕМА: rpc_get_tripwire_users берет modules_completed из tripwire_users (всегда 0!)
-- РЕШЕНИЕ: Берем modules_completed из tripwire_user_profile (реальный прогресс!)
-- =================================================================

-- Удаляем старую функцию
DROP FUNCTION IF EXISTS public.rpc_get_tripwire_users(TIMESTAMPTZ, INTEGER, UUID, INTEGER, TIMESTAMPTZ, TEXT) CASCADE;

-- Создаем исправленную функцию
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
  total_count BIGINT,
  welcome_email_sent BOOLEAN
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
      -- 🔥 FIX: Берем modules_completed из tripwire_user_profile (реальный прогресс!)
      COALESCE(twp.modules_completed, 0) AS modules_completed,
      tw.granted_by,
      manager.full_name AS manager_name,
      tw.created_at,
      tw.last_active_at,
      tw.welcome_email_sent
    FROM public.tripwire_users tw
    LEFT JOIN public.users u ON u.id = tw.user_id
    LEFT JOIN public.users manager ON manager.id = tw.granted_by
    -- 🔥 FIX: JOIN tripwire_user_profile для получения реального прогресса
    LEFT JOIN public.tripwire_user_profile twp ON twp.user_id = tw.user_id
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
    (SELECT COUNT(*) FROM filtered_users) AS total_count,
    fu.welcome_email_sent
  FROM filtered_users fu
  ORDER BY fu.created_at DESC
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- Выдаем права
GRANT EXECUTE ON FUNCTION public.rpc_get_tripwire_users(TIMESTAMPTZ, INTEGER, UUID, INTEGER, TIMESTAMPTZ, TEXT) TO authenticated, anon, service_role;

-- Проверяем результат
SELECT 
  email,
  modules_completed,
  status
FROM public.rpc_get_tripwire_users(
  p_end_date := NULL,
  p_limit := 10,
  p_manager_id := NULL,
  p_page := 1,
  p_start_date := NULL,
  p_status := NULL
)
ORDER BY created_at DESC
LIMIT 10;

















