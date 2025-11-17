-- ===============================================
-- 🔥 ПЕРЕСОЗДАНИЕ ТАБЛИЦЫ video_analytics
-- ===============================================
-- Выполни ВЕСЬ SQL за раз в Supabase SQL Editor

-- ===============================================
-- ШАГ 1: Удалить существующую таблицу
-- ===============================================
DROP TABLE IF EXISTS video_analytics CASCADE;

-- ===============================================
-- ШАГ 2: Создать таблицу с ПРАВИЛЬНЫМИ типами
-- ===============================================
CREATE TABLE video_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'progress', 'complete', 'playback_rate_change', 'volume_change', 'quality_change')),
  position_seconds NUMERIC,
  playback_rate NUMERIC,
  progress_percent NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- ШАГ 3: Создать индексы
-- ===============================================
CREATE INDEX idx_video_analytics_lesson_id ON video_analytics(lesson_id);
CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id);
CREATE INDEX idx_video_analytics_session_id ON video_analytics(session_id);
CREATE INDEX idx_video_analytics_created_at ON video_analytics(created_at DESC);

-- ===============================================
-- ШАГ 4: Включить RLS
-- ===============================================
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- ШАГ 5: Создать RLS политики
-- ===============================================

-- Все могут писать analytics (даже анонимы)
CREATE POLICY "Anyone can insert video analytics"
  ON video_analytics
  FOR INSERT
  WITH CHECK (true);

-- Пользователи видят только свои данные
CREATE POLICY "Users can view own analytics"
  ON video_analytics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Админы видят всё
CREATE POLICY "Admins can view all analytics"
  ON video_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ===============================================
-- ШАГ 6: Обновить schema cache (КРИТИЧНО!)
-- ===============================================
NOTIFY pgrst, 'reload schema';

-- ===============================================
-- ШАГ 7: ПРОВЕРКА - Показать структуру таблицы
-- ===============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'video_analytics'
ORDER BY ordinal_position;

-- ===============================================
-- ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
-- ===============================================
-- column_name       | data_type                   | is_nullable | column_default
-- ------------------+-----------------------------+-------------+---------------
-- id                | bigint                      | NO          | nextval(...)
-- user_id           | uuid                        | YES         | NULL
-- lesson_id         | bigint                      | NO          | NULL
-- session_id        | text                        | NO          | NULL
-- event_type        | text                        | NO          | NULL
-- position_seconds  | numeric                     | YES         | NULL
-- playback_rate     | numeric                     | YES         | NULL
-- progress_percent  | numeric                     | YES         | NULL
-- created_at        | timestamp with time zone    | YES         | now()

-- ===============================================
-- ШАГ 8: ТЕСТ - Вставить тестовое событие
-- ===============================================
INSERT INTO video_analytics (
  user_id,
  lesson_id,
  session_id,
  event_type,
  position_seconds,
  playback_rate,
  progress_percent
) VALUES (
  NULL, -- user_id может быть NULL
  20, -- lesson_id как ЧИСЛО (не UUID!)
  'test-session-123',
  'play',
  0,
  1.0,
  0
) RETURNING *;

-- ===============================================
-- Должно вернуть:
-- ===============================================
-- id | user_id | lesson_id | session_id        | event_type | position_seconds | playback_rate | progress_percent | created_at
-- 1  | NULL    | 20        | test-session-123  | play       | 0                | 1.0           | 0                | 2025-...

-- ===============================================
-- ✅ ГОТОВО!
-- ===============================================

