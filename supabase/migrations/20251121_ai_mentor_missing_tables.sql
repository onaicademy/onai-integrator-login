-- ============================================
-- AI-НАСТАВНИК: Недостающие таблицы
-- Дата: 21 ноября 2025
-- Описание: Добавляем критичные таблицы для полноценной работы AI-наставника
-- ============================================

-- ========================================
-- 1. ТАБЛИЦА: user_progress
-- Детальный прогресс студента по урокам
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

  -- Статус урока
  status TEXT DEFAULT 'not_started' NOT NULL
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent INTEGER DEFAULT 0 NOT NULL
    CHECK (progress_percent >= 0 AND progress_percent <= 100),

  -- Видео прогресс
  video_current_second INTEGER DEFAULT 0,
  video_total_seconds INTEGER,
  video_watched_seconds INTEGER DEFAULT 0,

  -- Временные метки
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
CREATE INDEX IF NOT EXISTS idx_user_progress_updated ON user_progress(user_id, updated_at DESC);

COMMENT ON TABLE user_progress IS 'Детальный прогресс студента по каждому уроку';

-- ========================================
-- 2. ТАБЛИЦА: video_watch_sessions
-- Сессии просмотра видео (детальная аналитика)
-- ========================================

CREATE TABLE IF NOT EXISTS public.video_watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  video_id UUID REFERENCES video_content(id) ON DELETE CASCADE,

  -- Детали сессии
  session_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,

  -- Прогресс просмотра
  start_second INTEGER DEFAULT 0,
  end_second INTEGER DEFAULT 0,
  max_second_reached INTEGER DEFAULT 0,

  -- Поведение
  pauses_count INTEGER DEFAULT 0,
  seeks_count INTEGER DEFAULT 0, -- Перемотки
  playback_speed DECIMAL(3,2) DEFAULT 1.0,

  -- Метрики вовлеченности
  engagement_score DECIMAL(3,2), -- 0-1, рассчитывается автоматически
  is_fully_watched BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_sessions_user_id ON video_watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_lesson_id ON video_watch_sessions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_sessions_date ON video_watch_sessions(user_id, session_start DESC);

COMMENT ON TABLE video_watch_sessions IS 'Детальная аналитика просмотра видео-уроков';

-- ========================================
-- 3. ТАБЛИЦА: missions
-- Мини-миссии для студентов
-- ========================================

CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип миссии
  mission_type TEXT NOT NULL CHECK (mission_type IN (
    'complete_lessons', 'watch_videos', 'earn_xp', 'streak_days', 'homework_submit'
  )),

  -- Детали миссии
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0 NOT NULL,

  -- Награда
  xp_reward INTEGER DEFAULT 0 NOT NULL,

  -- Статус
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Миссии могут истекать

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_missions_user_id ON missions(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(user_id, is_completed) WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_missions_expires ON missions(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE missions IS 'Мини-миссии для мотивации студентов';

-- ========================================
-- 4. ТАБЛИЦА: weekly_goals
-- Недельные цели студентов
-- ========================================

CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип цели
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'lessons_completed', 'study_time_minutes', 'modules_completed', 'streak_maintain'
  )),

  -- Целевое значение
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0 NOT NULL,

  -- Период недели
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Статус
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, goal_type, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_id ON weekly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON weekly_goals(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_active ON weekly_goals(user_id, is_completed) WHERE is_completed = false;

COMMENT ON TABLE weekly_goals IS 'Недельные цели студентов (автоматически генерируемые)';

-- ========================================
-- 5. ТАБЛИЦА: daily_challenges
-- Челленджи дня
-- ========================================

CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип челленджа
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji

  -- Награда
  xp_reward INTEGER DEFAULT 0 NOT NULL,

  -- Дата челленджа
  challenge_date DATE NOT NULL,

  -- Статус
  is_accepted BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_active ON daily_challenges(user_id, is_completed)
  WHERE is_completed = false AND is_accepted = true;

COMMENT ON TABLE daily_challenges IS 'Ежедневные челленджи для студентов';

-- ========================================
-- 6. ТАБЛИЦА: curator_knowledge_base
-- База знаний куратора
-- ========================================

CREATE TABLE IF NOT EXISTS public.curator_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Категория знаний
  category TEXT NOT NULL CHECK (category IN (
    'course_faq', 'technical_help', 'motivation', 'study_tips', 'platform_guide'
  )),

  -- Содержимое
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- Ключевые слова для поиска

  -- Связь с контентом
  related_course_id INTEGER REFERENCES courses(id),
  related_module_id INTEGER REFERENCES modules(id),
  related_lesson_id UUID REFERENCES lessons(id),

  -- Метаданные
  priority INTEGER DEFAULT 0, -- Приоритет при выдаче
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0, -- Сколько раз использовалась

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON curator_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_keywords ON curator_knowledge_base USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON curator_knowledge_base(is_active) WHERE is_active = true;

COMMENT ON TABLE curator_knowledge_base IS 'База знаний AI-куратора для ответов на типовые вопросы';

-- ========================================
-- 7. ТАБЛИЦА: student_questions_log
-- Лог всех вопросов студентов
-- ========================================

CREATE TABLE IF NOT EXISTS public.student_questions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Вопрос студента
  question_text TEXT NOT NULL,
  question_category TEXT, -- Автоматически определяется AI

  -- Контекст вопроса
  asked_at_lesson_id UUID REFERENCES lessons(id),
  asked_at_course_id INTEGER REFERENCES courses(id),

  -- Ответ AI
  ai_response TEXT NOT NULL,
  ai_model_used TEXT DEFAULT 'gpt-4o',
  response_time_ms INTEGER,

  -- Метаданные
  openai_thread_id TEXT,
  openai_message_id TEXT,

  -- Оценка студента
  student_rating INTEGER CHECK (student_rating BETWEEN 1 AND 5),
  is_helpful BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_log_user_id ON student_questions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_log_lesson ON student_questions_log(asked_at_lesson_id);
CREATE INDEX IF NOT EXISTS idx_questions_log_date ON student_questions_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_log_category ON student_questions_log(question_category);

COMMENT ON TABLE student_questions_log IS 'Лог всех вопросов студентов к AI-куратору';

-- ========================================
-- 8. ТАБЛИЦА: ai_mentor_advice_log
-- Лог советов от AI-наставника
-- ========================================

CREATE TABLE IF NOT EXISTS public.ai_mentor_advice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип совета
  advice_type TEXT NOT NULL CHECK (advice_type IN (
    'motivation', 'study_plan', 'achievement_tip', 'course_recommendation', 'technical_help'
  )),

  -- Содержимое
  advice_title TEXT NOT NULL,
  advice_content TEXT NOT NULL,

  -- Триггер совета
  triggered_by TEXT, -- 'low_activity', 'achievement_near', 'streak_broken', 'video_rewatch'
  trigger_context JSONB, -- Дополнительные данные

  -- Метаданные
  is_shown BOOLEAN DEFAULT false,
  shown_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_advice_log_user_id ON ai_mentor_advice_log(user_id);
CREATE INDEX IF NOT EXISTS idx_advice_log_type ON ai_mentor_advice_log(advice_type);
CREATE INDEX IF NOT EXISTS idx_advice_log_shown ON ai_mentor_advice_log(user_id, is_shown);

COMMENT ON TABLE ai_mentor_advice_log IS 'Лог всех советов от AI-наставника';

-- ========================================
-- 9. ТАБЛИЦА: ai_mentor_tasks
-- Задачи для AI-наставника
-- ========================================

CREATE TABLE IF NOT EXISTS public.ai_mentor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Триггер задачи
  triggered_by TEXT NOT NULL, -- 'ai_curator_alert', 'analyst_report', 'admin_request', 'video_struggle'

  -- Студент
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Детали задачи
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Контекст
  context_data JSONB, -- { "lesson_id": "...", "rewatch_count": 3, "struggling_at_second": 145 }

  -- Статус
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  result JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mentor_tasks_student ON ai_mentor_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_status ON ai_mentor_tasks(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_priority ON ai_mentor_tasks(priority, created_at DESC);

COMMENT ON TABLE ai_mentor_tasks IS 'Задачи для AI-наставника (автоматически создаются при событиях)';

-- ========================================
-- RLS ПОЛИТИКИ
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

-- curator_knowledge_base (все могут читать)
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

-- Проверка созданных таблиц
SELECT
  '=== НОВЫЕ ТАБЛИЦЫ ===' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'user_progress',
    'video_watch_sessions',
    'missions',
    'weekly_goals',
    'daily_challenges',
    'curator_knowledge_base',
    'student_questions_log',
    'ai_mentor_advice_log',
    'ai_mentor_tasks'
  )
ORDER BY table_name;
