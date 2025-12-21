-- ========================================
-- ПОЛНАЯ СХЕМА для НОВОЙ Tripwire базы
-- Применить вручную в Supabase Dashboard
-- Проект: pjmvxecykysfrzppdcto
-- ========================================

-- 1. Таблица пользователей Tripwire
CREATE TABLE IF NOT EXISTS public.tripwire_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  granted_by UUID, -- NULLABLE! Менеджер из другой базы
  manager_name TEXT,
  generated_password TEXT NOT NULL,
  password_changed BOOLEAN DEFAULT FALSE,
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  welcome_email_sent_at TIMESTAMPTZ,
  email_opened BOOLEAN DEFAULT FALSE,
  first_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  modules_completed INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'blocked')),
  amocrm_deal_id TEXT,
  amocrm_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица логов активности продажников
CREATE TABLE IF NOT EXISTS public.sales_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID, -- NULLABLE! Менеджер из другой базы
  action_type TEXT NOT NULL,
  target_user_id UUID,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Профиль пользователя Tripwire
CREATE TABLE IF NOT EXISTS public.tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 3,
  completion_percentage NUMERIC DEFAULT 0,
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  added_by_manager_id UUID, -- NULLABLE! Менеджер из другой базы
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tripwire_users_email ON public.tripwire_users(email);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_user_id ON public.tripwire_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_granted_by ON public.tripwire_users(granted_by);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_status ON public.tripwire_users(status);
CREATE INDEX IF NOT EXISTS idx_tripwire_users_created_at ON public.tripwire_users(created_at);

CREATE INDEX IF NOT EXISTS idx_sales_activity_manager ON public.sales_activity_log(manager_id);
CREATE INDEX IF NOT EXISTS idx_sales_activity_created ON public.sales_activity_log(created_at);

CREATE INDEX IF NOT EXISTS idx_tripwire_profile_user ON public.tripwire_user_profile(user_id);

-- 5. Комментарии для документации
COMMENT ON TABLE public.tripwire_users IS 'Пользователи Tripwire (изолированная база)';
COMMENT ON COLUMN public.tripwire_users.granted_by IS 'UUID менеджера из основной базы (не FK, просто ссылка)';
COMMENT ON COLUMN public.tripwire_users.manager_name IS 'Имя менеджера для отображения';

COMMENT ON TABLE public.sales_activity_log IS 'Лог активности менеджеров по продажам';
COMMENT ON COLUMN public.sales_activity_log.manager_id IS 'UUID менеджера из основной базы (не FK)';

COMMENT ON TABLE public.tripwire_user_profile IS 'Расширенный профиль Tripwire пользователя';

-- 6. Включаем RLS (Row Level Security)
ALTER TABLE public.tripwire_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tripwire_user_profile ENABLE ROW LEVEL SECURITY;

-- 7. Политики доступа для API ролей
CREATE POLICY "api_access_tripwire_users" ON public.tripwire_users FOR ALL USING (true);
CREATE POLICY "api_access_sales_log" ON public.sales_activity_log FOR ALL USING (true);
CREATE POLICY "api_access_user_profile" ON public.tripwire_user_profile FOR ALL USING (true);

-- 8. Выдаем права доступа для всех API ролей
GRANT ALL PRIVILEGES ON public.tripwire_users TO anon, authenticated, service_role, postgres;
GRANT ALL PRIVILEGES ON public.sales_activity_log TO anon, authenticated, service_role, postgres;
GRANT ALL PRIVILEGES ON public.tripwire_user_profile TO anon, authenticated, service_role, postgres;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 9. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Triggers для updated_at
CREATE TRIGGER trigger_tripwire_users_updated
  BEFORE UPDATE ON public.tripwire_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_tripwire_profile_updated
  BEFORE UPDATE ON public.tripwire_user_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 11. Функция для автоматического создания профиля
CREATE OR REPLACE FUNCTION public.handle_new_tripwire_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Автоматически создаем запись в tripwire_user_profile
  INSERT INTO public.tripwire_user_profile (user_id, added_by_manager_id)
  VALUES (NEW.user_id, NEW.granted_by)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_tripwire_profile
  AFTER INSERT ON public.tripwire_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_tripwire_user();

-- 12. Финальный пинок Schema Cache
NOTIFY pgrst, 'reload schema';

-- ========================================
-- ГОТОВО! Schema создана!
-- ========================================

SELECT 
  'Tripwire schema created successfully!' as status,
  COUNT(*) as tripwire_users_count
FROM public.tripwire_users;



































