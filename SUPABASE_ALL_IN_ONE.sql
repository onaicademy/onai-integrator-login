-- Миграция: Создание таблиц для диалогов с AI-куратором
-- Дата: 2025-01-15
-- Описание: Таблицы для хранения истории диалогов пользователей с AI-куратором

-- Таблица для thread'ов диалогов (каждый пользователь имеет свой thread)
CREATE TABLE IF NOT EXISTS ai_curator_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id TEXT, -- ID ассистента из OpenAI (для связи с OpenAI API)
  thread_id TEXT, -- ID thread'а из OpenAI (для связи с OpenAI API)
  title TEXT, -- Автоматически сгенерированное название диалога (например, первое сообщение)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ, -- Время последнего сообщения в диалоге
  message_count INTEGER DEFAULT 0, -- Количество сообщений в диалоге
  is_archived BOOLEAN DEFAULT FALSE, -- Архивирован ли диалог
  
  UNIQUE(user_id, thread_id)
);

-- Таблица для сообщений в диалогах
CREATE TABLE IF NOT EXISTS ai_curator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ai_curator_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL, -- Текст сообщения
  openai_message_id TEXT, -- ID сообщения из OpenAI API (для связи)
  openai_run_id TEXT, -- ID run'а из OpenAI API (для отладки)
  
  -- Метаданные сообщения
  has_attachments BOOLEAN DEFAULT FALSE, -- Есть ли вложения (файлы, изображения)
  attachment_count INTEGER DEFAULT 0, -- Количество вложений
  is_voice_message BOOLEAN DEFAULT FALSE, -- Было ли сообщение отправлено через голосовой ввод
  transcription_text TEXT, -- Транскрипция голосового сообщения (если было)
  
  -- Метрики эффективности
  response_time_ms INTEGER, -- Время ответа AI в миллисекундах (для сообщений от assistant)
  token_count INTEGER, -- Количество токенов в сообщении (если доступно из OpenAI)
  model_used TEXT, -- Модель, которая использовалась для ответа (например, "gpt-4")
  
  -- Метаданные для анализа
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', NULL)), -- Настроение сообщения (для будущего AI-анализа)
  topics TEXT[], -- Темы, затронутые в сообщении (массив строк, для будущего AI-анализа)
  lesson_reference TEXT, -- Ссылка на урок (если пользователь спрашивает про урок)
  lesson_timestamp INTEGER, -- Временная метка в уроке в секундах (если пользователь спрашивает про конкретный момент)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица для вложений (файлов, изображений) в сообщениях
