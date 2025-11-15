-- ========================================
-- ОЧИСТКА: Удаление лишних таблиц
-- Дата: 15 ноября 2025
-- ========================================

-- ⚠️ ВНИМАНИЕ! ЭТОТ ФАЙЛ УДАЛЯЕТ ТАБЛИЦЫ И ДАННЫЕ!
-- НЕ ЗАПУСКАЙ БЕЗ ПРОВЕРКИ!

-- ========================================
-- 1. ПРОВЕРКА: Какие таблицы потенциально лишние?
-- ========================================

SELECT 
    '⚠️ ТАБЛИЦЫ ДЛЯ ПРОВЕРКИ' as info,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = schemaname 
     AND table_name = tablename) as columns_count
FROM pg_tables 
WHERE schemaname = 'public'
AND (
    tablename ILIKE '%test%' 
    OR tablename ILIKE '%temp%'
    OR tablename ILIKE '%old%'
    OR tablename ILIKE '%deprecated%'
    OR tablename ILIKE '%backup%'
)
ORDER BY tablename;

-- ========================================
-- 2. ПРОВЕРКА: Есть ли данные в таблицах?
-- ========================================

/*
-- Проверь каждую подозрительную таблицу:
SELECT COUNT(*) FROM public.table_name;

-- Если COUNT(*) = 0 и таблица не нужна → можно удалять
*/

-- ========================================
-- 3. СПИСОК ТАБЛИЦ КОТОРЫЕ ТОЧНО НУЖНЫ
-- ========================================

/*
✅ НЕ УДАЛЯТЬ ЭТИ ТАБЛИЦЫ:

ОСНОВНЫЕ:
- profiles
- courses
- modules
- lessons
- video_content
- lesson_materials
- student_progress
- module_progress
- video_analytics

ИГРОФИКАЦИЯ:
- user_achievements
- user_goals
- user_missions

ЧАТЫ:
- curator_chat_history (если есть)
- mentor_chat_history (если есть)

ТОКЕНЫ:
- token_usage (если есть)

ФАЙЛЫ:
- file_uploads (если есть)

❌ МОЖНО УДАЛИТЬ:
- video_segments_analytics (если не используется)
- student_learning_metrics (если не используется)
- course_health_metrics (если не используется)
- mentor_motivation_log (если переименована в ai_mentor_messages)
- Любые таблицы с префиксом test_, temp_, old_
*/

-- ========================================
-- 4. КОМАНДЫ ДЛЯ УДАЛЕНИЯ (ЗАКОММЕНТИРОВАНЫ!)
-- ========================================

/*
⚠️ РАСКОММЕНТИРУЙ ТОЛЬКО ТО ЧТО ТОЧНО НУЖНО УДАЛИТЬ!

-- Удаление таблиц аналитики (если переделываем):
-- DROP TABLE IF EXISTS public.video_segments_analytics CASCADE;
-- DROP TABLE IF EXISTS public.student_learning_metrics CASCADE;
-- DROP TABLE IF EXISTS public.course_health_metrics CASCADE;

-- Удаление старой таблицы ментора (если есть новая):
-- DROP TABLE IF EXISTS public.mentor_motivation_log CASCADE;

-- Удаление тестовых таблиц:
-- DROP TABLE IF EXISTS public.test_table_name CASCADE;

-- Удаление временных таблиц:
-- DROP TABLE IF EXISTS public.temp_table_name CASCADE;

CASCADE означает что удалятся и все связи (foreign keys, views, etc)
*/

-- ========================================
-- 5. ОЧИСТКА ПУСТЫХ ТАБЛИЦ
-- ========================================

/*
-- Если таблица пустая и не нужна:
SELECT 
    tablename,
    (SELECT COUNT(*) FROM public.tablename) as row_count
FROM pg_tables 
WHERE schemaname = 'public';

-- Удалить все пустые тестовые таблицы:
-- DO $$
-- DECLARE
--     table_name TEXT;
-- BEGIN
--     FOR table_name IN 
--         SELECT tablename 
--         FROM pg_tables 
--         WHERE schemaname = 'public' 
--         AND tablename ILIKE '%test%'
--     LOOP
--         EXECUTE 'DROP TABLE IF EXISTS public.' || table_name || ' CASCADE';
--         RAISE NOTICE 'Удалена таблица: %', table_name;
--     END LOOP;
-- END $$;
*/

-- ========================================
-- 6. ПРОВЕРКА ПОСЛЕ УДАЛЕНИЯ
-- ========================================

SELECT 
    '✅ ОСТАВШИЕСЯ ТАБЛИЦЫ' as info,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

/*
📋 ПЛАН ДЕЙСТВИЙ:

1. Запусти CHECK_MIGRATIONS_CLEANUP.sql - увидишь все миграции
2. Запусти этот файл (раздел 1-2) - увидишь подозрительные таблицы
3. Проверь нужны ли эти таблицы
4. Раскомментируй команды DROP TABLE только для ненужных таблиц
5. Запусти миграцию
6. Проверь результат (раздел 6)

НЕ УДАЛЯЙ без уверенности! Лучше спроси меня.
*/

