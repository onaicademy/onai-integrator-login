-- ====================================
-- ПОЛНАЯ ПРОВЕРКА СТРУКТУРЫ ВСЕХ ТАБЛИЦ
-- ====================================

-- 1. COURSES
SELECT 
    'courses' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'courses'
    AND column_name IN ('id', 'instructor_id')
ORDER BY ordinal_position;

-- 2. MODULES
SELECT 
    'modules' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'modules'
    AND column_name IN ('id', 'course_id')
ORDER BY ordinal_position;

-- 3. LESSONS
SELECT 
    'lessons' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'lessons'
    AND column_name IN ('id', 'module_id')
ORDER BY ordinal_position;

-- 4. VIDEO_CONTENT
SELECT 
    'video_content' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'video_content'
    AND column_name IN ('id', 'lesson_id')
ORDER BY ordinal_position;

-- 5. LESSON_MATERIALS
SELECT 
    'lesson_materials' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'lesson_materials'
    AND column_name IN ('id', 'lesson_id')
ORDER BY ordinal_position;

