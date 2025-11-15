-- ========================================
-- МИГРАЦИЯ: Добавление игрофикации
-- Дата: 15 ноября 2025
-- ========================================

-- ========================================
-- 1. ДОБАВЛЯЕМ КОЛОНКИ В PROFILES
-- ========================================

DO $$ 
BEGIN
    -- level (уровень студента)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'level'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN level INTEGER DEFAULT 1;
        RAISE NOTICE '✅ Добавлена колонка profiles.level';
    END IF;

    -- xp (опыт)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'xp'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN xp INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Добавлена колонка profiles.xp';
    END IF;

    -- current_streak (текущий стрик)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'current_streak'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Добавлена колонка profiles.current_streak';
    END IF;

    -- longest_streak (рекорд стрика)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'longest_streak'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN longest_streak INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Добавлена колонка profiles.longest_streak';
    END IF;

    -- last_activity_at (последняя активность)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN last_activity_at TIMESTAMP DEFAULT NOW();
        RAISE NOTICE '✅ Добавлена колонка profiles.last_activity_at';
    END IF;

    -- avatar_url (URL аватара)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE '✅ Добавлена колонка profiles.avatar_url';
    END IF;
    
    RAISE NOTICE '✅ Проверка колонок profiles завершена';
END $$;

-- ========================================
-- 2. ИНИЦИАЛИЗАЦИЯ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ
-- ========================================

UPDATE public.profiles 
SET 
    level = COALESCE(level, 1),
    xp = COALESCE(xp, 0),
    current_streak = COALESCE(current_streak, 0),
    longest_streak = COALESCE(longest_streak, 0),
    last_activity_at = COALESCE(last_activity_at, NOW())
WHERE level IS NULL OR xp IS NULL;

-- ========================================
-- 3. СОЗДАЁМ ТАБЛИЦУ user_achievements
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    xp_reward INTEGER DEFAULT 0,
    unlocked_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Студенты видят только свои достижения
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'Students can view own achievements'
    ) THEN
        CREATE POLICY "Students can view own achievements" 
        ON public.user_achievements FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Админы видят все достижения
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'Admins can view all achievements'
    ) THEN
        CREATE POLICY "Admins can view all achievements" 
        ON public.user_achievements FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        );
    END IF;

    -- Система может создавать достижения
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'Service can insert achievements'
    ) THEN
        CREATE POLICY "Service can insert achievements" 
        ON public.user_achievements FOR INSERT 
        WITH CHECK (true);
    END IF;
    
    RAISE NOTICE '✅ Таблица user_achievements создана с RLS политиками';
END $$;

-- ========================================
-- 4. СОЗДАЁМ ТАБЛИЦУ user_goals
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_type VARCHAR(50) NOT NULL,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, goal_type, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_week ON user_goals(week_start_date, week_end_date);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Студенты видят только свои цели
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Students can view own goals'
    ) THEN
        CREATE POLICY "Students can view own goals" 
        ON public.user_goals FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Студенты могут обновлять свои цели
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Students can update own goals'
    ) THEN
        CREATE POLICY "Students can update own goals" 
        ON public.user_goals FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    -- Админы видят все цели
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Admins can view all goals'
    ) THEN
        CREATE POLICY "Admins can view all goals" 
        ON public.user_goals FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        );
    END IF;

    -- Система может создавать цели
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_goals' 
        AND policyname = 'Service can insert goals'
    ) THEN
        CREATE POLICY "Service can insert goals" 
        ON public.user_goals FOR INSERT 
        WITH CHECK (true);
    END IF;
    
    RAISE NOTICE '✅ Таблица user_goals создана с RLS политиками';
END $$;

-- ========================================
-- 5. СОЗДАЁМ ТАБЛИЦУ user_missions
-- ========================================

CREATE TABLE IF NOT EXISTS public.user_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mission_type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    xp_reward INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_completed ON user_missions(user_id, is_completed);

ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Студенты видят только свои миссии
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_missions' 
        AND policyname = 'Students can view own missions'
    ) THEN
        CREATE POLICY "Students can view own missions" 
        ON public.user_missions FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    -- Админы видят все миссии
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_missions' 
        AND policyname = 'Admins can view all missions'
    ) THEN
        CREATE POLICY "Admins can view all missions" 
        ON public.user_missions FOR SELECT 
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        );
    END IF;

    -- Система может создавать миссии
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_missions' 
        AND policyname = 'Service can insert missions'
    ) THEN
        CREATE POLICY "Service can insert missions" 
        ON public.user_missions FOR INSERT 
        WITH CHECK (true);
    END IF;

    -- Система может обновлять миссии
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_missions' 
        AND policyname = 'Service can update missions'
    ) THEN
        CREATE POLICY "Service can update missions" 
        ON public.user_missions FOR UPDATE 
        USING (true);
    END IF;
    
    RAISE NOTICE '✅ Таблица user_missions создана с RLS политиками';
END $$;

-- ========================================
-- 6. ТРИГГЕР: Автообновление updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Триггер для user_goals
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_goals_updated_at'
    ) THEN
        CREATE TRIGGER update_user_goals_updated_at 
        BEFORE UPDATE ON public.user_goals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_user_goals_updated_at';
    END IF;

    -- Триггер для user_missions
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_missions_updated_at'
    ) THEN
        CREATE TRIGGER update_user_missions_updated_at 
        BEFORE UPDATE ON public.user_missions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Создан триггер update_user_missions_updated_at';
    END IF;
END $$;

-- ========================================
-- 7. СОЗДАЁМ ДЕФОЛТНЫЕ НЕДЕЛЬНЫЕ ЦЕЛИ ДЛЯ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
-- ========================================

INSERT INTO public.user_goals (
    user_id,
    goal_type,
    target_value,
    current_value,
    week_start_date,
    week_end_date
)
SELECT 
    id as user_id,
    'weekly_lessons' as goal_type,
    10 as target_value,
    0 as current_value,
    DATE_TRUNC('week', CURRENT_DATE)::DATE as week_start_date,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE as week_end_date
FROM public.profiles
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_goals 
    WHERE user_id = profiles.id 
    AND goal_type = 'weekly_lessons'
    AND week_start_date = DATE_TRUNC('week', CURRENT_DATE)::DATE
)
ON CONFLICT DO NOTHING;

-- ========================================
-- 8. ПРОВЕРКА: Показываем результат
-- ========================================

SELECT 
    '✅ МИГРАЦИЯ ЗАВЕРШЕНА' as status,
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.user_goals) as total_goals,
    (SELECT COUNT(*) FROM public.user_missions) as total_missions,
    (SELECT COUNT(*) FROM public.user_achievements) as total_achievements;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

COMMENT ON TABLE public.user_achievements IS 'Достижения пользователей (badges)';
COMMENT ON TABLE public.user_goals IS 'Цели пользователей (недельные, дневные)';
COMMENT ON TABLE public.user_missions IS 'Мини-миссии для игрофикации';
