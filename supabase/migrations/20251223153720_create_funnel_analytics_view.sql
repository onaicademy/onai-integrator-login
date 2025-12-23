-- ════════════════════════════════════════════════════════════════════════
-- 📊 MATERIALIZED VIEW: FUNNEL ANALYTICS
-- ════════════════════════════════════════════════════════════════════════
-- Created: 2025-12-23
-- Purpose: Агрегированные данные воронки для быстрой подгрузки в Traffic Dashboard
-- Refresh: Каждые 5 минут через cron или вручную
-- ════════════════════════════════════════════════════════════════════════

-- Сначала удалим если существует
DROP MATERIALIZED VIEW IF EXISTS funnel_analytics CASCADE;

-- Создаём материализованное представление
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
-- CTE 3: Express Course Sales
-- ════════════════════════════════════════════════════════════════════════
express_sales AS (
  SELECT 
    utm_source AS team,
    COUNT(*) AS express_purchases,
    SUM(amount) AS express_revenue
  FROM express_course_sales
  WHERE sale_date >= NOW() - INTERVAL '30 days'
  GROUP BY utm_source
),

-- ════════════════════════════════════════════════════════════════════════
-- CTE 4: Main Product Sales (Integrator Flagman)
-- ════════════════════════════════════════════════════════════════════════
main_sales AS (
  SELECT 
    utm_source AS team,
    COUNT(*) AS main_purchases,
    SUM(amount) AS main_revenue
  FROM main_product_sales
  WHERE sale_date >= NOW() - INTERVAL '30 days'
  GROUP BY utm_source
)

-- ════════════════════════════════════════════════════════════════════════
-- MAIN SELECT: Объединяем все данные
-- ════════════════════════════════════════════════════════════════════════
SELECT 
  COALESCE(fb.team, pl.team, es.team, ms.team) AS team,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 1: Facebook Ads (Затраты)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(fb.total_spend_usd, 0) AS stage1_spend_usd,
  COALESCE(fb.total_spend_usd * 475, 0) AS stage1_spend_kzt, -- упрощённая конверсия
  COALESCE(fb.total_impressions, 0) AS stage1_impressions,
  COALESCE(fb.total_clicks, 0) AS stage1_clicks,
  COALESCE(fb.campaigns_count, 0) AS campaigns_count,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 2: ProfTest (Лиды)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(pl.proftest_count, 0) AS stage2_proftest_leads,
  COALESCE(pl.email_sent_count, 0) AS stage2_email_sent,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 3: Express Course (Покупки)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(es.express_purchases, 0) AS stage3_express_purchases,
  COALESCE(es.express_revenue, 0) AS stage3_express_revenue_kzt,
  
  -- ════════════════════════════════════════════════════════════════════
  -- STAGE 4: Main Product (Integrator Flagman)
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(ms.main_purchases, 0) AS stage4_main_purchases,
  COALESCE(ms.main_revenue, 0) AS stage4_main_revenue_kzt,
  
  -- ════════════════════════════════════════════════════════════════════
  -- CONVERSIONS (Конверсии между этапами)
  -- ════════════════════════════════════════════════════════════════════
  -- Impressions → ProfTest
  CASE 
    WHEN COALESCE(fb.total_impressions, 0) > 0 
    THEN ROUND((COALESCE(pl.proftest_count, 0)::NUMERIC / fb.total_impressions * 100), 2)
    ELSE 0
  END AS conv_impressions_to_proftest,
  
  -- ProfTest → Express
  CASE 
    WHEN COALESCE(pl.proftest_count, 0) > 0 
    THEN ROUND((COALESCE(es.express_purchases, 0)::NUMERIC / pl.proftest_count * 100), 2)
    ELSE 0
  END AS conv_proftest_to_express,
  
  -- Express → Main Product
  CASE 
    WHEN COALESCE(es.express_purchases, 0) > 0 
    THEN ROUND((COALESCE(ms.main_purchases, 0)::NUMERIC / es.express_purchases * 100), 2)
    ELSE 0
  END AS conv_express_to_main,
  
  -- Overall: Impressions → Main Product
  CASE 
    WHEN COALESCE(fb.total_impressions, 0) > 0 
    THEN ROUND((COALESCE(ms.main_purchases, 0)::NUMERIC / fb.total_impressions * 100), 4)
    ELSE 0
  END AS conv_overall,
  
  -- ════════════════════════════════════════════════════════════════════
  -- ROI & PROFIT
  -- ════════════════════════════════════════════════════════════════════
  COALESCE(es.express_revenue, 0) + COALESCE(ms.main_revenue, 0) AS total_revenue_kzt,
  
  -- ROI = (Revenue - Spend) / Spend * 100
  CASE 
    WHEN COALESCE(fb.total_spend_usd, 0) > 0 
    THEN ROUND(
      ((COALESCE(es.express_revenue, 0) + COALESCE(ms.main_revenue, 0) - fb.total_spend_usd * 475) 
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
FULL OUTER JOIN main_sales ms ON COALESCE(fb.team, pl.team, es.team) = ms.team

WHERE COALESCE(fb.team, pl.team, es.team, ms.team) IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════
-- ИНДЕКСЫ для быстрого доступа
-- ════════════════════════════════════════════════════════════════════════
CREATE UNIQUE INDEX idx_funnel_analytics_team ON funnel_analytics (team);
CREATE INDEX idx_funnel_analytics_updated ON funnel_analytics (last_updated DESC);

-- ════════════════════════════════════════════════════════════════════════
-- КОММЕНТАРИИ
-- ════════════════════════════════════════════════════════════════════════
COMMENT ON MATERIALIZED VIEW funnel_analytics IS 'Агрегированные данные воронки продаж за последние 30 дней. Обновляется каждые 5 минут.';
COMMENT ON COLUMN funnel_analytics.team IS 'Таргетолог: kenesary, traf4, arystan, muha';
COMMENT ON COLUMN funnel_analytics.roi_percent IS 'ROI = (Total Revenue - Ad Spend) / Ad Spend * 100';

-- ════════════════════════════════════════════════════════════════════════
-- INITIAL REFRESH
-- ════════════════════════════════════════════════════════════════════════
REFRESH MATERIALIZED VIEW funnel_analytics;

-- ════════════════════════════════════════════════════════════════════════
-- ✅ ГОТОВО!
-- ════════════════════════════════════════════════════════════════════════
-- Проверка:
-- SELECT * FROM funnel_analytics ORDER BY team;
-- REFRESH MATERIALIZED VIEW funnel_analytics; -- обновить вручную

