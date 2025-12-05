-- ================================================================
-- TRIPWIRE DB SCHEMA INITIALIZATION
-- Полная структура базы данных для изолированного Tripwire продукта
-- ================================================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- ТАБЛИЦА: public.users
-- Основная таблица пользователей (синхронизируется с auth.users)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'sales')),
  platform TEXT DEFAULT 'tripwire' CHECK (platform IN ('main', 'tripwire')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  
  -- XP & Levels (для будущего, сейчас не используется)
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  
  -- Telegram
  telegram_chat_id BIGINT UNIQUE,
  telegram_user_id BIGINT UNIQUE,
  telegram_connected BOOLEAN DEFAULT FALSE,
  telegram_connected_at TIMESTAMPTZ,
  telegram_verification_token TEXT UNIQUE,
  
  -- Onboarding
  onboarding_completed BOOLEAN DEFAULT FALSE
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_platform ON public.users(platform);

-- RLS для users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins видят всех
CREATE POLICY users_admin_all ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users видят себя
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users обновляют себя
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id);

COMMENT ON TABLE public.users IS 'Основная таблица пользователей платформы (синхронизируется с auth.users)';

-- ================================================================
-- ТАБЛИЦА: public.tripwire_users
-- Профили студентов Tripwire (созданные Sales менеджерами)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tripwire_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  
  -- Кто создал
  granted_by UUID REFERENCES auth.users(id),
  manager_name TEXT,
  
  -- Пароль (для Welcome Email)
  generated_password TEXT NOT NULL,
  password_changed BOOLEAN DEFAULT FALSE,
  
  -- Email tracking
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMPTZ,
  email_opened BOOLEAN DEFAULT FALSE,
  
  -- Activity
  first_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  
  -- Progress
  modules_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'blocked')),
  
  -- AmoCRM integration
  amocrm_deal_id TEXT,
  amocrm_contact_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tripwire_users_user_id ON public.tripwire_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_email ON public.tripwire_users(email);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_granted_by ON public.tripwire_users(granted_by);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_status ON public.tripwire_users(status);

-- RLS
ALTER TABLE public.tripwire_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tripwire_users_admin_all ON public.tripwire_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

CREATE POLICY tripwire_users_select_own ON public.tripwire_users
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.tripwire_users IS 'Профили студентов Tripwire (созданные Sales менеджерами)';

-- ================================================================
-- ТАБЛИЦА: public.tripwire_user_profile
-- Расширенный профиль с прогрессом
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 3,
  completion_percentage NUMERIC DEFAULT 0,
  
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  certificate_issued_at TIMESTAMPTZ,
  
  added_by_manager_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tripwire_profile_user_id ON public.tripwire_user_profile(user_id);

-- RLS
ALTER TABLE public.tripwire_user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY tripwire_profile_admin_all ON public.tripwire_user_profile
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

CREATE POLICY tripwire_profile_select_own ON public.tripwire_user_profile
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.tripwire_user_profile IS 'Расширенный профиль Tripwire пользователя с прогрессом';

