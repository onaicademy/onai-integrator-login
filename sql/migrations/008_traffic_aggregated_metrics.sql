-- Migration 008: Traffic Aggregated Metrics Table
-- Purpose: Store pre-computed metrics for fast dashboard loading
-- Run this in Traffic Supabase project

-- Create aggregated metrics table
CREATE TABLE IF NOT EXISTS traffic_aggregated_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('today', '7d', '30d')),

  -- Facebook Ads Metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  spend_kzt DECIMAL(14,2) DEFAULT 0,
  ctr DECIMAL(6,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,

  -- Sales Metrics (from AmoCRM)
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(14,2) DEFAULT 0,
  sales INTEGER DEFAULT 0,
  roas DECIMAL(8,4) DEFAULT 0,
  cpa DECIMAL(10,2) DEFAULT 0,

  -- Campaign details (JSON array)
  campaigns_json JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert
  UNIQUE(user_id, period)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_user_period
ON traffic_aggregated_metrics(user_id, period);

CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_team
ON traffic_aggregated_metrics(team_name);

CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_updated
ON traffic_aggregated_metrics(updated_at DESC);

-- Create sync history table (matches service code)
CREATE TABLE IF NOT EXISTS traffic_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN DEFAULT FALSE,
  users_processed INTEGER DEFAULT 0,
  metrics_updated INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT
);

-- Create index for recent syncs
CREATE INDEX IF NOT EXISTS idx_sync_history_started
ON traffic_sync_history(started_at DESC);

-- RLS Policies
ALTER TABLE traffic_aggregated_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_sync_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-runs)
DROP POLICY IF EXISTS "Users can read own metrics" ON traffic_aggregated_metrics;
DROP POLICY IF EXISTS "Service role full access metrics" ON traffic_aggregated_metrics;
DROP POLICY IF EXISTS "Service role full access history" ON traffic_sync_history;
DROP POLICY IF EXISTS "Auth users read history" ON traffic_sync_history;

-- Users can read their own metrics
CREATE POLICY "Users can read own metrics"
ON traffic_aggregated_metrics FOR SELECT
USING (
  user_id IN (
    SELECT tu.id FROM traffic_users tu
    WHERE tu.id = user_id
  )
);

-- Service role can do everything on metrics
CREATE POLICY "Service role full access metrics"
ON traffic_aggregated_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- Service role can do everything on history
CREATE POLICY "Service role full access history"
ON traffic_sync_history FOR ALL
USING (true)
WITH CHECK (true);

-- Authenticated users can read history
CREATE POLICY "Auth users read history"
ON traffic_sync_history FOR SELECT
USING (true);

-- Grant permissions
GRANT SELECT ON traffic_aggregated_metrics TO authenticated;
GRANT ALL ON traffic_aggregated_metrics TO service_role;
GRANT SELECT ON traffic_sync_history TO authenticated;
GRANT ALL ON traffic_sync_history TO service_role;

-- Function to get fresh or cached metrics
CREATE OR REPLACE FUNCTION get_user_metrics(
  p_user_id UUID,
  p_period TEXT DEFAULT '7d'
)
RETURNS TABLE (
  user_id UUID,
  team_name TEXT,
  period TEXT,
  impressions BIGINT,
  clicks BIGINT,
  spend DECIMAL,
  spend_kzt DECIMAL,
  conversions INTEGER,
  revenue DECIMAL,
  sales INTEGER,
  ctr DECIMAL,
  cpc DECIMAL,
  cpm DECIMAL,
  roas DECIMAL,
  cpa DECIMAL,
  campaigns_json JSONB,
  updated_at TIMESTAMPTZ,
  is_stale BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.user_id,
    m.team_name,
    m.period,
    m.impressions,
    m.clicks,
    m.spend,
    m.spend_kzt,
    m.conversions,
    m.revenue,
    m.sales,
    m.ctr,
    m.cpc,
    m.cpm,
    m.roas,
    m.cpa,
    m.campaigns_json,
    m.updated_at,
    -- Consider stale if older than 15 minutes
    (m.updated_at < NOW() - INTERVAL '15 minutes') AS is_stale
  FROM traffic_aggregated_metrics m
  WHERE m.user_id = p_user_id AND m.period = p_period;
END;
$$;

-- Function to get latest sync status
CREATE OR REPLACE FUNCTION get_latest_sync()
RETURNS TABLE (
  last_sync TIMESTAMPTZ,
  success BOOLEAN,
  users_processed INTEGER,
  metrics_updated INTEGER,
  duration_ms INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.completed_at,
    h.success,
    h.users_processed,
    h.metrics_updated,
    h.duration_ms,
    h.error_message
  FROM traffic_sync_history h
  ORDER BY h.started_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON TABLE traffic_aggregated_metrics IS 'Pre-computed dashboard metrics, updated every 10 minutes by backend scheduler';
COMMENT ON COLUMN traffic_aggregated_metrics.campaigns_json IS 'Array of campaign-level metrics for detailed view';
COMMENT ON COLUMN traffic_aggregated_metrics.period IS 'Time period: today, 7d (7 days), 30d (30 days)';
COMMENT ON TABLE traffic_sync_history IS 'History of aggregation sync runs for monitoring';
