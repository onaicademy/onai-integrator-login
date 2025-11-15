-- ====================================
-- ДОБАВЛЕНИЕ МОДУЛЕЙ К КУРСУ "ИНТЕГРАТОР 2.0"
-- ====================================
-- Курс: Интегратор 2.0 (id = 1)
-- Модули: 10 модулей курса
-- ====================================

DO $$
DECLARE
    v_course_id INTEGER := 1; -- ID курса "Интегратор 2.0"
    v_next_module_id INTEGER;
BEGIN
    -- Проверяем существование курса
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = v_course_id) THEN
        RAISE NOTICE '❌ Курс с id=1 "Интегратор 2.0" не найден!';
        RAISE EXCEPTION 'Course not found';
    END IF;

    RAISE NOTICE '✅ Курс найден, добавляем модули...';

    -- Вычисляем следующий ID для модуля (AUTO-INCREMENT)
    SELECT COALESCE(MAX(id), 0) + 1 INTO v_next_module_id FROM public.modules;
    RAISE NOTICE '📍 Следующий ID модуля: %', v_next_module_id;

    -- ====================================
    -- МОДУЛЬ 1: Введение в профессию
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Введение в профессию',
        'Основы профессии интегратора, первые шаги и знакомство с инструментами',
        1
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 2: Создание GPT бота и CRM
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Создание GPT бота и CRM',
        'Разработка чат-бота на основе GPT и интеграция с CRM системами',
        2
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 3: Интеграция amoCRM и Bitrix24
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Интеграция amoCRM и Bitrix24',
        'Подключение и настройка интеграций с популярными CRM системами',
        3
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 4: Автоматизация при помощи Make
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Автоматизация при помощи Make',
        'Создание автоматизаций и интеграций с помощью платформы Make (Integromat)',
        4
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 5: N8N автоматизация и работа с API
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'N8N автоматизация и работа с API',
        'Продвинутая автоматизация с N8N и работа с REST API',
        5
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 6: Реализация и запуск проекта
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Реализация и запуск проекта',
        'Полный цикл реализации проекта от идеи до запуска',
        6
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 7: Упаковка и продвижение
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Упаковка и продвижение',
        'Маркетинг, упаковка услуг и продвижение интеграторских решений',
        7
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 8: Проверка на высокий чек
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Проверка на высокий чек',
        'Стратегии ценообразования и работа с премиум клиентами',
        8
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 9: Бонусы
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Бонусы',
        'Дополнительные материалы, инструменты и бонусные уроки',
        9
    )
    ON CONFLICT DO NOTHING;
    v_next_module_id := v_next_module_id + 1;

    -- ====================================
    -- МОДУЛЬ 10: Воршопы
    -- ====================================
    INSERT INTO public.modules (id, course_id, title, description, order_index)
    VALUES (
        v_next_module_id,
        v_course_id,
        'Воршопы',
        'Практические воркшопы и живые разборы проектов',
        10
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ Все 10 модулей успешно добавлены!';

END $$;

-- ====================================
-- ПРОВЕРКА: Показать добавленные модули
-- ====================================
SELECT 
    m.id,
    m.course_id,
    c.name as course_name,
    m.title as module_title,
    m.description,
    m.order_index,
    m.created_at
FROM public.modules m
JOIN public.courses c ON c.id = m.course_id
WHERE m.course_id = 1
ORDER BY m.order_index;
