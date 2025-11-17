-- ========================================
-- ИСПРАВЛЕННАЯ МИГРАЦИЯ: Система аналитики (lesson_id = INTEGER)
-- Дата: 2025-11-16
-- Исправление: lesson_id теперь INTEGER (соответствует структуре БД)
-- ========================================

-- ====================================
-- 1. ТАБЛИЦА: video_events (детальные события видео)
-- ====================================
CREATE TABLE IF NOT EXISTS public.video_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, -- ✅ ИСПРАВЛЕНО: INTEGER
  video_id UUID REFERENCES video_content(id) ON DELETE CASCADE,
  
  -- Событие
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'play', 'pause', 'seek', 'speed_change', 'volume_change',
    'fullscreen', 'quality_change', 'complete', 'buffer'
  )),
  
  -- Временная метка в видео
  video_timestamp INTEGER NOT NULL, -- секунды
  video_duration INTEGER, -- общая длительность
  
  -- Дополнительные данные
  playback_speed DECIMAL(3,2) DEFAULT 1.0,
  volume_level INTEGER CHECK (volume_level BETWEEN 0 AND 100),
  quality VARCHAR(20), -- '360p', '720p', '1080p'
  is_fullscreen BOOLEAN DEFAULT false,
  
  -- Seek события
  seek_from INTEGER, -- откуда перемотал
  seek_to INTEGER,   -- куда перемотал
  
  -- Метаданные
  session_id UUID, -- ID сессии обучения
  device_type VARCHAR(50),
  browser VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_events_user ON video_events(user_id);
CREATE INDEX IF NOT EXISTS idx_video_events_lesson ON video_events(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_events_video ON video_events(video_id);
CREATE INDEX IF NOT EXISTS idx_video_events_session ON video_events(session_id);
CREATE INDEX IF NOT EXISTS idx_video_events_type ON video_events(event_type);
CREATE INDEX IF NOT EXISTS idx_video_events_created ON video_events(created_at);

COMMENT ON TABLE video_events IS 'Детальные события взаимодействия с видео';

-- ====================================
-- 2. ТАБЛИЦА: video_heatmap (тепловая карта просмотров)
-- ====================================
CREATE TABLE IF NOT EXISTS public.video_heatmap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE, -- ✅ ИСПРАВЛЕНО: INTEGER
  
  -- Сегмент видео (каждые 5 секунд)
  segment_start INTEGER NOT NULL,
  segment_end INTEGER NOT NULL,
  
  -- Статистика просмотров
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  
  -- Поведение
  play_count INTEGER DEFAULT 0,      -- Сколько раз началось воспроизведение
  pause_count INTEGER DEFAULT 0,     -- Сколько раз приостановлено
  seek_forward_count INTEGER DEFAULT 0, -- Перемотка вперёд
  seek_backward_count INTEGER DEFAULT 0, -- Перемотка назад
  
  -- Средние значения
  avg_watch_time DECIMAL(5,2) DEFAULT 0, -- Среднее время просмотра сегмента
  avg_playback_speed DECIMAL(3,2) DEFAULT 1.0,
  
  -- Индикаторы качества
  engagement_score DECIMAL(3,2) DEFAULT 0, -- 0-1 (насколько вовлечены)
  difficulty_score DECIMAL(3,2) DEFAULT 0, -- 0-1 (насколько сложен сегмент)
  
  is_hot_zone BOOLEAN DEFAULT false, -- Часто перематывают назад (сложное место)
  is_skip_zone BOOLEAN DEFAULT false, -- Часто пропускают (скучное место)
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_video_segment_heatmap UNIQUE (video_id, segment_start)
);

