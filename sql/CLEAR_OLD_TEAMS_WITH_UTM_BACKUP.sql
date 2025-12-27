-- ============================================
-- Очистка старых команд с сохранением UTM-меток
-- Traffic Dashboard - Phase 1
-- ============================================

-- Шаг 1: Создать временную таблицу для сохранения UTM-меток
CREATE TEMP TABLE IF NOT EXISTS temp_utm_backup AS
SELECT 
  id,
  name,
  company,
  direction,
  fb_ad_account_id,
  color,
  emoji,
  created_at,
  updated_at
FROM traffic_teams;

-- Шаг 2: Сохранить UTM-метки в отдельную таблицу для будущего использования
CREATE TABLE IF NOT EXISTS utm_tags_backup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL UNIQUE,
  utm_source TEXT NOT NULL,
  utm_medium TEXT DEFAULT 'cpc',
  company TEXT,
  direction TEXT,
  color TEXT,
  emoji TEXT,
  fb_ad_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставить данные из старых команд
INSERT INTO utm_tags_backup (team_name, utm_source, utm_medium, company, direction, color, emoji, fb_ad_account_id, created_at, updated_at)
SELECT 
  name,
  'fb_' || LOWER(name) as utm_source,  -- Формат: fb_teamname
  'cpc' as utm_medium,
  company,
  direction,
  color,
  emoji,
  fb_ad_account_id,
  created_at,
  updated_at
FROM traffic_teams
WHERE name IN ('Arystan', 'Kenesary', 'Muha', 'Traf4')
ON CONFLICT (team_name) DO NOTHING;

-- Шаг 3: Удалить настройки пользователей этих команд
DELETE FROM traffic_targetologist_settings
WHERE user_id IN (
  SELECT id FROM traffic_users
  WHERE team_name IN ('Arystan', 'Kenesary', 'Muha', 'Traf4')
);

-- Шаг 4: Удалить пользователей этих команд
DELETE FROM traffic_users
WHERE team_name IN ('Arystan', 'Kenesary', 'Muha', 'Traf4');

-- Шаг 5: Удалить команды
DELETE FROM traffic_teams
WHERE name IN ('Arystan', 'Kenesary', 'Muha', 'Traf4');

-- Шаг 6: Сбросить sequence для автоинкремента
SELECT setval('traffic_teams_id_seq', 1, false);

-- ============================================
-- Результаты
-- ============================================

-- Показать сохраненные UTM-метки
SELECT 'Сохраненные UTM-метки:' as info;
SELECT 
  team_name,
  utm_source,
  utm_medium,
  company,
  direction,
  color,
  emoji
FROM utm_tags_backup
ORDER BY team_name;

-- Показать оставшиеся команды
SELECT 'Оставшиеся команды:' as info;
SELECT 
  id,
  name,
  company,
  direction,
  color,
  emoji,
  created_at
FROM traffic_teams
ORDER BY name;

-- Показать оставшихся пользователей
SELECT 'Оставшиеся пользователи:' as info;
SELECT 
  id,
  email,
  full_name,
  team_name,
  role,
  is_active,
  created_at
FROM traffic_users
ORDER BY team_name, email;

-- ============================================
-- Восстановление (если нужно)
-- ============================================

-- Для восстановления команд из backup:
/*
INSERT INTO traffic_teams (name, company, direction, fb_ad_account_id, color, emoji, created_at, updated_at)
SELECT 
  team_name,
  company,
  direction,
  fb_ad_account_id,
  color,
  emoji,
  created_at,
  updated_at
FROM utm_tags_backup;
*/
