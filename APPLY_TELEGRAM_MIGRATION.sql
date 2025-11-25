-- ✅ TELEGRAM MIGRATION FIX
-- Применяем миграцию добавления Telegram колонок к таблице users

-- 1. Добавляем колонки если их нет
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_verification_token TEXT;

-- 2. Создаём UNIQUE constraint отдельно (если колонки уже существуют)
DO $$ 
BEGIN
    -- Unique constraint для telegram_user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_telegram_user_id_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_telegram_user_id_key UNIQUE (telegram_user_id);
    END IF;

    -- Unique constraint для telegram_verification_token
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_telegram_verification_token_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_telegram_verification_token_key UNIQUE (telegram_verification_token);
    END IF;
END $$;

-- 3. Создаём индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id 
ON public.users(telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_users_telegram_verification_token 
ON public.users(telegram_verification_token);

-- 4. Добавляем комментарии
COMMENT ON COLUMN public.users.telegram_user_id IS 'Telegram user ID from Telegram API';
COMMENT ON COLUMN public.users.telegram_chat_id IS 'Telegram chat ID for sending messages';
COMMENT ON COLUMN public.users.telegram_connected IS 'True if user connected to Telegram bot';
COMMENT ON COLUMN public.users.telegram_connected_at IS 'Timestamp of last Telegram connection';
COMMENT ON COLUMN public.users.telegram_verification_token IS 'Temporary token for deep link verification';

-- 5. Проверяем что всё создалось
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public'
    AND column_name LIKE 'telegram%'
ORDER BY ordinal_position;






