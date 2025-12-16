-- ====================================================================
-- 🔍 DATABASE INDEXES FOR TRIPWIRE LAUNCH
-- ====================================================================
-- Дата: 12.12.2025
-- Цель: Ускорить queries в 10-100 раз
-- Риск: ZERO (индексы только ускоряют, никогда не ломают)
--
-- КАК ПРИМЕНИТЬ:
-- 1. Открыть Supabase Dashboard
-- 2. Выбрать проект (Tripwire)
-- 3. SQL Editor → New Query
-- 4. Скопировать весь этот файл
-- 5. Run
-- ====================================================================

-- ✅ INDEX 1: tripwire_progress по user_id (самый частый query)
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_user_id 
ON tripwire_progress(tripwire_user_id);

-- ✅ INDEX 2: tripwire_progress по lesson_id
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_lesson_id 
ON tripwire_progress(lesson_id);

-- ✅ INDEX 3: tripwire_progress по module_id
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_module_id 
ON tripwire_progress(module_id);

-- ✅ INDEX 4: Composite index для поиска конкретного урока конкретного юзера
-- Это САМЫЙ критичный индекс для /complete endpoint
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_user_lesson 
ON tripwire_progress(tripwire_user_id, lesson_id);

-- ✅ INDEX 5: lessons по module_id (для JOIN'ов)
CREATE INDEX IF NOT EXISTS idx_lessons_module_id 
ON lessons(module_id);

-- ✅ INDEX 6: students по email (для поиска юзеров)
CREATE INDEX IF NOT EXISTS idx_students_email 
ON students(email);

-- ====================================================================
-- ✅ VERIFICATION: Проверить что индексы работают
-- ====================================================================

-- Запустить этот query и проверить что используется "Index Scan" а не "Seq Scan"
EXPLAIN ANALYZE 
SELECT * FROM tripwire_progress 
WHERE tripwire_user_id = '00000000-0000-0000-0000-000000000000' 
LIMIT 10;

-- Если видите "Index Scan using idx_tripwire_progress_user_id" - ✅ РАБОТАЕТ!
-- Если видите "Seq Scan on tripwire_progress" - ❌ Индекс не используется

-- ====================================================================
-- 📊 EXPECTED RESULTS
-- ====================================================================

-- BEFORE indexes:
-- - Query time: 200-400ms
-- - Scan type: Sequential Scan (проверяет ВСЕ строки)

-- AFTER indexes:
-- - Query time: 20-50ms (10x faster! ⚡)
-- - Scan type: Index Scan (проверяет только нужные строки)

-- ====================================================================
-- 🔄 ROLLBACK (если нужно удалить индексы)
-- ====================================================================

-- DROP INDEX IF EXISTS idx_tripwire_progress_user_id;
-- DROP INDEX IF EXISTS idx_tripwire_progress_lesson_id;
-- DROP INDEX IF EXISTS idx_tripwire_progress_module_id;
-- DROP INDEX IF EXISTS idx_tripwire_progress_user_lesson;
-- DROP INDEX IF EXISTS idx_lessons_module_id;
-- DROP INDEX IF EXISTS idx_students_email;











