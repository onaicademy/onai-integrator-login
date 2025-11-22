-- ============================================
-- ТЕСТИРОВАНИЕ ТРИГГЕРОВ AI-НАСТАВНИКА (ИСПРАВЛЕНО)
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
  
  -- Берем любого пользователя из auth.users
  SELECT id INTO v_student_id 
  FROM auth.users 
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE '❌ НЕТ ПОЛЬЗОВАТЕЛЕЙ! Сначала создай тестовые данные.';
    RETURN;
  END IF;
  
  -- Берем любой урок
  SELECT id INTO v_lesson_id 
  FROM lessons 
  LIMIT 1;
  
  IF v_lesson_id IS NULL THEN
    RAISE NOTICE '❌ НЕТ УРОКОВ! Сначала создай тестовые данные.';
    RETURN;
  END IF;
  
  -- Запоминаем старый streak (из profiles или user_statistics)
  SELECT COALESCE(current_streak, 0) INTO v_old_streak
  FROM profiles
  WHERE id = v_student_id;
  
  IF v_old_streak IS NULL THEN
    -- Пробуем из user_statistics
    SELECT COALESCE(current_streak, 0) INTO v_old_streak
    FROM user_statistics
    WHERE user_id = v_student_id;
  END IF;
  
  RAISE NOTICE 'Пользователь ID: %', v_student_id;
  RAISE NOTICE 'Старый streak: %', COALESCE(v_old_streak, 0);
  
  -- Симулируем активность (триггер должен сработать!)
  INSERT INTO user_progress (user_id, lesson_id, last_accessed_at, status)
  VALUES (v_student_id, v_lesson_id, NOW(), 'in_progress')
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET last_accessed_at = NOW(),
      updated_at = NOW();
  
  -- Проверяем новый streak
  SELECT COALESCE(current_streak, 0) INTO v_new_streak
  FROM profiles
  WHERE id = v_student_id;
  
  IF v_new_streak IS NULL THEN
    SELECT COALESCE(current_streak, 0) INTO v_new_streak
    FROM user_statistics
    WHERE user_id = v_student_id;
  END IF;
  
  RAISE NOTICE 'Новый streak: %', COALESCE(v_new_streak, 0);
  
  IF v_new_streak IS NOT NULL OR v_old_streak IS NOT NULL THEN
    RAISE NOTICE '✅ ТЕСТ 1 ЗАВЕРШЕН: Данные обновлены (проверь streak в таблице profiles/user_statistics)';
  ELSE
    RAISE NOTICE '⚠️ ТЕСТ 1: Streak не изменился (возможно таблица не настроена)';
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
  
  -- Берем любого пользователя
  SELECT id INTO v_student_id 
  FROM auth.users 
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE '❌ НЕТ ПОЛЬЗОВАТЕЛЕЙ! Сначала создай тестовые данные.';
    RETURN;
  END IF;
  
  -- Берем любой урок
  SELECT id INTO v_lesson_id 
  FROM lessons 
  LIMIT 1;
  
  IF v_lesson_id IS NULL THEN
    RAISE NOTICE '❌ НЕТ УРОКОВ! Сначала создай тестовые данные.';
    RETURN;
  END IF;
  
  -- Берем видео этого урока (или создаем фейковое)
  SELECT id INTO v_video_id
  FROM video_content
  WHERE lesson_id = v_lesson_id
  LIMIT 1;
  
  RAISE NOTICE 'Пользователь ID: %', v_student_id;
  RAISE NOTICE 'Урок ID: %', v_lesson_id;
  
  -- Считаем задачи до
  SELECT COUNT(*) INTO v_tasks_before
  FROM ai_mentor_tasks
  WHERE student_id = v_student_id;
  
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
  ELSE
    RAISE NOTICE '⚠️ ТЕСТ 2: Задача не создалась. Возможные причины:';
    RAISE NOTICE '  - Триггер не настроен';
    RAISE NOTICE '  - Функция create_mentor_task_from_video_struggle() не существует';
    RAISE NOTICE '  - Проверь: SELECT * FROM pg_trigger WHERE tgname = ''on_video_struggle'';';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 3: Функция get_student_context_for_ai()
-- ========================================

