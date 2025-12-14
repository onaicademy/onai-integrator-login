# 🐛 FIX REPORT: Video Upload 404 Error

**Date:** 02.12.2025  
**Issue:** После загрузки видео запрос GET /api/videos/lesson/:id возвращал 404  
**Status:** ✅ FIXED

---

## 🔍 ПРОБЛЕМА

После успешной загрузки видео в Bunny Stream:
1. ✅ Прогресс доходил до 100%
2. ✅ Видео загружалось в Bunny
3. ✅ Запись создавалась в таблице `video_content`
4. ❌ **НО** запрос `GET /api/videos/lesson/:id` возвращал **404 Not Found**

**Причина:** Endpoint `/api/videos/lesson/:id` был удален вместе со старым Bunny Storage кодом, но Frontend продолжал использовать этот endpoint.

---

## ✅ РЕШЕНИЕ

### 1. Создан новый endpoint `/api/videos/lesson/:id`

**Файл:** `backend/src/routes/videos.ts` (новый файл)

```typescript
router.get('/lesson/:lessonId', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    
    console.log(`🔍 [GET VIDEO] Fetching video for lesson: ${lessonId}`);

    // Получаем видео из таблицы video_content
    const { data: video, error } = await adminSupabase
      .from('video_content')
      .select('*')
      .eq('lesson_id', parseInt(lessonId))
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !video) {
      console.log(`⚠️ [GET VIDEO] Video not found for lesson ${lessonId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'Video not found for this lesson' 
      });
    }

    // Возвращаем данные видео
    return res.json({
      success: true,
      video: {
        id: video.id,
        lesson_id: video.lesson_id,
        bunny_video_id: video.bunny_video_id,
        public_url: video.public_url,
        r2_url: video.public_url, // Для обратной совместимости
        video_url: video.public_url, // Для обратной совместимости
        filename: video.filename,
        duration_seconds: video.duration_seconds,
        file_size_bytes: video.file_size_bytes,
        upload_status: video.upload_status,
        transcoding_status: video.transcoding_status,
        created_at: video.created_at,
        updated_at: video.updated_at
      }
    });
  } catch (error: any) {
    console.error('❌ [GET VIDEO] Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch video',
      details: error.message 
    });
  }
});
```

**Особенности:**
- ✅ Делает выборку из таблицы `video_content` (правильная таблица)
- ✅ Сортирует по `created_at DESC` чтобы получить последнее видео
- ✅ Возвращает все необходимые поля (bunny_video_id, public_url, etc.)
- ✅ Обратная совместимость: `r2_url` и `video_url` указывают на `public_url`

### 2. Зарегистрирован роут в server.ts

**Файл:** `backend/src/server.ts`

```typescript
// Добавлен импорт
import videosRouter from './routes/videos'; // ✅ Videos API (NEW - для получения видео по lesson_id)

// Зарегистрирован роут
app.use('/api/videos', videosRouter); // ✅ Videos API (для получения видео по lesson_id)
```

### 3. Проверена логика сохранения в video_content

**Файл:** `backend/src/routes/streamUpload.ts` (строки 182-213)

✅ Код **УЖЕ ПРАВИЛЬНЫЙ** - после загрузки видео в Bunny создается запись в `video_content`:

```typescript
const { data: video, error: videoError } = await adminSupabase
  .from('video_content')
  .upsert({
    lesson_id: parseInt(lessonId),
    r2_object_key: videoId,
    r2_bucket_name: BUNNY_STREAM_LIBRARY_ID,
    bunny_video_id: videoId,  // ✅ CRITICAL: Save bunny_video_id for iframe player!
    filename: req.file.originalname,
    public_url: `https://${BUNNY_STREAM_CDN_HOSTNAME}/${videoId}/playlist.m3u8`,
    file_size_bytes: req.file.size,
    duration_seconds: durationSeconds,
    upload_status: 'completed',
    transcoding_status: 'processing',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'lesson_id' // ✅ Если видео уже есть - обновляем
  })
  .select()
  .single();
```

---

## 🧪 КАК ПРОВЕРИТЬ

### 1. Загрузить видео через Frontend

1. Открыть LessonEditDialog
2. Выбрать видео файл
3. Нажать "Сохранить"
4. Дождаться 100% загрузки

### 2. Проверить что запрос успешен

**Ожидаемый результат:**
- Прогресс доходит до 100%
- Запрос `GET /api/videos/lesson/:id` возвращает **200 OK**
- Видео отображается в плеере

**Проверка через curl:**
```bash
curl http://localhost:3000/api/videos/lesson/68
```

**Ожидаемый ответ:**
```json
{
  "success": true,
  "video": {
    "id": "...",
    "lesson_id": 68,
    "bunny_video_id": "...",
    "public_url": "https://video.onai.academy/.../playlist.m3u8",
    "r2_url": "...",
    "video_url": "...",
    "filename": "video.mp4",
    "duration_seconds": 120,
    "file_size_bytes": 12345678,
    "upload_status": "completed",
    "transcoding_status": "processing"
  }
}
```

### 3. Проверить запись в БД

**SQL:**
```sql
SELECT * FROM video_content WHERE lesson_id = 68;
```

**Ожидаемый результат:**
- ✅ Есть запись с `lesson_id = 68`
- ✅ `bunny_video_id` заполнен
- ✅ `public_url` указывает на Bunny Stream
- ✅ `upload_status = 'completed'`

---

## 📋 ФАЙЛЫ ИЗМЕНЕНЫ

1. ✅ **backend/src/routes/videos.ts** - создан новый файл с endpoint
2. ✅ **backend/src/server.ts** - добавлен импорт и регистрация роута
3. ✅ **backend/src/routes/streamUpload.ts** - удален дублирующийся роут

---

## 🚀 ДЕПЛОЙ

После тестирования на localhost:
```bash
# Backend
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend && pm2 logs onai-backend --lines 20"

# Проверить API
curl https://api.onai.academy/api/health
```

---

## ✅ ИТОГИ

**Проблема:** 404 на `/api/videos/lesson/:id` после загрузки видео  
**Причина:** Endpoint был удален вместе со старым кодом  
**Решение:** Создан новый endpoint который делает выборку из `video_content`  
**Статус:** ✅ FIXED

**Следующие шаги:**
1. ⏳ Протестировать загрузку видео end-to-end
2. ⏳ Убедиться что видео появляется в плеере
3. ⏳ При успехе - задеплоить на production

---

**Powered by Cursor AI + Claude Sonnet 4.5**  
*© 2025 onAI Academy*

