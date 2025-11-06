-- Создание таблиц для системы достижений onAI Academy

-- Таблица прогресса пользователей по достижениям
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  
  -- Прогресс достижения
  current_value INTEGER DEFAULT 0,
  required_value INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- Даты
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность: один пользователь - одно достижение
  UNIQUE(user_id, achievement_id)
);

-- Таблица истории разблокированных достижений
CREATE TABLE IF NOT EXISTS achievement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  
  -- Детали
  xp_earned INTEGER NOT NULL,
  notification_seen BOOLEAN DEFAULT FALSE,
  
  -- Метаданные
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица статистики пользователя (для расчёта достижений)
CREATE TABLE IF NOT EXISTS user_statistics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Обучение
  lessons_completed INTEGER DEFAULT 0,
  modules_completed INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  perfect_lessons INTEGER DEFAULT 0,
  lessons_no_hints INTEGER DEFAULT 0,
  first_try_perfect INTEGER DEFAULT 0,
  high_score_quizzes INTEGER DEFAULT 0,
  
  -- Скорость
  speed_lessons INTEGER DEFAULT 0, -- уроки < 5 минут
  max_lessons_in_day INTEGER DEFAULT 0,
  
  -- Стрики
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  weekend_streak INTEGER DEFAULT 0,
  
  -- XP и уровни
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  
  -- Социальные
  messages_sent INTEGER DEFAULT 0,
  ai_conversations INTEGER DEFAULT 0,
  thanks_received INTEGER DEFAULT 0,
  lessons_shared INTEGER DEFAULT 0,
  bugs_reported INTEGER DEFAULT 0,
  feedback_given INTEGER DEFAULT 0,
  
  -- Исследование
  profile_completion INTEGER DEFAULT 0,
  avatar_uploaded BOOLEAN DEFAULT FALSE,
  neurohub_sections_visited INTEGER DEFAULT 0,
  courses_viewed INTEGER DEFAULT 0,
  bookmarks_created INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  
  -- Практика
  practice_exercises INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  all_exams_passed BOOLEAN DEFAULT FALSE,
  active_courses INTEGER DEFAULT 0,
  
  -- Временные достижения
  early_bird_count INTEGER DEFAULT 0, -- уроки до 8:00
  night_owl_count INTEGER DEFAULT 0, -- уроки после 23:00
  midnight_lessons INTEGER DEFAULT 0, -- уроки в 00:00
  new_year_lessons INTEGER DEFAULT 0,
  birthday_login BOOLEAN DEFAULT FALSE,
  
  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(user_id, is_completed);
CREATE INDEX idx_achievement_history_user_id ON achievement_history(user_id);
CREATE INDEX idx_achievement_history_unlocked_at ON achievement_history(unlocked_at DESC);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at
  BEFORE UPDATE ON user_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои достижения
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievement history"
  ON achievement_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own statistics"
  ON user_statistics FOR SELECT
  USING (auth.uid() = user_id);

-- Админы могут видеть всё
CREATE POLICY "Admins can view all achievements"
  ON user_achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all achievement history"
  ON achievement_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all statistics"
  ON user_statistics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Функция для автоматической инициализации статистики нового пользователя
CREATE OR REPLACE FUNCTION initialize_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_statistics (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_init_statistics
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_statistics();

-- Функция для обновления прогресса достижения
CREATE OR REPLACE FUNCTION update_achievement_progress(
  p_user_id UUID,
  p_achievement_id TEXT,
  p_current_value INTEGER,
  p_required_value INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, current_value, required_value, is_completed, completed_at)
  VALUES (p_user_id, p_achievement_id, p_current_value, p_required_value, 
          p_current_value >= p_required_value,
          CASE WHEN p_current_value >= p_required_value THEN NOW() ELSE NULL END)
  ON CONFLICT (user_id, achievement_id) 
  DO UPDATE SET 
    current_value = GREATEST(user_achievements.current_value, p_current_value),
    is_completed = CASE WHEN GREATEST(user_achievements.current_value, p_current_value) >= p_required_value THEN TRUE ELSE FALSE END,
    completed_at = CASE 
      WHEN user_achievements.is_completed = FALSE AND GREATEST(user_achievements.current_value, p_current_value) >= p_required_value 
      THEN NOW() 
      ELSE user_achievements.completed_at 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарии к таблицам
COMMENT ON TABLE user_achievements IS 'Прогресс пользователей по достижениям';
COMMENT ON TABLE achievement_history IS 'История разблокированных достижений';
COMMENT ON TABLE user_statistics IS 'Статистика активности пользователей для расчёта достижений';