CREATE TABLE IF NOT EXISTS ai_curator_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES ai_curator_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type (например, "image/png", "application/pdf")
  file_size INTEGER NOT NULL, -- Размер файла в байтах
  openai_file_id TEXT, -- ID файла в OpenAI (если был загружен в OpenAI)
  storage_url TEXT, -- URL файла в storage (если файл сохранен в Supabase Storage)
  thumbnail_url TEXT, -- URL превью (для изображений)
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица для метрик диалогов (агрегированная статистика)
CREATE TABLE IF NOT EXISTS ai_curator_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ai_curator_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Общие метрики
  total_messages INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  assistant_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER, -- Среднее время ответа AI
  
  -- Метрики активности
  first_message_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  active_days INTEGER DEFAULT 0, -- Количество дней с активностью
  
  -- Метрики эффективности (для будущего AI-анализа)
  avg_sentiment_score DECIMAL(3, 2), -- Средний балл настроения (от -1 до 1)
  positive_interactions INTEGER DEFAULT 0,
  neutral_interactions INTEGER DEFAULT 0,
  negative_interactions INTEGER DEFAULT 0,
  
  -- Метрики по темам
  lessons_discussed INTEGER DEFAULT 0, -- Количество обсужденных уроков
  questions_asked INTEGER DEFAULT 0, -- Количество заданных вопросов
  clarifications_requested INTEGER DEFAULT 0, -- Количество запросов на уточнение
  
  -- Временные метки
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(thread_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_ai_curator_threads_user_id ON ai_curator_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_curator_threads_updated_at ON ai_curator_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_curator_threads_created_at ON ai_curator_threads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_curator_messages_thread_id ON ai_curator_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_curator_messages_user_id ON ai_curator_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_curator_messages_created_at ON ai_curator_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_curator_messages_role ON ai_curator_messages(role);
CREATE INDEX IF NOT EXISTS idx_ai_curator_messages_lesson_reference ON ai_curator_messages(lesson_reference) WHERE lesson_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_curator_attachments_message_id ON ai_curator_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_ai_curator_metrics_thread_id ON ai_curator_metrics(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_curator_metrics_user_id ON ai_curator_metrics(user_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_ai_curator_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_curator_threads_updated_at
  BEFORE UPDATE ON ai_curator_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_curator_threads_updated_at();

-- Функция для автоматического обновления updated_at в сообщениях
CREATE OR REPLACE FUNCTION update_ai_curator_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_curator_messages_updated_at
  BEFORE UPDATE ON ai_curator_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_curator_messages_updated_at();

-- Функция для автоматического обновления статистики thread'а при добавлении сообщения
CREATE OR REPLACE FUNCTION update_thread_stats_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Обновляем счетчик сообщений и время последнего сообщения
  UPDATE ai_curator_threads
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.thread_id;
  
  -- Обновляем метрики
  INSERT INTO ai_curator_metrics (thread_id, user_id, total_messages, last_message_at, first_message_at)
  VALUES (NEW.thread_id, NEW.user_id, 1, NEW.created_at, NEW.created_at)
  ON CONFLICT (thread_id) 
  DO UPDATE SET
    total_messages = ai_curator_metrics.total_messages + 1,
    last_message_at = NEW.created_at,
    updated_at = NOW(),
    user_messages = CASE WHEN NEW.role = 'user' THEN ai_curator_metrics.user_messages + 1 ELSE ai_curator_metrics.user_messages END,
    assistant_messages = CASE WHEN NEW.role = 'assistant' THEN ai_curator_metrics.assistant_messages + 1 ELSE ai_curator_metrics.assistant_messages END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_thread_stats_on_message
  AFTER INSERT ON ai_curator_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_stats_on_message();

-- RLS (Row Level Security) политики
ALTER TABLE ai_curator_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_curator_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_curator_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_curator_metrics ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои диалоги
CREATE POLICY "Users can view their own threads"
  ON ai_curator_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own threads"
  ON ai_curator_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
  ON ai_curator_threads FOR UPDATE
  USING (auth.uid() = user_id);

-- Пользователи могут видеть только свои сообщения
CREATE POLICY "Users can view their own messages"
  ON ai_curator_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
  ON ai_curator_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Пользователи могут видеть только свои вложения
CREATE POLICY "Users can view their own attachments"
  ON ai_curator_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_curator_messages 
      WHERE ai_curator_messages.id = ai_curator_attachments.message_id 
      AND ai_curator_messages.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own attachments"
  ON ai_curator_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_curator_messages 
      WHERE ai_curator_messages.id = ai_curator_attachments.message_id 
      AND ai_curator_messages.user_id = auth.uid()
    )
  );

-- Администраторы могут видеть все (проверка через таблицу user_roles)
CREATE POLICY "Admins can view all threads"
  ON ai_curator_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all messages"
  ON ai_curator_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all attachments"
  ON ai_curator_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all metrics"
  ON ai_curator_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Комментарии к таблицам
COMMENT ON TABLE ai_curator_threads IS 'Thread''ы диалогов пользователей с AI-куратором';
COMMENT ON TABLE ai_curator_messages IS 'Сообщения в диалогах с AI-куратором';
COMMENT ON TABLE ai_curator_attachments IS 'Вложения (файлы, изображения) в сообщениях';
COMMENT ON TABLE ai_curator_metrics IS 'Агрегированные метрики эффективности диалогов';

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

-- Система управления учениками onAI Academy
-- Создана: 7 ноября 2025

-- ============================================
-- ТАБЛИЦА: Профили учеников (расширение auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Основная информация
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  avatar_url TEXT,
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  
  -- Метаданные
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Настройки
  notification_preferences JSONB DEFAULT '{"email": true, "push": false}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ТАБЛИЦА: Приглашения учеников
-- ============================================
CREATE TABLE IF NOT EXISTS student_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Данные ученика
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  
  -- Токен для уникальной ссылки
  invitation_token TEXT NOT NULL UNIQUE,
  
  -- Временный пароль (хеш)
  temp_password_hash TEXT,
  temp_password_plain TEXT, -- Только для отправки email, после удаляется
  
  -- Статус
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  
  -- Метаданные
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ТАБЛИЦА: История изменений паролей
-- ============================================
CREATE TABLE IF NOT EXISTS password_change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  changed_by UUID REFERENCES auth.users(id), -- NULL если сам пользователь
  reason TEXT, -- 'admin_reset', 'user_change', 'forgot_password'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_invited_by ON student_profiles(invited_by);
CREATE INDEX IF NOT EXISTS idx_student_invitations_email ON student_invitations(email);
CREATE INDEX IF NOT EXISTS idx_student_invitations_token ON student_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_student_invitations_status ON student_invitations(status);
CREATE INDEX IF NOT EXISTS idx_password_history_user ON password_change_history(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Студенты видят только свой профиль
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile"
  ON student_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can update own profile"
  ON student_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Админы видят всё
CREATE POLICY "Admins can view all profiles"
  ON student_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles"
  ON student_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON student_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Приглашения: только админы
ALTER TABLE student_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invitations"
  ON student_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- История паролей: админы видят всё, пользователи свою
ALTER TABLE password_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own password history"
  ON password_change_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all password history"
  ON password_change_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================
-- ФУНКЦИИ
-- ============================================

-- Функция: Создать приглашение ученика
CREATE OR REPLACE FUNCTION create_student_invitation(
  p_email TEXT,
  p_full_name TEXT,
  p_invited_by UUID
)
RETURNS TABLE (
  invitation_id UUID,
  invitation_token TEXT,
  temp_password TEXT,
  invitation_url TEXT
) AS $$
DECLARE
  v_token TEXT;
  v_password TEXT;
  v_invitation_id UUID;
BEGIN
  -- Генерация токена (32 символа)
  v_token := encode(gen_random_bytes(24), 'base64');
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
  
  -- Генерация временного пароля (12 символов)
  v_password := encode(gen_random_bytes(9), 'base64');
  v_password := substring(replace(replace(replace(v_password, '+', 'A'), '/', 'B'), '=', 'C'), 1, 12);
  
  -- Вставка приглашения
  INSERT INTO student_invitations (
    email,
    full_name,
    invitation_token,
    temp_password_plain,
    invited_by
  ) VALUES (
    p_email,
    p_full_name,
    v_token,
    v_password,
    p_invited_by
  ) RETURNING id INTO v_invitation_id;
  
  -- Возврат данных
  RETURN QUERY SELECT 
    v_invitation_id,
    v_token,
    v_password,
    'https://onai.academy/invite/' || v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: Принять приглашение
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation student_invitations;
BEGIN
  -- Получить приглашение
  SELECT * INTO v_invitation
  FROM student_invitations
  WHERE invitation_token = p_token
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Обновить статус
  UPDATE student_invitations
  SET 
    status = 'accepted',
    accepted_at = NOW()
  WHERE id = v_invitation.id;
  
  -- Создать профиль ученика
  INSERT INTO student_profiles (
    id,
    full_name,
    email,
    email_verified,
    invited_by,
    invited_at
  ) VALUES (
    p_user_id,
    v_invitation.full_name,
    v_invitation.email,
    true,
    v_invitation.invited_by,
    v_invitation.created_at
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: Обновить время последнего входа
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE student_profiles
  SET last_login_at = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- КОММЕНТАРИИ
-- ============================================
COMMENT ON TABLE student_profiles IS 'Профили учеников платформы onAI Academy';
COMMENT ON TABLE student_invitations IS 'Приглашения учеников с уникальными ссылками';
COMMENT ON TABLE password_change_history IS 'История изменений паролей для аудита';
COMMENT ON FUNCTION create_student_invitation IS 'Создать приглашение ученика с уникальным токеном и паролем';
COMMENT ON FUNCTION accept_invitation IS 'Принять приглашение и создать профиль ученика';

-- ========================
-- AI-НАСТАВНИК + AI-АНАЛИТИК
-- Создано: 7 ноября 2025
-- Статус: ОТКЛЮЧЕНО (структура готова)
-- ========================

-- ========================
-- AI-НАСТАВНИК: АНАЛИЗ СТУДЕНТА
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Период анализа
  analysis_date DATE NOT NULL,
  analysis_period VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly
  
  -- === МЕТРИКИ АКТИВНОСТИ ===
  total_time_online INTEGER DEFAULT 0, -- секунд на платформе за день
  lessons_watched INTEGER DEFAULT 0, -- уроков просмотрено
  lessons_completed INTEGER DEFAULT 0, -- уроков завершено (100%)
  modules_completed INTEGER DEFAULT 0, -- модулей завершено
  
  -- === МЕТРИКИ AI-КУРАТОРА ===
  questions_asked INTEGER DEFAULT 0, -- вопросов задано AI-куратору
  ai_conversations INTEGER DEFAULT 0, -- диалогов с AI
  avg_response_satisfaction DECIMAL, -- удовлетворённость ответами (1-5)
  
  -- === ПРОГРЕСС ===
  progress_percentage DECIMAL DEFAULT 0, -- общий прогресс курса
  progress_change DECIMAL, -- изменение за период (+/-)
  stuck_lessons TEXT[], -- уроки где застрял (>2 дня)
  problem_topics TEXT[], -- проблемные темы
  
  -- === НАСТРОЕНИЕ ===
  overall_mood VARCHAR(50), -- positive, neutral, negative, frustrated, demotivated
  mood_trend VARCHAR(50), -- improving, stable, declining
  mood_score DECIMAL, -- балл настроения (0-10)
  frustration_level INTEGER, -- уровень фрустрации (1-5)
  
  -- Индикаторы настроения
  positive_interactions INTEGER DEFAULT 0,
  neutral_interactions INTEGER DEFAULT 0,
  negative_interactions INTEGER DEFAULT 0,
  frustrated_messages INTEGER DEFAULT 0,
  
  -- === ПРОБЛЕМЫ ===
  detected_problems TEXT[], -- выявленные проблемы
  stuck_duration_days INTEGER, -- сколько дней застрял
  needs_help BOOLEAN DEFAULT false,
  
  -- === ДОСТИЖЕНИЯ ===
  achievements_unlocked INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0, -- дней подряд
  streak_broken BOOLEAN DEFAULT false,
  
  -- === АНАЛИЗ ОТ AI ===
  ai_summary TEXT, -- краткое резюме от AI
  ai_insights TEXT[], -- инсайты от AI
  recommendations TEXT[], -- рекомендации действий
  
  -- === УВЕДОМЛЕНИЯ ===
  notification_sent BOOLEAN DEFAULT false,
  notification_type VARCHAR(50), -- motivation, help, achievement, reminder
  notification_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, analysis_date)
);

CREATE INDEX idx_mentor_analysis_user_id ON ai_mentor_analysis(user_id);
CREATE INDEX idx_mentor_analysis_date ON ai_mentor_analysis(analysis_date DESC);
CREATE INDEX idx_mentor_analysis_mood ON ai_mentor_analysis(overall_mood);
CREATE INDEX idx_mentor_analysis_needs_help ON ai_mentor_analysis(needs_help) WHERE needs_help = true;

-- ========================
-- AI-НАСТАВНИК: УВЕДОМЛЕНИЯ
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES ai_mentor_analysis(id) ON DELETE CASCADE,
  
  -- Тип уведомления
  type VARCHAR(50) NOT NULL, 
  -- motivation, reminder, help_offer, achievement, streak, warning
  
  -- Сообщение
  message TEXT NOT NULL,
  message_ru TEXT, -- русский
  message_kk TEXT, -- казахский (опционально)
  
  -- Telegram
  telegram_sent BOOLEAN DEFAULT false,
  telegram_sent_at TIMESTAMPTZ,
  telegram_message_id TEXT,
  
  -- Метаданные
  trigger_reason TEXT, -- почему отправлено
  ai_generated BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- 1-5 (5 = критично)
  
  -- Расписание
  scheduled_for TIMESTAMPTZ, -- когда отправить
  send_immediately BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentor_notif_user_id ON ai_mentor_notifications(user_id);
CREATE INDEX idx_mentor_notif_type ON ai_mentor_notifications(type);
CREATE INDEX idx_mentor_notif_scheduled ON ai_mentor_notifications(scheduled_for) 
  WHERE telegram_sent = false;

-- ========================
-- AI-НАСТАВНИК: ИСТОРИЯ НАСТРОЕНИЯ
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_mood_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Настроение
  mood VARCHAR(50) NOT NULL, -- positive, neutral, negative, frustrated, demotivated
  mood_score DECIMAL NOT NULL, -- 0-10
  confidence DECIMAL DEFAULT 0.7, -- уверенность AI (0-1)
  
  -- Источники данных
  from_curator_chat BOOLEAN DEFAULT false,
  from_lesson_behavior BOOLEAN DEFAULT false,
  from_direct_question BOOLEAN DEFAULT false,
  from_inactivity BOOLEAN DEFAULT false,
  
  -- Индикаторы
  indicators JSONB, 
  
  -- Контекст
  related_lesson_id TEXT,
  related_topic TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_tracking_user_id ON ai_mentor_mood_tracking(user_id);
CREATE INDEX idx_mood_tracking_created ON ai_mentor_mood_tracking(created_at DESC);
CREATE INDEX idx_mood_tracking_mood ON ai_mentor_mood_tracking(mood);

-- ========================
-- AI-НАСТАВНИК: РЕКОМЕНДАЦИИ
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES ai_mentor_analysis(id) ON DELETE CASCADE,
  
  -- Рекомендация
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50), -- motivation, learning, technical, social
  
  -- Приоритет
  priority INTEGER DEFAULT 1, -- 1-5
  is_urgent BOOLEAN DEFAULT false,
  
  -- Действия
  suggested_actions TEXT[], -- что сделать
  resources_links TEXT[], -- полезные ссылки
  
  -- Статус
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Эффективность
  was_helpful BOOLEAN,
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- когда перестаёт быть актуальной
);

