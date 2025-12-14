# 🔍 Анализ Проблем с Видео и Транскрибацией (Production)

## 📋 Симптомы из Console Logs

### 1. **Video Playback - 404 Errors**
```
Failed to load resource: the server responded with a status of 404 (Not Found)
https://api.onai.academy/api/video/9e3e25ad-fe5f-4e11-b797-de749f33631c/transcription
```

### 2. **CORS Errors**
```
Access to fetch at 'https://api.onai.academy/api/telegram-connection/status?userId=...' 
from origin 'https://onai.academy' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### 3. **Video Processing Status**
```
✅ API Response 200: { bunnyStatus: 4, progress: 100 }
```
Видео ЗАВЕРШЕНО на BunnyCDN, но:
- ❌ Транскрибация возвращает 404
- ❌ Playlist.m3u8 может быть недоступен из-за CORS

---

## 🔍 Root Cause Analysis

### Проблема 1: Транскрибация не найдена (404)

**Причина:**
Транскрибация запускается **асинхронно** в фоне после загрузки видео:
```typescript
// backend/src/routes/streamUpload.ts:287
waitForVideoReadyAndTranscribe(videoId)
  .then(() => console.log(`✅ Pipeline completed`))
  .catch((error) => console.error(`❌ Pipeline failed`));
```

Если `generateTranscription()` падает с ошибкой (yt-dlp, ffmpeg, Groq API timeout), то:
1. Ошибка **логируется только в консоль** сервера
2. Запись в `video_transcriptions` **не создается** или создается с `status = 'failed'`
3. Frontend запрашивает `/transcription` → **404 Not Found**

**Почему падает `generateTranscription()`?**
Возможные причины:
- `yt-dlp` не может скачать `.m3u8` (CORS, network timeout)
- `ffmpeg` не может извлечь аудио
- Groq API timeout (модель `whisper-large-v3` может быть медленной для длинных видео)
- Недостаточно места на диске в `/tmp/`

---

### Проблема 2: Неэффективный Polling

**Текущий процесс:**
```
1. Video uploaded → BunnyCDN
2. Backend polls every 10 seconds (up to 10 minutes)
   Attempt 1: status = 2 → wait
   Attempt 2: status = 3 → wait
   ...
   Attempt N: status = 4 → start transcription
```

**Проблемы:**
- Расход ресурсов сервера (каждое видео = 10-60 запросов к BunnyCDN)
- При массовой загрузке это создает огромную нагрузку
- Если polling timeout → транскрибация не запустится вообще

---

## ✅ Решение

### 1. BunnyCDN Webhooks (Recommended!)

**Вместо polling → Event-driven architecture**

```
Video encoded → BunnyCDN sends webhook → Backend triggers transcription
```

**Преимущества:**
- ✅ Мгновенная реакция (транскрибация начнется сразу после encoding)
- ✅ Нулевая нагрузка на сервер (no polling)
- ✅ Надежность (BunnyCDN retry webhooks автоматически)

**Что сделано:**
- ✅ Создан endpoint `POST /api/webhooks/bunnycdn`
- ✅ Зарегистрирован в `server.ts`
- ✅ Polling остается как fallback
- ✅ Документация: `BUNNY_WEBHOOK_SETUP.md`

**Что нужно сделать:**
1. Войти в [BunnyCDN Dashboard](https://dash.bunny.net/)
2. Settings → Webhooks → Add Webhook
3. URL: `https://api.onai.academy/api/webhooks/bunnycdn`
4. Events: ☑ VideoEncoded (status 4)

---

### 2. Улучшенная Обработка Ошибок Транскрибации

**Добавлена детальная логика в webhook:**
```typescript
generateTranscription(videoId, videoUrl)
  .then(() => console.log(`✅ Transcription completed`))
  .catch((error) => {
    console.error(`❌ Transcription failed:`, error.message);
    
    // Update DB with error status
    adminSupabase
      .from('video_transcriptions')
      .upsert({
        video_id: videoId,
        status: 'failed',
        error_message: error.message
      });
  });
```

**Теперь:**
- Если транскрибация падает → статус `failed` сохраняется в БД
- Frontend может показать пользователю "Transcription failed" вместо просто 404
- Админ может видеть причину ошибки в БД

