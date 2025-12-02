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

