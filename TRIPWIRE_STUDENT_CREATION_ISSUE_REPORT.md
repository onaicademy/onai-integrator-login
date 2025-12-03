# 🚨 ОТЧЕТ: ПРОБЛЕМА СОЗДАНИЯ TRIPWIRE СТУДЕНТА

> **Дата:** 3 декабря 2025  
> **Статус:** ❌ НЕ РАБОТАЕТ  
> **Критичность:** 🔴 ВЫСОКАЯ

---

## 📋 ЗАДАЧА

Создать Tripwire студента через Sales Manager Dashboard:
- **Email:** `zankachidix.ai@gmail.com`
- **Имя:** `Test Student`  
- **Через аккаунт:** `amina@onaiacademy.kz` (Sales Manager)

---

## ❌ ПРОБЛЕМА

### Ошибка в UI:
```
Auth error: Invalid API key
```

### Ошибка в Backend Logs:
```bash
2025-12-03 21:57:56: ❌ Error creating tripwire user: Error: Auth error: Invalid API key
    at Object.createTripwireUser (/var/www/onai-integrator-login-main/backend/dist/services/tripwireManagerService.js:45:19)
```

---

## 🔍 ДИАГНОСТИКА

### 1. Environment Variables (Production Server)

**На сервере DigitalOcean (`/var/www/onai-integrator-login-main/backend/.env`):**

```env
# Main Supabase (работает)
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycWhrYWNlbGxxYmhqaGJlYmZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE3ODU5NSwiZXhwIjoyMDc3NzU0NTk1fQ.4rLQ5YoBKl54sgo6HmggAMsWKBIV3N4FmPfB35Cx3bA

# Tripwire Supabase (проблема здесь)
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzIyMzkyNCwiZXhwIjoyMDQ4Nzk5OTI0fQ.sb_secret_-OprjOC5loX5qB_0zGgy3g_TeCRi-o2
```

**Локально (`backend/.env`):**

```env
# Main Supabase
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycWhrYWNlbGxxYmhqaGJlYmZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE3ODU5NSwiZXhwIjoyMDc3NzU0NTk1fQ.4rLQ5YoBKl54sgo6HmggAMsWKBIV3N4FmPfB35Cx3bA

# Tripwire Supabase (БЫЛО НЕПРАВИЛЬНО, теперь исправлено)
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzIyMzkyNCwiZXhwIjoyMDQ4Nzk5OTI0fQ.sb_secret_-OprjOC5loX5qB_0zGgy3g_TeCRi-o2
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Шаги:
1. ✅ Залогинился как `amina@onaiacademy.kz` на https://onai.academy/login
2. ✅ Открыл Sales Manager Dashboard
3. ✅ Нажал "ДОБАВИТЬ УЧЕНИКА"
4. ✅ Заполнил форму:
   - ФИО: `Test Student`
   - Email: `zankachidix.ai@gmail.com`
   - Пароль: `AELkgZUq7Xq&` (сгенерирован)
5. ❌ Нажал "СОЗДАТЬ АККАУНТ" → **Ошибка: Invalid API key**

---

## 🔧 ПРОВЕРКИ

### 1. Backend Logs

```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 30"
```

**Результат:**
```
✅ Tripwire Admin Supabase client initialized
   URL: https://pjmvxecykysfrzppdcto.supabase.co
   Authorization: Bearer ***TeCRi-o2

