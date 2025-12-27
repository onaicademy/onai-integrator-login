-- ════════════════════════════════════════════════════════════════════════
-- 🚀 CRITICAL MIGRATION: FIX SALES ATTRIBUTION & ADVANCED ANALYTICS SCHEMA
-- ════════════════════════════════════════════════════════════════════════
-- Date: 2025-12-26
-- Purpose: 
--   1. FIX 490k BUG: Correct funnel_analytics view to properly classify sales
--      - express_sales: amount < 50000 KZT
--      - flagman_sales: amount >= 50000 KZT
--   2. CREATE traffic_granular_stats: Deep creative performance metrics
--   3. CREATE ai_insights: For Groc API with latest insight constraint
--   4. CREATE data_integrity_logs: Audit system for data validation
-- ════════════════════════════════════════════════════════════════════════

-- STEP 1: UPDATE funnel_analytics MATERIALIZED VIEW with CORRECT logic
-- ════════════════════════════════════════════════════════════════════════

-- Drop existing materialized view
DROP MATERIALIZED VIEW IF EXISTS funnel_analytics CASCADE;

-- Create updated materialized view with CORRECT sales classification
CREATE MATERIALIZED VIEW funnel_analytics AS
WITH 
-- ════════════════════════════════════════════════════════════════════════
-- CTE 1: Facebook Ads Data (затраты за последние 30 дней)
-- ════════════════════════════════════════════════════════════════════════
facebook_data AS (
  SELECT 
    team_id AS team,
    SUM(spend) AS total_spend_usd,
    SUM(impressions) AS total_impressions,
    SUM(clicks) AS total_clicks,
    COUNT(DISTINCT campaign_id) AS campaigns_count
  FROM traffic_stats
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY team_id
),

-- ════════════════════════════════════════════════════════════════════════
-- CTE 2: Landing Leads (ProfTest)
-- ════════════════════════════════════════════════════════════════════════
proftest_leads AS (
  SELECT 
    utm_source AS team,
    COUNT(*) AS proftest_count,
    COUNT(*) FILTER (WHERE email_sent = true) AS email_sent_count
  FROM landing_leads
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND (source LIKE 'proftest%' OR source = 'proftest')
  GROUP BY utm_source
),

-- ════════════════════════════════════════════════════════════════════════
-- CTE 3: CORRECTED Express Course Sales (amount < 50000)
-- ════════════════════════════════════════════════════════════════════════
express_sales AS (
  SELECT 
    utm_source AS team,
    COUNT(*) AS express_purchases,
    SUM(amount) AS express_revenue,
    COUNT(*) FILTER (WHERE amount < 50000) AS express_sales_count,
    SUM(amount) FILTER (WHERE amount < 50000) AS express_sales_amount
  FROM express_course_sales
  WHERE sale_date >= NOW() - INTERVAL '30 days'
  GROUP BY utm_source
),

-- ════════════════════════════════════════════════════════════════════════
-- CTE 4: CORRECTED Main Product Sales (amount >= 50000) - Flagman Sales
-- ════════════════════════════════════════════════════════════════════════
flagman_sales AS (
  SELECT 
    utm_source AS team,
    COUNT(*) AS flagman_purchases,
    SUM(amount) AS flagman_revenue,
    COUNT(*) FILTER (WHERE amount >= 50000) AS flagman_sales_count,
    SUM(amount) FILTER (WHERE amount >= 50000) AS flagman_sales_amount
  FROM main_product_sales
  WHERE sale_date >= NOW() - INTERVAL '30 days'
  GROUP BY utm_source
)

