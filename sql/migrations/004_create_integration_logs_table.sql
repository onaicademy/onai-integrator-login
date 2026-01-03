-- Migration: Create integration_logs table for tracking all API integrations
-- Database: Landing BD (xikaiavwqinamgolmtcy)
-- Created: 2025-12-30
-- Purpose: Centralized logging for all external integrations (AmoCRM, Resend, Telegram, Mobizon, Whapi)

-- ==========================================
-- 1. CREATE TABLE integration_logs
-- ==========================================

CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL, -- 'amocrm', 'resend', 'telegram', 'mobizon', 'whapi'
  action TEXT NOT NULL, -- 'sync_lead', 'send_email', 'send_sms', 'send_telegram'
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'retrying')),
  related_entity_type TEXT, -- 'lead', 'student', 'tripwire_user'
  related_entity_id UUID, -- ID сущности
  request_payload JSONB, -- Тело запроса
  response_payload JSONB, -- Ответ API
  error_message TEXT, -- Текст ошибки
  error_code TEXT, -- Код ошибки
  duration_ms INTEGER, -- Длительность в мс
  retry_count INTEGER DEFAULT 0, -- Количество повторов
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CREATE INDEXES
-- ==========================================

-- Индекс для поиска по сервису
CREATE INDEX IF NOT EXISTS idx_integration_logs_service_name
ON integration_logs(service_name);

-- Индекс для поиска по статусу
CREATE INDEX IF NOT EXISTS idx_integration_logs_status
ON integration_logs(status);

-- Индекс для поиска по времени создания
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at
ON integration_logs(created_at DESC);

-- Индекс для поиска по связанной сущности
CREATE INDEX IF NOT EXISTS idx_integration_logs_related_entity
ON integration_logs(related_entity_type, related_entity_id);

-- Частичный индекс для failed логов (быстрый поиск ошибок)
CREATE INDEX IF NOT EXISTS idx_integration_logs_failed
ON integration_logs(service_name, created_at DESC)
WHERE status = 'failed';

-- Комбинированный индекс для дашборда
CREATE INDEX IF NOT EXISTS idx_integration_logs_dashboard
ON integration_logs(service_name, status, created_at DESC);

-- ==========================================
-- 3. CREATE VIEWS FOR ANALYTICS
-- ==========================================

-- Статистика по часам (последние 24 часа)
CREATE OR REPLACE VIEW integration_stats_hourly AS
SELECT
  service_name,
  action,
  status,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY service_name, action, status, DATE_TRUNC('hour', created_at);

-- Статистика по дням (последние 30 дней)
CREATE OR REPLACE VIEW integration_stats_daily AS
SELECT
  service_name,
  action,
  status,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as count,
  AVG(duration_ms) as avg_duration_ms,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count
FROM integration_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY service_name, action, status, DATE_TRUNC('day', created_at);

-- ==========================================
-- 4. CREATE RLS POLICIES
-- ==========================================

-- Enable Row Level Security
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to integration_logs"
ON integration_logs
FOR ALL
USING (auth.role() = 'service_role');

-- Authenticated users can view logs
CREATE POLICY "Authenticated users can view integration_logs"
ON integration_logs
FOR SELECT
USING (auth.role() = 'authenticated');

-- ==========================================
-- 5. CREATE CLEANUP FUNCTION
-- ==========================================

-- Function to cleanup old logs (for scheduled cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_integration_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete successful logs older than 90 days
  DELETE FROM integration_logs
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND status = 'success';

  -- Delete all logs older than 180 days
  DELETE FROM integration_logs
  WHERE created_at < NOW() - INTERVAL '180 days';
END;
$$;

-- ==========================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE integration_logs IS 'Centralized logging table for all external API integrations';
COMMENT ON COLUMN integration_logs.service_name IS 'Service identifier: amocrm, resend, telegram, mobizon, whapi';
COMMENT ON COLUMN integration_logs.action IS 'Action performed: sync_lead, send_email, send_sms, send_telegram, etc';
COMMENT ON COLUMN integration_logs.status IS 'Request status: success, failed, pending, retrying';
COMMENT ON COLUMN integration_logs.related_entity_type IS 'Type of related entity: lead, student, tripwire_user';
COMMENT ON COLUMN integration_logs.related_entity_id IS 'UUID of the related entity';
COMMENT ON COLUMN integration_logs.request_payload IS 'Full request body sent to the API (JSONB)';
COMMENT ON COLUMN integration_logs.response_payload IS 'Full response received from the API (JSONB)';
COMMENT ON COLUMN integration_logs.error_message IS 'Error message if request failed';
COMMENT ON COLUMN integration_logs.error_code IS 'Error code if request failed';
COMMENT ON COLUMN integration_logs.duration_ms IS 'Request duration in milliseconds';
COMMENT ON COLUMN integration_logs.retry_count IS 'Number of retry attempts';

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- To verify the table was created:
-- SELECT COUNT(*) FROM integration_logs;
-- SELECT * FROM integration_stats_hourly LIMIT 5;
-- SELECT * FROM integration_stats_daily LIMIT 5;

-- To test inserting a log:
-- INSERT INTO integration_logs (service_name, action, status, duration_ms)
-- VALUES ('amocrm', 'sync_lead', 'success', 150);