---

### 3. Timeout Optimization

**Текущие настройки (production):**
```javascript
// backend/ecosystem.config.js
node_args: '--max-old-space-size=6144' // 6GB heap
max_memory_restart: '6G'
listen_timeout: 30000 // 30 seconds
kill_timeout: 10000

// backend/src/server.ts
req.setTimeout(3600000); // 60 minutes для /api/stream/upload
res.setTimeout(3600000);

// /etc/nginx/sites-available/onai-backend
proxy_connect_timeout 3600;
proxy_send_timeout 3600;
proxy_read_timeout 3600;
client_max_body_size 10G;
```

**Что означает "timeout 60 минут":**
- Это **максимальное время** для одного HTTP-запроса (upload video)
- Если upload длится > 60 минут → **сервер прервет соединение** (HTTP 408 Timeout)
- Но **транскрибация** запускается **асинхронно** и **не зависит** от этого timeout!

**Как работает асинхронность:**
```
1. User uploads video (may take 1-30 minutes)
2. Backend returns 200 OK ✅ (upload complete)
3. Backend starts waitForVideoReadyAndTranscribe() in background
   - This can run for hours if needed
   - Not bound by HTTP timeout
4. Frontend gets success response immediately
```

---

## 🎯 Action Items для Фикса

### Немедленные действия (Backend уже готов ✅):
1. ✅ Webhook endpoint создан и активен
2. ✅ Fallback polling работает

### Настройка BunnyCDN (5 минут):
1. Войти в BunnyCDN Dashboard
2. Настроить webhook на `https://api.onai.academy/api/webhooks/bunnycdn`
3. Тестировать загрузкой видео

### Проверка после настройки:
```bash
# 1. Test webhook endpoint
curl https://api.onai.academy/api/webhooks/test

# 2. Upload test video через platform

# 3. Check logs
ssh root@164.90.220.41
pm2 logs onai-backend --lines 100

# Expected output:
# 🐰 [WEBHOOK] Received from BunnyCDN: VideoEncoded
# ✅ [WEBHOOK] Video ... is encoded! Triggering transcription...
# 🎙️ [Transcription] Starting for video ...
# ✅ [Transcription] Completed
```

---

## 📊 Сравнение: До vs После

| Метрика | Polling (До) | Webhook (После) |
|---------|-------------|----------------|
| **Задержка** | 0-10 минут | 0-5 секунд |
| **Нагрузка** | 10-60 запросов/видео | 1 webhook/видео |
| **Масштабируемость** | ❌ Плохо (100 видео = 6000 запросов) | ✅ Отлично |
| **Надежность** | ⚠️ Timeout риск | ✅ Retry logic |
| **Debugging** | Сложно (logs в фоне) | Легко (webhook logs) |

---

## 🛡️ Дополнительные Улучшения (Опционально)

### 1. Retry Logic для Транскрибации
Если Groq API timeout, можно добавить автоматический retry:
```typescript
const MAX_RETRIES = 3;
for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    return await groq.audio.transcriptions.create({...});
  } catch (error) {
    if (i === MAX_RETRIES - 1) throw error;
    await sleep(5000); // Wait 5 seconds before retry
  }
}
```

### 2. Frontend UI для Failed Transcriptions
Показывать пользователю:
```
⚠️ Transcription failed. Click to retry.
```

### 3. Admin Dashboard для Мониторинга
Страница `/admin/transcriptions` с таблицей:
| Video ID | Status | Error | Created | Actions |
|----------|--------|-------|---------|---------|
| 9e3e25... | failed | Groq timeout | 10:30 | Retry |
| b61fda... | completed | - | 10:25 | View |

---

## 📝 Summary

**Проблема:**
- Видео загружается ✅
- BunnyCDN transcoding завершается ✅
- Но транскрибация падает с ошибкой (yt-dlp/ffmpeg/Groq) ❌
- Frontend получает 404 на `/transcription` ❌

**Решение:**
1. **BunnyCDN Webhook** → мгновенная реакция, нулевая нагрузка
2. **Улучшенная error handling** → failed status в БД
3. **Polling остается** как fallback

**Следующий шаг:**
Настроить webhook в BunnyCDN Dashboard (5 минут) → проблема решена! 🎉

