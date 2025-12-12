# 📋 ENV FILES USAGE GUIDE

## ⚡ ВАЖНО: Структура Environment файлов

```
C:\onai-integrator-login\onai-integrator-login\
├── .env                    ← FRONTEND ENV (VITE_* публичные ключи)
└── backend\
    └── env.env             ← BACKEND ENV (ВСЕ приватные ключи: Supabase, OpenAI, AmoCRM, Bunny, Telegram)
```

**🔥 КРИТИЧНО:**
- **Backend читает ТОЛЬКО из `backend/env.env`** (dotenv path настроен в server.ts)
- **НЕ создавай `backend/.env`** - это вызовет конфликт!
- **Frontend читает ТОЛЬКО из `.env` в корне** (автоматически Vite)

---

## 🎯 BACKEND Environment Variables

**Файл:** `backend/env.env`

**Местоположение:** `C:\onai-integrator-login\onai-integrator-login\backend\env.env`

**Используется в:** Backend API (Express.js server)

**Как загружается:**
```typescript
// backend/src/server.ts (строка 10)
dotenv.config({ path: path.join(__dirname, '..', 'env.env') });
// __dirname = backend/src
// .. = backend
// env.env = backend/env.env
```

**⚠️ ВНИМАНИЕ:**
- Backend читает **ТОЛЬКО `env.env`**, НЕ `.env`!
- После изменения `env.env` ОБЯЗАТЕЛЬНО перезапусти backend: `npm run dev`
- Если создашь `backend/.env` - будет конфликт, удали его!

**Ключи в backend/env.env:**
```bash
# Supabase Main
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...

# Supabase Tripwire
TRIPWIRE_SUPABASE_URL=https://...
TRIPWIRE_SERVICE_ROLE_KEY=...
TRIPWIRE_JWT_SECRET=...
TRIPWIRE_DATABASE_URL=postgresql://...

# AI Services
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=...

# Telegram Bots
TELEGRAM_BOT_TOKEN_MENTOR=...
TELEGRAM_BOT_TOKEN_CURATOR=...
TELEGRAM_BOT_TOKEN_ANALYST=...

# AmoCRM
AMOCRM_CLIENT_ID=...
AMOCRM_CLIENT_SECRET=...
AMOCRM_LONG_LIVED_ACCESS_TOKEN=...
AMOCRM_SUBDOMAIN=...

# Bunny CDN
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...

# Email
RESEND_API_KEY=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASSWORD=...

# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## 🎨 FRONTEND Environment Variables

**Файл:** `.env` (в корне проекта)

**Местоположение:** `C:\onai-integrator-login\onai-integrator-login\.env`

**Используется в:** Frontend (Vite React app)

**Как загружается:** Автоматически Vite (при `npm run dev`)

**⚠️ ВАЖНО:** 
- Все переменные ДОЛЖНЫ начинаться с `VITE_*`
- Только **публичные** ключи (anon_key, НЕ service_role_key)!
- После изменения `.env` ОБЯЗАТЕЛЬНО перезапусти frontend: `npm run dev`

**Ключи в .env:**
```bash
# Supabase Main (ТОЛЬКО публичные ключи!)
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Supabase Tripwire (ТОЛЬКО публичные ключи!)
VITE_TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=eyJhbGc...

# Backend API URL (localhost для dev, production URL для prod)
VITE_API_URL=http://localhost:3000

# Bunny CDN (публичные)
VITE_BUNNY_VIDEO_LIBRARY_ID=551815
VITE_BUNNY_CDN_HOSTNAME=video.onai.academy
```

---

## 🔒 ВАЖНО: Безопасность

### ✅ Что можно коммитить:
- `.env.example` (шаблоны БЕЗ реальных ключей)
- `backend/.env.example` (шаблоны БЕЗ реальных ключей)

### ❌ Что НЕЛЬЗЯ коммитить:
- `.env` (реальные FRONTEND ключи)
- `backend/env.env` (реальные BACKEND ключи)
- `backend/.env` (не используется, но тоже в .gitignore)

### Проверка .gitignore:
```bash
# Эти строки ДОЛЖНЫ быть в .gitignore:
.env
.env.local
.env.production
backend/env.env
backend/.env
```

---

## 🚀 Setup для новых разработчиков

### 1. Backend Setup:

```bash
cd backend

# Скопировать шаблон (если есть)
cp .env.example env.env

# Или создать вручную
nano env.env

