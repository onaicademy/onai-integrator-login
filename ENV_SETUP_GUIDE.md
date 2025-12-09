# 🔐 ENV ФАЙЛЫ - ИНСТРУКЦИЯ ПО НАСТРОЙКЕ

## 📁 Структура ENV файлов в проекте

```
onai-integrator-login/
├── .env                    # ✅ FRONTEND Production (Vercel)
├── .env.local             # ✅ FRONTEND Local Development
└── backend/
    └── .env               # ✅ BACKEND (API Server)
```

---

## 🎯 ШАГ 1: BACKEND ENV (Источник всех ключей)

**Файл:** `/backend/.env`

Этот файл содержит ВСЕ ключи и переменные для:
- Supabase (Main Platform + Tripwire)
- OpenAI API
- AmoCRM
- Bunny Video CDN
- Telegram Bot
- И т.д.

### Где взять ключи:
```bash
# Открой файл:
/Users/miso/onai-integrator-login/backend/.env

# Там найдешь ВСЕ нужные переменные
```

---

## 🎯 ШАГ 2: FRONTEND ENV - Что и откуда брать

### 📄 Файл: `/Users/miso/onai-integrator-login/.env`

**Назначение:** Production фронтенд (используется Vercel)

**Что нужно скопировать из `backend/.env`:**

```bash
# ==============================================
# 🌍 SUPABASE MAIN (Основная платформа)
# ==============================================
# Берем из backend/.env → SUPABASE_URL
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co

# Берем из backend/.env → SUPABASE_ANON_KEY
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# ==============================================
# 🔥 SUPABASE TRIPWIRE (Изолированная база)
# ==============================================
# Берем из backend/.env → TRIPWIRE_SUPABASE_URL
VITE_TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co

# Берем из backend/.env → TRIPWIRE_SUPABASE_ANON_KEY
VITE_TRIPWIRE_SUPABASE_ANON_KEY=eyJhbGci...

# ==============================================
# 🚀 BACKEND API URL
# ==============================================
# Production server
VITE_API_URL=https://api.onai.academy

# ==============================================
# 📹 BUNNY CDN
# ==============================================
# Берем из backend/.env → BUNNY_VIDEO_LIBRARY_ID
VITE_BUNNY_VIDEO_LIBRARY_ID=334697

# Берем из backend/.env → BUNNY_PULL_ZONE
VITE_BUNNY_PULL_ZONE=video.onai.academy

# Берем из backend/.env → BUNNY_CDN_HOSTNAME
VITE_BUNNY_CDN_HOSTNAME=video.onai.academy
```

### 📄 Файл: `/Users/miso/onai-integrator-login/.env.local`

**Назначение:** Local development (твой компьютер)

**Содержимое:**

```bash
# Local development API URL
VITE_API_URL=http://localhost:3000

# Остальные ключи наследуются из .env (не нужно дублировать)
```

---

## 🤖 ИНСТРУКЦИЯ ДЛЯ AI/CURSOR

Если ты AI ассистент, который настраивает этот проект, выполни:

### 1. Прочитай Backend ENV:
```bash
# Команда для AI:
Read file: /Users/miso/onai-integrator-login/backend/.env
```

### 2. Извлеки нужные переменные:

Из backend/.env возьми:
- `SUPABASE_URL` → переименуй в `VITE_SUPABASE_URL`
- `SUPABASE_ANON_KEY` → переименуй в `VITE_SUPABASE_ANON_KEY`
- `TRIPWIRE_SUPABASE_URL` → переименуй в `VITE_TRIPWIRE_SUPABASE_URL`
- `TRIPWIRE_SUPABASE_ANON_KEY` → переименуй в `VITE_TRIPWIRE_SUPABASE_ANON_KEY`
- `BUNNY_VIDEO_LIBRARY_ID` → переименуй в `VITE_BUNNY_VIDEO_LIBRARY_ID`
- `BUNNY_PULL_ZONE` → переименуй в `VITE_BUNNY_PULL_ZONE`
- `BUNNY_CDN_HOSTNAME` → переименуй в `VITE_BUNNY_CDN_HOSTNAME`

### 3. Создай/обнови `.env`:
```bash
# Команда для AI:
Write file: /Users/miso/onai-integrator-login/.env
# С содержимым из шага 2
```

### 4. Создай `.env.local`:
```bash
# Команда для AI:
Write file: /Users/miso/onai-integrator-login/.env.local
VITE_API_URL=http://localhost:3000
```

---

## 🔐 ПРАВИЛА БЕЗОПАСНОСТИ

### ❌ НЕ добавляй в `.env` (фронтенд):
- `SERVICE_ROLE_KEY` - только для backend!
- `OPENAI_API_KEY` - только для backend!
- `AMOCRM_API_KEY` - только для backend!
- `TELEGRAM_BOT_TOKEN` - только для backend!

### ✅ Добавляй в `.env` (фронтенд):
- Только `ANON_KEY` (публичные ключи)
- Только `URL` для CDN/Supabase
- Только `VITE_*` переменные

---

## 📝 БЫСТРАЯ ШПАРГАЛКА

### Префиксы для переменных:

| Файл | Префикс | Пример |
|------|---------|--------|
| `backend/.env` | Нет префикса | `SUPABASE_URL=...` |
| `.env` (frontend) | `VITE_` | `VITE_SUPABASE_URL=...` |

### Почему `VITE_`?
Vite (наш сборщик фронтенда) требует префикс `VITE_` для всех переменных, которые должны быть доступны в браузере.

---

## 🚀 ПРОВЕРКА ПОСЛЕ НАСТРОЙКИ

### 1. Backend работает:
```bash
cd backend
npm run dev

# Проверь:
curl http://localhost:3000/api/health
# Ожидается: {"status":"ok"}
```

### 2. Frontend работает:
```bash
npm run dev

# Открой браузер:
http://localhost:5173

# Проверь консоль - должны быть логи от Supabase
```

### 3. Проверь переменные в браузере:
```javascript
// Открой консоль браузера (F12) и выполни:
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_API_URL);

// Должны показаться правильные URL
```

---

## ⚠️ TROUBLESHOOTING

### Проблема: "VITE_SUPABASE_URL is undefined"
**Решение:** 
1. Проверь что в `.env` есть `VITE_` префикс
2. Перезапусти dev сервер: `npm run dev`
3. Vite кэширует env - сделай hard refresh

### Проблема: "Failed to connect to backend"
**Решение:**
1. Проверь что backend запущен: `pm2 status` (production) или `npm run dev` (local)
2. Проверь `VITE_API_URL` в `.env.local` (должен быть `http://localhost:3000`)
3. Проверь firewall/CORS

### Проблема: "Supabase auth error"
**Решение:**
1. Проверь что `VITE_SUPABASE_ANON_KEY` правильный
2. Проверь что URL правильный (https, без слэша в конце)
3. Проверь RLS policies в Supabase Dashboard

---

## 📞 ПОДДЕРЖКА

Если что-то не работает:
1. Проверь backend/.env - там ВСЕ правильные ключи
2. Проверь что скопировал ключи БЕЗ пробелов
3. Проверь что добавил префикс `VITE_`
4. Перезапусти dev серверы

---

**Последнее обновление:** 8 декабря 2025  
**Статус:** ✅ Рабочая конфигурация
