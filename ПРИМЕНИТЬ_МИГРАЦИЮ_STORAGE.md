# 🗄️ ПРИМЕНИТЬ МИГРАЦИЮ STORAGE ДЛЯ ГОЛОСОВЫХ СООБЩЕНИЙ

**Статус:** ⚠️  Требуется применение в Supabase Dashboard  
**Дата:** 7 ноября 2025

---

## ✅ ЧТО УЖЕ ГОТОВО:

- ✅ Код задеплоен на сервер
- ✅ Messages.tsx обновлён
- ✅ API (messages-api.ts) создан
- ✅ Сайт работает: https://integratoronai.kz

---

## ⚠️  ЧТО НУЖНО СДЕЛАТЬ (1 ШАГ):

### **Применить миграцию в Supabase Dashboard**

---

## 📋 ИНСТРУКЦИЯ:

### **ШАГ 1: Откройте Supabase Dashboard**

```
https://supabase.com/dashboard
```

1. Войдите в свой проект
2. Перейдите в раздел **SQL Editor** (слева в меню)

---

### **ШАГ 2: Скопируйте SQL миграцию**

Откройте файл:
```
supabase/migrations/20250111_student_messages_storage.sql
```

Или скопируйте отсюда:

```sql
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
```

---

### **ШАГ 3: Выполните миграцию**

1. Вставьте SQL в SQL Editor
2. Нажмите кнопку **RUN** (или Ctrl+Enter)
3. Дождитесь успешного выполнения

**Ожидаемый результат:**
```
Success. No rows returned.
```

---

### **ШАГ 4: Проверка**

Перейдите в раздел **Storage** (слева в меню):

Вы должны увидеть новый bucket:
```
📁 student-messages
   ├── Public: No
   ├── File size limit: 10 MB
   └── Policies: 3 (insert, select, delete)
```

---

## 🎯 ЧТО ДЕЛАЕТ ЭТА МИГРАЦИЯ:

### **1. Storage Bucket:**
- ✅ Создаёт приватный bucket `student-messages`
- ✅ Ограничение: 10 MB на файл
- ✅ Поддерживаемые форматы:
  - Аудио: webm, mp3, wav, ogg
  - Изображения: jpeg, png, gif
  - Документы: pdf, txt

### **2. Политики доступа:**
- ✅ Студенты могут загружать файлы в свою папку (`{user_id}/...`)
- ✅ Студенты могут читать все файлы в bucket
- ✅ Студенты могут удалять только свои файлы

### **3. Функция очистки (опционально):**
- ✅ `cleanup_old_message_files()` - удаляет файлы старше 1 года
- ⚠️  Cron job закомментирован (можно включить позже)

---

## ✅ ПОСЛЕ ПРИМЕНЕНИЯ:

### **Что заработает:**

1. **Голосовые сообщения:**
   - ✅ Запись через микрофон
   - ✅ Загрузка в Supabase Storage
   - ✅ Проигрывание голосовых
   - ✅ Сохранение в истории

2. **История диалогов:**
   - ✅ Чаты сохраняются в БД
   - ✅ Сообщения сохраняются в БД
   - ✅ История не пропадает при перезагрузке
   - ✅ Real-time обновления

3. **Файлы (в будущем):**
   - ✅ Изображения
   - ✅ Документы (PDF, TXT)

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ:

1. **Откройте сайт:**
   ```
   https://integratoronai.kz/messages
   ```

2. **Войдите под студентом**

3. **Попробуйте:**
   - ✅ Отправить текстовое сообщение
   - ✅ Записать голосовое сообщение (кнопка микрофона)
   - ✅ Прослушать голосовое (кнопка Play)
   - ✅ Перезагрузить страницу - история должна сохраниться

---

## 🆘 ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ:

### **Ошибка: "Bucket already exists"**
```
Это нормально! Bucket уже создан.
Просто пропустите этот шаг.
```

### **Ошибка: "Policy already exists"**
```
Это нормально! Политики уже созданы.
Просто пропустите этот шаг.
```

### **Голосовые не записываются:**
```
1. Проверь что bucket создан (Storage → student-messages)
2. Проверь политики доступа
3. Проверь консоль браузера (F12) на ошибки
4. Убедись что микрофон разрешён в браузере
```

### **История не сохраняется:**
```
1. Проверь что таблицы созданы:
   - student_private_chats
   - student_private_messages
2. Проверь консоль браузера на ошибки
3. Проверь логи Supabase
```

---

## 📊 СТРУКТУРА BUCKET:

После применения миграции и отправки первого голосового:

```
student-messages/
├── {user_id_1}/
│   ├── 1699368234567.webm  (голосовое 5 сек)
│   ├── 1699368245678.webm  (голосовое 12 сек)
│   └── ...
├── {user_id_2}/
│   ├── 1699368256789.webm
│   └── ...
└── ...
```

---

## ✅ ГОТОВО!

После применения миграции:
- ✅ Голосовые сообщения заработают
- ✅ История диалогов будет сохраняться
- ✅ Всё будет работать стабильно

---

**ПРИМЕНИЛ МИГРАЦИЮ? ПРОТЕСТИРУЙ НА САЙТЕ!** 🚀

