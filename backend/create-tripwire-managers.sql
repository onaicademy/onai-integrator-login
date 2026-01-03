-- =====================================================
-- СОЗДАНИЕ МЕНЕДЖЕРОВ В TRIPWIRE AUTH.USERS
-- =====================================================
-- Этот скрипт создает записи для менеджеров в auth.users Tripwire БД
-- 
-- ВАЖНО: Этот скрипт нужно выполнить через Supabase Management API
-- или через Service Role, так как auth.users - системная таблица
-- =====================================================

-- =====================================================
-- ШАГ 1: Создаем временную таблицу для UUID менеджеров
-- =====================================================
CREATE TEMP TABLE IF NOT EXISTS temp_manager_uuids (
  email TEXT PRIMARY KEY,
  new_uuid UUID,
  role TEXT,
  is_sales_manager BOOLEAN
);

-- =====================================================
-- ШАГ 2: Генерируем UUID для каждого менеджера
-- =====================================================
INSERT INTO temp_manager_uuids (email, new_uuid, role, is_sales_manager)
VALUES
  ('admin@onai.academy', gen_random_uuid(), 'admin', true),
  ('arystan@onai.academy', gen_random_uuid(), 'targetologist', true),
  ('muha@onai.academy', gen_random_uuid(), 'targetologist', true),
  ('traft4@onai.academy', gen_random_uuid(), 'targetologist', true),
  ('kenesary@onai.academy', gen_random_uuid(), 'targetologist', true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- ШАГ 3: Создаем записи в auth.users (через Management API)
-- =====================================================
-- ВНИМАНИЕ: Этот раздел нужно выполнить через Supabase Management API
-- или через Service Role, так как auth.users - системная таблица

-- Пример для создания через Management API (TypeScript):
/*
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://pjmvxecykysfrzppdcto.supabase.co',
  'YOUR_SERVICE_ROLE_KEY',
  { auth: { autoRefreshToken: false } }
);

// Создаем менеджеров
const managers = [
  { email: 'admin@onai.academy', role: 'admin', is_sales_manager: true },
  { email: 'arystan@onai.academy', role: 'targetologist', is_sales_manager: true },
  { email: 'muha@onai.academy', role: 'targetologist', is_sales_manager: true },
  { email: 'traft4@onai.academy', role: 'targetologist', is_sales_manager: true },
  { email: 'kenesary@onai.academy', role: 'targetologist', is_sales_manager: true }
];

for (const manager of managers) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: manager.email,
    email_confirm: true,
    user_metadata: {
      role: manager.role,
      platform: 'traffic_dashboard',
      is_sales_manager: manager.is_sales_manager
    }
  });
  
  if (error) {
    console.error(`Ошибка создания ${manager.email}:`, error);
  } else {
    console.log(`Создан менеджер: ${manager.email}, ID: ${data.user.id}`);
  }
}
*/

-- =====================================================
-- ШАГ 4: Обновляем granted_by в tripwire_users
-- =====================================================
-- После создания менеджеров в auth.users, выполняем этот SQL

-- Сначала обновляем temp_manager_uuids с реальными UUID из auth.users
UPDATE temp_manager_uuids tm
SET new_uuid = (
  SELECT au.id
  FROM auth.users au
  WHERE au.email = tm.email
)
WHERE EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.email = tm.email
);

-- Теперь обновляем granted_by в tripwire_users
UPDATE public.tripwire_users
SET granted_by = tm.new_uuid
FROM temp_manager_uuids tm
WHERE tripwire_users.manager_name = (
  CASE tm.email
    WHEN 'admin@onai.academy' THEN 'Admin'
    WHEN 'arystan@onai.academy' THEN 'Arystan'
    WHEN 'muha@onai.academy' THEN 'Muha'
    WHEN 'traft4@onai.academy' THEN 'Traft4'
    WHEN 'kenesary@onai.academy' THEN 'Kenesary'
  END
)
OR tripwire_users.granted_by IS NULL;

-- =====================================================
-- ШАГ 5: Проверка результатов
-- =====================================================

-- Проверяем, что все менеджеры созданы в auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' AS role,
  raw_user_meta_data->>'is_sales_manager' AS is_sales_manager,
  created_at
FROM auth.users
WHERE email IN (
  'admin@onai.academy',
  'arystan@onai.academy',
  'muha@onai.academy',
  'traft4@onai.academy',
  'kenesary@onai.academy'
)
ORDER BY created_at;

-- Проверяем, что granted_by обновлен правильно
SELECT 
  id,
  email,
  manager_name,
  granted_by,
  CASE 
    WHEN granted_by IS NULL THEN '❌ NULL'
    WHEN granted_by IN (SELECT id FROM auth.users) THEN '✅ Valid'
    ELSE '⚠️ Invalid'
  END AS granted_by_status
FROM public.tripwire_users
ORDER BY granted_by, email;

-- Статистика по менеджерам
SELECT 
  manager_name,
  COUNT(*) AS student_count,
  COUNT(DISTINCT granted_by) AS unique_managers
FROM public.tripwire_users
WHERE granted_by IS NOT NULL
GROUP BY manager_name
ORDER BY student_count DESC;

-- =====================================================
-- ШАГ 6: Очистка
-- =====================================================
DROP TABLE IF EXISTS temp_manager_uuids;

-- =====================================================
-- РЕЗУЛЬТАТЫ
-- =====================================================
-- После выполнения этого скрипта:
-- 1. Все 5 менеджеров будут созданы в auth.users Tripwire БД
-- 2. Поле granted_by в tripwire_users будет обновлено с правильными UUID
-- 3. Менеджеры смогут авторизоваться через Supabase Auth
-- 4. RPC функции смогут использовать auth.uid() для фильтрации
-- =====================================================
