-- ========================================
-- ИСПРАВЛЕНИЕ: Добавление недостающих колонок в существующие таблицы
-- Миграция: 20251115_fix_course_structure.sql
-- Дата: 2025-11-15
-- ========================================

-- ====================================
-- 1. ИСПРАВЛЕНИЕ ТАБЛИЦЫ: courses
-- ====================================

-- Проверяем и добавляем недостающие колонки
DO $$ 
BEGIN
    -- order_index
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN order_index INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Добавлена колонка courses.order_index';
    END IF;

    -- slug
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'slug'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN slug VARCHAR(255);
        -- Генерируем slug из title для существующих записей
        UPDATE public.courses SET slug = LOWER(REPLACE(title, ' ', '-')) WHERE slug IS NULL;
        ALTER TABLE public.courses ALTER COLUMN slug SET NOT NULL;
        ALTER TABLE public.courses ADD CONSTRAINT courses_slug_unique UNIQUE (slug);
        RAISE NOTICE '✅ Добавлена колонка courses.slug';
    END IF;

    -- thumbnail_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE '✅ Добавлена колонка courses.thumbnail_url';
    END IF;

    -- instructor_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'instructor_id'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Добавлена колонка courses.instructor_id';
    END IF;

    -- duration_hours
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'duration_hours'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN duration_hours INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Добавлена колонка courses.duration_hours';
    END IF;

    -- level
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'level'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN level VARCHAR(50) CHECK (level IN ('beginner', 'intermediate', 'advanced'));
        RAISE NOTICE '✅ Добавлена колонка courses.level';
    END IF;

    -- is_published
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'is_published'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN is_published BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Добавлена колонка courses.is_published';
    END IF;

    -- price
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'courses' 
        AND column_name = 'price'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN price DECIMAL(10, 2) DEFAULT 0.00;
        RAISE NOTICE '✅ Добавлена колонка courses.price';
    END IF;
END $$;

-- ====================================
-- 2. СОЗДАНИЕ ТАБЛИЦЫ: modules (если не существует)
-- ====================================
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN DEFAULT false,
    unlock_after_module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_module_order UNIQUE (course_id, order_index)
);

COMMENT ON TABLE public.modules IS 'Модули внутри курса (Курс → Модули)';

-- ====================================
-- 3. СОЗДАНИЕ/ОБНОВЛЕНИЕ ТАБЛИЦЫ: lessons
-- ====================================

-- Создаем таблицу если не существует
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    lesson_type VARCHAR(50) DEFAULT 'video' CHECK (lesson_type IN ('video', 'text', 'quiz', 'assignment')),
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_lesson_order UNIQUE (module_id, order_index)
);

COMMENT ON TABLE public.lessons IS 'Уроки внутри модулей (Модуль → Уроки)';

-- Если таблица уже существует, добавляем недостающие колонки
DO $$ 
BEGIN
    -- lesson_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'lesson_type'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN lesson_type VARCHAR(50) DEFAULT 'video' CHECK (lesson_type IN ('video', 'text', 'quiz', 'assignment'));
        RAISE NOTICE '✅ Добавлена колонка lessons.lesson_type';
    END IF;

    -- duration_minutes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'duration_minutes'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN duration_minutes INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Добавлена колонка lessons.duration_minutes';
    END IF;

    -- is_preview
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'is_preview'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN is_preview BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Добавлена колонка lessons.is_preview';
    END IF;
END $$;