-- ================================================================
-- ТАБЛИЦА: public.modules
-- Модули курсов (включая Tripwire модули 16, 17, 18)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.modules (
  id SERIAL PRIMARY KEY,
  course_id INTEGER,
  title TEXT,
  description TEXT,
  order_index INTEGER,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules(order_index);

-- RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY modules_select_all ON public.modules
  FOR SELECT USING (TRUE);

COMMENT ON TABLE public.modules IS 'Модули курсов. is_archived=FALSE для активных модулей.';

-- ================================================================
-- ТАБЛИЦА: public.lessons
-- Уроки курсов
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lessons (
  id SERIAL PRIMARY KEY,
  module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  video_url TEXT,
  bunny_video_id TEXT,
  duration INTEGER,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER,
  lesson_type VARCHAR DEFAULT 'video' CHECK (lesson_type IN ('video', 'text', 'quiz', 'assignment')),
  is_preview BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  xp_reward INTEGER DEFAULT 10,
  
  -- AI generated
  ai_description TEXT,
  ai_tips TEXT,
  tip TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(order_index);

-- RLS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY lessons_select_all ON public.lessons
  FOR SELECT USING (TRUE);

COMMENT ON TABLE public.lessons IS 'Уроки курсов. is_archived=FALSE означает что урок доступен студентам.';

-- ================================================================
-- ТАБЛИЦА: public.tripwire_progress
-- Прогресс студентов по урокам Tripwire
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tripwire_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripwire_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES public.modules(id) ON DELETE CASCADE,
  
  is_completed BOOLEAN DEFAULT FALSE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  video_progress_percent INTEGER DEFAULT 0 CHECK (video_progress_percent >= 0 AND video_progress_percent <= 100),
  last_position_seconds INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tripwire_user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_tripwire_progress_user ON public.tripwire_progress(tripwire_user_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_lesson ON public.tripwire_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_module ON public.tripwire_progress(module_id);

-- RLS
ALTER TABLE public.tripwire_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY tripwire_progress_admin_all ON public.tripwire_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

CREATE POLICY tripwire_progress_select_own ON public.tripwire_progress
  FOR SELECT USING (auth.uid() = tripwire_user_id);

CREATE POLICY tripwire_progress_update_own ON public.tripwire_progress
  FOR UPDATE USING (auth.uid() = tripwire_user_id);

COMMENT ON TABLE public.tripwire_progress IS 'Прогресс студентов по урокам Tripwire';

-- ================================================================
-- ТАБЛИЦА: public.tripwire_achievements
-- Достижения студентов (3 модуля = 3 бейджа)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tripwire_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tripwire_achievements_user ON public.tripwire_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_achievements_type ON public.tripwire_achievements(achievement_type);

-- RLS
ALTER TABLE public.tripwire_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY tripwire_achievements_admin_all ON public.tripwire_achievements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

CREATE POLICY tripwire_achievements_select_own ON public.tripwire_achievements
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.tripwire_achievements IS 'Достижения Tripwire студентов (3 модуля = 3 бейджа)';

-- ================================================================
-- ТАБЛИЦА: public.tripwire_certificates
-- PDF сертификаты после завершения всех 3 модулей
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tripwire_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_url TEXT NOT NULL,
  full_name TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tripwire_certificates_user ON public.tripwire_certificates(user_id);

-- RLS
ALTER TABLE public.tripwire_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tripwire_certificates_admin_all ON public.tripwire_certificates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

CREATE POLICY tripwire_certificates_select_own ON public.tripwire_certificates
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.tripwire_certificates IS 'PDF certificates issued to Tripwire students after completing all 3 modules';

-- ================================================================
-- ТАБЛИЦА: public.tripwire_chat_messages
-- История чата с AI Curator
-- ================================================================

CREATE TABLE IF NOT EXISTS public.tripwire_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tripwire_chat_user ON public.tripwire_chat_messages(user_id, created_at DESC);

-- RLS
ALTER TABLE public.tripwire_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY tripwire_chat_select_own ON public.tripwire_chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tripwire_chat_insert_own ON public.tripwire_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.tripwire_chat_messages IS 'Chat history between Tripwire students and AI Curator';

-- ================================================================
-- ТАБЛИЦА: public.lesson_materials
-- Материалы к урокам (PDFs)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id INTEGER REFERENCES public.lessons(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson ON public.lesson_materials(lesson_id);

-- RLS
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_materials_select_all ON public.lesson_materials
  FOR SELECT USING (TRUE);

COMMENT ON TABLE public.lesson_materials IS 'Раздаточные материалы к урокам (PDFs, docs)';

-- ================================================================
-- ТАБЛИЦА: public.sales_activity_log
-- Лог активности Sales менеджеров
-- ================================================================

CREATE TABLE IF NOT EXISTS public.sales_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('user_created', 'email_sent', 'status_changed', 'password_reset', 'user_deleted')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_log_manager ON public.sales_activity_log(manager_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_log_target ON public.sales_activity_log(target_user_id);

-- RLS
ALTER TABLE public.sales_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_log_admin_all ON public.sales_activity_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'sales')
    )
  );

COMMENT ON TABLE public.sales_activity_log IS 'Лог активности менеджеров по продажам';

-- ================================================================
-- ТРИГГЕР: Автоматическое создание public.users при регистрации
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, platform)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'platform', 'tripwire')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаём триггер
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- RPC ФУНКЦИЯ: Создание Tripwire пользователя (для Sales Dashboard)
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_tripwire_user_full(
  p_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_granted_by UUID,
  p_manager_name TEXT,
  p_generated_password TEXT,
  p_welcome_email_sent BOOLEAN
)
RETURNS JSON AS $$
BEGIN
  -- Вставляем в tripwire_users
  INSERT INTO public.tripwire_users (
    user_id,
    full_name,
    email,
    granted_by,
    manager_name,
    generated_password,
    welcome_email_sent,
    welcome_email_sent_at
  ) VALUES (
    p_user_id,
    p_full_name,
    p_email,
    p_granted_by,
    p_manager_name,
    p_generated_password,
    p_welcome_email_sent,
    CASE WHEN p_welcome_email_sent THEN NOW() ELSE NULL END
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    manager_name = EXCLUDED.manager_name,
    updated_at = NOW();
  
  -- Логируем в sales_activity_log
  INSERT INTO public.sales_activity_log (manager_id, action_type, target_user_id, details)
  VALUES (
    p_granted_by,
    'user_created',
    p_user_id,
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'welcome_email_sent', p_welcome_email_sent
    )
  );
  
  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- ФИНАЛ
-- ================================================================

-- Обновляем updated_at автоматически для всех таблиц с этим полем
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер к таблицам с updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tripwire_users_updated_at BEFORE UPDATE ON public.tripwire_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tripwire_profile_updated_at BEFORE UPDATE ON public.tripwire_user_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tripwire_progress_updated_at BEFORE UPDATE ON public.tripwire_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tripwire_achievements_updated_at BEFORE UPDATE ON public.tripwire_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================================
-- ГОТОВО!
-- ================================================================

SELECT 'Tripwire DB Schema initialized successfully!' AS status;