CREATE INDEX idx_recommendations_user_id ON ai_mentor_recommendations(user_id);
CREATE INDEX idx_recommendations_priority ON ai_mentor_recommendations(priority DESC);
CREATE INDEX idx_recommendations_urgent ON ai_mentor_recommendations(is_urgent) 
  WHERE is_urgent = true AND is_completed = false;

-- ========================
-- AI-АНАЛИТИК: ОТЧЁТЫ
-- ========================
CREATE TABLE IF NOT EXISTS ai_analytics_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип отчёта
  report_type VARCHAR(50) NOT NULL, 
  -- student_summary, class_overview, platform_trends, curator_effectiveness
  
  -- Период
  period VARCHAR(50) NOT NULL, -- daily, weekly, monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Для кого
  user_id UUID REFERENCES auth.users(id), -- если персональный
  
  -- Данные отчёта
  summary TEXT NOT NULL, -- краткое резюме от AI
  key_metrics JSONB NOT NULL,
  
  insights TEXT[], -- инсайты
  recommendations TEXT[], -- рекомендации
  
  -- Визуализация
  charts_data JSONB,
  
  -- Метаданные
  generated_by_ai BOOLEAN DEFAULT true,
  ai_model VARCHAR(50),
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_reports_type ON ai_analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_period ON ai_analytics_reports(period, period_start DESC);
CREATE INDEX idx_analytics_reports_user ON ai_analytics_reports(user_id) WHERE user_id IS NOT NULL;

