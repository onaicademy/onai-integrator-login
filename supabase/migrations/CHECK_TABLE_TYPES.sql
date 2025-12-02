-- ====================================
-- ПРОВЕРКА ТИПОВ КОЛОНОК В ТАБЛИЦАХ
-- ====================================

SELECT 
    'courses' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'courses'
    AND column_name IN ('id')
ORDER BY ordinal_position;

SELECT 
    'modules' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'modules'
    AND column_name IN ('id', 'course_id')
ORDER BY ordinal_position;

SELECT 
    'lessons' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'lessons'
    AND column_name IN ('id', 'module_id')
ORDER BY ordinal_position;

