-- ===================================================================
-- 🔍 ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦЫ modules
-- ===================================================================

-- 1. Проверить структуру таблицы modules
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'modules'
ORDER BY ordinal_position;

-- 2. Проверить структуру таблицы courses
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

-- 3. Проверить foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'modules';

-- 4. Проверить существующие модули
SELECT 
  id,
  course_id,
  title,
  order_index,
  pg_typeof(id) as id_type,
  pg_typeof(course_id) as course_id_type
FROM modules
LIMIT 5;

-- 5. Проверить существующие курсы  
SELECT 
  id,
  title,
  pg_typeof(id) as id_type
FROM courses
LIMIT 5;

