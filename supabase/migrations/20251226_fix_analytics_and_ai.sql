-- 1. Fix Sales Attribution (Split Express vs Flagman)
CREATE OR REPLACE VIEW funnel_analytics AS
SELECT
    date_trunc('day', created_at) as date,
    utm_source,
    COUNT(*) FILTER (WHERE price < 50000) as express_sales_count,
    SUM(price) FILTER (WHERE price < 50000) as express_revenue,
    COUNT(*) FILTER (WHERE price >= 50000) as flagman_sales_count,
    SUM(price) FILTER (WHERE price >= 50000) as flagman_revenue,
    SUM(price) as total_revenue
FROM paid_leads -- (Ensure this matches the actual sales table name in DB)
GROUP BY 1, 2;

-- 2. CREATE AI INSIGHTS TABLE
CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES traffic_users(id),
    insight_text TEXT NOT NULL, -- The advice from Groq
    context_data JSONB,         -- Metrics snapshot
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE GRANULAR STATS (For Deep Analytics)
CREATE TABLE IF NOT EXISTS traffic_granular_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ad_id TEXT,
    thumbstop_rate NUMERIC, -- 3-sec video views
    hold_rate NUMERIC,      -- Retention
    cpm NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);