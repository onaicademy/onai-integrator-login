-- Migration 014: Core Data Tables for Traffic Dashboard
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Created: 2026-01-04
-- Purpose: Create missing core data tables for leads, sales, and ad spend tracking
-- Priority: CRITICAL - Required for all metrics to function

-- ============================================================================
-- ROOT CAUSE: These tables are missing, causing all metrics to show zero
-- ============================================================================

-- ============================================================================
-- 1. TABLE: traffic_leads (Lead tracking from webhooks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Lead source tracking
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Funnel type
  funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d')),

  -- Lead status
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),

  -- Contact information
  phone VARCHAR(50),
  email VARCHAR(255),
  name VARCHAR(255),

  -- Lead source
  source VARCHAR(50) DEFAULT 'facebook', -- facebook, tiktok, google, direct

  -- Webhook data
  fb_lead_id VARCHAR(100),
  fb_form_id VARCHAR(100),
  fb_ad_id VARCHAR(100),
  fb_adset_id VARCHAR(100),
  fb_campaign_id VARCHAR(100),

  -- AmoCRM integration
  amocrm_lead_id BIGINT,
  amocrm_contact_id BIGINT,
  amocrm_pipeline_id BIGINT,
  amocrm_status_id BIGINT,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for traffic_leads
CREATE INDEX IF NOT EXISTS idx_traffic_leads_utm_source ON traffic_leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_traffic_leads_funnel_type ON traffic_leads(funnel_type);
CREATE INDEX IF NOT EXISTS idx_traffic_leads_status ON traffic_leads(status);
CREATE INDEX IF NOT EXISTS idx_traffic_leads_created_at ON traffic_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_leads_fb_lead_id ON traffic_leads(fb_lead_id);
CREATE INDEX IF NOT EXISTS idx_traffic_leads_amocrm_lead_id ON traffic_leads(amocrm_lead_id);

