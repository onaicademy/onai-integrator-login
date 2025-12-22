-- ============================================
-- ПРОВЕРКА СТРУКТУРЫ БАЗЫ ДАННЫХ
-- ============================================

-- Шаг 1: Проверить структуру таблицы lessons
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'lessons'
ORDER BY ordinal_position;

-- Ожидаемый результат (должны быть эти колонки):
-- column_name       | data_type | is_nullable
-- ------------------|-----------|------------
-- id                | integer   | NO
-- module_id         | integer   | NO
-- title             | text      | YES
-- video_url         | text      | YES   <-- КРИТИЧНО!
-- duration          | integer   | YES
-- order_index       | integer   | YES
-- created_at        | timestamp | YES

-- ============================================

-- Шаг 2: Проверить есть ли таблица video_content
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'video_content'
) as video_content_exists;

-- Если TRUE - значит есть отдельная таблица video_content
-- Если FALSE - значит видео хранятся в lessons.video_url

-- ============================================

-- Шаг 3: Если video_content существует, посмотреть её структуру
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'video_content'
ORDER BY ordinal_position;

-- ============================================

-- Шаг 4: Посмотреть несколько уроков с видео
SELECT 
  id,
  title,
  video_url,
  CASE 
    WHEN video_url IS NULL THEN '❌ No video'
    WHEN video_url = '' THEN '❌ Empty'
    ELSE '✅ Has video'
  END as video_status
FROM lessons
WHERE module_id = 1
LIMIT 5;

-- ============================================

-- Шаг 5: Если video_url НЕТ в lessons - добавить колонку
-- РАСКОММЕНТИРУЙТЕ если нужно:

/*
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT;
*/

-- ============================================

-- Шаг 6: Если используется отдельная таблица video_content - проверить связь
/*
SELECT 
  l.id as lesson_id,
  l.title,
  vc.id as video_id,
  vc.video_url
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 1
LIMIT 5;
*/

