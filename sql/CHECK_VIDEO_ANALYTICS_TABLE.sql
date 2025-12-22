-- ===============================================
-- 🔍 ПРОВЕРКА ТАБЛИЦЫ video_analytics
-- ===============================================
-- Выполни в Supabase SQL Editor

-- ===============================================
-- 1. ПРОВЕРКА: Какие колонки есть в таблице?
-- ===============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'video_analytics'
ORDER BY ordinal_position;

-- ===============================================
-- ОЖИДАЕТСЯ:
-- ===============================================
-- column_name       | data_type | is_nullable
-- ------------------+-----------+-------------
-- id                | bigint    | NO
-- user_id           | uuid      | YES
-- lesson_id         | bigint    | YES
-- session_id        | text      | NO
-- event_type        | text      | NO
-- position_seconds  | numeric   | YES
-- playback_rate     | numeric   | YES
-- progress_percent  | numeric   | YES
-- created_at        | timestamp | YES
--
-- ❌ video_id НЕ ДОЛЖЕН БЫТЬ В СПИСКЕ!
-- ✅ progress_percent ДОЛЖЕН БЫТЬ В СПИСКЕ!

-- ===============================================
-- 2. ЕСЛИ video_id ЕЩЕ ЕСТЬ - УДАЛИ ЕГО:
-- ===============================================
-- ALTER TABLE video_analytics DROP COLUMN IF EXISTS video_id;

-- ===============================================
-- 3. ОБНОВИ SCHEMA CACHE (ОБЯЗАТЕЛЬНО!):
-- ===============================================
-- NOTIFY pgrst, 'reload schema';

-- ===============================================
-- 4. ПЕРЕЗАПУСТИ SUPABASE PROJECT:
-- ===============================================
-- Открой: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/settings/general
-- Прокрути вниз
-- Нажми: Pause project
-- Подожди 10 секунд
-- Нажми: Resume project
-- Подожди ~1 минуту

-- ===============================================
-- 5. ПОВТОРИ ПРОВЕРКУ #1
-- ===============================================
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'video_analytics';

