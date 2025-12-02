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

