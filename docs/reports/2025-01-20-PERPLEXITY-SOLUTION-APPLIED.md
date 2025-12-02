# ✅ Perplexity Solution Applied - Critical Fixes

**Дата**: 20 января 2025  
**Статус**: 🟢 ИСПРАВЛЕНО  

---

## 🔥 Проблемы выявленные Perplexity AI

### 1. Multer Field Order Issue ⚠️

**Проблема**: Когда Multer обрабатывает файл ПЕРВЫМ, он заканчивает обработку запроса ДО того, как увидит `duration_seconds`, поэтому `req.body.duration_seconds = undefined`.

**Было (неправильно)**:
```javascript
formData.append('video', videoFile);              // Файл первый
formData.append('duration_seconds', duration);    // Поле второе
```

**Стало (правильно)**:
```javascript
formData.append('duration_seconds', duration.toString());  // ПОЛЕ ПЕРВОЕ!
formData.append('video', videoFile);                       // Файл второе!
```

✅ **Исправлено в**: `src/components/admin/LessonEditDialog.tsx` (3 места)

---

### 2. Multer.single() вместо multer.fields()

**Проблема**: `upload.single('video')` не обрабатывает другие поля правильно.

**Было**:
```typescript
const upload = multer({ ... }).single('video');
router.post('/upload/:lessonId', upload, async (req, res) => {
  const file = req.file;  // ❌ Только файл
  const duration = req.body.duration_seconds;  // ❌ undefined
});
```

**Стало**:
```typescript
const upload = multer({ ... }).fields([
  { name: 'video', maxCount: 1 },
  { name: 'duration_seconds', maxCount: 1 }
]);
router.post('/upload/:lessonId', upload, async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const videoFile = files['video']?.[0];  // ✅ Файл
  const duration = req.body.duration_seconds;  // ✅ Поле доступно
});
```

✅ **Исправлено в**: `backend/src/routes/videos.ts`

---

### 3. Данные сохраняются только в одну таблицу

**Проблема**: Обновлялась только `lessons.duration_minutes`, но не `video_content.duration_seconds`. Это создавало рассинхронизацию.

**Стало**:
```typescript
// ШАГ 1: Обновляем lessons.duration_minutes
const { data: lesson, error: lessonError } = await supabase
  .from('lessons')
  .update({
    video_url: cdnUrl,
    duration_minutes: durationMinutes,
    updated_at: new Date().toISOString()
  })
  .eq('id', parseInt(lessonId))
  .select()
  .single();

// ШАГ 2: Сохраняем в video_content (для fallback)
const { data: videoContent, error: videoError } = await supabase
  .from('video_content')
  .upsert({
    lesson_id: parseInt(lessonId),
    video_url: cdnUrl,
    filename: videoFile.originalname,
    file_size_bytes: videoFile.size,
    duration_seconds: durationSeconds,
    created_at: new Date().toISOString()
  }, {
    onConflict: 'lesson_id'
  })
  .select()
  .single();
```

✅ **Исправлено в**: `backend/src/routes/videos.ts`

---

## 📁 Изменённые файлы

### Frontend

**`src/components/admin/LessonEditDialog.tsx`**
- ✅ Изменён порядок полей в FormData (duration_seconds ПЕРЕД video) — 3 места
- ✅ Добавлены комментарии о критичности порядка

### Backend

**`backend/src/routes/videos.ts`**
- ✅ Заменён `upload.single('video')` на `upload.fields([...])`
- ✅ Обновлён код обработки файлов (`req.files` вместо `req.file`)
- ✅ Добавлено сохранение в `video_content` таблицу
- ✅ Улучшено логирование для отладки

---

## 🧪 Ожидаемый результат

После всех исправлений:

**API Response**:
```json
{
  "lessons": [
    {
      "id": 18,
      "title": "Lesson Title",
      "duration_minutes": 5,        // ✅ ЗАПОЛНЕНО!
      "video_url": "https://...",
      "video_content": [
        {
          "id": "...",
          "duration_seconds": 300     // ✅ ЗАПОЛНЕНО!
        }
      ]
    }
  ]
}
```

**Frontend Display**:
```
Время прохождения модуля: 5 минут (2 урока) ✅
```

---

## 🚀 Следующие шаги

### 1. Проверить RLS Policies (TODO #4)

**Возможная проблема**: Supabase RLS может блокировать обновления без ошибок.

**Решение**:
```sql
-- Временно отключить для теста
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_content DISABLE ROW LEVEL SECURITY;

-- Попробовать загрузить видео
-- Работает? -> Проблема в RLS!

-- Создать правильные политики для админов
CREATE POLICY "Admin full access to lessons"
ON lessons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Включить обратно
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
```

### 2. Протестировать загрузку видео (TODO #5)

1. Открыть `http://localhost:8080`
2. Создать урок
3. Загрузить видео
4. Проверить консоль браузера:
   - `⏱️ Длительность видео: X секунд`
5. Проверить backend логи:
   - `📊 Received duration_seconds: X`
   - `✅ Saving duration_minutes: Y минут`
   - `✅ Lesson updated: { duration_minutes: Y }`
   - `✅ Video_content saved: { duration_seconds: X }`
6. Открыть модуль и проверить:
   - "Время прохождения модуля: X часов Y минут"

### 3. Миграция существующих видео (опционально)

```sql
-- Обновить duration_minutes для существующих уроков
UPDATE lessons l
SET duration_minutes = ROUND(
  (
    SELECT vc.duration_seconds::numeric / 60
    FROM video_content vc
    WHERE vc.lesson_id = l.id
    AND vc.duration_seconds IS NOT NULL
    ORDER BY vc.created_at DESC
    LIMIT 1
  )
)
WHERE l.duration_minutes IS NULL
AND EXISTS (
  SELECT 1 FROM video_content vc
  WHERE vc.lesson_id = l.id
  AND vc.duration_seconds IS NOT NULL
);
```

---

## 📊 Статус

- [x] Frontend: FormData field order fixed
- [x] Backend: multer.fields() implemented
- [x] Backend: Save to both tables implemented
- [ ] RLS policies check (pending user test)
- [ ] Video upload test (pending user test)

---

## 🔗 Ссылки

- Perplexity Request: `docs/reports/2025-01-20-PERPLEXITY-REQUEST.md`
- Comprehensive Report: `docs/reports/2025-01-20-comprehensive-fix-report.md`
- Final Status: `docs/reports/2025-01-20-FINAL-STATUS.md`

---

**Все критические исправления применены! Теперь нужно протестировать загрузку видео.**

