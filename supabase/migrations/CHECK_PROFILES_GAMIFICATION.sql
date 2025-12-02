-- ========================================
-- ПРОВЕРКА: profiles готов к игрофикации?
-- ========================================

-- ========================================
-- 1. СТРУКТУРА PROFILES (текущая)
-- ========================================

SELECT 
    '👤 ТЕКУЩАЯ СТРУКТУРА PROFILES' as info,
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ========================================
-- 2. ПРОВЕРКА: Есть ли колонки для игрофикации?
-- ========================================

SELECT 
    '🎮 ПРОВЕРКА КОЛОНОК ДЛЯ ИГРОФИКАЦИИ' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'level'
        ) THEN '✅ level ЕСТЬ'
        ELSE '❌ level ОТСУТСТВУЕТ'
    END as level_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'xp'
        ) THEN '✅ xp ЕСТЬ'
        ELSE '❌ xp ОТСУТСТВУЕТ'
    END as xp_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'current_streak'
        ) THEN '✅ current_streak ЕСТЬ'
        ELSE '❌ current_streak ОТСУТСТВУЕТ'
    END as streak_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'total_watch_time_seconds'
        ) THEN '✅ total_watch_time_seconds ЕСТЬ'
        ELSE '❌ total_watch_time_seconds ОТСУТСТВУЕТ'
    END as watch_time_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'profiles' 
            AND column_name = 'last_activity_at'
        ) THEN '✅ last_activity_at ЕСТЬ'
        ELSE '❌ last_activity_at ОТСУТСТВУЕТ'
    END as activity_status;

-- ========================================
-- 3. ПРОВЕРКА: Есть ли таблицы user_goals и user_missions?
-- ========================================

SELECT 
    '🎯 ПРОВЕРКА ТАБЛИЦ ИГРОФИКАЦИИ' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_goals'
        ) THEN '✅ user_goals СУЩЕСТВУЕТ'
        ELSE '❌ user_goals НЕ СОЗДАНА'
    END as user_goals_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'user_missions'
        ) THEN '✅ user_missions СУЩЕСТВУЕТ'
        ELSE '❌ user_missions НЕ СОЗДАНА'
    END as user_missions_status;

-- ========================================
-- 4. ПРОВЕРКА: Сколько пользователей в БД?
-- ========================================

SELECT 
    '📊 СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as users_with_email,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as users_with_name
FROM public.profiles;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

