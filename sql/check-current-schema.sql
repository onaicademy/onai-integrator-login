-- Проверка текущей структуры БД

-- 1. USERS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- 2. COURSES
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'courses'
ORDER BY ordinal_position;

-- 3. MODULES
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'modules'
ORDER BY ordinal_position;

-- 4. LESSONS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lessons'
ORDER BY ordinal_position;

-- 5. LESSON_MATERIALS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lesson_materials'
ORDER BY ordinal_position;

-- 6. STUDENT_PROGRESS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'student_progress'
ORDER BY ordinal_position;

-- 7. ACHIEVEMENTS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'achievements'
ORDER BY ordinal_position;

-- 8. USER_ACHIEVEMENTS
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_achievements'
ORDER BY ordinal_position;

-- 9. USER_ACTIVITY
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_activity'
ORDER BY ordinal_position;

