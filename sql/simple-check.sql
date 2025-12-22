-- Простая проверка подключения и данных
SELECT NOW() as current_time;

-- Проверка таблицы ai_token_usage существует ли
SELECT COUNT(*) as total_records FROM ai_token_usage;

-- Последние 5 записей
SELECT * FROM ai_token_usage ORDER BY created_at DESC LIMIT 5;

