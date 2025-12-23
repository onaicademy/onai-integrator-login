-- ============================================
-- PRODUCTION MIGRATION: Create Sales Tables
-- Date: 2025-12-23 21:00
-- Landing DB (xikaiavwqinamgolmtcy)
-- ============================================

-- STEP 1: Create express_course_sales table
-- Для хранения покупок Express Course (5,000 KZT)
CREATE TABLE IF NOT EXISTS express_course_sales (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  
  -- AmoCRM связь
  deal_id BIGINT UNIQUE NOT NULL,
  pipeline_id BIGINT,
  status_id BIGINT,
  
  -- Финансы
  amount NUMERIC DEFAULT 5000.00,
  currency VARCHAR(3) DEFAULT 'KZT',
  
  -- UTM метки для атрибуции
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  
  -- Контактная информация
  phone VARCHAR(50),
  email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_id BIGINT,
  
  -- Timestamps
  sale_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  webhook_received_at TIMESTAMP,
  
  -- Метаданные из AmoCRM
  raw_data JSONB
);

-- Индексы для express_course_sales
CREATE INDEX IF NOT EXISTS idx_express_sales_deal_id ON express_course_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_express_sales_utm_source ON express_course_sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_express_sales_date ON express_course_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_express_sales_phone ON express_course_sales(phone);

-- RLS для express_course_sales
ALTER TABLE express_course_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to express_course_sales"
  ON express_course_sales FOR ALL
  USING (true);

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_express_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER express_sales_updated_at
  BEFORE UPDATE ON express_course_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_express_sales_updated_at();

COMMENT ON TABLE express_course_sales IS 'Express Course purchases (5,000 KZT) from AmoCRM webhook';

-- ============================================
-- STEP 2: Create main_product_sales table
-- Для хранения покупок Integrator Flagman (490,000 KZT)
-- ============================================
CREATE TABLE IF NOT EXISTS main_product_sales (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  
  -- AmoCRM связь
  deal_id BIGINT UNIQUE NOT NULL,
  pipeline_id BIGINT,
  status_id BIGINT,
  
  -- Финансы
  amount NUMERIC DEFAULT 490000.00,
  currency VARCHAR(3) DEFAULT 'KZT',
  
  -- UTM метки для атрибуции
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  
  -- Контактная информация
  phone VARCHAR(50),
  email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_id BIGINT,
  
  -- Timestamps
  sale_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  webhook_received_at TIMESTAMP,
  
  -- Метаданные из AmoCRM
  raw_data JSONB
);

-- Индексы для main_product_sales
CREATE INDEX IF NOT EXISTS idx_main_sales_deal_id ON main_product_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_main_sales_utm_source ON main_product_sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_main_sales_date ON main_product_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_main_sales_phone ON main_product_sales(phone);

-- RLS для main_product_sales
ALTER TABLE main_product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access to main_product_sales"
  ON main_product_sales FOR ALL
  USING (true);

-- Trigger для updated_at
CREATE OR REPLACE FUNCTION update_main_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER main_sales_updated_at
  BEFORE UPDATE ON main_product_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_main_sales_updated_at();

COMMENT ON TABLE main_product_sales IS 'Integrator Flagman purchases (490,000 KZT) from AmoCRM webhook';

-- ============================================
-- STEP 3: Опционально - Мигрировать существующие Express Course лиды
-- ============================================
-- ВНИМАНИЕ: Эта часть закомментирована для безопасности!
-- Раскомментируйте только после backup и согласования!

/*
-- Мигрировать 177 покупателей Express Course из landing_leads
INSERT INTO express_course_sales (
  deal_id,
  amount,
  utm_source,
  utm_campaign,
  phone,
  customer_name,
  sale_date,
  created_at,
  raw_data
)
SELECT 
  -- Используем created_at timestamp как уникальный ID (временно)
  EXTRACT(EPOCH FROM created_at)::BIGINT as deal_id,
  5000.00 as amount,
  metadata->>'utm_source' as utm_source,
  metadata->>'utm_campaign' as utm_campaign,
  phone,
  name as customer_name,
  created_at as sale_date,
  created_at,
  metadata as raw_data
FROM landing_leads
WHERE source = 'expresscourse'
  AND created_at > '2025-12-13'  -- Только свежие данные
ON CONFLICT (deal_id) DO NOTHING;

-- Логирование
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count FROM express_course_sales;
  RAISE NOTICE 'Migrated % Express Course purchases from landing_leads', migrated_count;
END $$;
*/

-- ============================================
-- STEP 4: Добавить UTM колонки в landing_leads (опционально)
-- ============================================
-- Для удобства работы с UTM метками

ALTER TABLE landing_leads 
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- Извлечь UTM метки из metadata JSON
UPDATE landing_leads
SET 
  utm_source = COALESCE(
    metadata->'utmParams'->>'utm_source',
    metadata->>'utm_source'
  ),
  utm_campaign = COALESCE(
    metadata->'utmParams'->>'utm_campaign',
    metadata->>'utm_campaign'
  ),
  utm_medium = COALESCE(
    metadata->'utmParams'->>'utm_medium',
    metadata->>'utm_medium'
  ),
  utm_content = COALESCE(
    metadata->'utmParams'->>'utm_content',
    metadata->>'utm_content'
  ),
  utm_term = COALESCE(
    metadata->'utmParams'->>'utm_term',
    metadata->>'utm_term'
  )
WHERE metadata IS NOT NULL
  AND (utm_source IS NULL OR utm_campaign IS NULL);

-- Создать индексы на UTM колонки
CREATE INDEX IF NOT EXISTS idx_landing_leads_utm_source ON landing_leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_landing_leads_utm_campaign ON landing_leads(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_landing_leads_source_pattern ON landing_leads(source text_pattern_ops);

-- ============================================
-- STEP 5: Проверка миграции
-- ============================================

DO $$
DECLARE
  express_table_exists BOOLEAN;
  main_table_exists BOOLEAN;
  landing_leads_count INTEGER;
  proftest_count INTEGER;
  expresscourse_count INTEGER;
BEGIN
  -- Проверить что таблицы созданы
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'express_course_sales'
  ) INTO express_table_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'main_product_sales'
  ) INTO main_table_exists;
  
  -- Посчитать лиды
  SELECT COUNT(*) INTO landing_leads_count FROM landing_leads;
  SELECT COUNT(*) INTO proftest_count FROM landing_leads WHERE source LIKE 'proftest%';
  SELECT COUNT(*) INTO expresscourse_count FROM landing_leads WHERE source = 'expresscourse';
  
  -- Вывести результаты
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Production database status:';
  RAISE NOTICE '  - express_course_sales table: %', CASE WHEN express_table_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
  RAISE NOTICE '  - main_product_sales table: %', CASE WHEN main_table_exists THEN '✅ EXISTS' ELSE '❌ NOT FOUND' END;
  RAISE NOTICE '';
  RAISE NOTICE '📈 Landing leads statistics:';
  RAISE NOTICE '  - Total leads: %', landing_leads_count;
  RAISE NOTICE '  - ProfTest leads: %', proftest_count;
  RAISE NOTICE '  - Express Course purchases: % (still in landing_leads)', expresscourse_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Next steps:';
  RAISE NOTICE '  1. Verify webhooks are working: POST /api/amocrm/funnel-sale';
  RAISE NOTICE '  2. Verify webhooks are working: POST /webhook/amocrm/traffic';
  RAISE NOTICE '  3. Optionally migrate 177 Express Course purchases to express_course_sales table';
  RAISE NOTICE '  4. Test funnel API: GET /api/traffic-dashboard/funnel';
END $$;
