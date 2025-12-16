-- ================================================================
-- FIX: rpc_get_tripwire_users - возвращает NULL для email и full_name
-- РЕШЕНИЕ: Обновляем функцию чтобы правильно выбирать поля
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
      tw.full_name,  -- 🔧 Выбираем напрямую из tripwire_users
      tw.email,      -- 🔧 Выбираем напрямую из tripwire_users
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
    fu.id,
    fu.user_id,
    fu.full_name,
    fu.email,
    fu.status,
    fu.modules_completed,
    fu.granted_by,
    fu.manager_name,
    fu.first_login_at,
    fu.last_active_at,
    fu.created_at,
    fu.welcome_email_sent,
    fu.email_opened,
    t.cnt AS total_count
  FROM filtered_users fu
  CROSS JOIN total t
  LIMIT p_limit
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- NOTIFY PGRST: Обновить schema cache
-- ================================================================
NOTIFY pgrst, 'reload schema';

SELECT '✅ RPC функция rpc_get_tripwire_users обновлена!' AS status;
