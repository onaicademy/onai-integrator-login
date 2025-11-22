-- ============================================
-- СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ ДЛЯ AI-НАСТАВНИКА
-- Дата: 21 ноября 2025
-- Описание: Создает тестовых пользователей, курсы, уроки и активность
-- ============================================

-- ========================================
-- РАЗДЕЛ 1: ТЕСТОВЫЕ ПОЛЬЗОВАТЕЛИ
-- ========================================

-- Создаем 10 тестовых студентов
-- ВАЖНО: Замени 'YOUR_ADMIN_ID' на свой реальный user_id из auth.users

DO $$
DECLARE
  v_user_id UUID;
  v_student_name TEXT;
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    -- Генерируем UUID для студента
    v_user_id := gen_random_uuid();
    v_student_name := 'Студент ' || i;
    
    -- Вставляем в profiles (если у вас есть таблица profiles)
    INSERT INTO profiles (id, full_name, email, role, xp, level, current_streak, longest_streak, created_at)
    VALUES (
      v_user_id,
      v_student_name,
      'student' || i || '@test.com',
      'student',
      (random() * 500)::INTEGER, -- Случайный XP от 0 до 500
      1 + FLOOR((random() * 500) / 100), -- Уровень от 1 до 5
      (random() * 30)::INTEGER, -- Streak от 0 до 30
      (random() * 60)::INTEGER, -- Longest streak от 0 до 60
      NOW() - (random() * INTERVAL '60 days') -- Регистрация в последние 60 дней
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Создаем статистику для студента
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
      v_user_id,
      (random() * 20)::INTEGER, -- 0-20 уроков
      (random() * 5)::INTEGER, -- 0-5 модулей
      (random() * 2)::INTEGER, -- 0-2 курса
      (random() * 500)::INTEGER,
      1 + FLOOR((random() * 500) / 100),
      (random() * 30)::INTEGER,
      (random() * 60)::INTEGER,
      CURRENT_DATE - (random() * INTERVAL '7 days')::INTEGER
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Создан студент: % (ID: %)', v_student_name, v_user_id;
  END LOOP;
END $$;

-- ========================================
-- РАЗДЕЛ 2: ТЕСТОВЫЙ КУРС И УРОКИ
-- ========================================

-- Создаем тестовый курс
INSERT INTO courses (title, description, is_active, created_at)
VALUES (
  '🤖 AI-Интеграция и Автоматизация',
  'Полный курс по созданию AI-ботов и автоматизации бизнес-процессов через n8n',
  true,
  NOW()
)
ON CONFLICT DO NOTHING
RETURNING id;

-- Создаем 3 модуля
INSERT INTO modules (course_id, title, description, order_index, is_active, created_at)
SELECT 
  c.id,
  'Модуль ' || s.module_num || ': ' || s.module_title,
  s.module_description,
  s.module_num,
  true,
  NOW()
FROM courses c
CROSS JOIN (
  VALUES 
    (1, 'Основы AI и OpenAI', 'Изучаем базовые концепции AI и работу с OpenAI API'),
    (2, 'n8n и автоматизация', 'Создаем автоматизации с помощью n8n'),
    (3, 'Интеграция с CRM', 'Подключаем AI-ботов к CRM системам')
) AS s(module_num, module_title, module_description)
WHERE c.title = '🤖 AI-Интеграция и Автоматизация'
ON CONFLICT DO NOTHING;

-- Создаем 10 уроков (по 3-4 в каждом модуле)
INSERT INTO lessons (id, module_id, title, description, order_index, duration_minutes, is_free, is_published, created_at)
SELECT 
  gen_random_uuid(),
  m.id,
  'Урок ' || s.lesson_num || ': ' || s.lesson_title,
  s.lesson_description,
  s.lesson_num,
  (15 + random() * 30)::INTEGER, -- 15-45 минут
  s.lesson_num <= 2, -- Первые 2 урока бесплатные
  true,
  NOW()
FROM modules m
CROSS JOIN (
  VALUES 
    (1, 'Что такое AI?', 'Введение в искусственный интеллект'),
    (2, 'OpenAI API: первые шаги', 'Регистрация и получение API ключа'),
    (3, 'ChatGPT и GPT-4', 'Разница между моделями'),
    (4, 'Промпт-инженерия', 'Как писать эффективные промпты'),
    (5, 'Установка n8n', 'Установка и настройка n8n'),
    (6, 'Вебхуки в n8n', 'Создание и использование вебхуков'),
    (7, 'HTTP запросы', 'Работа с внешними API'),
    (8, 'Подключение CRM', 'Интеграция с популярными CRM'),
    (9, 'Автоматизация лидогенерации', 'Создание воронки лидов'),
    (10, 'Финальный проект', 'Создаем полноценного AI-помощника')
) AS s(lesson_num, lesson_title, lesson_description)
WHERE m.course_id = (SELECT id FROM courses WHERE title = '🤖 AI-Интеграция и Автоматизация' LIMIT 1)
ON CONFLICT DO NOTHING;

-- Создаем видеоконтент для уроков
INSERT INTO video_content (id, lesson_id, video_url, duration_seconds, thumbnail_url, created_at)
SELECT 
  gen_random_uuid(),
  l.id,
  'https://example.com/videos/' || l.order_index || '.mp4',
  (900 + random() * 1800)::INTEGER, -- 15-45 минут в секундах
  'https://example.com/thumbnails/' || l.order_index || '.jpg',
  NOW()
FROM lessons l
WHERE l.module_id IN (
  SELECT id FROM modules WHERE course_id = (
    SELECT id FROM courses WHERE title = '🤖 AI-Интеграция и Автоматизация' LIMIT 1
  )
)
ON CONFLICT DO NOTHING;

-- ========================================
-- РАЗДЕЛ 3: АКТИВНОСТЬ СТУДЕНТОВ
-- ========================================

-- Создаем прогресс по урокам для каждого студента
INSERT INTO user_progress (user_id, course_id, module_id, lesson_id, status, progress_percent, video_current_second, video_watched_seconds, last_accessed_at, time_spent_minutes)
SELECT 
  p.id as user_id,
  c.id as course_id,
  m.id as module_id,
  l.id as lesson_id,
  CASE 
    WHEN random() < 0.3 THEN 'completed'
    WHEN random() < 0.6 THEN 'in_progress'
    ELSE 'not_started'
  END as status,
  (random() * 100)::INTEGER as progress_percent,
  (random() * 1800)::INTEGER as video_current_second,
  (random() * 1800)::INTEGER as video_watched_seconds,
  NOW() - (random() * INTERVAL '7 days') as last_accessed_at,
  (random() * 60)::INTEGER as time_spent_minutes
FROM profiles p
CROSS JOIN courses c
CROSS JOIN modules m
CROSS JOIN lessons l
WHERE c.title = '🤖 AI-Интеграция и Автоматизация'
  AND m.course_id = c.id
  AND l.module_id = m.id
  AND p.role = 'student'
  AND random() < 0.7 -- 70% вероятность что студент начал урок
ON CONFLICT (user_id, lesson_id) DO NOTHING;

-- Создаем сессии просмотра видео (симулируем проблемные моменты)
INSERT INTO video_watch_sessions (user_id, lesson_id, video_id, session_start, duration_seconds, max_second_reached, pauses_count, seeks_count, playback_speed, is_fully_watched)
SELECT 
  up.user_id,
  up.lesson_id,
  vc.id,
  NOW() - (random() * INTERVAL '7 days'),
  (random() * 1800)::INTEGER,
  (random() * 1800)::INTEGER,
  (random() * 10)::INTEGER, -- 0-10 пауз
  CASE 
    WHEN random() < 0.2 THEN (5 + random() * 10)::INTEGER -- 20% студентов часто перематывают (проблема!)
    ELSE (random() * 3)::INTEGER -- Остальные перематывают мало
  END as seeks_count,
  1.0 + (random() * 0.5), -- Скорость 1.0-1.5x
  random() < 0.5 as is_fully_watched
FROM user_progress up
JOIN video_content vc ON vc.lesson_id = up.lesson_id
WHERE up.status IN ('in_progress', 'completed')
  AND random() < 0.8 -- 80% вероятность что есть сессия
ON CONFLICT DO NOTHING;

-- ========================================
-- РАЗДЕЛ 4: МИССИИ И ЦЕЛИ
-- ========================================

-- Создаем миссии для каждого студента
INSERT INTO missions (user_id, mission_type, title, description, target_value, current_value, xp_reward, is_completed, expires_at)
SELECT 
  p.id,
  mission_type,
  title,
  description,
  target_value,
  (random() * target_value)::INTEGER as current_value,
  xp_reward,
  random() < 0.3 as is_completed,
  CURRENT_DATE + INTERVAL '7 days'
FROM profiles p
CROSS JOIN (
  VALUES 
    ('complete_lessons', 'Пройди 5 уроков', 'Завершите 5 уроков на этой неделе', 5, 100),
    ('watch_videos', 'Посмотри 3 видео полностью', 'Досмотрите 3 видео до конца', 3, 50),
    ('earn_xp', 'Заработай 200 XP', 'Получите 200 очков опыта', 200, 80),
    ('streak_days', 'Поддержи streak 7 дней', 'Занимайся 7 дней подряд', 7, 150)
) AS m(mission_type, title, description, target_value, xp_reward)
WHERE p.role = 'student'
ON CONFLICT DO NOTHING;

-- Создаем недельные цели
INSERT INTO weekly_goals (user_id, goal_type, target_value, current_value, week_start_date, week_end_date, is_completed)
SELECT 
  p.id,
  goal_type,
  target_value,
  (random() * target_value)::INTEGER as current_value,
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER, -- Начало недели
  CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 6, -- Конец недели
  random() < 0.2 as is_completed
FROM profiles p
CROSS JOIN (
  VALUES 
    ('lessons_completed', 10),
    ('study_time_minutes', 300)
) AS g(goal_type, target_value)
WHERE p.role = 'student'
ON CONFLICT DO NOTHING;

-- Создаем ежедневные челленджи
INSERT INTO daily_challenges (user_id, challenge_type, title, description, icon, xp_reward, challenge_date, is_accepted, is_completed)
SELECT 
  p.id,
  'daily_lesson',
  '🎯 Челлендж дня',
  'Завершите 1 урок сегодня и получите бонус!',
  '🔥',
  50,
  CURRENT_DATE,
  random() < 0.6 as is_accepted,
  random() < 0.3 as is_completed
FROM profiles p
WHERE p.role = 'student'
ON CONFLICT (user_id, challenge_date) DO NOTHING;

-- ========================================
-- РАЗДЕЛ 5: ВОПРОСЫ СТУДЕНТОВ
-- ========================================

-- Создаем вопросы студентов к AI-куратору
INSERT INTO student_questions_log (user_id, question_text, question_category, asked_at_lesson_id, ai_response, ai_model_used, response_time_ms, created_at)
SELECT 
  p.id,
  q.question_text,
  q.category,
  (SELECT id FROM lessons ORDER BY random() LIMIT 1),
  q.ai_response,
  'gpt-4o',
  (500 + random() * 2000)::INTEGER,
  NOW() - (random() * INTERVAL '7 days')
FROM profiles p
CROSS JOIN (
  VALUES 
    ('Как получить API ключ OpenAI?', 'technical_help', 'Перейдите на platform.openai.com, зарегистрируйтесь и создайте ключ в разделе API Keys.'),
    ('Не понимаю как работают вебхуки', 'course_faq', 'Вебхук - это URL, который принимает данные от внешних систем. В n8n вебхук создается через ноду Webhook.'),
    ('Почему мой бот не отвечает?', 'technical_help', 'Проверьте: 1) Правильность токена, 2) Запущен ли workflow, 3) Доступен ли вебхук извне'),
    ('Как мотивировать себя учиться?', 'motivation', 'Ставьте маленькие цели, занимайтесь регулярно по 15-30 минут, применяйте знания на практике!')
) AS q(question_text, category, ai_response)
WHERE p.role = 'student'
  AND random() < 0.5 -- 50% студентов задали вопросы
ON CONFLICT DO NOTHING;

-- ========================================
-- РАЗДЕЛ 6: ЗАДАЧИ ДЛЯ AI-НАСТАВНИКА
-- ========================================

-- Создаем задачи для AI-наставника (симулируем проблемы студентов)
INSERT INTO ai_mentor_tasks (triggered_by, student_id, task_type, description, priority, context_data, status)
SELECT 
  'video_struggle',
  vws.user_id,
  'offer_help',
  'Студент ' || p.full_name || ' пересмотрел урок "' || l.title || '" ' || vws.seeks_count || ' раз. Возможно, нужна помощь.',
  CASE 
    WHEN vws.seeks_count >= 10 THEN 'high'
    WHEN vws.seeks_count >= 5 THEN 'medium'
    ELSE 'low'
  END,
  jsonb_build_object(
    'lesson_id', l.id,
    'lesson_title', l.title,
    'seeks_count', vws.seeks_count,
    'max_second_reached', vws.max_second_reached
  ),
  CASE 
    WHEN random() < 0.3 THEN 'completed'
    WHEN random() < 0.6 THEN 'in_progress'
    ELSE 'pending'
  END
FROM video_watch_sessions vws
JOIN lessons l ON l.id = vws.lesson_id
JOIN profiles p ON p.id = vws.user_id
WHERE vws.seeks_count >= 5 -- Только проблемные сессии
ON CONFLICT DO NOTHING;

-- ========================================
-- РАЗДЕЛ 7: БАЗА ЗНАНИЙ КУРАТОРА
-- ========================================

-- Добавляем базу знаний (если еще не добавлена)
INSERT INTO curator_knowledge_base (category, question, answer, keywords, priority, is_active)
VALUES
(
  'course_faq',
  'Как настроить вебхук в n8n?',
  E'## Настройка вебхука в n8n\n\n1. Откройте n8n и создайте новый workflow\n2. Добавьте ноду "Webhook"\n3. Настройте метод (GET/POST)\n4. Скопируйте URL вебхука\n5. Вставьте URL в вашу систему',
  ARRAY['вебхук', 'webhook', 'n8n', 'настройка'],
  100,
  true
),
(
  'technical_help',
  'Почему бот не отвечает в Telegram?',
  E'## Решение проблем с Telegram ботом\n\n**Проверьте:**\n1. Правильно ли указан токен?\n2. Настроен ли вебхук?\n3. Запущен ли workflow в n8n?\n4. Есть ли права у бота?',
  ARRAY['telegram', 'бот', 'не работает', 'ошибка'],
  95,
  true
),
(
  'motivation',
  'Как не забросить обучение?',
  E'## Секреты продуктивного обучения\n\n1. Учись понемногу, но регулярно (15-30 мин в день)\n2. Ставь маленькие цели\n3. Применяй знания сразу\n4. Отмечай прогресс',
  ARRAY['мотивация', 'обучение', 'регулярность'],
  80,
  true
)
ON CONFLICT DO NOTHING;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

SELECT 
  '=== ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ ===' as result,
  (SELECT COUNT(*) FROM profiles WHERE role = 'student') as students_count,
  (SELECT COUNT(*) FROM courses) as courses_count,
  (SELECT COUNT(*) FROM lessons) as lessons_count,
  (SELECT COUNT(*) FROM user_progress) as progress_records,
  (SELECT COUNT(*) FROM video_watch_sessions) as video_sessions,
  (SELECT COUNT(*) FROM missions) as missions_count,
  (SELECT COUNT(*) FROM student_questions_log) as questions_count,
  (SELECT COUNT(*) FROM ai_mentor_tasks) as mentor_tasks_count,
  (SELECT COUNT(*) FROM curator_knowledge_base WHERE is_active = true) as knowledge_base_entries;

