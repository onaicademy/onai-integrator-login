-- =====================================================
-- SUPABASE STORAGE + DATABASE ДЛЯ PDF UPLOAD
-- Дата: 14 ноября 2025
-- Цель: Production-ready архитектура загрузки файлов
-- =====================================================

-- =====================================================
-- ЧАСТЬ 1: DATABASE TABLE для metadata файлов
-- =====================================================

-- Удаляем старую таблицу если есть (для чистой переустановки)
DROP TABLE IF EXISTS public.file_uploads CASCADE;

-- Создаём таблицу для хранения информации о загруженных файлах
CREATE TABLE public.file_uploads (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id TEXT,                      -- OpenAI thread ID (опционально)
  filename TEXT NOT NULL,              -- Оригинальное имя файла
  file_path TEXT NOT NULL,             -- Path в Supabase Storage
  file_url TEXT NOT NULL,              -- Public/Signed URL
  file_size BIGINT NOT NULL,           -- Размер в байтах
  file_type TEXT NOT NULL,             -- MIME type
  extracted_text TEXT,                 -- Извлечённый текст из PDF/DOCX
  processing_status TEXT DEFAULT 'pending', -- pending/completed/failed
  error_message TEXT,                  -- Сообщение об ошибке (если failed)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Комментарии для документации
COMMENT ON TABLE public.file_uploads IS 'Metadata загруженных пользователями файлов (PDF, DOCX, Images)';
COMMENT ON COLUMN public.file_uploads.extracted_text IS 'Текст извлечённый из PDF/DOCX через pdf-parse/mammoth';
COMMENT ON COLUMN public.file_uploads.processing_status IS 'Статус обработки: pending (загружается), completed (успешно), failed (ошибка)';

-- =====================================================
-- ИНДЕКСЫ для быстрого поиска
-- =====================================================

CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_file_uploads_thread_id ON public.file_uploads(thread_id);
CREATE INDEX idx_file_uploads_created_at ON public.file_uploads(created_at DESC);
CREATE INDEX idx_file_uploads_status ON public.file_uploads(processing_status);

-- =====================================================
-- RLS ПОЛИТИКИ для таблицы file_uploads
-- =====================================================

ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view own files" ON public.file_uploads;
DROP POLICY IF EXISTS "Users can insert own files" ON public.file_uploads;
DROP POLICY IF EXISTS "Users can update own files" ON public.file_uploads;
DROP POLICY IF EXISTS "Admins can view all files" ON public.file_uploads;

-- ✅ SELECT: Пользователи видят только свои файлы
CREATE POLICY "Users can view own files"
ON public.file_uploads
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ✅ INSERT: Пользователи могут загружать только от своего имени
CREATE POLICY "Users can insert own files"
ON public.file_uploads
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ✅ UPDATE: Пользователи могут обновлять только свои файлы
CREATE POLICY "Users can update own files"
ON public.file_uploads
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ✅ ADMIN: Админы видят все файлы
CREATE POLICY "Admins can view all files"
ON public.file_uploads
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- ЧАСТЬ 2: STORAGE RLS ПОЛИТИКИ
-- =====================================================

-- ВАЖНО: Bucket 'user-files' должен быть создан вручную в Supabase Dashboard!
-- Supabase Dashboard → Storage → Create bucket
-- Name: user-files
-- Public: false (приватный)
-- File size limit: 20 MB
-- Allowed MIME types: application/pdf, image/*, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- ✅ INSERT: Пользователи могут загружать только в свою папку {userId}/
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ✅ SELECT: Пользователи могут читать только свои файлы
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ✅ DELETE: Пользователи могут удалять только свои файлы
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- ПРОВЕРКА
-- =====================================================

-- Посмотреть все политики для file_uploads:
SELECT * FROM pg_policies WHERE tablename = 'file_uploads';

-- Посмотреть все политики для storage.objects:
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- =====================================================
-- ГОТОВО!
-- =====================================================

-- После выполнения этого скрипта:
-- ✅ Таблица file_uploads создана с RLS
-- ✅ Storage policies настроены (если bucket 'user-files' существует)
-- ✅ Пользователи могут загружать файлы только в свою папку
-- ✅ Пользователи видят только свои файлы

-- СЛЕДУЮЩИЙ ШАГ:
-- 1. Создай bucket 'user-files' в Supabase Dashboard (если ещё не создан)
-- 2. Обнови Backend код (services + controller)
-- 3. Протестируй загрузку файла

SELECT '✅ SQL скрипт выполнен успешно! Теперь создай bucket user-files в Supabase Dashboard.' AS status;

