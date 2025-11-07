-- ========================
-- STORAGE BUCKET ДЛЯ ГОЛОСОВЫХ СООБЩЕНИЙ И ФАЙЛОВ
-- Создано: 7 ноября 2025
-- ========================

-- Создаём bucket для сообщений студентов
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-messages',
  'student-messages',
  false, -- приватный bucket
  10485760, -- 10 MB максимум
  ARRAY[
    'audio/webm',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- ПОЛИТИКИ ДОСТУПА К STORAGE
-- ========================

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

-- Студенты могут ЧИТАТЬ все файлы в bucket (если участвуют в чате)
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
  -- Это можно настроить по желанию
  DELETE FROM storage.objects
  WHERE bucket_id = 'student-messages'
    AND created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- Можно настроить cron для периодической очистки
-- pg_cron.schedule('cleanup-message-files', '0 3 * * 0', 'SELECT cleanup_old_message_files()');

COMMENT ON TABLE storage.buckets IS 'Storage bucket для голосовых сообщений и файлов студентов';
COMMENT ON FUNCTION cleanup_old_message_files() IS 'Функция очистки старых файлов сообщений';

