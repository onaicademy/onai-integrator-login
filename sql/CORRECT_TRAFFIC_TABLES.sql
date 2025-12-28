-- ============================================================
-- TRAFFIC DASHBOARD - ПРАВИЛЬНЫЕ ТАБЛИЦЫ
-- ============================================================
-- Traffic Dashboard НЕ хранит лиды!
-- Лиды в Landing DB (xikaiavwqinamgolmtcy)
-- Traffic Dashboard агрегирует только продажи из AmoCRM
-- ============================================================

-- ============================================================
-- 1. traffic_sales_stats - Агрегированная статистика по командам
-- ============================================================
-- Эта таблица хранит агрегированные данные о продажах по командам
-- Данные обновляются ежедневно из all_sales_tracking
CREATE TABLE IF NOT EXISTS traffic_sales_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Период статистики
  date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  
  -- Информация о команде
  team_name TEXT NOT NULL,
  team_id UUID REFERENCES traffic_teams(id) ON DELETE CASCADE,
  
  -- UTM метки команды
  utm_source TEXT,
  utm_medium TEXT DEFAULT 'cpc',
  
  -- Метрики продаж
  total_sales INTEGER DEFAULT 0,
  total_revenue NUMERIC(15, 2) DEFAULT 0,
  average_order_value NUMERIC(15, 2) DEFAULT 0,
  
  -- Разделение по типам продаж
  flagman_sales INTEGER DEFAULT 0,
  flagman_revenue NUMERIC(15, 2) DEFAULT 0,
  express_sales INTEGER DEFAULT 0,
  express_revenue NUMERIC(15, 2) DEFAULT 0,
  
  -- Конверсия (если есть данные о лидах)
  leads_count INTEGER DEFAULT 0,
  conversion_rate NUMERIC(5, 2) DEFAULT 0,
  
  -- Данные из Facebook Ads
  fb_spend NUMERIC(15, 2) DEFAULT 0,
  fb_impressions INTEGER DEFAULT 0,
  fb_clicks INTEGER DEFAULT 0,
  fb_ctr NUMERIC(5, 2) DEFAULT 0,
  fb_cpc NUMERIC(10, 2) DEFAULT 0,
  fb_cpm NUMERIC(10, 2) DEFAULT 0,
  
  -- ROI и метрики эффективности
  roi NUMERIC(10, 2) DEFAULT 0,
  roas NUMERIC(10, 2) DEFAULT 0,
  cpa NUMERIC(10, 2) DEFAULT 0,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальный constraint для предотвращения дубликатов
  UNIQUE(date, period_type, team_name)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_sales_stats_date ON traffic_sales_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_stats_team ON traffic_sales_stats(team_name);
CREATE INDEX IF NOT EXISTS idx_sales_stats_period ON traffic_sales_stats(period_type);
CREATE INDEX IF NOT EXISTS idx_sales_stats_date_team ON traffic_sales_stats(date DESC, team_name);

-- Комментарий к таблице
COMMENT ON TABLE traffic_sales_stats IS 'Агрегированная статистика продаж по командам (обновляется ежедневно из all_sales_tracking)';
COMMENT ON COLUMN traffic_sales_stats.flagman_sales IS 'Количество продаж Flagman (>= 50,000 KZT)';
COMMENT ON COLUMN traffic_sales_stats.express_sales IS 'Количество продаж Express (< 50,000 KZT)';
COMMENT ON COLUMN traffic_sales_stats.roi IS 'ROI = (revenue - spend) / spend * 100';
COMMENT ON COLUMN traffic_sales_stats.roas IS 'ROAS = revenue / spend';
COMMENT ON COLUMN traffic_sales_stats.cpa IS 'Cost Per Acquisition = spend / sales';