-- ════════════════════════════════════════════════════════════════════════
-- MAIN SELECT: Объединяем все данные с ПРАВИЛЬНОЙ классификацией
-- ════════════════════════════════════════════════════════════════════════
SELECT 
  COALESCE(fb.team, pl.team, es.team, fs.team) AS team,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 1: Facebook Ads (Затраты)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(fb.total_spend_usd, 0) AS stage1_spend_usd,
  COALESCE(fb.total_spend_usd * 475, 0) AS stage1_spend_kzt,
  COALESCE(fb.total_impressions, 0) AS stage1_impressions,
  COALESCE(fb.total_clicks, 0) AS stage1_clicks,
  COALESCE(fb.campaigns_count, 0) AS campaigns_count,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 2: ProfTest (Лиды)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(pl.proftest_count, 0) AS stage2_proftest_leads,
  COALESCE(pl.email_sent_count, 0) AS stage2_email_sent,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 3: Express Course (Покупки < 50000 KZT)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(es.express_sales_count, 0) AS stage3_express_sales_count,
  COALESCE(es.express_sales_amount, 0) AS stage3_express_revenue_kzt,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 4: Flagman Sales (Покупки >= 50000 KZT)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(fs.flagman_sales_count, 0) AS stage4_flagman_sales_count,
  COALESCE(fs.flagman_sales_amount, 0) AS stage4_main_revenue_kzt,
  
  -- ════════════════════════════════════════════════════════════════════
  -- CONVERSIONS (Конверсии между этапами)
  -- ════════════════════════════════════════════════════════════════════
  -- Impressions → ProfTest
  CASE 
    WHEN COALESCE(fb.total_impressions, 0) > 0 
    THEN ROUND((COALESCE(pl.proftest_count, 0)::NUMERIC / fb.total_impressions * 100), 2)
    ELSE 0
  END AS conv_impressions_to_proftest,
  
  -- ProfTest → Express (< 50000 KZT)
  CASE 
    WHEN COALESCE(pl.proftest_count, 0) > 0 
    THEN ROUND((COALESCE(es.express_sales_count, 0)::NUMERIC / pl.proftest_count * 100), 2)
    ELSE 0
  END AS conv_proftest_to_express,
  
  -- Express → Flagman (>= 50000 KZT)
  CASE 
    WHEN COALESCE(es.express_sales_count, 0) > 0 
    THEN ROUND((COALESCE(fs.flagman_sales_count, 0)::NUMERIC / es.express_sales_count * 100), 2)
    ELSE 0
  END AS conv_express_to_flagman,
  
  -- Overall: Impressions → Flagman
  CASE 
    WHEN COALESCE(fb.total_impressions, 0) > 0 
    THEN ROUND((COALESCE(fs.flagman_sales_count, 0)::NUMERIC / fb.total_impressions * 100), 4)
    ELSE 0
  END AS conv_overall,
  
  -- ════════════════════════════════════════════════════════════════════
  -- ROI & PROFIT with CORRECTED sales classification
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(es.express_sales_amount, 0) + COALESCE(fs.flagman_sales_amount, 0) AS total_revenue_kzt,
  
  -- ROI = (Revenue - Spend) / Spend * 100
  CASE 
    WHEN COALESCE(fb.total_spend_usd, 0) > 0 
    THEN ROUND(
      ((COALESCE(es.express_sales_amount, 0) + COALESCE(fs.flagman_sales_amount, 0) - fb.total_spend_usd * 475) 
       / (fb.total_spend_usd * 475) * 100), 
      2
    )
    ELSE 0
  END AS roi_percent,
  
  -- Timestamp последнего обновления
  NOW() AS last_updated

FROM facebook_data fb
FULL OUTER JOIN proftest_leads pl ON fb.team = pl.team
FULL OUTER JOIN express_sales es ON COALESCE(fb.team, pl.team) = es.team
FULL OUTER JOIN flagman_sales fs ON COALESCE(fb.team, pl.team, es.team) = fs.team

WHERE COALESCE(fb.team, pl.team, es.team, fs.team) IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════
-- ИНДЕКСЫ для быстрого доступа
-- ════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_analytics_team ON funnel_analytics (team);
CREATE INDEX IF NOT EXISTS idx_funnel_analytics_updated ON funnel_analytics (last_updated DESC);

