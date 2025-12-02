CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_feedback JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_status ON user_goals(status);
CREATE INDEX IF NOT EXISTS idx_user_goals_completed_at ON user_goals(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_goals_due_date ON user_goals(due_date);

CREATE OR REPLACE FUNCTION update_user_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_goals_updated_at ON user_goals;
CREATE TRIGGER update_user_goals_updated_at
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_user_goals_updated_at();

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON user_goals;
CREATE POLICY "Users can view own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own goals" ON user_goals;
CREATE POLICY "Users can create own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON user_goals;
CREATE POLICY "Users can update own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON user_goals;
CREATE POLICY "Users can delete own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all goals" ON user_goals;
CREATE POLICY "Admins can view all goals"
  ON user_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'curator')
    )
  );

CREATE TABLE IF NOT EXISTS goal_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achievement_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (
    condition_type IN (
      'goals_completed',
      'goals_weekly',
      'goals_streak',
      'goals_priority_high',
      'goals_before_deadline'
    )
  ),
  condition_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO goal_achievements (achievement_key, title, description, icon, condition_type, condition_value, xp_reward, rarity) VALUES
  ('goal_first', 'Первая цель', 'Выполните свою первую цель', '🎯', 'goals_completed', 1, 50, 'common'),
  ('goal_5', 'Целеустремленный', 'Выполните 5 целей', '⭐', 'goals_completed', 5, 100, 'common'),
  ('goal_10', 'Мастер целей', 'Выполните 10 целей', '🏆', 'goals_completed', 10, 200, 'rare'),
  ('goal_25', 'Легенда продуктивности', 'Выполните 25 целей', '👑', 'goals_completed', 25, 500, 'epic'),
  ('goal_weekly_3', 'Продуктивная неделя', 'Выполните 3 цели за неделю', '📅', 'goals_weekly', 3, 150, 'rare'),
  ('goal_streak_7', 'Семидневный марафон', 'Выполняйте цели 7 дней подряд', '🔥', 'goals_streak', 7, 300, 'epic'),
  ('goal_priority_5', 'Приоритетный подход', 'Выполните 5 приоритетных целей', '🚀', 'goals_priority_high', 5, 250, 'rare'),
  ('goal_deadline_10', 'Пунктуальный', 'Выполните 10 целей до дедлайна', '⏰', 'goals_before_deadline', 10, 200, 'rare')
ON CONFLICT (achievement_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS weekly_goal_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  goals_created INTEGER NOT NULL DEFAULT 0,
  goals_completed INTEGER NOT NULL DEFAULT 0,
  goals_in_progress INTEGER NOT NULL DEFAULT 0,
  goals_overdue INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  ai_productivity_score DECIMAL(3,2),
  ai_feedback TEXT,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_id ON weekly_goal_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week ON weekly_goal_reports(week_start, week_end);

ALTER TABLE weekly_goal_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON weekly_goal_reports;
CREATE POLICY "Users can view own reports"
  ON weekly_goal_reports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all reports" ON weekly_goal_reports;
CREATE POLICY "Admins can view all reports"
  ON weekly_goal_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'curator')
    )
  );