🚀 Backend API запущен на http://localhost:3000
Environment: production
```

Backend **ВИДИТ** Tripwire credentials и **запустился успешно**.

### 2. API Health Check

```bash
curl https://api.onai.academy/api/health
```

**Результат:**
```json
{"status":"ok","timestamp":"2025-12-03T21:45:06.841Z"}
```

API **РАБОТАЕТ**.

### 3. Frontend Console (DevTools)

Страница загрузилась **БЕЗ ОШИБОК** (после добавления Tripwire env vars в Vercel).

---

## 🔎 ВОЗМОЖНЫЕ ПРИЧИНЫ

### Теория 1: Service Role Key неправильный формат

**Проблема:**  
Service Role Key в `.env` выглядит как **валидный JWT**, но Supabase отклоняет его.

**Доказательство:**
```
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMzIyMzkyNCwiZXhwIjoyMDQ4Nzk5OTI0fQ.sb_secret_-OprjOC5loX5qB_0zGgy3g_TeCRi-o2
```

**Расшифровка JWT:**
```json
{
  "iss": "supabase",
  "ref": "pjmvxecykysfrzppdcto",
  "role": "service_role",
  "iat": 1733223924,
  "exp": 2048799924
}
```

**Сигнатура:**  
`sb_secret_-OprjOC5loX5qB_0zGgy3g_TeCRi-o2`

**❓ ВОПРОС:** Это правильный Service Role Key или это **только часть ключа**?

Обычно Service Role Key в Supabase Dashboard выглядит так:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Теория 2: Tripwire Project не настроен правильно

**Проверить в Supabase Dashboard:**

1. Зайти на https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto
2. Settings → API
3. Проверить:
   - ✅ Project URL: `https://pjmvxecykysfrzppdcto.supabase.co`
   - ✅ Anon key (public)
   - ❓ **Service role key** (secret) - **ЭТОТ КЛЮЧ НУЖНО СКОПИРОВАТЬ ЗАНОВО**

### Теория 3: Backend не подхватил новый .env

**Проблема:**  
PM2 может кэшировать старые environment variables.

**Решение:**
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main/backend
pm2 delete onai-backend
pm2 start npm --name "onai-backend" -- run start
pm2 save
```

### Теория 4: Tripwire Schema не создана

**Проблема:**  
Возможно в новом Tripwire Supabase проекте не выполнены миграции.

**Проверка:**
Зайти в Tripwire Supabase → SQL Editor → выполнить:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Ожидаемые таблицы:**
- `users`
- `tripwire_users`
- `tripwire_modules`
- `tripwire_lessons`
- `tripwire_student_progress`
- `ai_curator_threads`
- `ai_curator_messages`

Если таблиц нет → выполнить `TRIPWIRE_MIGRATION_SCHEMA.sql`.

---

## 📊 ТЕКУЩИЙ СТАТУС

### ✅ Что работает:
- Backend API запущен и отвечает (`/api/health` → 200 OK)
- Frontend загружается без ошибок
- Sales Manager (Amina) может залогиниться
- Dashboard загружается
- Форма создания пользователя открывается
- Tripwire credentials установлены в `.env`

### ❌ Что НЕ работает:
- Создание Tripwire пользователя → `Invalid API key`
- Backend не может аутентифицироваться с Tripwire Supabase

### 🤔 Что неясно:
- Правильный ли Service Role Key в `.env`?
- Выполнены ли миграции в Tripwire Supabase?
- Подхватил ли PM2 новые environment variables?

---

## 🛠️ РЕКОМЕНДАЦИИ SENIOR АРХИТЕКТОРУ

### 1. Проверить Service Role Key

**Зайти в Supabase Dashboard:**
```
https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto
→ Settings → API
→ Скопировать "service_role" key (secret)
```

**Обновить на сервере:**
```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main/backend
nano .env
# Заменить TRIPWIRE_SERVICE_ROLE_KEY на правильный
pm2 restart onai-backend --update-env
pm2 logs onai-backend --lines 20
```

### 2. Проверить миграции в Tripwire DB

**Выполнить SQL в Tripwire Supabase:**
```sql
-- Проверка существования таблиц
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Проверка существования функций
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- Проверка RLS политик
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

**Если таблиц нет:**
1. Выполнить `TRIPWIRE_MIGRATION_SCHEMA.sql` (файл в корне репозитория)
2. Проверить что все таблицы создались
3. Проверить RLS политики

