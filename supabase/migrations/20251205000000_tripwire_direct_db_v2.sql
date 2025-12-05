-- ============================================
-- TRIPWIRE DATABASE SCHEMA v2.0
-- Direct DB Pattern: 90% Direct Query Builder + 10% Strategic RPC
-- Date: 2025-12-05
-- Based on: Perplexity Research
-- ============================================

-- ============================================
-- PART 1: DROP EXISTING (CLEAN START)
-- ============================================

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS update_tripwire_users_updated_at ON public.tripwire_users;
DROP TRIGGER IF EXISTS update_tripwire_profile_updated_at ON public.tripwire_user_profile;
DROP TRIGGER IF EXISTS update_student_progress_updated_at ON public.student_progress;
DROP TRIGGER IF EXISTS update_video_tracking_updated_at ON public.video_tracking;
DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON public.user_statistics;

-- Drop existing functions if any
DROP FUNCTION IF EXISTS initialize_tripwire_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- PART 2: CREATE/UPDATE TABLES
-- ============================================

-- 1. PUBLIC.USERS (основная таблица пользователей)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'sales_manager', 'admin', 'curator', 'tech_support')),
  telegram_chat_id BIGINT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_email;

-- Create indexes
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- 2. TRIPWIRE_USERS (студенты Tripwire)
CREATE TABLE IF NOT EXISTS public.tripwire_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id), -- Sales Manager ID
  manager_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  modules_completed INTEGER DEFAULT 0 CHECK (modules_completed >= 0 AND modules_completed <= 3),
  price NUMERIC DEFAULT 5000 CHECK (price >= 0),
  welcome_email_sent BOOLEAN DEFAULT false,
  welcome_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_tripwire_users_user_id;
DROP INDEX IF EXISTS idx_tripwire_users_granted_by;
DROP INDEX IF EXISTS idx_tripwire_users_status;
DROP INDEX IF EXISTS idx_tripwire_users_created_at;

-- Критически важные индексы для производительности
CREATE INDEX idx_tripwire_users_user_id ON public.tripwire_users(user_id);
CREATE INDEX idx_tripwire_users_granted_by ON public.tripwire_users(granted_by);
CREATE INDEX idx_tripwire_users_status ON public.tripwire_users(status) WHERE status = 'active';
CREATE INDEX idx_tripwire_users_created_at ON public.tripwire_users(created_at DESC);

-- 3. TRIPWIRE_USER_PROFILE (профиль студента)
CREATE TABLE IF NOT EXISTS public.tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_modules INTEGER DEFAULT 3,
  modules_completed INTEGER DEFAULT 0 CHECK (modules_completed >= 0 AND modules_completed <= 3),
  completion_percentage NUMERIC DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_tripwire_profile_user_id;

CREATE INDEX idx_tripwire_profile_user_id ON public.tripwire_user_profile(user_id);

-- 4. MODULE_UNLOCKS (открытые модули)
CREATE TABLE IF NOT EXISTS public.module_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL CHECK (module_id IN (16, 17, 18)),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_module_unlocks_user_id;
DROP INDEX IF EXISTS idx_module_unlocks_composite;

CREATE INDEX idx_module_unlocks_user_id ON public.module_unlocks(user_id);
CREATE INDEX idx_module_unlocks_composite ON public.module_unlocks(user_id, module_id);

-- 5. STUDENT_PROGRESS (прогресс по урокам)
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL CHECK (module_id IN (16, 17, 18)),
  lesson_id INTEGER NOT NULL CHECK (lesson_id IN (67, 68, 69)),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_student_progress_user_id;
DROP INDEX IF EXISTS idx_student_progress_composite;
DROP INDEX IF EXISTS idx_student_progress_status;

CREATE INDEX idx_student_progress_user_id ON public.student_progress(user_id);
CREATE INDEX idx_student_progress_composite ON public.student_progress(user_id, lesson_id);
CREATE INDEX idx_student_progress_status ON public.student_progress(user_id, status) WHERE status = 'completed';

