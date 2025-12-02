-- ========================================
-- ПРОВЕРКА: Аналитика привязана к профилю студента
-- ========================================

-- ========================================
-- 1. СТРУКТУРА student_progress (привязка к user)
-- ========================================

SELECT 
    '📊 СТРУКТУРА STUDENT_PROGRESS (прогресс по урокам)' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_progress'
ORDER BY ordinal_position;

-- ОЖИДАЕМЫЕ КОЛОНКИ:
-- user_id (uuid) ← СВЯЗЬ С ПРОФИЛЕМ!
-- lesson_id (uuid)
-- video_progress (integer) ← процент просмотра 0-100
-- watch_time_seconds (integer) ← сколько секунд смотрел
-- last_position_seconds (integer) ← где остановился
-- is_completed (boolean) ← завершил урок?
-- last_watched_at (timestamp)
-- completed_at (timestamp)

-- ========================================
-- 2. СТРУКТУРА video_analytics (детальная аналитика)
-- ========================================

SELECT 
    '🎥 СТРУКТУРА VIDEO_ANALYTICS (если существует)' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'video_analytics'
ORDER BY ordinal_position;

-- ОЖИДАЕМЫЕ КОЛОНКИ:
-- user_id (uuid) ← СВЯЗЬ С ПРОФИЛЕМ!
-- video_id (uuid)
-- session_id (uuid)
-- event_type (character varying) ← play, pause, seek, complete
-- timestamp_seconds (integer) ← в какой момент видео
-- created_at (timestamp)

-- ========================================
-- 3. СТРУКТУРА module_progress (прогресс по модулям)
-- ========================================

SELECT 
    '📚 СТРУКТУРА MODULE_PROGRESS' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'module_progress'
ORDER BY ordinal_position;

-- ОЖИДАЕМЫЕ КОЛОНКИ:
-- user_id (uuid) ← СВЯЗЬ С ПРОФИЛЕМ!
-- module_id (uuid)
-- completed_lessons (integer)
-- total_lessons (integer)
-- progress_percentage (integer)

-- ========================================
-- 4. ПРОВЕРКА: Foreign Keys на user_id
-- ========================================

SELECT
    '🔗 FOREIGN KEYS НА USER_ID' as info,
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND kcu.column_name = 'user_id'
ORDER BY tc.table_name;

-- ========================================
-- 5. ПРОВЕРКА: Есть ли таблица users или profiles
-- ========================================

SELECT 
    '👤 ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ' as info,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'profiles', 'auth.users')
ORDER BY table_name;

-- ========================================
-- 6. ПРОВЕРКА: Структура profiles (если есть)
-- ========================================

SELECT 
    '👤 СТРУКТУРА PROFILES' as info,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

