-- ═══════════════════════════════════════════════════════════════
-- SQL СКРИПТ: Создание тестового Sales менеджера
-- ═══════════════════════════════════════════════════════════════
-- Описание: Назначает роль 'sales' существующему пользователю
--           для доступа к Sales Manager Dashboard
--
-- URL доступа: https://expresscourse.onai.academy/sales-manager
-- Роли: admin, sales
-- ═══════════════════════════════════════════════════════════════

-- ВАРИАНТ 1: Обновить существующего пользователя
-- Замените 'manager@test.com' на реальный email пользователя

UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  '{
    "role": "sales",
    "full_name": "Sales Manager Test"
  }'::jsonb
WHERE email = 'manager@test.com';

-- ВАРИАНТ 2: Проверка текущей роли пользователя
-- Выполните этот запрос чтобы увидеть текущую роль

SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as current_role,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE email = 'manager@test.com';

-- ВАРИАНТ 3: Назначить роль admin (полный доступ)
-- Используйте осторожно! Admin видит всех пользователей всех менеджеров

UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  '{
    "role": "admin",
    "full_name": "Administrator"
  }'::jsonb
WHERE email = 'saint@onaiacademy.kz';

-- ═══════════════════════════════════════════════════════════════
-- ПРОВЕРКА ДОСТУПА
-- ═══════════════════════════════════════════════════════════════

-- Показать всех пользователей с ролями admin и sales
SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('admin', 'sales')
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- ТЕСТИРОВАНИЕ
-- ═══════════════════════════════════════════════════════════════

-- 1. Войдите на платформу с email пользователя (manager@test.com)
-- 2. Откройте URL: https://expresscourse.onai.academy/sales-manager
-- 3. Нажмите кнопку "ДОБАВИТЬ УЧЕНИКА"
-- 4. Создайте тестового пользователя:
--    - ФИО: Иван Тестов
--    - Email: test@example.com
-- 5. Проверьте что пользователь создался:

SELECT 
  full_name,
  email,
  status,
  manager_name,
  welcome_email_sent,
  created_at
FROM tripwire_users
ORDER BY created_at DESC
LIMIT 5;

-- 6. Проверьте лог действий:

SELECT 
  action_type,
  details,
  created_at
FROM sales_activity_log
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- ОТКАТ (если нужно убрать роль sales)
-- ═══════════════════════════════════════════════════════════════

-- Вернуть роль student
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  '{"role": "student"}'::jsonb
WHERE email = 'manager@test.com';