-- 6. VIDEO_TRACKING (честный трекинг видео с 80% правилом)
CREATE TABLE IF NOT EXISTS public.video_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL CHECK (lesson_id IN (67, 68, 69)),
  watched_segments JSONB DEFAULT '[]'::jsonb, -- [{start: 10, end: 25}, ...]
  total_watched_seconds INTEGER DEFAULT 0 CHECK (total_watched_seconds >= 0),
  video_duration_seconds INTEGER DEFAULT 0 CHECK (video_duration_seconds >= 0),
  watch_percentage INTEGER DEFAULT 0 CHECK (watch_percentage >= 0 AND watch_percentage <= 100),
  last_position_seconds INTEGER DEFAULT 0 CHECK (last_position_seconds >= 0),
  is_qualified_for_completion BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_video_tracking_user_lesson;
DROP INDEX IF EXISTS idx_video_tracking_segments;

-- КРИТИЧЕСКИ ВАЖНО: GIN индекс для JSONB поиска
CREATE INDEX idx_video_tracking_user_lesson ON public.video_tracking(user_id, lesson_id);
CREATE INDEX idx_video_tracking_segments ON public.video_tracking USING GIN (watched_segments jsonb_path_ops);

-- 7. USER_ACHIEVEMENTS (достижения)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL CHECK (achievement_id IN ('first_module_complete', 'second_module_complete', 'third_module_complete', 'tripwire_graduate')),
  current_value INTEGER DEFAULT 0,
  required_value INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_user_achievements_user_id;
DROP INDEX IF EXISTS idx_user_achievements_composite;

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_composite ON public.user_achievements(user_id, achievement_id);

-- 8. USER_STATISTICS (общая статистика)
CREATE TABLE IF NOT EXISTS public.user_statistics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0 CHECK (lessons_completed >= 0),
  total_time_spent INTEGER DEFAULT 0 CHECK (total_time_spent >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SALES_ACTIVITY_LOG (логи действий Sales Manager)
CREATE TABLE IF NOT EXISTS public.sales_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('user_created', 'user_status_updated', 'user_deleted', 'email_sent')),
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop existing indexes
DROP INDEX IF EXISTS idx_sales_activity_manager_id;
DROP INDEX IF EXISTS idx_sales_activity_created_at;
DROP INDEX IF EXISTS idx_sales_activity_composite;
DROP INDEX IF EXISTS idx_sales_activity_details;

CREATE INDEX idx_sales_activity_manager_id ON public.sales_activity_log(manager_id);
CREATE INDEX idx_sales_activity_created_at ON public.sales_activity_log(created_at DESC);
CREATE INDEX idx_sales_activity_composite ON public.sales_activity_log(manager_id, created_at DESC);
CREATE INDEX idx_sales_activity_details ON public.sales_activity_log USING GIN (details jsonb_path_ops);

-- ============================================
-- PART 3: AUTO-UPDATE TRIGGERS (только для updated_at)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем trigger к таблицам с updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tripwire_users_updated_at BEFORE UPDATE ON public.tripwire_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tripwire_profile_updated_at BEFORE UPDATE ON public.tripwire_user_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_video_tracking_updated_at BEFORE UPDATE ON public.video_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON public.user_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 4: AUTOMATIC SCHEMA CACHE RELOAD
-- Решает проблему NOTIFY pgrst раз и навсегда
-- ============================================

CREATE OR REPLACE FUNCTION pgrst_watch() RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

-- Удаляем существующий event trigger если есть
DROP EVENT TRIGGER IF EXISTS pgrst_watch;

-- Автоматический reload после DDL команд
CREATE EVENT TRIGGER pgrst_watch
ON ddl_command_end
EXECUTE FUNCTION pgrst_watch();

-- ============================================
-- PART 5: RPC FUNCTIONS (ТОЛЬКО ДЛЯ СТАТИСТИКИ)
-- ============================================

