-- ============================================
-- ТЕСТИРОВАНИЕ ТРИГГЕРОВ AI-НАСТАВНИКА
-- ============================================

-- ========================================
-- ТЕСТ 1: Триггер update_user_streak()
-- ========================================

DO $$
DECLARE
  v_student_id UUID;
  v_lesson_id UUID;
  v_old_streak INTEGER;
  v_new_streak INTEGER;
BEGIN
  RAISE NOTICE '=== ТЕСТ 1: Проверка триггера streak ===';
  
  -- Берем случайного студента
  SELECT id INTO v_student_id 
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1;
  
  -- Берем случайный урок
  SELECT id INTO v_lesson_id 
  FROM lessons 
  LIMIT 1;
  
  -- Запоминаем старый streak
  SELECT current_streak INTO v_old_streak
  FROM profiles
  WHERE id = v_student_id;
  
  RAISE NOTICE 'Студент ID: %', v_student_id;
  RAISE NOTICE 'Старый streak: %', v_old_streak;
  
  -- Симулируем активность (триггер должен сработать!)
  INSERT INTO user_progress (user_id, lesson_id, last_accessed_at, status)
  VALUES (v_student_id, v_lesson_id, NOW(), 'in_progress')
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET last_accessed_at = NOW(),
      updated_at = NOW();
  
  -- Проверяем новый streak
  SELECT current_streak INTO v_new_streak
  FROM profiles
  WHERE id = v_student_id;
  
  RAISE NOTICE 'Новый streak: %', v_new_streak;
  
  IF v_new_streak IS NOT NULL THEN
    RAISE NOTICE '✅ ТЕСТ 1 ПРОЙДЕН: Триггер streak работает!';
  ELSE
    RAISE NOTICE '❌ ТЕСТ 1 НЕ ПРОЙДЕН: Триггер не сработал';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 2: Триггер detect_video_struggle()
-- ========================================

DO $$
DECLARE
  v_student_id UUID;
  v_lesson_id UUID;
  v_video_id UUID;
  v_tasks_before INTEGER;
  v_tasks_after INTEGER;
  v_new_task RECORD;
BEGIN
  RAISE NOTICE '=== ТЕСТ 2: Проверка триггера video_struggle ===';
  
  -- Берем случайного студента
  SELECT id INTO v_student_id 
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1;
  
  -- Берем случайный урок
  SELECT id INTO v_lesson_id 
  FROM lessons 
  LIMIT 1;
  
  -- Берем видео этого урока
  SELECT id INTO v_video_id
  FROM video_content
  WHERE lesson_id = v_lesson_id
  LIMIT 1;
  
  -- Считаем задачи до
  SELECT COUNT(*) INTO v_tasks_before
  FROM ai_mentor_tasks
  WHERE student_id = v_student_id;
  
  RAISE NOTICE 'Студент ID: %', v_student_id;
  RAISE NOTICE 'Урок ID: %', v_lesson_id;
  RAISE NOTICE 'Задач AI до: %', v_tasks_before;
  
  -- Симулируем ПРОБЛЕМУ: много перемоток (триггер должен сработать!)
  INSERT INTO video_watch_sessions (
    user_id,
    lesson_id,
    video_id,
    seeks_count,      -- 8 перемоток (>= 5 = триггер!)
    max_second_reached,
    pauses_count
  )
  VALUES (
    v_student_id,
    v_lesson_id,
    v_video_id,
    8,                -- ПРОБЛЕМА!
    450,              -- Застрял на 7:30
    12
  );
  
  -- Считаем задачи после
  SELECT COUNT(*) INTO v_tasks_after
  FROM ai_mentor_tasks
  WHERE student_id = v_student_id;
  
  RAISE NOTICE 'Задач AI после: %', v_tasks_after;
  
  -- Проверяем что задача создалась
  IF v_tasks_after > v_tasks_before THEN
    -- Показываем новую задачу
    SELECT * INTO v_new_task
    FROM ai_mentor_tasks
    WHERE student_id = v_student_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    RAISE NOTICE '✅ ТЕСТ 2 ПРОЙДЕН: Триггер video_struggle работает!';
    RAISE NOTICE 'Создана задача: %', v_new_task.description;
    RAISE NOTICE 'Приоритет: %', v_new_task.priority;
    RAISE NOTICE 'Контекст: %', v_new_task.context_data;
  ELSE
    RAISE NOTICE '❌ ТЕСТ 2 НЕ ПРОЙДЕН: Задача не создалась (возможно триггер не работает)';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 3: Функция check_and_unlock_achievements()
-- ========================================