# Заполнить все ключи (попросить у тимлида)
```

### 2. Frontend Setup:

```bash
cd ..  # В корень проекта

# Скопировать шаблон
cp .env.example .env

# Заполнить ключи
nano .env
```

### 3. Проверка:

```bash
# Backend
cd backend
npm run dev
# Должно показать: ✅ All environment variables validated

# Frontend (в другом терминале)
cd ..
npm run dev
# Должно запуститься на http://localhost:5173
```

---

## 🐛 Troubleshooting

### Проблема: "OPENAI_API_KEY is not defined"

**Решение:**
1. ✅ Проверь что файл `backend/env.env` существует:
   ```powershell
   Test-Path "C:\onai-integrator-login\onai-integrator-login\backend\env.env"
   # Должно вернуть: True
   ```

2. ❌ Проверь что НЕТ файла `backend/.env` (он вызовет конфликт):
   ```powershell
   Test-Path "C:\onai-integrator-login\onai-integrator-login\backend\.env"
   # Должно вернуть: False
   # Если True - удали: Remove-Item backend\.env -Force
   ```

3. ✅ Проверь что в server.ts правильный путь (строка 10):
   ```typescript
   dotenv.config({ path: path.join(__dirname, '..', 'env.env') });
   ```

4. 🔄 Перезапусти backend сервер:
   ```bash
   cd backend
   npm run dev
   ```

### Проблема: "Cannot connect to Supabase"

**Решение:**
1. **Backend:** Проверить `backend/env.env` → `SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY`
2. **Frontend:** Проверить `.env` → `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`

### Проблема: "CORS error when calling API"

**Решение:**
Проверить что `VITE_BACKEND_URL` в frontend `.env` совпадает с адресом backend сервера:
```bash
# Frontend .env
VITE_BACKEND_URL=http://localhost:3000

# Backend должен слушать на этом порту
PORT=3000
```

---

## 📝 Создание .env.example файлов

### Backend:
```bash
cd backend

# Создать шаблон из реального env.env
cat env.env | sed 's/=.*/=YOUR_KEY_HERE/' > .env.example

# Или вручную удалить все значения
```

### Frontend:
```bash
# Создать шаблон из реального .env
cat .env | sed 's/=.*/=YOUR_KEY_HERE/' > .env.example
```

---

## 🎓 Best Practices

1. **Никогда не коммитить реальные ключи**
   - Всегда проверяйте `git status` перед коммитом
   - Используйте `git diff` чтобы увидеть что меняется

2. **Ротация ключей**
   - Если ключ попал в git, немедленно ротируйте его
   - Используйте `git log --all -- backend/env.env` чтобы проверить историю

3. **Разные ключи для dev/staging/production**
   ```
   backend/
   ├── env.env              (local development)
   ├── env.staging.env      (staging server)
   └── env.production.env   (production server)
   ```

4. **Environment переменные в CI/CD**
   - GitHub Actions: Settings → Secrets
   - Vercel: Project Settings → Environment Variables
   - Railway/Render: Settings → Environment

---

---

## ✅ Проверка правильности настройки

### Быстрая проверка (PowerShell):

```powershell
# 1. Проверка Backend env
Write-Host "Backend env.env:" (Test-Path "backend\env.env")
Write-Host "Backend .env (должен быть False):" (Test-Path "backend\.env")

# 2. Проверка Frontend env  
Write-Host "Frontend .env:" (Test-Path ".env")

# 3. Проверка что backend читает правильные ключи
cd backend
npm run dev
# Должно показать: ✅ OPENAI_API_KEY: Exists: true

# 4. Проверка что frontend читает правильные ключи
cd ..
npm run dev
# Должно показать в console: [DEV] ✅ Supabase config ready
```

### Если что-то не работает:

1. **Backend не видит OPENAI_API_KEY:**
   - Проверь что `backend/env.env` существует
   - Удали `backend/.env` если он есть
   - Перезапусти backend

2. **Frontend показывает "Missing Supabase environment variables":**
   - Проверь что `.env` в корне существует  
   - Проверь что все переменные начинаются с `VITE_*`
   - Перезапусти frontend

3. **CORS errors:**
   - Проверь что `VITE_API_URL` в `.env` = `http://localhost:3000`
   - Проверь что backend запущен на порту 3000

---

**Последнее обновление:** 12.12.2025 03:20 UTC  
**Автор:** Claude AI  
**Протестировано:** ✅ Windows 10, PowerShell, Node.js

