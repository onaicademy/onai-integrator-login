-- ============================================
-- ИСПРАВЛЕНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ AI-НАСТАВНИКА
-- Дата: 21 ноября 2025
-- Описание: Создает все недостающие таблицы, функции и триггеры
-- ============================================

-- ========================================
-- РАЗДЕЛ 1: СОЗДАНИЕ НЕДОСТАЮЩИХ ТАБЛИЦ
-- ========================================

-- 1. user_progress
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'not_started' NOT NULL
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent INTEGER DEFAULT 0 NOT NULL
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  
  video_current_second INTEGER DEFAULT 0,
  video_total_seconds INTEGER,
  video_watched_seconds INTEGER DEFAULT 0,
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0 NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(user_id, status);

COMMENT ON TABLE user_progress IS 'Детальный прогресс студента по каждому уроку';

-- 2. video_watch_sessions
CREATE TABLE IF NOT EXISTS public.video_watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  video_id UUID REFERENCES video_content(id) ON DELETE CASCADE,
  
  session_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  
  start_second INTEGER DEFAULT 0,
  end_second INTEGER DEFAULT 0,
  max_second_reached INTEGER DEFAULT 0,
  
  pauses_count INTEGER DEFAULT 0,
  seeks_count INTEGER DEFAULT 0,
  playback_speed DECIMAL(3,2) DEFAULT 1.0,
  
  engagement_score DECIMAL(3,2),
  is_fully_watched BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_user_id ON video_watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_lesson_id ON video_watch_sessions(lesson_id);

COMMENT ON TABLE video_watch_sessions IS 'Детальная аналитика просмотра видео';

-- 3. missions
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  mission_type TEXT NOT NULL CHECK (mission_type IN (
    'complete_lessons', 'watch_videos', 'earn_xp', 'streak_days', 'homework_submit'
  )),
  
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0 NOT NULL,
  
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(user_id, is_completed) WHERE is_completed = false;

COMMENT ON TABLE missions IS 'Мини-миссии для мотивации студентов';

-- 4. weekly_goals
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'lessons_completed', 'study_time_minutes', 'modules_completed', 'streak_maintain'
  )),
  
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0 NOT NULL,
  
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, goal_type, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id ON weekly_goals(user_id);

COMMENT ON TABLE weekly_goals IS 'Недельные цели студентов';

-- 5. daily_challenges
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  challenge_date DATE NOT NULL,
  
  is_accepted BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);

COMMENT ON TABLE daily_challenges IS 'Ежедневные челленджи';

-- 6. curator_knowledge_base
CREATE TABLE IF NOT EXISTS public.curator_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  category TEXT NOT NULL CHECK (category IN (
    'course_faq', 'technical_help', 'motivation', 'study_tips', 'platform_guide'
  )),
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[],
  
  related_course_id INTEGER REFERENCES courses(id),
  related_module_id INTEGER REFERENCES modules(id),
  related_lesson_id UUID REFERENCES lessons(id),
  
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON curator_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON curator_knowledge_base USING GIN (keywords);

COMMENT ON TABLE curator_knowledge_base IS 'База знаний AI-куратора';

-- 7. student_questions_log
CREATE TABLE IF NOT EXISTS public.student_questions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  question_text TEXT NOT NULL,
  question_category TEXT,
  
  asked_at_lesson_id UUID REFERENCES lessons(id),
  asked_at_course_id INTEGER REFERENCES courses(id),
  
  ai_response TEXT NOT NULL,
  ai_model_used TEXT DEFAULT 'gpt-4o',
  response_time_ms INTEGER,
  
  openai_thread_id TEXT,
  openai_message_id TEXT,
  
  student_rating INTEGER CHECK (student_rating BETWEEN 1 AND 5),
  is_helpful BOOLEAN,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_log_user_id ON student_questions_log(user_id);

COMMENT ON TABLE student_questions_log IS 'Лог всех вопросов студентов';

-- 8. ai_mentor_advice_log
CREATE TABLE IF NOT EXISTS public.ai_mentor_advice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  advice_type TEXT NOT NULL CHECK (advice_type IN (
    'motivation', 'study_plan', 'achievement_tip', 'course_recommendation', 'technical_help'
  )),
  
  advice_title TEXT NOT NULL,
  advice_content TEXT NOT NULL,
  
  triggered_by TEXT,
  trigger_context JSONB,
  
  is_shown BOOLEAN DEFAULT false,
  shown_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_advice_log_user_id ON ai_mentor_advice_log(user_id);

COMMENT ON TABLE ai_mentor_advice_log IS 'Лог советов от AI-наставника';

-- 9. ai_mentor_tasks
CREATE TABLE IF NOT EXISTS public.ai_mentor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  triggered_by TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  context_data JSONB,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  result JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mentor_tasks_student ON ai_mentor_tasks(student_id);

COMMENT ON TABLE ai_mentor_tasks IS 'Задачи для AI-наставника';

-- ========================================
-- РАЗДЕЛ 2: RLS ПОЛИТИКИ
-- ========================================

-- user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own progress" ON user_progress;
CREATE POLICY "Users can manage own progress"
  ON user_progress FOR ALL
  USING (auth.uid() = user_id);

-- video_watch_sessions
ALTER TABLE video_watch_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON video_watch_sessions;
CREATE POLICY "Users can view own sessions"
  ON video_watch_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON video_watch_sessions;
CREATE POLICY "Users can insert own sessions"
  ON video_watch_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- missions
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own missions" ON missions;
CREATE POLICY "Users can view own missions"
  ON missions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own missions" ON missions;
CREATE POLICY "Users can manage own missions"
  ON missions FOR ALL
  USING (auth.uid() = user_id);

-- weekly_goals
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own goals" ON weekly_goals;
CREATE POLICY "Users can view own goals"
  ON weekly_goals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own goals" ON weekly_goals;
CREATE POLICY "Users can manage own goals"
  ON weekly_goals FOR ALL
  USING (auth.uid() = user_id);

-- daily_challenges
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own challenges" ON daily_challenges;
CREATE POLICY "Users can view own challenges"
  ON daily_challenges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own challenges" ON daily_challenges;
CREATE POLICY "Users can manage own challenges"
  ON daily_challenges FOR ALL
  USING (auth.uid() = user_id);

-- curator_knowledge_base
ALTER TABLE curator_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view knowledge base" ON curator_knowledge_base;
CREATE POLICY "Anyone can view knowledge base"
  ON curator_knowledge_base FOR SELECT
  USING (is_active = true);

-- student_questions_log
ALTER TABLE student_questions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own questions" ON student_questions_log;
CREATE POLICY "Users can view own questions"
  ON student_questions_log FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own questions" ON student_questions_log;
CREATE POLICY "Users can insert own questions"
  ON student_questions_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ai_mentor_advice_log
ALTER TABLE ai_mentor_advice_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own advice" ON ai_mentor_advice_log;
CREATE POLICY "Users can view own advice"
  ON ai_mentor_advice_log FOR SELECT
  USING (auth.uid() = user_id);

-- ai_mentor_tasks
ALTER TABLE ai_mentor_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON ai_mentor_tasks;
CREATE POLICY "Users can view own tasks"
  ON ai_mentor_tasks FOR SELECT
  USING (auth.uid() = student_id);

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

SELECT 'Таблицы AI-наставника успешно созданы!' as result;