-- 1. LEADERBOARD (топ Sales Managers по количеству студентов)
CREATE OR REPLACE FUNCTION rpc_get_sales_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  manager_id UUID,
  manager_name TEXT,
  email TEXT,
  total_students BIGINT,
  active_students BIGINT,
  completed_students BIGINT,
  total_revenue NUMERIC,
  avg_completion_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id AS manager_id,
    u.full_name AS manager_name,
    u.email,
    COUNT(tw.id) AS total_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active') AS active_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed') AS completed_students,
    COALESCE(SUM(tw.price), 0) AS total_revenue,
    COALESCE(AVG(tw.modules_completed::NUMERIC / 3 * 100), 0) AS avg_completion_rate
  FROM public.users u
  LEFT JOIN public.tripwire_users tw ON tw.granted_by = u.id
  WHERE u.role = 'sales_manager'
  GROUP BY u.id, u.full_name, u.email
  ORDER BY total_students DESC
  LIMIT limit_count;
END;
$$;

-- 2. CHART DATA (продажи по датам для графика)
CREATE OR REPLACE FUNCTION rpc_get_sales_chart_data(
  manager_id_param UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  students_created BIGINT,
  revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(tw.created_at) AS date,
    COUNT(tw.id) AS students_created,
    COALESCE(SUM(tw.price), 0) AS revenue
  FROM public.tripwire_users tw
  WHERE tw.granted_by = manager_id_param
    AND tw.created_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(tw.created_at)
  ORDER BY date DESC;
END;
$$;

-- 3. MANAGER STATS (общая статистика для Sales Manager)
CREATE OR REPLACE FUNCTION rpc_get_manager_stats(manager_id_param UUID)
RETURNS TABLE (
  total_students BIGINT,
  active_students BIGINT,
  completed_students BIGINT,
  total_revenue NUMERIC,
  avg_completion_rate NUMERIC,
  students_this_month BIGINT,
  revenue_this_month NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(tw.id) AS total_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'active') AS active_students,
    COUNT(tw.id) FILTER (WHERE tw.status = 'completed') AS completed_students,
    COALESCE(SUM(tw.price), 0) AS total_revenue,
    COALESCE(AVG(tw.modules_completed::NUMERIC / 3 * 100), 0) AS avg_completion_rate,
    COUNT(tw.id) FILTER (WHERE tw.created_at >= DATE_TRUNC('month', NOW())) AS students_this_month,
    COALESCE(SUM(tw.price) FILTER (WHERE tw.created_at >= DATE_TRUNC('month', NOW())), 0) AS revenue_this_month
  FROM public.tripwire_users tw
  WHERE tw.granted_by = manager_id_param;
END;
$$;

-- 4. RECENT ACTIVITY (последние действия менеджера)
CREATE OR REPLACE FUNCTION rpc_get_manager_activity(
  manager_id_param UUID,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  action_type TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  target_user_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id,
    sal.action_type,
    sal.target_user_id,
    u.email AS target_user_email,
    u.full_name AS target_user_name,
    sal.details,
    sal.created_at
  FROM public.sales_activity_log sal
  LEFT JOIN public.users u ON u.id = sal.target_user_id
  WHERE sal.manager_id = manager_id_param
  ORDER BY sal.created_at DESC
  LIMIT limit_count;
END;
$$;

-- 5. CHECK VIDEO QUALIFICATION (вспомогательная функция)
CREATE OR REPLACE FUNCTION rpc_check_video_qualification(
  user_id_param UUID,
  lesson_id_param INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  watch_pct INTEGER;
BEGIN
  SELECT watch_percentage INTO watch_pct
  FROM public.video_tracking
  WHERE user_id = user_id_param AND lesson_id = lesson_id_param;
  
  RETURN COALESCE(watch_pct >= 80, false);
END;
$$;

-- ============================================
-- PART 6: GRANTS (доступ к функциям)
-- ============================================

GRANT EXECUTE ON FUNCTION rpc_get_sales_leaderboard TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION rpc_get_sales_chart_data TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION rpc_get_manager_stats TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION rpc_get_manager_activity TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION rpc_check_video_qualification TO authenticated, anon, service_role;

-- ============================================
-- ЗАВЕРШЕНО!
-- ============================================

-- Уведомляем PostgREST о новых функциях
NOTIFY pgrst, 'reload schema';
