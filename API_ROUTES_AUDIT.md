# API ROUTES AUDIT - Tripwire Platform
## Дата: 2025-12-02

### ✅ TRIPWIRE ROUTES (проверено)

| Frontend Call | Backend Route | Status | Base URL |
|---------------|---------------|--------|----------|
| `/api/tripwire/login` | `tripwire.ts: POST /login` | ✅ | `import.meta.env.VITE_API_URL` |
| `/api/tripwire/verify` | `tripwire.ts: POST /verify` | ✅ | `import.meta.env.VITE_API_URL` |
| `/api/tripwire/lessons?module_id=` | `tripwire-lessons.ts: GET /lessons` | ✅ | `api.get()` |
| `/api/tripwire/lessons/:id` | `tripwire-lessons.ts: GET /lessons/:id` | ✅ | `api.get()` |
| `/api/tripwire/videos/:lessonId` | `tripwire-lessons.ts: GET /videos/:lessonId` | ✅ | `api.get()` |
| `/api/tripwire/materials/:lessonId` | `tripwire-lessons.ts: GET /materials/:lessonId` | ✅ | `api.get()` |
| `/api/tripwire/materials/:id` (DELETE) | `tripwire-lessons.ts: DELETE /materials/:id` | ✅ | `api.delete()` |
| `/api/tripwire/materials/upload` | `tripwire-lessons.ts: POST /materials/upload` | ✅ | `api.post()` |
| `/api/tripwire/progress/:lessonId` | `tripwire-lessons.ts: GET /progress/:lessonId` | ✅ | `api.get()` |
| `/api/tripwire/progress` (POST) | `tripwire-lessons.ts: POST /progress` | ✅ | `api.post()` |
| `/api/tripwire/complete` | `tripwire-lessons.ts: POST /complete` | ✅ | `api.post()` |
| `/api/tripwire/module-progress/:moduleId` | `tripwire-lessons.ts: GET /module-progress/:moduleId` | ✅ | `api.get()` |
| `/api/tripwire/unlock-achievement` | `tripwire-lessons.ts: POST /unlock-achievement` | ✅ | `api.post()` |
| `/api/tripwire/module-unlocks/:userId` | `tripwire.ts: GET /module-unlocks/:userId` | ✅ | `api.get()` |
| `/api/tripwire/module-unlocks/mark-shown` | `tripwire.ts: POST /module-unlocks/mark-shown` | ✅ | `api.post()` |

### ✅ TRIPWIRE ADMIN ROUTES (проверено)

| Frontend Call | Backend Route | Status | Base URL |
|---------------|---------------|--------|----------|
| `/api/tripwire/admin/stats` | `tripwire/admin.ts: GET /stats` | ✅ FIXED | `fetch()` + localStorage token |
| `/api/tripwire/admin/students` | `tripwire/admin.ts: GET /students` | ✅ | `fetch()` + localStorage token |
| `/api/tripwire/admin/costs` | `tripwire/admin.ts: GET /costs` | ✅ FIXED | `fetch()` + localStorage token |
| `/api/tripwire/admin/funnel` | `tripwire/admin.ts: GET /funnel` | ✅ | `fetch()` + localStorage token |
| `/api/tripwire/admin/transcriptions/lessons` | `tripwire/transcriptions.ts: GET /lessons` | ✅ | `fetch()` + localStorage token |
| `/api/tripwire/admin/transcriptions/transcribe-all` | `tripwire/transcriptions.ts: POST /transcribe-all` | ✅ FIXED | `fetch()` + localStorage token |

### ✅ MAIN PLATFORM ROUTES (не меняли)

| Frontend Call | Backend Route | Status |
|---------------|---------------|--------|
| `/api/courses` | `courses.ts` | ✅ |
| `/api/lessons` | `lessons.ts` | ✅ |
| `/api/modules` | `modules.ts` | ✅ |
| `/api/progress` | `progress.ts` | ✅ |
| `/api/analytics` | `analytics.ts` | ✅ |
| `/api/stream/upload` | `streamUpload.ts` | ✅ |

### 🔧 ИСПРАВЛЕНИЯ (сегодня)

1. **Backend: tripwire/admin.ts**
   - ✅ Исправлен хардкод `module_id=1` → динамический запрос `course_id=13`
   - ✅ `/costs` endpoint переключен с `tripwire_ai_costs` → `ai_token_usage`

2. **Backend: tripwire/transcriptions.ts**
   - ✅ Исправлен хардкод `module_id=1` → динамический запрос `course_id=13`

3. **Frontend: TripwireProductPage.tsx**
   - ✅ Module IDs: 19,20,21 → **16,17,18**

4. **Frontend: TripwireLesson.tsx**
   - ✅ tripwireModules: [19,20,21] → **[16,17,18]**

5. **Frontend: Dashboard.tsx**
   - ✅ Восстановлена карточка "Затраты AI" с реальными данными

### 📝 ENVIRONMENT VARIABLES

Все frontend API calls используют:
- `import.meta.env.VITE_API_URL` (fallback: `http://localhost:3000`)
- Production: `VITE_API_URL=https://api.onai.academy` (установлено в Vercel)

### ✅ CORS (Backend)

```typescript
allowedOrigins = [
  'https://onai.academy',
  'http://localhost:8080',
  'http://localhost:5173',
  process.env.FRONTEND_URL
]
```

### 🎯 СТАТУС: ГОТОВО К ДЕПЛОЮ

Все роуты проверены и синхронизированы.