-- ============================================================
-- 2. traffic_fb_campaigns - Кампании Facebook Ads
-- ============================================================
-- Эта таблица хранит информацию о кампаниях Facebook
-- Используется для отслеживания расходов и метрик
CREATE TABLE IF NOT EXISTS traffic_fb_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ID кампании из Facebook
  fb_campaign_id TEXT NOT NULL UNIQUE,
  fb_ad_account_id TEXT NOT NULL,
  
  -- Информация о кампании
  campaign_name TEXT,
  campaign_status TEXT,
  campaign_objective TEXT,
  
  -- Привязка к команде
  team_name TEXT,
  team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL,
  
  -- UTM метки кампании
  utm_source TEXT,
  utm_medium TEXT DEFAULT 'cpc',
  utm_campaign TEXT,
  
  -- Метрики кампании (актуальные данные)
  spend NUMERIC(15, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0,
  cpc NUMERIC(10, 2) DEFAULT 0,
  cpm NUMERIC(10, 2) DEFAULT 0,
  
  -- Метрики конверсий
  conversions INTEGER DEFAULT 0,
  cost_per_conversion NUMERIC(10, 2) DEFAULT 0,
  
  -- Период данных
  data_start_date DATE,
  data_end_date DATE,
  
  -- Метаданные
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_fb_campaigns_account ON traffic_fb_campaigns(fb_ad_account_id);
CREATE INDEX IF NOT EXISTS idx_fb_campaigns_team ON traffic_fb_campaigns(team_name);
CREATE INDEX IF NOT EXISTS idx_fb_campaigns_status ON traffic_fb_campaigns(campaign_status);
CREATE INDEX IF NOT EXISTS idx_fb_campaigns_synced ON traffic_fb_campaigns(last_synced_at DESC);

-- Комментарий
COMMENT ON TABLE traffic_fb_campaigns IS 'Кампании Facebook Ads с метриками расходов';
COMMENT ON COLUMN traffic_fb_campaigns.fb_campaign_id IS 'ID кампании из Facebook Ads API';
COMMENT ON COLUMN traffic_fb_campaigns.fb_ad_account_id IS 'ID рекламного кабинета из Facebook';

-- ============================================================
-- 3. traffic_fb_ad_sets - Группы объявлений Facebook
-- ============================================================
-- Опционально: для более детального отслеживания
CREATE TABLE IF NOT EXISTS traffic_fb_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ID группы объявлений из Facebook
  fb_ad_set_id TEXT NOT NULL UNIQUE,
  fb_campaign_id TEXT NOT NULL REFERENCES traffic_fb_campaigns(fb_campaign_id) ON DELETE CASCADE,
  fb_ad_account_id TEXT NOT NULL,
  
  -- Информация о группе
  ad_set_name TEXT,
  ad_set_status TEXT,
  targeting JSONB,
  
  -- Метрики
  spend NUMERIC(15, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0,
  cpc NUMERIC(10, 2) DEFAULT 0,
  
  -- Период данных
  data_start_date DATE,
  data_end_date DATE,
  
  -- Метаданные
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_fb_ad_sets_campaign ON traffic_fb_ad_sets(fb_campaign_id);
CREATE INDEX IF NOT EXISTS idx_fb_ad_sets_account ON traffic_fb_ad_sets(fb_ad_account_id);

-- Комментарий
COMMENT ON TABLE traffic_fb_ad_sets IS 'Группы объявлений Facebook Ads (опционально для детального анализа)';

-- ============================================================
-- 4. traffic_fb_ads - Объявления Facebook
-- ============================================================
-- Опционально: для максимальной детализации
CREATE TABLE IF NOT EXISTS traffic_fb_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ID объявления из Facebook
  fb_ad_id TEXT NOT NULL UNIQUE,
  fb_ad_set_id TEXT REFERENCES traffic_fb_ad_sets(fb_ad_set_id) ON DELETE CASCADE,
  fb_campaign_id TEXT NOT NULL REFERENCES traffic_fb_campaigns(fb_campaign_id) ON DELETE CASCADE,
  fb_ad_account_id TEXT NOT NULL,
  
  -- Информация об объявлении
  ad_name TEXT,
  ad_status TEXT,
  ad_format TEXT,
  creative_url TEXT,
  
  -- Метрики
  spend NUMERIC(15, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5, 2) DEFAULT 0,
  cpc NUMERIC(10, 2) DEFAULT 0,
  
  -- Период данных
  data_start_date DATE,
  data_end_date DATE,
  
  -- Метаданные
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_fb_ads_ad_set ON traffic_fb_ads(fb_ad_set_id);
CREATE INDEX IF NOT EXISTS idx_fb_ads_campaign ON traffic_fb_ads(fb_campaign_id);

-- Комментарий
COMMENT ON TABLE traffic_fb_ads IS 'Объявления Facebook Ads (опционально для максимальной детализации)';

-- ============================================================
-- 5. УДАЛИТЬ НЕНУЖНЫЕ ТАБЛИЦЫ
-- ============================================================
-- Эти таблицы не нужны для Traffic Dashboard:
-- - lead_tracking - лиды в Landing DB
-- - sales_activity_log - не нужно для MVP
-- - audit_log - можно добавить позже

-- Раскомментируйте для удаления:
-- DROP TABLE IF EXISTS lead_tracking CASCADE;
-- DROP TABLE IF EXISTS sales_activity_log CASCADE;
-- DROP TABLE IF EXISTS audit_log CASCADE;

-- ============================================================
-- 6. Создать функцию для обновления updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применить триггер ко всем таблицам
CREATE TRIGGER update_traffic_sales_stats_updated_at BEFORE UPDATE ON traffic_sales_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_fb_campaigns_updated_at BEFORE UPDATE ON traffic_fb_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_fb_ad_sets_updated_at BEFORE UPDATE ON traffic_fb_ad_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_fb_ads_updated_at BEFORE UPDATE ON traffic_fb_ads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. Вставить тестовые данные (для разработки)
-- ============================================================
-- Раскомментируйте для вставки тестовых данных:
/*
INSERT INTO traffic_sales_stats (date, period_type, team_name, utm_source, total_sales, total_revenue, flagman_sales, flagman_revenue, express_sales, express_revenue)
VALUES 
  (CURRENT_DATE, 'daily', 'Arystan', 'fb_arystan', 5, 250000, 2, 150000, 3, 100000),
  (CURRENT_DATE, 'daily', 'Kenesary', 'fb_kenesary', 3, 180000, 1, 80000, 2, 100000),
  (CURRENT_DATE, 'daily', 'Muha', 'fb_muha', 4, 200000, 1, 60000, 3, 140000),
  (CURRENT_DATE, 'daily', 'Traf4', 'fb_traf4', 2, 120000, 1, 70000, 1, 50000)
ON CONFLICT (date, period_type, team_name) DO NOTHING;
*/

-- ============================================================
-- 8. Проверка создания таблиц
-- ============================================================
SELECT 
  'traffic_sales_stats' as table_name,
  (SELECT COUNT(*) FROM traffic_sales_stats) as row_count
UNION ALL
SELECT 
  'traffic_fb_campaigns' as table_name,
  (SELECT COUNT(*) FROM traffic_fb_campaigns) as row_count
UNION ALL
SELECT 
  'traffic_fb_ad_sets' as table_name,
  (SELECT COUNT(*) FROM traffic_fb_ad_sets) as row_count
UNION ALL
SELECT 
  'traffic_fb_ads' as table_name,
  (SELECT COUNT(*) FROM traffic_fb_ads) as row_count;

-- ============================================================
-- ГОТОВО!
-- ============================================================
