-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION 017: Complete Traffic Dashboard Repair
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Comprehensive fix for traffic dashboard data pipeline
-- Target DB: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Date: 2026-01-05
-- Priority: 🔴 CRITICAL
-- ═══════════════════════════════════════════════════════════════════════════

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 1: CREATE CORE METRICS TABLES                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.1: Create traffic_aggregated_metrics (Main metrics table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.traffic_aggregated_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.traffic_users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('today', '7d', '30d', 'custom')),

  -- Date range for custom periods
  period_start DATE,
  period_end DATE,

  -- Facebook Ads Metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  spend_usd DECIMAL(12,2) DEFAULT 0,
  spend_kzt DECIMAL(14,2) DEFAULT 0,
  ctr DECIMAL(6,4) DEFAULT 0,
  cpc_usd DECIMAL(10,4) DEFAULT 0,
  cpm_usd DECIMAL(10,4) DEFAULT 0,

  -- Lead Metrics
  leads INTEGER DEFAULT 0,
  challenge3d_leads INTEGER DEFAULT 0,
  intensive1d_leads INTEGER DEFAULT 0,
  express_leads INTEGER DEFAULT 0,

  -- Sales Metrics (Challenge3D)
  challenge3d_prepayments INTEGER DEFAULT 0,
  challenge3d_prepayment_revenue DECIMAL(14,2) DEFAULT 0,
  challenge3d_full_purchases INTEGER DEFAULT 0,
  challenge3d_full_revenue DECIMAL(14,2) DEFAULT 0,

  -- Sales Metrics (Express Course)
  express_sales INTEGER DEFAULT 0,
  express_revenue DECIMAL(14,2) DEFAULT 0,

  -- Sales Metrics (Intensive1D)
  intensive1d_sales INTEGER DEFAULT 0,
  intensive1d_revenue DECIMAL(14,2) DEFAULT 0,

  -- Computed Metrics
  total_revenue DECIMAL(14,2) DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  roas DECIMAL(8,4) DEFAULT 0,
  cpa_usd DECIMAL(10,2) DEFAULT 0,

  -- Exchange Rate
  usd_to_kzt_rate DECIMAL(8,2) DEFAULT 475.00,

  -- Campaign details (JSON array)
  campaigns_json JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for upsert
  UNIQUE(user_id, period, period_start, period_end)
);

-- Indexes for traffic_aggregated_metrics
CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_user_period
  ON public.traffic_aggregated_metrics(user_id, period);

CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_team
  ON public.traffic_aggregated_metrics(team_name);

CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_updated
  ON public.traffic_aggregated_metrics(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_date_range
  ON public.traffic_aggregated_metrics(period_start, period_end);

COMMENT ON TABLE public.traffic_aggregated_metrics IS 'Pre-computed dashboard metrics, updated by sync service';
COMMENT ON COLUMN public.traffic_aggregated_metrics.period IS 'Time period: today, 7d, 30d, or custom';
COMMENT ON COLUMN public.traffic_aggregated_metrics.campaigns_json IS 'Array of campaign-level metrics for detailed view';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.2: Create traffic_sync_history (Sync audit table)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.traffic_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('facebook_ads', 'amocrm_sales', 'full')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN DEFAULT FALSE,
  users_processed INTEGER DEFAULT 0,
  metrics_updated INTEGER DEFAULT 0,
  records_synced INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_sync_history_started
  ON public.traffic_sync_history(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_history_type
  ON public.traffic_sync_history(sync_type, started_at DESC);

COMMENT ON TABLE public.traffic_sync_history IS 'History of data synchronization runs for monitoring and debugging';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.3: Create traffic_facebook_ads_raw (Raw Facebook data cache)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.traffic_facebook_ads_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.traffic_users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,

  -- Facebook IDs
  ad_account_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  adset_id TEXT,
  adset_name TEXT,
  ad_id TEXT,
  ad_name TEXT,

  -- Date
  stat_date DATE NOT NULL,

  -- Metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  reach BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,

  -- Raw response (for debugging)
  raw_data JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint (one record per campaign per day)
  UNIQUE(campaign_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_fb_ads_raw_user_date
  ON public.traffic_facebook_ads_raw(user_id, stat_date DESC);

CREATE INDEX IF NOT EXISTS idx_fb_ads_raw_campaign_date
  ON public.traffic_facebook_ads_raw(campaign_id, stat_date DESC);

CREATE INDEX IF NOT EXISTS idx_fb_ads_raw_team_date
  ON public.traffic_facebook_ads_raw(team_name, stat_date DESC);

COMMENT ON TABLE public.traffic_facebook_ads_raw IS 'Raw Facebook Ads data cache for debugging and reprocessing';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 2: FIX SALES TABLES SCHEMA                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.1: Fix challenge3d_sales table (ensure all columns exist)
-- ─────────────────────────────────────────────────────────────────────────────

-- Add missing columns if they don't exist
ALTER TABLE public.challenge3d_sales
  ADD COLUMN IF NOT EXISTS lead_name TEXT,
  ADD COLUMN IF NOT EXISTS lead_email TEXT,
  ADD COLUMN IF NOT EXISTS lead_phone TEXT,
  ADD COLUMN IF NOT EXISTS sale_amount DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS sale_type TEXT CHECK (sale_type IN ('Prepayment', 'Full Payment')),
  ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS amocrm_lead_id TEXT,
  ADD COLUMN IF NOT EXISTS amocrm_contact_id TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_date
  ON public.challenge3d_sales(sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_type
  ON public.challenge3d_sales(sale_type, sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_source
  ON public.challenge3d_sales(utm_source);

COMMENT ON TABLE public.challenge3d_sales IS 'Challenge3D sales (prepayments: ≤5000₸, full payments: 240000₸)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.2: Create express_course_sales table (if not exists)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.express_course_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead Info
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,

  -- Sale Details
  sale_amount DECIMAL(12,2) DEFAULT 5000.00,
  sale_date TIMESTAMPTZ NOT NULL,

  -- Attribution
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- AmoCRM Integration
  amocrm_lead_id TEXT,
  amocrm_contact_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_express_sales_date
  ON public.express_course_sales(sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_express_sales_utm_source
  ON public.express_course_sales(utm_source);

COMMENT ON TABLE public.express_course_sales IS 'Express Course sales (5000₸ per sale)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2.3: Create intensive1d_sales table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.intensive1d_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Lead Info
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,

  -- Sale Details
  sale_amount DECIMAL(12,2) DEFAULT 25000.00,
  sale_type TEXT CHECK (sale_type IN ('Prepayment', 'Full Payment')),
  sale_date TIMESTAMPTZ NOT NULL,

  -- Attribution
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- AmoCRM Integration
  amocrm_lead_id TEXT,
  amocrm_contact_id TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intensive1d_sales_date
  ON public.intensive1d_sales(sale_date DESC);

CREATE INDEX IF NOT EXISTS idx_intensive1d_sales_type
  ON public.intensive1d_sales(sale_type, sale_date DESC);

COMMENT ON TABLE public.intensive1d_sales IS 'Intensive 1D sales (prepayments and full payments)';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 3: CREATE HELPER FUNCTIONS                        ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.1: Function to get aggregated metrics for a user and period
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_traffic_metrics(
  p_user_id UUID,
  p_period TEXT DEFAULT '7d',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  team_name TEXT,
  period TEXT,
  impressions BIGINT,
  clicks BIGINT,
  spend_usd DECIMAL,
  spend_kzt DECIMAL,
  leads INTEGER,
  challenge3d_leads INTEGER,
  challenge3d_prepayments INTEGER,
  challenge3d_prepayment_revenue DECIMAL,
  challenge3d_full_purchases INTEGER,
  challenge3d_full_revenue DECIMAL,
  express_sales INTEGER,
  express_revenue DECIMAL,
  total_revenue DECIMAL,
  total_sales INTEGER,
  roas DECIMAL,
  cpa_usd DECIMAL,
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
    m.spend_usd,
    m.spend_kzt,
    m.leads,
    m.challenge3d_leads,
    m.challenge3d_prepayments,
    m.challenge3d_prepayment_revenue,
    m.challenge3d_full_purchases,
    m.challenge3d_full_revenue,
    m.express_sales,
    m.express_revenue,
    m.total_revenue,
    m.total_sales,
    m.roas,
    m.cpa_usd,
    m.updated_at,
    -- Consider stale if older than 15 minutes
    (m.updated_at < NOW() - INTERVAL '15 minutes') AS is_stale
  FROM public.traffic_aggregated_metrics m
  WHERE m.user_id = p_user_id
    AND (
      (p_period != 'custom' AND m.period = p_period)
      OR
      (p_period = 'custom' AND m.period_start = p_start_date AND m.period_end = p_end_date)
    );
END;
$$;

COMMENT ON FUNCTION public.get_traffic_metrics IS 'Get aggregated metrics for a user, returns stale flag if data is >15min old';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.2: Function to calculate date range for period presets
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_period_date_range(
  p_period TEXT
)
RETURNS TABLE (
  start_date DATE,
  end_date DATE
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_period = 'today' THEN
    RETURN QUERY SELECT CURRENT_DATE, CURRENT_DATE;
  ELSIF p_period = '7d' THEN
    RETURN QUERY SELECT CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE;
  ELSIF p_period = '30d' THEN
    RETURN QUERY SELECT CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE;
  ELSE
    RAISE EXCEPTION 'Invalid period: %. Use today, 7d, 30d, or custom', p_period;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_period_date_range IS 'Calculate start and end dates for period presets (today, 7d, 30d)';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 4: CREATE VIEWS FOR DASHBOARD                     ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- ─────────────────────────────────────────────────────────────────────────────
-- 4.1: View for combined analytics (all teams)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_traffic_dashboard_summary AS
SELECT
  tam.period,
  tam.period_start,
  tam.period_end,
  COUNT(DISTINCT tam.user_id) as total_teams,
  SUM(tam.impressions) as total_impressions,
  SUM(tam.clicks) as total_clicks,
  SUM(tam.spend_usd) as total_spend_usd,
  SUM(tam.spend_kzt) as total_spend_kzt,
  SUM(tam.leads) as total_leads,
  SUM(tam.challenge3d_leads) as total_challenge3d_leads,
  SUM(tam.challenge3d_prepayments) as total_challenge3d_prepayments,
  SUM(tam.challenge3d_prepayment_revenue) as total_challenge3d_prepayment_revenue,
  SUM(tam.challenge3d_full_purchases) as total_challenge3d_full_purchases,
  SUM(tam.challenge3d_full_revenue) as total_challenge3d_full_revenue,
  SUM(tam.express_sales) as total_express_sales,
  SUM(tam.express_revenue) as total_express_revenue,
  SUM(tam.total_revenue) as total_revenue,
  SUM(tam.total_sales) as total_sales,
  CASE
    WHEN SUM(tam.spend_usd) > 0 THEN SUM(tam.total_revenue) / (SUM(tam.spend_usd) * 475.0)
    ELSE 0
  END as average_roas,
  CASE
    WHEN SUM(tam.total_sales) > 0 THEN SUM(tam.spend_usd) / SUM(tam.total_sales)
    ELSE 0
  END as average_cpa_usd,
  MAX(tam.updated_at) as last_updated
FROM public.traffic_aggregated_metrics tam
GROUP BY tam.period, tam.period_start, tam.period_end;

COMMENT ON VIEW public.v_traffic_dashboard_summary IS 'Dashboard summary across all teams and targetologists';

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 5: ROW LEVEL SECURITY (RLS)                       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

-- Enable RLS on all tables
ALTER TABLE public.traffic_aggregated_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_facebook_ads_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.express_course_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intensive1d_sales ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for re-runs)
DROP POLICY IF EXISTS "Users can read own metrics" ON public.traffic_aggregated_metrics;
DROP POLICY IF EXISTS "Service role full access metrics" ON public.traffic_aggregated_metrics;
DROP POLICY IF EXISTS "Service role full access sync history" ON public.traffic_sync_history;
DROP POLICY IF EXISTS "Service role full access fb ads raw" ON public.traffic_facebook_ads_raw;
DROP POLICY IF EXISTS "Service role full access express sales" ON public.express_course_sales;
DROP POLICY IF EXISTS "Service role full access intensive1d sales" ON public.intensive1d_sales;

-- Policies for traffic_aggregated_metrics
CREATE POLICY "Users can read own metrics"
  ON public.traffic_aggregated_metrics FOR SELECT
  USING (user_id = auth.uid() OR auth.role() = 'service_role');

CREATE POLICY "Service role full access metrics"
  ON public.traffic_aggregated_metrics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policies for other tables (service role only)
CREATE POLICY "Service role full access sync history"
  ON public.traffic_sync_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access fb ads raw"
  ON public.traffic_facebook_ads_raw FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access express sales"
  ON public.express_course_sales FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access intensive1d sales"
  ON public.intensive1d_sales FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 6: GRANT PERMISSIONS                              ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

GRANT SELECT ON public.traffic_aggregated_metrics TO authenticated;
GRANT ALL ON public.traffic_aggregated_metrics TO service_role;

GRANT SELECT ON public.traffic_sync_history TO authenticated;
GRANT ALL ON public.traffic_sync_history TO service_role;

GRANT ALL ON public.traffic_facebook_ads_raw TO service_role;
GRANT ALL ON public.express_course_sales TO service_role;
GRANT ALL ON public.intensive1d_sales TO service_role;

GRANT SELECT ON public.v_traffic_dashboard_summary TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 017
-- ═══════════════════════════════════════════════════════════════════════════
