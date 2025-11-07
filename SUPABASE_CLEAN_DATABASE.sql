-- ============================================
-- ОЧИСТКА БАЗЫ ДАННЫХ SUPABASE
-- Удаляет все mock данные, оставляет только админа
-- ============================================

-- 1. УДАЛИТЬ ВСЕ MOCK ДАННЫЕ ИЗ ТАБЛИЦ
-- ============================================

-- AI-куратор: диалоги и сообщения
DELETE FROM ai_curator_attachments WHERE TRUE;
DELETE FROM ai_curator_messages WHERE TRUE;
DELETE FROM ai_curator_metrics WHERE TRUE;
DELETE FROM ai_curator_threads WHERE TRUE;

-- AI-конфликты бота
DELETE FROM ai_bot_conflicts WHERE TRUE;
DELETE FROM ai_bot_conflicts_stats WHERE TRUE;

-- AI-ментор
DELETE FROM ai_mentor_mood_tracking WHERE TRUE;
DELETE FROM ai_mentor_recommendations WHERE TRUE;
DELETE FROM ai_mentor_notifications WHERE TRUE;
DELETE FROM ai_mentor_analysis WHERE TRUE;

-- AI-аналитик
DELETE FROM ai_analytics_trends WHERE TRUE;
DELETE FROM ai_analytics_insights WHERE TRUE;
DELETE FROM ai_analytics_reports WHERE TRUE;

-- Токены OpenAI
DELETE FROM ai_token_usage_daily WHERE TRUE;
DELETE FROM ai_token_usage WHERE TRUE;

-- Достижения
DELETE FROM user_achievements WHERE TRUE;
-- Оставляем сами достижения (achievements), только прогресс удаляем

-- Сообщения студентов
DELETE FROM message_attachments WHERE TRUE;
DELETE FROM messages WHERE TRUE;
DELETE FROM conversations WHERE TRUE;

-- ============================================
-- 2. УДАЛИТЬ ВСЕХ СТУДЕНТОВ (КРОМЕ АДМИНА)
-- ============================================

-- Удаляем всех пользователей, кроме админа saint@onaiacademy.kz
DELETE FROM auth.users 
WHERE email != 'saint@onaiacademy.kz';

-- ============================================
-- 3. ПРОВЕРИТЬ ЧТО АДМИН СУЩЕСТВУЕТ
-- ============================================

-- Если админа нет, создаём его
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Проверяем существует ли админ
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'saint@onaiacademy.kz';
  
  IF admin_id IS NULL THEN
    -- Создаём админа
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      role
    ) VALUES (
      gen_random_uuid(),
      'saint@onaiacademy.kz',
      crypt('AdminPassword123!', gen_salt('bf')), -- ИЗМЕНИ ПАРОЛЬ ПОТОМ!
      NOW(),
      jsonb_build_object(
        'role', 'admin',
        'is_ceo', true,
        'name', 'CEO Admin',
        'full_name', 'CEO Admin'
      ),
      NOW(),
      NOW(),
      'authenticated'
    );
    
    RAISE NOTICE 'Админ создан: saint@onaiacademy.kz';
  ELSE
    RAISE NOTICE 'Админ уже существует: saint@onaiacademy.kz';
  END IF;
END $$;

-- ============================================
-- 4. СБРОСИТЬ СЧЁТЧИКИ И СТАТИСТИКУ
-- ============================================

-- Сбросить последовательности (auto-increment)
-- Это опционально, можно оставить счётчики как есть

-- ============================================
-- 5. ПРОВЕРИТЬ РЕЗУЛЬТАТ
-- ============================================

-- Посмотреть сколько осталось пользователей
SELECT 
  'Users' as table_name,
  COUNT(*) as count,
  json_agg(email) as emails
FROM auth.users;

-- Посмотреть что в таблицах пусто
SELECT 'ai_curator_threads' as table_name, COUNT(*) as count FROM ai_curator_threads
UNION ALL
SELECT 'ai_curator_messages', COUNT(*) FROM ai_curator_messages
UNION ALL
SELECT 'ai_bot_conflicts', COUNT(*) FROM ai_bot_conflicts
UNION ALL
SELECT 'ai_token_usage', COUNT(*) FROM ai_token_usage
UNION ALL
SELECT 'user_achievements', COUNT(*) FROM user_achievements
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;

-- ============================================
-- ГОТОВО!
-- ============================================
-- База данных очищена
-- Остался только админ: saint@onaiacademy.kz
-- Все mock данные удалены
-- Теперь можно деплоить на production!
-- ============================================

-- ⚠️ ВАЖНО:
-- После применения этого скрипта:
-- 1. Смени пароль админа в Supabase Dashboard
-- 2. Проверь что админ может войти на платформу
-- 3. Проверь что RLS политики работают
-- 4. Начни использовать платформу с чистой базой!

