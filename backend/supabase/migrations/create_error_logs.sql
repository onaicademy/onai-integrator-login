-- ============================================
-- 🚨 Таблица для логирования ошибок
-- ============================================

-- Создание таблицы error_logs
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Основная информация
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL CHECK (category IN ('amocrm', 'telegram', 'database', 'queue', 'api', 'validation', 'network', 'authentication', 'unknown')),
    message TEXT NOT NULL,
    stack TEXT,
    
    -- Контекст ошибки
    context JSONB DEFAULT '{}',
    
    -- Метаданные
    environment TEXT NOT NULL DEFAULT 'development',
    resolved BOOLEAN DEFAULT false,
    
    -- Временные метки
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON public.error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_category ON public.error_logs(category);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON public.error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON public.error_logs(resolved);
CREATE INDEX IF NOT EXISTS idx_error_logs_environment ON public.error_logs(environment);

-- Индекс для JSON поиска по контексту
CREATE INDEX IF NOT EXISTS idx_error_logs_context ON public.error_logs USING GIN(context);

-- Комментарии
COMMENT ON TABLE public.error_logs IS 'Система логирования ошибок для мониторинга и дебага';
COMMENT ON COLUMN public.error_logs.severity IS 'Уровень критичности: low, medium, high, critical';
COMMENT ON COLUMN public.error_logs.category IS 'Категория ошибки: telegram, amocrm, database, etc.';
COMMENT ON COLUMN public.error_logs.context IS 'Дополнительный контекст ошибки (userId, chatId, endpoint, etc.)';
COMMENT ON COLUMN public.error_logs.resolved IS 'Флаг - ошибка исправлена или нет';

-- RLS политики
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Политика: service_role имеет полный доступ
CREATE POLICY "service_role_all_error_logs" ON public.error_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Политика: Только чтение для authenticated пользователей
CREATE POLICY "authenticated_read_error_logs" ON public.error_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Функция для автоматической очистки старых логов (опционально)
CREATE OR REPLACE FUNCTION public.cleanup_old_error_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.error_logs
    WHERE timestamp < now() - (days_to_keep || ' days')::INTERVAL
    AND resolved = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_old_error_logs IS 'Удаляет старые решённые ошибки (по умолчанию старше 30 дней)';

-- Функция для получения статистики ошибок
CREATE OR REPLACE FUNCTION public.get_error_stats(since_timestamp TIMESTAMPTZ)
RETURNS TABLE(
    total BIGINT,
    by_severity JSONB,
    by_category JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total,
        jsonb_object_agg(severity, severity_count) as by_severity,
        jsonb_object_agg(category, category_count) as by_category
    FROM (
        SELECT
            severity,
            category,
            COUNT(*) as severity_count,
            COUNT(*) as category_count
        FROM public.error_logs
        WHERE timestamp >= since_timestamp
        GROUP BY severity, category
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_error_stats IS 'Получить статистику ошибок за период';

-- Grants
GRANT SELECT, INSERT, UPDATE ON public.error_logs TO service_role;
GRANT SELECT ON public.error_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_error_logs TO service_role;
GRANT EXECUTE ON FUNCTION public.get_error_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.get_error_stats TO authenticated;