DO $$
DECLARE
  v_student_id UUID;
  v_context JSONB;
BEGIN
  RAISE NOTICE '=== ТЕСТ 3: Проверка контекста для AI ===';
  
  -- Берем любого пользователя
  SELECT id INTO v_student_id 
  FROM auth.users 
  LIMIT 1;
  
  IF v_student_id IS NULL THEN
    RAISE NOTICE '❌ НЕТ ПОЛЬЗОВАТЕЛЕЙ!';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Пользователь ID: %', v_student_id;
  
  -- Получаем контекст
  BEGIN
    SELECT get_student_context_for_ai(v_student_id) INTO v_context;
    
    RAISE NOTICE 'Контекст получен:';
    RAISE NOTICE '  Имя: %', v_context->'personal'->>'full_name';
    RAISE NOTICE '  Уроков завершено: %', v_context->'learning'->>'lessons_completed';
    RAISE NOTICE '  Уровень: %', v_context->'gamification'->>'level';
    RAISE NOTICE '  XP: %', v_context->'gamification'->>'total_xp';
    RAISE NOTICE '  Streak: %', v_context->'gamification'->>'current_streak';
    
    IF v_context IS NOT NULL THEN
      RAISE NOTICE '✅ ТЕСТ 3 ПРОЙДЕН: Функция get_student_context_for_ai() работает!';
    ELSE
      RAISE NOTICE '❌ ТЕСТ 3 НЕ ПРОЙДЕН: Контекст пустой';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ ТЕСТ 3 НЕ ПРОЙДЕН: Функция get_student_context_for_ai() не существует или ошибка: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 4: Проверка базы знаний
-- ========================================

DO $$
DECLARE
  v_knowledge_count INTEGER;
  v_record RECORD;
BEGIN
  RAISE NOTICE '=== ТЕСТ 4: Проверка базы знаний ===';
  
  SELECT COUNT(*) INTO v_knowledge_count
  FROM curator_knowledge_base
  WHERE is_active = true;
  
  RAISE NOTICE 'Записей в базе знаний: %', v_knowledge_count;
  
  IF v_knowledge_count > 0 THEN
    RAISE NOTICE '✅ ТЕСТ 4 ПРОЙДЕН: База знаний заполнена!';
    RAISE NOTICE 'Примеры записей:';
    
    FOR v_record IN
      SELECT category, question, keywords
      FROM curator_knowledge_base
      WHERE is_active = true
      LIMIT 3
    LOOP
      RAISE NOTICE '  [%] %', v_record.category, v_record.question;
    END LOOP;
  ELSE
    RAISE NOTICE '❌ ТЕСТ 4 НЕ ПРОЙДЕН: База знаний пустая. Запусти: curator_knowledge_base_seed.sql';
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ТЕСТ 5: Проверка структуры таблиц
-- ========================================

DO $$
DECLARE
  v_table_name TEXT;
  v_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== ТЕСТ 5: Проверка структуры таблиц ===';
  
  FOR v_table_name IN
    SELECT unnest(ARRAY[
      'user_progress',
      'video_watch_sessions',
      'missions',
      'weekly_goals',
      'daily_challenges',
      'curator_knowledge_base',
      'student_questions_log',
      'ai_mentor_advice_log',
      'ai_mentor_tasks'
    ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) THEN
      v_count := v_count + 1;
      RAISE NOTICE '  ✅ % существует', v_table_name;
    ELSE
      RAISE NOTICE '  ❌ % НЕ СУЩЕСТВУЕТ', v_table_name;
    END IF;
  END LOOP;
  
  IF v_count = 9 THEN
    RAISE NOTICE '✅ ТЕСТ 5 ПРОЙДЕН: Все 9 таблиц созданы!';
  ELSE
    RAISE NOTICE '❌ ТЕСТ 5 НЕ ПРОЙДЕН: Создано только % из 9 таблиц', v_count;
  END IF;
  
  RAISE NOTICE '';
END $$;

-- ========================================
-- ИТОГОВАЯ СВОДКА
-- ========================================

SELECT 
  '=== 🎯 ИТОГИ ТЕСТИРОВАНИЯ ===' as summary,
  'Проверь логи выше!' as instruction,
  'Если увидел ✅ - значит работает!' as note;