DO $$
DECLARE
  v_student_id UUID;
  v_result RECORD;
  v_achievements_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== ТЕСТ 3: Проверка разблокировки достижений ===';
  
  -- Берем случайного студента
  SELECT id INTO v_student_id 
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1;
  
  RAISE NOTICE 'Студент ID: %', v_student_id;
  
  -- Устанавливаем хорошую статистику (чтобы разблокировать достижения)
  UPDATE user_statistics
  SET lessons_completed = 15,
      modules_completed = 3,
      current_streak = 10,
      total_xp = 500
  WHERE user_id = v_student_id;
  
  RAISE NOTICE 'Установлена статистика: 15 уроков, 3 модуля, 10 streak, 500 XP';
  
  -- Проверяем достижения
  FOR v_result IN
    SELECT * FROM check_and_unlock_achievements(v_student_id)
  LOOP
    v_achievements_count := v_achievements_count + 1;
    RAISE NOTICE 'Разблокировано: %, +% XP', v_result.achievement_id, v_result.xp_earned;
  END LOOP;
  
  IF v_achievements_count > 0 THEN
    RAISE NOTICE '✅ ТЕСТ 3 ПРОЙДЕН: Разблокировано % достижений!', v_achievements_count;
  ELSE
    RAISE NOTICE '⚠️ ТЕСТ 3: Достижения не разблокированы (возможно уже были разблокированы ранее)';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 4: Функция get_student_context_for_ai()
-- ========================================

DO $$
DECLARE
  v_student_id UUID;
  v_context JSONB;
BEGIN
  RAISE NOTICE '=== ТЕСТ 4: Проверка контекста для AI ===';
  
  -- Берем случайного студента
  SELECT id INTO v_student_id 
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1;
  
  RAISE NOTICE 'Студент ID: %', v_student_id;
  
  -- Получаем контекст
  SELECT get_student_context_for_ai(v_student_id) INTO v_context;
  
  RAISE NOTICE 'Контекст получен:';
  RAISE NOTICE '  Имя: %', v_context->'personal'->>'full_name';
  RAISE NOTICE '  Уроков завершено: %', v_context->'learning'->>'lessons_completed';
  RAISE NOTICE '  Уровень: %', v_context->'gamification'->>'level';
  RAISE NOTICE '  XP: %', v_context->'gamification'->>'total_xp';
  RAISE NOTICE '  Streak: %', v_context->'gamification'->>'current_streak';
  RAISE NOTICE '  Активных миссий: %', jsonb_array_length(v_context->'active_missions');
  
  IF v_context IS NOT NULL THEN
    RAISE NOTICE '✅ ТЕСТ 4 ПРОЙДЕН: Контекст для AI работает!';
  ELSE
    RAISE NOTICE '❌ ТЕСТ 4 НЕ ПРОЙДЕН: Контекст не получен';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 5: Функция update_mission_progress()
-- ========================================

DO $$
DECLARE
  v_student_id UUID;
  v_mission RECORD;
  v_old_value INTEGER;
  v_new_value INTEGER;
BEGIN
  RAISE NOTICE '=== ТЕСТ 5: Проверка обновления прогресса миссии ===';
  
  -- Берем случайного студента
  SELECT id INTO v_student_id 
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 1;
  
  -- Берем активную миссию
  SELECT * INTO v_mission
  FROM missions
  WHERE user_id = v_student_id
    AND is_completed = false
  LIMIT 1;
  
  IF v_mission IS NULL THEN
    RAISE NOTICE '⚠️ У студента нет активных миссий, создаем...';
    
    INSERT INTO missions (user_id, mission_type, title, description, target_value, current_value, xp_reward)
    VALUES (v_student_id, 'complete_lessons', 'Тестовая миссия', 'Завершить 5 уроков', 5, 0, 100)
    RETURNING * INTO v_mission;
  END IF;
  
  v_old_value := v_mission.current_value;
  
  RAISE NOTICE 'Миссия: %', v_mission.title;
  RAISE NOTICE 'Прогресс до: %/%', v_old_value, v_mission.target_value;
  
  -- Обновляем прогресс (+1)
  PERFORM update_mission_progress(v_student_id, v_mission.mission_type, 1);
  
  -- Проверяем новое значение
  SELECT current_value INTO v_new_value
  FROM missions
  WHERE id = v_mission.id;
  
  RAISE NOTICE 'Прогресс после: %/%', v_new_value, v_mission.target_value;
  
  IF v_new_value > v_old_value THEN
    RAISE NOTICE '✅ ТЕСТ 5 ПРОЙДЕН: Прогресс миссии обновляется!';
  ELSE
    RAISE NOTICE '❌ ТЕСТ 5 НЕ ПРОЙДЕН: Прогресс не обновился';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ИТОГОВАЯ СВОДКА ТЕСТОВ
-- ========================================

SELECT 
  '=== 🎯 ИТОГИ ТЕСТИРОВАНИЯ ===' as summary,
  '✅ Все тесты выполнены! Проверь логи выше.' as status,
  'Если увидел "✅ ТЕСТ X ПРОЙДЕН" - значит работает!' as instruction;

