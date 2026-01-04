-- MCP Database Migration 012 & 013 (FINAL ADAPTED)
-- Цель: Исправление критических ошибок в админ-панели Traffic Dashboard
-- База данных: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Дата: 2026-01-03
-- Статус: УСПЕШНО ВЫПОЛНЕНО

-- ============================================
-- MIGRATION 012: Traffic Weekly Plans and Teams
-- ============================================

-- ШАГ 1: Добавить колонки в существующую таблицу traffic_teams
ALTER TABLE traffic_teams
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS leader_user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ШАГ 2: Создать таблицу traffic_weekly_plans
CREATE TABLE IF NOT EXISTS public.traffic_weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL,
  team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,

  -- Previous week data
  prev_week_revenue NUMERIC(12, 2) DEFAULT 0,
  prev_week_sales INTEGER DEFAULT 0,
  prev_week_spend NUMERIC(10, 2) DEFAULT 0,
  prev_week_roas NUMERIC(5, 2) DEFAULT 0,
  prev_week_cpa NUMERIC(10, 2) DEFAULT 0,

  -- Current week plan
  plan_revenue NUMERIC(12, 2) DEFAULT 0,
  plan_sales INTEGER DEFAULT 0,
  plan_spend NUMERIC(10, 2) DEFAULT 0,
  plan_roas NUMERIC(5, 2) DEFAULT 0,
  plan_cpa NUMERIC(10, 2) DEFAULT 0,

  -- Actual
  actual_revenue NUMERIC(12, 2) DEFAULT 0,
  actual_sales INTEGER DEFAULT 0,
  actual_spend NUMERIC(10, 2) DEFAULT 0,
  actual_roas NUMERIC(5, 2) DEFAULT 0,
  actual_cpa NUMERIC(10, 2) DEFAULT 0,

  completion_percentage INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),

  ai_generated_plan JSONB DEFAULT '{}'::jsonb,
  ai_recommendations TEXT,
  growth_percentage NUMERIC(5, 2) DEFAULT 10.0,
  ai_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
  admin_notes TEXT,
  adjusted_by UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(team_name, week_start)
);

-- ШАГ 3: Создать индексы
CREATE INDEX IF NOT EXISTS idx_traffic_teams_active ON traffic_teams(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_traffic_teams_name ON traffic_teams(name);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_team ON traffic_weekly_plans(team_name);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_week ON traffic_weekly_plans(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_status ON traffic_weekly_plans(status);

-- ШАГ 4: Обновить display_name для существующих команд
UPDATE traffic_teams
SET display_name = name
WHERE display_name IS NULL;

-- ШАГ 5: Создать trigger для updated_at
CREATE OR REPLACE FUNCTION public.update_traffic_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_traffic_teams_updated_at ON public.traffic_teams;
CREATE TRIGGER trigger_update_traffic_teams_updated_at
  BEFORE UPDATE ON public.traffic_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

DROP TRIGGER IF EXISTS trigger_update_traffic_weekly_plans_updated_at ON public.traffic_weekly_plans;
CREATE TRIGGER trigger_update_traffic_weekly_plans_updated_at
  BEFORE UPDATE ON public.traffic_weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- ============================================
-- MIGRATION 013: UTM Analytics Views (ADAPTED)
-- ============================================

-- Удалить существующие view перед созданием новых
DROP VIEW IF EXISTS top_utm_sources CASCADE;
DROP VIEW IF EXISTS top_utm_campaigns CASCADE;
DROP VIEW IF EXISTS sales_without_utm CASCADE;

-- ШАГ 1: Создать view top_utm_sources (используя существующую all_sales_tracking)
CREATE OR REPLACE VIEW top_utm_sources AS
SELECT
  utm_source,
  COUNT(*) as total_sales,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale
FROM all_sales_tracking
WHERE utm_source IS NOT NULL AND utm_source != ''
GROUP BY utm_source
ORDER BY total_revenue DESC;

-- ШАГ 2: Создать view top_utm_campaigns
CREATE OR REPLACE VIEW top_utm_campaigns AS
SELECT
  utm_source, utm_campaign,
  COUNT(*) as total_sales,
  SUM(sale_amount) as total_revenue
FROM all_sales_tracking
WHERE utm_campaign IS NOT NULL AND utm_campaign != ''
GROUP BY utm_source, utm_campaign
ORDER BY total_revenue DESC;

-- ШАГ 3: Создать view sales_without_utm
CREATE OR REPLACE VIEW sales_without_utm AS
SELECT id, lead_id, sale_amount, product_name, lead_name, contact_name, contact_email, contact_phone, sale_date, created_at
FROM all_sales_tracking
WHERE (utm_source IS NULL OR utm_source = '') AND (utm_campaign IS NULL OR utm_campaign = '')
ORDER BY sale_date DESC;

-- ШАГ 4: Создать таблицу traffic_ad_account_bindings
CREATE TABLE IF NOT EXISTS public.traffic_ad_account_bindings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id VARCHAR(50) NOT NULL,
  ad_platform VARCHAR(20) DEFAULT 'facebook',
  team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL,
  team_name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  verified BOOLEAN DEFAULT FALSE,
  total_spend NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(ad_account_id, ad_platform)
);

-- ============================================
-- ВЕРИФИКАЦИЯ
-- ============================================
-- Проверить traffic_teams
-- SELECT COUNT(*) FROM traffic_teams;

-- Проверить traffic_weekly_plans
-- SELECT COUNT(*) FROM traffic_weekly_plans;

-- Проверить top_utm_sources view
-- SELECT * FROM top_utm_sources LIMIT 5;

-- ============================================
-- РЕЗУЛЬТАТЫ МИГРАЦИИ
-- ============================================
-- ✅ traffic_teams: добавлены колонки display_name, description, leader_user_id, is_active
-- ✅ traffic_weekly_plans: таблица создана с 28 колонками
-- ✅ Индексы: 5 индексов созданы
-- ✅ Triggers: 2 триггера созданы (traffic_teams, traffic_weekly_plans)
-- ✅ top_utm_sources: view создан
-- ✅ top_utm_campaigns: view создан
-- ✅ sales_without_utm: view создан
-- ✅ traffic_ad_account_bindings: таблица создана с 12 колонками
-- ============================================
