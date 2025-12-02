-- ═══════════════════════════════════════════════════════════════
-- 🔍 ПРОВЕРКА И ДОБАВЛЕНИЕ order_index В ТАБЛИЦАХ
-- ═══════════════════════════════════════════════════════════════
-- Проверяет наличие order_index в lessons и modules
-- Добавляет поле если его нет
-- ═══════════════════════════════════════════════════════════════

-- Проверка и добавление order_index в таблицу lessons
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lessons' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.lessons ADD COLUMN order_index INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Добавлена колонка lessons.order_index';
  ELSE
    RAISE NOTICE '✅ Колонка lessons.order_index уже существует';
  END IF;
END $$;

-- Проверка и добавление order_index в таблицу modules
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'modules' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.modules ADD COLUMN order_index INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Добавлена колонка modules.order_index';
  ELSE
    RAISE NOTICE '✅ Колонка modules.order_index уже существует';
  END IF;
END $$;

-- Создание индексов для оптимизации сортировки
CREATE INDEX IF NOT EXISTS idx_lessons_order ON public.lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules(course_id, order_index);

-- Обновление существующих записей без order_index
UPDATE public.lessons 
SET order_index = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY module_id ORDER BY created_at) as row_number
  FROM public.lessons
) AS subquery
WHERE public.lessons.id = subquery.id AND (public.lessons.order_index IS NULL OR public.lessons.order_index = 0);

UPDATE public.modules 
SET order_index = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY created_at) as row_number
  FROM public.modules
) AS subquery
WHERE public.modules.id = subquery.id AND (public.modules.order_index IS NULL OR public.modules.order_index = 0);

-- Проверка результата
SELECT 
  'lessons' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN order_index IS NOT NULL THEN 1 END) as rows_with_order_index
FROM public.lessons
UNION ALL
SELECT 
  'modules' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN order_index IS NOT NULL THEN 1 END) as rows_with_order_index
FROM public.modules;


