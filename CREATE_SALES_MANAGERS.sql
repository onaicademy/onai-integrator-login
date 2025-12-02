-- ═══════════════════════════════════════════════════════════════
-- SQL СКРИПТ: Создание Sales Managers для Tripwire Dashboard
-- ═══════════════════════════════════════════════════════════════
-- Выполнить в Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ВАЖНО: Эти пользователи создаются через Supabase Auth Admin API
-- Для создания используйте следующие команды через Backend или Supabase Dashboard

-- Метод 1: Через Supabase Dashboard
-- 1. Authentication → Users → Add User
-- 2. Email: amina@onaiacademy.kz, Password: Amina2134
-- 3. User Metadata (JSON):
--    {"role": "sales", "full_name": "Amina Sales Manager"}
-- 4. Confirm Email: YES

-- Метод 2: Через Backend API (Node.js)
-- Используйте этот код в backend/scripts/create-sales-managers.ts

/*
import { adminSupabase } from '../src/config/supabase';

async function createSalesManagers() {
  const managers = [
    {
      email: 'amina@onaiacademy.kz',
      password: 'Amina2134',
      full_name: 'Amina'
    },
    {
      email: 'rakhat@onaiacademy.kz',
      password: 'Rakhat2134',
      full_name: 'Rakhat'
    }
  ];

  for (const manager of managers) {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: manager.email,
      password: manager.password,
      email_confirm: true,
      user_metadata: {
        role: 'sales',
        full_name: manager.full_name,
        position: 'Sales Manager'
      }
    });

    if (error) {
      console.error(`❌ Ошибка создания ${manager.email}:`, error.message);
    } else {
      console.log(`✅ Создан ${manager.email} (ID: ${data.user?.id})`);
    }
  }
}

createSalesManagers();
*/

-- ═══════════════════════════════════════════════════════════════
-- ПРОВЕРКА СОЗДАННЫХ MANAGERS
-- ═══════════════════════════════════════════════════════════════

SELECT 
  id,
  email,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'full_name' as full_name,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN ('amina@onaiacademy.kz', 'rakhat@onaiacademy.kz')
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- СТАТИСТИКА SALES MANAGERS (после создания пользователей)
-- ═══════════════════════════════════════════════════════════════

-- Количество проданных пользователей каждым менеджером
SELECT 
  tu.manager_name,
  tu.granted_by as manager_id,
  COUNT(*) as total_sales,
  COUNT(*) * 5000 as total_revenue_kzt,
  COUNT(CASE WHEN tu.status = 'active' THEN 1 END) as active_users,
  COUNT(CASE WHEN tu.modules_completed = 3 THEN 1 END) as completed_users
FROM tripwire_users tu
GROUP BY tu.granted_by, tu.manager_name
ORDER BY total_sales DESC;

-- Лидерборд Sales Managers за текущий месяц
SELECT 
  tu.manager_name,
  tu.granted_by as manager_id,
  COUNT(*) as sales_this_month,
  COUNT(*) * 5000 as revenue_this_month_kzt
FROM tripwire_users tu
WHERE 
  DATE_TRUNC('month', tu.created_at) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY tu.granted_by, tu.manager_name
ORDER BY sales_this_month DESC;

-- ═══════════════════════════════════════════════════════════════
-- ЕСЛИ НУЖНО ОБНОВИТЬ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
-- ═══════════════════════════════════════════════════════════════

-- Назначить роль sales существующему пользователю
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  '{
    "role": "sales",
    "full_name": "Amina",
    "position": "Sales Manager"
  }'::jsonb
WHERE email = 'amina@onaiacademy.kz';

UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  '{
    "role": "sales",
    "full_name": "Rakhat",
    "position": "Sales Manager"
  }'::jsonb
WHERE email = 'rakhat@onaiacademy.kz';


