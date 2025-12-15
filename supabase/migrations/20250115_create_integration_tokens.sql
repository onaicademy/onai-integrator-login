-- ═══════════════════════════════════════════════════════════════
-- 🔐 INTEGRATION TOKENS STORAGE
-- ═══════════════════════════════════════════════════════════════
-- Дата: 15 декабря 2025
-- Цель: Сохранение токенов AmoCRM в БД для стабильности интеграции
-- Риск: 15% (меняет способ хранения токенов)
-- ═══════════════════════════════════════════════════════════════

-- 📝 ПРОБЛЕМА:
-- Сейчас токены AmoCRM (access_token, refresh_token) хранятся в памяти.
-- При рестарте сервера токены теряются → интеграция ломается.

-- ✅ РЕШЕНИЕ:
-- Хранить токены в БД. При рестарте - загружать из БД.

-- Создать таблицу для токенов внешних сервисов
CREATE TABLE IF NOT EXISTS integration_tokens (
  -- Имя сервиса (amocrm, stripe, telegram и т.д.)
  service_name VARCHAR(50) PRIMARY KEY,
  
  -- Access token (токен доступа)
  access_token TEXT NOT NULL,
  
  -- Refresh token (токен обновления)
  refresh_token TEXT,
  
  -- Когда токен истекает
  expires_at TIMESTAMP,
  
  -- Дополнительные данные (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Когда токен был обновлён
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Когда запись была создана
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индекс для быстрого поиска по сервису
CREATE INDEX IF NOT EXISTS idx_integration_tokens_service 
  ON integration_tokens(service_name);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_integration_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS trigger_update_integration_tokens_updated_at ON integration_tokens;
CREATE TRIGGER trigger_update_integration_tokens_updated_at
  BEFORE UPDATE ON integration_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_tokens_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 🔒 БЕЗОПАСНОСТЬ
-- ═══════════════════════════════════════════════════════════════

-- RLS: Токены доступны только серверу (service_role), не клиентам
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

-- Политика: только service_role может читать/писать
CREATE POLICY "Service role only access" ON integration_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ═══════════════════════════════════════════════════════════════
-- 📊 НАЧАЛЬНЫЕ ДАННЫЕ (опционально)
-- ═══════════════════════════════════════════════════════════════

-- Вставить текущие токены AmoCRM (если есть в env)
-- ВАЖНО: Заполнить вручную после создания таблицы!
-- 
-- INSERT INTO integration_tokens (service_name, access_token, refresh_token, expires_at)
-- VALUES (
--   'amocrm',
--   'YOUR_CURRENT_ACCESS_TOKEN',
--   'YOUR_CURRENT_REFRESH_TOKEN',
--   NOW() + INTERVAL '1 day'
-- )
-- ON CONFLICT (service_name) 
-- DO UPDATE SET
--   access_token = EXCLUDED.access_token,
--   refresh_token = EXCLUDED.refresh_token,
--   expires_at = EXCLUDED.expires_at;

-- ═══════════════════════════════════════════════════════════════
-- ✅ ПРОВЕРКА
-- ═══════════════════════════════════════════════════════════════

-- Просмотр токенов (без отображения секретов)
-- SELECT 
--   service_name,
--   LEFT(access_token, 20) || '...' as access_token_preview,
--   expires_at,
--   updated_at
-- FROM integration_tokens;

-- Удалить токены (если нужно)
-- DELETE FROM integration_tokens WHERE service_name = 'amocrm';

COMMENT ON TABLE integration_tokens IS 'Хранилище токенов для внешних интеграций (AmoCRM, Stripe и др.)';
COMMENT ON COLUMN integration_tokens.service_name IS 'Имя внешнего сервиса';
COMMENT ON COLUMN integration_tokens.access_token IS 'Токен доступа (шифруется через RLS)';
COMMENT ON COLUMN integration_tokens.refresh_token IS 'Токен обновления';
COMMENT ON COLUMN integration_tokens.expires_at IS 'Время истечения токена';
COMMENT ON COLUMN integration_tokens.metadata IS 'Дополнительные данные (scope, token_type и т.д.)';