CREATE INDEX IF NOT EXISTS idx_heatmap_video ON video_heatmap(video_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_lesson ON video_heatmap(lesson_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_hot_zones ON video_heatmap(video_id) WHERE is_hot_zone = true;
CREATE INDEX IF NOT EXISTS idx_heatmap_skip_zones ON video_heatmap(video_id) WHERE is_skip_zone = true;

COMMENT ON TABLE video_heatmap IS 'Тепловая карта просмотров видео (по сегментам)';

-- ====================================
-- 3. ТАБЛИЦА: learning_sessions (сессии обучения)
-- ====================================
CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Время сессии
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER, -- Вычисляется автоматически
  
  -- Активность
  lessons_viewed INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  materials_downloaded INTEGER DEFAULT 0,
  
  -- Взаимодействие с платформой
  clicks_count INTEGER DEFAULT 0,
  navigation_count INTEGER DEFAULT 0,
  ai_messages_sent INTEGER DEFAULT 0,
  
  -- Качество сессии
  engagement_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  focus_score DECIMAL(3,2) DEFAULT 0,      -- 0-1 (как долго был сфокусирован на вкладке)
  
  -- Техническая информация
  device_type VARCHAR(50),
  browser VARCHAR(100),
  screen_resolution VARCHAR(50),
  ip_address INET,
  
  -- Завершение сессии
  ended_by VARCHAR(50) CHECK (ended_by IN ('user', 'timeout', 'inactivity', 'system')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON learning_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON learning_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_sessions_duration ON learning_sessions(duration_seconds);

COMMENT ON TABLE learning_sessions IS 'Сессии обучения студентов';

-- ====================================
-- 4. ТАБЛИЦА: navigation_events (навигация по платформе)
-- ====================================
CREATE TABLE IF NOT EXISTS public.navigation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  
  -- Навигация
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'page_view', 'course_open', 'lesson_open', 'module_expand',
    'search', 'filter', 'back', 'forward', 'external_link'
  )),
  
  -- Путь
  from_url TEXT,
  to_url TEXT,
  from_page VARCHAR(100),
  to_page VARCHAR(100),
  
  -- Контекст
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE, -- ✅ ИСПРАВЛЕНО: INTEGER
  
  -- Поисковый запрос (если event_type = 'search')
  search_query TEXT,
  search_results_count INTEGER,
  
  -- Время на странице
  time_spent_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nav_user ON navigation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_nav_session ON navigation_events(session_id);
CREATE INDEX IF NOT EXISTS idx_nav_type ON navigation_events(event_type);
CREATE INDEX IF NOT EXISTS idx_nav_course ON navigation_events(course_id);
CREATE INDEX IF NOT EXISTS idx_nav_lesson ON navigation_events(lesson_id);
CREATE INDEX IF NOT EXISTS idx_nav_created ON navigation_events(created_at);

COMMENT ON TABLE navigation_events IS 'События навигации по платформе';

-- ====================================
-- 5. ТАБЛИЦА: interaction_events (взаимодействия с UI)
-- ====================================
CREATE TABLE IF NOT EXISTS public.interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES learning_sessions(id) ON DELETE CASCADE,
  
  -- Тип взаимодействия
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
    'button_click', 'link_click', 'dropdown_open', 'modal_open', 'modal_close',
    'tab_switch', 'scroll', 'hover', 'input_focus', 'form_submit',
    'file_download', 'file_upload', 'copy_text', 'bookmark', 'share'
  )),
  
  -- Элемент UI
  element_id VARCHAR(100),
  element_class VARCHAR(100),
  element_text TEXT,
  element_type VARCHAR(50), -- 'button', 'link', 'input', etc.
  
  -- Контекст
  page_url TEXT,
  page_section VARCHAR(100),
  
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE, -- ✅ ИСПРАВЛЕНО: INTEGER
  
  -- Дополнительные данные
  metadata JSONB, -- Произвольные данные (например, значение input)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interaction_user ON interaction_events(user_id);
CREATE INDEX IF NOT EXISTS idx_interaction_session ON interaction_events(session_id);
CREATE INDEX IF NOT EXISTS idx_interaction_type ON interaction_events(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interaction_lesson ON interaction_events(lesson_id);
CREATE INDEX IF NOT EXISTS idx_interaction_created ON interaction_events(created_at);

COMMENT ON TABLE interaction_events IS 'Детальные взаимодействия с интерфейсом';

-- ====================================
-- 6. VIEW: student_analytics_summary (для AI-агентов)
-- ====================================
CREATE OR REPLACE VIEW student_analytics_summary AS
SELECT 
  u.id as user_id,
  u.email,
  p.full_name,
  p.role,
  
  -- Общая активность
  COUNT(DISTINCT ls.id) as total_sessions,
  SUM(ls.duration_seconds) as total_learning_time_seconds,
  AVG(ls.engagement_score) as avg_engagement_score,
  MAX(ls.session_start) as last_session_date,
  
  -- Прогресс по курсам
  COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.is_started = true) as lessons_started,
  COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.is_completed = true) as lessons_completed,
  
  -- Видео-активность
  COUNT(DISTINCT ve.video_id) as unique_videos_watched,
  SUM(ve.video_timestamp) FILTER (WHERE ve.event_type = 'complete') as total_video_watch_time,
  
  -- Взаимодействие с AI
  COUNT(DISTINCT ie.id) FILTER (WHERE ie.interaction_type = 'ai_chat_message') as ai_messages_sent,
  
  -- Риски
  CASE 
    WHEN MAX(ls.session_start) < NOW() - INTERVAL '7 days' THEN 'high_risk'
    WHEN MAX(ls.session_start) < NOW() - INTERVAL '3 days' THEN 'medium_risk'
    ELSE 'active'
  END as churn_risk_level,
  
  -- Последнее обновление
  NOW() as calculated_at

FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN learning_sessions ls ON ls.user_id = u.id
LEFT JOIN student_progress sp ON sp.user_id = u.id
LEFT JOIN video_events ve ON ve.user_id = u.id
LEFT JOIN interaction_events ie ON ie.user_id = u.id

WHERE p.role = 'student'
GROUP BY u.id, u.email, p.full_name, p.role;

