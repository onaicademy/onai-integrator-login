# 📊 SUPABASE SETUP - Таблица для отчетов

## 🎯 ЧТО НУЖНО СДЕЛАТЬ:

### 1. Открой Supabase Tripwire
```
https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto
```

### 2. Перейди в SQL Editor
```
SQL Editor → New Query
```

### 3. Скопируй и выполни SQL:
```sql
-- 📊 Таблица для сохранения ежедневных отчетов Traffic Analytics
CREATE TABLE IF NOT EXISTS daily_traffic_reports (
  id BIGSERIAL PRIMARY KEY,
  report_date DATE NOT NULL UNIQUE,
  
  -- 💰 ОБЩИЕ ПОКАЗАТЕЛИ
  total_spend DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  total_roas DECIMAL(10, 4) NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_ctr DECIMAL(10, 4) NOT NULL DEFAULT 0,
  
  -- 💱 КУРС ВАЛЮТ
  usd_to_kzt_rate DECIMAL(10, 4) NOT NULL DEFAULT 470,
  
  -- 📊 ДАННЫЕ ПО КОМАНДАМ (JSON)
  teams_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- 🏷️ ТОП UTM/CTR/ВИДЕО (JSON)
  top_utm_sales JSONB DEFAULT '[]'::jsonb,
  top_campaigns_ctr JSONB DEFAULT '[]'::jsonb,
  top_campaigns_video JSONB DEFAULT '[]'::jsonb,
  
  -- 📝 МЕТАДАННЫЕ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_daily_traffic_reports_date 
ON daily_traffic_reports(report_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_traffic_reports_date_range 
ON daily_traffic_reports(report_date);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_daily_traffic_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trigger_update_daily_traffic_reports_updated_at 
ON daily_traffic_reports;

CREATE TRIGGER trigger_update_daily_traffic_reports_updated_at
  BEFORE UPDATE ON daily_traffic_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_traffic_reports_updated_at();
```

### 4. Нажми "Run" (или F5)

### 5. Проверь что таблица создана:
```
Tables → daily_traffic_reports
```

---

## ✅ КАК ЭТО РАБОТАЕТ:

### Автоматическое сохранение:
1. Открываешь календарь
2. Выбираешь дату (например 18.12.2024)
3. **Автоматически сохраняется в БД!**

### API Endpoints:

#### Сохранить отчет:
```bash
POST /api/traffic/reports/save
{
  "report_date": "2024-12-18",
  "total_spend": 1276.00,
  "total_revenue": 90000,
  "total_sales": 18,
  ...
}
```

#### Получить за дату:
```bash
GET /api/traffic/reports/date/2024-12-18
```

#### Получить за диапазон:
```bash
GET /api/traffic/reports/range?start=2024-12-01&end=2024-12-18
```

Ответ:
```json
{
  "period_start": "2024-12-01",
  "period_end": "2024-12-18",
  "days_count": 18,
  "total_spend": 22968.00,
  "total_revenue": 1620000,
  "total_sales": 324,
  "period_roas": 1.5,
  "reports": [...]
}
```

#### Анализ по командам:
```bash
GET /api/traffic/reports/teams-analysis?start=2024-12-01&end=2024-12-18
```

Ответ:
```json
{
  "teams": [
    {
      "team": "Kenesary",
      "total_spend": 5702.00,
      "total_revenue": 595000,
      "total_sales": 119,
      "period_roas": 2.1,
      "period_cpa": 47.92,
      "days_active": 18
    },
    ...
  ]
}
```

---

## 📊 ПРИМЕРЫ ЗАПРОСОВ:

### 1. Суммировать за декабрь:
```sql
SELECT 
  SUM(total_spend) as total_spend,
  SUM(total_revenue) as total_revenue,
  SUM(total_sales) as total_sales,
  CASE 
    WHEN SUM(total_spend * usd_to_kzt_rate) > 0 
    THEN SUM(total_revenue) / SUM(total_spend * usd_to_kzt_rate)
    ELSE 0 
  END as period_roas
FROM daily_traffic_reports
WHERE report_date BETWEEN '2024-12-01' AND '2024-12-31';
```

### 2. Анализ по командам:
```sql
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
WHERE report_date BETWEEN '2024-12-01' AND '2024-12-31'
GROUP BY team_data->>'team'
ORDER BY period_roas DESC;
```

---

## 🚀 ГОТОВО!

После создания таблицы:
1. ✅ Выбирай любую дату в календаре
2. ✅ Отчет автоматически сохраняется
3. ✅ Можно поднять историю за любой период
4. ✅ Считать окупаемость по диапазонам

---

**Полный SQL файл:** `backend/database/tripwire_daily_reports.sql`
