-- ═══════════════════════════════════════════════════════════════
-- 🚀 ONAI ACADEMY - DATABASE SCHEMA UPDATE
-- ═══════════════════════════════════════════════════════════════
-- Adds missing columns to existing tables
-- ═══════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. USERS - добавляем недостающие колонки
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'users' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. COURSES - добавляем недостающие колонки
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'courses' 
                 AND column_name = 'cover_image') THEN
    ALTER TABLE public.courses ADD COLUMN cover_image TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'courses' 
                 AND column_name = 'total_xp') THEN
    ALTER TABLE public.courses ADD COLUMN total_xp INTEGER DEFAULT 0;
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. MODULES - добавляем недостающие колонки
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'modules' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.modules ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. LESSONS - добавляем недостающие колонки
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'lessons' 
                 AND column_name = 'xp_reward') THEN
    ALTER TABLE public.lessons ADD COLUMN xp_reward INTEGER DEFAULT 10;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'lessons' 
                 AND column_name = 'updated_at') THEN
    ALTER TABLE public.lessons ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. STUDENT_PROGRESS - добавляем недостающие колонки
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'student_progress' 
                 AND column_name = 'xp_earned') THEN
    ALTER TABLE public.student_progress ADD COLUMN xp_earned INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'student_progress' 
                 AND column_name = 'completion_percentage') THEN
    ALTER TABLE public.student_progress ADD COLUMN completion_percentage INTEGER DEFAULT 0;
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. ACHIEVEMENTS - таблица уже правильная
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'achievements' 
                 AND column_name = 'created_at') THEN
    ALTER TABLE public.achievements ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. USER_ACHIEVEMENTS - добавляем недостающие колонки
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_achievements' 
                 AND column_name = 'unlocked_at') THEN
    ALTER TABLE public.user_achievements ADD COLUMN unlocked_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- INDEXES - создаем если нет
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_modules_course_id ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_materials_lesson_id ON public.lesson_materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON public.student_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON public.student_progress(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON public.user_activity(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS - создаем если нет
-- ═══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_modules_updated_at ON public.modules;
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lessons_updated_at ON public.lessons;
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_student_progress_updated_at ON public.student_progress;
CREATE TRIGGER update_student_progress_updated_at
  BEFORE UPDATE ON public.student_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lesson_materials_updated_at ON public.lesson_materials;
CREATE TRIGGER update_lesson_materials_updated_at
  BEFORE UPDATE ON public.lesson_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_achievements_updated_at ON public.user_achievements;
CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA - вставляем базовые достижения если их нет
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.achievements (title, description, icon, rarity, xp_requirement) 
SELECT 'Первый шаг', 'Завершите свой первый урок', '🎯', 'common', 0
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Первый шаг');

INSERT INTO public.achievements (title, description, icon, rarity, xp_requirement) 
SELECT 'Ученик', 'Завершите 5 уроков', '📚', 'common', 50
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Ученик');

INSERT INTO public.achievements (title, description, icon, rarity, xp_requirement) 
SELECT 'Знаток', 'Завершите 20 уроков', '🎓', 'rare', 200
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Знаток');

INSERT INTO public.achievements (title, description, icon, rarity, xp_requirement) 
SELECT 'Мастер', 'Завершите 50 уроков', '👑', 'epic', 500
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Мастер');

INSERT INTO public.achievements (title, description, icon, rarity, xp_requirement) 
SELECT 'Легенда', 'Завершите все уроки', '⭐', 'legendary', 1000
WHERE NOT EXISTS (SELECT 1 FROM public.achievements WHERE title = 'Легенда');

-- ═══════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

