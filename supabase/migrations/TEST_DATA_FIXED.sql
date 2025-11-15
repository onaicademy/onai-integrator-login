-- ========================================
-- ТЕСТОВЫЕ ДАННЫЕ: Пример курса (исправлено под реальную структуру БД)
-- ========================================

-- Сохраняем ID курса в переменную
DO $$ 
DECLARE
    v_course_id INTEGER;
    v_module1_id UUID;
    v_module2_id UUID;
    v_lesson1_id UUID;
    v_lesson2_id UUID;
    v_lesson3_id UUID;
    v_lesson4_id UUID;
BEGIN
    -- 1. Создаём тестовый курс (ID явно задаём)
    INSERT INTO public.courses (
        id,
        name,
        slug,
        description,
        level,
        is_published,
        is_active,
        price,
        order_index
    ) VALUES (
        1, -- Явный ID
        'Основы Python для начинающих',
        'python-basics',
        'Полный курс Python с нуля до профессионала. Изучите основы программирования, работу с данными и создание веб-приложений.',
        'beginner',
        true,
        true,
        9999.00,
        1
    ) 
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_course_id;

    RAISE NOTICE '✅ Создан курс с ID: %', v_course_id;

    -- 2. Создаём модуль 1: Введение
    INSERT INTO public.modules (
        course_id,
        title,
        description,
        order_index,
        is_locked
    ) VALUES (
        v_course_id,
        'Модуль 1: Введение в Python',
        'Знакомство с языком программирования Python, установка и настройка окружения',
        0,
        false
    ) RETURNING id INTO v_module1_id;

    RAISE NOTICE '✅ Создан модуль 1 с ID: %', v_module1_id;

    -- 3. Создаём модуль 2: Основы
    INSERT INTO public.modules (
        course_id,
        title,
        description,
        order_index,
        is_locked,
        unlock_after_module_id
    ) VALUES (
        v_course_id,
        'Модуль 2: Основы синтаксиса',
        'Переменные, типы данных, операторы и условия',
        1,
        true,
        v_module1_id
    ) RETURNING id INTO v_module2_id;

    RAISE NOTICE '✅ Создан модуль 2 с ID: %', v_module2_id;

    -- 4. Создаём урок 1: Приветственное видео (preview)
    INSERT INTO public.lessons (
        module_id,
        title,
        description,
        content,
        lesson_type,
        duration_minutes,
        order_index,
        is_preview
    ) VALUES (
        v_module1_id,
        'Приветствие и обзор курса',
        'Знакомство с преподавателем и структурой курса',
        '# Добро пожаловать!

В этом курсе вы научитесь программировать на Python с нуля.

## Что вы узнаете:
- Основы синтаксиса Python
- Работа с данными
- Создание веб-приложений',
        'video',
        5,
        0,
        true
    ) RETURNING id INTO v_lesson1_id;

    RAISE NOTICE '✅ Создан урок 1 (preview) с ID: %', v_lesson1_id;

    -- 5. Создаём урок 2: Установка Python
    INSERT INTO public.lessons (
        module_id,
        title,
        description,
        content,
        lesson_type,
        duration_minutes,
        order_index,
        is_preview
    ) VALUES (
        v_module1_id,
        'Установка Python и настройка окружения',
        'Пошаговая инструкция по установке Python на Windows, Mac и Linux',
        '# Установка Python

## Windows
1. Скачайте установщик с python.org
2. Запустите установщик
3. Отметьте "Add Python to PATH"

## Mac
```bash
brew install python3
```

## Linux
```bash
sudo apt install python3
```',
        'video',
        15,
        1,
        false
    ) RETURNING id INTO v_lesson2_id;

    RAISE NOTICE '✅ Создан урок 2 с ID: %', v_lesson2_id;

    -- 6. Создаём урок 3: Первая программа
    INSERT INTO public.lessons (
        module_id,
        title,
        description,
        content,
        lesson_type,
        duration_minutes,
        order_index,
        is_preview
    ) VALUES (
        v_module1_id,
        'Первая программа Hello World',
        'Пишем и запускаем первую программу на Python',
        '# Hello World!

Создайте файл `hello.py`:

```python
print("Hello, World!")
```

Запустите:
```bash
python hello.py
```',
        'text',
        10,
        2,
        false
    ) RETURNING id INTO v_lesson3_id;

    RAISE NOTICE '✅ Создан урок 3 (текстовый) с ID: %', v_lesson3_id;

    -- 7. Создаём урок 4: Тест
    INSERT INTO public.lessons (
        module_id,
        title,
        description,
        lesson_type,
        duration_minutes,
        order_index,
        is_preview
    ) VALUES (
        v_module1_id,
        'Проверочный тест: Модуль 1',
        'Проверьте свои знания по первому модулю',
        'quiz',
        20,
        3,
        false
    ) RETURNING id INTO v_lesson4_id;

    RAISE NOTICE '✅ Создан урок 4 (тест) с ID: %', v_lesson4_id;

    -- 8. Создаём видео-контент для урока 1 (пример)
    INSERT INTO public.video_content (
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
        v_lesson1_id,
        'videos/' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_welcome-video.mp4',
        'onai-academy-videos',
        'welcome-video.mp4',
        52428800, -- 50 MB
        300, -- 5 минут
        '1080p',
        'mp4',
        'completed',
        'completed'
    );

    RAISE NOTICE '✅ Добавлено видео для урока 1';

    -- 9. Создаём раздаточный материал для урока 2
    INSERT INTO public.lesson_materials (
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
        v_lesson2_id,
        'materials/python-installation-guide.pdf',
        'lesson-materials',
        'python-installation-guide.pdf',
        'PDF',
        2097152, -- 2 MB
        'Гайд по установке Python',
        true,
        false
    );

    RAISE NOTICE '✅ Добавлен раздаточный материал для урока 2';

END $$;

-- ========================================
-- ПРОВЕРКА: Выводим созданную структуру
-- ========================================

SELECT 
    '✅ КУРС СОЗДАН' as status,
    c.name as course_name,
    c.slug,
    COUNT(DISTINCT m.id) as modules_count,
    COUNT(DISTINCT l.id) as lessons_count
FROM public.courses c
LEFT JOIN public.modules m ON m.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = m.id
WHERE c.slug = 'python-basics'
GROUP BY c.id, c.name, c.slug;

-- Детали по модулям и урокам
SELECT 
    '📚 СТРУКТУРА КУРСА' as info,
    m.title as module_title,
    m.order_index as module_order,
    m.is_locked,
    l.title as lesson_title,
    l.lesson_type,
    l.duration_minutes,
    l.is_preview
FROM public.courses c
JOIN public.modules m ON m.course_id = c.id
LEFT JOIN public.lessons l ON l.module_id = m.id
WHERE c.slug = 'python-basics'
ORDER BY m.order_index, l.order_index;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

