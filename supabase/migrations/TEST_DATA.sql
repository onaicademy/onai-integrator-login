-- ========================================
-- ТЕСТОВЫЕ ДАННЫЕ: Пример курса для проверки
-- ========================================

-- 1. Создаём тестовый курс (используем правильные имена колонок)
INSERT INTO public.courses (
    name,
    slug,
    description,
    level,
    is_published,
    price,
    order_index,
    is_active
) VALUES (
    'Основы Python для начинающих',
    'python-basics',
    'Полный курс Python с нуля до профессионала. Изучите основы программирования, работу с данными и создание веб-приложений.',
    'beginner',
    true,
    9999.00,
    1,
    true
) RETURNING id;

-- 2. Создаём модуль 1: Введение
INSERT INTO public.modules (
    id,
    course_id,
    title,
    description,
    order_index,
    is_locked
) VALUES (
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Модуль 1: Введение в Python',
    'Знакомство с языком программирования Python, установка и настройка окружения',
    0,
    false
) ON CONFLICT (id) DO NOTHING;

-- 3. Создаём модуль 2: Основы
INSERT INTO public.modules (
    id,
    course_id,
    title,
    description,
    order_index,
    is_locked,
    unlock_after_module_id
) VALUES (
    '00000000-0000-0000-0001-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Модуль 2: Основы синтаксиса',
    'Переменные, типы данных, операторы и условия',
    1,
    true,
    '00000000-0000-0000-0001-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- 4. Создаём урок 1: Приветственное видео (preview)
INSERT INTO public.lessons (
    id,
    module_id,
    title,
    description,
    content,
    lesson_type,
    duration_minutes,
    order_index,
    is_preview
) VALUES (
    '00000000-0000-0000-0002-000000000001',
    '00000000-0000-0000-0001-000000000001',
    'Приветствие и обзор курса',
    'Знакомство с преподавателем и структурой курса',
    '# Добро пожаловать!\n\nВ этом курсе вы научитесь программировать на Python с нуля.',
    'video',
    5,
    0,
    true
) ON CONFLICT (id) DO NOTHING;

-- 5. Создаём урок 2: Установка Python
INSERT INTO public.lessons (
    id,
    module_id,
    title,
    description,
    content,
    lesson_type,
    duration_minutes,
    order_index,
    is_preview
) VALUES (
    '00000000-0000-0000-0002-000000000002',
    '00000000-0000-0000-0001-000000000001',
    'Установка Python и настройка окружения',
    'Пошаговая инструкция по установке Python на Windows, Mac и Linux',
    '# Установка Python\n\n## Windows\n1. Скачайте установщик...\n\n## Mac\n...',
    'video',
    15,
    1,
    false
) ON CONFLICT (id) DO NOTHING;

-- 6. Создаём урок 3: Первая программа
INSERT INTO public.lessons (
    id,
    module_id,
    title,
    description,
    content,
    lesson_type,
    duration_minutes,
    order_index,
    is_preview
) VALUES (
    '00000000-0000-0000-0002-000000000003',
    '00000000-0000-0000-0001-000000000001',
    'Первая программа Hello World',
    'Пишем и запускаем первую программу на Python',
    '# Hello World!\n\n```python\nprint("Hello, World!")\n```',
    'text',
    10,
    2,
    false
) ON CONFLICT (id) DO NOTHING;

-- 7. Создаём урок 4: Тест
INSERT INTO public.lessons (
    id,
    module_id,
    title,
    description,
    lesson_type,
    duration_minutes,
    order_index,
    is_preview
) VALUES (
    '00000000-0000-0000-0002-000000000004',
    '00000000-0000-0000-0001-000000000001',
    'Проверочный тест: Модуль 1',
    'Проверьте свои знания по первому модулю',
    'quiz',
    20,
    3,
    false
) ON CONFLICT (id) DO NOTHING;

-- 8. Создаём видео-контент для урока 1 (пример)
INSERT INTO public.video_content (
    id,
    lesson_id,
    r2_object_key,
    r2_bucket_name,
    filename,
    file_size_bytes,
    duration_seconds,
    resolution,
    format,
    upload_status,
    transcoding_status
) VALUES (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0002-000000000001',
    'videos/1732579200000_welcome-video.mp4',
    'onai-academy-videos',
    'welcome-video.mp4',
    52428800, -- 50 MB
    300, -- 5 минут
    '1080p',
    'mp4',
    'completed',
    'completed'
) ON CONFLICT (id) DO NOTHING;

-- 9. Создаём раздаточный материал для урока 2
INSERT INTO public.lesson_materials (
    id,
    lesson_id,
    storage_path,
    bucket_name,
    filename,
    file_type,
    file_size_bytes,
    display_name,
    is_downloadable,
    requires_completion
) VALUES (
    '00000000-0000-0000-0004-000000000001',
    '00000000-0000-0000-0002-000000000002',
    'materials/python-installation-guide.pdf',
    'lesson-materials',
    'python-installation-guide.pdf',
    'PDF',
    2097152, -- 2 MB
    'Гайд по установке Python',
    true,
    false
) ON CONFLICT (id) DO NOTHING;

-- ========================================
-- ПРОВЕРКА: Выводим созданную структуру
-- ========================================

SELECT 
    '✅ КУРС СОЗДАН' as status,
    c.title as course_title,
    COUNT(DISTINCT m.id) as modules_count,
    COUNT(DISTINCT l.id) as lessons_count
FROM public.courses c
LEFT JOIN public.modules m ON m.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = m.id
WHERE c.id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id, c.title;

-- Детали по модулям и урокам
SELECT 
    '📚 СТРУКТУРА КУРСА' as info,
    m.title as module_title,
    m.order_index as module_order,
    l.title as lesson_title,
    l.lesson_type,
    l.duration_minutes,
    l.is_preview
FROM public.modules m
LEFT JOIN public.lessons l ON l.module_id = m.id
WHERE m.course_id = '00000000-0000-0000-0000-000000000001'
ORDER BY m.order_index, l.order_index;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

