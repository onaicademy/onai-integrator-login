-- ============================================
-- ТЕСТОВЫЕ ДАННЫЕ AI-НАСТАВНИКА ДЛЯ SAINT
-- Email: saint@onaiacademy.kz
-- ============================================

DO $$
DECLARE
  v_saint_user_id UUID;
  v_course_id BIGINT;
  v_module_id BIGINT;
  v_lesson_ids UUID[];
  v_lesson_id UUID;
BEGIN
  RAISE NOTICE '=== СОЗДАНИЕ ДАННЫХ ДЛЯ SAINT ===';
  
  -- 1. Находим пользователя saint@onaiacademy.kz
  SELECT id INTO v_saint_user_id
  FROM auth.users
  WHERE email = 'saint@onaiacademy.kz';
  
  IF v_saint_user_id IS NULL THEN
    RAISE NOTICE '❌ Пользователь saint@onaiacademy.kz не найден!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Saint User ID: %', v_saint_user_id;
  
  -- 2. Берем существующий курс или создаем
  SELECT id INTO v_course_id FROM courses WHERE name LIKE '%AI%' LIMIT 1;
  
  IF v_course_id IS NULL THEN
    INSERT INTO courses (name, slug, description)
    VALUES ('AI Интеграция', 'ai-integration', 'Курс по AI')
    RETURNING id INTO v_course_id;
  END IF;
  
  RAISE NOTICE '✅ Course ID: %', v_course_id;
  
  -- 3. Берем модуль
  SELECT id INTO v_module_id FROM modules WHERE course_id = v_course_id LIMIT 1;
  
  IF v_module_id IS NULL THEN
    INSERT INTO modules (course_id, title, description, order_index)
    VALUES (v_course_id, 'Основы AI', 'Базовый модуль', 1)
    RETURNING id INTO v_module_id;
  END IF;
  
  RAISE NOTICE '✅ Module ID: %', v_module_id;
  
  -- 4. Берем уроки (или создаем если нет)
  SELECT array_agg(id) INTO v_lesson_ids
  FROM lessons
  WHERE module_id = v_module_id
  LIMIT 5;
  
  IF v_lesson_ids IS NULL OR array_length(v_lesson_ids, 1) < 3 THEN
    FOR i IN 1..5 LOOP
      INSERT INTO lessons (module_id, title, order_index)
      VALUES (v_module_id, 'Урок ' || i || ': AI Basics', i)
      RETURNING id INTO v_lesson_id;
      
      v_lesson_ids := array_append(v_lesson_ids, v_lesson_id);
    END LOOP;
  END IF;
  
  RAISE NOTICE '✅ Создано/найдено уроков: %', array_length(v_lesson_ids, 1);
  
  -- 5. Создаем статистику для Saint
  INSERT INTO user_statistics (
    user_id,
    lessons_completed,
    modules_completed,
    courses_completed,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    last_activity_date
  )
  VALUES (
    v_saint_user_id,
    8,      -- 8 уроков завершено
    2,      -- 2 модуля
    1,      -- 1 курс
    350,    -- 350 XP
    4,      -- Уровень 4
    7,      -- Streak 7 дней
    15,     -- Макс streak 15 дней
    CURRENT_DATE
  )
  ON CONFLICT (user_id) DO UPDATE
  SET lessons_completed = 8,
      total_xp = 350,
      current_level = 4,
      current_streak = 7;
  
  RAISE NOTICE '✅ Статистика создана (8 уроков, 350 XP, Level 4, Streak 7)';
  
  -- 6. Создаем прогресс по урокам (3 completed, 2 in_progress)
  FOR i IN 1..5 LOOP
    IF i <= 3 THEN
      -- Первые 3 урока - завершены
      INSERT INTO user_progress (
        user_id,
        course_id,
        module_id,
        lesson_id,
        status,
        progress_percent,
        completed_at,
        last_accessed_at
      )
      VALUES (
        v_saint_user_id,
        v_course_id,
        v_module_id,
        v_lesson_ids[i],
        'completed',
        100,
        NOW() - (random() * INTERVAL '7 days'),
        NOW() - (random() * INTERVAL '7 days')
      )
      ON CONFLICT (user_id, lesson_id) DO UPDATE
      SET status = 'completed', progress_percent = 100;
    ELSE
      -- Остальные - в процессе
      INSERT INTO user_progress (
        user_id,
        course_id,
        module_id,
        lesson_id,
        status,
        progress_percent,
        last_accessed_at
      )
      VALUES (
        v_saint_user_id,
        v_course_id,
        v_module_id,
        v_lesson_ids[i],
        'in_progress',
        45,
        NOW() - (random() * INTERVAL '2 days')
      )
      ON CONFLICT (user_id, lesson_id) DO UPDATE
      SET status = 'in_progress', progress_percent = 45;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Прогресс по урокам: 3 завершено, 2 в процессе';
  
  -- 7. Создаем миссии
  INSERT INTO missions (
    user_id,
    mission_type,
    title,
    description,
    target_value,
    current_value,
    xp_reward,
    is_completed
  )
  VALUES 
  (v_saint_user_id, 'complete_lessons', 'Пройди 10 уроков', 'Завершите 10 уроков на этой неделе', 10, 8, 200, false),
  (v_saint_user_id, 'earn_xp', 'Заработай 500 XP', 'Получите 500 очков опыта', 500, 350, 100, false),
  (v_saint_user_id, 'streak_days', 'Поддержи streak 10 дней', 'Занимайся 10 дней подряд', 10, 7, 150, false)
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Миссии созданы (3 активных)';
  
  -- 8. Создаем недельные цели
  INSERT INTO weekly_goals (
    user_id,
    goal_type,
    target_value,
    current_value,
    week_start_date,
    week_end_date,
    is_completed
  )
  VALUES 
  (
    v_saint_user_id,
    'lessons_completed',
    15,
    8,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6,
    false
  ),
  (
    v_saint_user_id,
    'study_time_minutes',
    300,
    180,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
    CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6,
    false
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Недельные цели созданы (15 уроков, 300 минут)';
  
  -- 9. Создаем сессии просмотра видео (в т.ч. проблемную)
  INSERT INTO video_watch_sessions (
    user_id,
    lesson_id,
    seeks_count,
    pauses_count,
    max_second_reached,
    is_fully_watched
  )
  VALUES 
  (v_saint_user_id, v_lesson_ids[4], 8, 12, 450, false),  -- ПРОБЛЕМА! 8 перемоток
  (v_saint_user_id, v_lesson_ids[5], 2, 3, 600, true);   -- Норм
  
  RAISE NOTICE '✅ Сессии видео: 1 проблемная (8 перемоток), 1 нормальная';
  
  -- 10. Создаем вопросы к AI
  INSERT INTO student_questions_log (
    user_id,
    question_text,
    question_category,
    asked_at_lesson_id,
    ai_response,
    ai_model_used,
    response_time_ms
  )
  VALUES 
  (
    v_saint_user_id,
    'Как получить API ключ OpenAI?',
    'technical_help',
    v_lesson_ids[1],
    'Перейдите на platform.openai.com и создайте ключ в разделе API Keys.',
    'gpt-4o',
    1500
  ),
  (
    v_saint_user_id,
    'Не понимаю как работают вебхуки',
    'course_faq',
    v_lesson_ids[2],
    'Вебхук - это URL который принимает данные от внешних систем. В n8n создается через ноду Webhook.',
    'gpt-4o',
    1800
  );
  
  RAISE NOTICE '✅ Вопросы к AI: 2 записи';
  
  -- 11. Создаем задачу для AI-наставника (проблема с видео)
  INSERT INTO ai_mentor_tasks (
    triggered_by,
    student_id,
    task_type,
    description,
    priority,
    context_data,
    status
  )
  VALUES (
    'video_struggle',
    v_saint_user_id,
    'offer_help',
    'Студент Saint пересмотрел урок несколько раз. Возможно, нужна помощь.',
    'high',
    jsonb_build_object(
      'lesson_id', v_lesson_ids[4],
      'seeks_count', 8,
      'struggling_at_second', 450
    ),
    'pending'
  );
  
  RAISE NOTICE '✅ Задача для AI: помощь с проблемным уроком';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== 🎉 ВСЁ ГОТОВО! ===';
  RAISE NOTICE 'Данные для saint@onaiacademy.kz созданы:';
  RAISE NOTICE '  📊 Статистика: Level 4, 350 XP, Streak 7';
  RAISE NOTICE '  📚 Прогресс: 3 урока завершено, 2 в процессе';
  RAISE NOTICE '  🎯 Миссии: 3 активных';
  RAISE NOTICE '  📅 Цели: 2 недельных';
  RAISE NOTICE '  🎬 Видео: 1 проблемное (триггер сработает)';
  RAISE NOTICE '  💬 Вопросы: 2 к AI';
  RAISE NOTICE '  🤖 Задачи AI: 1 pending';
  
END $$;

-- Проверка созданных данных
SELECT 
  '=== ПРОВЕРКА ДАННЫХ SAINT ===' as check,
  (SELECT COUNT(*) FROM user_statistics WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as stats,
  (SELECT COUNT(*) FROM user_progress WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as progress,
  (SELECT COUNT(*) FROM missions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as missions,
  (SELECT COUNT(*) FROM weekly_goals WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as goals,
  (SELECT COUNT(*) FROM video_watch_sessions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as videos,
  (SELECT COUNT(*) FROM student_questions_log WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as questions,
  (SELECT COUNT(*) FROM ai_mentor_tasks WHERE student_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as tasks;