-- ========================
-- AI-АНАЛИТИК: ИНСАЙТЫ
-- ========================
CREATE TABLE IF NOT EXISTS ai_analytics_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES ai_analytics_reports(id) ON DELETE CASCADE,
  
  -- Тип инсайта
  insight_type VARCHAR(50) NOT NULL,
  -- trend (тренд), anomaly (аномалия), achievement (успех), problem (проблема)
  
  -- Приоритет
  priority VARCHAR(50) NOT NULL, -- high, medium, low
  severity INTEGER DEFAULT 1, -- 1-5 (5 = критично)
  
  -- Содержание
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_users INTEGER, -- сколько студентов затронуто
  affected_user_ids UUID[], -- конкретные студенты
  
  -- Данные
  metrics JSONB,
  
  -- Действия
  action_required BOOLEAN DEFAULT false,
  action_suggestions TEXT[],
  
  -- Статус
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_type ON ai_analytics_insights(insight_type);
CREATE INDEX idx_insights_priority ON ai_analytics_insights(priority, severity DESC);
CREATE INDEX idx_insights_action ON ai_analytics_insights(action_required) 
  WHERE action_required = true AND is_resolved = false;

-- ========================
-- AI-АНАЛИТИК: ТРЕНДЫ
-- ========================
CREATE TABLE IF NOT EXISTS ai_analytics_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип тренда
  trend_type VARCHAR(50) NOT NULL,
  -- mood, activity, progress, questions, completions
  
  -- Данные
  trend_data JSONB NOT NULL,
  
  -- Анализ
  trend_direction VARCHAR(50), -- up, down, stable
  trend_strength DECIMAL, -- 0-1 (насколько сильный тренд)
  
  -- Прогноз
  prediction JSONB,
  
  -- Период
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trends_type ON ai_analytics_trends(trend_type);
CREATE INDEX idx_trends_period ON ai_analytics_trends(period_start DESC);

-- ========================
-- RLS ПОЛИТИКИ
-- ========================

-- ai_mentor_analysis
ALTER TABLE ai_mentor_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analysis"
  ON ai_mentor_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analysis"
  ON ai_mentor_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ai_mentor_notifications
ALTER TABLE ai_mentor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON ai_mentor_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON ai_mentor_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ai_mentor_mood_tracking
ALTER TABLE ai_mentor_mood_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood"
  ON ai_mentor_mood_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- ai_mentor_recommendations
ALTER TABLE ai_mentor_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
  ON ai_mentor_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON ai_mentor_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- Аналитика: только админы
ALTER TABLE ai_analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view analytics reports"
  ON ai_analytics_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view insights"
  ON ai_analytics_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view trends"
  ON ai_analytics_trends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ========================
-- ТРИГГЕРЫ
-- ========================

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_ai_mentor_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentor_analysis_updated_at
  BEFORE UPDATE ON ai_mentor_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_mentor_analysis_updated_at();

-- ========================
-- КОММЕНТАРИИ
-- ========================
COMMENT ON TABLE ai_mentor_analysis IS 'Ежедневный анализ студентов от AI-наставника (ОТКЛЮЧЕНО)';
COMMENT ON TABLE ai_mentor_notifications IS 'Уведомления студентам в Telegram (ОТКЛЮЧЕНО)';
COMMENT ON TABLE ai_mentor_mood_tracking IS 'История настроения студентов';
COMMENT ON TABLE ai_mentor_recommendations IS 'Рекомендации от AI-наставника';
COMMENT ON TABLE ai_analytics_reports IS 'Отчёты AI-аналитика для админов (ОТКЛЮЧЕНО)';
COMMENT ON TABLE ai_analytics_insights IS 'Инсайты и аномалии';
COMMENT ON TABLE ai_analytics_trends IS 'Тренды платформы';

-- ========================
-- ОТСЛЕЖИВАНИЕ ТОКЕНОВ И ЗАТРАТ
-- Создано: 7 ноября 2025
-- ========================

