-- ========================
-- STORAGE BUCKET ДЛЯ ГОЛОСОВЫХ СООБЩЕНИЙ И ФАЙЛОВ
-- Создано: 7 ноября 2025
-- ИСПРАВЛЕНО: Используем Supabase Dashboard UI вместо SQL
-- ========================

-- ⚠️  ВАЖНО: Создайте bucket через Supabase Dashboard UI!
-- 
-- Инструкция:
-- 1. Откройте Storage в Supabase Dashboard
-- 2. Нажмите "Create a new bucket"
-- 3. Name: student-messages
-- 4. Public: OFF (приватный)
-- 5. File size limit: 10 MB
-- 6. Allowed MIME types: оставьте пустым (разрешить все)
-- 7. Нажмите "Create bucket"
--
-- После создания bucket'а примените политики ниже:

-- ========================
-- ПОЛИТИКИ ДОСТУПА К STORAGE
-- ========================

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Students can upload their messages" ON storage.objects;
DROP POLICY IF EXISTS "Students can read message files" ON storage.objects;
DROP POLICY IF EXISTS "Students can delete their own files" ON storage.objects;

-- Студенты могут ЗАГРУЖАТЬ файлы в свою папку
CREATE POLICY "Students can upload their messages"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-messages' AND
  -- Путь должен начинаться с user_id пользователя
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Студенты могут ЧИТАТЬ все файлы в bucket
CREATE POLICY "Students can read message files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-messages'
);

-- Студенты могут УДАЛЯТЬ только свои файлы
CREATE POLICY "Students can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-messages' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ========================
-- ФУНКЦИЯ: Очистка старых файлов (опционально)
-- ========================
CREATE OR REPLACE FUNCTION cleanup_old_message_files()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Удаляем файлы старше 1 года (опционально)
  DELETE FROM storage.objects
  WHERE bucket_id = 'student-messages'
    AND created_at < NOW() - INTERVAL '1 year';
END;
$$;

COMMENT ON FUNCTION cleanup_old_message_files() IS 'Функция очистки старых файлов сообщений (старше 1 года)';

-- ========================
-- ГОТОВО!
-- ========================
-- После применения этого SQL:
-- 1. Создайте bucket 'student-messages' через UI (инструкция вверху)
-- 2. Политики доступа применятся автоматически
-- 3. Голосовые сообщения заработают
