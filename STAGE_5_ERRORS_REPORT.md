# 🔴 STAGE 5: ПОЛНЫЙ ОТЧЁТ ОБ ОШИБКАХ И ПРОБЛЕМАХ

**Дата:** 2025-01-12  
**Статус:** ❌ НЕ РАБОТАЕТ  
**Проблема:** Backend API недоступен + Ошибки в коде

---

## 🎯 ЧТО ПЫТАЛИСЬ СДЕЛАТЬ

**ЦЕЛЬ:** Защитить OpenAI API ключ путём переноса всей логики на Backend сервер.

**ОХВАТ:**
- 🤖 AI-куратор (текстовые сообщения + Whisper микрофон)
- 👨‍🏫 AI-наставник
- 📊 AI-аналитик

---

## 🔴 КРИТИЧЕСКИЕ ОШИБКИ (ТЕКУЩЕЕ СОСТОЯНИЕ)

### ОШИБКА №1: Backend API недоступен
```
❌ Backend API недоступен. Убедитесь, что сервер запущен на http://localhost:3000

POST http://localhost:3000/api/openai/threads
net::ERR_CONNECTION_REFUSED
```

**Причина:** Backend сервер НЕ ЗАПУЩЕН!

**Что видно в DevTools:**
- ❌ POST `http://localhost:3000/api/openai/threads` - FAILED
- ❌ POST `http://localhost:3000/api/openai/audio/transcriptions` - FAILED
- 🔴 Все запросы падают с `ERR_CONNECTION_REFUSED`

**Локация ошибок:**
- `openai-assistant.ts:73:22` - getOrCreateThread()
- `openai-assistant.ts:81` - Ошибка при создании Thread
- `openai-assistant.ts:224` - Ошибка при отправке сообщения
- `openai-assistant.ts:321:28` - Whisper транскрипция
- `openai-assistant.ts:357` - Ошибка транскрипции

---

### ОШИБКА №2: Дублирование URL (ИСПРАВЛЕНА)

**БЫЛО (неправильно):**
```typescript
// openai-assistant.ts
const API_BASE_URL = 'http://localhost:3000';

const response = await api.post(`${API_BASE_URL}/api/openai/threads`, {});
```

**Проблема:** `apiClient.ts` уже добавляет `baseUrl`, получалось:
```
http://localhost:3000 + http://localhost:3000/api/openai/threads
= http://localhost:3000http://localhost:3000/api/openai/threads ❌
```

**СТАЛО (исправлено):**
```typescript
// openai-assistant.ts
const response = await api.post('/api/openai/threads', {});
```

**Статус:** ✅ ИСПРАВЛЕНО (но Backend всё равно не запущен)

---

### ОШИБКА №3: TypeError в transcribeAudioToText

```
❌ TypeError: Failed to fetch
at transcribeAudioToText (openai-assistant.ts:321:28)
```

**Причина:** Backend недоступен, но также были проблемы с URL.

**ЧТО ИСПРАВИЛИ:**
```typescript
// БЫЛО:
const response = await fetch(`${API_BASE_URL}/api/openai/audio/transcriptions`, {...});

// СТАЛО:
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {...});
```

**Статус:** ✅ ИСПРАВЛЕНО в коде, но Backend не запущен

---

## 📋 ХРОНОЛОГИЯ ИЗМЕНЕНИЙ

### ИТЕРАЦИЯ 1: Создание Backend структуры
**Файлы созданы:**
- ✅ `backend/src/config/openai.ts` - OpenAI клиент
- ✅ `backend/src/services/openaiService.ts` - Бизнес-логика
- ✅ `backend/src/controllers/openaiController.ts` - Контроллеры
- ✅ `backend/src/routes/openai.ts` - API роуты
- ✅ `backend/src/server.ts` - Подключение роутов

**Статус:** ✅ Файлы созданы, структура правильная

---

### ИТЕРАЦИЯ 2: Рефакторинг Frontend

