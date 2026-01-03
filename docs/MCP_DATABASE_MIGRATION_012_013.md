# MCP Database Migration Prompt - Migrations 012 & 013

## Цель
Применить миграции 012 и 013 для исправления критических ошибок в админ-панели Traffic Dashboard.

## База данных
**Traffic Supabase**: `oetodaexnjcunklkdlkv.supabase.co`

## Проблемы которые решают миграции

1. **"Could not find the table 'public.traffic_weekly_plans'"** - таблица не существует для генерации планов
2. **500 ошибки на /api/utm-analytics/***  - view'ы для аналитики не созданы
3. **Хардкод команд** - нет таблицы traffic_teams

---

## Migration 012: Traffic Weekly Plans and Teams

### Шаг 1: Создать таблицу traffic_teams

```sql
CREATE TABLE IF NOT EXISTS public.traffic_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  description TEXT,
  leader_user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  color VARCHAR(7) DEFAULT '#00FF88',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### Шаг 2: Создать таблицу traffic_weekly_plans

```sql
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
```

### Шаг 3: Создать индексы

```sql
CREATE INDEX IF NOT EXISTS idx_traffic_teams_active ON traffic_teams(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_traffic_teams_name ON traffic_teams(name);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_team ON traffic_weekly_plans(team_name);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_week ON traffic_weekly_plans(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_status ON traffic_weekly_plans(status);
```

### Шаг 4: Seed teams from existing users

```sql
INSERT INTO traffic_teams (name, display_name, is_active)
SELECT DISTINCT team_name, team_name, TRUE
FROM traffic_users
WHERE team_name IS NOT NULL AND team_name != '' AND is_active = TRUE
ON CONFLICT (name) DO NOTHING;
```

### Шаг 5: Создать trigger для updated_at

```sql
CREATE OR REPLACE FUNCTION public.update_traffic_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_traffic_teams_updated_at
  BEFORE UPDATE ON public.traffic_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

CREATE TRIGGER trigger_update_traffic_weekly_plans_updated_at
  BEFORE UPDATE ON public.traffic_weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();
```

---

## Migration 013: UTM Analytics Views

### Шаг 1: Создать view all_sales_tracking

```sql
CREATE OR REPLACE VIEW all_sales_tracking AS
SELECT
  id, deal_id, amount as sale_amount, 'express' as funnel_type,
  utm_source, utm_campaign, utm_medium, utm_content, utm_term,
  customer_name, phone, email, NULL as targetologist,
  sale_date, created_at
FROM traffic_sales WHERE amount > 0
UNION ALL
SELECT
  id, deal_id, amount as sale_amount, 'challenge3d' as funnel_type,
  COALESCE(original_utm_source, utm_source), COALESCE(original_utm_campaign, utm_campaign),
  COALESCE(original_utm_medium, utm_medium), utm_content, utm_term,
  customer_name, phone, email, NULL as targetologist,
  sale_date, created_at
FROM challenge3d_sales WHERE amount > 0 AND prepaid = FALSE;
```

### Шаг 2: Создать view top_utm_sources

```sql
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
```

### Шаг 3: Создать view top_utm_campaigns

```sql
CREATE OR REPLACE VIEW top_utm_campaigns AS
SELECT
  utm_source, utm_campaign,
  COUNT(*) as total_sales,
  SUM(sale_amount) as total_revenue
FROM all_sales_tracking
WHERE utm_campaign IS NOT NULL AND utm_campaign != ''
GROUP BY utm_source, utm_campaign
ORDER BY total_revenue DESC;
```

### Шаг 4: Создать view sales_without_utm

```sql
CREATE OR REPLACE VIEW sales_without_utm AS
SELECT id, deal_id, sale_amount, funnel_type, customer_name, phone, email, sale_date, created_at
FROM all_sales_tracking
WHERE (utm_source IS NULL OR utm_source = '') AND (utm_campaign IS NULL OR utm_campaign = '')
ORDER BY sale_date DESC;
```

### Шаг 5: Создать таблицу traffic_ad_account_bindings

```sql
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
```

---

## Верификация

После выполнения проверить:

```sql
-- Проверить traffic_teams
SELECT COUNT(*) FROM traffic_teams;

-- Проверить traffic_weekly_plans
SELECT COUNT(*) FROM traffic_weekly_plans;

-- Проверить all_sales_tracking view
SELECT COUNT(*) FROM all_sales_tracking LIMIT 1;

-- Проверить top_utm_sources view
SELECT * FROM top_utm_sources LIMIT 5;
```

---

## После миграции

1. Задеплоить обновленный backend:
   ```bash
   npm run build:backend && ./deploy.sh
   ```

2. Перезапустить сервис:
   ```bash
   ssh root@207.154.231.30 "cd /var/www/onai-integrator-login && pm2 restart all"
   ```

3. Проверить endpoints:
   - `/api/utm-analytics/health`
   - `/api/utm-analytics/overview`
   - `/api/traffic-admin/teams`
