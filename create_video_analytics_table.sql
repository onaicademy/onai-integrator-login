-- ===============================================
-- 📊 СОЗДАНИЕ ТАБЛИЦЫ video_analytics
-- ===============================================
-- Выполни в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql

-- ===============================================
-- Удалить таблицу если существует (ОСТОРОЖНО!)
-- ===============================================
-- DROP TABLE IF EXISTS video_analytics CASCADE;

-- ===============================================
-- Создать таблицу video_analytics
-- ===============================================
CREATE TABLE IF NOT EXISTS video_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lesson_id BIGINT REFERENCES lessons(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'progress', 'complete', 'playback_rate_change', 'volume_change', 'quality_change')),
  position_seconds NUMERIC,
  playback_rate NUMERIC,
  progress_percent NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- Создать индексы для быстрого поиска
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_video_analytics_lesson_id 
  ON video_analytics(lesson_id);

CREATE INDEX IF NOT EXISTS idx_video_analytics_user_id 
  ON video_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_video_analytics_session_id 
  ON video_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_video_analytics_created_at 
  ON video_analytics(created_at DESC);

-- ===============================================
-- Включить Row Level Security (RLS)
-- ===============================================
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- Создать RLS политики
-- ===============================================

-- Политика 1: Все могут писать analytics (даже анонимы)
CREATE POLICY "Anyone can insert video analytics"
  ON video_analytics
  FOR INSERT
  WITH CHECK (true);

-- Политика 2: Пользователи видят только свои данные
CREATE POLICY "Users can view own analytics"
  ON video_analytics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Политика 3: Админы видят всё
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
-- Проверка что таблица создана
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
-- Тестовый INSERT (опционально)
-- ===============================================
-- INSERT INTO video_analytics (
--   user_id,
--   lesson_id,
--   session_id,
--   event_type,
--   position_seconds,
--   playback_rate,
--   progress_percent
-- ) VALUES (
--   NULL, -- user_id может быть NULL для анонимов
--   1, -- lesson_id
--   'test-session-' || gen_random_uuid()::text,
--   'play',
--   10.5,
--   1.0,
--   25.0
-- );

-- ===============================================
-- Проверка данных
-- ===============================================
-- SELECT * FROM video_analytics ORDER BY created_at DESC LIMIT 10;

-- ===============================================
-- ✅ ГОТОВО!
-- ===============================================
-- После выполнения этого SQL:
-- 1. Перезапусти backend: npm run dev
-- 2. Открой урок с видео
-- 3. Нажми Play
-- 4. Проверь Backend Console - должно быть 200 OK
-- ===============================================