-- ========================
-- ТАБЛИЦА: Использование токенов по API
-- ========================
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Какой агент
  agent_type VARCHAR(50) NOT NULL,
  -- 'ai_curator', 'ai_mentor', 'ai_analyst'
  
  -- Модель OpenAI
  model VARCHAR(50) NOT NULL,
  -- 'gpt-4o', 'gpt-3.5-turbo', 'whisper-1'
  
  -- Тип операции
  operation_type VARCHAR(50) NOT NULL,
  -- 'text_message', 'voice_transcription', 'image_analysis', 
  -- 'daily_analysis', 'weekly_report', 'monthly_report'
  
  -- Токены
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Специальные метрики для аудио
  audio_duration_seconds INTEGER, -- Для Whisper
  
  -- Стоимость (USD)
  cost_usd DECIMAL(10, 6) NOT NULL,
  cost_kzt DECIMAL(10, 2), -- В тенге (автоматически)
  
  -- Контекст
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thread_id UUID, -- ID диалога/сессии
  request_id TEXT, -- Уникальный ID запроса для дебага
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE -- Для группировки по дням
);

-- Индексы для быстрого поиска
CREATE INDEX idx_token_usage_agent ON ai_token_usage(agent_type);
CREATE INDEX idx_token_usage_model ON ai_token_usage(model);
CREATE INDEX idx_token_usage_date ON ai_token_usage(date DESC);
CREATE INDEX idx_token_usage_user ON ai_token_usage(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_token_usage_created ON ai_token_usage(created_at DESC);

-- ========================
-- ТАБЛИЦА: Дневная агрегация (для быстрого доступа)
-- ========================
CREATE TABLE IF NOT EXISTS ai_token_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  
  -- По агентам
  curator_tokens INTEGER DEFAULT 0,
  curator_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  mentor_tokens INTEGER DEFAULT 0,
  mentor_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  analyst_tokens INTEGER DEFAULT 0,
  analyst_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  -- По моделям
  gpt4o_tokens INTEGER DEFAULT 0,
  gpt4o_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  gpt35_tokens INTEGER DEFAULT 0,
  gpt35_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  whisper_minutes DECIMAL(10, 2) DEFAULT 0,
  whisper_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  -- Общие
  total_tokens INTEGER DEFAULT 0,
  total_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) DEFAULT 0,
  
  -- Метаданные
  request_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

CREATE INDEX idx_daily_usage_date ON ai_token_usage_daily(date DESC);

-- ========================
-- ТАБЛИЦА: Лимиты и бюджет
-- ========================
CREATE TABLE IF NOT EXISTS ai_budget_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Лимиты
  daily_limit_kzt DECIMAL(10, 2) DEFAULT 5000,   -- 5000 KZT в день
  monthly_limit_kzt DECIMAL(10, 2) DEFAULT 100000, -- 100,000 KZT в месяц
  
  -- Алерты
  alert_threshold_percentage INTEGER DEFAULT 80, -- При 80% лимита
  alert_enabled BOOLEAN DEFAULT true,
  
  -- Email/Telegram для алертов
  alert_contacts JSONB,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем дефолтные лимиты
INSERT INTO ai_budget_limits (id) 
VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- ========================
-- ФУНКЦИИ
-- ========================

