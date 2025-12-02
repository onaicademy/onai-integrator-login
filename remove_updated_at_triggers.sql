-- ===============================================
-- 🔥 УДАЛЕНИЕ TRIGGERS ДЛЯ updated_at
-- ===============================================
-- Выполни в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql

-- ===============================================
-- ШАГ 1: ПРОВЕРКА СУЩЕСТВУЮЩИХ TRIGGERS
-- ===============================================

-- Показать ВСЕ triggers для таблицы lessons
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lessons';

-- Ожидается: Один или несколько triggers с updated_at

-- ===============================================
-- ШАГ 2: УДАЛЕНИЕ ВСЕХ TRIGGERS
-- ===============================================

-- Удалить все возможные варианты названий triggers
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS set_updated_at ON lessons;
DROP TRIGGER IF EXISTS handle_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_updated_at_column ON lessons;
DROP TRIGGER IF EXISTS update_timestamp ON lessons;
DROP TRIGGER IF EXISTS set_timestamp ON lessons;
DROP TRIGGER IF EXISTS before_update_lessons ON lessons;
DROP TRIGGER IF EXISTS after_update_lessons ON lessons;

-- ===============================================
-- ШАГ 3: УДАЛЕНИЕ ФУНКЦИЙ (если есть)
-- ===============================================

-- Удалить все возможные функции связанные с updated_at
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS set_timestamp() CASCADE;

-- ===============================================
-- ШАГ 4: ПРОВЕРКА ЧТО TRIGGERS УДАЛЕНЫ
-- ===============================================

-- Должен вернуть ПУСТО (0 строк)
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'lessons';

-- Если вернулись строки - выполни:
-- DROP TRIGGER IF EXISTS <trigger_name> ON lessons;

-- ===============================================
-- ШАГ 5: ПРОВЕРКА ЧТО ФУНКЦИИ УДАЛЕНЫ
-- ===============================================

-- Показать функции связанные с updated_at
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%updated_at%'
   OR routine_name LIKE '%timestamp%';

-- Если вернулись строки - выполни:
-- DROP FUNCTION IF EXISTS <function_name>() CASCADE;

-- ===============================================
-- ШАГ 6: ПРОВЕРКА КОЛОНКИ updated_at
-- ===============================================

-- Проверить есть ли колонка updated_at в таблице lessons
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'lessons' 
  AND column_name = 'updated_at';

-- Если колонка ЕСТЬ (вернулась строка) - можно удалить:
-- ALTER TABLE lessons DROP COLUMN IF EXISTS updated_at;

-- ⚠️ ВНИМАНИЕ: Удаляй колонку ТОЛЬКО если она не используется!

-- ===============================================
-- ШАГ 7: ФИНАЛЬНАЯ ПРОВЕРКА
-- ===============================================

-- 1. Triggers должны быть пусты
SELECT COUNT(*) as triggers_count
FROM information_schema.triggers
WHERE event_object_table = 'lessons';
-- Ожидается: 0

-- 2. Колонка updated_at не должна существовать (опционально)
SELECT COUNT(*) as column_exists
FROM information_schema.columns
WHERE table_name = 'lessons' 
  AND column_name = 'updated_at';
-- Ожидается: 0 (если удалили колонку)

-- ===============================================
-- ✅ ГОТОВО!
-- ===============================================
-- После выполнения этого SQL:
-- 1. Перезапусти backend: npm run dev
-- 2. Протестируй загрузку видео
-- 3. Ошибка "updated_at" должна исчезнуть!
-- ===============================================

-- ===============================================
-- 🔍 ДОПОЛНИТЕЛЬНАЯ ДИАГНОСТИКА
-- ===============================================

-- Если ошибка ВСЕГДА возвращается, проверь RLS policies:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lessons';

-- Проверь есть ли mention updated_at в policies
-- Если есть - нужно обновить policy без updated_at

-- ===============================================
-- 📋 АЛЬТЕРНАТИВНЫЙ ПОДХОД (если ничего не помогает)
-- ===============================================

-- Создать НОВУЮ колонку updated_at с автоматическим значением:
-- ALTER TABLE lessons 
-- ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Создать trigger для автоматического обновления:
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--    NEW.updated_at = NOW();
--    RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER update_lessons_updated_at 
-- BEFORE UPDATE ON lessons 
-- FOR EACH ROW 
-- EXECUTE FUNCTION update_updated_at_column();

-- ⚠️ НО ЛУЧШЕ ПРОСТО УДАЛИТЬ updated_at полностью!
-- ===============================================

