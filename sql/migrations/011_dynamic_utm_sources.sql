-- Migration 011: Dynamic UTM Sources & Multi-Product Support
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Created: 2026-01-03
-- Purpose: Remove hardcoded UTM mappings, enable dynamic UTM configuration per user
--
-- НОВАЯ АРХИТЕКТУРА:
-- 1. Один таргетолог может иметь НЕСКОЛЬКО utm_source (для разных кампаний)
-- 2. Один таргетолог может работать с НЕСКОЛЬКИМИ продуктами (express, challenge3d, intensive1d)
-- 3. UTM привязка происходит при подключении рекламного кабинета

-- ==========================================
-- 1. CREATE UTM SOURCES TABLE
-- ==========================================
-- Хранит связь: пользователь -> utm_source -> продукт

CREATE TABLE IF NOT EXISTS traffic_user_utm_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,

  -- UTM Configuration
  utm_source TEXT NOT NULL,
  utm_medium TEXT,  -- Опционально, для более точной фильтрации

  -- Какой продукт отслеживает этот utm_source
  funnel_type TEXT NOT NULL CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d')),

  -- Facebook Ads связь (опционально)
  fb_ad_account_id TEXT,
  fb_campaign_ids TEXT[],  -- Массив ID кампаний

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность: один utm_source может быть привязан только к одному пользователю для одного продукта
  UNIQUE(utm_source, funnel_type)
);

-- ==========================================
-- 2. CREATE INDEXES
-- ==========================================

-- Быстрый поиск по utm_source
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_utm
ON traffic_user_utm_sources(utm_source)
WHERE is_active = TRUE;

-- Быстрый поиск по user_id
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_user
ON traffic_user_utm_sources(user_id)
WHERE is_active = TRUE;

-- Поиск по продукту
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_funnel
ON traffic_user_utm_sources(funnel_type, is_active);

-- Композитный для поиска: какой пользователь владеет utm_source для продукта
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_lookup
ON traffic_user_utm_sources(utm_source, funnel_type, is_active)
WHERE is_active = TRUE;

-- ==========================================
-- 3. ADD ENABLED FUNNELS TO USERS
-- ==========================================
-- Чекбоксы: какие продукты запускает таргетолог

ALTER TABLE traffic_users
  ADD COLUMN IF NOT EXISTS enabled_funnels TEXT[] DEFAULT ARRAY['express']::TEXT[],
  ADD COLUMN IF NOT EXISTS primary_funnel_type TEXT CHECK (primary_funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL));

-- Constraint для проверки валидных значений в массиве
-- (PostgreSQL не поддерживает CHECK на элементы массива напрямую, используем trigger)

-- ==========================================
-- 4. CREATE HELPER FUNCTION
-- ==========================================
-- Функция для получения user_id по utm_source и funnel_type

CREATE OR REPLACE FUNCTION get_user_by_utm(
  p_utm_source TEXT,
  p_funnel_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_funnel_type IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM traffic_user_utm_sources
    WHERE utm_source = p_utm_source
      AND funnel_type = p_funnel_type
      AND is_active = TRUE
    LIMIT 1;
  ELSE
    SELECT user_id INTO v_user_id
    FROM traffic_user_utm_sources
    WHERE utm_source = p_utm_source
      AND is_active = TRUE
    LIMIT 1;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. CREATE VIEW FOR EASY QUERYING
-- ==========================================

CREATE OR REPLACE VIEW v_user_utm_mapping AS
SELECT
  u.id as user_id,
  u.email,
  u.full_name,
  u.team_name,
  u.enabled_funnels,
  uu.utm_source,
  uu.utm_medium,
  uu.funnel_type,
  uu.fb_ad_account_id,
  uu.is_active
FROM traffic_users u
LEFT JOIN traffic_user_utm_sources uu ON u.id = uu.user_id
WHERE u.is_active = TRUE;

-- ==========================================
-- 6. ADD COMMENTS
-- ==========================================

COMMENT ON TABLE traffic_user_utm_sources IS 'Dynamic UTM source mapping: links utm_source to users and products';
COMMENT ON COLUMN traffic_user_utm_sources.utm_source IS 'UTM source value (e.g., kenjifb, fbarystan, alex_FB)';
COMMENT ON COLUMN traffic_user_utm_sources.funnel_type IS 'Which product this UTM tracks: express, challenge3d, or intensive1d';
COMMENT ON COLUMN traffic_user_utm_sources.fb_ad_account_id IS 'Facebook Ads account ID if linked';
COMMENT ON COLUMN traffic_users.enabled_funnels IS 'Array of enabled product funnels for this user (checkboxes)';
COMMENT ON COLUMN traffic_users.primary_funnel_type IS 'Primary/default funnel type for this user';

-- ==========================================
-- 7. MIGRATION: MOVE EXISTING DATA
-- ==========================================
-- Перенос существующих utm_source из traffic_users в новую таблицу

INSERT INTO traffic_user_utm_sources (user_id, utm_source, funnel_type)
SELECT
  id as user_id,
  utm_source,
  COALESCE(funnel_type, 'express') as funnel_type
FROM traffic_users
WHERE utm_source IS NOT NULL
  AND utm_source != ''
ON CONFLICT (utm_source, funnel_type) DO NOTHING;

-- Обновить enabled_funnels на основе существующего funnel_type
UPDATE traffic_users
SET
  enabled_funnels = ARRAY[COALESCE(funnel_type, 'express')]::TEXT[],
  primary_funnel_type = COALESCE(funnel_type, 'express')
WHERE funnel_type IS NOT NULL;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check new table structure:
-- SELECT * FROM traffic_user_utm_sources LIMIT 10;

-- Check view:
-- SELECT * FROM v_user_utm_mapping;

-- Test get_user_by_utm function:
-- SELECT get_user_by_utm('kenjifb', 'challenge3d');
