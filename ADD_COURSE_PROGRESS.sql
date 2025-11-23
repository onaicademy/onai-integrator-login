-- ============================================
-- ДОБАВЛЯЕМ ПРОГРЕСС КУРСА ДЛЯ SAINT
-- ============================================

DO $$
DECLARE
  v_saint_id UUID;
  v_course_id BIGINT;
  v_module_id BIGINT;
  v_lesson_record RECORD;
  v_completed_count INT := 0;
BEGIN
  -- 1. Получаем ID Saint
  SELECT id INTO v_saint_id
  FROM auth.users
  WHERE email = 'saint@onaiacademy.kz';
  
  RAISE NOTICE '✅ Saint ID: %', v_saint_id;
  
  -- 2. Находим первый активный курс
  SELECT id INTO v_course_id
  FROM courses
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_course_id IS NULL THEN
    RAISE NOTICE '⚠️ Курсов не найдено, создаем тестовый';
    INSERT INTO courses (name, slug, description, is_active)
    VALUES ('AI Интеграция для бизнеса', 'ai-integration', 'Полный курс по внедрению AI в бизнес-процессы', true)
    RETURNING id INTO v_course_id;
  END IF;
  
  RAISE NOTICE '✅ Course ID: %', v_course_id;
  
  -- 3. Находим первый модуль курса
  SELECT id INTO v_module_id
  FROM modules
  WHERE course_id = v_course_id
  ORDER BY order_index ASC
  LIMIT 1;
  
  IF v_module_id IS NULL THEN
    RAISE NOTICE '⚠️ Модулей не найдено, создаем тестовый';
    INSERT INTO modules (course_id, title, description, order_index)
    VALUES (v_course_id, 'Основы AI', 'Введение в искусственный интеллект', 1)
    RETURNING id INTO v_module_id;
  END IF;
  
  RAISE NOTICE '✅ Module ID: %', v_module_id;
  
  -- 4. Проверяем уроки модуля
  FOR v_lesson_record IN 
    SELECT id, title, order_index
    FROM lessons
    WHERE module_id = v_module_id
    AND is_archived = false
    ORDER BY order_index ASC
    LIMIT 20
  LOOP
    -- Добавляем прогресс только для первых 15 уроков (для разнообразия)
    IF v_completed_count < 15 THEN
      -- Проверяем, нет ли уже прогресса
      IF NOT EXISTS (
        SELECT 1 FROM student_progress 
        WHERE user_id = v_saint_id AND lesson_id = v_lesson_record.id
      ) THEN
        INSERT INTO student_progress (
          user_id,
          lesson_id,
          module_id,
          is_started,
          is_completed,
          completed_at,
          video_progress_percent,
          last_position_seconds,
          watch_time_seconds,
          xp_earned,
          completion_percentage
        ) VALUES (
          v_saint_id,
          v_lesson_record.id,
          v_module_id,
          true,
          true,
          NOW() - (INTERVAL '1 day' * (20 - v_completed_count)),
          100,
          0,
          600 + (v_completed_count * 100),
          50,
          100
        );
        
        v_completed_count := v_completed_count + 1;
        RAISE NOTICE '✅ Добавлен прогресс для урока: % (% из 15)', v_lesson_record.title, v_completed_count;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 Добавлено % завершенных уроков', v_completed_count;
  
  -- 5. Обновляем статистику пользователя
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
    v_saint_id,
    v_completed_count,
    0,
    0,
    1250,
    5,
    7,
    10,
    CURRENT_DATE
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    lessons_completed = EXCLUDED.lessons_completed,
    last_activity_date = EXCLUDED.last_activity_date;
    
  RAISE NOTICE '✅ Статистика обновлена';
  
END $$;

-- Проверяем результат
SELECT 
  '=== РЕЗУЛЬТАТ ===' as step,
  COUNT(*) as completed_lessons,
  SUM(xp_earned) as total_xp
FROM student_progress
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')
  AND is_completed = true;








