-- ================================================================
-- СОЗДАНИЕ TRIPWIRE МОДУЛЕЙ И ПУСТЫХ УРОКОВ
-- Модули 16, 17, 18 с по 3 пустых урока в каждом
-- ================================================================

-- Сначала создаем модули (если их нет)
INSERT INTO public.modules (id, course_id, title, description, order_index, is_archived, created_at, updated_at)
VALUES 
  (16, 1, 'Модуль 1', 'Первый модуль Tripwire', 1, FALSE, NOW(), NOW()),
  (17, 1, 'Модуль 2', 'Второй модуль Tripwire', 2, FALSE, NOW(), NOW()),
  (18, 1, 'Модуль 3', 'Третий модуль Tripwire', 3, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Обновляем sequence для modules, чтобы избежать конфликтов
SELECT setval('modules_id_seq', (SELECT MAX(id) FROM modules), true);

-- Теперь создаем по 3 пустых урока в каждом модуле
-- МОДУЛЬ 16 (Первый модуль)
INSERT INTO public.lessons (
  module_id, 
  title, 
  description, 
  order_index, 
  lesson_type, 
  is_archived, 
  xp_reward,
  ai_description,
  ai_tips,
  tip,
  created_at, 
  updated_at
)
VALUES 
  (16, 'Урок 1.1 - Модуль 1', '', 1, 'video', FALSE, 10, '', '', '', NOW(), NOW()),
  (16, 'Урок 1.2 - Модуль 1', '', 2, 'video', FALSE, 10, '', '', '', NOW(), NOW()),
  (16, 'Урок 1.3 - Модуль 1', '', 3, 'video', FALSE, 10, '', '', '', NOW(), NOW());

-- МОДУЛЬ 17 (Второй модуль)
INSERT INTO public.lessons (
  module_id, 
  title, 
  description, 
  order_index, 
  lesson_type, 
  is_archived, 
  xp_reward,
  ai_description,
  ai_tips,
  tip,
  created_at, 
  updated_at
)
VALUES 
  (17, 'Урок 2.1 - Модуль 2', '', 1, 'video', FALSE, 10, '', '', '', NOW(), NOW()),
  (17, 'Урок 2.2 - Модуль 2', '', 2, 'video', FALSE, 10, '', '', '', NOW(), NOW()),
  (17, 'Урок 2.3 - Модуль 2', '', 3, 'video', FALSE, 10, '', '', '', NOW(), NOW());

-- МОДУЛЬ 18 (Третий модуль)
INSERT INTO public.lessons (
  module_id, 
  title, 
  description, 
  order_index, 
  lesson_type, 
  is_archived, 
  xp_reward,
  ai_description,
  ai_tips,
  tip,
  created_at, 
  updated_at
)
VALUES 
  (18, 'Урок 3.1 - Модуль 3', '', 1, 'video', FALSE, 10, '', '', '', NOW(), NOW()),
  (18, 'Урок 3.2 - Модуль 3', '', 2, 'video', FALSE, 10, '', '', '', NOW(), NOW()),
  (18, 'Урок 3.3 - Модуль 3', '', 3, 'video', FALSE, 10, '', '', '', NOW(), NOW());

-- Проверка: покажем созданные уроки
SELECT 
  l.id,
  l.module_id,
  m.title as module_title,
  l.title as lesson_title,
  l.order_index,
  l.created_at
FROM public.lessons l
INNER JOIN public.modules m ON l.module_id = m.id
WHERE l.module_id IN (16, 17, 18)
ORDER BY l.module_id, l.order_index;
