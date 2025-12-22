-- ═══════════════════════════════════════════════════════════
-- 🔓 TRIPWIRE MODULE UNLOCKS - ДИАГНОСТИКА И ПРОВЕРКА
-- ═══════════════════════════════════════════════════════════
-- Используется для проверки статуса разблокировки модулей
-- и диагностики проблем у студентов Tripwire
-- ═══════════════════════════════════════════════════════════

-- 1️⃣ ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ
-- ═══════════════════════════════════════════════════════════
SELECT 
  '1. ПОЛЬЗОВАТЕЛИ TRIPWIRE' as check_name,
  tu.id as tripwire_users_id,
  tu.user_id as auth_users_id,
  tu.email,
  tu.full_name,
  tu.status,
  tu.modules_completed,
  tu.created_at,
  tu.last_active_at
FROM tripwire_users tu
WHERE tu.email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru')
ORDER BY tu.email;

-- 2️⃣ ПРОВЕРКА РАЗБЛОКИРОВАННЫХ МОДУЛЕЙ
-- ═══════════════════════════════════════════════════════════
SELECT 
  '2. РАЗБЛОКИРОВАННЫЕ МОДУЛИ' as check_name,
  tu.email,
  tu.user_id as auth_users_id,
  mu.module_id,
  mu.unlocked_at,
  AGE(NOW(), mu.unlocked_at) as time_since_unlock
FROM tripwire_users tu
LEFT JOIN module_unlocks mu ON mu.user_id = tu.user_id
WHERE tu.email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru')
ORDER BY tu.email, mu.module_id;

-- 3️⃣ ПРОВЕРКА ПРОГРЕССА ПО УРОКАМ
-- ═══════════════════════════════════════════════════════════
SELECT 
  '3. ПРОГРЕСС ПО УРОКАМ' as check_name,
  tu.email,
  tp.module_id,
  tp.lesson_id,
  tp.is_completed,
  tp.video_progress_percent,
  tp.completed_at,
  tp.watch_time_seconds
FROM tripwire_users tu
LEFT JOIN tripwire_progress tp ON tp.tripwire_user_id = tu.user_id
WHERE tu.email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru')
ORDER BY tu.email, tp.module_id, tp.lesson_id;

-- 4️⃣ ПРОВЕРКА ДОСТИЖЕНИЙ
-- ═══════════════════════════════════════════════════════════
SELECT 
  '4. ДОСТИЖЕНИЯ' as check_name,
  tu.email,
  ua.achievement_id,
  ua.is_completed,
  ua.completed_at
FROM tripwire_users tu
LEFT JOIN user_achievements ua ON ua.user_id = tu.user_id
WHERE tu.email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru')
  AND ua.achievement_id LIKE '%module%'
ORDER BY tu.email, ua.achievement_id;

-- 5️⃣ СВОДНАЯ ТАБЛИЦА: ВСЁ ВМЕСТЕ
-- ═══════════════════════════════════════════════════════════
SELECT 
  '5. СВОДКА' as check_name,
  tu.email,
  tu.full_name,
  tu.status,
  COUNT(DISTINCT mu.module_id) as unlocked_modules_count,
  COUNT(DISTINCT CASE WHEN tp.is_completed THEN tp.lesson_id END) as completed_lessons_count,
  STRING_AGG(DISTINCT mu.module_id::text, ', ' ORDER BY mu.module_id::text) as unlocked_module_ids,
  STRING_AGG(DISTINCT CASE WHEN tp.is_completed THEN tp.lesson_id::text END, ', ' 
    ORDER BY CASE WHEN tp.is_completed THEN tp.lesson_id::text END) as completed_lesson_ids
FROM tripwire_users tu
LEFT JOIN module_unlocks mu ON mu.user_id = tu.user_id
LEFT JOIN tripwire_progress tp ON tp.tripwire_user_id = tu.user_id
WHERE tu.email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru')
GROUP BY tu.email, tu.full_name, tu.status
ORDER BY tu.email;

-- 6️⃣ ПРОВЕРКА API RESPONSE (что вернёт endpoint)
-- ═══════════════════════════════════════════════════════════
-- Это то, что должен вернуть GET /api/tripwire/module-unlocks/:userId
SELECT 
  '6. API RESPONSE (module-unlocks)' as check_name,
  json_agg(
    json_build_object(
      'id', mu.id,
      'user_id', mu.user_id,
      'module_id', mu.module_id,
      'unlocked_at', mu.unlocked_at
    ) ORDER BY mu.unlocked_at DESC
  ) as expected_api_response,
  tu.email,
  tu.user_id as use_this_id_in_api_call
FROM tripwire_users tu
LEFT JOIN module_unlocks mu ON mu.user_id = tu.user_id
WHERE tu.email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru')
GROUP BY tu.email, tu.user_id
ORDER BY tu.email;

-- ═══════════════════════════════════════════════════════════
-- 🛠️ СКРИПТЫ ДЛЯ ИСПРАВЛЕНИЯ (если нужно)
-- ═══════════════════════════════════════════════════════════

-- 🔓 Разблокировать модуль вручную (если нужно)
-- ═══════════════════════════════════════════════════════════
/*
INSERT INTO module_unlocks (user_id, module_id, unlocked_at)
SELECT 
  tu.user_id,
  18, -- module_id для разблокировки
  NOW()
FROM tripwire_users tu
WHERE tu.email = 'email@example.com'
ON CONFLICT (user_id, module_id) DO NOTHING;
*/

-- 🔄 Обновить статус modules_completed
-- ═══════════════════════════════════════════════════════════
/*
UPDATE tripwire_users
SET modules_completed = (
  SELECT COUNT(DISTINCT lesson_id)
  FROM tripwire_progress
  WHERE tripwire_user_id = tripwire_users.user_id
    AND is_completed = true
),
updated_at = NOW()
WHERE email IN ('mzaidenova@gmail.com', 'dyusekengulim@mail.ru');
*/

-- 🔑 Установить временный пароль для тестирования
-- ═══════════════════════════════════════════════════════════
/*
UPDATE tripwire_users
SET generated_password = 'Test2025!',
    password_changed = false,
    updated_at = NOW()
WHERE email = 'email@example.com'
RETURNING email, generated_password;
*/

-- ═══════════════════════════════════════════════════════════
-- 📝 РЕЗУЛЬТАТЫ
-- ═══════════════════════════════════════════════════════════
-- После выполнения этого скрипта вы должны увидеть:
-- 
-- ✅ Все 3 модуля (16, 17, 18) разблокированы
-- ✅ Уроки завершены (lesson_id 67 как минимум)
-- ✅ Достижения созданы (first_module_complete, second_module_complete)
-- ✅ auth_users_id совпадает с user_id в module_unlocks
-- 
-- Если что-то не так, используйте скрипты исправления выше.
-- ═══════════════════════════════════════════════════════════
