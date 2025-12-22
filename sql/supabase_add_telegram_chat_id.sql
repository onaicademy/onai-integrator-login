-- =====================================================
-- ADD telegram_chat_id to users table
-- =====================================================

-- 1. Добавляем колонку telegram_chat_id
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- 2. Добавляем комментарий
COMMENT ON COLUMN public.users.telegram_chat_id IS 'Telegram chat ID for AI-Mentor notifications. Collected when user starts bot with /start command.';

-- 3. Создаём индекс для быстрого поиска по telegram_chat_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_chat_id 
ON public.users(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;

-- 4. Добавляем UNIQUE constraint (один Telegram ID = один аккаунт)
ALTER TABLE public.users 
ADD CONSTRAINT unique_telegram_chat_id 
UNIQUE (telegram_chat_id);

-- =====================================================
-- UPDATE admin user with your Telegram ID
-- =====================================================

-- Добавляем Telegram ID администратору (saint@onaiacademy.kz)
UPDATE public.users 
SET telegram_chat_id = 789638302 
WHERE email = 'saint@onaiacademy.kz';

-- =====================================================
-- ПРОВЕРКА
-- =====================================================

SELECT 
  email, 
  full_name, 
  telegram_chat_id,
  role
FROM public.users 
WHERE telegram_chat_id IS NOT NULL;

