# 🛠️ База Знаний: Решение Проблем onAI Academy Platform

> **Автор:** AI Assistant + Miso  
> **Дата:** 3 декабря 2025  
> **Версия:** 1.0

---

## 📋 Оглавление

1. [Deployment Issues (Vercel & Backend)](#1-deployment-issues)
2. [Module ID Inconsistencies](#2-module-id-inconsistencies)
3. [Database Issues](#3-database-issues)
4. [API Routing Problems](#4-api-routing-problems)
5. [Frontend Bugs](#5-frontend-bugs)
6. [Backend Configuration](#6-backend-configuration)
7. [Automatic Pipeline Setup](#7-automatic-pipeline-setup)
8. [Video Upload & Transcription](#8-video-upload--transcription)

---

## 1. Deployment Issues

### 🔴 Проблема 1.1: Vercel показывает "Success", но сайт отображает старый код

**Симптомы:**
- Vercel deployment status: ✅ Success
- Но на сайте висит старый UI
- API запросы падают или возвращают пустоту
- В production bundle хардкод `http://localhost:3000`

**Диагностика:**
```bash
# Проверить текущий bundle
curl -s "https://onai.academy" | grep -o 'index-[^"]*\.js'

# Проверить Vercel deployment history
# (В UI Vercel → Deployments)

# Проверить переменные окружения
# Vercel Dashboard → Project Settings → Environment Variables
```

**Причина:**
- Отсутствует `VITE_API_URL` в Vercel Environment Variables
- Vite использует fallback `http://localhost:3000` при сборке

**Решение:**
1. Добавить в Vercel Environment Variables:
   ```
   VITE_API_URL=https://api.onai.academy
   ```

2. Обновить `vercel.json` для агрессивного отключения кэша:
   ```json
   {
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "Cache-Control",
             "value": "no-cache, no-store, must-revalidate"
           }
         ]
       }
     ],
     "buildCommand": "rm -rf .vite dist node_modules/.vite && npm ci && npm run build"
   }
   ```

3. Force redeploy:
   ```bash
   git add .
   git commit -m "Force deploy: clear cache"
   git push origin main
   ```

---

### 🔴 Проблема 1.2: Backend не обновляется на DigitalOcean

**Симптомы:**
- `git log --oneline -1` показывает старый коммит
- Backend работает на старом коде
- Новые изменения не применяются

**Диагностика:**
```bash
# Проверить текущий коммит на сервере
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git log --oneline -1"

# Проверить дату сборки
ssh root@207.154.231.30 "ls -la /var/www/onai-integrator-login-main/backend/dist/server.js"
```

**Решение:**
```bash
# Полный deploy backend
ssh root@207.154.231.30 "
  cd /var/www/onai-integrator-login-main && 
  git pull origin main && 
  cd backend && 
  npm install && 
  npm run build && 
  pm2 restart onai-backend && 
  pm2 logs onai-backend --lines 20 --nostream
"
```

**⚠️ Частая ошибка: `tsc: not found`**

Причина: TypeScript не установлен в production зависимостях.

Решение:
```bash
ssh root@207.154.231.30 "
  cd /var/www/onai-integrator-login-main/backend && 
  npm install && 
  npm run build && 
  pm2 restart onai-backend
"
```

---

## 2. Module ID Inconsistencies

### 🔴 Проблема 2.1: Tripwire модули пустые на production

**Симптомы:**
- Локально Tripwire модули: ID 19, 20, 21
- На production Tripwire модули: ID 16, 17, 18
- Уроки привязаны к старым ID (1, 2, 3) или локальным (19, 20, 21)
- На сайте Tripwire уроки не отображаются

**Диагностика:**
```sql
-- Проверить все модули Tripwire (course_id = 13)
SELECT id, title, course_id, order_index
FROM modules
WHERE course_id = 13
ORDER BY order_index;

-- Проверить к каким модулям привязаны уроки
SELECT 
  l.id AS lesson_id,
  l.title,
  l.module_id,
  m.title AS module_title,
  m.course_id
FROM lessons l
JOIN modules m ON l.module_id = m.id
WHERE l.bunny_video_id IS NOT NULL OR l.video_url IS NOT NULL;
```

**Решение:**

1. **Найти правильные Module ID на production:**
   ```sql
   SELECT id, title FROM modules WHERE course_id = 13;
   -- Результат: 16, 17, 18
   ```

2. **Перепривязать уроки:**
   ```sql
   -- Пример: перенос урока 67 в модуль 16
   UPDATE lessons SET module_id = 16 WHERE id = 67;
   UPDATE lessons SET module_id = 17 WHERE id = 68;
   UPDATE lessons SET module_id = 18 WHERE id = 69;
   ```

3. **Обновить frontend код (hardcoded IDs):**

   **Файл:** `src/pages/tripwire/TripwireProductPage.tsx`
   ```typescript
   // ❌ БЫЛО (локальные ID):
   const modules = [
     { id: 19, title: "Модуль 1: Основы" },
     { id: 20, title: "Модуль 2: Практика" },
     { id: 21, title: "Модуль 3: Бизнес" }
   ];

   // ✅ СТАЛО (production ID):
   const modules = [
     { id: 16, title: "Модуль 1: Основы" },
     { id: 17, title: "Модуль 2: Практика" },
     { id: 18, title: "Модуль 3: Бизнес" }
   ];
   ```

   **Файл:** `src/pages/tripwire/TripwireLesson.tsx`
   ```typescript
   // Заменить все упоминания 19/20/21 на 16/17/18
   ```

4. **Обновить backend фильтры:**

   **Файл:** `backend/src/routes/tripwire/transcriptions.ts`
   ```typescript
   // ✅ Динамический запрос вместо хардкода
   const { data: tripwireModules } = await supabase
     .from('modules')
     .select('id')
     .eq('course_id', 13); // Tripwire course_id
   ```

---

## 3. Database Issues

### 🔴 Проблема 3.1: Мёртвые записи видео в БД

**Симптомы:**
- Backend логи: `⚠️ [Auto-Pipeline] Error checking video status (attempt 46): Bunny API error: 404`
- Видео удалено из Bunny вручную, но запись осталась в `video_content`
- Бесконечные попытки проверить статус несуществующего видео

**Диагностика:**
```sql
-- Найти видео которых нет в Bunny
SELECT 
  vc.id,
  vc.bunny_video_id,
  vc.lesson_id,
  l.title
FROM video_content vc
JOIN lessons l ON vc.lesson_id = l.id
WHERE vc.bunny_video_id = '9a6424ad-6bca-4b79-ad03-64e4efcc43cf';
```

**Решение:**
```sql
-- Удалить мёртвую запись
DELETE FROM video_content
WHERE bunny_video_id = '9a6424ad-6bca-4b79-ad03-64e4efcc43cf';

-- Очистить bunny_video_id в уроке (если нужно)
UPDATE lessons 
SET bunny_video_id = NULL 
WHERE id = 70;
```

---

### 🔴 Проблема 3.2: Duplicate transcriptions

**Симптомы:**
- У одного видео 2+ записи в `video_transcriptions`
- Одна `completed`, другая `processing`
- Админка показывает некорректное количество

**Диагностика:**
```sql
SELECT 
  id,
  video_id,
  status,
  created_at
FROM video_transcriptions
WHERE video_id = '25edf2b7-b5a7-475a-a5bf-ef40293445a4'
ORDER BY created_at DESC;
```

**Решение:**
```sql
-- Удалить дубликаты (оставить только completed)
DELETE FROM video_transcriptions
WHERE id = 'd24d7c11-0590-4a0a-a285-8aebfddf378c'  -- ID дубликата
AND status = 'processing';
```

---

## 4. API Routing Problems

### 🔴 Проблема 4.1: Frontend использует относительные URL вместо полных

**Симптомы:**
- Frontend делает запрос к `onai.academy/api/...` вместо `api.onai.academy/api/...`
- Получает 404 или неправильные ответы
- Backend работает, но frontend не получает данные

**Пример проблемного кода:**
```typescript
// ❌ ПЛОХО: Относительный URL
const response = await fetch('/api/admin/transcriptions/lessons', {
  headers: {
    'Authorization': `Bearer ${getAuthToken()}`
  }
});
```

**Решение:**

1. **Использовать `apiRequest` helper:**

   **Файл:** `src/utils/apiClient.ts`
   ```typescript
   export async function apiRequest(endpoint: string, options: RequestInit = {}) {
     const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
     const url = `${baseURL}${endpoint}`;
     
     const token = getAuthToken();
     const headers = {
       'Content-Type': 'application/json',
       ...(token && { 'Authorization': `Bearer ${token}` }),
       ...options.headers
     };

     const response = await fetch(url, { ...options, headers });
     if (!response.ok) {
       const error = await response.json();
       throw new Error(error.message || 'API request failed');
     }
     return response.json();
   }
   ```

2. **Обновить frontend код:**
   ```typescript
   // ✅ ХОРОШО: Используем apiRequest
   import { apiRequest, getAuthToken } from '@/utils/apiClient';

   const { data: lessons } = useQuery({
     queryKey: ['admin', 'transcriptions'],
     queryFn: async () => {
       const data = await apiRequest('/api/admin/transcriptions/lessons', {
         method: 'GET'
       });
       return data.lessons;
     }
   });
   ```

**Файлы для проверки:**
- `src/pages/admin/MainPlatformTranscriptions.tsx`
- `src/pages/admin/Transcriptions.tsx` (Tripwire)
- `src/pages/tripwire/admin/Analytics.tsx`
- `src/pages/tripwire/admin/Costs.tsx`
- `src/pages/tripwire/admin/Students.tsx`
- `src/pages/tripwire/admin/Dashboard.tsx`

---

### 🔴 Проблема 4.2: JWT токен неправильно извлекается

**Симптомы:**
- Backend возвращает `401 Unauthorized`
- Frontend логи: `⚠️ Supabase auth token not found`
- API запросы падают с ошибкой авторизации

**Диагностика:**
```javascript
// В консоли браузера
localStorage.getItem('supabase_token')  // ❌ null
localStorage.getItem('sb-arqhkacellqbhjhbebfh-auth-token')  // ✅ есть токен
```

**Причина:**
Неправильный ключ для извлечения токена из localStorage.

**Решение:**

1. **Создать helper функцию:**

   **Файл:** `src/utils/apiClient.ts`
   ```typescript
   export function getAuthToken(): string | null {
     const supabaseAuthToken = localStorage.getItem('sb-arqhkacellqbhjhbebfh-auth-token');
     if (supabaseAuthToken) {
       try {
         const parsedToken = JSON.parse(supabaseAuthToken);
         return parsedToken.access_token || parsedToken.token || null;
       } catch (e) {
         console.error("Error parsing Supabase auth token", e);
         return null;
       }
     }
     return null;
   }
   ```

2. **Заменить все использования:**
   ```typescript
   // ❌ БЫЛО:
   localStorage.getItem('supabase_token')

   // ✅ СТАЛО:
   import { getAuthToken } from '@/utils/apiClient';
   getAuthToken()
   ```

---

## 5. Frontend Bugs

### 🔴 Проблема 5.1: Дублирование создания урока после загрузки видео

**Симптомы:**
- Видео загружается 100%
- Появляется ошибка: `duplicate key value violates unique constraint "idx_lessons_unique_title_per_module"`
- Урок создан в БД, но frontend показывает ошибку
- Транскрибация не запускается

**Причина:**
Frontend вызывает `onSave()` callback ПОСЛЕ того как урок уже создан, что приводит к попытке создать урок дважды.

**Проблемный код:**

**Файл:** `src/components/admin/LessonEditDialog.tsx` (строка ~306)
```typescript
// РЕЖИМ СОЗДАНИЯ
const lessonRes = await api.post('/api/lessons', { ... });
const newLessonId = lessonRes.lesson.id;

// Загрузить видео...
// Загрузить материалы...

setUploadStatus('✅ Урок создан!');
setUploadProgress(100);

// ❌ ПРОБЛЕМА: Повторное создание урока!
if (onSave) {
  await onSave({ title, description });  // <-- Создаёт урок СНОВА!
}

onClose();
```

**Решение:**

**Файл:** `src/components/admin/LessonEditDialog.tsx`
```typescript
setUploadStatus('✅ Урок создан!');
setUploadProgress(100);

// ✅ НЕ вызываем onSave при создании - урок УЖЕ создан выше!
// if (onSave) {
//   await onSave({ title, description });
// }

onClose();
```

**Аналогично для Tripwire:**
- `src/components/tripwire/TripwireLessonEditDialog.tsx`

---

### 🔴 Проблема 5.2: Sidebar toggle не работает

**Симптомы:**
- Кнопка "Скрыть меню" не работает
- Sidebar не сворачивается/разворачивается
- Console ошибки: `Cannot read property 'classList' of null`

**Причина:**
Использование прямого DOM manipulation с `querySelector` вместо React state.

**Проблемный код:**

**Файл:** `src/components/tripwire/TripwireLayout.tsx`
```typescript
// ❌ ПЛОХО: Direct DOM manipulation
const toggleSidebar = () => {
  const sidebar = document.querySelector('.sidebar');
  sidebar?.classList.toggle('collapsed');
};
```

**Решение:**
```typescript
// ✅ ХОРОШО: React state
const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

const toggleSidebar = () => {
  setDesktopSidebarCollapsed(prev => !prev);
};

// В JSX:
<aside className={`sidebar ${desktopSidebarCollapsed ? 'collapsed' : ''}`}>
  {/* ... */}
</aside>
```

---

## 6. Backend Configuration

### 🔴 Проблема 6.1: Environment variables не загружаются PM2

**Симптомы:**
- Backend логи: `Missing environment variable for assistant: TRIPWIRE`
- `BUNNY_STREAM_CDN_HOSTNAME: undefined`
- Функционал не работает, хотя переменные есть в `.env`

**Диагностика:**
```bash
# Проверить .env на сервере
ssh root@207.154.231.30 "cat /var/www/onai-integrator-login-main/backend/.env | grep TRIPWIRE"

# Проверить PM2 environment
ssh root@207.154.231.30 "pm2 env 0"
```

**Решение:**
```bash
# Restart PM2 с обновлением env
ssh root@207.154.231.30 "pm2 restart onai-backend --update-env"

# Или restart всех процессов
ssh root@207.154.231.30 "pm2 restart all --update-env"
```

**Важные переменные для проверки:**
```bash
# Backend .env должен содержать:
OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID=asst_xxx
BUNNY_STREAM_CDN_HOSTNAME=video.onai.academy
BUNNY_STREAM_API_KEY=xxx
BUNNY_STREAM_LIBRARY_ID=551815
GROQ_API_KEY=xxx
```

---

### 🔴 Проблема 6.2: CORS ошибки

**Симптомы:**
- Frontend консоль: `CORS policy: No 'Access-Control-Allow-Origin' header`
- API запросы падают с 401 или CORS error

**Решение:**

**Файл:** `backend/src/server.ts`
```typescript
const allowedOrigins = [
  'https://onai.academy',
  'http://localhost:8080',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

---

## 7. Automatic Pipeline Setup

### ✅ Как работает автоматическая обработка видео

**Шаги:**
1. **Загрузка видео** → Bunny Stream
2. **Автопроверка статуса** (каждые 30 сек)
3. Когда `encodeProgress === 100`:
   - **Транскрибация** → Groq Whisper
   - **Генерация описания** → Groq Llama
   - **Генерация советов** → Groq Llama
4. **Логирование затрат**

**Файл:** `backend/src/services/transcriptionService.ts` (строка ~153)

```typescript
export async function transcribeVideo(videoId: string, lessonId: number): Promise<void> {
  // ... транскрибация через Groq Whisper ...

  // ✅ АВТОМАТИЧЕСКИ ТРИГГЕРИМ AI ГЕНЕРАЦИЮ
  triggerAIGeneration(videoId).catch(err => {
    console.warn(`⚠️ [AI Generator] Failed to auto-generate for ${videoId}:`, err.message);
  });
}

async function triggerAIGeneration(videoId: string) {
  // Найти урок (основная платформа или Tripwire)
  const lesson = await findLessonByVideoId(videoId);
  
  if (lesson) {
    // Генерация описания и советов
    await generateAIContent(lesson.id, lesson.isTripwire);
  }
}
```

**Файл:** `backend/src/routes/ai-lesson-generator.ts`

```typescript
router.post('/generate', authenticateJWT, requireAdmin, async (req, res) => {
  const { lesson_id, is_tripwire } = req.body;
  
  // Генерация через Groq Llama
  const result = await generateLessonAI(lesson_id, is_tripwire);
  
  // Логирование затрат
  if (is_tripwire) {
    await supabase.from('tripwire_ai_costs').insert({
      operation_type: 'lesson_generation',
      model: 'groq-llama-70b',
      tokens_used: result.tokens,
      cost_usd: result.cost
    });
  } else {
    await supabase.from('ai_token_usage').insert({ ... });
  }
});
```

---

### 🔧 Конфигурация AI сервисов

**Groq Whisper (Транскрибация):**
```typescript
// backend/src/services/transcriptionService.ts
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const transcription = await groq.audio.transcriptions.create({
  file: audioFile,
  model: "whisper-large-v3",
  language: "ru"
});
```

**Groq Llama (Генерация контента):**
```typescript
// backend/src/services/groqService.ts
const completion = await groq.chat.completions.create({
  model: "llama-3.3-70b-versatile",
  messages: [
    {
      role: "system",
      content: "Ты - эксперт по созданию образовательного контента..."
    },
    {
      role: "user",
      content: `Транскрипция: ${transcription}`
    }
  ],
  temperature: 0.7,
  max_tokens: 2000
});
```

---

## 8. Video Upload & Transcription

### 🔴 Проблема 8.1: Видео не транскрибируется после загрузки

**Симптомы:**
- Видео загружено 100%
- Админка транскрибаций показывает "0 уроков"
- Транскрибация не запускается автоматически

**Возможные причины:**

1. **Frontend: Дублирование создания урока** (см. Проблема 5.1)
2. **Backend: Отсутствуют зависимости** (`yt-dlp`, `ffmpeg`)
3. **Backend: Неправильная переменная окружения** (`BUNNY_STREAM_CDN_HOSTNAME`)
4. **Frontend: Неправильный API endpoint** (относительный URL)

**Диагностика:**

```bash
# 1. Проверить backend логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 | grep -i transcription"

# 2. Проверить зависимости
ssh root@207.154.231.30 "which yt-dlp && which ffmpeg"

# 3. Проверить env
ssh root@207.154.231.30 "cat /var/www/onai-integrator-login-main/backend/.env | grep BUNNY"

# 4. Проверить API endpoint
curl -H "Authorization: Bearer TOKEN" https://api.onai.academy/api/admin/transcriptions/lessons
```

**Решение:**

1. **Установить зависимости:**
   ```bash
   ssh root@207.154.231.30 "
     apt-get update && 
     apt-get install -y ffmpeg && 
     curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && 
     chmod a+rx /usr/local/bin/yt-dlp
   "
   ```

2. **Добавить env переменную:**
   ```bash
   # В backend/.env
   BUNNY_STREAM_CDN_HOSTNAME=video.onai.academy
   ```

3. **Restart PM2:**
   ```bash
   ssh root@207.154.231.30 "pm2 restart onai-backend --update-env"
   ```

4. **Исправить frontend (если нужно):**
   См. Проблема 4.1 и 5.1.

---

### ✅ Проверка работы транскрибации

**Ожидаемый flow:**

1. **Загрузка видео (0-100%):**
   ```
   📹 Загружено: 50 MB / 100 MB (50%)
   ✅ Видео загружено в Bunny Stream! Начинается обработка...
   ```

2. **Backend автопроверка (каждые 30 сек):**
   ```
   ⏳ [Auto-Pipeline] Checking video status: 25edf2b7-...
   📊 [Auto-Pipeline] Video encoding: 45%
   📊 [Auto-Pipeline] Video encoding: 100%
   ✅ [Auto-Pipeline] Video ready! Starting transcription...
   ```

3. **Транскрибация (2-5 минут):**
   ```
   🎤 [Transcription] Starting for video: 25edf2b7-...
   📥 [Transcription] Downloading audio...
   🤖 [Transcription] Sending to Groq Whisper...
   ✅ [Transcription] Completed! Transcript saved.
   ```

4. **AI Генерация (1-2 минуты):**
   ```
   🤖 [AI Generator] Generating description for lesson 70...
   ✅ [AI Generator] Description generated (250 words)
   🤖 [AI Generator] Generating tips for lesson 70...
   ✅ [AI Generator] Tips generated (3 tips)
   ```

5. **Логирование затрат:**
   ```
   💰 [Cost Logger] Tripwire AI Cost: lesson_transcription - $0.12
   💰 [Cost Logger] Tripwire AI Cost: lesson_generation - $0.05
   ```

---

## 📌 Быстрые команды

### Deployment
```bash
# Full deploy (Frontend + Backend)
cd /Users/miso/onai-integrator-login
npm run build
git add .
git commit -m "Update: [описание]"
git push origin main

# Backend only
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install && npm run build && pm2 restart onai-backend"
```

### Диагностика
```bash
# Проверить Vercel bundle
curl -s "https://onai.academy" | grep -o 'index-[^"]*\.js'

# Проверить backend status
ssh root@207.154.231.30 "pm2 status && pm2 logs onai-backend --lines 20 --nostream"

# Проверить API health
curl https://api.onai.academy/api/health
```

### Database
```sql
-- Найти уроки с видео
SELECT l.id, l.title, l.bunny_video_id, m.course_id 
FROM lessons l 
JOIN modules m ON l.module_id = m.id 
WHERE l.bunny_video_id IS NOT NULL;

-- Проверить транскрибации
SELECT id, video_id, status, created_at 
FROM video_transcriptions 
WHERE status = 'completed' 
ORDER BY created_at DESC 
LIMIT 10;

-- Проверить Tripwire AI затраты
SELECT 
  operation_type, 
  SUM(cost_usd) as total_cost,
  COUNT(*) as operations
FROM tripwire_ai_costs
GROUP BY operation_type;
```

---

## 🎯 Чек-лист перед деплоем

### Frontend
- [ ] `VITE_API_URL` установлен в Vercel Environment Variables
- [ ] Нет хардкода `localhost` в коде
- [ ] Используется `apiRequest` вместо `fetch` с относительными URL
- [ ] `getAuthToken()` используется корректно
- [ ] Build проходит без ошибок (`npm run build`)

### Backend
- [ ] `.env` содержит все необходимые переменные
- [ ] `BUNNY_STREAM_CDN_HOSTNAME` установлен
- [ ] `OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID` установлен
- [ ] `yt-dlp` и `ffmpeg` установлены на сервере
- [ ] PM2 перезапущен с `--update-env`
- [ ] Build проходит без ошибок (`npm run build`)

### Database
- [ ] Module IDs совпадают с production
- [ ] Нет мёртвых записей видео
- [ ] Нет дубликатов транскрибаций

---

## 📞 Контакты и Ресурсы

**Production Endpoints:**
- Frontend: https://onai.academy
- Backend API: https://api.onai.academy
- Database: Supabase (arqhkacellqbhjhbebfh)
- Video Storage: Bunny Stream (Library 551815)
- CDN: video.onai.academy

**SSH Access:**
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
```

**PM2 Commands:**
```bash
pm2 status
pm2 logs onai-backend
pm2 restart onai-backend --update-env
pm2 stop onai-backend
```

---

**Последнее обновление:** 3 декабря 2025, 04:42 MSK  
**Статус:** ✅ Все системы работают




