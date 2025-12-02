-- ========================================
-- ПРОВЕРКА: Какие колонки есть в student_progress?
-- ========================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'student_progress'
ORDER BY ordinal_position;

