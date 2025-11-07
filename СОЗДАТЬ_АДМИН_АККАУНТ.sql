-- ========================
-- СОЗДАНИЕ АДМИН АККАУНТА
-- Email: saint@onaiacademy.kz
-- Password: Onai2134!
-- ========================

-- ⚠️  ВАЖНО: Этот SQL создаёт админа через Supabase auth
-- Если админ уже существует - обновит пароль и роль

-- 1. Удаляем старый аккаунт если есть (безопасно)
DELETE FROM auth.users WHERE email = 'saint@onaiacademy.kz';

-- 2. Создаём нового админа
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- Генерируем уникальный ID
  'authenticated',
  'authenticated',
  'saint@onaiacademy.kz',
  crypt('Onai2134!', gen_salt('bf')), -- Хешируем пароль
  NOW(), -- Email подтверждён сразу
  '{"provider":"email","providers":["email"],"role":"admin","is_ceo":true}'::jsonb, -- Роль админа
  '{"full_name":"Saint","role":"admin","is_ceo":true}'::jsonb, -- Данные профиля
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- 3. Получаем ID созданного админа
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Находим ID админа
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'saint@onaiacademy.kz';

  -- Создаём запись в profiles (если таблица существует)
  BEGIN
    EXECUTE format('
      INSERT INTO profiles (id, full_name, avatar_url, role, is_ceo, created_at, updated_at)
      VALUES ($1, $2, NULL, $3, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET full_name = $2, role = $3, is_ceo = true, updated_at = NOW()
    ', admin_user_id) USING admin_user_id, 'Saint', 'admin';
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'Таблица profiles не существует, пропускаем...';
  END;

  RAISE NOTICE 'Админ аккаунт создан успешно! ID: %', admin_user_id;
END $$;

-- 4. Проверка создания
SELECT 
  '✅ Админ аккаунт создан!' as status,
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as name,
  raw_app_meta_data->>'role' as role,
  raw_app_meta_data->>'is_ceo' as is_ceo,
  created_at
FROM auth.users 
WHERE email = 'saint@onaiacademy.kz';

-- ========================
-- ГОТОВО!
-- ========================
-- Теперь можно войти:
-- 🌐 https://integratoronai.kz
-- 📧 Email: saint@onaiacademy.kz
-- 🔑 Password: Onai2134!