-- ====================================
-- 4. СОЗДАНИЕ ТАБЛИЦЫ: video_content
-- ====================================
CREATE TABLE IF NOT EXISTS public.video_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    
    -- Cloudflare R2 метаданные
    r2_object_key VARCHAR(500) NOT NULL UNIQUE,
    r2_bucket_name VARCHAR(255) NOT NULL DEFAULT 'onai-academy-videos',
    public_url TEXT,
    
    -- Метаданные видео
    filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    resolution VARCHAR(20),
    format VARCHAR(20),
    
    -- Статус обработки
    upload_status VARCHAR(50) DEFAULT 'pending' CHECK (upload_status IN ('pending', 'uploading', 'completed', 'failed')),
    transcoding_status VARCHAR(50) DEFAULT 'pending' CHECK (transcoding_status IN ('pending', 'processing', 'completed', 'failed')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.video_content IS 'Метаданные видео из Cloudflare R2';

-- ====================================
-- 5. СОЗДАНИЕ ТАБЛИЦЫ: lesson_materials
-- ====================================
CREATE TABLE IF NOT EXISTS public.lesson_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    
    storage_path VARCHAR(500) NOT NULL,
    bucket_name VARCHAR(255) NOT NULL DEFAULT 'lesson-materials',
    
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    display_name VARCHAR(255),
    
    is_downloadable BOOLEAN DEFAULT true,
    requires_completion BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.lesson_materials IS 'Раздаточные материалы к урокам';

-- ====================================
-- 6. СОЗДАНИЕ ТАБЛИЦЫ: student_progress
-- ====================================
CREATE TABLE IF NOT EXISTS public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    
    video_progress_percent INTEGER DEFAULT 0 CHECK (video_progress_percent >= 0 AND video_progress_percent <= 100),
    last_position_seconds INTEGER DEFAULT 0,
    watch_time_seconds INTEGER DEFAULT 0,
    
    is_started BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    times_watched INTEGER DEFAULT 0,
    average_speed DECIMAL(3, 2) DEFAULT 1.0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_student_lesson UNIQUE (user_id, lesson_id)
);

COMMENT ON TABLE public.student_progress IS 'Прогресс студентов по урокам';

-- ====================================
-- 7. СОЗДАНИЕ ТАБЛИЦЫ: video_analytics
-- ====================================
CREATE TABLE IF NOT EXISTS public.video_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.video_content(id) ON DELETE CASCADE,
    
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'complete', 'skip', 'replay')),
    position_seconds INTEGER,
    session_id UUID,
    
    playback_speed DECIMAL(3, 2) DEFAULT 1.0,
    quality_setting VARCHAR(20),
    device_type VARCHAR(50),
    
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.video_analytics IS 'Детальная аналитика просмотра видео';

-- ====================================
-- 8. СОЗДАНИЕ ТАБЛИЦЫ: module_progress
-- ====================================
CREATE TABLE IF NOT EXISTS public.module_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    
    total_lessons INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    
    is_started BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_student_module UNIQUE (user_id, module_id)
);

COMMENT ON TABLE public.module_progress IS 'Прогресс студентов по модулям';

-- ========================================
-- ИНДЕКСЫ
-- ========================================

-- Courses
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);

-- Modules
CREATE INDEX IF NOT EXISTS idx_modules_course ON public.modules(course_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules(course_id, order_index);

-- Lessons
CREATE INDEX IF NOT EXISTS idx_lessons_module ON public.lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_type ON public.lessons(lesson_type);

-- Video content
CREATE INDEX IF NOT EXISTS idx_video_lesson ON public.video_content(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_r2_key ON public.video_content(r2_object_key);
CREATE INDEX IF NOT EXISTS idx_video_status ON public.video_content(upload_status, transcoding_status);

-- Lesson materials
CREATE INDEX IF NOT EXISTS idx_materials_lesson ON public.lesson_materials(lesson_id);

-- Student progress
CREATE INDEX IF NOT EXISTS idx_progress_user ON public.student_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON public.student_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_completed ON public.student_progress(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_progress_user_lesson ON public.student_progress(user_id, lesson_id);

-- Video analytics
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.video_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_lesson ON public.video_analytics(lesson_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.video_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON public.video_analytics(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.video_analytics(event_type);

-- Module progress
CREATE INDEX IF NOT EXISTS idx_module_progress_user ON public.module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON public.module_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_completed ON public.module_progress(user_id, is_completed);

-- ========================================
-- ТРИГГЕРЫ
-- ========================================

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применяем триггер к courses (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_courses_updated_at'
    ) THEN
        CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_courses_updated_at';
    END IF;
END $$;

-- Применяем триггер к modules
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_modules_updated_at'
    ) THEN
        CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON public.modules
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_modules_updated_at';
    END IF;
END $$;

-- Применяем триггер к lessons
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_lessons_updated_at'
    ) THEN
        CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_lessons_updated_at';
    END IF;
END $$;

-- Применяем триггер к video_content
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_video_content_updated_at'
    ) THEN
        CREATE TRIGGER update_video_content_updated_at BEFORE UPDATE ON public.video_content
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_video_content_updated_at';
    END IF;
END $$;

-- Применяем триггер к lesson_materials
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_lesson_materials_updated_at'
    ) THEN
        CREATE TRIGGER update_lesson_materials_updated_at BEFORE UPDATE ON public.lesson_materials
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_lesson_materials_updated_at';
    END IF;
END $$;

-- Применяем триггер к student_progress
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_student_progress_updated_at'
    ) THEN
        CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_student_progress_updated_at';
    END IF;
