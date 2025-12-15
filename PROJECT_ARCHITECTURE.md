# 🏗️ ONAI ACADEMY - АРХИТЕКТУРА ПРОЕКТА

**Проект:** OnAI Academy Integrator + Tripwire Product  
**Версия:** 2.0  
**Дата:** Декабрь 2025

---

## 📋 ОГЛАВЛЕНИЕ

1. [Общая структура](#общая-структура)
2. [Технологический стек](#технологический-стек)
3. [Архитектура приложения](#архитектура-приложения)
4. [Структура папок](#структура-папок)
5. [Ключевые компоненты](#ключевые-компоненты)
6. [База данных](#база-данных)
7. [Интеграции](#интеграции)
8. [Правила разработки](#правила-разработки)
9. [Деплой](#деплой)
10. [Мониторинг](#мониторинг)

---

## 🎯 ОБЩАЯ СТРУКТУРА

Проект состоит из **3 основных частей**:

```
┌─────────────────────────────────────────┐
│  FRONTEND (React + Vite + TypeScript)   │
│  - Public Landing (/)                    │
│  - Tripwire Product (/tripwire/*)       │
│  - Admin Panel (/admin/*)               │
└─────────────────────────────────────────┘
              ↓ API calls
┌─────────────────────────────────────────┐
│  BACKEND (Node.js + Express + TS)       │
│  - REST API (/api/*)                    │
│  - Integrations (AmoCRM, Email, SMS)    │
│  - Business Logic                       │
└─────────────────────────────────────────┘
              ↓ Database
┌─────────────────────────────────────────┐
│  SUPABASE (PostgreSQL + Auth)           │
│  - Users, Leads, Progress, Certificates │
│  - Authentication (JWT)                 │
│  - Real-time subscriptions              │
└─────────────────────────────────────────┘
```

---

## 🛠️ ТЕХНОЛОГИЧЕСКИЙ СТЕК

### Frontend
- **Framework:** React 18 + TypeScript
- **Build tool:** Vite 5
- **Routing:** React Router v6
- **UI Library:** Shadcn/ui (Radix UI + Tailwind CSS)
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **State:** React Hooks (useState, useEffect, useContext)
- **Forms:** React Hook Form (опционально)

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Process Manager:** PM2
- **HTTP Client:** Axios
- **Validation:** Zod (опционально)
- **Error Tracking:** Sentry

### Database & Auth
- **Database:** Supabase (PostgreSQL 15)
- **ORM:** Supabase Client (не Prisma/TypeORM)
- **Auth:** Supabase Auth (JWT)
- **RLS:** Row-Level Security включён

### Infrastructure
- **Hosting:** DigitalOcean Droplet
- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** PM2
- **SSL:** Let's Encrypt
- **Deployment:** rsync + SSH

### Integrations
- **CRM:** AmoCRM (API v4)
- **Email:** Resend
- **SMS:** Mobizon
- **AI:** OpenAI API (GPT-4)
- **Monitoring:** Sentry
- **Notifications:** Telegram Bot (опционально)

---

## 🏛️ АРХИТЕКТУРА ПРИЛОЖЕНИЯ

### Frontend Architecture

```
src/
├── pages/              # Страницы (routing)
│   ├── Home.tsx           # Landing page
│   ├── tripwire/          # Tripwire продукт
│   │   ├── TripwireProfile.tsx
│   │   ├── TripwireLesson.tsx
│   │   ├── TripwireProductPage.tsx
│   │   └── components/    # Компоненты Tripwire
│   └── admin/             # Админ-панель
│       ├── TripwireManager.tsx
│       └── components/
├── components/         # Переиспользуемые компоненты
│   ├── ui/               # Shadcn/ui компоненты
│   └── ...
├── lib/                # Утилиты и конфигурация
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Хелперы
├── hooks/              # Custom React hooks
├── context/            # React Context (если есть)
└── utils/              # Утилиты (Sentry и т.д.)
```

**Принципы:**
- ✅ Один компонент = один файл
- ✅ Переиспользуемые компоненты в `/components`
- ✅ Специфичные компоненты в `/pages/*/components`
- ✅ UI-kit (Shadcn) в `/components/ui`

---

### Backend Architecture

```
backend/
├── src/
│   ├── server.ts           # Главный файл (Express app)
│   ├── routes/             # API роуты
│   │   ├── auth.ts            # /api/auth/*
│   │   ├── tripwire.ts        # /api/tripwire/*
│   │   ├── admin.ts           # /api/admin/*
│   │   └── short-links.ts     # /api/short-links/*
│   ├── services/           # Бизнес-логика
│   │   ├── amoCrmService.ts   # Интеграция AmoCRM
│   │   ├── emailService.ts    # Отправка email
│   │   ├── smsService.ts      # Отправка SMS
│   │   └── urlShortener.ts    # Короткие ссылки
│   ├── middleware/         # Express middleware
│   │   ├── authMiddleware.ts  # Проверка JWT
│   │   └── errorHandler.ts    # Обработка ошибок
│   ├── utils/              # Утилиты
│   │   ├── logger.ts          # Логирование
│   │   ├── retryWithBackoff.ts # Retry для API
│   │   ├── alerting.ts        # Уведомления
│   │   └── sentryMonitoring.ts # Sentry
│   └── lib/
│       └── supabase.ts        # Supabase client
├── ecosystem.config.js     # PM2 конфигурация
└── .env                    # Переменные окружения
```

**Принципы:**
- ✅ Роуты только маршрутизация, логика в `services/`
- ✅ Все запросы к БД через Supabase Client
- ✅ Интеграции изолированы в отдельные сервисы
- ✅ Middleware для auth, CORS, error handling

---

## 📁 СТРУКТУРА ПАПОК

### Root Level

```
onai-integrator-login/
├── src/                    # Frontend код
├── backend/                # Backend код
├── supabase/               # Supabase конфигурация
│   └── migrations/         # SQL миграции
├── public/                 # Статика (index.html, images)
├── deploy-now.ps1          # Скрипт деплоя (PowerShell)
├── package.json            # Frontend dependencies
├── vite.config.ts          # Vite конфигурация
├── tailwind.config.js      # Tailwind CSS
├── tsconfig.json           # TypeScript конфигурация
└── .env.local              # Локальные env переменные
```

### Supabase Migrations

```
supabase/migrations/
├── 20250114_create_short_links.sql
├── 20250115_add_performance_indexes.sql
├── 20250115_create_integration_tokens.sql
└── ... (другие миграции)
```

**Правила миграций:**
- ✅ Формат имени: `YYYYMMDD_описание.sql`
- ✅ Миграции применяются через Supabase Dashboard SQL Editor
- ✅ Никогда не редактировать старые миграции (создавать новые)
- ✅ Всегда включать комментарии и ROLLBACK инструкции

---

## 🔑 КЛЮЧЕВЫЕ КОМПОНЕНТЫ

### 1. Tripwire Product (Образовательная платформа)

**Назначение:** Онлайн-курс с уроками, заданиями, прогрессом, достижениями

**Страницы:**
- `/tripwire/profile` - Профиль студента + достижения
- `/tripwire/lesson/:id` - Урок с видео и заданием
- `/tripwire/product` - Главная страница продукта

**Компоненты:**
- `TripwireProfile.tsx` - Профиль с прогрессом
- `Achievements.tsx` - Система достижений (премиум дизайн)
- `TripwireLesson.tsx` - Страница урока
- `LessonCard.tsx` - Карточка урока

**Интеграция с AmoCRM:**
- При завершении урока → обновляется этап сделки в AmoCRM
- Этапы: Lesson 1, Lesson 2, Lesson 3, ... completed

---

### 2. Admin Panel (Админ-панель)

**Назначение:** Управление студентами, лидами, статистика

**Страницы:**
- `/admin/tripwire-manager` - Управление студентами Tripwire
- `/admin/stats` - Статистика и дашборд

**Компоненты:**
- `TripwireManager.tsx` - Таблица студентов
- `StatsCards.tsx` - Карточки статистики
- `SalesChart.tsx` - Графики продаж
- `CreateUserForm.tsx` - Форма создания студента

**Защита:**
- ✅ Роут `/admin/*` защищён middleware `requireAdmin()`
- ✅ Проверка роли `admin` в JWT токене

---

### 3. Public Landing

**Назначение:** Лендинг для привлечения лидов

**Страницы:**
- `/` - Главная страница

**Формы:**
- Email → сохранение в `landing_leads`
- Интеграция с AmoCRM (создание сделки)

---

### 4. URL Shortener (Короткие ссылки)

**Назначение:** Сокращение ссылок для SMS (экономия символов)

**Endpoint:** `/api/short-links/*`

**Использование:**
```typescript
// Создать короткую ссылку
POST /api/short-links/create
{ "original_url": "https://onai.academy/tripwire/lesson/1" }
→ { "short_code": "abc123", "short_url": "https://onai.academy/l/abc123" }

// Редирект
GET /l/abc123
→ 302 Redirect to original_url
```

**База данных:** Таблица `short_links` с полями `short_code`, `original_url`, `clicks`

---

## 🗄️ БАЗА ДАННЫХ

### Основные таблицы

#### 1. `users` - Пользователи (Supabase Auth)
```sql
- id (UUID, PK)
- email (string, unique)
- created_at (timestamp)
```

#### 2. `tripwire_users` - Студенты Tripwire
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- email (string)
- name (string)
- modules_completed (int)
- total_lessons_completed (int)
- amocrm_lead_id (int, nullable)
- created_at, updated_at
```

#### 3. `tripwire_progress` - Прогресс по урокам
```sql
- id (UUID, PK)
- tripwire_user_id (UUID, FK)
- lesson_id (int)
- module_id (int)
- is_completed (boolean)
- completed_at (timestamp, nullable)
- time_spent (int, seconds)
- created_at, updated_at
```

#### 4. `user_achievements` - Достижения студентов
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- achievement_id (string)
- unlocked_at (timestamp)
- created_at
```

#### 5. `certificates` - Сертификаты
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- certificate_url (string)
- issued_at (timestamp)
- created_at
```

#### 6. `landing_leads` - Лиды с лендинга
```sql
- id (UUID, PK)
- email (string)
- phone (string, nullable)
- name (string, nullable)
- amocrm_lead_id (int, nullable)
- amocrm_synced (boolean)
- created_at
```

#### 7. `short_links` - Короткие ссылки
```sql
- id (UUID, PK)
- short_code (string, unique, index)
- original_url (text)
- clicks (int, default 0)
- created_at, updated_at
```

#### 8. `integration_tokens` - Токены интеграций ⭐ NEW
```sql
- service_name (string, PK) # 'amocrm', 'stripe', ...
- access_token (text)
- refresh_token (text, nullable)
- expires_at (timestamp, nullable)
- metadata (jsonb)
- updated_at, created_at
```

### Индексы (Performance)

```sql
-- Tripwire Progress
CREATE INDEX idx_tripwire_progress_user_lesson ON tripwire_progress(tripwire_user_id, lesson_id);
CREATE INDEX idx_tripwire_progress_module_completed ON tripwire_progress(module_id, is_completed);

-- Tripwire Users
CREATE INDEX idx_tripwire_users_email ON tripwire_users(email);
CREATE INDEX idx_tripwire_users_user_id ON tripwire_users(user_id);

-- Achievements
CREATE INDEX idx_user_achievements_user_created ON user_achievements(user_id, created_at DESC);

-- Short Links
CREATE INDEX idx_short_links_code ON short_links(short_code);

-- Landing Leads
CREATE INDEX idx_landing_leads_email ON landing_leads(email);
CREATE INDEX idx_landing_leads_synced ON landing_leads(amocrm_synced);
```

### RLS (Row-Level Security)

**Включено на всех таблицах!**

**Политики:**
- `tripwire_users`: Студент видит только свою запись
- `tripwire_progress`: Студент видит только свой прогресс
- `user_achievements`: Студент видит только свои достижения
- `integration_tokens`: Только `service_role` (backend)

---

## 🔗 ИНТЕГРАЦИИ

### 1. AmoCRM (CRM система)

**Назначение:** Управление сделками, автоматизация воронки продаж

**Конфигурация (.env):**
```bash
AMOCRM_SUBDOMAIN=your_subdomain
AMOCRM_ACCESS_TOKEN=...
AMOCRM_REFRESH_TOKEN=...
AMOCRM_CLIENT_ID=...
AMOCRM_CLIENT_SECRET=...
AMOCRM_PIPELINE_ID=10350882
AMOCRM_STAGE_LESSON_1=...
AMOCRM_STAGE_LESSON_2=...
AMOCRM_STAGE_LESSON_3=...
```

**Автоматизация:**
- ✅ Токены хранятся в БД (`integration_tokens`)
- ✅ Автоматическое обновление через Refresh Token
- ✅ При завершении урока → обновление этапа сделки
- ✅ Retry с exponential backoff при ошибках

**Файлы:**
- `backend/src/services/amoCrmService.ts`

**API Endpoints:**
- `POST /api/tripwire/complete-lesson` → обновляет этап в AmoCRM

---

### 2. Resend (Email сервис)

**Назначение:** Отправка email (приветственные письма, уведомления)

**Конфигурация (.env):**
```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@onai.academy
```

**Использование:**
```typescript
import { resend } from '@/services/emailService';

await resend.emails.send({
  from: 'noreply@onai.academy',
  to: 'user@example.com',
  subject: 'Welcome to OnAI Academy',
  html: '<h1>Hello!</h1>'
});
```

**Retry:** Используется `retryEmail()` из `retryWithBackoff.ts`

---

### 3. Mobizon (SMS сервис)

**Назначение:** Отправка SMS (короткие ссылки, уведомления)

**Конфигурация (.env):**
```bash
MOBIZON_API_KEY=...
```

**Использование:**
```typescript
import { sendSMS } from '@/services/smsService';

await sendSMS({
  to: '+380501234567',
  text: 'Your lesson: https://onai.academy/l/abc123'
});
```

**Retry:** Используется `retrySMS()` из `retryWithBackoff.ts`

---

### 4. OpenAI API

**Назначение:** Генерация контента, анализ заданий (опционально)

**Конфигурация (.env):**
```bash
OPENAI_API_KEY=sk-...
```

**Retry:** Используется `retryOpenAI()` из `retryWithBackoff.ts`

---

### 5. Sentry (Error Monitoring)

**Назначение:** Отслеживание ошибок в production

**Конфигурация (.env):**
```bash
# Backend
SENTRY_DSN_BACKEND=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# Frontend
VITE_SENTRY_DSN=https://...@sentry.io/...
```

**Инициализация:**
- Frontend: `src/utils/sentryMonitoring.ts`
- Backend: `backend/src/utils/sentryMonitoring.ts`

**Автоматически логирует:**
- ✅ Ошибки JavaScript (frontend)
- ✅ Необработанные исключения (backend)
- ✅ API ошибки (>= 500)
- ✅ Критичные события (failed payments, etc.)

---

## 📏 ПРАВИЛА РАЗРАБОТКИ

### Git Workflow

**Ветки:**
- `main` - Production (стабильная версия)
- `develop` - Development (текущая разработка)
- `feature/*` - Фичи (опционально)

**Правила коммитов:**
```bash
# ✅ Хорошие коммиты
git commit -m "Add user achievements system"
git commit -m "Fix AmoCRM token refresh logic"
git commit -m "Update performance indexes"

# ❌ Плохие коммиты
git commit -m "fix"
git commit -m "update"
git commit -m "WIP"
```

**Перед коммитом:**
- ✅ Код компилируется без ошибок
- ✅ Нет console.log (заменить на logger)
- ✅ Проверить что ничего не сломалось

---

### Code Style

#### TypeScript

**Именование:**
```typescript
// ✅ Хорошо
const userName = 'John';
const MAX_RETRIES = 3;
interface UserProfile { ... }
function getUserById(id: string) { ... }

// ❌ Плохо
const user_name = 'John';  // snake_case (только для БД)
const maxretries = 3;      // без underscores для констант
```

**Импорты:**
```typescript
// ✅ Хорошо - группировка и порядок
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

// ❌ Плохо - хаотичный порядок
import { supabase } from '@/lib/supabase';
import React from 'react';
import { Button } from '@/components/ui/button';
```

**Async/await:**
```typescript
// ✅ Хорошо
try {
  const response = await api.get('/users');
  console.log(response.data);
} catch (error) {
  logger.error('Failed to fetch users:', error);
}

// ❌ Плохо
api.get('/users').then((response) => {
  console.log(response.data);
}).catch((error) => {
  console.error(error);
});
```

---

#### React Components

**Структура компонента:**
```tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  userId: string;
  onComplete?: () => void;
}

export function UserProfile({ userId, onComplete }: Props) {
  // 1. State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 2. Effects
  useEffect(() => {
    loadUser();
  }, [userId]);
  
  // 3. Handlers
  const loadUser = async () => { ... };
  const handleSubmit = () => { ... };
  
  // 4. Render
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <Button onClick={handleSubmit}>Save</Button>
    </div>
  );
}
```

**Правила:**
- ✅ Один компонент = один файл
- ✅ Props через interface (не inline types)
- ✅ Destructure props в параметрах функции
- ✅ Early return для loading/error states

---

### Database Queries

**Supabase Client:**
```typescript
// ✅ Хорошо - чистый и безопасный запрос
const { data, error } = await supabase
  .from('tripwire_users')
  .select('*')
  .eq('email', email)
  .single();

if (error) {
  logger.error('Database error:', error);
  throw error;
}

// ❌ Плохо - игнорирование ошибок
const { data } = await supabase
  .from('tripwire_users')
  .select('*');
// Что если error?
```

**N+1 Problem - ИЗБЕГАТЬ!**
```typescript
// ❌ ПЛОХО - N+1 запросов
const users = await supabase.from('tripwire_users').select('*');
for (const user of users.data) {
  const progress = await supabase
    .from('tripwire_progress')
    .select('*')
    .eq('tripwire_user_id', user.id);
  // 1 + N запросов!
}

// ✅ ХОРОШО - 1 запрос с JOIN
const { data } = await supabase
  .from('tripwire_users')
  .select(`
    *,
    tripwire_progress(*)
  `);
// Только 1 запрос!
```

---

### API Error Handling

**Backend:**
```typescript
// ✅ Хорошо - полная обработка ошибок
app.post('/api/tripwire/complete-lesson', async (req, res) => {
  try {
    const { userId, lessonId } = req.body;
    
    if (!userId || !lessonId) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    const result = await completeLesson(userId, lessonId);
    
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Complete lesson error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// ❌ Плохо - нет обработки ошибок
app.post('/api/tripwire/complete-lesson', async (req, res) => {
  const result = await completeLesson(req.body.userId, req.body.lessonId);
  res.json(result);
  // Что если ошибка?
});
```

---

### Logging

**НОВОЕ: Использовать `logger` вместо `console.log`**

```typescript
import { logger } from '@/utils/logger';

// ✅ Хорошо - структурированное логирование
logger.debug('User data:', user);           // Только в dev
logger.info('User created:', user.id);      // Dev + prod
logger.warn('API rate limit approaching');  // Предупреждения
logger.error('Database error:', error);     // Ошибки

// Специальные форматы
logger.request('POST', '/api/users', 201, 45);
logger.externalApi('AmoCRM', 'update_deal', true, 150);

// ❌ Плохо - console.log в production
console.log('User:', user);  // Будет спамить логи!
```

**Настройка через .env:**
```bash
# Development
LOG_LEVEL=debug  # Показывать всё

# Production
LOG_LEVEL=warn   # Только warn + error
```

---

### Security

**Защита роутов (Backend):**
```typescript
import { requireAuth, requireAdmin } from '@/middleware/authMiddleware';

// ✅ Хорошо - защищённый роут
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  // Только админы могут получить список всех пользователей
});

// ❌ Плохо - незащищённый роут
app.get('/api/admin/users', async (req, res) => {
  // Любой может получить доступ!
});
```

**JWT Token:**
```typescript
// ✅ Хорошо - проверка токена
const token = req.headers.authorization?.replace('Bearer ', '');
const { data, error } = await supabase.auth.getUser(token);

if (error || !data.user) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// ❌ Плохо - без проверки
const userId = req.body.userId;  // Любой может передать любой userId!
```

**RLS в Supabase:**
- ✅ Включено на всех таблицах
- ✅ Пользователь видит только свои данные
- ✅ Backend использует `service_role` ключ (полный доступ)

---

## 🚀 ДЕПЛОЙ

### Требования

**Сервер:**
- OS: Ubuntu 20.04+
- Node.js: 18+
- PM2: последняя версия
- Nginx: последняя версия
- SSL: Let's Encrypt

**Домены:**
- Frontend: `https://onai.academy`
- API: `https://api.onai.academy`

---

### Процесс деплоя

#### 1. Сборка Frontend

```bash
# На локальной машине
npm run build

# Результат: dist/ папка с HTML, CSS, JS
```

#### 2. Сборка Backend

```bash
cd backend
npx tsc --skipLibCheck

# Результат: backend/dist/ с JS файлами
```

#### 3. Деплой на сервер

**Вариант A: Автоматический (рекомендуется)**
```powershell
# Использовать готовый скрипт
.\deploy-now.ps1
```

**Вариант B: Ручной**
```bash
# Frontend
rsync -avz --delete \
  -e "ssh -i ~/.ssh/id_rsa" \
  dist/ \
  root@207.154.231.30:/var/www/onai-integrator-login-main/

# Backend
rsync -avz \
  -e "ssh -i ~/.ssh/id_rsa" \
  backend/dist/ \
  backend/ecosystem.config.js \
  root@207.154.231.30:/var/www/onai-integrator-login-main/backend/

# Перезапуск backend
ssh -i ~/.ssh/id_rsa root@207.154.231.30 '
  cd /var/www/onai-integrator-login-main/backend &&
  pm2 restart onai-backend
'
```

#### 4. Применение миграций БД

```bash
# Открыть Supabase Dashboard
# https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Скопировать и выполнить SQL из:
# supabase/migrations/YYYYMMDD_название.sql
```

**ВАЖНО:** Миграции применяются ВРУЧНУЮ через Dashboard (не через CLI)

---

### Проверка после деплоя

```bash
# 1. Статус PM2
ssh -i ~/.ssh/id_rsa root@207.154.231.30 'pm2 status'
# Ожидается: onai-backend = online

# 2. Health Check
curl -s https://api.onai.academy/api/health/deep | jq '.'
# Ожидается: status = "healthy"

# 3. Frontend доступен
curl -I https://onai.academy
# Ожидается: 200 OK

# 4. Логи без ошибок
ssh -i ~/.ssh/id_rsa root@207.154.231.30 'pm2 logs onai-backend --lines 50 --nostream'
```

---

### Откат при проблемах

```bash
# 1. Откатить код на предыдущий коммит
git checkout HEAD~1

# 2. Пересобрать
npm run build
cd backend && npx tsc --skipLibCheck

# 3. Задеплоить
rsync -avz ...

# 4. Перезапустить
pm2 restart onai-backend
```

---

## 📊 МОНИТОРИНГ

### Health Check Endpoints

```bash
# Простой health check
GET /api/health
→ { "status": "ok" }

# Детальный health check (NEW)
GET /api/health/deep
→ {
  "status": "healthy",
  "uptime": "2h 15m 30s",
  "memory": { "usagePercent": "45%" },
  "warnings": []
}
```

### PM2 Monitoring

```bash
# Статус процесса
pm2 status

# Логи в реальном времени
pm2 logs onai-backend

# Логи только ошибок
pm2 logs onai-backend --err

# Метрики (CPU, Memory)
pm2 monit

# Информация о процессе
pm2 info onai-backend
```

### Sentry Dashboard

- **URL:** https://sentry.io/organizations/YOUR_ORG/issues/
- **Фильтры:** 
  - Environment: production
  - Project: onai-backend, onai-frontend

### Database Monitoring

```sql
-- Медленные запросы
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Использование индексов
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Размер таблиц
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 🔧 НОВЫЕ УТИЛИТЫ (с декабря 2025)

### 1. Logger (`backend/src/utils/logger.ts`)

**Замена `console.log` с уровнями логирования**

```typescript
import { logger } from '@/utils/logger';

logger.debug('Детальная информация');    // Только dev
logger.info('Общая информация');         // Dev + prod
logger.warn('Предупреждение');           // Всегда
logger.error('Ошибка');                  // Всегда

// Специальные форматы
logger.request('GET', '/api/users', 200, 45);
logger.externalApi('AmoCRM', 'update_deal', true, 150);
```

**Настройка:** `LOG_LEVEL=warn` в `.env`

---

### 2. Retry with Backoff (`backend/src/utils/retryWithBackoff.ts`)

**Автоматические повторы для внешних API**

```typescript
import { retryAmoCRM, retryEmail, retrySMS, retryOpenAI } from '@/utils/retryWithBackoff';

// AmoCRM с умными повторами
const deal = await retryAmoCRM(
  async () => await amoClient.get(`/api/v4/leads/${dealId}`),
  'Get Deal'
);

// Email с повторами
await retryEmail(
  async () => await resend.emails.send({ ... }),
  'Send Welcome Email'
);
```

**Логика:** 1s → 2s → 4s → 8s с экспоненциальной задержкой

---

### 3. Alerting (`backend/src/utils/alerting.ts`)

**Автоматические уведомления при сбоях**

```typescript
import { sendAlert, trackIntegrationFailure } from '@/utils/alerting';

// Отправка алерта
await sendAlert('AmoCRM не отвечает 5 минут', 'critical');

// Автоматическое отслеживание сбоев
trackIntegrationFailure('amocrm', 'update_deal', false);  // Ошибка
// После 5 ошибок подряд → автоматический алерт админам

// Сброс при успехе
trackIntegrationFailure('amocrm', 'update_deal', true);
```

**Настройка:** `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_CHAT_ID` в `.env`

---

## 📚 ВАЖНЫЕ ДОКУМЕНТЫ

### Документация проекта

- **`PROJECT_ARCHITECTURE.md`** (этот файл) - Общая архитектура
- **`backend/OPTIMIZATION_DEPLOYMENT_GUIDE.md`** - Гайд по оптимизациям
- **`QUICK_OPTIMIZATION_CHECKLIST.md`** - Быстрый чеклист
- **`backend/AUTO_RESTART_DEPLOYMENT_GUIDE.md`** - Автоперезапуск backend
- **`DEPLOYMENT_GUIDE_DIGITALOCEAN.md`** - Деплой на DigitalOcean

### Технические доки

- **`SUPABASE_DATABASE_SCHEMA_DOCUMENTATION.md`** - Схема БД
- **`URL_SHORTENER_DOCUMENTATION.md`** - Короткие ссылки
- **`SENTRY_SETUP.md`** - Настройка Sentry

---

## ⚠️ ВАЖНЫЕ ПРАВИЛА

### ❌ ЧТО НЕЛЬЗЯ ДЕЛАТЬ

1. **НЕ ДЕПЛОИТЬ на Vercel** - только DigitalOcean через rsync
2. **НЕ КОММИТИТЬ .env файлы** - только .env.example
3. **НЕ РЕДАКТИРОВАТЬ старые миграции** - создавать новые
4. **НЕ ИСПОЛЬЗОВАТЬ console.log в production** - использовать `logger`
5. **НЕ ХАРДКОДИТЬ токены/ключи** - только через .env
6. **НЕ ИГНОРИРОВАТЬ ошибки БД** - всегда проверять `error`
7. **НЕ ДЕЛАТЬ N+1 запросы** - использовать JOIN
8. **НЕ ЗАБЫВАТЬ про RLS** - проверять политики безопасности

### ✅ ЧТО НУЖНО ДЕЛАТЬ

1. **ВСЕГДА тестировать локально** перед деплоем
2. **ВСЕГДА проверять логи** после деплоя
3. **ВСЕГДА делать бэкап БД** перед миграциями
4. **ВСЕГДА использовать try/catch** для async операций
5. **ВСЕГДА логировать ошибки** (через `logger.error`)
6. **ВСЕГДА проверять health check** после деплоя
7. **ВСЕГДА использовать TypeScript** (не any!)
8. **ВСЕГДА документировать сложную логику**

---

## 🎓 ONBOARDING ДЛЯ НОВЫХ РАЗРАБОТЧИКОВ

### День 1: Настройка окружения

1. Клонировать репозиторий
2. Установить зависимости: `npm install` + `cd backend && npm install`
3. Скопировать `.env.example` → `.env.local` и заполнить
4. Запустить локально: `npm run dev` (frontend) + `cd backend && npm run dev`
5. Открыть http://localhost:5173

### День 2: Изучение кодовой базы

1. Прочитать `PROJECT_ARCHITECTURE.md` (этот файл)
2. Изучить структуру папок
3. Посмотреть основные компоненты: `TripwireProfile`, `TripwireLesson`
4. Изучить API endpoints в `backend/src/routes/`

### День 3: Первый коммит

1. Выбрать простую задачу (например, изменить текст на странице)
2. Создать ветку: `git checkout -b feature/my-first-change`
3. Сделать изменения
4. Протестировать локально
5. Закоммитить и создать PR

### Полезные ресурсы

- **Supabase Docs:** https://supabase.com/docs
- **Shadcn/ui:** https://ui.shadcn.com
- **React Router:** https://reactrouter.com
- **Express.js:** https://expressjs.com
- **PM2 Docs:** https://pm2.keymetrics.io

---

## 📞 КОНТАКТЫ И ПОДДЕРЖКА

### При проблемах с:

- **Деплоем:** Проверить `DEPLOYMENT_GUIDE_DIGITALOCEAN.md`
- **БД:** Проверить `SUPABASE_DATABASE_SCHEMA_DOCUMENTATION.md`
- **Ошибками:** Открыть Sentry Dashboard
- **Производительностью:** Проверить индексы и логи PM2

### Частые проблемы

**1. Backend не запускается после деплоя**
```bash
# Проверить логи
pm2 logs onai-backend --err --lines 100

# Частые причины:
# - .env не обновлён
# - Миграции не применены
# - Порт занят
```

**2. AmoCRM интеграция не работает**
```bash
# Проверить токены в БД
SELECT service_name, LEFT(access_token, 20), expires_at 
FROM integration_tokens 
WHERE service_name = 'amocrm';

# Обновить токены если нужно
```

**3. Frontend показывает белый экран**
```bash
# Проверить логи браузера (F12 → Console)
# Частые причины:
# - .env.local не заполнен (VITE_SUPABASE_URL и т.д.)
# - CORS не настроен на backend
# - API недоступен
```

---

## 🔄 ВЕРСИОНИРОВАНИЕ

**Текущая версия:** 2.0 (Декабрь 2025)

**Changelog:**
- **v2.0** (Декабрь 2025):
  - ✅ Добавлены индексы БД для производительности
  - ✅ Токены AmoCRM теперь в БД (не в памяти)
  - ✅ Новая система логирования с уровнями
  - ✅ Retry with exponential backoff для API
  - ✅ Система алертов при сбоях
  - ✅ Health check endpoint `/api/health/deep`
  - ✅ Автоперезапуск backend через PM2

- **v1.x** (До декабря 2025):
  - Базовая функциональность Tripwire
  - Интеграция AmoCRM
  - Admin панель
  - URL Shortener

---

## 📝 ЗАКЛЮЧЕНИЕ

Этот документ - **главный источник правды** о структуре проекта.

**При внесении изменений:**
- ✅ Обновить этот документ
- ✅ Обновить соответствующие technical docs
- ✅ Сообщить команде о breaking changes

**Для AI-ассистентов:**
- Всегда читать этот документ перед работой с кодом
- Следовать архитектурным принципам
- Использовать установленные паттерны
- Не нарушать правила безопасности

---

**Версия:** 2.0  
**Дата:** Декабрь 2025  
**Автор:** OnAI Academy Team  

✅ **ГОТОВО К ИСПОЛЬЗОВАНИЮ!**