**Файл:** `src/lib/openai-assistant.ts`

**Изменения:**
1. ❌ УДАЛЁН: Прямая инициализация OpenAI клиента
2. ✅ ДОБАВЛЕНО: HTTP вызовы к Backend через `api` клиент
3. ⚠️ ОШИБКА: Дублирование `API_BASE_URL`

**Проблемный код (ВЕРСИЯ 1):**
```typescript
import { api } from '@/utils/apiClient';

// ❌ ПРОБЛЕМА: Дублирование URL!
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Использование:
const response = await api.post(`${API_BASE_URL}/api/openai/threads`, {});
//                                 ^^^^^^^^^^^^^^
//                                 apiClient.ts уже добавляет baseUrl!
```

**Что получалось:**
```
apiClient.ts добавляет: http://localhost:3000
Мы добавляем еще раз:   http://localhost:3000/api/openai/threads
ИТОГО:                  http://localhost:3000http://localhost:3000/api/openai/threads ❌
```

**Статус:** ❌ ПРОБЛЕМА обнаружена

---

### ИТЕРАЦИЯ 3: Исправление дублирования URL

**Изменения в `src/lib/openai-assistant.ts`:**

```diff
- const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Все вызовы API:
- await api.post(`${API_BASE_URL}/api/openai/threads`, {});
+ await api.post('/api/openai/threads', {});

- await api.post(`${API_BASE_URL}/api/openai/threads/${threadId}/messages`, {...});
+ await api.post(`/api/openai/threads/${threadId}/messages`, {...});

- await api.post(`${API_BASE_URL}/api/openai/threads/${threadId}/runs`, {...});
+ await api.post(`/api/openai/threads/${threadId}/runs`, {...});

- await api.get(`${API_BASE_URL}/api/openai/threads/${threadId}/runs/${runId}`);
+ await api.get(`/api/openai/threads/${threadId}/runs/${runId}`);

- await api.get(`${API_BASE_URL}/api/openai/threads/${threadId}/messages?limit=1&order=desc`);
+ await api.get(`/api/openai/threads/${threadId}/messages?limit=1&order=desc`);
```

**Whisper (исключение - не использует `api` клиент):**
```typescript
// Whisper использует прямой fetch() для загрузки файлов
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {...});
```

**Статус:** ✅ ИСПРАВЛЕНО

---

### ИТЕРАЦИЯ 4: Добавление Whisper поддержки

**Backend изменения:**

1. **Установлен multer:**
```bash
npm install multer @types/multer --prefix C:\onai-integrator-login\backend
```

2. **Добавлена функция в `openaiService.ts`:**
```typescript
export async function transcribeAudio(audioFile: File, language: string = 'ru', prompt?: string) {
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: language,
    response_format: 'text',
    prompt: prompt,
  });
  return transcription as string;
}
```

3. **Добавлен контроллер в `openaiController.ts`:**
```typescript
export async function transcribeAudio(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing audio file' });
  }
  
  const audioFile = new File([req.file.buffer], req.file.originalname, {
    type: req.file.mimetype,
  });
  
  const transcription = await openaiService.transcribeAudio(audioFile, language, prompt);
  res.json({ text: transcription, duration: req.body.duration });
}

export { upload }; // multer middleware
```

4. **Добавлен роут в `openai.ts`:**
```typescript
router.post('/audio/transcriptions', upload.single('audio'), openaiController.transcribeAudio);
```

**Frontend изменения:**

Функция `transcribeAudioToText()` полностью переписана:
```typescript
export async function transcribeAudioToText(audioBlob: Blob, userId?: string, threadId?: string): Promise<string> {
  // Создание FormData
  const formData = new FormData();
  const audioFile = new File([audioBlob], `recording.${fileExtension}`, {
    type: audioBlob.type,
  });
  formData.append('audio', audioFile);
  formData.append('language', 'ru');
  formData.append('duration', audioDurationSeconds.toString());
  
  // Отправка на Backend
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  const result = await response.json();
  return result.text;
}
```

