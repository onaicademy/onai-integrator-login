-- ============================================
-- 🧹 ОЧИСТКА ПРОДАКШН БАЗЫ ДАННЫХ
-- ============================================
-- ⚠️ ВНИМАНИЕ: Этот скрипт удаляет ВСЕ данные кроме структуры!
-- Используй ТОЛЬКО на ПРОДАКШН сервере перед деплоем
--
-- Запускать в: https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx/sql

-- ============================================
-- 1️⃣ УДАЛЕНИЕ ВСЕХ ДАННЫХ (сохраняем структуру)
-- ============================================

-- Очищаем данные пользователей (но НЕ удаляем таблицы)
TRUNCATE TABLE public.user_achievements CASCADE;
TRUNCATE TABLE public.user_progress CASCADE;
TRUNCATE TABLE public.user_stats CASCADE;
TRUNCATE TABLE public.users CASCADE;

-- Очищаем достижения (будем создавать заново)
TRUNCATE TABLE public.achievements CASCADE;

-- ============================================
-- 2️⃣ ПЕРЕСОЗДАЁМ ДОСТИЖЕНИЯ
-- ============================================

-- Добавляем только базовые достижения (те же что в основном скрипте)
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
-- 3️⃣ ПЕРЕСОЗДАЁМ АДМИНА (если он существует в auth.users)
-- ============================================

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Ищем админа в auth.users
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'saint@onaiacademy.kz';

  IF admin_user_id IS NOT NULL THEN
    -- Создаём профиль админа
    INSERT INTO public.users (id, email, full_name, role, is_ceo, total_xp, level)
    VALUES (
      admin_user_id,
      'saint@onaiacademy.kz',
      'Admin OnAI Academy',
      'admin',
      true,
      0,
      1
    );

    -- Создаём статистику админа
    INSERT INTO public.user_stats (user_id)
    VALUES (admin_user_id);

    RAISE NOTICE '✅ Админ профиль восстановлен: saint@onaiacademy.kz';
  ELSE
    RAISE NOTICE '⚠️ Админ не найден в auth.users. Создай вручную!';
  END IF;
END $$;

-- ============================================
-- 4️⃣ УДАЛЕНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ ИЗ auth.users
-- ============================================

-- ⚠️ ОСТОРОЖНО: Удаляем всех пользователей КРОМЕ админа из auth.users
-- Раскомментируй ТОЛЬКО если уверен что хочешь удалить тестовых пользователей!

-- DELETE FROM auth.users 
-- WHERE email != 'saint@onaiacademy.kz';

-- ============================================
-- 5️⃣ ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================

SELECT '🧹 БАЗА ДАННЫХ ОЧИЩЕНА!' as status;
SELECT '' as separator;

SELECT 'public.users' as table_name, COUNT(*) as records FROM public.users
UNION ALL
SELECT 'public.achievements', COUNT(*) FROM public.achievements
UNION ALL
SELECT 'public.user_achievements', COUNT(*) FROM public.user_achievements
UNION ALL
SELECT 'public.user_progress', COUNT(*) FROM public.user_progress
UNION ALL
SELECT 'public.user_stats', COUNT(*) FROM public.user_stats;

SELECT '' as separator;
SELECT '✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:' as info;
SELECT 'users: 1 (только админ)' as expected_1;
SELECT 'achievements: 10' as expected_2;
SELECT 'user_achievements: 0' as expected_3;
SELECT 'user_progress: 0' as expected_4;
SELECT 'user_stats: 1 (только админ)' as expected_5;
SELECT '' as separator;
SELECT '🎯 БАЗА ГОТОВА К РАБОТЕ!' as final_status;

