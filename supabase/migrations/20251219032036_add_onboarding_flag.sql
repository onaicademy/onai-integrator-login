-- ✅ TRIPWIRE ONBOARDING SYSTEM
-- Добавляем флаги для отслеживания прохождения onboarding тура

-- Добавляем флаг onboarding для tripwire_users
ALTER TABLE tripwire_users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Индекс для быстрого поиска пользователей без onboarding
CREATE INDEX IF NOT EXISTS idx_tripwire_users_onboarding 
ON tripwire_users(onboarding_completed) 
WHERE onboarding_completed = FALSE;

-- Комментарии для документации
COMMENT ON COLUMN tripwire_users.onboarding_completed IS 'Прошел ли пользователь onboarding тур';
COMMENT ON COLUMN tripwire_users.onboarding_completed_at IS 'Дата и время завершения onboarding';

-- ✅ Миграция применена: 2025-12-19