-- Функция: Логирование использования токенов
CREATE OR REPLACE FUNCTION log_token_usage(
  p_agent_type VARCHAR,
  p_model VARCHAR,
  p_operation_type VARCHAR,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_audio_duration_seconds INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_total_tokens INTEGER;
  v_cost_usd DECIMAL(10, 6);
  v_cost_kzt DECIMAL(10, 2);
  v_usage_id UUID;
  v_exchange_rate DECIMAL(6, 2) := 450.0; -- 1 USD = 450 KZT
BEGIN
  -- Вычисляем общие токены
  v_total_tokens := p_prompt_tokens + p_completion_tokens;
  
  -- Вычисляем стоимость в зависимости от модели
  IF p_model = 'gpt-4o' THEN
    -- GPT-4o: $2.50 input, $10.00 output per 1M tokens
    v_cost_usd := 
      (p_prompt_tokens * 0.0000025) + 
      (p_completion_tokens * 0.000010);
  
  ELSIF p_model = 'gpt-3.5-turbo' THEN
    -- GPT-3.5-turbo: $0.50 input, $1.50 output per 1M tokens
    v_cost_usd := 
      (p_prompt_tokens * 0.0000005) + 
      (p_completion_tokens * 0.0000015);
  
  ELSIF p_model = 'whisper-1' THEN
    -- Whisper: $0.006 per minute
    v_cost_usd := (p_audio_duration_seconds / 60.0) * 0.006;
    v_total_tokens := 0; -- Whisper не использует токены
  
  ELSE
    v_cost_usd := 0;
  END IF;
  
  -- Конвертируем в KZT
  v_cost_kzt := v_cost_usd * v_exchange_rate;
  
  -- Вставляем запись
  INSERT INTO ai_token_usage (
    agent_type,
    model,
    operation_type,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    audio_duration_seconds,
    cost_usd,
    cost_kzt,
    user_id,
    thread_id,
    request_id,
    date
  ) VALUES (
    p_agent_type,
    p_model,
    p_operation_type,
    p_prompt_tokens,
    p_completion_tokens,
    v_total_tokens,
    p_audio_duration_seconds,
    v_cost_usd,
    v_cost_kzt,
    p_user_id,
    p_thread_id,
    p_request_id,
    CURRENT_DATE
  ) RETURNING id INTO v_usage_id;
  
  -- Обновляем дневную агрегацию
  PERFORM update_daily_aggregation(CURRENT_DATE);
  
  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Обновление дневной агрегации
CREATE OR REPLACE FUNCTION update_daily_aggregation(p_date DATE)
RETURNS VOID AS $$
DECLARE
  v_curator_tokens INTEGER;
  v_curator_cost DECIMAL(10, 2);
  v_mentor_tokens INTEGER;
  v_mentor_cost DECIMAL(10, 2);
  v_analyst_tokens INTEGER;
  v_analyst_cost DECIMAL(10, 2);
  v_gpt4o_tokens INTEGER;
  v_gpt4o_cost DECIMAL(10, 2);
  v_gpt35_tokens INTEGER;
  v_gpt35_cost DECIMAL(10, 2);
  v_whisper_minutes DECIMAL(10, 2);
  v_whisper_cost DECIMAL(10, 2);
  v_total_tokens INTEGER;
  v_total_cost DECIMAL(10, 2);
  v_total_cost_usd DECIMAL(10, 2);
  v_request_count INTEGER;
  v_unique_users INTEGER;
BEGIN
  -- Агрегируем данные за день
  
  -- По агентам
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_curator_tokens, v_curator_cost
  FROM ai_token_usage
  WHERE date = p_date AND agent_type = 'ai_curator';
  
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_mentor_tokens, v_mentor_cost
  FROM ai_token_usage
  WHERE date = p_date AND agent_type = 'ai_mentor';
  
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_analyst_tokens, v_analyst_cost
  FROM ai_token_usage
  WHERE date = p_date AND agent_type = 'ai_analyst';
  
  -- По моделям
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_gpt4o_tokens, v_gpt4o_cost
  FROM ai_token_usage
  WHERE date = p_date AND model = 'gpt-4o';
  
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_gpt35_tokens, v_gpt35_cost
  FROM ai_token_usage
  WHERE date = p_date AND model = 'gpt-3.5-turbo';
  
  SELECT 
    COALESCE(SUM(audio_duration_seconds) / 60.0, 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_whisper_minutes, v_whisper_cost
  FROM ai_token_usage
  WHERE date = p_date AND model = 'whisper-1';
  
  -- Общие метрики
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0),
    COALESCE(SUM(cost_usd), 0),
    COUNT(*),
    COUNT(DISTINCT user_id)
  INTO 
    v_total_tokens,
    v_total_cost,
    v_total_cost_usd,
    v_request_count,
    v_unique_users
  FROM ai_token_usage
  WHERE date = p_date;
  
  -- Вставляем или обновляем дневную запись
  INSERT INTO ai_token_usage_daily (
    date,
    curator_tokens,
    curator_cost_kzt,
    mentor_tokens,
    mentor_cost_kzt,
    analyst_tokens,
    analyst_cost_kzt,
    gpt4o_tokens,
    gpt4o_cost_kzt,
    gpt35_tokens,
    gpt35_cost_kzt,
    whisper_minutes,
    whisper_cost_kzt,
    total_tokens,
    total_cost_kzt,
    total_cost_usd,
    request_count,
    unique_users
  ) VALUES (
    p_date,
    v_curator_tokens,
    v_curator_cost,
    v_mentor_tokens,
    v_mentor_cost,
    v_analyst_tokens,
    v_analyst_cost,
    v_gpt4o_tokens,
    v_gpt4o_cost,
    v_gpt35_tokens,
    v_gpt35_cost,
    v_whisper_minutes,
    v_whisper_cost,
    v_total_tokens,
    v_total_cost,
    v_total_cost_usd,
    v_request_count,
    v_unique_users
  )
  ON CONFLICT (date) DO UPDATE SET
    curator_tokens = EXCLUDED.curator_tokens,
    curator_cost_kzt = EXCLUDED.curator_cost_kzt,
    mentor_tokens = EXCLUDED.mentor_tokens,
    mentor_cost_kzt = EXCLUDED.mentor_cost_kzt,
    analyst_tokens = EXCLUDED.analyst_tokens,
    analyst_cost_kzt = EXCLUDED.analyst_cost_kzt,
    gpt4o_tokens = EXCLUDED.gpt4o_tokens,
    gpt4o_cost_kzt = EXCLUDED.gpt4o_cost_kzt,
    gpt35_tokens = EXCLUDED.gpt35_tokens,
    gpt35_cost_kzt = EXCLUDED.gpt35_cost_kzt,
    whisper_minutes = EXCLUDED.whisper_minutes,
    whisper_cost_kzt = EXCLUDED.whisper_cost_kzt,
    total_tokens = EXCLUDED.total_tokens,
    total_cost_kzt = EXCLUDED.total_cost_kzt,
    total_cost_usd = EXCLUDED.total_cost_usd,
    request_count = EXCLUDED.request_count,
    unique_users = EXCLUDED.unique_users,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Функция: Проверка лимитов и алерты
CREATE OR REPLACE FUNCTION check_budget_limits()
RETURNS TABLE (
  limit_exceeded BOOLEAN,
  current_daily_kzt DECIMAL,
  current_monthly_kzt DECIMAL,
  daily_limit_kzt DECIMAL,
  monthly_limit_kzt DECIMAL,
  alert_message TEXT
) AS $$
DECLARE
  v_limits ai_budget_limits;
  v_daily_spent DECIMAL(10, 2);
  v_monthly_spent DECIMAL(10, 2);
  v_daily_limit DECIMAL(10, 2);
  v_monthly_limit DECIMAL(10, 2);
  v_alert_threshold INTEGER;
BEGIN
  -- Получаем лимиты
  SELECT * INTO v_limits FROM ai_budget_limits LIMIT 1;
  
  v_daily_limit := v_limits.daily_limit_kzt;
  v_monthly_limit := v_limits.monthly_limit_kzt;
  v_alert_threshold := v_limits.alert_threshold_percentage;
  
  -- Текущие затраты за сегодня
  SELECT COALESCE(total_cost_kzt, 0) INTO v_daily_spent
  FROM ai_token_usage_daily
  WHERE date = CURRENT_DATE;
  
  -- Текущие затраты за месяц
  SELECT COALESCE(SUM(total_cost_kzt), 0) INTO v_monthly_spent
  FROM ai_token_usage_daily
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
  
  -- Формируем результат
  RETURN QUERY SELECT
    (v_daily_spent >= v_daily_limit OR v_monthly_spent >= v_monthly_limit) AS limit_exceeded,
    v_daily_spent AS current_daily_kzt,
    v_monthly_spent AS current_monthly_kzt,
    v_daily_limit AS daily_limit_kzt,
    v_monthly_limit AS monthly_limit_kzt,
    CASE
      WHEN v_daily_spent >= v_daily_limit THEN 
        '⚠️ Дневной лимит превышен!'
      WHEN v_monthly_spent >= v_monthly_limit THEN 
        '⚠️ Месячный лимит превышен!'
      WHEN (v_daily_spent / v_daily_limit * 100) >= v_alert_threshold THEN
        format('⚠️ Израсходовано %s%% дневного лимита', ROUND(v_daily_spent / v_daily_limit * 100))
      WHEN (v_monthly_spent / v_monthly_limit * 100) >= v_alert_threshold THEN
        format('⚠️ Израсходовано %s%% месячного лимита', ROUND(v_monthly_spent / v_monthly_limit * 100))
      ELSE
        '✅ В пределах лимитов'
    END AS alert_message;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- RLS POLICIES
-- ========================

-- Только админы видят использование токенов
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view token usage"
  ON ai_token_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view daily usage"
  ON ai_token_usage_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view budget limits"
  ON ai_budget_limits FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ========================
-- ТРИГГЕРЫ
-- ========================

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_token_usage_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_usage_updated_at
  BEFORE UPDATE ON ai_token_usage_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_token_usage_daily_updated_at();

-- ========================
-- КОММЕНТАРИИ
-- ========================
COMMENT ON TABLE ai_token_usage IS 'Детальное логирование использования токенов OpenAI по каждому запросу';
COMMENT ON TABLE ai_token_usage_daily IS 'Дневная агрегация токенов для быстрого доступа и графиков';
COMMENT ON TABLE ai_budget_limits IS 'Лимиты и бюджет на AI агенты';
COMMENT ON FUNCTION log_token_usage IS 'Логирование использования токенов с автоматическим расчётом стоимости';
COMMENT ON FUNCTION update_daily_aggregation IS 'Обновление дневной агрегации';
COMMENT ON FUNCTION check_budget_limits IS 'Проверка лимитов и генерация алертов';

-- ========================
-- ЧАТ МЕЖДУ УЧЕНИКАМИ
-- Создано: 7 ноября 2025
-- ========================

-- ========================
-- ТАБЛИЦА: Личные чаты (приватные)
-- ========================
CREATE TABLE IF NOT EXISTS student_private_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Участники (2 студента)
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Метаданные чата
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  last_message_from UUID REFERENCES auth.users(id),
  
  -- Счётчики непрочитанных
  unread_count_user1 INTEGER DEFAULT 0,
  unread_count_user2 INTEGER DEFAULT 0,
  
  -- Статус
  is_archived_user1 BOOLEAN DEFAULT false,
  is_archived_user2 BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  blocked_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: один чат между двумя студентами
  CONSTRAINT unique_chat_users UNIQUE (
    LEAST(user1_id, user2_id), 
    GREATEST(user1_id, user2_id)
  )
);