COMMENT ON VIEW student_analytics_summary IS 'Сводная аналитика студентов для AI-агентов';

-- ====================================
-- 7. ФУНКЦИЯ: get_student_detailed_analytics()
-- ====================================
CREATE OR REPLACE FUNCTION get_student_detailed_analytics(
  p_user_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_sessions JSONB;
  v_video_stats JSONB;
  v_navigation JSONB;
  v_engagement JSONB;
BEGIN
  -- Сессии обучения
  SELECT jsonb_build_object(
    'totalSessions', COUNT(*),
    'totalDuration', SUM(duration_seconds),
    'avgDuration', AVG(duration_seconds),
    'avgEngagement', AVG(engagement_score),
    'lastSessionDate', MAX(session_start)
  )
  INTO v_sessions
  FROM learning_sessions
  WHERE user_id = p_user_id
    AND session_start >= NOW() - INTERVAL '1 day' * p_days_back;
  
  -- Статистика по видео
  SELECT jsonb_build_object(
    'uniqueVideos', COUNT(DISTINCT video_id),
    'totalEvents', COUNT(*),
    'playEvents', COUNT(*) FILTER (WHERE event_type = 'play'),
    'pauseEvents', COUNT(*) FILTER (WHERE event_type = 'pause'),
    'seekEvents', COUNT(*) FILTER (WHERE event_type = 'seek'),
    'completedVideos', COUNT(DISTINCT video_id) FILTER (WHERE event_type = 'complete'),
    'avgPlaybackSpeed', AVG(playback_speed)
  )
  INTO v_video_stats
  FROM video_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days_back;
  
  -- Навигация
  SELECT jsonb_build_object(
    'totalNavigations', COUNT(*),
    'uniquePages', COUNT(DISTINCT to_page),
    'searchQueries', COUNT(*) FILTER (WHERE event_type = 'search'),
    'lessonsOpened', COUNT(DISTINCT lesson_id) FILTER (WHERE event_type = 'lesson_open'),
    'avgTimePerPage', AVG(time_spent_seconds)
  )
  INTO v_navigation
  FROM navigation_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days_back;
  
  -- Вовлечённость
  SELECT jsonb_build_object(
    'totalInteractions', COUNT(*),
    'buttonClicks', COUNT(*) FILTER (WHERE interaction_type = 'button_click'),
    'filesDownloaded', COUNT(*) FILTER (WHERE interaction_type = 'file_download'),
    'uniqueLessons', COUNT(DISTINCT lesson_id)
  )
  INTO v_engagement
  FROM interaction_events
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days_back;
  
  -- Формируем итоговый результат
  v_result := jsonb_build_object(
    'userId', p_user_id,
    'period', jsonb_build_object(
      'days', p_days_back,
      'from', (NOW() - INTERVAL '1 day' * p_days_back)::DATE,
      'to', CURRENT_DATE
    ),
    'sessions', v_sessions,
    'videoStats', v_video_stats,
    'navigation', v_navigation,
    'engagement', v_engagement,
    'calculatedAt', NOW()
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_student_detailed_analytics IS 'Детальная аналитика студента за период (для AI-агентов)';

-- ====================================
-- 8. RLS ПОЛИТИКИ
-- ====================================

-- video_events
ALTER TABLE video_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own video events" ON video_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can insert own video events" ON video_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all video events" ON video_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- video_heatmap
ALTER TABLE video_heatmap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video heatmap" ON video_heatmap FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage video heatmap" ON video_heatmap FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- learning_sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own sessions" ON learning_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can create own sessions" ON learning_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own sessions" ON learning_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON learning_sessions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- navigation_events
ALTER TABLE navigation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own navigation" ON navigation_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can insert own navigation" ON navigation_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all navigation" ON navigation_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- interaction_events
ALTER TABLE interaction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own interactions" ON interaction_events FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Students can insert own interactions" ON interaction_events FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all interactions" ON interaction_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ====================================
-- 9. ТРИГГЕРЫ
-- ====================================

-- Автоматический расчёт длительности сессии
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_end IS NOT NULL AND NEW.session_start IS NOT NULL THEN
    NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.session_end - NEW.session_start))::INTEGER;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_duration
  BEFORE UPDATE ON learning_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_duration();

-- ========================================
-- ГОТОВО! 🎉
-- ========================================
-- 
-- Созданные таблицы:
-- 1. video_events - детальные события видео
-- 2. video_heatmap - тепловая карта просмотров
-- 3. learning_sessions - сессии обучения
-- 4. navigation_events - навигация по платформе
-- 5. interaction_events - взаимодействия с UI
-- 
-- Созданные VIEW:
-- 1. student_analytics_summary - сводная аналитика для AI
-- 
-- Созданные функции:
-- 1. get_student_detailed_analytics() - детальная аналитика студента
-- 
-- Все lesson_id используют INTEGER (соответствует структуре БД) ✅
-- ========================================

