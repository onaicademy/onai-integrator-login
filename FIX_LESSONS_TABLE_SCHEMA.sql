-- ========================================
-- КРИТИЧНО: Добавление отсутствующих колонок в lessons
-- ========================================

-- 1. Добавляем колонку description (если не существует)
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Добавляем колонку tip (если не существует)
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS tip TEXT;

-- 3. Комментарии для ясности
COMMENT ON COLUMN lessons.description IS 'Описание урока';
COMMENT ON COLUMN lessons.tip IS 'Полезный совет или рекомендация для студента по данному уроку';

-- 4. Перезагрузка схемы PostgREST (ОБЯЗАТЕЛЬНО!)
NOTIFY pgrst, 'reload schema';

-- 5. Проверка структуры таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lessons' 
ORDER BY ordinal_position;

-- ========================================
-- ✅ ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ:
-- ========================================
-- 1. Открой Supabase Dashboard
-- 2. SQL Editor → New Query
-- 3. Скопируй и вставь ВЕСЬ этот SQL
-- 4. Нажми "Run" или Ctrl+Enter
-- 5. Проверь результат внизу - должна быть таблица со всеми колонками
-- 6. Убедись что есть колонки: description, tip
-- ========================================