CREATE INDEX idx_private_chats_user1 ON student_private_chats(user1_id);
CREATE INDEX idx_private_chats_user2 ON student_private_chats(user2_id);
CREATE INDEX idx_private_chats_updated ON student_private_chats(updated_at DESC);

-- ========================
-- ТАБЛИЦА: Сообщения в приватных чатах
-- ========================
CREATE TABLE IF NOT EXISTS student_private_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  chat_id UUID NOT NULL REFERENCES student_private_chats(id) ON DELETE CASCADE,
  
  -- Отправитель
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Содержание
  message_type VARCHAR(50) DEFAULT 'text',
  -- 'text', 'image', 'file', 'voice'
  
  content TEXT NOT NULL,
  
  -- Вложения
  attachment_url TEXT,
  attachment_type VARCHAR(50), -- 'image/png', 'application/pdf', etc
  attachment_name TEXT,
  attachment_size INTEGER, -- bytes
  
  -- Статус прочтения
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Редактирование/удаление
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  -- Ответ на сообщение (опционально)
  reply_to_message_id UUID REFERENCES student_private_messages(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_private_messages_chat ON student_private_messages(chat_id, created_at DESC);
CREATE INDEX idx_private_messages_sender ON student_private_messages(sender_id);
CREATE INDEX idx_private_messages_unread ON student_private_messages(is_read) WHERE is_read = false;

-- ========================
-- ТАБЛИЦА: Групповые чаты
-- ========================
CREATE TABLE IF NOT EXISTS student_group_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Информация о группе
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  
  -- Создатель
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Настройки
  is_public BOOLEAN DEFAULT false, -- Публичная группа или приватная
  max_members INTEGER DEFAULT 50,
  
  -- Метаданные
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  last_message_from UUID REFERENCES auth.users(id),
  
  -- Статус
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_chats_created_by ON student_group_chats(created_by);
CREATE INDEX idx_group_chats_public ON student_group_chats(is_public) WHERE is_public = true;
CREATE INDEX idx_group_chats_updated ON student_group_chats(updated_at DESC);

-- ========================
-- ТАБЛИЦА: Участники групповых чатов
-- ========================
CREATE TABLE IF NOT EXISTS student_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  group_id UUID NOT NULL REFERENCES student_group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Роль в группе
  role VARCHAR(50) DEFAULT 'member',
  -- 'admin', 'moderator', 'member'
  
  -- Настройки
  notifications_enabled BOOLEAN DEFAULT true,
  
  -- Счётчик непрочитанных
  unread_count INTEGER DEFAULT 0,
  last_read_message_id UUID,
  
  -- Статус
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON student_group_members(group_id);
CREATE INDEX idx_group_members_user ON student_group_members(user_id);

-- ========================
-- ТАБЛИЦА: Сообщения в групповых чатах
-- ========================
CREATE TABLE IF NOT EXISTS student_group_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  group_id UUID NOT NULL REFERENCES student_group_chats(id) ON DELETE CASCADE,
  
  -- Отправитель
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Содержание
  message_type VARCHAR(50) DEFAULT 'text',
  content TEXT NOT NULL,
  
  -- Вложения
  attachment_url TEXT,
  attachment_type VARCHAR(50),
  attachment_name TEXT,
  attachment_size INTEGER,
  
  -- Редактирование/удаление
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  -- Ответ на сообщение
  reply_to_message_id UUID REFERENCES student_group_messages(id) ON DELETE SET NULL,
  
  -- Упоминания (@username)
  mentions UUID[], -- Массив ID упомянутых пользователей
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_group_messages_group ON student_group_messages(group_id, created_at DESC);
CREATE INDEX idx_group_messages_sender ON student_group_messages(sender_id);

-- ========================
-- ТАБЛИЦА: Прочтение сообщений в группах
-- ========================
CREATE TABLE IF NOT EXISTS student_group_message_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  message_id UUID NOT NULL REFERENCES student_group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  read_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_group_reads_message ON student_group_message_reads(message_id);
CREATE INDEX idx_group_reads_user ON student_group_message_reads(user_id);

-- ========================
-- ФУНКЦИИ
-- ========================

-- Функция: Создать или получить приватный чат
CREATE OR REPLACE FUNCTION get_or_create_private_chat(
  p_user1_id UUID,
  p_user2_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
  v_min_user UUID;
  v_max_user UUID;
BEGIN
  -- Упорядочиваем ID для уникальности
  IF p_user1_id < p_user2_id THEN
    v_min_user := p_user1_id;
    v_max_user := p_user2_id;
  ELSE
    v_min_user := p_user2_id;
    v_max_user := p_user1_id;
  END IF;
  
  -- Ищем существующий чат
  SELECT id INTO v_chat_id
  FROM student_private_chats
  WHERE 
    LEAST(user1_id, user2_id) = v_min_user AND
    GREATEST(user1_id, user2_id) = v_max_user;
  
  -- Если не найден, создаём
  IF v_chat_id IS NULL THEN
    INSERT INTO student_private_chats (user1_id, user2_id)
    VALUES (v_min_user, v_max_user)
    RETURNING id INTO v_chat_id;
  END IF;
  
  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Отправить сообщение в приватный чат
CREATE OR REPLACE FUNCTION send_private_message(
  p_sender_id UUID,
  p_recipient_id UUID,
  p_content TEXT,
  p_message_type VARCHAR DEFAULT 'text',
  p_attachment_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_chat_id UUID;
  v_message_id UUID;
BEGIN
  -- Получаем или создаём чат
  v_chat_id := get_or_create_private_chat(p_sender_id, p_recipient_id);
  
  -- Вставляем сообщение
  INSERT INTO student_private_messages (
    chat_id,
    sender_id,
    message_type,
    content,
    attachment_url
  ) VALUES (
    v_chat_id,
    p_sender_id,
    p_message_type,
    p_content,
    p_attachment_url
  ) RETURNING id INTO v_message_id;
  
  -- Обновляем чат
  UPDATE student_private_chats SET
    last_message_at = NOW(),
    last_message_text = p_content,
    last_message_from = p_sender_id,
    updated_at = NOW(),
    -- Увеличиваем счётчик непрочитанных для получателя
    unread_count_user1 = CASE 
      WHEN user1_id = p_recipient_id THEN unread_count_user1 + 1 
      ELSE unread_count_user1 
    END,
    unread_count_user2 = CASE 
      WHEN user2_id = p_recipient_id THEN unread_count_user2 + 1 
      ELSE unread_count_user2 
    END
  WHERE id = v_chat_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Отметить сообщения как прочитанные
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_chat_id UUID,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Отмечаем непрочитанные сообщения
  UPDATE student_private_messages SET
    is_read = true,
    read_at = NOW()
  WHERE 
    chat_id = p_chat_id AND
    sender_id != p_user_id AND
    is_read = false;
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Сбрасываем счётчик непрочитанных
  UPDATE student_private_chats SET
    unread_count_user1 = CASE 
      WHEN user1_id = p_user_id THEN 0 
      ELSE unread_count_user1 
    END,
    unread_count_user2 = CASE 
      WHEN user2_id = p_user_id THEN 0 
      ELSE unread_count_user2 
    END
  WHERE id = p_chat_id;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- RLS POLICIES
-- ========================

-- Приватные чаты: только участники видят
ALTER TABLE student_private_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chats"
  ON student_private_chats FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create chats"
  ON student_private_chats FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update their own chats"
  ON student_private_chats FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Приватные сообщения: только участники чата видят
ALTER TABLE student_private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chats"
  ON student_private_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_private_chats
      WHERE student_private_chats.id = student_private_messages.chat_id
      AND (student_private_chats.user1_id = auth.uid() OR student_private_chats.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages"
  ON student_private_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON student_private_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Групповые чаты: участники видят
ALTER TABLE student_group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public groups"
  ON student_group_chats FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Members can view their groups"
  ON student_group_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_group_members
      WHERE student_group_members.group_id = student_group_chats.id
      AND student_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON student_group_chats FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Участники групп
ALTER TABLE student_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group membership"
  ON student_group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM student_group_members sgm
      WHERE sgm.group_id = student_group_members.group_id
      AND sgm.user_id = auth.uid()
    )
  );

-- Сообщения в группах
ALTER TABLE student_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group messages"
  ON student_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM student_group_members
      WHERE student_group_members.group_id = student_group_messages.group_id
      AND student_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can send group messages"
  ON student_group_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM student_group_members
      WHERE student_group_members.group_id = group_id
      AND student_group_members.user_id = auth.uid()
    )
  );

-- ========================
-- ТРИГГЕРЫ
-- ========================

-- Автообновление updated_at для чатов
CREATE TRIGGER trigger_update_private_chats_updated_at
  BEFORE UPDATE ON student_private_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_group_chats_updated_at
  BEFORE UPDATE ON student_group_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================
-- КОММЕНТАРИИ
-- ========================
COMMENT ON TABLE student_private_chats IS 'Приватные чаты между двумя учениками';
COMMENT ON TABLE student_private_messages IS 'Сообщения в приватных чатах';
COMMENT ON TABLE student_group_chats IS 'Групповые чаты для учеников';
COMMENT ON TABLE student_group_members IS 'Участники групповых чатов';
COMMENT ON TABLE student_group_messages IS 'Сообщения в групповых чатах';
COMMENT ON FUNCTION get_or_create_private_chat IS 'Получить существующий или создать новый приватный чат';
COMMENT ON FUNCTION send_private_message IS 'Отправить сообщение в приватный чат';
COMMENT ON FUNCTION mark_messages_as_read IS 'Отметить сообщения как прочитанные';

