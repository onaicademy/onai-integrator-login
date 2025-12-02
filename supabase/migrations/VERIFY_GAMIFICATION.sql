-- ========================================
-- ПРОВЕРКА: Игрофикация применилась?
-- ========================================

-- 1. Проверяем колонки в profiles
SELECT 
    '✅ КОЛОНКИ В PROFILES' as check_name,
    COUNT(CASE WHEN column_name = 'level' THEN 1 END) as has_level,
    COUNT(CASE WHEN column_name = 'xp' THEN 1 END) as has_xp,
    COUNT(CASE WHEN column_name = 'current_streak' THEN 1 END) as has_current_streak,
    COUNT(CASE WHEN column_name = 'longest_streak' THEN 1 END) as has_longest_streak,
    COUNT(CASE WHEN column_name = 'last_activity_at' THEN 1 END) as has_last_activity,
    COUNT(CASE WHEN column_name = 'avatar_url' THEN 1 END) as has_avatar_url
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles';

-- 2. Проверяем таблицы
SELECT 
    '✅ ТАБЛИЦЫ ИГРОФИКАЦИИ' as check_name,
    COUNT(CASE WHEN table_name = 'user_achievements' THEN 1 END) as has_achievements,
    COUNT(CASE WHEN table_name = 'user_goals' THEN 1 END) as has_goals,
    COUNT(CASE WHEN table_name = 'user_missions' THEN 1 END) as has_missions
FROM information_schema.tables 
WHERE table_schema = 'public';

-- 3. Статистика пользователей
SELECT 
    '📊 СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN level IS NOT NULL THEN 1 END) as users_with_level,
    COUNT(CASE WHEN xp IS NOT NULL THEN 1 END) as users_with_xp,
    COUNT(CASE WHEN current_streak IS NOT NULL THEN 1 END) as users_with_streak
FROM public.profiles;

-- 4. Проверяем недельные цели
SELECT 
    '🎯 НЕДЕЛЬНЫЕ ЦЕЛИ' as info,
    COUNT(*) as total_goals,
    COUNT(DISTINCT user_id) as users_with_goals
FROM public.user_goals;

-- 5. Показываем примеры данных
SELECT 
    '👤 ПРИМЕРЫ ПОЛЬЗОВАТЕЛЕЙ' as info,
    full_name,
    level,
    xp,
    current_streak,
    last_activity_at
FROM public.profiles
LIMIT 5;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

