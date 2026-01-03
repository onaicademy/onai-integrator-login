# MCP Database Migration Prompt - Migration 011

## Цель
Применить миграцию 011 для поддержки динамических UTM источников и мульти-продуктов.

## База данных
**Traffic Supabase**: `oetodaexnjcunklkdlkv`

## Действия для MCP агента

### Шаг 1: Создать таблицу traffic_user_utm_sources

```sql
CREATE TABLE IF NOT EXISTS traffic_user_utm_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  utm_source TEXT NOT NULL,
  utm_medium TEXT,
  funnel_type TEXT NOT NULL CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d')),
  fb_ad_account_id TEXT,
  fb_campaign_ids TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(utm_source, funnel_type)
);
```

### Шаг 2: Создать индексы

```sql
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_utm ON traffic_user_utm_sources(utm_source) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_user ON traffic_user_utm_sources(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_funnel ON traffic_user_utm_sources(funnel_type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_utm_sources_lookup ON traffic_user_utm_sources(utm_source, funnel_type, is_active) WHERE is_active = TRUE;
```

### Шаг 3: Добавить колонки в traffic_users

```sql
ALTER TABLE traffic_users
  ADD COLUMN IF NOT EXISTS enabled_funnels TEXT[] DEFAULT ARRAY['express']::TEXT[],
  ADD COLUMN IF NOT EXISTS primary_funnel_type TEXT CHECK (primary_funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL));
```

### Шаг 4: Создать хелпер-функцию

```sql
CREATE OR REPLACE FUNCTION get_user_by_utm(p_utm_source TEXT, p_funnel_type TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF p_funnel_type IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM traffic_user_utm_sources
    WHERE utm_source = p_utm_source AND funnel_type = p_funnel_type AND is_active = TRUE
    LIMIT 1;
  ELSE
    SELECT user_id INTO v_user_id
    FROM traffic_user_utm_sources
    WHERE utm_source = p_utm_source AND is_active = TRUE
    LIMIT 1;
  END IF;
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
```

### Шаг 5: Мигрировать существующие данные

```sql
-- Перенести utm_source из traffic_users в новую таблицу
INSERT INTO traffic_user_utm_sources (user_id, utm_source, funnel_type)
SELECT id, utm_source, COALESCE(funnel_type, 'express')
FROM traffic_users
WHERE utm_source IS NOT NULL AND utm_source != ''
ON CONFLICT (utm_source, funnel_type) DO NOTHING;

-- Обновить enabled_funnels
UPDATE traffic_users
SET enabled_funnels = ARRAY[COALESCE(funnel_type, 'express')]::TEXT[],
    primary_funnel_type = COALESCE(funnel_type, 'express')
WHERE funnel_type IS NOT NULL;
```

### Шаг 6: Создать View для удобства

```sql
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
```

## Верификация

После выполнения проверить:

```sql
-- Проверить таблицу создана
SELECT COUNT(*) FROM traffic_user_utm_sources;

-- Проверить view работает
SELECT * FROM v_user_utm_mapping LIMIT 5;

-- Проверить функцию работает
SELECT get_user_by_utm('kenjifb', 'challenge3d');
```

## Добавление UTM для тестового пользователя Kenji

После миграции добавить UTM источники для kenji:

```sql
-- Найти user_id для kenji
SELECT id, email, full_name FROM traffic_users WHERE email ILIKE '%kenji%' OR full_name ILIKE '%kenji%';

-- Добавить UTM источники (замените USER_ID на реальный ID)
INSERT INTO traffic_user_utm_sources (user_id, utm_source, funnel_type)
VALUES
  ('USER_ID', 'kenjifb', 'challenge3d'),
  ('USER_ID', 'kenjifb', 'express'),
  ('USER_ID', 'kenji', 'challenge3d');

-- Обновить enabled_funnels
UPDATE traffic_users
SET enabled_funnels = ARRAY['express', 'challenge3d']::TEXT[]
WHERE id = 'USER_ID';
```

## Rollback (если нужно откатить)

```sql
DROP VIEW IF EXISTS v_user_utm_mapping;
DROP FUNCTION IF EXISTS get_user_by_utm;
DROP TABLE IF EXISTS traffic_user_utm_sources;
ALTER TABLE traffic_users DROP COLUMN IF EXISTS enabled_funnels;
ALTER TABLE traffic_users DROP COLUMN IF EXISTS primary_funnel_type;
```