CREATE OR REPLACE FUNCTION analyze_user_goals(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_goals INTEGER;
  v_completed_goals INTEGER;
  v_in_progress_goals INTEGER;
  v_overdue_goals INTEGER;
  v_completion_rate DECIMAL(3,2);
  v_goals_this_week INTEGER;
  v_productivity_score DECIMAL(3,2);
BEGIN
  SELECT COUNT(*) INTO v_total_goals
  FROM user_goals WHERE user_id = p_user_id;
  
  SELECT COUNT(*) INTO v_completed_goals
  FROM user_goals WHERE user_id = p_user_id AND status = 'done';
  
  SELECT COUNT(*) INTO v_in_progress_goals
  FROM user_goals WHERE user_id = p_user_id AND status = 'in_progress';
  
  SELECT COUNT(*) INTO v_overdue_goals
  FROM user_goals
  WHERE user_id = p_user_id AND status != 'done' AND due_date < CURRENT_DATE;
  
  IF v_total_goals > 0 THEN
    v_completion_rate := v_completed_goals::DECIMAL / v_total_goals;
  ELSE
    v_completion_rate := 0;
  END IF;
  
  SELECT COUNT(*) INTO v_goals_this_week
  FROM user_goals
  WHERE user_id = p_user_id
    AND status = 'done'
    AND completed_at >= DATE_TRUNC('week', CURRENT_DATE);
  
  v_productivity_score := LEAST(
    (v_completion_rate * 0.4) +
    (LEAST(v_goals_this_week::DECIMAL / 5, 1) * 0.3) +
    ((1 - (v_overdue_goals::DECIMAL / GREATEST(v_total_goals, 1))) * 0.3),
    1.0
  );
  
  RETURN jsonb_build_object(
    'total_goals', v_total_goals,
    'completed_goals', v_completed_goals,
    'in_progress_goals', v_in_progress_goals,
    'overdue_goals', v_overdue_goals,
    'completion_rate', v_completion_rate,
    'goals_this_week', v_goals_this_week,
    'productivity_score', v_productivity_score
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_goal_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_achievement RECORD;
  v_user_count INTEGER;
  v_unlocked BOOLEAN;
BEGIN
  FOR v_achievement IN 
    SELECT * FROM goal_achievements
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = v_achievement.achievement_key
        AND is_completed = TRUE
    ) INTO v_unlocked;
    
    IF v_unlocked THEN
      CONTINUE;
    END IF;
    
    CASE v_achievement.condition_type
      WHEN 'goals_completed' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id AND status = 'done';
        
      WHEN 'goals_weekly' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id 
          AND status = 'done'
          AND completed_at >= DATE_TRUNC('week', CURRENT_DATE);
          
      WHEN 'goals_priority_high' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id 
          AND status = 'done'
          AND priority = 'high';
          
      WHEN 'goals_before_deadline' THEN
        SELECT COUNT(*) INTO v_user_count
        FROM user_goals
        WHERE user_id = p_user_id 
          AND status = 'done'
          AND due_date IS NOT NULL
          AND completed_at::DATE <= due_date;
          
      ELSE
        CONTINUE;
    END CASE;
    
    IF v_user_count >= v_achievement.condition_value THEN
      INSERT INTO user_achievements (
        user_id, achievement_id, is_completed, current_value, required_value, unlocked_at
      ) VALUES (
        p_user_id, v_achievement.achievement_key, TRUE, v_user_count, v_achievement.condition_value, NOW()
      )
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET is_completed = TRUE, unlocked_at = NOW(), current_value = v_user_count;
      
      UPDATE profiles
      SET xp = xp + v_achievement.xp_reward
      WHERE id = p_user_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION award_xp_for_goal_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_xp_amount INTEGER;
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at := NOW();
    
    v_xp_amount := 20;
    
    IF NEW.priority = 'high' THEN
      v_xp_amount := v_xp_amount + 10;
    END IF;
    
    IF NEW.due_date IS NOT NULL AND NEW.completed_at::DATE <= NEW.due_date THEN
      v_xp_amount := v_xp_amount + 15;
    END IF;
    
    UPDATE profiles
    SET 
      xp = xp + v_xp_amount,
      level = FLOOR((xp + v_xp_amount) / 100) + 1
    WHERE id = NEW.user_id;
    
    UPDATE user_statistics
    SET total_xp = total_xp + v_xp_amount
    WHERE user_id = NEW.user_id;
    
    PERFORM check_goal_achievements(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_xp_for_goal ON user_goals;
CREATE TRIGGER trg_award_xp_for_goal
  BEFORE UPDATE ON user_goals
  FOR EACH ROW
  EXECUTE FUNCTION award_xp_for_goal_completion();



















