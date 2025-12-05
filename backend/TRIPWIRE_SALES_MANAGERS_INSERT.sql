-- ✅ ВСТАВКА SALES MANAGERS В TRIPWIRE DB
-- Выполните этот SQL в Supabase SQL Editor для Tripwire DB

-- Amina (UUID из auth.users Tripwire DB)
INSERT INTO public.users (id, email, full_name, role, platform, created_at, updated_at)
VALUES (
  'fdf3cdc5-a6a5-4105-8922-003eb7ee5bb9',
  'amina@onaiacademy.kz',
  'Amina Sales Manager',
  'sales',
  'tripwire',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Rakhat (UUID из auth.users Tripwire DB)
INSERT INTO public.users (id, email, full_name, role, platform, created_at, updated_at)
VALUES (
  '82ae50d4-46bc-4ca4-842d-fd909aa85620',
  'rakhat@onaiacademy.kz',
  'Rakhat Sales Manager',
  'sales',
  'tripwire',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- ✅ Проверка
SELECT id, email, role, platform FROM public.users WHERE role = 'sales';

