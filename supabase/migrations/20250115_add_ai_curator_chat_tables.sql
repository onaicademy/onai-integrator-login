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

