-- ========================================
-- БЫСТРАЯ ПРОВЕРКА: Всё ли на месте? ✅
-- ========================================

-- Проверяем все 8 таблиц
WITH expected_tables AS (
    SELECT unnest(ARRAY['courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress']) AS table_name
),
existing_tables AS (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
SELECT 
    '📊 ТАБЛИЦЫ' as check_type,
    CASE 
        WHEN COUNT(DISTINCT et.table_name) = 8 THEN '✅ ВСЕ 8 ТАБЛИЦ СОЗДАНЫ'
        ELSE '❌ НАЙДЕНО ТОЛЬКО ' || COUNT(DISTINCT et.table_name)::text || ' ИЗ 8 ТАБЛИЦ'
    END as status,
    STRING_AGG(
        CASE 
            WHEN ext.table_name IS NOT NULL THEN '✅ ' || et.table_name
            ELSE '❌ ' || et.table_name || ' (отсутствует)'
        END, 
        ', ' 
        ORDER BY et.table_name
    ) as details
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name

UNION ALL

-- Проверяем важные колонки в courses
SELECT 
    '📋 COURSES' as check_type,
    CASE 
        WHEN COUNT(*) >= 11 THEN '✅ ВСЕ КОЛОНКИ НА МЕСТЕ (' || COUNT(*)::text || ')'
        ELSE '⚠️ НАЙДЕНО ' || COUNT(*)::text || ' КОЛОНОК (ожидалось минимум 11)'
    END as status,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as details
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'courses'

UNION ALL

-- Проверяем важные колонки в lessons
SELECT 
    '📋 LESSONS' as check_type,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ ВСЕ КОЛОНКИ НА МЕСТЕ (' || COUNT(*)::text || ')'
        ELSE '⚠️ НАЙДЕНО ' || COUNT(*)::text || ' КОЛОНОК (ожидалось минимум 10)'
    END as status,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as details
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lessons'

UNION ALL

-- Проверяем индексы
SELECT 
    '🔍 ИНДЕКСЫ' as check_type,
    CASE 
        WHEN COUNT(*) >= 18 THEN '✅ МИНИМУМ 18 ИНДЕКСОВ СОЗДАНО (' || COUNT(*)::text || ')'
        ELSE '⚠️ НАЙДЕНО ' || COUNT(*)::text || ' ИНДЕКСОВ (ожидалось минимум 18)'
    END as status,
    COUNT(*)::text || ' индексов на таблицах курсов' as details
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

-- Проверяем триггеры
SELECT 
    '⚡ ТРИГГЕРЫ' as check_type,
    CASE 
        WHEN COUNT(*) >= 8 THEN '✅ ВСЕ 8 ТРИГГЕРОВ СОЗДАНЫ'
        ELSE '⚠️ НАЙДЕНО ' || COUNT(*)::text || ' ТРИГГЕРОВ (ожидалось 8)'
    END as status,
    STRING_AGG(DISTINCT trigger_name, ', ') as details
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

-- Проверяем функции
SELECT 
    '🔧 ФУНКЦИИ' as check_type,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ ВСЕ 4 ФУНКЦИИ СОЗДАНЫ'
        ELSE '⚠️ НАЙДЕНО ' || COUNT(*)::text || ' ФУНКЦИЙ (ожидалось 4)'
    END as status,
    STRING_AGG(routine_name, ', ' ORDER BY routine_name) as details
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_updated_at_column', 'calculate_module_progress', 'get_course_structure', 'get_student_course_progress')

UNION ALL

-- Проверяем RLS политики
SELECT 
    '🔒 RLS' as check_type,
    CASE 
        WHEN COUNT(*) >= 18 THEN '✅ МИНИМУМ 18 RLS ПОЛИТИК СОЗДАНО (' || COUNT(*)::text || ')'
        ELSE '⚠️ НАЙДЕНО ' || COUNT(*)::text || ' ПОЛИТИК (ожидалось минимум 18)'
    END as status,
    COUNT(*)::text || ' RLS политик активно' as details
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('courses', 'modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress', 'video_analytics', 'module_progress')

UNION ALL

-- Проверяем критичные колонки
SELECT 
    '✅ КЛЮЧЕВЫЕ ПОЛЯ' as check_type,
    CASE 
        WHEN 
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'slug') AND
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'order_index') AND
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'lesson_type') AND
            EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_content' AND column_name = 'r2_object_key')
        THEN '✅ ВСЕ КРИТИЧНЫЕ ПОЛЯ НА МЕСТЕ'
        ELSE '❌ ОТСУТСТВУЮТ ВАЖНЫЕ КОЛОНКИ'
    END as status,
    'courses.slug, courses.order_index, lessons.lesson_type, video_content.r2_object_key' as details;

