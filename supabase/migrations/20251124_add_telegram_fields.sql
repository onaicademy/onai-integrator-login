-- Migration: Add Telegram fields to users table
-- Created: 2025-11-24
-- Purpose: Store Telegram user_id, chat_id, and connection status

-- Add Telegram fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS telegram_user_id BIGINT UNIQUE,
ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT,
ADD COLUMN IF NOT EXISTS telegram_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS telegram_connected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS telegram_verification_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON public.users(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_users_telegram_verification_token ON public.users(telegram_verification_token);

-- Add comment
COMMENT ON COLUMN public.users.telegram_user_id IS 'Telegram user ID from Telegram API';
COMMENT ON COLUMN public.users.telegram_chat_id IS 'Telegram chat ID for sending messages';
COMMENT ON COLUMN public.users.telegram_connected IS 'Is Telegram bot connected to this user';
COMMENT ON COLUMN public.users.telegram_verification_token IS 'Temporary token for deep link verification';