**Статус:** ✅ КОД ГОТОВ, но Backend не запущен

---

## 📊 ТЕКУЩЕЕ СОСТОЯНИЕ ФАЙЛОВ

### Backend структура (✅ ГОТОВА)
```
backend/
├── src/
│   ├── config/
│   │   └── openai.ts                    ← OpenAI клиент (12 строк)
│   ├── services/
│   │   └── openaiService.ts             ← OpenAI логика (109 строк)
│   ├── controllers/
│   │   └── openaiController.ts          ← API handlers (162 строки)
│   ├── routes/
│   │   └── openai.ts                    ← API роуты (47 строк)
│   ├── middleware/
│   │   ├── auth.ts                      ← JWT проверка
│   │   └── errorHandler.ts              ← Error handling
│   └── server.ts                        ← Express сервер (подключены роуты)
├── .env                                 ← OPENAI_API_KEY (НУЖНО ДОБАВИТЬ!)
└── package.json                         ← multer добавлен
```

### Frontend структура (✅ ГОТОВА)
```
src/
├── lib/
│   ├── openai-assistant.ts              ← ✅ ИСПРАВЛЕНА (410 строк)
│   └── openai-assistant-BACKUP-OLD.ts   ← Backup старой версии
└── utils/
    └── apiClient.ts                     ← HTTP клиент (133 строки)
```

### Environment файлы

**Frontend `.env`:**
```env
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SITE_URL=http://localhost:8080
VITE_API_BASE_URL=http://localhost:3000
```
✅ Правильно

**Backend `.env`:**
```env
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=x7Y7J...
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
OPENAI_API_KEY=your_openai_api_key_here  ← ⚠️ НУЖНО ЗАМЕНИТЬ!
```
⚠️ Требует замены API ключа

---

## 🔍 АНАЛИЗ ОШИБОК (ПОЧЕМУ НЕ РАБОТАЕТ)

### Причина №1: Backend не запущен (КРИТИЧНО!)
**Проблема:** Команда `npm run dev` не была выполнена в папке `backend/`

**Как проверить:**
```bash
# Windows PowerShell
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
# Результат: пусто = Backend НЕ запущен ❌
```

**Что происходит:**
1. Frontend пытается обратиться к `http://localhost:3000/api/openai/threads`
2. Backend не слушает порт 3000
3. Браузер получает `ERR_CONNECTION_REFUSED`
4. AI-куратор показывает "Backend API недоступен"
5. Whisper транскрипция падает с TypeError

---

### Причина №2: OpenAI API ключ не установлен
**Проблема:** В `backend/.env` стоит placeholder: `your_openai_api_key_here`

**Что происходит:**
1. Backend при старте проверяет наличие `OPENAI_API_KEY`
2. Видит значение, считает что ключ есть
3. При реальном вызове OpenAI API получит ошибку `401 Unauthorized`

**Решение:** Заменить на НОВЫЙ ключ (старый скомпрометирован)

---

### Причина №3: Старый OpenAI ключ скомпрометирован
**Проблема:** Ключ был виден в браузере и в чате с AI

**Скомпрометированный ключ:**
```
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
```

**НЕОБХОДИМО:**
1. Зайти на https://platform.openai.com/api-keys
2. Удалить этот ключ
3. Создать НОВЫЙ ключ
4. Добавить в `backend/.env`

---

## 🐛 СПЕЦИФИЧЕСКИЕ ОШИБКИ В КОДЕ

### Ошибка в openai-assistant.ts (ИСПРАВЛЕНА)

**Проблема:** Дублирование baseUrl

**БЫЛО:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// apiClient.ts делает:
const url = `${baseUrl}${endpoint}`;
// где baseUrl = 'http://localhost:3000'
// endpoint = '${API_BASE_URL}/api/openai/threads'

