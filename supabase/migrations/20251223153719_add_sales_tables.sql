-- ════════════════════════════════════════════════════════════════════════
-- 💰 SALES TABLES FOR FUNNEL ANALYTICS
-- ════════════════════════════════════════════════════════════════════════
-- Created: 2025-12-23
-- Purpose: Хранение продаж из AmoCRM для воронки продаж Traffic Dashboard
-- ════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════
-- 1. MAIN PRODUCT SALES (Integrator Flagman - 490,000 KZT)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS main_product_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- AmoCRM данные
  deal_id BIGINT NOT NULL UNIQUE,
  pipeline_id BIGINT, -- 10350882 (основная воронка)
  status_id BIGINT,
  
  -- Финансы
  amount DECIMAL(12,2) NOT NULL, -- 490000.00 KZT
  currency VARCHAR(3) DEFAULT 'KZT',
  
  -- UTM метки для атрибуции таргетологам
  utm_source VARCHAR(100), -- "kenesary", "traf4", "arystan", "muha"
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255), -- название объявления
  utm_term VARCHAR(255),
  
  -- Контактные данные клиента
  phone VARCHAR(50),
  email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_id BIGINT,
  
  -- Timestamps
  sale_date TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Метаданные
  webhook_received_at TIMESTAMP,
  raw_data JSONB, -- полный payload от AmoCRM
  
  CONSTRAINT main_product_sales_deal_id_unique UNIQUE (deal_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_main_product_utm_source ON main_product_sales (utm_source);
CREATE INDEX IF NOT EXISTS idx_main_product_sale_date ON main_product_sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_main_product_pipeline ON main_product_sales (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_main_product_customer ON main_product_sales (email, phone);

COMMENT ON TABLE main_product_sales IS 'Продажи основного продукта Integrator Flagman (490K KZT) из AmoCRM воронки 10350882';
COMMENT ON COLUMN main_product_sales.utm_source IS 'Таргетолог: kenesary, traf4, arystan, muha';
COMMENT ON COLUMN main_product_sales.deal_id IS 'ID сделки из AmoCRM (уникальный)';

-- ════════════════════════════════════════════════════════════════════════
-- 2. EXPRESS COURSE SALES (5,000 KZT)
-- ════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS express_course_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- AmoCRM данные
  deal_id BIGINT NOT NULL UNIQUE,
  pipeline_id BIGINT, -- 10350882 (воронка экспресс-курса)
  status_id BIGINT,
  
  -- Финансы
  amount DECIMAL(12,2) NOT NULL DEFAULT 5000.00, -- обычно 5000 KZT
  currency VARCHAR(3) DEFAULT 'KZT',
  
  -- UTM метки
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  
  -- Контакты
  phone VARCHAR(50),
  email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_id BIGINT,
  
  -- Timestamps
  sale_date TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  -- Метаданные
  webhook_received_at TIMESTAMP,
  raw_data JSONB,
  
  CONSTRAINT express_course_sales_deal_id_unique UNIQUE (deal_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_express_utm_source ON express_course_sales (utm_source);
CREATE INDEX IF NOT EXISTS idx_express_sale_date ON express_course_sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_express_pipeline ON express_course_sales (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_express_customer ON express_course_sales (email, phone);

COMMENT ON TABLE express_course_sales IS 'Продажи экспресс-курса (5K KZT) из AmoCRM';

-- ════════════════════════════════════════════════════════════════════════
-- 3. RLS POLICIES (Row Level Security)
-- ════════════════════════════════════════════════════════════════════════
-- Разрешаем backend service role полный доступ
ALTER TABLE main_product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE express_course_sales ENABLE ROW LEVEL SECURITY;

-- Service role может всё
CREATE POLICY "Service role full access - main product" 
ON main_product_sales
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access - express" 
ON express_course_sales
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Anon может только читать (для фронтенда)
CREATE POLICY "Public read access - main product" 
ON main_product_sales
FOR SELECT 
TO anon
USING (true);

CREATE POLICY "Public read access - express" 
ON express_course_sales
FOR SELECT 
TO anon
USING (true);

-- ════════════════════════════════════════════════════════════════════════
-- 4. TRIGGERS для updated_at
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_main_product_sales_updated_at 
BEFORE UPDATE ON main_product_sales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_express_course_sales_updated_at 
BEFORE UPDATE ON express_course_sales
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════
-- ✅ МИГРАЦИЯ ЗАВЕРШЕНА
-- ════════════════════════════════════════════════════════════════════════
-- Проверка:
-- SELECT * FROM main_product_sales LIMIT 1;
-- SELECT * FROM express_course_sales LIMIT 1;