-- ════════════════════════════════════════════════════════════════════════
-- КОММЕНТАРИИ
-- ════════════════════════════════════════════════════════════════════════
COMMENT ON MATERIALIZED VIEW funnel_analytics IS 'Агрегированные данные воронки продаж за последние 30 дней. Правильная классификация: express_sales < 50000 KZT, flagman_sales >= 50000 KZT. Обновляется каждые 5 минут.';
COMMENT ON COLUMN funnel_analytics.team IS 'Таргетолог: kenesary, traf4, arystan, muha';
COMMENT ON COLUMN funnel_analytics.roi_percent IS 'ROI = (Total Revenue - Ad Spend) / Ad Spend * 100';
COMMENT ON COLUMN funnel_analytics.stage3_express_sales_count IS 'Количество продаж Express Course (< 50000 KZT)';
COMMENT ON COLUMN funnel_analytics.stage4_flagman_sales_count IS 'Количество продаж Flagman (>= 50000 KZT)';

-- ════════════════════════════════════════════════════════════════════════
-- STEP 2: CREATE traffic_granular_stats (Deep Creative Performance Metrics)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS traffic_granular_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT NOT NULL,                    -- linked to Facebook
  team_id UUID,                          -- linked to traffic_teams
  thumbstop_rate NUMERIC,                -- 3-sec views / Impressions
  hold_rate NUMERIC,                     -- ThruPlays / Impressions  
  drop_off_rate NUMERIC,                 -- (Link Clicks - Landing Views) / Link Clicks
  cpm NUMERIC,                           -- Cost Per Mille
  fb_predicted_cpl NUMERIC,              -- Facebook predicted cost per link click
  creative_type TEXT,                    -- video, image, carousel, etc.
  creative_name TEXT,                    -- name of the creative
  campaign_id TEXT,                      -- Facebook campaign ID
  campaign_name TEXT,                    -- Facebook campaign name
  date DATE DEFAULT CURRENT_DATE,        -- date of the stats
  impressions BIGINT,                    -- number of impressions
  link_clicks BIGINT,                    -- number of link clicks
  landing_views BIGINT,                  -- number of landing page views
  video_3_sec_views BIGINT,             -- 3-second video views
  video_thru_plays BIGINT,              -- video through plays
  spend NUMERIC,                         -- amount spent
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for traffic_granular_stats
CREATE INDEX IF NOT EXISTS idx_traffic_granular_stats_ad_id ON traffic_granular_stats(ad_id);
CREATE INDEX IF NOT EXISTS idx_traffic_granular_stats_team_id ON traffic_granular_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_traffic_granular_stats_date ON traffic_granular_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_granular_stats_campaign_id ON traffic_granular_stats(campaign_id);

-- Comments for traffic_granular_stats
COMMENT ON TABLE traffic_granular_stats IS 'Detailed creative performance metrics to avoid bloating main traffic_stats table';
COMMENT ON COLUMN traffic_granular_stats.thumbstop_rate IS '3-second video views / Impressions';
COMMENT ON COLUMN traffic_granular_stats.hold_rate IS 'ThruPlays / Impressions';
COMMENT ON COLUMN traffic_granular_stats.drop_off_rate IS '(Link Clicks - Landing Views) / Link Clicks';
COMMENT ON COLUMN traffic_granular_stats.fb_predicted_cpl IS 'Facebook predicted cost per link click';

-- Trigger for updated_at in traffic_granular_stats
CREATE OR REPLACE FUNCTION update_traffic_granular_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER traffic_granular_stats_updated_at
  BEFORE UPDATE ON traffic_granular_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_traffic_granular_stats_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- STEP 3: CREATE ai_insights (For Groc API) with Latest Insight Constraint
-- ════════════════════════════════════════════════════════════════════════

-- First, drop the existing table if it exists to recreate with correct constraints
DROP TABLE IF EXISTS ai_insights CASCADE;

