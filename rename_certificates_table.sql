-- Переименование таблицы tripwire_certificates -> certificates
ALTER TABLE IF EXISTS tripwire_certificates RENAME TO certificates;

-- Переименование индексов
ALTER INDEX IF EXISTS idx_tripwire_certificates_user RENAME TO idx_certificates_user;

-- Обновление комментария
COMMENT ON TABLE certificates IS 'PDF certificates issued to Tripwire students after completing all 3 modules';

-- Проверка что таблица переименована
SELECT 'Таблица успешно переименована в certificates' as status;
