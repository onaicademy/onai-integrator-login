-- 💰 ALL SALES TRACKING - Полное отслеживание всех продаж по UTM-меткам
-- Расширенная версия sales_notifications с фокусом на источники трафика

-- 1. Таблица всех продаж (расширенная)
CREATE TABLE IF NOT EXISTS all_sales_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- AmoCRM данные
  lead_id TEXT NOT NULL,
  lead_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  
  -- Финансы
  sale_amount DECIMAL NOT NULL,
  product_name TEXT,
  currency TEXT DEFAULT 'KZT',
  
  -- UTM метки (ПОЛНЫЕ)
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  utm_id TEXT,
  
  -- Дополнительные источники
  referrer TEXT,
  landing_page TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  
  -- AmoCRM метаданные
  pipeline_id TEXT,
  status_id TEXT,
  responsible_user_id TEXT,
  responsible_user_name TEXT,
  
  -- Таргетолог (если определён)
  targetologist TEXT,
  
  -- Timestamps
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Webhook метаданные
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  raw_webhook_data JSONB,
  
  UNIQUE(lead_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_all_sales_utm_source ON all_sales_tracking(utm_source);
CREATE INDEX idx_all_sales_utm_campaign ON all_sales_tracking(utm_campaign);
CREATE INDEX idx_all_sales_targetologist ON all_sales_tracking(targetologist);
CREATE INDEX idx_all_sales_date ON all_sales_tracking(sale_date DESC);
CREATE INDEX idx_all_sales_amount ON all_sales_tracking(sale_amount DESC);

-- 2. View: Топ UTM источников
CREATE OR REPLACE VIEW top_utm_sources AS
SELECT 
  utm_source,
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale,
  STRING_AGG(DISTINCT utm_campaign, ', ' ORDER BY utm_campaign) as campaigns
FROM all_sales_tracking
WHERE utm_source IS NOT NULL
GROUP BY utm_source
ORDER BY total_revenue DESC;

-- 3. View: Топ UTM кампаний
CREATE OR REPLACE VIEW top_utm_campaigns AS
SELECT 
  utm_campaign,
  utm_source,
  utm_medium,
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale
FROM all_sales_tracking
WHERE utm_campaign IS NOT NULL
GROUP BY utm_campaign, utm_source, utm_medium
ORDER BY total_revenue DESC;

-- 4. View: Статистика по таргетологам (расширенная)
CREATE OR REPLACE VIEW targetologist_extended_stats AS
SELECT 
  targetologist,
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale,
  MIN(sale_amount) as min_sale,
  MAX(sale_amount) as max_sale,
  STRING_AGG(DISTINCT utm_source, ', ' ORDER BY utm_source) as sources,
  STRING_AGG(DISTINCT utm_campaign, ', ' ORDER BY utm_campaign) as campaigns,
  MIN(sale_date) as first_sale,
  MAX(sale_date) as last_sale
FROM all_sales_tracking
WHERE targetologist IS NOT NULL AND targetologist != 'Unknown'
GROUP BY targetologist
ORDER BY total_revenue DESC;

-- 5. View: Продажи без UTM меток (для анализа проблем)
CREATE OR REPLACE VIEW sales_without_utm AS
SELECT 
  id,
  lead_id,
  lead_name,
  contact_name,
  sale_amount,
  sale_date,
  targetologist
FROM all_sales_tracking
WHERE 
  (utm_source IS NULL OR utm_source = '') AND
  (utm_campaign IS NULL OR utm_campaign = '')
ORDER BY sale_date DESC;

-- 6. View: Дневная статистика по источникам
CREATE OR REPLACE VIEW daily_utm_stats AS
SELECT 
  DATE(sale_date) as date,
  utm_source,
  utm_campaign,
  COUNT(*) as sales_count,
  SUM(sale_amount) as daily_revenue
FROM all_sales_tracking
WHERE sale_date > NOW() - INTERVAL '30 days'
GROUP BY DATE(sale_date), utm_source, utm_campaign
ORDER BY date DESC, daily_revenue DESC;

-- 7. Function: Обновление targetologist при вставке
CREATE OR REPLACE FUNCTION update_targetologist_from_utm()
RETURNS TRIGGER AS $$
DECLARE
  detected_targetologist TEXT;
BEGIN
  -- Если targetologist уже установлен, не меняем
  IF NEW.targetologist IS NOT NULL AND NEW.targetologist != '' AND NEW.targetologist != 'Unknown' THEN
    RETURN NEW;
  END IF;
  
  detected_targetologist := 'Unknown';
  
  -- Проверка utm_campaign
  IF NEW.utm_campaign IS NOT NULL THEN
    IF NEW.utm_campaign ILIKE '%tripwire%' OR NEW.utm_campaign ILIKE '%nutcab%' OR NEW.utm_campaign ILIKE '%kenesary%' OR NEW.utm_campaign ILIKE '%kenji%' THEN
      detected_targetologist := 'Kenesary';
    ELSIF NEW.utm_campaign ILIKE '%arystan%' THEN
      detected_targetologist := 'Arystan';
    ELSIF NEW.utm_campaign ILIKE '%on ai%' OR NEW.utm_campaign ILIKE '%onai%' OR NEW.utm_campaign ILIKE '%запуск%' OR NEW.utm_campaign ILIKE '%muha%' THEN
      detected_targetologist := 'Muha';
    ELSIF NEW.utm_campaign ILIKE '%alex%' OR NEW.utm_campaign ILIKE '%traf4%' OR NEW.utm_campaign ILIKE '%proftest%' THEN
      detected_targetologist := 'Traf4';
    END IF;
  END IF;
  
  -- Если не нашли по campaign, проверяем source
  IF detected_targetologist = 'Unknown' AND NEW.utm_source IS NOT NULL THEN
    IF NEW.utm_source ILIKE '%kenji%' OR NEW.utm_source ILIKE '%kenesary%' THEN
      detected_targetologist := 'Kenesary';
    ELSIF NEW.utm_source ILIKE '%arystan%' THEN
      detected_targetologist := 'Arystan';
    ELSIF NEW.utm_source ILIKE '%yourmarketolog%' THEN
      detected_targetologist := 'Muha';
    ELSIF NEW.utm_source ILIKE '%pb_agency%' THEN
      detected_targetologist := 'Traf4';
    END IF;
  END IF;
  
  NEW.targetologist := detected_targetologist;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger для автоматического определения таргетолога
DROP TRIGGER IF EXISTS set_targetologist_on_insert ON all_sales_tracking;
CREATE TRIGGER set_targetologist_on_insert
  BEFORE INSERT ON all_sales_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_targetologist_from_utm();

-- Комментарии
COMMENT ON TABLE all_sales_tracking IS 'Полное отслеживание всех продаж с AmoCRM с UTM метками';
COMMENT ON COLUMN all_sales_tracking.utm_source IS 'Источник трафика (facebook, google, instagram, direct)';
COMMENT ON COLUMN all_sales_tracking.utm_campaign IS 'Название кампании (используется для определения таргетолога)';
COMMENT ON COLUMN all_sales_tracking.targetologist IS 'Таргетолог, определённый по UTM меткам';
COMMENT ON COLUMN all_sales_tracking.raw_webhook_data IS 'Полные данные от AmoCRM webhook для отладки';

COMMENT ON VIEW top_utm_sources IS 'Топ источников трафика по выручке';
COMMENT ON VIEW top_utm_campaigns IS 'Топ кампаний по выручке';
COMMENT ON VIEW sales_without_utm IS 'Продажи без UTM меток (требуют внимания)';