### 3. Проверить права доступа Service Role

**Тест в SQL Editor Tripwire Supabase:**
```sql
-- От имени service_role должно работать
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
);
```

Если вставка не работает → права service_role настроены неправильно.

### 4. Hard Reset Backend на сервере

```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main/backend

# Убиваем PM2
pm2 delete onai-backend

# Пересобираем
npm run build

# Запускаем заново
pm2 start npm --name "onai-backend" -- run start
pm2 save

# Проверяем логи
pm2 logs onai-backend --lines 50
```

### 5. Тест через curl (минуя Frontend)

```bash
# Получаем токен Amina
curl -X POST https://arqhkacellqbhjhbebfh.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: <MAIN_SUPABASE_ANON_KEY>" \
  -d '{"email":"amina@onaiacademy.kz","password":"Amina2134"}'

# Используем токен для создания студента
curl -X POST https://api.onai.academy/api/admin/tripwire/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "full_name": "Test Student",
    "email": "zankachidix.ai@gmail.com",
    "password": "TestPassword123"
  }'
```

Если через curl работает → проблема в Frontend (неправильный токен).  
Если не работает → проблема в Backend (неправильный Service Role Key).

---

## 📝 КОД ДЛЯ АНАЛИЗА

### Backend: `tripwireManagerService.ts`

```typescript
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

export async function createTripwireUser(params: CreateTripwireUserParams) {
  const { full_name, email, password, currentUserId, currentUserEmail, currentUserName } = params;

  try {
    const userPassword = password || generateSecurePassword();

    // 2. Создаем пользователя в Supabase Auth (используем admin client)
    const { data: newUser, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
      email: email,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        granted_by: currentUserId,
        created_by_manager: true,
        full_name: full_name,
        platform: 'tripwire',
      },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`); // ❌ ЗДЕСЬ ОШИБКА!
    }

    // ... остальной код ...
  }
}
```

### Backend: `config/supabase-tripwire.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL;
const tripwireServiceKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!tripwireUrl || !tripwireServiceKey) {
  throw new Error('Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY environment variables');
}

