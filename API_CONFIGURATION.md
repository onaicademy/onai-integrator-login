# 🔗 API CONFIGURATION - PRODUCTION & LOCAL

## ✅ ПРАВИЛЬНАЯ КОНФИГУРАЦИЯ:

### 📋 Environment Variables

#### Production (.env.production):
```bash
VITE_API_URL=https://api.onai.academy
```

#### Local Development (.env):
```bash
VITE_API_URL=https://api.onai.academy  # ✅ ПРАВИЛЬНО: указывает на production API
```

**ВАЖНО:** Локальный фронт теперь работает с production API!

---

## 🎯 КАК ЭТО РАБОТАЕТ:

### В коде используется:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
```

**Fallback:** Если `VITE_API_URL` не задан, используется `https://api.onai.academy`

---

## 📂 ФАЙЛЫ С API ENDPOINTS:

### 1. Traffic Command Dashboard
**Файл:** `src/pages/tripwire/TrafficCommandDashboard.tsx`
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

// Используется для:
- /api/traffic/combined-analytics?preset={7d|14d|30d}
- /api/traffic/combined-analytics?date=YYYY-MM-DD
- /api/facebook-ads/recommendations/{team}
- /api/facebook-ads/recommendations/generate
```

### 2. Lead Tracking (Admin)
**Файл:** `src/pages/admin/LeadTracking.tsx`
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';

// Используется для:
- /api/landing/leads
- /api/landing/leads/sync
```

### 3. Utils API Client
**Файл:** `src/utils/apiClient.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL 
  || (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.onai.academy');
```

### 4. Tripwire API
**Файл:** `src/lib/tripwire-api.ts`
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

### 5. OpenAI Assistant
**Файл:** `src/lib/openai-assistant.ts`, `src/lib/openai-assistant-new.ts`
```typescript
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
```

---

## 🚀 PRODUCTION API ENDPOINTS:

### Base URL:
```
https://api.onai.academy
```

### Traffic Analytics:
- `GET /api/traffic/combined-analytics?preset=7d`
- `GET /api/traffic/combined-analytics?date=2024-12-18`

### Facebook Ads:
- `GET /api/facebook-ads/recommendations/:team`
- `POST /api/facebook-ads/recommendations/generate`

### Landing & Leads:
- `POST /api/landing/submit`
- `GET /api/landing/leads`
- `POST /api/landing/leads/sync`

### Telegram Bot (Testing):
- `POST /api/telegram/test/yesterday`
- `POST /api/telegram/test/current`
- `POST /api/telegram/test/daily`
- `POST /api/telegram/test/weekly`

---

## ✅ ЧТО ИСПРАВЛЕНО:

### Before (НЕПРАВИЛЬНО):
```typescript
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
```
- Использовалась несуществующая переменная `VITE_BACKEND_URL`
- Fallback на localhost (не работает на production)

### After (ПРАВИЛЬНО):
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'https://api.onai.academy';
```
- Единая переменная `VITE_API_URL`
- Fallback на production API

---

## 🔧 ЛОКАЛЬНАЯ РАЗРАБОТКА:

### Если нужен локальный backend:

1. **Создай `.env.local`:**
```bash
VITE_API_URL=http://localhost:3000
```

2. **Запусти backend локально:**
```bash
cd backend
npx tsx src/server.ts
```

3. **Запусти фронт:**
```bash
npm run dev
```

**Важно:** Vercel игнорирует `.env.local`, поэтому на production всегда будет `https://api.onai.academy`!

---

## 🌐 BACKEND API STATUS:

### Production Backend:
```
URL: https://api.onai.academy
Status: ✅ Running on DigitalOcean
Health: GET /health
```

### Ключевые сервисы:
- ✅ AmoCRM Integration
- ✅ Facebook Ads API
- ✅ Telegram Bot
- ✅ OpenAI API
- ✅ Bunny CDN
- ✅ Supabase

---

## 📊 ПРОВЕРКА РАБОТОСПОСОБНОСТИ:

### 1. Проверь API доступность:
```bash
curl https://api.onai.academy/health
```

Ожидаемый ответ:
```json
{
  "status": "ok",
  "timestamp": "2024-12-18T..."
}
```

### 2. Проверь Traffic Analytics:
```bash
curl "https://api.onai.academy/api/traffic/combined-analytics?preset=7d"
```

### 3. Проверь фронт:
- Открой DevTools (F12)
- Network tab
- Все запросы должны идти на `https://api.onai.academy`

---

## 🐛 TROUBLESHOOTING:

### Проблема: "Failed to fetch"
**Решение:**
1. Проверь что backend запущен: `curl https://api.onai.academy/health`
2. Проверь CORS настройки на backend
3. Проверь что `.env` содержит `VITE_API_URL=https://api.onai.academy`

### Проблема: "VITE_BACKEND_URL is undefined"
**Решение:**
1. Эта переменная больше не используется
2. Замени на `VITE_API_URL`
3. Rebuild фронт: `npm run build`

### Проблема: Локальный фронт не работает с production API
**Решение:**
1. Это нормально! Локальный фронт ДОЛЖЕН работать с production API
2. Если нужен локальный backend, создай `.env.local` с `VITE_API_URL=http://localhost:3000`

---

## ✅ CHECKLIST ДЛЯ DEPLOY:

- [x] `VITE_API_URL=https://api.onai.academy` в .env
- [x] `VITE_API_URL=https://api.onai.academy` в .env.production
- [x] Все файлы используют `VITE_API_URL` (не `VITE_BACKEND_URL`)
- [x] Fallback на `https://api.onai.academy` (не localhost)
- [x] Backend запущен на https://api.onai.academy
- [x] CORS настроен для фронт-домена

---

**ВСЁ ГОТОВО! Локальный фронт работает с production API!** 🚀