END $$;

-- Применяем триггер к module_progress
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_module_progress_updated_at'
    ) THEN
        CREATE TRIGGER update_module_progress_updated_at BEFORE UPDATE ON public.module_progress
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_module_progress_updated_at';
    END IF;
END $$;

-- ========================================
-- ФУНКЦИЯ: Автоматический расчет прогресса модуля
-- ========================================
CREATE OR REPLACE FUNCTION calculate_module_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_total_lessons INTEGER;
    v_completed_lessons INTEGER;
    v_progress_percent INTEGER;
    v_module_id UUID;
BEGIN
    -- Получаем module_id из lesson
    SELECT module_id INTO v_module_id
    FROM public.lessons
    WHERE id = NEW.lesson_id;
    
    -- Подсчитываем общее количество уроков в модуле
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons
    WHERE module_id = v_module_id;
    
    -- Подсчитываем завершенные уроки
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.student_progress sp
    JOIN public.lessons l ON sp.lesson_id = l.id
    WHERE sp.user_id = NEW.user_id
      AND l.module_id = v_module_id
      AND sp.is_completed = true;
    
    -- Рассчитываем процент
    IF v_total_lessons > 0 THEN
        v_progress_percent := (v_completed_lessons * 100) / v_total_lessons;
    ELSE
        v_progress_percent := 0;
    END IF;
    
    -- Обновляем или создаем запись в module_progress
    INSERT INTO public.module_progress (
        user_id,
        module_id,
        total_lessons,
        completed_lessons,
        progress_percent,
        is_started,
        is_completed,
        started_at,
        completed_at
    ) VALUES (
        NEW.user_id,
        v_module_id,
        v_total_lessons,
        v_completed_lessons,
        v_progress_percent,
        true,
        v_progress_percent = 100,
        COALESCE((SELECT started_at FROM public.module_progress WHERE user_id = NEW.user_id AND module_id = v_module_id), NOW()),
        CASE WHEN v_progress_percent = 100 THEN NOW() ELSE NULL END
    )
    ON CONFLICT (user_id, module_id) DO UPDATE SET
        total_lessons = v_total_lessons,
        completed_lessons = v_completed_lessons,
        progress_percent = v_progress_percent,
        is_completed = v_progress_percent = 100,
        completed_at = CASE WHEN v_progress_percent = 100 THEN NOW() ELSE public.module_progress.completed_at END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления прогресса модуля
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'auto_update_module_progress'
    ) THEN
        CREATE TRIGGER auto_update_module_progress
            AFTER INSERT OR UPDATE OF is_completed ON public.student_progress
            FOR EACH ROW
            EXECUTE FUNCTION calculate_module_progress();
        RAISE NOTICE '✅ Создан триггер auto_update_module_progress';
    END IF;
END $$;

-- ========================================
-- RLS ПОЛИТИКИ
-- ========================================

-- Включаем RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если существуют
DROP POLICY IF EXISTS "Courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Only admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins can delete courses" ON public.courses;

DROP POLICY IF EXISTS "Modules are viewable by everyone" ON public.modules;
DROP POLICY IF EXISTS "Only admins can manage modules" ON public.modules;

DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON public.lessons;
DROP POLICY IF EXISTS "Only admins can manage lessons" ON public.lessons;

DROP POLICY IF EXISTS "Video content is viewable by everyone" ON public.video_content;
DROP POLICY IF EXISTS "Only admins can manage video content" ON public.video_content;

DROP POLICY IF EXISTS "Lesson materials are viewable by everyone" ON public.lesson_materials;
DROP POLICY IF EXISTS "Only admins can manage materials" ON public.lesson_materials;

DROP POLICY IF EXISTS "Students can view own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Admins can view all progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students can update own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students can update own progress records" ON public.student_progress;

