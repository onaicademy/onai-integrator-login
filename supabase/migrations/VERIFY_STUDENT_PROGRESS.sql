-- ========================================
-- ПРОВЕРКА: Таблица student_progress
-- ========================================

-- 1. Проверяем существование таблицы
SELECT 
    '✅ ТАБЛИЦА STUDENT_PROGRESS' as check_name,
    COUNT(*) as table_exists
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'student_progress';

-- 2. Проверяем важные колонки
SELECT 
    '✅ ВАЖНЫЕ КОЛОНКИ' as check_name,
    COUNT(CASE WHEN column_name = 'user_id' THEN 1 END) as has_user_id,
    COUNT(CASE WHEN column_name = 'lesson_id' THEN 1 END) as has_lesson_id,
    COUNT(CASE WHEN column_name = 'video_progress_percent' THEN 1 END) as has_video_progress,
    COUNT(CASE WHEN column_name = 'watch_time_seconds' THEN 1 END) as has_watch_time,
    COUNT(CASE WHEN column_name = 'last_position_seconds' THEN 1 END) as has_last_position,
    COUNT(CASE WHEN column_name = 'is_completed' THEN 1 END) as has_is_completed,
    COUNT(CASE WHEN column_name = 'completed_at' THEN 1 END) as has_completed_at,
    COUNT(CASE WHEN column_name = 'times_watched' THEN 1 END) as has_times_watched,
    COUNT(CASE WHEN column_name = 'average_speed' THEN 1 END) as has_average_speed
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_progress';

-- 3. Проверяем foreign keys
SELECT 
    '✅ FOREIGN KEYS' as check_name,
    COUNT(CASE WHEN constraint_name LIKE '%lesson%' THEN 1 END) as has_lesson_fk,
    COUNT(CASE WHEN constraint_name LIKE '%user%' THEN 1 END) as has_user_fk
FROM information_schema.table_constraints
WHERE table_schema = 'public' 
AND table_name = 'student_progress'
AND constraint_type = 'FOREIGN KEY';

-- 4. Статистика данных
SELECT 
    '📊 СТАТИСТИКА ДАННЫХ' as info,
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT lesson_id) as unique_lessons,
    COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_lessons,
    AVG(video_progress_percent)::INTEGER as avg_progress_percent,
    SUM(watch_time_seconds)::INTEGER as total_watch_time_sec,
    AVG(times_watched)::INTEGER as avg_times_watched,
    AVG(average_speed)::NUMERIC(3,1) as avg_playback_speed
FROM public.student_progress;

-- 5. Проверяем индексы
SELECT 
    '✅ ИНДЕКСЫ' as check_name,
    COUNT(CASE WHEN indexname LIKE '%user_id%' THEN 1 END) as has_user_index,
    COUNT(CASE WHEN indexname LIKE '%lesson_id%' THEN 1 END) as has_lesson_index
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename = 'student_progress';

-- ========================================
-- ПОЛНАЯ СВОДКА (одна строка)
-- ========================================

WITH table_check AS (
    SELECT COUNT(*) as exists_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'student_progress'
),
column_check AS (
    SELECT 
        COUNT(CASE WHEN column_name = 'user_id' THEN 1 END) as has_user_id,
        COUNT(CASE WHEN column_name = 'watch_time_seconds' THEN 1 END) as has_watch_time,
        COUNT(CASE WHEN column_name = 'video_progress_percent' THEN 1 END) as has_video_progress,
        COUNT(CASE WHEN column_name = 'is_completed' THEN 1 END) as has_is_completed,
        COUNT(CASE WHEN column_name = 'times_watched' THEN 1 END) as has_times_watched,
        COUNT(CASE WHEN column_name = 'average_speed' THEN 1 END) as has_avg_speed
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'student_progress'
),
data_stats AS (
    SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT lesson_id) as unique_lessons
    FROM public.student_progress
)
SELECT 
    '✅ STUDENT_PROGRESS ГОТОВА' as status,
    tc.exists_count as "table_exists",
    cc.has_user_id as "✓ user_id",
    cc.has_watch_time as "✓ watch_time",
    cc.has_video_progress as "✓ video_progress_percent",
    cc.has_is_completed as "✓ is_completed",
    cc.has_times_watched as "✓ times_watched",
    cc.has_avg_speed as "✓ avg_speed",
    ds.total_records as "📊 records",
    ds.unique_users as "unique_users",
    ds.unique_lessons as "unique_lessons"
FROM table_check tc, column_check cc, data_stats ds;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

