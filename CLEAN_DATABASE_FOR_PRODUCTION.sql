-- =====================================================
-- ОЧИСТКА БАЗЫ ДАННЫХ ДЛЯ PRODUCTION
-- Удаляет все моковые данные и сбрасывает студентов в 0
-- СОХРАНЯЕТ ТОЛЬКО АДМИНИСТРАТОРА!
-- =====================================================

-- 1. ОПРЕДЕЛЯЕМ АДМИНИСТРАТОРА
-- Замени на свой email если нужно
DO $$
DECLARE
  admin_email TEXT := 'saint@onaiacademy.kz';
  admin_id UUID;
BEGIN
  -- Получаем ID администратора
  SELECT id INTO admin_id FROM profiles WHERE email = admin_email;
  
  IF admin_id IS NULL THEN
    RAISE NOTICE '⚠️ Администратор не найден! Проверь email.';
  ELSE
    RAISE NOTICE '✅ Администратор найден: %', admin_id;
  END IF;

  -- =====================================================
  -- 2. УДАЛЕНИЕ МОКОВЫХ ДАННЫХ СТУДЕНТОВ
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ Удаление моковых данных студентов...';
  
  -- Удаляем все профили студентов (кроме админа)
  DELETE FROM student_profiles 
  WHERE id != admin_id;
  
  RAISE NOTICE '✅ Удалены данные из student_profiles';
  
  -- Удаляем записи о курсах студентов (кроме админа)
  DELETE FROM student_courses 
  WHERE student_id != admin_id;
  
  RAISE NOTICE '✅ Удалены записи student_courses';
  
  -- Удаляем прогресс студентов (кроме админа)
  DELETE FROM user_progress 
  WHERE user_id != admin_id;
  
  RAISE NOTICE '✅ Удалён прогресс user_progress';
  
  -- Удаляем достижения студентов (кроме админа)
  DELETE FROM user_achievements 
  WHERE user_id != admin_id;
  
  DELETE FROM achievement_history 
  WHERE user_id != admin_id;
  
  RAISE NOTICE '✅ Удалены достижения';
  
  -- Удаляем статистику студентов (кроме админа)
  DELETE FROM user_stats 
  WHERE user_id != admin_id;
  
  DELETE FROM user_activity 
  WHERE user_id != admin_id;
  
  RAISE NOTICE '✅ Удалена статистика';
  
  -- Удаляем AI-куратор данные студентов (кроме админа)
  DELETE FROM ai_curator_messages 
  WHERE user_id != admin_id;
  
  DELETE FROM ai_curator_threads 
  WHERE user_id != admin_id;
  
  RAISE NOTICE '✅ Удалены AI-куратор данные';
  
  -- Удаляем токены AI студентов (кроме админа)
  DELETE FROM ai_token_usage 
  WHERE user_id != admin_id;
  
  RAISE NOTICE '✅ Удалены AI токены';
  
  -- Удаляем контекст студентов (кроме админа)
  DELETE FROM user_context 
  WHERE user_id != admin_id;
  
  RAISE NOTICE '✅ Удалён user_context';
  
  -- Удаляем сообщения в чатах (кроме админа)
  DELETE FROM student_group_messages 
  WHERE sender_id != admin_id;
  
  DELETE FROM student_private_messages 
  WHERE sender_id != admin_id OR recipient_id != admin_id;
  
  RAISE NOTICE '✅ Удалены сообщения в чатах';
  
  -- Удаляем приглашения (кроме тех что от админа)
  DELETE FROM student_invitations 
  WHERE invited_by != admin_id;
  
  RAISE NOTICE '✅ Удалены приглашения';

  -- =====================================================
  -- 3. УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЕЙ (КРОМЕ АДМИНА)
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ Удаление неадминских пользователей...';
  
  -- Сначала удаляем из profiles (это не удалит из auth.users)
  DELETE FROM profiles 
  WHERE email != admin_email 
    AND role != 'admin';
  
  RAISE NOTICE '✅ Удалены неадминские профили';
  
  -- ⚠️ ВАЖНО: auth.users можно удалить только через Supabase API
  -- Это нужно сделать вручную в админке Supabase или через код
  
  -- =====================================================
  -- 4. СБРОС СЧЁТЧИКОВ И ЗНАЧЕНИЙ
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Сброс счётчиков и значений...';
  
  -- Обновляем админа (сбрасываем XP и level если нужно)
  -- Раскомментируй если хочешь сбросить админа тоже:
  -- UPDATE student_profiles 
  -- SET total_xp = 0, level = 1, streak_days = 0, longest_streak = 0
  -- WHERE id = admin_id;
  
  -- Сбрасываем dashboard_stats
  DELETE FROM dashboard_stats;
  
  RAISE NOTICE '✅ Сброшены dashboard_stats';
  
  -- =====================================================
  -- ФИНАЛ
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ОЧИСТКА ЗАВЕРШЕНА!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Что осталось:';
  RAISE NOTICE '  ✅ Администратор: %', admin_email;
  RAISE NOTICE '  ✅ Структура таблиц';
  RAISE NOTICE '  ✅ Курсы и уроки';
  RAISE NOTICE '  ✅ Достижения (шаблоны)';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ Что удалено:';
  RAISE NOTICE '  ❌ Все студенты';
  RAISE NOTICE '  ❌ Весь прогресс';
  RAISE NOTICE '  ❌ Все сообщения';
  RAISE NOTICE '  ❌ Вся статистика';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ ВНИМАНИЕ:';
  RAISE NOTICE '  Нужно вручную удалить пользователей из auth.users';
  RAISE NOTICE '  (кроме администратора) через Supabase Dashboard';
  RAISE NOTICE '';
  
END $$;

-- =====================================================
-- ПРОВЕРКА РЕЗУЛЬТАТОВ
-- =====================================================

-- Показать оставшихся пользователей
SELECT 
  'Пользователи' as table_name,
  COUNT(*) as count,
  string_agg(email, ', ') as emails
FROM profiles;

-- Показать количество записей в основных таблицах
SELECT 'student_profiles' as table_name, COUNT(*) as count FROM student_profiles
UNION ALL
SELECT 'student_courses', COUNT(*) FROM student_courses
UNION ALL
SELECT 'user_progress', COUNT(*) FROM user_progress
UNION ALL
SELECT 'user_achievements', COUNT(*) FROM user_achievements
UNION ALL
SELECT 'user_stats', COUNT(*) FROM user_stats
UNION ALL
SELECT 'ai_curator_threads', COUNT(*) FROM ai_curator_threads
UNION ALL
SELECT 'ai_curator_messages', COUNT(*) FROM ai_curator_messages;

