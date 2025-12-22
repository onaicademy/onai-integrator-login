-- =====================================================
-- ONBOARDING SYSTEM (Система приветствия новых пользователей)
-- =====================================================

-- 1. Добавляем колонку onboarding_completed в таблицу users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Комментарий для колонки
COMMENT ON COLUMN public.users.onboarding_completed IS 'Флаг завершения онбординга (welcome страница)';

-- 2. Создаём таблицу для хранения ответов с welcome страницы
CREATE TABLE IF NOT EXISTS public.user_onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Ответы пользователя (JSON для гибкости)
  responses JSONB NOT NULL,
  
  -- Метаданные
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Уникальность: один онбординг на пользователя
  UNIQUE(user_id)
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON public.user_onboarding_responses(user_id);

-- Комментарии для таблицы
COMMENT ON TABLE public.user_onboarding_responses IS 'Ответы пользователей на welcome-анкету (онбординг)';
COMMENT ON COLUMN public.user_onboarding_responses.responses IS 'JSON с ответами: {goals, experience, interests, etc.}';

-- 3. RLS политики для onboarding_responses
ALTER TABLE public.user_onboarding_responses ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои ответы
CREATE POLICY "Users can view their own onboarding responses"
ON public.user_onboarding_responses FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Политика: пользователь создаёт только свои ответы
CREATE POLICY "Users can insert their own onboarding responses"
ON public.user_onboarding_responses FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Политика: пользователь обновляет только свои ответы
CREATE POLICY "Users can update their own onboarding responses"
ON public.user_onboarding_responses FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Политика: админы видят все ответы (для аналитики)
CREATE POLICY "Admins can view all onboarding responses"
ON public.user_onboarding_responses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- ГОТОВО!
-- =====================================================

-- Проверка:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'onboarding_completed';

SELECT * FROM public.user_onboarding_responses LIMIT 1;

