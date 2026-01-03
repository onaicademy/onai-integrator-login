# 🎯 SQL для интеграции "3х дневник" - Готов к выполнению через MCP

**Дата:** 2026-01-02
**Целевая БД:** Landing Supabase (`xikaiavwqinamgolmtcy`)

---

## ✅ SQL для выполнения через MCP агента

### Migration 010: Create challenge3d_sales table

```sql
-- ============================================================================
-- TABLE: challenge3d_sales для продукта "3х дневник"
-- Pipelines: 9777626 (КЦ), 9430994 (ОП)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.challenge3d_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- AmoCRM identification
  deal_id BIGINT UNIQUE NOT NULL,
  pipeline_id BIGINT NOT NULL,
  status_id BIGINT NOT NULL,

  -- Sales data
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'KZT',
  package_type TEXT,
  prepaid BOOLEAN DEFAULT FALSE,

  -- UTM Attribution
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  utm_referrer TEXT,
  fbclid VARCHAR(255),

  -- Customer data
  customer_id BIGINT,
  customer_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Original UTM (phone-based attribution)
  original_utm_source VARCHAR(100),
  original_utm_campaign VARCHAR(255),
  original_utm_medium VARCHAR(100),
  attribution_source VARCHAR(50),
  related_deal_id BIGINT,

  -- Timestamps
  sale_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  -- Raw data for debugging
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_deal_id ON public.challenge3d_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_pipeline ON public.challenge3d_sales(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_status ON public.challenge3d_sales(status_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_source ON public.challenge3d_sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_campaign ON public.challenge3d_sales(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_phone ON public.challenge3d_sales(phone);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_email ON public.challenge3d_sales(email);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_date ON public.challenge3d_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_prepaid ON public.challenge3d_sales(prepaid);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_package_type ON public.challenge3d_sales(package_type);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_created_at ON public.challenge3d_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_date ON public.challenge3d_sales(utm_source, sale_date DESC);

-- Trigger for auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_challenge3d_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_challenge3d_sales_updated_at
  BEFORE UPDATE ON public.challenge3d_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge3d_sales_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.challenge3d_sales IS 'Sales tracking for 3х дневник (3-Day Challenge) product from AmoCRM pipelines 9777626 and 9430994';
COMMENT ON COLUMN public.challenge3d_sales.deal_id IS 'Unique AmoCRM lead/deal ID';
COMMENT ON COLUMN public.challenge3d_sales.pipeline_id IS 'AmoCRM pipeline ID: 9777626 (КЦ) or 9430994 (ОП)';
COMMENT ON COLUMN public.challenge3d_sales.prepaid IS 'true = prepayment (предоплата), false = full payment (полная оплата)';
COMMENT ON COLUMN public.challenge3d_sales.package_type IS 'Type of package/offer variant for 3-Day Challenge';
COMMENT ON COLUMN public.challenge3d_sales.attribution_source IS 'How original UTM was determined: current_deal, related_deal, or fallback';
COMMENT ON COLUMN public.challenge3d_sales.raw_data IS 'Full webhook payload from AmoCRM for debugging';
```

---

## 🔍 Проверка после выполнения

Выполните эти запросы для проверки:

```sql
-- 1. Проверить структуру таблицы
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'challenge3d_sales'
ORDER BY ordinal_position;

-- 2. Проверить индексы
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'challenge3d_sales';

-- 3. Проверить доступ к таблице
SELECT COUNT(*) FROM public.challenge3d_sales;
```

**Ожидаемый результат:** Таблица создана, 12 индексов, COUNT(*) = 0

---

## 📋 Информация для MCP агента

- **Database:** Landing Supabase
- **Project ID:** xikaiavwqinamgolmtcy
- **URL:** https://xikaiavwqinamgolmtcy.supabase.co
- **Schema:** public
- **Table:** challenge3d_sales

---

## ✅ После выполнения SQL

После успешного создания таблицы можно переходить к:
1. ✅ Созданию webhook endpoint
2. ✅ Скрипту исторической выгрузки
3. ✅ Интеграции в Traffic Dashboard
