-- ============================================
-- БЫСТРАЯ ПРОВЕРКА ТЕСТОВЫХ ДАННЫХ
-- ============================================

-- 1. Сколько студентов создано?
SELECT 
  '=== СТУДЕНТЫ ===' as check,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ ЕСТЬ'
    ELSE '❌ МАЛО'
  END as status
FROM profiles
WHERE role = 'student';

-- 2. Есть ли курсы и уроки?
SELECT 
  '=== КОНТЕНТ ===' as check,
  (SELECT COUNT(*) FROM courses) as courses_count,
  (SELECT COUNT(*) FROM modules) as modules_count,
  (SELECT COUNT(*) FROM lessons) as lessons_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM lessons) >= 5 THEN '✅ ЕСТЬ'
    ELSE '❌ НЕТ'
  END as status;

-- 3. Есть ли активность студентов?
SELECT 
  '=== АКТИВНОСТЬ ===' as check,
  (SELECT COUNT(*) FROM user_progress) as progress_records,
  (SELECT COUNT(*) FROM video_watch_sessions) as video_sessions,
  (SELECT COUNT(*) FROM missions) as missions_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM user_progress) > 0 THEN '✅ ЕСТЬ'
    ELSE '❌ НЕТ'
  END as status;

-- 4. Есть ли задачи для AI-наставника?
SELECT 
  '=== ЗАДАЧИ AI ===' as check,
  COUNT(*) as tasks_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
  COUNT(*) FILTER (WHERE triggered_by = 'video_struggle') as struggle_tasks,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ ЕСТЬ'
    ELSE '⚠️ НЕТ (это нормально, создадутся при активности)'
  END as status
FROM ai_mentor_tasks;

-- 5. Топ студентов по активности
SELECT 
  '=== ТОП-5 СТУДЕНТОВ ===' as info,
  p.full_name,
  p.xp,
  p.level,
  p.current_streak,
  COALESCE(us.lessons_completed, 0) as lessons_completed
FROM profiles p
LEFT JOIN user_statistics us ON us.user_id = p.id
WHERE p.role = 'student'
ORDER BY p.xp DESC
LIMIT 5;

-- 6. Проблемные студенты (много перемоток видео)
SELECT 
  '=== ПРОБЛЕМНЫЕ СТУДЕНТЫ ===' as info,
  p.full_name,
  l.title as lesson_title,
  vws.seeks_count as rewinds,
  vws.pauses_count as pauses,
  CASE 
    WHEN vws.seeks_count >= 10 THEN '🔴 ОЧЕНЬ СЛОЖНО'
    WHEN vws.seeks_count >= 5 THEN '🟡 СЛОЖНО'
    ELSE '🟢 НОРМ'
  END as difficulty
FROM video_watch_sessions vws
JOIN profiles p ON p.id = vws.user_id
JOIN lessons l ON l.id = vws.lesson_id
WHERE vws.seeks_count >= 5
ORDER BY vws.seeks_count DESC
LIMIT 5;

-- 7. Активные миссии
SELECT 
  '=== АКТИВНЫЕ МИССИИ ===' as info,
  p.full_name as student,
  m.title as mission,
  m.current_value || '/' || m.target_value as progress,
  ROUND((m.current_value::decimal / m.target_value * 100), 0) || '%' as progress_percent,
  m.xp_reward || ' XP' as reward
FROM missions m
JOIN profiles p ON p.id = m.user_id
WHERE m.is_completed = false
ORDER BY p.full_name, m.created_at
LIMIT 10;

-- 8. База знаний куратора
SELECT 
  '=== БАЗА ЗНАНИЙ ===' as info,
  category,
  COUNT(*) as entries_count,
  array_agg(LEFT(question, 40) || '...') as questions_preview
FROM curator_knowledge_base
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- ИТОГОВАЯ СВОДКА
SELECT 
  '=== 🎯 ИТОГОВАЯ СВОДКА ===' as summary,
  jsonb_build_object(
    '👥 Студентов', (SELECT COUNT(*) FROM profiles WHERE role = 'student'),
    '📚 Курсов', (SELECT COUNT(*) FROM courses),
    '📖 Уроков', (SELECT COUNT(*) FROM lessons),
    '📊 Прогресс записей', (SELECT COUNT(*) FROM user_progress),
    '🎬 Видео сессий', (SELECT COUNT(*) FROM video_watch_sessions),
    '🎯 Миссий', (SELECT COUNT(*) FROM missions WHERE is_completed = false),
    '🤖 Задач AI', (SELECT COUNT(*) FROM ai_mentor_tasks),
    '💬 Вопросов', (SELECT COUNT(*) FROM student_questions_log),
    '📚 База знаний', (SELECT COUNT(*) FROM curator_knowledge_base WHERE is_active = true)
  ) as data;

