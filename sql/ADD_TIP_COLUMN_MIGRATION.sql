-- ========================================
-- МИГРАЦИЯ: Добавление поля "tip" в lessons
-- ========================================
-- ВАЖНО: Выполни этот SQL в Supabase SQL Editor ПЕРЕД тестированием!

-- 1. Добавляем колонку tip (совет по уроку)
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS tip TEXT;

-- 2. Комментарий для ясности
COMMENT ON COLUMN lessons.tip IS 'Полезный совет или рекомендация для студента по данному уроку';

-- 3. Перезагрузка схемы PostgREST (обязательно!)
NOTIFY pgrst, 'reload schema';

-- 4. Проверка что колонка добавлена (опционально)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'lessons' AND column_name = 'tip';

-- ========================================
-- ✅ ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ:
-- ========================================
-- 1. Открой Supabase Dashboard: https://supabase.com/dashboard
-- 2. Выбери проект: arqhkacellqbhjhbebfh
-- 3. SQL Editor → New Query
-- 4. Скопируй и вставь ВЕСЬ этот SQL
-- 5. Нажми "Run" или Ctrl+Enter
-- 6. Проверь результат: должно быть "Success. No rows returned"
-- 7. Перезапусти Backend: npm run dev
-- 8. Перезапусти Frontend: npm run dev
-- ========================================

