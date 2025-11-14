-- =====================================================
-- ИСПРАВЛЕНИЕ: Установить onboarding_completed для существующих пользователей
-- =====================================================

-- Проверяем, существует ли колонка onboarding_completed
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'onboarding_completed';

-- Если колонки нет - добавляем (на всякий случай)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Устанавливаем onboarding_completed = TRUE для всех существующих пользователей
-- (они уже использовали платформу, им не нужен онбординг)
UPDATE public.users
SET onboarding_completed = TRUE
WHERE onboarding_completed IS NULL 
   OR created_at < NOW() - INTERVAL '1 hour'; -- Созданы больше часа назад

-- Устанавливаем onboarding_completed = FALSE для новых пользователей
-- (созданы недавно и ещё не проходили онбординг)
UPDATE public.users
SET onboarding_completed = FALSE
WHERE onboarding_completed IS NULL 
   AND created_at >= NOW() - INTERVAL '1 hour'; -- Созданы меньше часа назад

-- =====================================================
-- ПРОВЕРКА
-- =====================================================

-- Посмотреть статус всех пользователей
SELECT 
  id,
  email,
  full_name,
  role,
  onboarding_completed,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- ГОТОВО!
-- =====================================================

