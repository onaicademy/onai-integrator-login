-- =========================================
-- 🔍 ДИАГНОСТИКА ПРОБЛЕМНЫХ ПОЛЬЗОВАТЕЛЕЙ
-- =========================================
-- Дата: 20 декабря 2024
-- Цель: Выявить причины, по которым студенты не могут войти на платформу
--
-- Проблемные email:
-- - Sabzhaslan@mail.ru
-- - dyusekengulim@mail.ru
-- - Altitudefive@yandex.ru
-- =========================================

\echo '🔍 НАЧИНАЕМ ДИАГНОСТИКУ...'
\echo ''

-- =========================================
-- 1. ПРОВЕРКА СУЩЕСТВОВАНИЯ ПОЛЬЗОВАТЕЛЕЙ
-- =========================================
\echo '📊 1. Проверяем существование пользователей в tripwire_users...'

SELECT 
  '✅ НАЙДЕН' as status,
  id as tripwire_users_id,
  user_id as auth_users_id,
  email,
  full_name,
  status as account_status,
  modules_completed,
  onboarding_completed,
  onboarding_completed_at,
  created_at,
  updated_at,
  CASE 
    WHEN onboarding_completed = false THEN '❌ ONBOARDING НЕ ПРОЙДЕН'
    WHEN status = 'inactive' THEN '❌ АККАУНТ НЕАКТИВЕН'
    WHEN status = 'completed' THEN '✅ КУРС ЗАВЕРШЕН'
    ELSE '✅ АККАУНТ АКТИВЕН'
  END as diagnosis
FROM tripwire_users 
WHERE LOWER(email) IN (
  'sabzhaslan@mail.ru',
  'dyusekengulim@mail.ru', 
  'altitudefive@yandex.ru'
)
ORDER BY email;

\echo ''
\echo '❓ Если пользователей НЕТ в результате - они не были созданы Sales Manager!'
\echo ''

-- =========================================
-- 2. ПРОВЕРКА AUTH.USERS
-- =========================================
\echo '📊 2. Проверяем auth.users (Supabase Auth)...'

SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  au.last_sign_in_at,
  au.email_confirmed_at,
  CASE 
    WHEN au.email_confirmed_at IS NULL THEN '❌ EMAIL НЕ ПОДТВЕРЖДЕН'
    WHEN au.last_sign_in_at IS NULL THEN '⚠️ НИКОГДА НЕ ВХОДИЛ'
    WHEN au.last_sign_in_at < NOW() - INTERVAL '30 days' THEN '⚠️ НЕ ВХОДИЛ БОЛЕЕ 30 ДНЕЙ'
    ELSE '✅ АКТИВНЫЙ'
  END as diagnosis
FROM auth.users au
WHERE au.id IN (
  SELECT user_id FROM tripwire_users 
  WHERE LOWER(email) IN (
    'sabzhaslan@mail.ru',
    'dyusekengulim@mail.ru',
    'altitudefive@yandex.ru'
  )
);

\echo ''

-- =========================================
-- 3. РАЗБЛОКИРОВКА МОДУЛЕЙ
-- =========================================
\echo '📊 3. Проверяем разблокированные модули (module_unlocks)...'

SELECT 
  tu.email,
  mu.module_id,
  CASE mu.module_id
    WHEN 16 THEN 'Модуль 1'
    WHEN 17 THEN 'Модуль 2'
    WHEN 18 THEN 'Модуль 3'
  END as module_name,
  mu.unlocked_at,
  CASE 
    WHEN mu.module_id = 16 THEN '✅ ПЕРВЫЙ МОДУЛЬ (ВСЕГДА ДОЛЖЕН БЫТЬ)'
    WHEN mu.module_id = 17 THEN '✅ ВТОРОЙ МОДУЛЬ РАЗБЛОКИРОВАН'
    WHEN mu.module_id = 18 THEN '✅ ТРЕТИЙ МОДУЛЬ РАЗБЛОКИРОВАН'
  END as status
FROM module_unlocks mu
JOIN tripwire_users tu ON tu.user_id = mu.user_id
WHERE LOWER(tu.email) IN (
  'sabzhaslan@mail.ru',
  'dyusekengulim@mail.ru',
  'altitudefive@yandex.ru'
)
ORDER BY tu.email, mu.module_id;

\echo ''
\echo '❓ Если НЕТ записи с module_id = 16 - ПЕРВЫЙ МОДУЛЬ НЕ РАЗБЛОКИРОВАН!'
\echo ''

-- =========================================
-- 4. ПРОГРЕСС ПО УРОКАМ (student_progress)
-- =========================================
\echo '📊 4. Проверяем прогресс по урокам (student_progress)...'

