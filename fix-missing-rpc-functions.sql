-- ================================================================
-- FIX MISSING RPC FUNCTIONS FOR TRIPWIRE SALES DASHBOARD
-- Date: 2025-12-30
-- Purpose: Add missing rpc_update_email_status and rpc_update_tripwire_user_status
-- ================================================================

-- ================================================================
-- FUNCTION 1: rpc_update_email_status
-- Update email delivery status for Tripwire user
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_update_email_status(
  p_user_id UUID,
  p_email_sent BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  -- Update tripwire_users table
  UPDATE public.tripwire_users
  SET
    welcome_email_sent = p_email_sent,
    welcome_email_sent_at = CASE WHEN p_email_sent THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no rows were updated, raise notice
  IF NOT FOUND THEN
    RAISE NOTICE 'No tripwire_user found with user_id: %', p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_update_email_status(UUID, BOOLEAN) IS 'Update email delivery status for Tripwire user';

-- ================================================================
-- FUNCTION 2: rpc_update_tripwire_user_status
-- Update status of Tripwire user and log the activity
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_update_tripwire_user_status(
  p_user_id UUID,
  p_status TEXT,
  p_manager_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_old_status TEXT;
  v_user_email TEXT;
BEGIN
  -- Get current status before update
  SELECT status, email INTO v_old_status, v_user_email
  FROM public.tripwire_users
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'user_id', p_user_id
    );
  END IF;

  -- Validate status value
  IF p_status NOT IN ('active', 'inactive', 'completed', 'blocked') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid status value. Must be: active, inactive, completed, or blocked',
      'provided_status', p_status
    );
  END IF;

  -- Update the status
  UPDATE public.tripwire_users
  SET
    status = p_status,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log the activity
  INSERT INTO public.sales_activity_log (
    manager_id,
    action_type,
    target_user_id,
    details
  ) VALUES (
    p_manager_id,
    'user_status_updated',
    p_user_id,
    jsonb_build_object(
      'email', v_user_email,
      'old_status', v_old_status,
      'new_status', p_status,
      'updated_at', NOW()
    )
  );

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_status', v_old_status,
    'new_status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.rpc_update_tripwire_user_status(UUID, TEXT, UUID) IS 'Update Tripwire user status and log activity';

-- ================================================================
-- PERMISSIONS: Grant execute to authenticated and service_role
-- ================================================================

GRANT EXECUTE ON FUNCTION public.rpc_update_email_status(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_update_tripwire_user_status(UUID, TEXT, UUID) TO authenticated, service_role;

-- ================================================================
-- NOTIFY PGRST: Reload schema cache
-- ================================================================

NOTIFY pgrst, 'reload schema';

-- ================================================================
-- VERIFICATION: Check that functions were created
-- ================================================================

SELECT
  proname AS function_name,
  pronargs AS num_args,
  pg_get_function_arguments(oid) AS arguments,
  CASE
    WHEN prorettype = 'void'::regtype THEN 'VOID'
    WHEN prorettype = 'json'::regtype THEN 'JSON'
    ELSE prorettype::regtype::text
  END AS return_type
FROM pg_proc
WHERE proname IN ('rpc_update_email_status', 'rpc_update_tripwire_user_status')
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================

SELECT
  '✅ Missing RPC functions created successfully!' AS status,
  'rpc_update_email_status, rpc_update_tripwire_user_status' AS functions_added;
