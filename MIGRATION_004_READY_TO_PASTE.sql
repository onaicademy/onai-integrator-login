-- ==========================================
-- MIGRATION 004: integration_logs
-- DATABASE: Landing BD (xikaiavwqinamgolmtcy)
-- DATE: 2025-12-30
-- ==========================================
-- ИНСТРУКЦИЯ:
-- 1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new
-- 2. Скопируй ВЕСЬ этот файл
-- 3. Вставь в SQL Editor
-- 4. Нажми RUN
-- ==========================================

-- 1. CREATE TABLE
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

-- 2. CREATE INDEXES (6 штук)
CREATE INDEX IF NOT EXISTS idx_integration_logs_service_name ON integration_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_logs_related_entity ON integration_logs(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_failed ON integration_logs(service_name, created_at DESC) WHERE status = 'failed';
CREATE INDEX IF NOT EXISTS idx_integration_logs_dashboard ON integration_logs(service_name, status, created_at DESC);

-- 3. CREATE VIEWS (2 штуки)
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

-- 4. ENABLE RLS + CREATE POLICIES (2 штуки)
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to integration_logs"
ON integration_logs
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view integration_logs"
ON integration_logs
FOR SELECT
USING (auth.role() = 'authenticated');

-- 5. CREATE CLEANUP FUNCTION
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

-- 6. ADD DOCUMENTATION COMMENTS
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
-- ПРОВЕРКА (выполни после миграции)
-- ==========================================

-- Проверить таблицу
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'integration_logs' ORDER BY ordinal_position;
-- Ожидается: 14 строк

-- Проверить индексы
SELECT indexname FROM pg_indexes WHERE tablename = 'integration_logs';
-- Ожидается: 6 индексов

-- Проверить views
SELECT table_name FROM information_schema.views WHERE table_name LIKE 'integration_stats%';
-- Ожидается: 2 views

-- Проверить функцию
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'cleanup_old_integration_logs';
-- Ожидается: 1 функция

-- Проверить RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'integration_logs';
-- Ожидается: rowsecurity = true

-- Проверить политики
SELECT policyname FROM pg_policies WHERE tablename = 'integration_logs';
-- Ожидается: 2 политики

-- ==========================================
-- ТЕСТ (выполни после проверки)
-- ==========================================

-- Тестовая вставка
INSERT INTO integration_logs (service_name, action, status, duration_ms)
VALUES ('test', 'test_action', 'success', 100)
RETURNING id, service_name, action, status, created_at;

-- Проверка
SELECT * FROM integration_logs WHERE service_name = 'test';

-- Удаление теста
DELETE FROM integration_logs WHERE service_name = 'test';

-- Финальная проверка
SELECT COUNT(*) as should_be_zero FROM integration_logs WHERE service_name = 'test';

-- ==========================================
-- ✅ МИГРАЦИЯ ЗАВЕРШЕНА!
-- ==========================================
