-- ========================================
-- АНАЛИЗ: Какие таблицы - дубликаты?
-- Цель: Найти лишние таблицы для удаления
-- ========================================

-- ========================================
-- 1. СРАВНЕНИЕ ТАБЛИЦ ПРОГРЕССА
-- ========================================

-- Структура progress
SELECT 
    '📊 ТАБЛИЦА: progress' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'progress'
ORDER BY ordinal_position;

-- Структура user_progress
SELECT 
    '📊 ТАБЛИЦА: user_progress' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Структура student_progress
SELECT 
    '📊 ТАБЛИЦА: student_progress' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'student_progress'
ORDER BY ordinal_position;

-- Количество данных в каждой
SELECT 
    '📈 ДАННЫЕ В ТАБЛИЦАХ ПРОГРЕССА' as info,
    (SELECT COUNT(*) FROM public.progress) as progress_count,
    (SELECT COUNT(*) FROM public.user_progress) as user_progress_count,
    (SELECT COUNT(*) FROM public.student_progress) as student_progress_count;

-- ========================================
-- 2. СРАВНЕНИЕ ТАБЛИЦ ДОСТИЖЕНИЙ
-- ========================================

-- Структура achievements
SELECT 
    '🏆 ТАБЛИЦА: achievements' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'achievements'
ORDER BY ordinal_position;

-- Структура user_achievements
SELECT 
    '🏆 ТАБЛИЦА: user_achievements' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_achievements'
ORDER BY ordinal_position;

-- Количество данных
SELECT 
    '🏆 ДАННЫЕ В ТАБЛИЦАХ ДОСТИЖЕНИЙ' as info,
    (SELECT COUNT(*) FROM public.achievements) as achievements_count,
    (SELECT COUNT(*) FROM public.user_achievements) as user_achievements_count,
    (SELECT COUNT(*) FROM public.achievement_history) as achievement_history_count;

-- ========================================
-- 3. СРАВНЕНИЕ ТАБЛИЦ ПОЛЬЗОВАТЕЛЕЙ
-- ========================================

-- Структура users
SELECT 
    '👤 ТАБЛИЦА: users' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- Структура profiles  
SELECT 
    '👤 ТАБЛИЦА: profiles' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Структура student_profiles
SELECT 
    '👤 ТАБЛИЦА: student_profiles' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'student_profiles'
ORDER BY ordinal_position;

-- Количество данных
SELECT 
    '👤 ДАННЫЕ В ТАБЛИЦАХ ПОЛЬЗОВАТЕЛЕЙ' as info,
    (SELECT COUNT(*) FROM public.users) as users_count,
    (SELECT COUNT(*) FROM public.profiles) as profiles_count,
    (SELECT COUNT(*) FROM public.student_profiles) as student_profiles_count;

-- ========================================
-- 4. СРАВНЕНИЕ ТАБЛИЦ КУРСОВ
-- ========================================

-- Структура user_courses
SELECT 
    '📚 ТАБЛИЦА: user_courses' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_courses'
ORDER BY ordinal_position;

-- Структура student_courses
SELECT 
    '📚 ТАБЛИЦА: student_courses' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'student_courses'
ORDER BY ordinal_position;

-- Количество данных
SELECT 
    '📚 ДАННЫЕ В ТАБЛИЦАХ КУРСОВ' as info,
    (SELECT COUNT(*) FROM public.user_courses) as user_courses_count,
    (SELECT COUNT(*) FROM public.student_courses) as student_courses_count;

-- ========================================
-- 5. СРАВНЕНИЕ ТАБЛИЦ СТАТИСТИКИ
-- ========================================

-- Структура user_stats
SELECT 
    '📊 ТАБЛИЦА: user_stats' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_stats'
ORDER BY ordinal_position;

-- Структура user_statistics
SELECT 
    '📊 ТАБЛИЦА: user_statistics' as table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_statistics'
ORDER BY ordinal_position;

-- Количество данных
SELECT 
    '📊 ДАННЫЕ В ТАБЛИЦАХ СТАТИСТИКИ' as info,
    (SELECT COUNT(*) FROM public.user_stats) as user_stats_count,
    (SELECT COUNT(*) FROM public.user_statistics) as user_statistics_count;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

/*
📋 АНАЛИЗ:

После выполнения этого SQL:
1. Сравни структуру дублирующихся таблиц
2. Посмотри где больше данных
3. Решим какие таблицы оставить, какие удалить

СКОРЕЕ ВСЕГО:
- student_progress → ОСТАВИТЬ (самая полная для видео)
- progress, user_progress → УДАЛИТЬ (дубликаты)

- user_achievements → ОСТАВИТЬ (новая с игрофикацией)
- achievements → УДАЛИТЬ (старая)

- profiles → ОСТАВИТЬ (основная)
- users, student_profiles → проверить назначение
*/