// ИТОГО:
// http://localhost:3000 + http://localhost:3000/api/openai/threads
// = http://localhost:3000http://localhost:3000/api/openai/threads ❌
```

**ИСПРАВЛЕНО:**
```typescript
// Убрали API_BASE_URL из большинства мест
await api.post('/api/openai/threads', {});
// apiClient добавит baseUrl автоматически ✅
```

**Исключение:** Whisper использует прямой `fetch()`, там оставили:
```typescript
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {...});
```

---

## 📝 ПОЛНЫЙ СПИСОК ОШИБОК ИЗ CONSOLE

### 1. Ошибка создания Thread
```
❌ POST http://localhost:3000/api/openai/threads
net::ERR_CONNECTION_REFUSED

TypeError: Failed to fetch
  at apiRequest (apiClient.ts:48:28)
  at Object.post (apiClient.ts:96:5)
  at getOrCreateThread (openai-assistant.ts:73:32)
  at sendMessageToAI (openai-assistant.ts:109:22)
```

### 2. Ошибка отправки сообщения
```
❌ Ошибка при отправке сообщения:
Backend API недоступен. Убедитесь, что сервер запущен на http://localhost:3000

at openai-assistant.ts:224
at sendMessage (AIChatDialog.tsx:326:26)
```

### 3. Ошибка Whisper транскрипции
```
❌ POST http://localhost:3000/api/openai/audio/transcriptions
net::ERR_CONNECTION_REFUSED

❌ Ошибка транскрипции:
TypeError: Failed to fetch
  at transcribeAudioToText (openai-assistant.ts:321:28)
  at handleStopRecording (AIChatDialog.tsx:666:29)
  at handleMicrophoneToggle (AIChatDialog.tsx:714:7)
```

### 4. Цепочка ошибок в AIChatDialog
```
❌ Ошибка при создании Thread: Error:
Backend API недоступен. Убедитесь, что сервер запущен на http://localhost:3000
  at apiRequest (apiClient.ts:74:13)
  at getOrCreateThread (openai-assistant.ts:73:22)
  at sendMessageToAI (openai-assistant.ts:109:22)
