-- ========================================
-- ПРОВЕРКА: Структура таблиц для видео
-- Цель: Убедиться что все правильно для видео
-- ========================================

-- ========================================
-- 1. СТРУКТУРА video_content
-- ========================================

SELECT 
    '🎥 СТРУКТУРА VIDEO_CONTENT' as info,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'video_content'
ORDER BY ordinal_position;

-- ОЖИДАЕМ:
-- id (uuid)
-- lesson_id (uuid) ← связь с lessons
-- r2_object_key (text) ← ключ в Cloudflare R2
-- r2_bucket_name (varchar) ← 'onai-academy-videos'
-- filename (text)
-- file_size_bytes (bigint)
-- duration_seconds (integer) ← длительность видео
-- resolution (varchar) ← '1080p', '720p'
-- format (varchar) ← 'mp4'
-- upload_status (varchar) ← 'completed', 'pending'
-- transcoding_status (varchar)
-- created_at, updated_at

-- ========================================
-- 2. СТРУКТУРА video_analytics
-- ========================================

SELECT 
    '📊 СТРУКТУРА VIDEO_ANALYTICS' as info,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'video_analytics'
ORDER BY ordinal_position;

-- ОЖИДАЕМ:
-- id (uuid)
-- user_id (uuid) ← СВЯЗЬ С ПРОФИЛЕМ!
-- video_id (uuid) ← связь с video_content
-- session_id (uuid) ← группировка событий
-- event_type (varchar) ← 'play', 'pause', 'seek', 'complete'
-- timestamp_seconds (integer) ← момент события
-- created_at

-- ========================================
-- 3. СТРУКТУРА student_progress
-- ========================================

SELECT 
    '📈 СТРУКТУРА STUDENT_PROGRESS' as info,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_progress'
ORDER BY ordinal_position;

-- ОЖИДАЕМ:
-- id (uuid)
-- user_id (uuid) ← СВЯЗЬ С ПРОФИЛЕМ!
-- lesson_id (uuid) ← связь с lessons
-- video_progress (integer) ← процент 0-100
-- watch_time_seconds (integer) ← СКОЛЬКО СМОТРЕЛ
-- last_position_seconds (integer) ← где остановился
-- is_completed (boolean)
-- first_watched_at
-- last_watched_at
-- completed_at

-- ========================================
-- 4. FOREIGN KEYS ДЛЯ ВИДЕО
-- ========================================

SELECT
    '🔗 FOREIGN KEYS ДЛЯ ВИДЕО' as info,
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('video_content', 'video_analytics', 'student_progress')
ORDER BY tc.table_name;

-- ========================================
-- 5. ПРОВЕРКА ДАННЫХ
-- ========================================

SELECT 
    '📊 КОЛИЧЕСТВО ДАННЫХ' as info,
    (SELECT COUNT(*) FROM public.video_content) as video_content_count,
    (SELECT COUNT(*) FROM public.video_analytics) as video_analytics_count,
    (SELECT COUNT(*) FROM public.student_progress) as student_progress_count;

-- ========================================
-- 6. ПРОВЕРКА ДУБЛИКАТОВ ТАБЛИЦ
-- ========================================

-- Проверяем дублирующиеся таблицы прогресса
SELECT 
    '⚠️ ТАБЛИЦЫ ПРОГРЕССА (ДУБЛИКАТЫ?)' as warning,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = tablename) as columns_count
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename = 'progress' 
    OR tablename = 'user_progress' 
    OR tablename = 'student_progress'
)
ORDER BY tablename;

-- Проверяем дублирующиеся таблицы достижений
SELECT 
    '⚠️ ТАБЛИЦЫ ДОСТИЖЕНИЙ (ДУБЛИКАТЫ?)' as warning,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = tablename) as columns_count
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename = 'achievements' 
    OR tablename = 'user_achievements' 
    OR tablename = 'achievement_history'
)
ORDER BY tablename;

-- Проверяем дублирующиеся таблицы пользователей
SELECT 
    '⚠️ ТАБЛИЦЫ ПОЛЬЗОВАТЕЛЕЙ (ДУБЛИКАТЫ?)' as warning,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = tablename) as columns_count
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename = 'users' 
    OR tablename = 'profiles' 
    OR tablename = 'student_profiles'
)
ORDER BY tablename;

-- Проверяем дублирующиеся таблицы курсов студентов
SELECT 
    '⚠️ ТАБЛИЦЫ КУРСОВ СТУДЕНТОВ (ДУБЛИКАТЫ?)' as warning,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = tablename) as columns_count
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename = 'user_courses' 
    OR tablename = 'student_courses'
)
ORDER BY tablename;

-- Проверяем дублирующиеся таблицы статистики
SELECT 
    '⚠️ ТАБЛИЦЫ СТАТИСТИКИ (ДУБЛИКАТЫ?)' as warning,
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = tablename) as columns_count
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename = 'user_stats' 
    OR tablename = 'user_statistics'
)
ORDER BY tablename;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

/*
📋 ЧТО ПРОВЕРИТЬ:

1. video_content должен иметь r2_object_key, r2_bucket_name, duration_seconds
2. video_analytics должен иметь user_id, event_type, timestamp_seconds
3. student_progress должен иметь user_id, watch_time_seconds, video_progress
4. Foreign keys должны быть с CASCADE DELETE
5. Если есть дубликаты таблиц - решить какую оставить
*/

