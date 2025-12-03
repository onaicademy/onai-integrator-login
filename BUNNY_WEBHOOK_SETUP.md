# 🐰 BunnyCDN Webhook Setup для Автоматической Транскрибации

## 📖 Проблема (До Webhook)

### Старый подход - Polling (Неэффективно)
```
1. User uploads video → Backend
2. Backend uploads video → BunnyCDN
3. Backend returns success to frontend ✅
4. 🔄 Backend POLLS BunnyCDN every 10 seconds (wasteful!)
   - Check 1: status = 2 (processing) → wait 10s
   - Check 2: status = 3 (encoding) → wait 10s
   - Check 3: status = 4 (finished!) → start transcription ✅
```

**Проблемы:**
- ❌ Сервер постоянно делает запросы к BunnyCDN (10-60 попыток на видео)
- ❌ Если видео длинное, может упереться в timeout (10 минут max)
- ❌ Если polling упадет с ошибкой, транскрибация вообще не запустится
- ❌ Нагрузка на сервер при массовой загрузке видео

---

## ✅ Решение - BunnyCDN Webhooks (Рекомендовано!)

### Новый подход - Event-Driven
```
1. User uploads video → Backend
2. Backend uploads video → BunnyCDN
3. Backend returns success to frontend ✅
4. BunnyCDN starts transcoding in background
5. 🎯 BunnyCDN sends webhook to backend when FINISHED (status = 4)
   POST https://api.onai.academy/api/webhooks/bunnycdn
   {
     "EventType": "VideoEncoded",
     "VideoGuid": "9e3e25ad-fe5f-4e11-b797-de749f33631c",
     "Status": 4
   }
6. Backend receives webhook → immediately starts transcription ✅
```

**Преимущества:**
- ✅ **Нулевая нагрузка** - сервер ничего не делает, пока видео не готово
- ✅ **Мгновенная реакция** - транскрибация начинается сразу после transcoding
- ✅ **Надежность** - если webhook упадет, BunnyCDN попробует еще раз (retry logic)
- ✅ **Масштабируемость** - можно загружать сотни видео одновременно

---

## 🔧 Как настроить BunnyCDN Webhook

### Шаг 1: Войти в BunnyCDN Dashboard
1. Перейти на [https://dash.bunny.net/](https://dash.bunny.net/)
2. Войти с учетными данными
3. Выбрать **Stream** → Ваша библиотека (Library ID: `{BUNNY_STREAM_LIBRARY_ID}`)

### Шаг 2: Настроить Webhook
1. В левом меню выбрать **Settings** → **Webhooks**
2. Нажать **Add Webhook**
3. Заполнить форму:

```
Webhook URL: https://api.onai.academy/api/webhooks/bunnycdn
Events to send:
  ☑ VideoEncoded (status 4) ← CRITICAL!
  ☑ VideoFailed (status 5) ← Optional (для логирования ошибок)
  ☐ VideoUploaded (status 1) ← Not needed
```

4. Нажать **Save**

### Шаг 3: Проверить работу
1. Загрузить тестовое видео через платформу
2. Проверить логи backend:
   ```bash
   pm2 logs onai-backend --lines 50
   ```
3. Вы должны увидеть:
   ```
   🐰 [WEBHOOK] Received from BunnyCDN: VideoEncoded, VideoGuid: ...
   ✅ [WEBHOOK] Video ... is encoded! Triggering transcription...
   🎙️ [Transcription] Starting for video ...
   ✅ [Transcription] Completed for video ...
   ```

---

## 📊 Архитектура после Webhook

```
┌─────────────────┐
│   Frontend      │
│  (User uploads) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   Backend API           │
│  /api/stream/upload     │
│                         │
│  1. Save to DB          │
│  2. Upload to BunnyCDN  │
│  3. Return success ✅   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│     BunnyCDN            │
│  - Receives video       │
│  - Transcodes (async)   │
│  - Generates .m3u8      │
└────────┬────────────────┘
         │
         │ (When finished)
         ▼
┌─────────────────────────┐
│   Backend Webhook       │
│ /api/webhooks/bunnycdn  │
│                         │
│  1. Update DB status    │
│  2. Trigger transcribe  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Transcription Service  │
│  (Groq Whisper API)     │
│                         │
│  1. Download video      │
│  2. Extract audio       │
│  3. Send to Groq        │
│  4. Save to DB          │
│  5. Generate AI content │
└─────────────────────────┘
```

---

## 🛡️ Fallback Mechanism

Если webhook не настроен, система автоматически использует **polling** (старый метод).

В логах вы увидите:
```
⏳ [Auto-Pipeline] Waiting for video ... to finish transcoding...
💡 [Auto-Pipeline] TIP: Configure BunnyCDN webhook for faster processing!
🔍 [Auto-Pipeline] Attempt 1/60 - Status: 2, Progress: 25%
```

Это работает, но **НЕ рекомендуется** для production при массовой загрузке.

---

## 🔍 Диагностика

### Проверить статус webhook
```bash
curl https://api.onai.academy/api/webhooks/test
```

Ответ:
```json
{
  "success": true,
  "message": "Webhook endpoint is active",
  "timestamp": "2025-12-03T..."
}
```

### Тестировать webhook вручную
```bash
curl -X POST https://api.onai.academy/api/webhooks/bunnycdn \
  -H "Content-Type: application/json" \
  -d '{
    "EventType": "VideoEncoded",
    "VideoGuid": "YOUR_VIDEO_ID",
    "Status": 4,
    "Length": 360,
    "AvailableResolutions": "1080p,720p,480p,360p"
  }'
```

Ответ:
```json
{
  "success": true,
  "message": "Transcription triggered",
  "videoId": "YOUR_VIDEO_ID"
}
```

---

## 🚀 Итоги

1. **Webhooks** - это best practice для интеграции с BunnyCDN
2. **Polling** остается как fallback, но неэффективен
3. После настройки webhook **транскрибация будет запускаться мгновенно**
4. Это решает проблему с 404 ошибками на `/transcription`, т.к. система будет быстрее реагировать

---

## 📝 Changelog

- **2025-12-03**: Добавлен webhook endpoint `/api/webhooks/bunnycdn`
- **2025-12-03**: Обновлена документация для настройки BunnyCDN webhooks
- **2025-12-03**: Polling остается как fallback mechanism