```

---

## ✅ ЧТО РАБОТАЕТ

1. ✅ **Структура Backend** - все файлы созданы правильно
2. ✅ **JWT middleware** - auth.ts правильно настроен
3. ✅ **OpenAI config** - openai.ts корректен
4. ✅ **Роуты** - `/api/openai/*` зарегистрированы в server.ts
5. ✅ **Frontend код** - openai-assistant.ts исправлен (URLs правильные)
6. ✅ **apiClient** - корректно добавляет baseUrl
7. ✅ **Multer** - установлен для загрузки аудио файлов
8. ✅ **Environment файлы** - `.env` настроены (кроме OpenAI ключа)

---

## ❌ ЧТО НЕ РАБОТАЕТ

1. ❌ **Backend сервер НЕ ЗАПУЩЕН** - порт 3000 не слушается
2. ❌ **OpenAI API ключ** - стоит placeholder
3. ❌ **AI-куратор** - не может отправить сообщение (Backend недоступен)
4. ❌ **Whisper** - не может транскрибировать (Backend недоступен)
5. ❌ **AI-наставник** - та же проблема (Backend недоступен)
6. ❌ **AI-аналитик** - та же проблема (Backend недоступен)

---

## 🔧 ЧТО НУЖНО СДЕЛАТЬ (ПОШАГОВО)

### ШАГ 1: Ротировать OpenAI API ключ (КРИТИЧНО!)
```
1. Зайти: https://platform.openai.com/api-keys
2. Найти ключ: sk-proj-iNODdy8JqyfC...
3. Удалить его (скомпрометирован!)
4. Создать НОВЫЙ ключ
5. Скопировать новый ключ
```

### ШАГ 2: Добавить ключ в Backend .env
```bash
# Открыть файл
notepad C:\onai-integrator-login\backend\.env

# Найти строку:
OPENAI_API_KEY=your_openai_api_key_here

# Заменить на:
OPENAI_API_KEY=sk-proj-НОВЫЙ-КЛЮЧ
```

### ШАГ 3: Запустить Backend (ВАЖНО!)
```bash
# Открыть терминал в Cursor или PowerShell
cd C:\onai-integrator-login\backend

# Установить зависимости (если еще не установлены)
npm install

# Запустить в dev режиме
npm run dev

# ОЖИДАЕТСЯ:
# ✅ OpenAI client initialized
# ✅ Supabase client initialized
# 🚀 Backend API запущен на http://localhost:3000
```

### ШАГ 4: Убедиться что Frontend запущен
```bash
# Открыть ВТОРОЙ терминал
cd C:\onai-integrator-login

# Запустить Frontend
npm run dev

# ОЖИДАЕТСЯ:
# VITE v5.x.x ready in xxx ms
# ➜ Local: http://localhost:8080
```

### ШАГ 5: Тестирование
```
1. Открыть браузер: http://localhost:8080
2. Авторизоваться
3. Перейти в AI-куратора
4. Отправить текстовое сообщение: "Привет!"
5. Проверить DevTools → Console:
   ✅ Нет ошибок ERR_CONNECTION_REFUSED
   ✅ POST http://localhost:3000/api/openai/threads - 200 OK
   ✅ OpenAI ключ НЕ виден в Network вкладке
6. Попробовать микрофон 🎤:
   ✅ Запись работает
   ✅ Транскрипция проходит успешно
   ✅ Текст распознаётся
```

---

## 📊 ВЕРСИИ КОДА

### openai-assistant.ts - ВЕРСИЯ 1 (ПРОБЛЕМНАЯ)
```typescript
// ❌ ПРОБЛЕМА: Дублирование URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export async function getOrCreateThread(): Promise<string> {
  const response = await api.post<{ id: string }>(`${API_BASE_URL}/api/openai/threads`, {});
  //                                               ^^^^^^^^^^^^^^
  //                                               apiClient уже добавляет baseUrl!
}
```

### openai-assistant.ts - ВЕРСИЯ 2 (ИСПРАВЛЕННАЯ)
```typescript
// ✅ ИСПРАВЛЕНО: Убрали дублирование
export async function getOrCreateThread(): Promise<string> {
  const response = await api.post<{ id: string }>('/api/openai/threads', {});
  //                                               ^^^^^^^^^^^^^^^^^^^^^^^
  //                                               apiClient добавит baseUrl автоматически
}

// Whisper (исключение):
export async function transcribeAudioToText(audioBlob: Blob): Promise<string> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/openai/audio/transcriptions`, {...});
  //                             ^^^^^^^^
  //                             Здесь НУЖНО, т.к. используем fetch напрямую
}
```

---

## 🔍 ПОЧЕМУ МОГЛО НЕ ПОЛУЧИТЬСЯ

### Вариант 1: Backend не запущен (ТЕКУЩАЯ ПРОБЛЕМА)
**Признаки:**
- ❌ `ERR_CONNECTION_REFUSED`
- ❌ "Backend API недоступен"
- ❌ Все запросы к `localhost:3000` падают

**Решение:** Запустить `npm run dev` в папке `backend/`

### Вариант 2: Backend запущен на другом порту
**Признаки:**
- ❌ `ERR_CONNECTION_REFUSED` на порту 3000
- ✅ Backend работает, но на порту 3001 или 5000

**Решение:** 
1. Проверить `backend/.env` → `PORT=3000`
2. Проверить frontend `.env` → `VITE_API_BASE_URL=http://localhost:3000`
3. Перезапустить Backend

### Вариант 3: CORS ошибки
**Признаки:**
- ❌ `Access-Control-Allow-Origin` ошибка
- ❌ Backend запущен, но Frontend не может обратиться

**Решение:** Проверить `backend/src/server.ts`:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
```

### Вариант 4: JWT токен отсутствует
**Признаки:**
- ❌ `401 Unauthorized`
- ❌ "Missing or invalid JWT token"

**Решение:** 
1. Проверить авторизацию на Frontend
2. Проверить `localStorage.getItem('supabase_token')`
3. Переавторизоваться

### Вариант 5: OpenAI API ключ неправильный
**Признаки:**
- ✅ Backend запущен
- ✅ Thread создаётся
- ❌ Run падает с ошибкой `401 Unauthorized` от OpenAI

**Решение:** Проверить `backend/.env` → `OPENAI_API_KEY`

---

## 🎯 БЫСТРАЯ ДИАГНОСТИКА

### Проверка #1: Backend запущен?
```bash
# Windows PowerShell
Test-NetConnection -ComputerName localhost -Port 3000

# Ожидается:
# TcpTestSucceeded : True ✅

# Если False:
# Backend НЕ запущен! ❌
```

### Проверка #2: Backend логи
```bash
# Если Backend запущен, должны видеть:
✅ OpenAI client initialized
✅ Supabase client initialized
🚀 Backend API запущен на http://localhost:3000
Frontend URL: http://localhost:8080
Environment: development
```

### Проверка #3: Frontend может обратиться к Backend?
```bash
# В браузере DevTools → Console:
fetch('http://localhost:3000/api/health')
  .then(r => r.json())
  .then(console.log)

# Ожидается:
# {status: "ok", timestamp: "2025-01-12T..."}
```

---

## 📝 ИТОГИ

### ✅ ЧТО СДЕЛАНО ПРАВИЛЬНО:
1. ✅ Backend структура создана корректно
2. ✅ OpenAI Service, Controller, Routes - всё правильно
3. ✅ Whisper поддержка добавлена (multer + endpoint)
4. ✅ Frontend рефакторинг выполнен
5. ✅ Дублирование URL исправлено
6. ✅ JWT авторизация настроена
7. ✅ CORS настроен
8. ✅ Environment файлы созданы

### ❌ ЧТО НЕ РАБОТАЕТ:
1. ❌ Backend сервер НЕ ЗАПУЩЕН (главная проблема)
2. ❌ OpenAI API ключ не заменён на новый
3. ❌ Тестирование не выполнено (т.к. Backend не запущен)

### 🔧 ЧТО НУЖНО СДЕЛАТЬ:
1. 🔑 Ротировать OpenAI ключ
2. 🚀 Запустить Backend (`npm run dev`)
3. 🧪 Протестировать AI-куратора
4. 🎤 Протестировать Whisper микрофон
5. ✅ Убедиться что ключ не виден в DevTools

---

## 🚨 КРИТИЧНЫЕ МОМЕНТЫ

### Безопасность:
- ❌ **Старый OpenAI ключ СКОМПРОМЕТИРОВАН** - обязательно удалить!
- ✅ Новый ключ должен быть ТОЛЬКО в `backend/.env`
- ✅ Frontend `.env` НЕ должен содержать OpenAI ключ

### Запуск:
- ❗ Backend ДОЛЖЕН быть запущен ДО тестирования
- ❗ Порты: Backend - 3000, Frontend - 8080
- ❗ CORS: Frontend URL должен совпадать с `FRONTEND_URL` в Backend .env

### Тестирование:
- ❗ Проверять DevTools → Network после каждого действия
- ❗ OpenAI ключ НЕ должен быть виден в запросах
- ❗ Все запросы должны идти на `localhost:3000/api/...`

---

**ДАТА СОЗДАНИЯ ОТЧЁТА:** 2025-01-12  
**СТАТУС:** ❌ Backend не запущен, требуется исправление  
**СЛЕДУЮЩИЙ ШАГ:** Запустить Backend с правильным OpenAI ключом

