-- ============================================
-- 🗄️ ПОЛНАЯ БАЗА ДАННЫХ onAI Academy
-- ============================================
-- Скопируй ВЕСЬ скрипт и запусти в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx/sql

-- ============================================
-- 🧹 ОЧИСТКА (удаляем старые таблицы если есть)
-- ============================================

DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.user_stats CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- 1️⃣ ТАБЛИЦА: public.users (Профили пользователей)
-- ============================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT '',
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  is_ceo BOOLEAN DEFAULT false,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- Индексы для быстрого поиска
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);

-- Комментарии
COMMENT ON TABLE public.users IS 'Профили пользователей платформы';
COMMENT ON COLUMN public.users.role IS 'Роль: student (студент), teacher (преподаватель), admin (администратор)';
COMMENT ON COLUMN public.users.is_ceo IS 'CEO платформы (saint@onaiacademy.kz)';
COMMENT ON COLUMN public.users.total_xp IS 'Общее количество XP (опыта)';
COMMENT ON COLUMN public.users.level IS 'Уровень пользователя (рассчитывается по XP)';

-- ============================================
-- 2️⃣ ТАБЛИЦА: public.achievements (Достижения)
-- ============================================

CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- эмодзи или URL иконки
  xp_reward INTEGER DEFAULT 0,
  category TEXT, -- 'course', 'lesson', 'streak', 'special'
  requirement_type TEXT, -- 'lessons_completed', 'days_streak', 'xp_earned'
  requirement_value INTEGER, -- количество для достижения
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_achievements_category ON public.achievements(category);

-- Комментарии
COMMENT ON TABLE public.achievements IS 'Список всех достижений на платформе';

-- Начальные достижения
INSERT INTO public.achievements (title, description, icon, xp_reward, category, requirement_type, requirement_value) VALUES
('🚀 Первый шаг', 'Завершил первый урок', '🚀', 10, 'lesson', 'lessons_completed', 1),
('📚 Ученик', 'Завершил 5 уроков', '📚', 50, 'lesson', 'lessons_completed', 5),
('🎓 Студент', 'Завершил 10 уроков', '🎓', 100, 'lesson', 'lessons_completed', 10),
('🏆 Магистр', 'Завершил 25 уроков', '🏆', 250, 'lesson', 'lessons_completed', 25),
('⚡ Молния', '3 дня подряд на платформе', '⚡', 30, 'streak', 'days_streak', 3),
('🔥 В огне', '7 дней подряд на платформе', '🔥', 70, 'streak', 'days_streak', 7),
('💎 Бриллиант', '30 дней подряд на платформе', '💎', 300, 'streak', 'days_streak', 30),
('🌟 Новичок', 'Заработал 100 XP', '🌟', 20, 'xp', 'xp_earned', 100),
('💫 Опытный', 'Заработал 500 XP', '💫', 50, 'xp', 'xp_earned', 500),
('✨ Мастер', 'Заработал 1000 XP', '✨', 100, 'xp', 'xp_earned', 1000);

-- ============================================
-- 3️⃣ ТАБЛИЦА: public.user_achievements (Достижения пользователей)
-- ============================================

CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id) -- пользователь не может получить одно достижение дважды
);

-- Индексы
CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);

-- Комментарии
COMMENT ON TABLE public.user_achievements IS 'Достижения, полученные пользователями';

-- ============================================
-- 4️⃣ ТАБЛИЦА: public.user_progress (Прогресс по урокам)
-- ============================================

CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent INTEGER DEFAULT 0, -- секунды
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, module_id, lesson_id)
);

-- Индексы
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON public.user_progress(course_id);
CREATE INDEX idx_user_progress_completed ON public.user_progress(completed);

-- Комментарии
COMMENT ON TABLE public.user_progress IS 'Прогресс пользователей по курсам и урокам';

-- ============================================
-- 5️⃣ ТАБЛИЦА: public.user_stats (Статистика пользователей)
-- ============================================

CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0,
  lessons_in_progress INTEGER DEFAULT 0,
  total_study_time INTEGER DEFAULT 0, -- минуты
  current_streak INTEGER DEFAULT 0, -- текущая серия дней подряд
  longest_streak INTEGER DEFAULT 0, -- лучшая серия
  last_activity_date DATE,
  courses_started INTEGER DEFAULT 0,
  courses_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);

