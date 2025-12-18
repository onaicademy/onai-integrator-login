-- 🏗️ TRAFFIC TEAMS TABLE
-- Таблица команд для Traffic Dashboard

-- Создать таблицу команд
CREATE TABLE IF NOT EXISTS traffic_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  direction TEXT NOT NULL,
  fb_ad_account_id TEXT,
  color TEXT DEFAULT '#00FF88',
  emoji TEXT DEFAULT '📊',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_traffic_teams_name ON traffic_teams(name);
CREATE INDEX IF NOT EXISTS idx_traffic_teams_company ON traffic_teams(company);

-- Функция для автообновления updated_at
CREATE OR REPLACE FUNCTION update_traffic_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trigger_update_traffic_teams_updated_at ON traffic_teams;
CREATE TRIGGER trigger_update_traffic_teams_updated_at
  BEFORE UPDATE ON traffic_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_traffic_teams_updated_at();

-- Комментарии
COMMENT ON TABLE traffic_teams IS 'Команды траффиков (таргетологов)';
COMMENT ON COLUMN traffic_teams.name IS 'Название команды (уникальное)';
COMMENT ON COLUMN traffic_teams.company IS 'Компания (например Nutcab)';
COMMENT ON COLUMN traffic_teams.direction IS 'Направление (nutcab_tripwire, arystan, etc)';
COMMENT ON COLUMN traffic_teams.fb_ad_account_id IS 'Facebook Ad Account ID (опционально)';
COMMENT ON COLUMN traffic_teams.color IS 'Цвет команды в интерфейсе';
COMMENT ON COLUMN traffic_teams.emoji IS 'Эмодзи команды';

-- Добавить начальные команды (если не существуют)
INSERT INTO traffic_teams (name, company, direction, color, emoji) VALUES
  ('Kenesary', 'Nutcab', 'nutcab_tripwire', '#00FF88', '👑'),
  ('Arystan', 'Arystan', 'arystan', '#3B82F6', '⚡'),
  ('Muha', 'OnAI', 'onai_zapusk', '#F59E0B', '🚀'),
  ('Traf4', 'ProfTest', 'proftest', '#8B5CF6', '🎯')
ON CONFLICT (name) DO NOTHING;

-- Добавить поле team_id в traffic_users (если еще нет)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'traffic_users' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE traffic_users ADD COLUMN team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_traffic_users_team_id ON traffic_users(team_id);
  END IF;
END $$;

-- Обновить team_id для существующих пользователей на основе team_name
UPDATE traffic_users u
SET team_id = (
  SELECT t.id 
  FROM traffic_teams t 
  WHERE t.name = u.team_name
  LIMIT 1
)
WHERE team_id IS NULL AND team_name IS NOT NULL;

-- View для удобного просмотра команд с количеством пользователей
CREATE OR REPLACE VIEW traffic_teams_with_users AS
SELECT 
  t.*,
  COUNT(u.id) as user_count,
  STRING_AGG(u.email, ', ') as user_emails
FROM traffic_teams t
LEFT JOIN traffic_users u ON u.team_id = t.id
GROUP BY t.id
ORDER BY t.created_at DESC;

COMMENT ON VIEW traffic_teams_with_users IS 'Команды с подсчетом пользователей';
