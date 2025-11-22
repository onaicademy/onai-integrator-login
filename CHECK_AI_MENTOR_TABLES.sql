-- ============================================
-- ПРОВЕРКА ТАБЛИЦ AI-НАСТАВНИКА
-- Дата: 21 ноября 2025
-- ============================================

-- ========================================
-- 1. ПРОВЕРКА СУЩЕСТВОВАНИЯ ТАБЛИЦ
-- ========================================

SELECT 
  '=== ТАБЛИЦЫ AI-НАСТАВНИКА ===' as check_type,
  t.table_name,
  CASE 
    WHEN t.table_name IS NOT NULL THEN '✅ ЕСТЬ'
    ELSE '❌ НЕТ'
  END as status
FROM (
  SELECT 'user_progress' as table_name
  UNION ALL SELECT 'video_watch_sessions'
  UNION ALL SELECT 'missions'
  UNION ALL SELECT 'weekly_goals'
  UNION ALL SELECT 'daily_challenges'
  UNION ALL SELECT 'curator_knowledge_base'
  UNION ALL SELECT 'student_questions_log'
  UNION ALL SELECT 'ai_mentor_advice_log'
  UNION ALL SELECT 'ai_mentor_tasks'
) expected
LEFT JOIN information_schema.tables t 
  ON t.table_schema = 'public' 
  AND t.table_name = expected.table_name
ORDER BY expected.table_name;

-- ========================================
-- 2. ПРОВЕРКА ФУНКЦИЙ
-- ========================================

SELECT 
  '=== ФУНКЦИИ AI-НАСТАВНИКА ===' as check_type,
  f.function_name,
  CASE 
    WHEN p.proname IS NOT NULL THEN '✅ ЕСТЬ'
    ELSE '❌ НЕТ'
  END as status
FROM (
  SELECT 'update_user_streak' as function_name
  UNION ALL SELECT 'check_and_unlock_achievements'
  UNION ALL SELECT 'create_mentor_task_from_video_struggle'
  UNION ALL SELECT 'detect_video_struggle'
  UNION ALL SELECT 'update_mission_progress'
  UNION ALL SELECT 'on_lesson_completed'
  UNION ALL SELECT 'get_student_context_for_ai'
) f
LEFT JOIN pg_proc p ON p.proname = f.function_name
ORDER BY f.function_name;

-- ========================================
-- 3. ПРОВЕРКА ТРИГГЕРОВ
-- ========================================

SELECT 
  '=== ТРИГГЕРЫ AI-НАСТАВНИКА ===' as check_type,
  t.trigger_name,
  t.event_object_table,
  CASE 
    WHEN t.trigger_name IS NOT NULL THEN '✅ ЕСТЬ'
    ELSE '❌ НЕТ'
  END as status
FROM (
  SELECT 'on_lesson_activity' as trigger_name, 'user_progress' as event_object_table
  UNION ALL SELECT 'on_video_struggle', 'video_watch_sessions'
  UNION ALL SELECT 'on_user_progress_updated', 'user_progress'
) expected
LEFT JOIN information_schema.triggers t
  ON t.trigger_name = expected.trigger_name
  AND t.event_object_table = expected.event_object_table
ORDER BY expected.trigger_name;

-- ========================================
-- 4. ПРОВЕРКА ЗАПИСЕЙ В БАЗЕ ЗНАНИЙ
-- ========================================

SELECT 
  '=== БАЗА ЗНАНИЙ КУРАТОРА ===' as check_type,
  COUNT(*) as records_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ДАННЫЕ ЕСТЬ'
    ELSE '❌ ДАННЫХ НЕТ'
  END as status
FROM curator_knowledge_base
WHERE is_active = true;

-- ========================================
-- 5. ДЕТАЛЬНАЯ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ
-- ========================================

-- Проверка user_progress
SELECT 
  '=== user_progress СТРУКТУРА ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Проверка video_watch_sessions
SELECT 
  '=== video_watch_sessions СТРУКТУРА ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'video_watch_sessions'
ORDER BY ordinal_position;

-- Проверка missions
SELECT 
  '=== missions СТРУКТУРА ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
ORDER BY ordinal_position;

-- ========================================
-- 6. ПРОВЕРКА RLS ПОЛИТИК
-- ========================================

SELECT 
  '=== RLS ПОЛИТИКИ ===' as info,
  schemaname,
  tablename,
  policyname,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ ЕСТЬ'
    ELSE '❌ НЕТ'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_progress',
    'video_watch_sessions',
    'missions',
    'weekly_goals',
    'daily_challenges',
    'curator_knowledge_base',
    'student_questions_log',
    'ai_mentor_advice_log',
    'ai_mentor_tasks'
  )
ORDER BY tablename, policyname;

-- ========================================
-- 7. ПРОВЕРКА ИНДЕКСОВ
-- ========================================

SELECT 
  '=== ИНДЕКСЫ ===' as info,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'user_progress',
    'video_watch_sessions',
    'missions',
    'weekly_goals',
    'daily_challenges',
    'curator_knowledge_base',
    'student_questions_log',
    'ai_mentor_advice_log',
    'ai_mentor_tasks'
  )
ORDER BY tablename, indexname;

-- ========================================
-- 8. ИТОГОВАЯ СТАТИСТИКА
-- ========================================

SELECT 
  '=== ИТОГОВАЯ СТАТИСТИКА ===' as info,
  'Таблицы' as category,
  COUNT(DISTINCT table_name) as count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_progress',
    'video_watch_sessions',
    'missions',
    'weekly_goals',
    'daily_challenges',
    'curator_knowledge_base',
    'student_questions_log',
    'ai_mentor_advice_log',
    'ai_mentor_tasks'
  )
UNION ALL
SELECT 
  '=== ИТОГОВАЯ СТАТИСТИКА ===' as info,
  'Функции' as category,
  COUNT(*) as count
FROM pg_proc
WHERE proname IN (
  'update_user_streak',
  'check_and_unlock_achievements',
  'create_mentor_task_from_video_struggle',
  'detect_video_struggle',
  'update_mission_progress',
  'on_lesson_completed',
  'get_student_context_for_ai'
)
UNION ALL
SELECT 
  '=== ИТОГОВАЯ СТАТИСТИКА ===' as info,
  'Записи в базе знаний' as category,
  COUNT(*) as count
FROM curator_knowledge_base
WHERE is_active = true;

