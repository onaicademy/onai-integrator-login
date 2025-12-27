-- ========================================
-- 🔐 UTM CONSTRUCTOR MIGRATION
-- Date: 2025-12-25
-- Purpose: Add security, audit trail, and retroactive sync support
-- Database: Traffic Supabase (postgres.oetodaexnjcunklkdlkv)
-- ========================================

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. ALTER traffic_targetologist_settings
--    Add columns for locked UTM assignment
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ALTER TABLE traffic_targetologist_settings
ADD COLUMN IF NOT EXISTS assigned_utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_source_editable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS utm_source_assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS utm_source_assigned_by UUID,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Add unique constraint (after adding column to avoid conflicts)
CREATE UNIQUE INDEX IF NOT EXISTS traffic_targetologist_settings_utm_unique
ON traffic_targetologist_settings(assigned_utm_source)
WHERE assigned_utm_source IS NOT NULL;

COMMENT ON COLUMN traffic_targetologist_settings.assigned_utm_source IS
  'Admin-assigned UTM source (e.g., fb_arystan). Immutable unless utm_source_editable=true. Used for retroactive data binding.';

COMMENT ON COLUMN traffic_targetologist_settings.utm_source_editable IS
  'Security flag: If FALSE, user cannot change assigned_utm_source (enforced by trigger).';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. CREATE utm_source_history (Audit Trail)
--    Logs every change to UTM assignments by admins
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS utm_source_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  old_utm_source TEXT,
  new_utm_source TEXT NOT NULL,
  changed_by_admin UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS utm_source_history_user_idx ON utm_source_history(user_id);
CREATE INDEX IF NOT EXISTS utm_source_history_date_idx ON utm_source_history(changed_at);

COMMENT ON TABLE utm_source_history IS
  'Audit log for all UTM source changes. Tracks who changed what and when.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. CREATE retroactive_sync_logs
--    Tracks "Time Machine" syncs when assigning UTM to existing data
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS retroactive_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  utm_source TEXT NOT NULL,
  traffic_stats_updated INT DEFAULT 0,
  sales_updated INT DEFAULT 0,
  leads_updated INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_duration_ms INT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS retroactive_sync_logs_user_idx ON retroactive_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS retroactive_sync_logs_date_idx ON retroactive_sync_logs(synced_at);

COMMENT ON TABLE retroactive_sync_logs IS
  'Logs for retroactive data binding. When admin assigns fb_arystan to new user, this tracks how many old records were updated.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. SECURITY TRIGGER: prevent_user_utm_edit
--    Blocks users from changing locked UTM sources
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE FUNCTION prevent_user_utm_edit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check if assigned_utm_source is being changed
  IF OLD.assigned_utm_source IS DISTINCT FROM NEW.assigned_utm_source THEN
    -- If UTM is locked (editable=FALSE), BLOCK the change
    IF OLD.utm_source_editable = FALSE THEN
      RAISE EXCEPTION 'Access Denied: UTM source is locked by Admin. Contact administrator to change your attribution source.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists (idempotent migration)
DROP TRIGGER IF EXISTS enforce_utm_source_lock ON traffic_targetologist_settings;

-- Create trigger that fires on UPDATE attempts
CREATE TRIGGER enforce_utm_source_lock
  BEFORE UPDATE ON traffic_targetologist_settings
  FOR EACH ROW
  EXECUTE FUNCTION prevent_user_utm_edit();

COMMENT ON FUNCTION prevent_user_utm_edit IS
  'Security: Prevents targetologists from changing their assigned_utm_source if utm_source_editable=FALSE. Only admins can bypass this.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. HELPER VIEW: admin_utm_assignments
--    Quick view for Admin Panel showing all UTM assignments
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE OR REPLACE VIEW admin_utm_assignments AS
SELECT
  u.id as user_id,
  u.email,
  u.full_name,
  u.team_name,
  s.assigned_utm_source,
  s.utm_source_editable,
  s.utm_source_assigned_at,
  s.utm_source_assigned_by,
  s.last_synced_at,
  (SELECT COUNT(*) FROM traffic_stats WHERE team = u.team_name) as total_stats_count
FROM traffic_users u
LEFT JOIN traffic_targetologist_settings s ON u.id::text = s.user_id
WHERE u.role = 'targetologist'
ORDER BY u.created_at DESC;

COMMENT ON VIEW admin_utm_assignments IS
  'Admin dashboard helper: Shows all targetologists with their UTM assignments and lock status.';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. SUCCESS MESSAGE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DO $$
BEGIN
  RAISE NOTICE '✅ UTM Constructor migration completed successfully!';
  RAISE NOTICE '📊 Created tables: utm_source_history, retroactive_sync_logs';
  RAISE NOTICE '🔒 Security trigger: enforce_utm_source_lock is ACTIVE';
  RAISE NOTICE '👀 Admin view: admin_utm_assignments is ready';
END $$;