SELECT 
  tu.email,
  sp.lesson_id,
  CASE sp.lesson_id
    WHEN 67 THEN 'Урок 1 (Модуль 1)'
    WHEN 68 THEN 'Урок 2 (Модуль 2)'
    WHEN 69 THEN 'Урок 3 (Модуль 3)'
  END as lesson_name,
  sp.status,
  sp.started_at,
  sp.completed_at,
  CASE sp.status
    WHEN 'not_started' THEN '⚪ НЕ НАЧАТ'
    WHEN 'in_progress' THEN '🟡 В ПРОЦЕССЕ'
    WHEN 'completed' THEN '✅ ЗАВЕРШЕН'
  END as status_emoji
FROM student_progress sp
JOIN tripwire_users tu ON tu.user_id = sp.user_id
WHERE LOWER(tu.email) IN (
  'sabzhaslan@mail.ru',
  'dyusekengulim@mail.ru',
  'altitudefive@yandex.ru'
)
ORDER BY tu.email, sp.lesson_id;

\echo ''
\echo '❓ Если таблица пустая - студент НЕ НАЧИНАЛ УРОКИ!'
\echo ''

-- =========================================
-- 5. ТРЕКИНГ ВИДЕО (video_tracking)
-- =========================================
\echo '📊 5. Проверяем трекинг просмотра видео (video_tracking)...'

SELECT 
  tu.email,
  vt.lesson_id,
  CASE vt.lesson_id
    WHEN 67 THEN 'Урок 1'
    WHEN 68 THEN 'Урок 2'
    WHEN 69 THEN 'Урок 3'
  END as lesson_name,
  vt.watch_percentage as "просмотрено_%",
  vt.total_watched_seconds as "секунд_просмотрено",
  vt.video_duration_seconds as "длительность_видео",
  vt.is_qualified_for_completion as "квалифицирован_для_завершения",
  vt.last_position_seconds as "последняя_позиция",
  vt.updated_at as "последнее_обновление",
  CASE 
    WHEN vt.watch_percentage >= 80 AND vt.is_qualified_for_completion = true THEN '✅ ГОТОВ ЗАВЕРШИТЬ'
    WHEN vt.watch_percentage >= 80 AND vt.is_qualified_for_completion = false THEN '❌ БАГ: 80% но не квалифицирован!'
    WHEN vt.watch_percentage < 80 THEN '⏳ ЕЩЕ СМОТРИТ (' || vt.watch_percentage || '%)'
    ELSE '⚠️ НЕИЗВЕСТНЫЙ СТАТУС'
  END as diagnosis
FROM video_tracking vt
JOIN tripwire_users tu ON tu.user_id = vt.user_id
WHERE LOWER(tu.email) IN (
  'sabzhaslan@mail.ru',
  'dyusekengulim@mail.ru',
  'altitudefive@yandex.ru'
)
ORDER BY tu.email, vt.lesson_id;

\echo ''
\echo '❓ Если таблица пустая - видео НЕ ЗАПУСКАЛОСЬ!'
\echo ''

-- =========================================
-- 6. ДОМАШНИЕ ЗАДАНИЯ (homework_submissions)
-- =========================================
\echo '📊 6. Проверяем домашние задания...'

SELECT 
  tu.email,
  hs.lesson_id,
  hs.homework_text,
  hs.submitted_at,
  hs.reviewed_by,
  hs.reviewed_at,
  CASE 
    WHEN hs.reviewed_at IS NOT NULL THEN '✅ ПРОВЕРЕНО'
    WHEN hs.submitted_at IS NOT NULL THEN '⏳ НА ПРОВЕРКЕ'
    ELSE '⚪ НЕ СДАНО'
  END as status
FROM homework_submissions hs
JOIN tripwire_users tu ON tu.user_id = hs.user_id
WHERE LOWER(tu.email) IN (
  'sabzhaslan@mail.ru',
  'dyusekengulim@mail.ru',
  'altitudefive@yandex.ru'
)
ORDER BY tu.email, hs.lesson_id;

\echo ''

-- =========================================
-- 7. СВОДНАЯ ИНФОРМАЦИЯ
-- =========================================
\echo '📊 7. СВОДНАЯ ИНФОРМАЦИЯ ПО ПОЛЬЗОВАТЕЛЯМ...'
\echo ''