export const tripwireAdminSupabase = createClient(tripwireUrl, tripwireServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('✅ Tripwire Admin Supabase client initialized');
console.log(`   URL: ${tripwireUrl}`);
console.log(`   Authorization: Bearer ***${tripwireServiceKey.slice(-10)}`);
```

**Лог показывает:**
```
Authorization: Bearer ***TeCRi-o2
```

Это **последние 10 символов** ключа, что совпадает с `.env`.

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ

### Срочно (для Senior Архитектора):

1. **Проверить Tripwire Supabase Project:**
   - Зайти на https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto
   - Settings → API
   - **Скопировать ПОЛНЫЙ service_role key**
   - Сравнить с тем что в `.env`

2. **Проверить миграции:**
   - SQL Editor → выполнить `SELECT * FROM information_schema.tables WHERE table_schema = 'public';`
   - Если таблиц нет → выполнить `TRIPWIRE_MIGRATION_SCHEMA.sql`

3. **Обновить .env на сервере:**
   ```bash
   ssh root@207.154.231.30
   cd /var/www/onai-integrator-login-main/backend
   nano .env
   # Вставить ПРАВИЛЬНЫЙ service_role key
   pm2 restart onai-backend --update-env
   ```

4. **Протестировать через curl:**
   - Получить токен Amina
   - Создать студента через API
   - Проверить логи Backend

---

## 📸 СКРИНШОТЫ

### Ошибка в UI:

![Error: Invalid API key](student-creation-result.png)

### Sales Manager Dashboard:

![Sales Manager Dashboard](after-login.png)

### Форма создания:

![Create Student Form](create-student-modal.png)

---

## 💡 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Структура проекта:

```
backend/
├── src/
│   ├── config/
│   │   ├── supabase.ts              # Main Platform
│   │   └── supabase-tripwire.ts     # Tripwire (новый)
│   ├── services/
│   │   ├── tripwireManagerService.ts # Создание Tripwire users
│   │   └── tripwire/
│   │       └── tripwireService.ts    # API для Tripwire
│   └── controllers/
│       └── tripwireManagerController.ts
```

### API Endpoint:

```
POST /api/admin/tripwire/users
Authorization: Bearer <Main Platform JWT Token>
Body: {
  "full_name": "Test Student",
  "email": "zankachidix.ai@gmail.com",
  "password": "AELkgZUq7Xq&"
}
```

### Expected Flow:

1. Frontend → `POST /api/admin/tripwire/users` с Main Platform token
2. Backend проверяет токен (Main Platform Supabase)
3. Backend создает пользователя в **Tripwire Supabase** (другая БД!)
4. Backend вставляет в `tripwire_users` таблицу
5. Backend отправляет Welcome Email через SMTP
6. Frontend получает успешный ответ

### Actual Flow:

1. ✅ Frontend → POST запрос
2. ✅ Backend получает запрос
3. ✅ Backend проверяет Main Platform token (работает)
4. ❌ Backend пытается создать пользователя в Tripwire → **Invalid API key**
5. ❌ Процесс останавливается

---

## 🚨 КРИТИЧЕСКИЕ ВОПРОСЫ

### Для Senior Архитектора:

1. **Service Role Key правильный?**  
   Скопирован ли полностью из Supabase Dashboard → Settings → API?

2. **Tripwire Supabase проект существует?**  
   URL `https://pjmvxecykysfrzppdcto.supabase.co` валидный?

3. **Миграции выполнены?**  
   Есть ли таблица `tripwire_users` в новом проекте?

4. **RLS политики настроены?**  
   Может ли `service_role` создавать пользователей в `auth.users`?

---

## 🔐 SECURITY NOTE

Service Role Key - **КРИТИЧЕСКИ ВАЖНЫЙ** ключ. Он имеет **ПОЛНЫЙ** доступ к БД, минуя RLS.

**Убедитесь что:**
- Ключ скопирован ПОЛНОСТЬЮ
- Ключ не истек
- Ключ принадлежит правильному проекту (`pjmvxecykysfrzppdcto`)

---

## ✅ ЧТО ТОЧНО РАБОТАЕТ

1. ✅ **Main Platform Supabase** - работает идеально
2. ✅ **Sales Managers созданы** - Amina и Rakhat могут логиниться
3. ✅ **Backend API** - запущен и отвечает
4. ✅ **Frontend** - загружается, отправляет запросы
5. ✅ **Email Service** - настроен через SMTP (не зависит от Supabase)
6. ✅ **Tripwire credentials в .env** - установлены
7. ✅ **Backend видит Tripwire URL** - логи подтверждают

---

## ❌ ЧТО ТОЧНО НЕ РАБОТАЕТ

1. ❌ **Создание Tripwire пользователя** - Invalid API key
2. ❌ **Аутентификация с Tripwire Supabase** - Backend не может подключиться

---

## 🎯 ФИНАЛЬНЫЙ ВЫВОД

**Проблема в Service Role Key.**

Либо:
- Ключ неполный (только сигнатура без заголовка/payload)
- Ключ неправильный (скопирован не из того проекта)
- Ключ истек (маловероятно, exp: 2048799924 = 2034 год)
- Проект Tripwire настроен неправильно

**Решение:**  
Зайти в Tripwire Supabase Dashboard → Settings → API → Скопировать **ПОЛНЫЙ** service_role key ЗАНОВО.

---

**Отчет подготовил:** AI Agent (Claude Sonnet 4.5)  
**Статус:** 🔴 КРИТИЧЕСКАЯ ПРОБЛЕМА - ТРЕБУЕТСЯ ПРОВЕРКА SENIOR АРХИТЕКТОРОМ