-- ============================================================================
-- 2. TABLE: traffic_sales (Express course sales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- AmoCRM deal reference
  deal_id BIGINT UNIQUE,
  contact_id BIGINT,

  -- Sale amount
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- UTM tracking
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Customer information
  customer_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Sale metadata
  product_name VARCHAR(255) DEFAULT 'Express Course',
  payment_method VARCHAR(50),

  -- Lead reference
  lead_id UUID REFERENCES traffic_leads(id) ON DELETE SET NULL,

  -- Timestamps
  sale_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for traffic_sales
CREATE INDEX IF NOT EXISTS idx_traffic_sales_utm_source ON traffic_sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_traffic_sales_sale_date ON traffic_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_sales_deal_id ON traffic_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_traffic_sales_created_at ON traffic_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_sales_lead_id ON traffic_sales(lead_id);

-- ============================================================================
-- 3. TABLE: challenge3d_sales (Challenge 3D sales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.challenge3d_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- AmoCRM deal reference
  deal_id BIGINT UNIQUE,
  contact_id BIGINT,

  -- Sale amount
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  prepaid BOOLEAN DEFAULT FALSE, -- TRUE = prepayment, FALSE = full payment

  -- UTM tracking (original = from prepayment, current = from full payment)
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Original UTM (preserved from prepayment)
  original_utm_source VARCHAR(100),
  original_utm_campaign VARCHAR(255),
  original_utm_medium VARCHAR(100),
  original_utm_content VARCHAR(255),
  original_utm_term VARCHAR(255),

  -- Customer information
  customer_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Sale metadata
  product_name VARCHAR(255) DEFAULT 'Challenge 3D',
  payment_method VARCHAR(50),

  -- Lead reference
  lead_id UUID REFERENCES traffic_leads(id) ON DELETE SET NULL,

  -- Prepayment linkage
  prepayment_deal_id BIGINT, -- Link to the original prepayment deal

  -- Timestamps
  sale_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for challenge3d_sales
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_source ON challenge3d_sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_original_utm ON challenge3d_sales(original_utm_source);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_sale_date ON challenge3d_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_deal_id ON challenge3d_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_prepaid ON challenge3d_sales(prepaid);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_prepayment_deal ON challenge3d_sales(prepayment_deal_id);

-- ============================================================================
-- 4. TABLE: facebook_ad_spend (Facebook Ads spend tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.facebook_ad_spend (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Ad Account reference
  ad_account_id VARCHAR(50) NOT NULL,

  -- Date (daily aggregation)
  date DATE NOT NULL,

  -- Spend metrics
  spend NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,

  -- Lead metrics (from Facebook)
  leads INTEGER DEFAULT 0,

  -- Calculated metrics
  ctr NUMERIC(5, 2) DEFAULT 0, -- Click-through rate
  cpc NUMERIC(10, 2) DEFAULT 0, -- Cost per click
  cpm NUMERIC(10, 2) DEFAULT 0, -- Cost per 1000 impressions
  cpl NUMERIC(10, 2) DEFAULT 0, -- Cost per lead

  -- Campaign breakdown (optional)
  campaign_id VARCHAR(100),
  campaign_name VARCHAR(255),

  -- Sync metadata
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One record per account per day
  UNIQUE(ad_account_id, date)
);

-- Indexes for facebook_ad_spend
CREATE INDEX IF NOT EXISTS idx_facebook_ad_spend_account ON facebook_ad_spend(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_spend_date ON facebook_ad_spend(date DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_ad_spend_account_date ON facebook_ad_spend(ad_account_id, date DESC);

-- ============================================================================
-- 5. TRIGGERS: Auto-update updated_at timestamps
-- ============================================================================

-- Re-use existing trigger function if it exists
CREATE OR REPLACE FUNCTION public.update_traffic_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for traffic_leads
DROP TRIGGER IF EXISTS trigger_update_traffic_leads_updated_at ON public.traffic_leads;
CREATE TRIGGER trigger_update_traffic_leads_updated_at
  BEFORE UPDATE ON public.traffic_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- Trigger for traffic_sales
DROP TRIGGER IF EXISTS trigger_update_traffic_sales_updated_at ON public.traffic_sales;
CREATE TRIGGER trigger_update_traffic_sales_updated_at
  BEFORE UPDATE ON public.traffic_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- Trigger for challenge3d_sales
DROP TRIGGER IF EXISTS trigger_update_challenge3d_sales_updated_at ON public.challenge3d_sales;
CREATE TRIGGER trigger_update_challenge3d_sales_updated_at
  BEFORE UPDATE ON public.challenge3d_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- Trigger for facebook_ad_spend
DROP TRIGGER IF EXISTS trigger_update_facebook_ad_spend_updated_at ON public.facebook_ad_spend;
CREATE TRIGGER trigger_update_facebook_ad_spend_updated_at
  BEFORE UPDATE ON public.facebook_ad_spend
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- ============================================================================
-- 6. RECREATE all_sales_tracking VIEW (now that tables exist)
-- ============================================================================

DROP VIEW IF EXISTS all_sales_tracking CASCADE;

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

-- Challenge3D sales (full payments only)
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
-- 7. RECREATE UTM Analytics Views (now that all_sales_tracking exists)
-- ============================================================================

DROP VIEW IF EXISTS top_utm_sources CASCADE;
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

DROP VIEW IF EXISTS top_utm_campaigns CASCADE;
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

DROP VIEW IF EXISTS sales_without_utm CASCADE;
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

DROP VIEW IF EXISTS daily_utm_stats CASCADE;
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

DROP VIEW IF EXISTS utm_source_by_team CASCADE;
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
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE traffic_leads IS 'Leads captured from Facebook Lead Ads and other sources';
COMMENT ON TABLE traffic_sales IS 'Express course sales from AmoCRM';
COMMENT ON TABLE challenge3d_sales IS 'Challenge 3D sales (prepayments and full payments)';
COMMENT ON TABLE facebook_ad_spend IS 'Daily Facebook Ads spend aggregated by account';

COMMENT ON VIEW all_sales_tracking IS 'Unified view of all sales across express and challenge3d funnels';
COMMENT ON VIEW top_utm_sources IS 'UTM sources ranked by total revenue';
COMMENT ON VIEW top_utm_campaigns IS 'UTM campaigns ranked by revenue';
COMMENT ON VIEW sales_without_utm IS 'Sales missing UTM attribution';
COMMENT ON VIEW daily_utm_stats IS 'Daily sales statistics by UTM for charting';
COMMENT ON VIEW utm_source_by_team IS 'Sales attributed to teams/targetologists via UTM sources';

-- ============================================================================
-- 9. VALIDATION
-- ============================================================================

-- Verify tables exist
SELECT
  'traffic_leads' as table_name,
  COUNT(*) as row_count
FROM traffic_leads
UNION ALL
SELECT
  'traffic_sales',
  COUNT(*)
FROM traffic_sales
UNION ALL
SELECT
  'challenge3d_sales',
  COUNT(*)
FROM challenge3d_sales
UNION ALL
SELECT
  'facebook_ad_spend',
  COUNT(*)
FROM facebook_ad_spend;

-- Verify views exist
SELECT
  'all_sales_tracking' as view_name,
  COUNT(*) as row_count
FROM all_sales_tracking
UNION ALL
SELECT
  'top_utm_sources',
  COUNT(*)
FROM top_utm_sources
UNION ALL
SELECT
  'sales_without_utm',
  COUNT(*)
FROM sales_without_utm;

SELECT 'Migration 014: Core data tables created successfully!' AS status;

-- ============================================================================
-- POST-MIGRATION STEPS
-- ============================================================================

-- TODO after migration:
-- 1. Set up Facebook Lead Ads webhook integration
-- 2. Configure AmoCRM webhooks for sales tracking
-- 3. Implement Facebook Ads API sync for ad spend data
-- 4. Bind ad accounts to teams in traffic_ad_account_bindings
-- 5. Test lead capture flow end-to-end