SELECT 
  tu.email,
  tu.full_name,
  tu.status as account_status,
  tu.modules_completed,
  tu.onboarding_completed,
  
  -- Количество разблокированных модулей
  COUNT(DISTINCT mu.module_id) as unlocked_modules,
  
  -- Количество начатых уроков
  COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.status != 'not_started') as started_lessons,
  
  -- Количество завершенных уроков
  COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.status = 'completed') as completed_lessons,
  
  -- Средний процент просмотра видео
  ROUND(AVG(vt.watch_percentage), 2) as avg_watch_percentage,
  
  -- Количество квалифицированных для завершения
  COUNT(DISTINCT vt.lesson_id) FILTER (WHERE vt.is_qualified_for_completion = true) as qualified_lessons,
  
  -- Количество сданных ДЗ
  COUNT(DISTINCT hs.lesson_id) as homework_submitted,
  
  -- Последняя активность
  GREATEST(
    tu.updated_at,
    MAX(sp.updated_at),
    MAX(vt.updated_at)
  ) as last_activity,
  
  -- ДИАГНОЗ
  CASE 
    WHEN tu.onboarding_completed = false THEN '❌ ONBOARDING НЕ ПРОЙДЕН - БЛОКИРУЕТ ДОСТУП'
    WHEN COUNT(DISTINCT mu.module_id) = 0 THEN '❌ НЕТ РАЗБЛОКИРОВАННЫХ МОДУЛЕЙ'
    WHEN COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.status != 'not_started') = 0 THEN '❌ НЕ НАЧИНАЛ УРОКИ'
    WHEN COUNT(DISTINCT vt.lesson_id) = 0 THEN '❌ ВИДЕО НЕ ЗАПУСКАЛИСЬ'
    WHEN AVG(vt.watch_percentage) < 10 THEN '❌ ВИДЕО ЗАВИСАЕТ (просмотр < 10%)'
    WHEN COUNT(DISTINCT vt.lesson_id) FILTER (WHERE vt.is_qualified_for_completion = true) > COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.status = 'completed') THEN '❌ БАГ: КВАЛИФИЦИРОВАН НО НЕ ЗАВЕРШИЛ'
    ELSE '✅ ВСЕ РАБОТАЕТ'
  END as diagnosis
  
FROM tripwire_users tu
LEFT JOIN module_unlocks mu ON mu.user_id = tu.user_id
LEFT JOIN student_progress sp ON sp.user_id = tu.user_id
LEFT JOIN video_tracking vt ON vt.user_id = tu.user_id
LEFT JOIN homework_submissions hs ON hs.user_id = tu.user_id
WHERE LOWER(tu.email) IN (
  'sabzhaslan@mail.ru',
  'dyusekengulim@mail.ru',
  'altitudefive@yandex.ru'
)
GROUP BY tu.id, tu.email, tu.full_name, tu.status, tu.modules_completed, tu.onboarding_completed, tu.updated_at
ORDER BY tu.email;

\echo ''
\echo '==========================================='
\echo '📊 ДОПОЛНИТЕЛЬНЫЕ ПРОВЕРКИ'
\echo '==========================================='

-- =========================================
-- 8. ПРОВЕРКА НЕСООТВЕТСТВИЙ
-- =========================================
\echo '📊 8. Проверяем несоответствия между таблицами...'

WITH user_stats AS (
  SELECT 
    tu.email,
    tu.modules_completed as tripwire_count,
    COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.status = 'completed') as progress_count,
    COUNT(DISTINCT vt.lesson_id) FILTER (WHERE vt.watch_percentage >= 80) as video_count
  FROM tripwire_users tu
  LEFT JOIN student_progress sp ON sp.user_id = tu.user_id
  LEFT JOIN video_tracking vt ON vt.user_id = tu.user_id
  WHERE LOWER(tu.email) IN (
    'sabzhaslan@mail.ru',
    'dyusekengulim@mail.ru',
    'altitudefive@yandex.ru'
  )
  GROUP BY tu.email, tu.modules_completed
)
SELECT 
  email,
  tripwire_count as "tripwire_users.modules_completed",
  progress_count as "student_progress (completed)",
  video_count as "video_tracking (80%+)",
  CASE 
    WHEN tripwire_count != progress_count THEN '❌ НЕСООТВЕТСТВИЕ: tripwire_users vs student_progress'
    WHEN progress_count != video_count THEN '❌ НЕСООТВЕТСТВИЕ: student_progress vs video_tracking'
    ELSE '✅ ВСЕ СИНХРОНИЗИРОВАНО'
  END as diagnosis
FROM user_stats
ORDER BY email;

\echo ''
\echo '==========================================='
\echo '✅ ДИАГНОСТИКА ЗАВЕРШЕНА'
\echo '==========================================='
\echo ''
\echo '📋 СЛЕДУЮЩИЕ ШАГИ:'
\echo '1. Проанализируй результаты выше'
\echo '2. Найди строки с ❌ или ⚠️'
\echo '3. Определи root cause проблемы'
\echo '4. Примени соответствующий фикс из TRIPWIRE_CODE_REVIEW_REPORT.md'
\echo ''
