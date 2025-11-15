-- =====================================================
-- SUPABASE AUTO-CLEANUP: Удаление файлов старше 7 дней
-- Дата: 14 ноября 2025
-- Использует: pg_cron (встроенный в Supabase)
-- =====================================================

-- =====================================================
-- ЧАСТЬ 1: SQL ФУНКЦИЯ для удаления старых файлов
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_files()
RETURNS TABLE(deleted_count INTEGER, error_message TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER -- Выполняется с правами владельца функции
AS $$
DECLARE
  file_record RECORD;
  deleted_files INTEGER := 0;
  current_error TEXT := NULL;
BEGIN
  -- Логируем начало очистки
  RAISE NOTICE 'Начинаем очистку файлов старше 7 дней...';

  -- Находим все файлы старше 7 дней
  FOR file_record IN 
    SELECT id, file_path, filename, user_id, created_at
    FROM public.file_uploads
    WHERE created_at < NOW() - INTERVAL '7 days'
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Логируем файл для удаления
      RAISE NOTICE 'Удаляем файл: % (путь: %, дата: %)', 
        file_record.filename, 
        file_record.file_path, 
        file_record.created_at;

      -- Удаляем файл из Supabase Storage
      -- ВАЖНО: Эта функция работает только если установлено расширение storage
      PERFORM storage.delete_object('user-files', file_record.file_path);

      -- Удаляем запись из БД
      DELETE FROM public.file_uploads WHERE id = file_record.id;

      deleted_files := deleted_files + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Логируем ошибку, но продолжаем обработку других файлов
      current_error := SQLERRM;
      RAISE WARNING 'Ошибка удаления файла % (ID: %): %', 
        file_record.filename, 
        file_record.id, 
        current_error;
    END;
  END LOOP;

  -- Возвращаем результат
  RAISE NOTICE 'Очистка завершена. Удалено файлов: %', deleted_files;
  
  RETURN QUERY SELECT deleted_files, current_error;
END;
$$;

-- Комментарий для документации
COMMENT ON FUNCTION public.cleanup_old_files() IS 
'Автоматическое удаление файлов старше 7 дней из Supabase Storage и таблицы file_uploads';

-- =====================================================
-- ЧАСТЬ 2: ТАБЛИЦА для логов очистки
-- =====================================================

DROP TABLE IF EXISTS public.file_cleanup_logs CASCADE;

CREATE TABLE public.file_cleanup_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  deleted_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE public.file_cleanup_logs IS 'Логи автоматической очистки файлов (pg_cron)';

-- Индекс для быстрого поиска последних запусков
CREATE INDEX idx_cleanup_logs_executed_at ON public.file_cleanup_logs(executed_at DESC);

-- =====================================================
-- ЧАСТЬ 3: WRAPPER для pg_cron (сохраняет логи)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_files_with_logging()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  result RECORD;
BEGIN
  -- Вызываем основную функцию очистки
  SELECT * INTO result FROM public.cleanup_old_files() LIMIT 1;

  -- Сохраняем результат в лог
  INSERT INTO public.file_cleanup_logs (deleted_count, error_message)
  VALUES (result.deleted_count, result.error_message);

  RAISE NOTICE 'Очистка завершена. Удалено файлов: %. Лог сохранён.', result.deleted_count;
END;
$$;

-- =====================================================
-- ЧАСТЬ 4: НАСТРОЙКА pg_cron (ВЫПОЛНЯЕТСЯ ВРУЧНУЮ)
-- =====================================================

-- ВАЖНО: pg_cron требует расширение, которое включается ТОЛЬКО через Supabase Dashboard
-- Supabase Dashboard → Database → Extensions → включи "pg_cron"

-- После включения pg_cron выполни эти команды:

-- Удаляем старое задание если есть (игнорируем ошибку если не существует)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-files');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Задание cleanup-old-files не найдено, создаём новое...';
END $$;

-- Создаём новое задание: каждый день в 03:00 UTC
SELECT cron.schedule(
  'cleanup-old-files',                    -- Имя задания
  '0 3 * * *',                            -- Cron расписание (03:00 каждый день)
  'SELECT public.cleanup_old_files_with_logging();' -- SQL команда
);

-- =====================================================
-- ПРОВЕРКА И ТЕСТИРОВАНИЕ
-- =====================================================

-- 1. Проверить что функция создана:
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'cleanup_old_files';

-- 2. Вручную запустить очистку для теста:
SELECT * FROM public.cleanup_old_files();

-- 3. Посмотреть логи очистки:
SELECT * FROM public.file_cleanup_logs ORDER BY executed_at DESC LIMIT 10;

-- 4. Посмотреть активные cron задания:
SELECT * FROM cron.job;

-- 5. Посмотреть историю выполнения cron:
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- =====================================================
-- РУЧНОЕ УПРАВЛЕНИЕ (для Admin панели)
-- =====================================================

-- Запустить очистку прямо сейчас (с логированием):
-- SELECT public.cleanup_old_files_with_logging();

-- Удалить все файлы старше N дней (ОСТОРОЖНО!):
-- DELETE FROM public.file_uploads WHERE created_at < NOW() - INTERVAL '30 days';

-- Посмотреть сколько файлов будет удалено:
SELECT COUNT(*) AS files_to_delete,
       SUM(file_size) / 1024 / 1024 AS total_mb
FROM public.file_uploads
WHERE created_at < NOW() - INTERVAL '7 days';

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT '✅ SQL скрипт выполнен! Теперь включи pg_cron в Supabase Dashboard → Database → Extensions' AS status;