-- Комментарии
COMMENT ON TABLE public.user_stats IS 'Общая статистика активности пользователей';

-- ============================================
-- 🔄 ТРИГГЕР: Автоматическое создание профиля
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Создаём профиль в public.users
  INSERT INTO public.users (id, email, full_name, role, is_ceo, created_at, last_login_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    (new.email = 'saint@onaiacademy.kz'), -- CEO только для этого email
    now(),
    now()
  );

  -- Создаём статистику пользователя
  INSERT INTO public.user_stats (user_id, created_at)
  VALUES (new.id, now());

  RETURN new;
END;
$$;

-- Триггер срабатывает при создании пользователя в auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 🔐 RLS (Row Level Security) - Безопасность
-- ============================================

-- Включаем RLS для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- ПОЛИТИКИ для public.users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" 
  ON public.users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR is_ceo = true)
    )
  );

-- ПОЛИТИКИ для public.achievements (все могут читать)
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements" 
  ON public.achievements FOR SELECT 
  TO authenticated 
  USING (true);

-- ПОЛИТИКИ для public.user_achievements
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" 
  ON public.user_achievements FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements" 
  ON public.user_achievements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ПОЛИТИКИ для public.user_progress
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" 
  ON public.user_progress FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress" 
  ON public.user_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress" 
  ON public.user_progress FOR UPDATE 
  USING (auth.uid() = user_id);

-- ПОЛИТИКИ для public.user_stats
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
CREATE POLICY "Users can view own stats" 
  ON public.user_stats FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
CREATE POLICY "Users can update own stats" 
  ON public.user_stats FOR UPDATE 
  USING (auth.uid() = user_id);

-- ============================================
-- ✅ СОЗДАНИЕ АДМИНСКОГО ПРОФИЛЯ
-- ============================================

-- Проверяем существует ли пользователь saint@onaiacademy.kz в auth.users
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Ищем пользователя в auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'saint@onaiacademy.kz';

  -- Если найден, создаём/обновляем профиль
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.users (id, email, full_name, role, is_ceo, total_xp, level)
    VALUES (
      admin_user_id,
      'saint@onaiacademy.kz',
      'Admin OnAI Academy',
      'admin',
      true,
      0,
      1
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'admin',
      is_ceo = true,
      updated_at = now();

    -- Создаём статистику если её нет
    INSERT INTO public.user_stats (user_id)
    VALUES (admin_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE '✅ Админ профиль создан/обновлён для saint@onaiacademy.kz';
  ELSE
    RAISE NOTICE '⚠️ Пользователь saint@onaiacademy.kz не найден в auth.users';
    RAISE NOTICE 'Создай его вручную: Authentication → Users → Add user';
  END IF;
END $$;

-- ============================================
-- 📊 ПРОВЕРКА: Показываем что создано
-- ============================================

SELECT '✅ ТАБЛИЦЫ СОЗДАНЫ' as status;

SELECT 
  tablename as table_name,
  'Создана' as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT '✅ ДОСТИЖЕНИЯ ДОБАВЛЕНЫ' as status;

SELECT 
  COUNT(*) as total_achievements,
  'Добавлено' as status
FROM public.achievements;

SELECT '✅ ПОЛЬЗОВАТЕЛИ' as status;

SELECT 
  id,
  email,
  full_name,
  role,
  is_ceo,
  total_xp,
  level,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- ============================================
-- 🎉 ГОТОВО!
-- ============================================

SELECT '🎉 БАЗА ДАННЫХ НАСТРОЕНА!' as message;
SELECT '✅ Все таблицы созданы' as step_1;
SELECT '✅ Триггеры настроены' as step_2;
SELECT '✅ RLS политики активны' as step_3;
SELECT '✅ Автосинхронизация работает' as step_4;
SELECT '' as separator;
SELECT '📝 СЛЕДУЮЩИЙ ШАГ:' as next;
SELECT 'Создай студента через Dashboard или Edge Function' as action;
SELECT 'Он автоматически получит профиль, статистику и сможет получать достижения!' as result;

