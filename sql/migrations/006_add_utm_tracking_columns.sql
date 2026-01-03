-- Migration 006: Add UTM Tracking Columns to traffic_users
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Created: 2025-12-30
-- Purpose: Enable UTM source tracking and funnel assignment for targetologists

-- ==========================================
-- 1. ADD COLUMNS TO traffic_users
-- ==========================================

ALTER TABLE traffic_users
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- ==========================================
-- 2. CREATE INDEXES
-- ==========================================

-- Index for UTM source lookups
CREATE INDEX IF NOT EXISTS idx_traffic_users_utm_source
ON traffic_users(utm_source)
WHERE utm_source IS NOT NULL;

-- Index for funnel type filtering
CREATE INDEX IF NOT EXISTS idx_traffic_users_funnel_type
ON traffic_users(funnel_type)
WHERE funnel_type IS NOT NULL;

-- Index for team filtering
CREATE INDEX IF NOT EXISTS idx_traffic_users_team_id
ON traffic_users(team_id)
WHERE team_id IS NOT NULL;

-- Composite index for active users with UTM
CREATE INDEX IF NOT EXISTS idx_traffic_users_active_utm
ON traffic_users(is_active, utm_source)
WHERE is_active = TRUE AND utm_source IS NOT NULL;

-- ==========================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN traffic_users.utm_source IS 'UTM source assigned to this targetologist for automatic lead/sale attribution (e.g., "fb_campaign_001")';
COMMENT ON COLUMN traffic_users.funnel_type IS 'Product funnel this user manages: express (Экспресс-курс), challenge3d (Трехдневник), or intensive1d (Однодневник)';
COMMENT ON COLUMN traffic_users.team_id IS 'Reference to traffic_teams table (if teams feature is enabled)';
COMMENT ON COLUMN traffic_users.auto_sync_enabled IS 'Enable automatic synchronization of leads and sales for this user';
COMMENT ON COLUMN traffic_users.last_sync_at IS 'Timestamp of last successful data synchronization';

-- ==========================================
-- 4. UPDATE EXISTING DATA (if needed)
-- ==========================================

-- Set default funnel_type for existing users (optional)
-- UPDATE traffic_users
-- SET funnel_type = 'express'
-- WHERE funnel_type IS NULL AND role = 'targetologist';

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify columns were added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'traffic_users'
-- AND column_name IN ('utm_source', 'funnel_type', 'team_id', 'auto_sync_enabled');

-- Test inserting a user with new columns:
-- INSERT INTO traffic_users (email, role, utm_source, funnel_type)
-- VALUES ('test@example.com', 'targetologist', 'fb_test_001', 'express')
-- RETURNING *;