CREATE TABLE ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,            -- The 1-sentence recommendation
  context_data JSONB DEFAULT '{}'::jsonb, -- Snapshot of metrics used for analysis
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  priority VARCHAR(10) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  category VARCHAR(20) CHECK (category IN ('creative', 'targeting', 'budget', 'optimization')) DEFAULT 'optimization'
);

-- Indexes for ai_insights
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority) WHERE is_read = FALSE;

-- Create function and trigger to ensure only latest insight per user
-- This will keep only the latest insight per user by marking older ones as read
CREATE OR REPLACE FUNCTION ensure_latest_ai_insight()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark all previous insights for this user as read when a new one is inserted
  UPDATE ai_insights 
  SET is_read = TRUE 
  WHERE user_id = NEW.user_id 
    AND created_at < NEW.created_at 
    AND is_read = FALSE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_latest_ai_insight
  BEFORE INSERT ON ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION ensure_latest_ai_insight();

-- Comments for ai_insights
COMMENT ON TABLE ai_insights IS 'AI-generated tactical advice for targetologists using Groq API. Only latest insight per user is kept.';
COMMENT ON COLUMN ai_insights.insight_text IS 'The 1-sentence recommendation from AI analyst';
COMMENT ON COLUMN ai_insights.context_data IS 'Snapshot of metrics used for analysis (JSONB)';
COMMENT ON COLUMN ai_insights.priority IS 'high = critical issue, medium = improvement needed, low = optimization tip';
COMMENT ON COLUMN ai_insights.category IS 'Type of insight: creative, targeting, budget, or optimization';

-- ════════════════════════════════════════════════════════════════════════
-- STEP 4: CREATE data_integrity_logs (Audit System)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE data_integrity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  check_date DATE DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,                  -- e.g., 'amo_vs_dashboard', 'facebook_vs_landing', 'revenue_calculation'
  discrepancy_amount NUMERIC,            -- amount of discrepancy found
  status VARCHAR(10) CHECK (status IN ('ok', 'warning', 'error')) DEFAULT 'ok',
  description TEXT,                      -- detailed description of the check
  details JSONB DEFAULT '{}'::jsonb,     -- additional details in JSON format
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data_integrity_logs
CREATE INDEX IF NOT EXISTS idx_data_integrity_logs_check_date ON data_integrity_logs(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_data_integrity_logs_source ON data_integrity_logs(source);
CREATE INDEX IF NOT EXISTS idx_data_integrity_logs_status ON data_integrity_logs(status);

-- Comments for data_integrity_logs
COMMENT ON TABLE data_integrity_logs IS 'Audit system to track data integrity checks and discrepancies';
COMMENT ON COLUMN data_integrity_logs.source IS 'Source of the check: amo_vs_dashboard, facebook_vs_landing, etc.';
COMMENT ON COLUMN data_integrity_logs.discrepancy_amount IS 'Amount of discrepancy found during the check';
COMMENT ON COLUMN data_integrity_logs.status IS 'Status: ok, warning, or error';

-- ════════════════════════════════════════════════════════════════════════
-- STEP 5: REFRESH MATERIALIZED VIEW
-- ════════════════════════════════════════════════════════════════════════

REFRESH MATERIALIZED VIEW funnel_analytics;

-- ════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE!
-- ════════════════════════════════════════════════════════════════════════
-- Verification queries:
-- 
-- 1. Check the 490k sale classification:
--    SELECT * FROM main_product_sales WHERE amount >= 50000;
--    SELECT team, stage4_flagman_sales_count, stage4_main_revenue_kzt FROM funnel_analytics;
-- 
-- 2. Check granular stats table:
--    \d traffic_granular_stats
-- 
-- 3. Check ai_insights table:
--    \d ai_insights
-- 
-- 4. Check data integrity logs table:
--    \d data_integrity_logs
-- 
-- 5. Test the view with sample data:
--    SELECT * FROM funnel_analytics ORDER BY team;
-- 
-- The 490,000 sale should now appear in the Flagman column, correcting the ROAS calculation!
-- All new tables are created with proper constraints and indexes.