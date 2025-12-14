-- ========================================
-- 🔗 SHORT LINKS TABLE FOR SMS URL SHORTENING
-- ========================================
-- Создаем таблицу для хранения коротких ссылок
-- Цель: экономия на SMS (короткие ссылки) + отслеживание кликов

CREATE TABLE IF NOT EXISTS short_links (
  id TEXT PRIMARY KEY, -- Короткий ID (например: 'a1b2c3')
  
  -- 🔗 URLs
  original_url TEXT NOT NULL, -- Полная ссылка с UTM параметрами
  short_code TEXT UNIQUE NOT NULL, -- Короткий код для URL (6-8 символов)
  
  -- 📊 Tracking Info
  lead_id TEXT, -- ID лида из landing_leads
  campaign TEXT, -- Название кампании (proftest, expresscourse и т.д.)
  source TEXT, -- Источник (sms, email, etc.)
  
  -- 📈 Analytics
  clicks_count INTEGER DEFAULT 0, -- Количество кликов
  unique_ips TEXT[], -- Массив уникальных IP для отслеживания уникальных кликов
  
  -- 🕒 Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_clicked_at TIMESTAMPTZ, -- Время первого клика
  last_clicked_at TIMESTAMPTZ, -- Время последнего клика
  
  -- ⏱️ Expiration
  expires_at TIMESTAMPTZ, -- Опционально: время истечения ссылки
  is_active BOOLEAN DEFAULT TRUE -- Активна ли ссылка
);

-- ========================================
-- 🔗 SHORT LINK CLICKS TABLE (Detailed Analytics)
-- ========================================
-- Детальная таблица для отслеживания каждого клика

CREATE TABLE IF NOT EXISTS short_link_clicks (
  id SERIAL PRIMARY KEY,
  
  -- 🔗 Link Reference
  short_link_id TEXT REFERENCES short_links(id) ON DELETE CASCADE,
  
  -- 📊 Click Info
  ip_address TEXT, -- IP адрес пользователя
  user_agent TEXT, -- User Agent браузера
  referer TEXT, -- Откуда пришел (referer)
  
  -- 🌍 Location (можно добавить IP-геолокацию позже)
  country TEXT,
  city TEXT,
  
  -- 🕒 Timestamp
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 📈 INDEXES FOR PERFORMANCE
-- ========================================

-- Быстрый поиск по короткому коду
CREATE INDEX IF NOT EXISTS idx_short_links_short_code ON short_links(short_code);

-- Быстрый поиск по lead_id
CREATE INDEX IF NOT EXISTS idx_short_links_lead_id ON short_links(lead_id);

-- Быстрый поиск по кампании и источнику
CREATE INDEX IF NOT EXISTS idx_short_links_campaign_source ON short_links(campaign, source);

-- Быстрый поиск кликов по short_link_id
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_link_id ON short_link_clicks(short_link_id);

-- Индекс для фильтрации по дате клика
CREATE INDEX IF NOT EXISTS idx_short_link_clicks_clicked_at ON short_link_clicks(clicked_at DESC);

-- ========================================
-- 🔐 ROW LEVEL SECURITY (RLS)
-- ========================================

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE short_link_clicks ENABLE ROW LEVEL SECURITY;

-- Публичный доступ для чтения (нужно для редиректа)
CREATE POLICY "Allow public read short links" ON short_links
  FOR SELECT USING (true);

-- Только авторизованные пользователи могут создавать короткие ссылки
CREATE POLICY "Allow authenticated insert short links" ON short_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Только сервис может обновлять статистику кликов
CREATE POLICY "Allow service update short links" ON short_links
  FOR UPDATE USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- Публичный доступ для записи кликов (нужно для отслеживания)
CREATE POLICY "Allow public insert clicks" ON short_link_clicks
  FOR INSERT WITH CHECK (true);

-- Только авторизованные пользователи могут читать статистику кликов
CREATE POLICY "Allow authenticated read clicks" ON short_link_clicks
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ========================================
-- 📝 COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE short_links IS 'Таблица для хранения коротких ссылок (URL shortener) для экономии на SMS';
COMMENT ON TABLE short_link_clicks IS 'Детальная таблица для отслеживания каждого клика по короткой ссылке';

COMMENT ON COLUMN short_links.short_code IS 'Короткий уникальный код для URL (6-8 символов)';
COMMENT ON COLUMN short_links.original_url IS 'Полная оригинальная ссылка с UTM параметрами';
COMMENT ON COLUMN short_links.clicks_count IS 'Общее количество кликов по ссылке';
COMMENT ON COLUMN short_links.unique_ips IS 'Массив уникальных IP адресов для подсчета уникальных кликов';

-- ========================================
-- ✅ MIGRATION COMPLETE
-- ========================================

