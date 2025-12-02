-- ========================================
-- БЫСТРАЯ ПРОВЕРКА: Таблицы аналитики существуют?
-- ========================================

-- 1. Проверяем какие таблицы аналитики есть
SELECT 
    '📊 ТАБЛИЦЫ АНАЛИТИКИ' as check_name,
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ СУЩЕСТВУЕТ'
        ELSE '❌ НЕТ'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'student_progress',
    'video_analytics',
    'module_progress',
    'video_segments_analytics',
    'student_learning_metrics',
    'course_health_metrics',
    'mentor_motivation_log'
)
ORDER BY table_name;

-- ========================================
-- 2. ПРОВЕРКА: Есть ли user_id в student_progress?
-- ========================================

SELECT 
    '🔍 USER_ID в STUDENT_PROGRESS' as check_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'user_id' THEN '✅ ЕСТЬ СВЯЗЬ С ПРОФИЛЕМ!'
        ELSE '📊 Другие колонки'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_progress'
AND column_name IN ('id', 'user_id', 'lesson_id', 'video_progress', 'watch_time_seconds', 'last_position_seconds', 'is_completed')
ORDER BY ordinal_position;

-- ========================================
-- 3. ПРОВЕРКА: Есть ли user_id в module_progress?
-- ========================================

SELECT 
    '🔍 USER_ID в MODULE_PROGRESS' as check_name,
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'user_id' THEN '✅ ЕСТЬ СВЯЗЬ С ПРОФИЛЕМ!'
        ELSE '📊 Другие колонки'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'module_progress'
AND column_name IN ('id', 'user_id', 'module_id', 'completed_lessons', 'total_lessons', 'progress_percentage')
ORDER BY ordinal_position;

-- ========================================
-- 4. ПРОВЕРКА: Есть ли video_analytics?
-- ========================================

SELECT 
    '🔍 VIDEO_ANALYTICS' as check_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'video_analytics'
        ) THEN '✅ ТАБЛИЦА СУЩЕСТВУЕТ'
        ELSE '❌ ТАБЛИЦА НЕ СОЗДАНА'
    END as status;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