DROP POLICY IF EXISTS "Students can view own analytics" ON public.video_analytics;
DROP POLICY IF EXISTS "Admins and AI bots can view all analytics" ON public.video_analytics;
DROP POLICY IF EXISTS "Students can insert own analytics" ON public.video_analytics;

DROP POLICY IF EXISTS "Students can view own module progress" ON public.module_progress;
DROP POLICY IF EXISTS "Admins can view all module progress" ON public.module_progress;
DROP POLICY IF EXISTS "Module progress can be auto-created" ON public.module_progress;
DROP POLICY IF EXISTS "Module progress can be auto-updated" ON public.module_progress;

-- Создаем новые политики
-- Courses
CREATE POLICY "Courses are viewable by everyone" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Only admins can insert courses" ON public.courses FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can update courses" ON public.courses FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Only admins can delete courses" ON public.courses FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Modules
CREATE POLICY "Modules are viewable by everyone" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Only admins can manage modules" ON public.modules FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lessons
CREATE POLICY "Lessons are viewable by everyone" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Only admins can manage lessons" ON public.lessons FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Video Content
CREATE POLICY "Video content is viewable by everyone" ON public.video_content FOR SELECT USING (true);
CREATE POLICY "Only admins can manage video content" ON public.video_content FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lesson Materials
CREATE POLICY "Lesson materials are viewable by everyone" ON public.lesson_materials FOR SELECT USING (true);
CREATE POLICY "Only admins can manage materials" ON public.lesson_materials FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Student Progress
CREATE POLICY "Students can view own progress" ON public.student_progress FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY "Admins can view all progress" ON public.student_progress FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Students can update own progress" ON public.student_progress FOR INSERT
    WITH CHECK (user_id = auth.uid());
CREATE POLICY "Students can update own progress records" ON public.student_progress FOR UPDATE
    USING (user_id = auth.uid());

-- Video Analytics
CREATE POLICY "Students can view own analytics" ON public.video_analytics FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY "Admins and AI bots can view all analytics" ON public.video_analytics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ai_bot')));
CREATE POLICY "Students can insert own analytics" ON public.video_analytics FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Module Progress
CREATE POLICY "Students can view own module progress" ON public.module_progress FOR SELECT
    USING (user_id = auth.uid());
CREATE POLICY "Admins can view all module progress" ON public.module_progress FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Module progress can be auto-created" ON public.module_progress FOR INSERT
    WITH CHECK (true);
CREATE POLICY "Module progress can be auto-updated" ON public.module_progress FOR UPDATE
    USING (true);

-- ========================================
-- ФУНКЦИИ ДЛЯ API
-- ========================================

-- Функция получения полной структуры курса
CREATE OR REPLACE FUNCTION get_course_structure(p_course_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'course', row_to_json(c),
        'modules', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'module', row_to_json(m),
                    'lessons', (
                        SELECT jsonb_agg(row_to_json(l) ORDER BY l.order_index)
                        FROM public.lessons l
                        WHERE l.module_id = m.id
                    )
                ) ORDER BY m.order_index
            )
            FROM public.modules m
            WHERE m.course_id = c.id
        )
    ) INTO result
    FROM public.courses c
    WHERE c.id = p_course_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция получения прогресса студента по курсу
CREATE OR REPLACE FUNCTION get_student_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'course_id', p_course_id,
        'total_lessons', COUNT(l.id),
        'completed_lessons', COUNT(sp.id) FILTER (WHERE sp.is_completed = true),
        'in_progress_lessons', COUNT(sp.id) FILTER (WHERE sp.is_started = true AND sp.is_completed = false),
        'total_watch_time', COALESCE(SUM(sp.watch_time_seconds), 0),
        'progress_percent', CASE 
            WHEN COUNT(l.id) > 0 THEN 
                (COUNT(sp.id) FILTER (WHERE sp.is_completed = true) * 100) / COUNT(l.id)
            ELSE 0
        END
    ) INTO result
    FROM public.lessons l
    JOIN public.modules m ON l.module_id = m.id
    LEFT JOIN public.student_progress sp ON sp.lesson_id = l.id AND sp.user_id = p_user_id
    WHERE m.course_id = p_course_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

