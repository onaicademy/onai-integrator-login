-- 🔧 ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ
-- Запусти этот SQL в Supabase Dashboard → SQL Editor

-- ============================================
-- 1. Добавить колонку last_login_at в profiles
-- ============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ============================================
-- 2. Проверить существует ли student_profiles
-- ============================================
-- Если таблицы нет, создаём её
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{}',
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создать индексы
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_is_active ON public.student_profiles(is_active);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. Создать RLS политики для student_profiles
-- ============================================

-- Удалить старые политики если есть
DROP POLICY IF EXISTS "Users can read own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can read all student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can update student profiles" ON public.student_profiles;
DROP POLICY IF EXISTS "Admins can insert student profiles" ON public.student_profiles;

-- Пользователи могут читать свой профиль
CREATE POLICY "Users can read own student profile"
ON public.student_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Админы могут читать все профили
CREATE POLICY "Admins can read all student profiles"
ON public.student_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- Админы могут обновлять профили
CREATE POLICY "Admins can update student profiles"
ON public.student_profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- Админы могут создавать профили
CREATE POLICY "Admins can insert student profiles"
ON public.student_profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- ============================================
-- 4. Мигрировать существующие пользователи
-- ============================================
-- Создать student_profiles для всех кто есть в profiles с ролью student

INSERT INTO public.student_profiles (
  id,
  full_name,
  email,
  phone,
  is_active,
  last_login_at,
  created_at,
  updated_at
)
SELECT 
  p.id,
  COALESCE(p.full_name, 'Без имени'),
  p.email,
  NULL as phone,
  p.is_active,
  p.last_login_at,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.student_profiles sp ON sp.id = p.id
WHERE sp.id IS NULL  -- только те, кого ещё нет в student_profiles
  AND p.role = 'student';

-- ============================================
-- 5. Создать триггер для автоматической синхронизации
-- ============================================
-- Когда создаётся новый профиль со статусом student, 
-- автоматически создавать запись в student_profiles

CREATE OR REPLACE FUNCTION public.create_student_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO public.student_profiles (
      id,
      full_name,
      email,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.full_name, 'Без имени'),
      NEW.email,
      NEW.is_active,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создать триггер
DROP TRIGGER IF EXISTS create_student_profile_trigger ON public.profiles;
CREATE TRIGGER create_student_profile_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_student_profile_on_signup();

-- ============================================
-- 6. Проверка результатов
-- ============================================

-- Посмотреть всех пользователей в profiles
SELECT id, email, full_name, role, is_active, last_login_at 
FROM public.profiles 
ORDER BY created_at DESC;

-- Посмотреть всех студентов в student_profiles
SELECT id, email, full_name, is_active, total_xp, level, created_at 
FROM public.student_profiles 
ORDER BY created_at DESC;

-- Посмотреть сколько студентов
SELECT COUNT(*) as total_students FROM public.student_profiles;

-- ============================================
-- ✅ ГОТОВО!
-- ============================================
-- После выполнения этого скрипта:
-- 1. Колонка last_login_at добавлена в profiles
-- 2. Таблица student_profiles создана (если не было)
-- 3. RLS политики настроены
-- 4. Существующие студенты мигрированы
-- 5. Триггер создан для автоматической синхронизации

