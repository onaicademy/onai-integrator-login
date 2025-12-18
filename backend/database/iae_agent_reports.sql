-- 🤖 IAE Agent Reports Table
-- Intelligence Analytics Engine - система мониторинга и проверки данных
-- Supabase Tripwire: https://pjmvxecykysfrzppdcto.supabase.co

CREATE TABLE IF NOT EXISTS iae_agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'daily', 'current', 'monthly', 'health_check', 'manual'
  
  -- 📊 Overall status
  status VARCHAR(20) NOT NULL, -- 'healthy', 'warning', 'critical'
  overall_health_score INT, -- 0-100
  
  -- 🔌 Data sources health
  amocrm_status JSONB, -- {healthy: bool, token_valid: bool, last_sync: timestamp, issues: []}
  facebook_ads_status JSONB, -- {healthy: bool, token_valid: bool, last_sync: timestamp, issues: []}
  database_status JSONB, -- {healthy: bool, last_sync: timestamp, issues: []}
  
  -- ✅ Data validation results
  data_quality JSONB, -- {completeness: %, accuracy: %, consistency: %}
  anomalies JSONB[], -- [{type, severity, description, metric, value}]
  
  -- 💰 Metrics summary
  metrics_summary JSONB, -- {spend, revenue, sales, roas, impressions, clicks, ctr}
  
  -- 🤖 AI analysis
  ai_insights TEXT, -- Groq AI generated insights
  ai_recommendations TEXT[], -- Array of recommendations
  ai_risks TEXT[], -- Predicted risks
  
  -- 📱 Telegram delivery
  telegram_sent BOOLEAN DEFAULT FALSE,
  telegram_sent_at TIMESTAMPTZ,
  telegram_chat_ids INT[],
  telegram_message_id INT,
  
  -- 📝 Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_iae_reports_date ON iae_agent_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_iae_reports_type ON iae_agent_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_iae_reports_status ON iae_agent_reports(status);
CREATE INDEX IF NOT EXISTS idx_iae_reports_created ON iae_agent_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iae_reports_health_score ON iae_agent_reports(overall_health_score);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_iae_agent_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_iae_agent_reports_updated_at ON iae_agent_reports;
CREATE TRIGGER trigger_update_iae_agent_reports_updated_at
  BEFORE UPDATE ON iae_agent_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_iae_agent_reports_updated_at();

-- Комментарии к таблице
COMMENT ON TABLE iae_agent_reports IS 'IAE Agent (Intelligence Analytics Engine) - отчеты о состоянии систем аналитики';
COMMENT ON COLUMN iae_agent_reports.report_type IS 'Тип отчета: daily, current, monthly, health_check, manual';
COMMENT ON COLUMN iae_agent_reports.status IS 'Общий статус: healthy, warning, critical';
COMMENT ON COLUMN iae_agent_reports.overall_health_score IS 'Оценка здоровья системы 0-100';
COMMENT ON COLUMN iae_agent_reports.amocrm_status IS 'Статус AmoCRM API и валидность токена';
COMMENT ON COLUMN iae_agent_reports.facebook_ads_status IS 'Статус Facebook Ads API и валидность токена';
COMMENT ON COLUMN iae_agent_reports.data_quality IS 'Качество данных: полнота, точность, консистентность';
COMMENT ON COLUMN iae_agent_reports.anomalies IS 'Массив обнаруженных аномалий в данных';
COMMENT ON COLUMN iae_agent_reports.ai_insights IS 'AI анализ состояния систем от Groq';
COMMENT ON COLUMN iae_agent_reports.ai_recommendations IS 'AI рекомендации по улучшению';

-- Примеры использования:

-- 1. Вставка отчета health check
/*
INSERT INTO iae_agent_reports (
  report_date,
  report_type,
  status,
  overall_health_score,
  amocrm_status,
  facebook_ads_status,
  database_status,
  data_quality,
  metrics_summary,
  ai_insights,
  ai_recommendations
) VALUES (
  CURRENT_DATE,
  'health_check',
  'healthy',
  95,
  '{"healthy": true, "token_valid": true, "last_sync": "2024-12-18T10:00:00Z", "issues": []}'::jsonb,
  '{"healthy": true, "token_valid": true, "last_sync": "2024-12-18T10:00:00Z", "issues": []}'::jsonb,
  '{"healthy": true, "last_sync": "2024-12-18T10:00:00Z", "issues": []}'::jsonb,
  '{"completeness": 98, "accuracy": 95, "consistency": 97}'::jsonb,
  '{"spend": 1276.00, "revenue": 90000, "sales": 18, "roas": 0.14}'::jsonb,
  'Все системы работают корректно. Данные синхронизированы без расхождений.',
  ARRAY['Продолжить мониторинг ROAS', 'Оптимизировать кампании с низким CTR']
);
*/

-- 2. Получить последний health check
/*
SELECT * FROM iae_agent_reports
WHERE report_type = 'health_check'
ORDER BY created_at DESC
LIMIT 1;
*/

-- 3. Получить все отчеты за день
/*
SELECT * FROM iae_agent_reports
WHERE report_date = CURRENT_DATE
ORDER BY created_at DESC;
*/

-- 4. Статистика по health score за неделю
/*
SELECT 
  report_date,
  report_type,
  overall_health_score,
  status,
  (ai_recommendations IS NOT NULL AND array_length(ai_recommendations, 1) > 0) as has_recommendations
FROM iae_agent_reports
WHERE report_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY report_date DESC, created_at DESC;
*/

-- 5. Найти все критические проблемы
/*
SELECT 
  report_date,
  report_type,
  status,
  overall_health_score,
  anomalies,
  ai_insights
FROM iae_agent_reports
WHERE status = 'critical'
ORDER BY created_at DESC
LIMIT 20;
*/
