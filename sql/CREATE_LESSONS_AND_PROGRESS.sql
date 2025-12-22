-- ============================================
-- СОЗДАЕМ КУРС, МОДУЛЬ, УРОКИ И ПРОГРЕСС
-- ============================================

DO $$
DECLARE
  v_saint_id UUID;
  v_course_id BIGINT;
  v_module_id BIGINT;
  v_lesson_id INTEGER;
  i INTEGER;
BEGIN
  -- 1. Получаем ID Saint
  SELECT id INTO v_saint_id
  FROM auth.users
  WHERE email = 'saint@onaiacademy.kz';
  
  RAISE NOTICE '✅ Saint ID: %', v_saint_id;
  
  -- 2. Создаем курс (если нет)
  INSERT INTO courses (name, slug, description, is_active)
  VALUES ('AI Интеграция для бизнеса', 'ai-integration', 'Полный курс по внедрению AI в бизнес-процессы', true)
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_course_id;
  
  -- Если курс уже существовал, получаем его ID
  IF v_course_id IS NULL THEN
    SELECT id INTO v_course_id FROM courses WHERE slug = 'ai-integration';
  END IF;
  
  RAISE NOTICE '✅ Course ID: %', v_course_id;
  
  -- 3. Создаем модуль
  INSERT INTO modules (course_id, title, description, order_index)
  VALUES (v_course_id, 'Основы AI', 'Введение в искусственный интеллект', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_module_id;
  
  IF v_module_id IS NULL THEN
    SELECT id INTO v_module_id FROM modules WHERE course_id = v_course_id ORDER BY order_index ASC LIMIT 1;
  END IF;
  
  RAISE NOTICE '✅ Module ID: %', v_module_id;
  
  -- 4. Создаем 40 уроков
  FOR i IN 1..40 LOOP
    INSERT INTO lessons (
      module_id, 
      title, 
      description, 
      order_index, 
      is_archived,
      duration_minutes
    )
    VALUES (
      v_module_id,
      'Урок ' || i || ': ' || 
        CASE 
          WHEN i <= 10 THEN 'Введение в AI'
          WHEN i <= 20 THEN 'Машинное обучение'
          WHEN i <= 30 THEN 'Нейронные сети'
          ELSE 'Практика'
        END,
      'Описание урока ' || i,
      i,
      false,
      10 + (i % 20)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lesson_id;
    
    -- 5. Добавляем прогресс для первых 15 уроков
    IF i <= 15 THEN
      INSERT INTO student_progress (
        user_id,
        lesson_id,
        module_id,
        is_started,
        is_completed,
        completed_at,
        video_progress_percent,
        xp_earned,
        completion_percentage
      )
      VALUES (
        v_saint_id,
        v_lesson_id,
        v_module_id,
        true,
        true,
        NOW() - (INTERVAL '1 day' * (20 - i)),
        100,
        50,
        100
      )
      ON CONFLICT (user_id, lesson_id) DO UPDATE 
      SET is_completed = true, video_progress_percent = 100;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Создано 40 уроков, 15 завершено';
  
  -- 6. Обновляем статистику
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
    15,
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
    lessons_completed = 15,
    last_activity_date = CURRENT_DATE;
    
  RAISE NOTICE '✅ Статистика обновлена: 15 уроков завершено';
  
END $$;

-- Проверка
SELECT 
  '=== РЕЗУЛЬТАТ ===' as step,
  (SELECT COUNT(*) FROM lessons WHERE is_archived = false) as total_lessons,
  (SELECT COUNT(*) FROM student_progress WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz') AND is_completed = true) as completed_lessons;



















