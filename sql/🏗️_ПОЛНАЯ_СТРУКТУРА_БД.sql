-- 🏗️ ПОЛНАЯ СТРУКТУРА БАЗЫ ДАННЫХ onAI Academy
-- Создаёт ВСЁ сразу: таблицы, колонки, триггеры, RLS
-- Запускать ОДИН РАЗ

-- ============================================
-- 1. ТАБЛИЦА users - ДОБАВЛЯЕМ НЕДОСТАЮЩИЕ КОЛОНКИ
-- ============================================

-- Добавляем все нужные колонки (если их нет)
DO $$ 
BEGIN
  -- total_xp
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'total_xp') THEN
    ALTER TABLE public.users ADD COLUMN total_xp INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  -- level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'level') THEN
    ALTER TABLE public.users ADD COLUMN level INTEGER DEFAULT 1 NOT NULL;
  END IF;
  
  -- avatar_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
  END IF;
  
  -- last_login_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_login_at') THEN
    ALTER TABLE public.users ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ============================================
-- 2. ТАБЛИЦА user_stats - СТАТИСТИКА ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0 NOT NULL,
  total_study_time_minutes INTEGER DEFAULT 0 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  courses_completed INTEGER DEFAULT 0 NOT NULL,
  modules_completed INTEGER DEFAULT 0 NOT NULL,
  achievements_unlocked INTEGER DEFAULT 0 NOT NULL,
  messages_sent_to_ai INTEGER DEFAULT 0 NOT NULL,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

-- ============================================
-- 3. ТАБЛИЦА achievements - ДОСТИЖЕНИЯ (ШАБЛОНЫ)
-- ============================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- 4. ТАБЛИЦА user_achievements - ДОСТИЖЕНИЯ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  progress_current INTEGER DEFAULT 0 NOT NULL,
  progress_required INTEGER NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 5. ТАБЛИЦА user_progress - ПРОГРЕСС ПО УРОКАМ
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started' NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent INTEGER DEFAULT 0 NOT NULL CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, course_id, module_id, lesson_id)
);

-- ============================================
-- 6. ФУНКЦИЯ: Инициализация user_stats для нового пользователя
-- ============================================

CREATE OR REPLACE FUNCTION public.init_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================
-- 7. ТРИГГЕР: Автосоздание user_stats при создании user
-- ============================================

DROP TRIGGER IF EXISTS on_user_created_init_stats ON public.users;

CREATE TRIGGER on_user_created_init_stats
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_stats();

-- ============================================
-- 8. RLS ПОЛИТИКИ - Row Level Security
-- ============================================

-- Включаем RLS на всех таблицах
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- users: пользователи видят только себя
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
  ON public.users FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
  ON public.users FOR UPDATE 
  USING (auth.uid() = id);

-- user_stats: пользователи видят только свою статистику
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
CREATE POLICY "Users can view own stats" 
  ON public.user_stats FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
CREATE POLICY "Users can update own stats" 
  ON public.user_stats FOR UPDATE 
  USING (auth.uid() = user_id);

-- achievements: все видят все достижения
DROP POLICY IF EXISTS "Anyone can view achievements" ON public.achievements;
CREATE POLICY "Anyone can view achievements" 
  ON public.achievements FOR SELECT 
  USING (true);

-- user_achievements: пользователи видят только свои достижения
DROP POLICY IF EXISTS "Users can view own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" 
  ON public.user_achievements FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own achievements" ON public.user_achievements;
CREATE POLICY "Users can insert own achievements" 
  ON public.user_achievements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- user_progress: пользователи видят только свой прогресс
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress" 
  ON public.user_progress FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_progress;
CREATE POLICY "Users can manage own progress" 
  ON public.user_progress FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- 9. ИНИЦИАЛИЗАЦИЯ user_stats ДЛЯ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================

INSERT INTO public.user_stats (user_id)
SELECT id FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_stats WHERE user_id = public.users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 10. ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================

-- Структура users
SELECT 
  '=== КОЛОНКИ users ===' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Все таблицы
SELECT 
  '=== ВСЕ ТАБЛИЦЫ ===' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Статистика
SELECT 
  '=== СТАТИСТИКА ===' as info,
  (SELECT COUNT(*) FROM public.users) as users_count,
  (SELECT COUNT(*) FROM public.user_stats) as user_stats_count,
  (SELECT COUNT(*) FROM public.achievements) as achievements_count,
  (SELECT COUNT(*) FROM public.user_progress) as user_progress_count,
  (SELECT COUNT(*) FROM public.user_achievements) as user_achievements_count;

-- Проверка user_stats для каждого пользователя
SELECT 
  '=== user_stats СИНХРОНИЗАЦИЯ ===' as info,
  u.email,
  u.full_name,
  CASE WHEN us.user_id IS NOT NULL THEN '✅ Есть' ELSE '❌ Нет' END as has_stats
FROM public.users u
LEFT JOIN public.user_stats us ON u.id = us.user_id
ORDER BY u.created_at DESC;

