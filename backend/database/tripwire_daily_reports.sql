-- 📊 Таблица для сохранения ежедневных отчетов Traffic Analytics
-- Supabase Tripwire: https://pjmvxecykysfrzppdcto.supabase.co

CREATE TABLE IF NOT EXISTS daily_traffic_reports (
  id BIGSERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE, -- Дата отчета (уникальная)
  
  -- 💰 ОБЩИЕ ПОКАЗАТЕЛИ
  total_spend DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Затраты (USD)
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Доход (KZT)
  total_sales INTEGER NOT NULL DEFAULT 0, -- Продажи (шт)
  total_roas DECIMAL(10, 4) NOT NULL DEFAULT 0, -- ROAS
  total_impressions INTEGER NOT NULL DEFAULT 0, -- Показы
  total_clicks INTEGER NOT NULL DEFAULT 0, -- Клики
  total_ctr DECIMAL(10, 4) NOT NULL DEFAULT 0, -- CTR (%)
  
  -- 💱 КУРС ВАЛЮТ
  usd_to_kzt_rate DECIMAL(10, 4) NOT NULL DEFAULT 470, -- Курс USD/KZT
  
  -- 📊 ДАННЫЕ ПО КОМАНДАМ (JSON)
  teams_data JSONB NOT NULL DEFAULT '[]'::jsonb, -- Массив данных по командам
  
  -- 🏷️ ТОП UTM/CTR/ВИДЕО (JSON)
  top_utm_sales JSONB DEFAULT '[]'::jsonb, -- Топ UTM по продажам
  top_campaigns_ctr JSONB DEFAULT '[]'::jsonb, -- Топ кампаний по CTR
  top_campaigns_video JSONB DEFAULT '[]'::jsonb, -- Топ кампаний по видео
  
  -- 📝 МЕТАДАННЫЕ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого поиска по дате
CREATE INDEX IF NOT EXISTS idx_daily_traffic_reports_date ON daily_traffic_reports(report_date DESC);

-- Индекс для поиска по диапазону дат
CREATE INDEX IF NOT EXISTS idx_daily_traffic_reports_date_range ON daily_traffic_reports(report_date);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_daily_traffic_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_daily_traffic_reports_updated_at ON daily_traffic_reports;
CREATE TRIGGER trigger_update_daily_traffic_reports_updated_at
  BEFORE UPDATE ON daily_traffic_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_traffic_reports_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE daily_traffic_reports IS 'Ежедневные отчеты Traffic Analytics для анализа окупаемости';
COMMENT ON COLUMN daily_traffic_reports.report_date IS 'Дата отчета (уникальная)';
COMMENT ON COLUMN daily_traffic_reports.teams_data IS 'JSON массив с данными по каждой команде (team, spend, revenue, roas, sales, cpa, ctr, impressions, clicks)';
COMMENT ON COLUMN daily_traffic_reports.top_utm_sales IS 'Топ-10 UTM меток по продажам';
COMMENT ON COLUMN daily_traffic_reports.top_campaigns_ctr IS 'Топ-10 кампаний по CTR';
COMMENT ON COLUMN daily_traffic_reports.top_campaigns_video IS 'Топ-10 кампаний по видео-вовлеченности';

-- Примеры использования:

-- 1. Вставка отчета за день
/*
INSERT INTO daily_traffic_reports (
  report_date, 
  total_spend, 
  total_revenue, 
  total_sales, 
  total_roas,
  teams_data
) VALUES (
  '2024-12-18',
  1276.00,
  90000,
  18,
  0.14,
  '[
    {"team": "Kenesary", "spend": 316.81, "revenue": 35000, "roas": 0.21, "sales": 7},
    {"team": "Arystan", "spend": 309.55, "revenue": 25000, "roas": 0.16, "sales": 5}
  ]'::jsonb
)
ON CONFLICT (report_date) DO UPDATE SET
  total_spend = EXCLUDED.total_spend,
  total_revenue = EXCLUDED.total_revenue,
  total_sales = EXCLUDED.total_sales,
  total_roas = EXCLUDED.total_roas,
  teams_data = EXCLUDED.teams_data,
  updated_at = NOW();
*/

-- 2. Получить отчет за конкретную дату
/*
SELECT * FROM daily_traffic_reports
WHERE report_date = '2024-12-18';
*/

-- 3. Получить отчеты за диапазон дат
/*
SELECT * FROM daily_traffic_reports
WHERE report_date BETWEEN '2024-12-01' AND '2024-12-18'
ORDER BY report_date DESC;
*/

-- 4. Суммировать данные за период
/*
SELECT 
  MIN(report_date) as period_start,
  MAX(report_date) as period_end,
  SUM(total_spend) as total_spend,
  SUM(total_revenue) as total_revenue,
  SUM(total_sales) as total_sales,
  CASE 
    WHEN SUM(total_spend * usd_to_kzt_rate) > 0 
    THEN SUM(total_revenue) / SUM(total_spend * usd_to_kzt_rate)
    ELSE 0 
  END as period_roas,
  COUNT(*) as days_count
FROM daily_traffic_reports
WHERE report_date BETWEEN '2024-12-01' AND '2024-12-18';
*/

-- 5. Анализ окупаемости по командам за период
/*
SELECT 
  team_data->>'team' as team,
  SUM((team_data->>'spend')::numeric) as total_spend,
  SUM((team_data->>'revenue')::numeric) as total_revenue,
  SUM((team_data->>'sales')::integer) as total_sales,
  CASE 
    WHEN SUM((team_data->>'spend')::numeric) > 0 
    THEN SUM((team_data->>'revenue')::numeric) / SUM((team_data->>'spend')::numeric)
    ELSE 0 
  END as period_roas
FROM daily_traffic_reports,
     jsonb_array_elements(teams_data) as team_data
WHERE report_date BETWEEN '2024-12-01' AND '2024-12-18'
GROUP BY team_data->>'team'
ORDER BY period_roas DESC;
*/
