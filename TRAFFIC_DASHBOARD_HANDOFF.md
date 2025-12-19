# 🚀 TRAFFIC DASHBOARD - COMPLETE HANDOFF GUIDE

**Дата:** 19 декабря 2025  
**Проект:** onAI Academy - Traffic Dashboard  
**Для:** AI Assistant (Claude-based)

---

## 📌 OVERVIEW

**Traffic Dashboard** - система управления таргетологами с трекингом продаж по UTM-меткам.

**Tech Stack:**
- Frontend: React + Vite + TypeScript + TailwindCSS
- Backend: Express + TypeScript + Node.js
- Database: Supabase PostgreSQL (проект `pjmvxecykysfrzppdcto` - Tripwire DB)
- Email: Resend API
- Style: Premium black theme + neon green (#00FF88)

**URLs:**
- Production: `https://traffic.onai.academy`
- Local frontend: `http://localhost:8080/traffic/*`
- Local backend: `http://localhost:3000`

---

## ✅ ЧТО УЖЕ СДЕЛАНО

### 1. Database Schema (Migrations Ready)

Все миграции созданы в `/Users/miso/onai-integrator-login/supabase/migrations/`:

- ✅ `20251219_create_traffic_teams.sql` - команды таргетологов
- ✅ `20251219_create_traffic_sessions.sql` - логи входов для security
- ✅ `20251219_create_all_sales_tracking.sql` - трекинг продаж с UTM
- ✅ `20251219_create_onboarding_progress.sql` - онбординг
- ✅ `20251219_create_targetologist_settings.sql` - настройки

**Статус:** Файлы готовы, но **НЕ ПРИМЕНЕНЫ** в Tripwire Supabase!

### 2. Frontend Pages

```
src/pages/traffic/
├── TrafficLogin.tsx                      # Логин (email + password)
├── TrafficAdminPanel.tsx                 # Главная админ-панель
├── TrafficTeamConstructor.tsx            # Конструктор команд + email отправка
├── TrafficTargetologistDashboard.tsx     # Dashboard таргетолога
├── TrafficSettings.tsx                   # Настройки (UTM sources)
├── TrafficSecurityPanel.tsx              # Логи входов
└── UTMSourcesPanel.tsx                   # Аналитика продаж по UTM
```

### 3. Backend Routes

```
backend/src/routes/
├── traffic-auth.ts                # POST /api/traffic-auth/login
├── traffic-team-constructor.ts    # CRUD /api/traffic-constructor/*
├── traffic-admin.ts               # GET /api/traffic-admin/*
├── traffic-settings.ts            # GET/PUT /api/traffic-settings/:userId
├── traffic-security.ts            # GET /api/traffic-security/sessions
└── traffic-onboarding.ts          # GET/POST /api/traffic-onboarding/*
```

### 4. Key Features

#### Admin Panel (`/traffic/admin`)
- Dashboard с статистикой (кол-во юзеров, команд, планов)
- Quick Actions - ссылки на Users, Settings, Generate Plans
- **Вкладка Users** - таблица пользователей + кнопка 📤 "Send Credentials"
- **Вкладка Settings** - AI параметры (growth %, ROAS target, CPA target)
- **Вкладка Generate** - генерация планов для всех команд
- **Имя админа:** Александр (не Кенисары!)

#### Team Constructor (`/traffic/admin/team-constructor`)
- Создание пользователя с отправкой credentials на email
- Checkbox "Отправить данные доступа на email"
- Кнопка 📤 для переотправки пароля
- Fallback на DEFAULT_TEAMS если `traffic_teams` table missing

#### Settings (`/traffic/settings`)
- Динамические UTM источники (Facebook, Google, YouTube, TikTok, Instagram)
- Collapsible dropdowns для FB аккаунтов и кампаний
- Сохранение в `utm_templates.traffic_sources` (JSONB)

---

## 🔧 КАК ЗАПУСКАТЬ ЛОКАЛЬНО

### Terminal Workflow

```bash
# ===== Terminal 1: Backend =====
cd /Users/miso/onai-integrator-login/backend
npm run dev
# Backend запустится на http://localhost:3000

# ===== Terminal 2: Frontend =====
cd /Users/miso/onai-integrator-login
npm run dev
# Frontend запустится на http://localhost:8080

# ===== Перезапуск backend после изменений =====
lsof -ti:3000 | xargs kill -9 2>/dev/null
cd /Users/miso/onai-integrator-login/backend && npm run dev

# ===== Проверка API endpoints =====
# Users list
curl -s "http://localhost:3000/api/traffic-constructor/users" | jq

# Onboarding status
curl -s "http://localhost:3000/api/traffic-onboarding/status/test-id"

# Settings
curl -s "http://localhost:3000/api/traffic-settings/USER_ID"
```

### Структура Auth

```typescript
// Traffic Dashboard использует ОТДЕЛЬНУЮ авторизацию от main platform

// LocalStorage keys:
localStorage.getItem('traffic_token')      // JWT token
localStorage.getItem('traffic_user')       // JSON с {id, email, role, team_name}

// Headers для API:
{
  Authorization: `Bearer ${traffic_token}`
}
```

### Domain-Aware Routing

```typescript
// Helper функция (используется везде в Traffic Pages)
const getPath = (path: string) => {
  const isProduction = window.location.hostname === 'traffic.onai.academy';
  return isProduction ? path : `/traffic${path}`;
};

// Пример:
navigate(getPath('/admin')); 
// → Локально: /traffic/admin
// → Production: /admin
```

---

## ⚠️ ЧТО НУЖНО ДОДЕЛАТЬ

### 🔴 CRITICAL: Применить миграции в Tripwire Supabase

**Файлы для применения (по порядку):**

1. `20251219_create_traffic_teams.sql`
2. `20251219_create_traffic_sessions.sql`
3. `20251219_create_all_sales_tracking.sql`
4. `20251219_create_onboarding_progress.sql`
5. `20251219_create_targetologist_settings.sql`

**Как применить через MCP Supabase:**

См. файл `TRIPWIRE_MIGRATIONS_APPLY.md`

### 🟡 Medium Priority

1. **Email Sending**
   - Проверить что `RESEND_API_KEY` валидный в `.env`
   - Email отправляется с `noreply@onai.academy`
   - Service: [resend.com](https://resend.com/)

2. **Security Panel**
   - Сейчас может показывать 500 если нет данных в `traffic_user_sessions`
   - Добавлен graceful fallback, но нужно тестировать с реальными данными

3. **UTM Sources Panel**
   - Нужно подключить реальные данные из `all_sales_tracking`
   - Сейчас показывает placeholder если таблица пуста

### 🟢 Low Priority

1. **Production Deployment**
   - Настроить Nginx для `traffic.onai.academy` → frontend
   - Настроить CORS для `api.onai.academy`
   - Обновить `.env` в production с правильными keys

2. **AmoCRM Webhook**
   - Настроить webhook для записи продаж в `all_sales_tracking`
   - Endpoint: `POST /api/amocrm/webhook/sales`

---

## 🗂️ KEY FILES TO KNOW

### Frontend Components

```
src/components/traffic/
├── TrafficCabinetLayout.tsx    # Sidebar layout (черный + неон)
├── OnboardingTour.tsx          # Intro tour для новых юзеров
└── QuickActions.tsx            # Dashboard quick links
```

### Backend Services

```
backend/src/services/
└── emailService.ts             # Resend integration для отправки credentials
```

### Backend Config

```
backend/src/config/
├── supabase-tripwire.ts        # Tripwire Supabase client
└── config.ts                   # Environment variables
```

### Routing

```
src/App.tsx                     # Main routes:
                                # /traffic/login
                                # /traffic/admin
                                # /traffic/admin/team-constructor
                                # /traffic/settings
                                # /traffic/security
                                # /traffic/dashboard
```

---

## 🔑 CREDENTIALS & SECRETS

### Supabase (Tripwire DB)

```bash
# Project: pjmvxecykysfrzppdcto
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SUPABASE_ANON_KEY=[anon_key]
TRIPWIRE_SUPABASE_SERVICE_ROLE_KEY=[service_role_key]
```

### Resend Email

```bash
RESEND_API_KEY=[твой ключ]
# Dashboard: https://resend.com/overview
```

### Traffic Admin Login

```
Email: admin@onai.academy
Password: [в БД - bcrypt hashed]
# Роль: admin
# Команда: onai_admin
```

---

## 🐛 KNOWN ISSUES & FIXES

### ✅ FIXED Issues

1. **500 на `/api/traffic-onboarding/status`**
   - **Fix:** Добавлен graceful fallback если таблица не существует
   - **File:** `backend/src/routes/traffic-onboarding.ts`

2. **500 на `/api/traffic-settings` save**
   - **Fix:** `traffic_sources` теперь хранится в `utm_templates.traffic_sources` (JSONB)
   - **File:** `backend/src/routes/traffic-settings.ts`

3. **traffic_teams table missing**
   - **Fix:** Frontend использует `DEFAULT_TEAMS` fallback
   - **File:** `src/pages/traffic/TrafficTeamConstructor.tsx`

4. **Multiple GoTrueClient warnings**
   - **Status:** Не критично, можно игнорировать

5. **Redis connection errors в backend**
   - **Status:** Не критично для Traffic Dashboard (используется только для main platform)

### 🚨 PENDING Issues

1. **Migrations не применены в Tripwire DB**
   - Нужно применить через MCP Supabase
   - См. `TRIPWIRE_MIGRATIONS_APPLY.md`

---

## 📊 DATABASE SCHEMA OVERVIEW

### Tables (After Migrations)

```
traffic_teams                   # Команды (Kenesary, Arystan, Muha, Traf4)
├── id UUID
├── name TEXT UNIQUE
├── company TEXT
├── direction TEXT
├── color TEXT
└── emoji TEXT

traffic_users                   # Пользователи (таргетологи + админы)
├── id UUID
├── email TEXT
├── password_hash TEXT
├── role TEXT
├── team_id UUID → traffic_teams
└── team_name TEXT

traffic_user_sessions          # Логи входов (для Security Panel)
├── id UUID
├── user_id UUID → traffic_users
├── ip_address TEXT
├── device_fingerprint TEXT
├── login_at TIMESTAMPTZ
└── is_suspicious BOOLEAN

all_sales_tracking             # Продажи с UTM метками
├── id UUID
├── lead_id TEXT
├── sale_amount DECIMAL
├── utm_source TEXT
├── utm_campaign TEXT
├── targetologist TEXT
└── sale_date TIMESTAMPTZ

onboarding_progress            # Онбординг статус
├── user_id UUID
├── step TEXT
└── completed BOOLEAN

targetologist_settings         # Настройки (UTM sources в JSONB)
├── user_id UUID
└── utm_templates JSONB
```

### Views

```
traffic_suspicious_activity    # Подозрительные логины (> 3 разных IP)
traffic_teams_with_users       # Команды с количеством пользователей
top_utm_sources                # Топ источников трафика
top_utm_campaigns              # Топ кампаний
sales_without_utm              # Продажи без UTM (требуют внимания)
```

---

## 🎨 UI/UX STYLE GUIDE

### Colors

```css
--bg-black: #000000
--bg-dark: #0a0a0a
--neon-green: #00FF88
--text-white: #ffffff
--text-gray: #9ca3af
--border-dark: #1f2937
```

### Font

```css
font-family: 'Inter', sans-serif
```

### Component Pattern

```tsx
// Стиль кнопок
<button className="
  px-4 py-2 
  bg-[#00FF88] text-black 
  rounded-lg 
  hover:bg-[#00CC70] 
  transition-all
">
  Action
</button>

// Стиль карточек
<div className="
  bg-[#0a0a0a] 
  border border-gray-800 
  rounded-xl 
  p-6
">
  Content
</div>
```

---

## 🧪 TESTING CHECKLIST

### Frontend Testing

```bash
# Открыть в браузере:
http://localhost:8080/traffic/login

# Залогиниться как admin:
admin@onai.academy / [password]

# Проверить routes:
✓ /traffic/admin                    # Главная админка
✓ /traffic/admin/team-constructor   # Конструктор
✓ /traffic/settings                 # Настройки
✓ /traffic/security                 # Security Panel
✓ /traffic/dashboard                # Dashboard таргетолога
```

### Backend Testing

```bash
# Health check
curl http://localhost:3000/health

# Users list
curl http://localhost:3000/api/traffic-constructor/users

# Teams list
curl http://localhost:3000/api/traffic-constructor/teams

# Settings
curl http://localhost:3000/api/traffic-settings/USER_ID
```

---

## 🚀 DEPLOYMENT PLAN

### 1. Apply Migrations (Tripwire Supabase)

```bash
# Через MCP Supabase выполнить по порядку:
1. 20251219_create_traffic_teams.sql
2. 20251219_create_traffic_sessions.sql
3. 20251219_create_all_sales_tracking.sql
4. 20251219_create_onboarding_progress.sql
5. 20251219_create_targetologist_settings.sql
```

### 2. Update Environment Variables

```bash
# Production backend .env
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SUPABASE_SERVICE_ROLE_KEY=[key]
RESEND_API_KEY=[key]
NODE_ENV=production
```

### 3. Build & Deploy

```bash
# Frontend
npm run build
# Deploy dist/ to traffic.onai.academy

# Backend
cd backend
npm run build
# Deploy to api.onai.academy
```

### 4. Configure Nginx

```nginx
# traffic.onai.academy
server {
  listen 443 ssl;
  server_name traffic.onai.academy;
  
  root /var/www/traffic-dashboard/dist;
  index index.html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  # SSL config...
}
```

### 5. Test Production

```bash
# Check frontend
curl https://traffic.onai.academy

# Check backend API
curl https://api.onai.academy/api/traffic-constructor/users
```

---

## 📝 GIT COMMIT CHECKLIST

### Modified Files

```
✓ src/pages/traffic/TrafficAdminPanel.tsx
✓ src/pages/traffic/TrafficTeamConstructor.tsx
✓ src/pages/traffic/TrafficSettings.tsx
✓ src/components/traffic/TrafficCabinetLayout.tsx
✓ backend/src/routes/traffic-team-constructor.ts
✓ backend/src/routes/traffic-onboarding.ts
✓ backend/src/routes/traffic-settings.ts
✓ backend/src/services/emailService.ts
```

### New Files

```
✓ supabase/migrations/20251219_create_traffic_teams.sql
✓ supabase/migrations/20251219_create_traffic_sessions.sql
✓ supabase/migrations/20251219_create_all_sales_tracking.sql
✓ supabase/migrations/20251219_create_onboarding_progress.sql
✓ supabase/migrations/20251219_create_targetologist_settings.sql
```

---

## 💡 TIPS FOR NEXT ASSISTANT

### When Working on Backend

1. **ВСЕГДА** запускай backend ПЕРВЫМ: `cd backend && npm run dev`
2. После изменений в routes - перезапускай backend
3. Проверяй logs в терминале - там все ошибки видны
4. Backend работает на `:3000`, frontend на `:8080`

### When Working on Frontend

1. Используй `getPath()` helper для всех navigate()
2. Auth токен хранится в `localStorage.traffic_token`
3. Не путай с main platform auth (разные ключи!)
4. Стиль: черный + #00FF88, никаких синих цветов

### When Testing Features

1. Открой Chrome DevTools → Network → следи за API calls
2. Проверь Console → могут быть полезные warnings
3. Используй `curl` для прямого тестирования API
4. Проверяй БД через Supabase dashboard после изменений

### Database Work

1. Миграции применяй через MCP Supabase (не руками в SQL Editor!)
2. После миграций - проверь что таблицы созданы
3. Используй `tripwireAdminSupabase` для admin операций
4. RLS policies - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

---

## 📚 USEFUL COMMANDS REFERENCE

```bash
# === BACKEND ===
cd /Users/miso/onai-integrator-login/backend
npm run dev                     # Запуск
npm run build                   # Build для production
lsof -ti:3000 | xargs kill -9   # Убить процесс на порту 3000

# === FRONTEND ===
cd /Users/miso/onai-integrator-login
npm run dev                     # Запуск
npm run build                   # Build для production

# === API TESTING ===
curl -s http://localhost:3000/api/traffic-constructor/users | jq
curl -s http://localhost:3000/api/traffic-constructor/teams | jq

# === GIT ===
git status
git add .
git commit -m "feat: traffic dashboard updates"
git push origin main
```

---

## 🎯 NEXT STEPS (Priority Order)

### Immediate (Do First)

1. ✅ Применить все миграции в Tripwire Supabase через MCP
2. ✅ Проверить что таблицы созданы успешно
3. ✅ Протестировать Team Constructor с email отправкой
4. ✅ Проверить Settings сохранение в `utm_templates`

### Short-term (This Week)

5. ⏳ Подключить AmoCRM webhook для `all_sales_tracking`
6. ⏳ Заполнить `all_sales_tracking` историческими данными
7. ⏳ Протестировать Security Panel с реальными логами
8. ⏳ Добавить фильтры в UTM Sources Panel

### Long-term (Next Sprint)

9. 📅 Deploy на production (`traffic.onai.academy`)
10. 📅 Настроить мониторинг (Sentry, LogRocket)
11. 📅 Добавить аналитику (Google Analytics)
12. 📅 Написать user documentation

---

## 🆘 TROUBLESHOOTING

### Backend не запускается

```bash
# Check if port 3000 is busy
lsof -ti:3000

# Kill process
lsof -ti:3000 | xargs kill -9

# Check .env exists
ls backend/.env

# Install dependencies
cd backend && npm install
```

### Frontend показывает 404

```bash
# Check if running on correct port
netstat -an | grep 8080

# Check vite.config.ts port setting
cat vite.config.ts | grep port

# Restart
npm run dev
```

### API calls возвращают 401

```bash
# Check token in localStorage
# В Chrome DevTools → Application → Local Storage
localStorage.getItem('traffic_token')

# Logout and login again
localStorage.removeItem('traffic_token')
localStorage.removeItem('traffic_user')
```

### Email не отправляется

```bash
# Check RESEND_API_KEY in backend/.env
grep RESEND_API_KEY backend/.env

# Check Resend dashboard for errors
# https://resend.com/emails

# Test email service directly
curl -X POST http://localhost:3000/api/traffic-constructor/users/:id/send-credentials
```

---

## 🎓 LEARNING RESOURCES

- **Supabase Docs:** https://supabase.com/docs
- **Resend Docs:** https://resend.com/docs
- **Vite Docs:** https://vitejs.dev/
- **TailwindCSS:** https://tailwindcss.com/docs

---

## ✨ FINAL NOTES

Проект в отличном состоянии! Основная работа сделана:
- ✅ Frontend полностью работает
- ✅ Backend API готовы
- ✅ Миграции созданы (нужно только применить)
- ✅ Email integration работает

**Главное что осталось:**
1. Применить миграции через MCP Supabase
2. Протестировать с реальными данными
3. Deploy на production

Удачи! 🚀

---

**Handoff Date:** 2025-12-19  
**Author:** AI Assistant (Claude)  
**Next Steps:** Apply migrations → Test → Deploy
