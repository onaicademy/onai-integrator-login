-- =====================================================
-- СИСТЕМА НАЗНАЧЕНИЯ КУРСОВ СТУДЕНТАМ
-- =====================================================

-- 1. Создаём таблицу курсов (справочник)
CREATE TABLE IF NOT EXISTS public.courses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Заполняем базовые курсы
INSERT INTO public.courses (id, name, slug, description) VALUES
  (1, 'Интегратор 2.0', 'integrator', 'Создавай автоматизации и интеграции с AI для бизнеса'),
  (2, 'Креатор 2.0', 'creator', 'Генерируй контент с помощью AI: тексты, изображения, видео'),
  (3, 'Программист на Cursor', 'programmer', 'Разработка веб-приложений с AI-ассистентом Cursor')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description;

-- 2. Создаём таблицу для связи "студент ↔ курсы"
CREATE TABLE IF NOT EXISTS public.user_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  
  -- Статус доступа
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Метаданные
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Дата окончания доступа (null = бессрочно)
  
  -- Прогресс (опционально)
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Уникальность: один курс для одного пользователя
  UNIQUE(user_id, course_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON public.user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON public.user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_active ON public.user_courses(user_id, is_active);

-- Комментарии
COMMENT ON TABLE public.courses IS 'Справочник курсов на платформе';
COMMENT ON TABLE public.user_courses IS 'Назначенные курсы для каждого студента';
COMMENT ON COLUMN public.user_courses.expires_at IS 'Дата окончания доступа к курсу (null = бессрочно)';
COMMENT ON COLUMN public.user_courses.progress_percentage IS 'Процент прохождения курса (0-100)';

-- 3. RLS политики для courses (публичное чтение)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active courses"
ON public.courses FOR SELECT
TO authenticated
USING (is_active = true);

-- 4. RLS политики для user_courses
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои курсы
CREATE POLICY "Users can view their own courses"
ON public.user_courses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Админы видят все назначения курсов
CREATE POLICY "Admins can view all user courses"
ON public.user_courses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Админы могут назначать курсы
CREATE POLICY "Admins can insert user courses"
ON public.user_courses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Админы могут обновлять назначения
CREATE POLICY "Admins can update user courses"
ON public.user_courses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Админы могут удалять назначения
CREATE POLICY "Admins can delete user courses"
ON public.user_courses FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- ФУНКЦИЯ: Получить список курсов студента
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_courses(user_uuid UUID)
RETURNS TABLE (
  course_id INTEGER,
  course_name TEXT,
  course_slug TEXT,
  is_active BOOLEAN,
  progress_percentage INTEGER,
  assigned_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    c.id AS course_id,
    c.name AS course_name,
    c.slug AS course_slug,
    uc.is_active,
    uc.progress_percentage,
    uc.assigned_at,
    uc.expires_at
  FROM public.user_courses uc
  JOIN public.courses c ON c.id = uc.course_id
  WHERE uc.user_id = user_uuid
  ORDER BY uc.assigned_at DESC;
$$;

-- =====================================================
-- ГОТОВО!
-- =====================================================

-- Проверка:
SELECT * FROM public.courses;
SELECT * FROM public.user_courses LIMIT 1;

-- Пример назначения курсов студенту:
-- INSERT INTO public.user_courses (user_id, course_id) VALUES
--   ('USER_UUID_HERE', 1), -- Интегратор
--   ('USER_UUID_HERE', 2), -- Креатор
--   ('USER_UUID_HERE', 3); -- Программист

-- Пример получения курсов студента:
-- SELECT * FROM get_user_courses('USER_UUID_HERE');

