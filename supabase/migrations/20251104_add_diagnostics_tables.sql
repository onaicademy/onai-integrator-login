-- Migration: Add tables for AI Diagnostics System
-- Created: 2025-11-04
-- Description: Adds daily_activity and diagnostics_log tables, updates progress table

-- 1. Добавляем поле seconds_watched в таблицу progress (если его еще нет)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'progress' AND column_name = 'seconds_watched'
  ) THEN
    ALTER TABLE progress ADD COLUMN seconds_watched integer DEFAULT 0;
  END IF;
END $$;

-- 2. Создаём таблицу daily_activity (ежедневная активность пользователя)
CREATE TABLE IF NOT EXISTS daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  minutes integer DEFAULT 0,
  lessons_watched integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Уникальность: один пользователь - одна запись на день
  UNIQUE(user_id, date)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON daily_activity(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_activity_date ON daily_activity(date DESC);

-- 3. Создаём таблицу diagnostics_log (лог AI-диагностики)
CREATE TABLE IF NOT EXISTS diagnostics_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  -- Индексы для оптимизации
  CONSTRAINT diagnostics_log_user_date_unique UNIQUE(user_id, created_at)
);

-- Индексы для diagnostics_log
CREATE INDEX IF NOT EXISTS idx_diagnostics_log_user_id ON diagnostics_log(user_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_log_created_at ON diagnostics_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostics_log_user_date ON diagnostics_log(user_id, created_at DESC);

-- 4. Row Level Security для daily_activity
ALTER TABLE daily_activity ENABLE ROW LEVEL SECURITY;

-- Пользователи могут читать только свою активность
CREATE POLICY "Users can view their own daily activity"
  ON daily_activity FOR SELECT
  USING (auth.uid() = user_id);

-- Пользователи могут обновлять свою активность
CREATE POLICY "Users can insert their own daily activity"
  ON daily_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily activity"
  ON daily_activity FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Row Level Security для diagnostics_log
ALTER TABLE diagnostics_log ENABLE ROW LEVEL SECURITY;

-- Пользователи могут читать только свою диагностику
CREATE POLICY "Users can view their own diagnostics"
  ON diagnostics_log FOR SELECT
  USING (auth.uid() = user_id);

-- Только сервисная роль может создавать записи диагностики
-- (обычные пользователи не могут напрямую писать в diagnostics_log)

-- 6. Комментарии к таблицам и полям
COMMENT ON TABLE daily_activity IS 'Ежедневная активность пользователей для расчёта streak и метрик';
COMMENT ON COLUMN daily_activity.minutes IS 'Количество минут, проведённых в обучении за день';
COMMENT ON COLUMN daily_activity.lessons_watched IS 'Количество просмотренных уроков за день';

COMMENT ON TABLE diagnostics_log IS 'Лог AI-диагностики пользователей для персонализированных рекомендаций';
COMMENT ON COLUMN diagnostics_log.data_json IS 'JSON с результатами анализа: streak, avg_minutes, stuck_lessons, recommendations';

-- 7. Функция для автоматического обновления updated_at в daily_activity
CREATE OR REPLACE FUNCTION update_daily_activity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_activity_update_timestamp
  BEFORE UPDATE ON daily_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_activity_timestamp();

