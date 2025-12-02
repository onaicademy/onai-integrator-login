-- ========================================
-- ПОЛНАЯ ПРОВЕРКА ИГРОФИКАЦИИ (одним запросом)
-- ========================================

WITH column_check AS (
    SELECT 
        COUNT(CASE WHEN column_name = 'level' THEN 1 END) as has_level,
        COUNT(CASE WHEN column_name = 'xp' THEN 1 END) as has_xp,
        COUNT(CASE WHEN column_name = 'current_streak' THEN 1 END) as has_current_streak,
        COUNT(CASE WHEN column_name = 'longest_streak' THEN 1 END) as has_longest_streak,
        COUNT(CASE WHEN column_name = 'last_activity_at' THEN 1 END) as has_last_activity,
        COUNT(CASE WHEN column_name = 'avatar_url' THEN 1 END) as has_avatar_url
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
),
table_check AS (
    SELECT 
        COUNT(CASE WHEN table_name = 'user_achievements' THEN 1 END) as has_achievements,
        COUNT(CASE WHEN table_name = 'user_goals' THEN 1 END) as has_goals,
        COUNT(CASE WHEN table_name = 'user_missions' THEN 1 END) as has_missions
    FROM information_schema.tables 
    WHERE table_schema = 'public'
),
user_stats AS (
    SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN level IS NOT NULL THEN 1 END) as users_with_level,
        COUNT(CASE WHEN xp IS NOT NULL THEN 1 END) as users_with_xp,
        COUNT(CASE WHEN current_streak IS NOT NULL THEN 1 END) as users_with_streak,
        AVG(level)::INTEGER as avg_level,
        AVG(xp)::INTEGER as avg_xp
    FROM public.profiles
),
goals_stats AS (
    SELECT 
        COUNT(*) as total_goals,
        COUNT(DISTINCT user_id) as users_with_goals,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_goals
    FROM public.user_goals
)
SELECT 
    '✅ ИГРОФИКАЦИЯ УСТАНОВЛЕНА' as status,
    
    -- Колонки в profiles
    cc.has_level as "✓ level",
    cc.has_xp as "✓ xp", 
    cc.has_current_streak as "✓ streak",
    cc.has_longest_streak as "✓ longest_streak",
    cc.has_last_activity as "✓ last_activity",
    cc.has_avatar_url as "✓ avatar",
    
    -- Таблицы
    tc.has_achievements as "✓ achievements_table",
    tc.has_goals as "✓ goals_table",
    tc.has_missions as "✓ missions_table",
    
    -- Статистика пользователей
    us.total_users as "👥 users",
    us.users_with_level as "users_initialized",
    us.avg_level as "avg_level",
    us.avg_xp as "avg_xp",
    
    -- Статистика целей
    gs.total_goals as "🎯 goals",
    gs.users_with_goals as "users_with_goals",
    gs.completed_goals as "completed_goals"
    
FROM column_check cc, table_check tc, user_stats us, goals_stats gs;

-- ========================================
-- РЕЗУЛЬТАТ: 
-- Если все колонки = 1, значит ✅
-- Если users = users_initialized, значит ✅
-- ========================================

