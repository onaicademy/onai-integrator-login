# 🎬 СУБТИТРЫ/ТРАНСКРИПЦИИ - ГОТОВО К ПОДКЛЮЧЕНИЮ!

## ✅ ЧТО СДЕЛАНО:

### 1️⃣ **Создана таблица `video_transcriptions` в Tripwire DB**
```sql
CREATE TABLE video_transcriptions (
  id UUID PRIMARY KEY,
  video_id TEXT NOT NULL,
  lesson_id INTEGER,
  module_id INTEGER,
  transcript_text TEXT,    -- Чистый текст
  transcript_srt TEXT,     -- SRT формат
  transcript_vtt TEXT,     -- WebVTT для субтитров
  language TEXT DEFAULT 'ru',
  generated_by TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2️⃣ **Скопированы все транскрипции из Main Platform**
```
✅ Lesson 67 (Module 16): 11,103 bytes VTT
✅ Lesson 68 (Module 17): 18,457 bytes VTT
✅ Lesson 69 (Module 18): 2,812 bytes VTT
```

### 3️⃣ **Создан API endpoint**
- **Файл:** `backend/src/routes/tripwire/transcriptions.ts`
- **Endpoints:**
  - `GET /api/tripwire/transcriptions/:videoId` - По video ID
  - `GET /api/tripwire/transcriptions/lesson/:lessonId` - По lesson ID

---

## 🔄 ЧТО ОСТАЛОСЬ СДЕЛАТЬ:

### ШАГ 1: Перезапусти backend
```bash
# Останови текущий backend (Ctrl+C или kill процесс)
# Запусти заново
cd backend && npm run dev
```

### ШАГ 2: Подключи субтитры к SmartVideoPlayer

**Файл:** `src/components/SmartVideoPlayer.tsx`

**Где изменить:** В `fetchSubtitles()` функцию (строка ~253)

**Замени:**
```typescript
const fetchSubtitles = async (videoId: string) => {
  try {
    console.log('🔍 Fetching subtitles for video:', videoId);
    
    // ❌ СТАРЫЙ КОД (для Main Platform)
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('⚠️ No auth token found');
      return;
    }
    
    const response = await api.get(
      `/video/transcription/${videoId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
```

**На:**
```typescript
const fetchSubtitles = async (videoId: string) => {
  try {
    console.log('🔍 Fetching subtitles for video:', videoId);
    
    // ✅ НОВЫЙ КОД (для Tripwire)
    const response = await api.get(
      `/tripwire/transcriptions/${videoId}`
    );
    
    if (!response.data.success || !response.data.data) {
      console.log('ℹ️ No subtitles available for this video');
      return;
    }
    
    const { vttContent } = response.data.data;
```

### ШАГ 3: Добавь в админ панель (опционально)

**Создай страницу:** `src/pages/admin/TripwireTranscriptions.tsx`

**Функции:**
- Список всех транскрипций
- Загрузка новых VTT файлов
- Редактирование существующих
- Просмотр текста транскрипции

---

## 📂 ГДЕ ХРАНЯТСЯ СУБТИТРЫ:

```
Database: Tripwire Supabase (pjmvxecykysfrzppdcto)
Table: public.video_transcriptions
Format: WebVTT (transcript_vtt колонка)
```

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ:

### После перезапуска backend:

1. **Проверь API:**
```bash
curl http://localhost:3000/api/tripwire/transcriptions/9d9fe01c-e060-4182-b382-65ddc52b67ed
```

Должен вернуть:
```json
{
  "success": true,
  "data": {
    "videoId": "9d9fe01c-e060-4182-b382-65ddc52b67ed",
    "lessonId": 67,
    "moduleId": 16,
    "vttContent": "WEBVTT\n\n1\n00:00:00.000 --> ...",
    "language": "ru"
  }
}
```

2. **Открой урок с видео**
- Перейди на Lesson 67 (Module 16)
- Открой DevTools Console
- Найди лог: `🔍 Fetching subtitles for video: 9d9fe01c...`
- Должен появиться лог: `✅ Subtitles loaded successfully`

3. **Включи субтитры в плеере**
- Нажми на кнопку CC (Closed Captions) в плеере
- Выбери "Russian"
- Субтитры должны появиться!

---

## 🎯 ИТОГО:

```
✅ Таблица создана
✅ Данные скопированы (3 транскрипции)
✅ API endpoint создан
🔄 Backend нужно перезапустить
🔄 Frontend нужно обновить (SmartVideoPlayer.tsx)
🔄 Протестировать субтитры
```

---

**ДАТА:** 2025-12-07  
**СТАТУС:** 🟡 ГОТОВО К ПОДКЛЮЧЕНИЮ (требуется перезапуск + 1 изменение в коде)

**СЛЕДУЮЩИЙ ШАГ:** Перезапусти backend и обнови `SmartVideoPlayer.tsx`! 🚀
