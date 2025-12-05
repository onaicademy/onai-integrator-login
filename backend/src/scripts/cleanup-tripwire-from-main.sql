-- ================================================================
-- ОПЕРАЦИЯ "ЧИСТОТА": УДАЛЕНИЕ TRIPWIRE ИЗ MAIN DB
-- Очистка Main Platform от Tripwire таблиц и пользователей
-- 
-- ⚠️ ОСТОРОЖНО: Работаем с PRODUCTION DATABASE
-- ================================================================

-- ================================================================
-- ЧАСТЬ 1: УДАЛЕНИЕ TRIPWIRE ТАБЛИЦ
-- ================================================================

-- Удаляем таблицы в правильном порядке (сначала зависимые, потом основные)

DROP TABLE IF EXISTS public.tripwire_chat_messages CASCADE;
DROP TABLE IF EXISTS public.tripwire_certificates CASCADE;
DROP TABLE IF EXISTS public.tripwire_achievements CASCADE;
DROP TABLE IF EXISTS public.tripwire_progress CASCADE;
DROP TABLE IF EXISTS public.tripwire_user_profile CASCADE;
DROP TABLE IF EXISTS public.tripwire_users CASCADE;

-- Проверяем, есть ли еще таблицы с префиксом tripwire_
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename LIKE 'tripwire_%'
  LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    RAISE NOTICE 'Удалена таблица: %', r.tablename;
  END LOOP;
END $$;

-- ================================================================
-- ЧАСТЬ 2: ОЧИСТКА public.users
-- ================================================================

-- Удаляем колонку platform (больше не нужна в Main DB)
ALTER TABLE public.users DROP COLUMN IF EXISTS platform CASCADE;

-- Проверяем, что onboarding_completed остается
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'onboarding_completed'
  ) THEN
    RAISE NOTICE 'Колонка onboarding_completed сохранена ✓';
  ELSE
    RAISE WARNING 'Колонка onboarding_completed не найдена!';
  END IF;
END $$;

-- ================================================================
-- ЧАСТЬ 3: УДАЛЕНИЕ TRIPWIRE ПОЛЬЗОВАТЕЛЕЙ
-- ================================================================

-- Список пользователей для удаления (только Tripwire Sales и тестовые)
DO $$
DECLARE
  tripwire_emails TEXT[] := ARRAY[
    'amina@onaiacademy.kz',
    'rakhat@onaiacademy.kz',
    'zankachidix.ai@gmail.com'
  ];
  email_item TEXT;
  user_record RECORD;
BEGIN
  -- Проходим по каждому email
  FOREACH email_item IN ARRAY tripwire_emails
  LOOP
    -- Получаем user_id из auth.users
    SELECT id, email INTO user_record
    FROM auth.users
    WHERE email = email_item;
    
    IF FOUND THEN
      -- Удаляем из public.users (каскадно удалит связанные данные)
      DELETE FROM public.users WHERE id = user_record.id;
      
      -- Удаляем из auth.users (используем admin функцию через RPC или прямое удаление)
      -- Примечание: Прямое удаление из auth.users может быть ограничено RLS
      -- В production лучше использовать Supabase Admin API
      DELETE FROM auth.users WHERE id = user_record.id;
      
      RAISE NOTICE 'Удален пользователь: % (ID: %)', email_item, user_record.id;
    ELSE
      RAISE NOTICE 'Пользователь не найден (уже удален?): %', email_item;
    END IF;
  END LOOP;
END $$;

-- ================================================================
-- ЧАСТЬ 4: ПРОВЕРКА АДМИНА (БЕЗОПАСНОСТЬ)
-- ================================================================

-- Убедимся, что админ НЕ удален
DO $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'smmmcwin@gmail.com'
  ) INTO admin_exists;
  
  IF admin_exists THEN
    RAISE NOTICE '✅ БЕЗОПАСНОСТЬ: Админ (smmmcwin@gmail.com) НЕ тронут';
  ELSE
    RAISE EXCEPTION '❌ КРИТИЧЕСКАЯ ОШИБКА: Админ был удален! ОТКАТ ТРЕБУЕТСЯ!';
  END IF;
END $$;

-- ================================================================
-- ФИНАЛЬНАЯ ПРОВЕРКА
-- ================================================================

-- Проверяем, что таблицы tripwire_* удалены
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Все таблицы Tripwire удалены'
    ELSE '⚠️  Остались таблицы: ' || string_agg(tablename, ', ')
  END AS status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE 'tripwire_%';

-- Проверяем, что колонка platform удалена
SELECT 
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'platform'
    ) THEN '✅ Колонка platform удалена'
    ELSE '⚠️  Колонка platform еще существует'
  END AS platform_status;

-- Считаем оставшихся пользователей
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE role = 'admin') as admins,
  COUNT(*) FILTER (WHERE role = 'student') as students,
  COUNT(*) FILTER (WHERE role = 'sales') as sales_managers
FROM public.users;

-- ================================================================
-- ГОТОВО!
-- ================================================================

SELECT '🎉 ОПЕРАЦИЯ "ЧИСТОТА" ЗАВЕРШЕНА!' AS status;

