-- Migration 013: UTM Analytics Views and Tables
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Created: 2026-01-04
-- Purpose: Create views for UTM analytics (source tracking, campaign analysis)

-- ============================================================================
-- 1. VIEW: all_sales_tracking (unified sales view across all funnels)
-- ============================================================================
-- Combines data from traffic_sales (express) and challenge3d_sales

CREATE OR REPLACE VIEW all_sales_tracking AS
-- Express course sales
SELECT
  id,
  deal_id,
  amount as sale_amount,
  'express' as funnel_type,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  customer_name,
  phone,
  email,
  NULL as targetologist,
  sale_date,
  created_at
FROM traffic_sales
WHERE amount > 0

UNION ALL

-- Challenge3D sales (full payments)
SELECT
  id,
  deal_id,
  amount as sale_amount,
  'challenge3d' as funnel_type,
  COALESCE(original_utm_source, utm_source) as utm_source,
  COALESCE(original_utm_campaign, utm_campaign) as utm_campaign,
  COALESCE(original_utm_medium, utm_medium) as utm_medium,
  utm_content,
  utm_term,
  customer_name,
  phone,
  email,
  NULL as targetologist,
  sale_date,
  created_at
FROM challenge3d_sales
WHERE amount > 0 AND prepaid = FALSE;

-- ============================================================================
-- 2. VIEW: top_utm_sources (ranked by revenue)
-- ============================================================================

CREATE OR REPLACE VIEW top_utm_sources AS
SELECT
  utm_source,
  COUNT(*) as total_sales,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale,
  COUNT(DISTINCT DATE(sale_date)) as active_days
FROM all_sales_tracking
WHERE utm_source IS NOT NULL AND utm_source != ''
GROUP BY utm_source
ORDER BY total_revenue DESC;

-- ============================================================================
-- 3. VIEW: top_utm_campaigns (ranked by revenue)
-- ============================================================================

CREATE OR REPLACE VIEW top_utm_campaigns AS
SELECT
  utm_source,
  utm_campaign,
  COUNT(*) as total_sales,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale
FROM all_sales_tracking
WHERE utm_campaign IS NOT NULL AND utm_campaign != ''
GROUP BY utm_source, utm_campaign
ORDER BY total_revenue DESC;

-- ============================================================================
-- 4. VIEW: sales_without_utm (sales needing attribution)
-- ============================================================================

CREATE OR REPLACE VIEW sales_without_utm AS
SELECT
  id,
  deal_id,
  sale_amount,
  funnel_type,
  customer_name,
  phone,
  email,
  sale_date,
  created_at
FROM all_sales_tracking
WHERE (utm_source IS NULL OR utm_source = '')
  AND (utm_campaign IS NULL OR utm_campaign = '')
ORDER BY sale_date DESC;

-- ============================================================================
-- 5. VIEW: daily_utm_stats (for charts)
-- ============================================================================

CREATE OR REPLACE VIEW daily_utm_stats AS
SELECT
  DATE(sale_date) as date,
  utm_source,
  utm_campaign,
  utm_medium,
  funnel_type,
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale
FROM all_sales_tracking
WHERE sale_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(sale_date), utm_source, utm_campaign, utm_medium, funnel_type
ORDER BY date DESC, total_revenue DESC;

-- ============================================================================
-- 6. VIEW: utm_source_by_team (attribution to teams/targetologists)
-- ============================================================================

CREATE OR REPLACE VIEW utm_source_by_team AS
SELECT
  s.utm_source,
  u.team_name,
  u.full_name as targetologist_name,
  u.id as user_id,
  uu.funnel_type,
  COUNT(*) as total_sales,
  SUM(s.sale_amount) as total_revenue
FROM all_sales_tracking s
JOIN traffic_user_utm_sources uu ON LOWER(s.utm_source) = LOWER(uu.utm_source)
JOIN traffic_users u ON uu.user_id = u.id
WHERE s.utm_source IS NOT NULL
GROUP BY s.utm_source, u.team_name, u.full_name, u.id, uu.funnel_type
ORDER BY total_revenue DESC;

-- ============================================================================
-- 7. TABLE: traffic_ad_account_bindings (for Ad Account linking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_ad_account_bindings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Ad Account info
  ad_account_id VARCHAR(50) NOT NULL,  -- e.g., act_123456789
  ad_platform VARCHAR(20) DEFAULT 'facebook' CHECK (ad_platform IN ('facebook', 'tiktok', 'google', 'vk')),

  -- Team binding
  team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL,
  team_name VARCHAR(100) NOT NULL,

  -- User who added
  created_by UUID REFERENCES traffic_users(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  last_verified_at TIMESTAMP WITH TIME ZONE,

  -- Spend tracking
  total_spend NUMERIC(12, 2) DEFAULT 0,
  last_spend_sync_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One account can only be bound to one team
  UNIQUE(ad_account_id, ad_platform)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ad_account_bindings_team ON traffic_ad_account_bindings(team_name);
CREATE INDEX IF NOT EXISTS idx_ad_account_bindings_active ON traffic_ad_account_bindings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ad_account_bindings_platform ON traffic_ad_account_bindings(ad_platform);

-- Trigger
CREATE TRIGGER trigger_update_ad_account_bindings_updated_at
  BEFORE UPDATE ON public.traffic_ad_account_bindings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- ============================================================================
-- 8. VIEW: Ad account bindings with team info
-- ============================================================================

CREATE OR REPLACE VIEW v_ad_account_bindings AS
SELECT
  b.id,
  b.ad_account_id,
  b.ad_platform,
  b.team_name,
  t.display_name as team_display_name,
  t.color as team_color,
  b.is_active,
  b.verified,
  b.total_spend,
  b.last_spend_sync_at,
  b.created_at,
  u.full_name as created_by_name
FROM traffic_ad_account_bindings b
LEFT JOIN traffic_teams t ON t.name = b.team_name
LEFT JOIN traffic_users u ON u.id = b.created_by
WHERE b.is_active = TRUE
ORDER BY b.team_name, b.ad_account_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW all_sales_tracking IS 'Unified view of all sales across express and challenge3d funnels';
COMMENT ON VIEW top_utm_sources IS 'UTM sources ranked by total revenue';
COMMENT ON VIEW top_utm_campaigns IS 'UTM campaigns ranked by revenue';
COMMENT ON VIEW sales_without_utm IS 'Sales missing UTM attribution';
COMMENT ON VIEW daily_utm_stats IS 'Daily sales statistics by UTM for charting';
COMMENT ON TABLE traffic_ad_account_bindings IS 'Links Facebook/TikTok ad accounts to teams';

-- ============================================================================
-- VALIDATION
-- ============================================================================

SELECT 'Migration 013: UTM Analytics views created successfully!' AS status;
