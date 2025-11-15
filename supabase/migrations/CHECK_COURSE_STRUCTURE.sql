-- ========================================
-- ПРОВЕРКА СТРУКТУРЫ БД: Образовательная платформа
-- ========================================
-- Используй этот скрипт для проверки что всё создано корректно

-- ========================================
-- 1. ПРОВЕРКА ТАБЛИЦ
-- ========================================
SELECT 
    '📊 ТАБЛИЦЫ' as category,
    table_name,
    CASE 
        WHEN table_name IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress') 
        THEN '✅ Существует' 
        ELSE '❌ Отсутствует' 
    END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')
ORDER BY table_name;

-- ========================================
-- 2. ПРОВЕРКА КОЛОНОК В COURSES
-- ========================================
SELECT 
    '📋 COURSES COLUMNS' as category,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'courses'
ORDER BY ordinal_position;

-- ========================================
-- 3. ПРОВЕРКА КОЛОНОК В LESSONS
-- ========================================
SELECT 
    '📋 LESSONS COLUMNS' as category,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'lessons'
ORDER BY ordinal_position;

-- ========================================
-- 4. ПРОВЕРКА ИНДЕКСОВ
-- ========================================
SELECT 
    '🔍 ИНДЕКСЫ' as category,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')
ORDER BY tablename, indexname;

-- ========================================
-- 5. ПРОВЕРКА ТРИГГЕРОВ
-- ========================================
SELECT 
    '⚡ ТРИГГЕРЫ' as category,
    event_object_table as table_name,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 6. ПРОВЕРКА ФУНКЦИЙ
-- ========================================
SELECT 
    '🔧 ФУНКЦИИ' as category,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_updated_at_column', 'calculate_module_progress', 'get_course_structure', 'get_student_course_progress')
ORDER BY routine_name;

-- ========================================
-- 7. ПРОВЕРКА RLS ПОЛИТИК
-- ========================================
SELECT 
    '🔒 RLS ПОЛИТИКИ' as category,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')
ORDER BY tablename, policyname;

-- ========================================
-- 8. ПРОВЕРКА FOREIGN KEYS
-- ========================================
SELECT 
    '🔗 FOREIGN KEYS' as category,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 9. КРАТКАЯ СТАТИСТИКА
-- ========================================
SELECT 
    '📈 СТАТИСТИКА' as category,
    'Всего таблиц' as metric,
    COUNT(*)::text as value
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

SELECT 
    '📈 СТАТИСТИКА' as category,
    'Всего индексов' as metric,
    COUNT(*)::text as value
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

SELECT 
    '📈 СТАТИСТИКА' as category,
    'Всего триггеров' as metric,
    COUNT(*)::text as value
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

SELECT 
    '📈 СТАТИСТИКА' as category,
    'Всего RLS политик' as metric,
    COUNT(*)::text as value
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

SELECT 
    '📈 СТАТИСТИКА' as category,
    'Всего функций' as metric,
    COUNT(*)::text as value
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_updated_at_column', 'calculate_module_progress', 'get_course_structure', 'get_student_course_progress');

-- ========================================
-- 10. ПРОВЕРКА СПЕЦИФИЧНЫХ КОЛОНОК
-- ========================================
SELECT 
    '✅ ВАЖНЫЕ КОЛОНКИ' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'slug') 
        THEN '✅ courses.slug'
        ELSE '❌ courses.slug отсутствует'
    END as check_result

UNION ALL

SELECT 
    '✅ ВАЖНЫЕ КОЛОНКИ' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'order_index') 
        THEN '✅ courses.order_index'
        ELSE '❌ courses.order_index отсутствует'
    END as check_result

UNION ALL

SELECT 
    '✅ ВАЖНЫЕ КОЛОНКИ' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'lesson_type') 
        THEN '✅ lessons.lesson_type'
        ELSE '❌ lessons.lesson_type отсутствует'
    END as check_result

UNION ALL

SELECT 
    '✅ ВАЖНЫЕ КОЛОНКИ' as category,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_content' AND column_name = 'r2_object_key') 
        THEN '✅ video_content.r2_object_key'
        ELSE '❌ video_content.r2_object_key отсутствует'
    END as check_result;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

