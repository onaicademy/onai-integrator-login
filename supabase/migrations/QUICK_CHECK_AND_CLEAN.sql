-- ========================================
-- БЫСТРАЯ ПРОВЕРКА СТРУКТУРЫ БД + ОЧИСТКА ТЕСТОВЫХ ДАННЫХ
-- ========================================

-- ========================================
-- 1. ПРОВЕРКА: Какие таблицы существуют
-- ========================================

SELECT 
    '📊 СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'courses',
  'modules', 
  'lessons',
  'video_content',
  'lesson_materials',
  'student_progress',
  'module_progress',
  'video_analytics',
  'video_segments_analytics',
  'student_learning_metrics',
  'course_health_metrics',
  'mentor_motivation_log'
)
ORDER BY table_name;

-- ========================================
-- 2. ПРОВЕРКА: Структура таблицы courses
-- ========================================

SELECT 
    '🏫 СТРУКТУРА COURSES' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'courses'
ORDER BY ordinal_position;

-- ========================================
-- 3. ПРОВЕРКА: Структура таблицы lessons
-- ========================================

SELECT 
    '📚 СТРУКТУРА LESSONS' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'lessons'
ORDER BY ordinal_position;

-- ========================================
-- 4. ПРОВЕРКА: Структура таблицы video_content
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

-- ========================================
-- 5. ПРОВЕРКА: Foreign Key constraints
-- ========================================

SELECT
    '🔗 FOREIGN KEYS' as info,
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
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress')
ORDER BY tc.table_name;

-- ========================================
-- 6. ПРОВЕРКА: Текущие данные (количество)
-- ========================================

SELECT 
    '📈 ТЕКУЩИЕ ДАННЫЕ' as info,
    (SELECT COUNT(*) FROM public.courses) as courses_count,
    (SELECT COUNT(*) FROM public.modules) as modules_count,
    (SELECT COUNT(*) FROM public.lessons) as lessons_count,
    (SELECT COUNT(*) FROM public.video_content) as videos_count,
    (SELECT COUNT(*) FROM public.lesson_materials) as materials_count,
    (SELECT COUNT(*) FROM public.student_progress) as progress_count;

-- ========================================
-- 7. ОЧИСТКА: Удалить тестовые данные
-- ========================================

-- ⚠️ ВНИМАНИЕ: Раскомментируй блок ниже ТОЛЬКО если хочешь удалить ВСЕ данные!

/*
DO $$ 
BEGIN
    -- Удаляем тестовый курс 'python-basics' (CASCADE удалит всё связанное)
    DELETE FROM public.courses WHERE slug = 'python-basics';
    
    -- Удаляем все остальные данные (если есть)
    DELETE FROM public.courses;
    
    RAISE NOTICE '✅ Все тестовые данные удалены';
END $$;
*/

-- ========================================
-- 8. ПРОВЕРКА: После очистки
-- ========================================

-- Запусти эту команду ПОСЛЕ раскомментирования блока выше:

/*
SELECT 
    '🧹 ПОСЛЕ ОЧИСТКИ' as info,
    (SELECT COUNT(*) FROM public.courses) as courses_count,
    (SELECT COUNT(*) FROM public.modules) as modules_count,
    (SELECT COUNT(*) FROM public.lessons) as lessons_count,
    (SELECT COUNT(*) FROM public.video_content) as videos_count;
*/

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

