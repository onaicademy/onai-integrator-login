-- ============================================
-- МИГРАЦИЯ: Добавление системы деактивации и срока действия аккаунта
-- Дата: 2025-11-08
-- Описание: Добавляем поля для управления сроком действия аккаунтов
-- ============================================

-- 1. Добавляем новые колонки в profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- 2. Добавляем комментарии к колонкам
COMMENT ON COLUMN profiles.deleted_at IS 'Дата деактивации аккаунта (NULL если активен)';
COMMENT ON COLUMN profiles.account_expires_at IS 'Дата истечения срока действия аккаунта';
COMMENT ON COLUMN profiles.deactivation_reason IS 'Причина деактивации: manual, expired, violation, etc';

-- 3. Создаём индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_profiles_account_expires_at ON profiles(account_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- 4. Функция для автоматической деактивации истёкших аккаунтов
CREATE OR REPLACE FUNCTION deactivate_expired_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Деактивируем все аккаунты у которых истёк срок
  UPDATE profiles
  SET 
    is_active = false,
    deleted_at = NOW(),
    deactivation_reason = 'expired'
  WHERE 
    account_expires_at IS NOT NULL
    AND account_expires_at < NOW()
    AND is_active = true
    AND deleted_at IS NULL;
    
  RAISE NOTICE 'Деактивировано аккаунтов: %', (
    SELECT COUNT(*) 
    FROM profiles 
    WHERE deactivation_reason = 'expired' 
      AND deleted_at >= NOW() - INTERVAL '1 minute'
  );
END;
$$;

-- 5. Комментарий к функции
COMMENT ON FUNCTION deactivate_expired_accounts() IS 'Автоматически деактивирует аккаунты с истёкшим сроком действия';

-- 6. Для существующих студентов устанавливаем срок 12 месяцев от даты создания
UPDATE profiles
SET account_expires_at = created_at + INTERVAL '12 months'
WHERE role = 'student' 
  AND account_expires_at IS NULL
  AND is_active = true;

-- 7. Вывод статистики
DO $$
DECLARE
  total_students INT;
  active_students INT;
  expired_students INT;
  soon_expire_students INT;
BEGIN
  SELECT COUNT(*) INTO total_students FROM profiles WHERE role = 'student';
  SELECT COUNT(*) INTO active_students FROM profiles WHERE role = 'student' AND is_active = true;
  SELECT COUNT(*) INTO expired_students FROM profiles WHERE role = 'student' AND account_expires_at < NOW();
  SELECT COUNT(*) INTO soon_expire_students FROM profiles WHERE role = 'student' AND account_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days';
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📊 СТАТИСТИКА АККАУНТОВ:';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '👥 Всего студентов: %', total_students;
  RAISE NOTICE '✅ Активных: %', active_students;
  RAISE NOTICE '⏰ Истёк срок: %', expired_students;
  RAISE NOTICE '⚠️ Истекает в течение 7 дней: %', soon_expire_students;
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- ============================================
-- ГОТОВО! ✅
-- 
-- Теперь можно:
-- 1. Устанавливать срок действия при создании студента
-- 2. Деактивировать вручную через UI
-- 3. Автоматически деактивировать истёкшие аккаунты
-- 
-- Для автоматической деактивации каждый день:
-- SELECT cron.schedule('deactivate-expired-accounts', '0 0 * * *', 'SELECT deactivate_expired_accounts()');
-- ============================================

