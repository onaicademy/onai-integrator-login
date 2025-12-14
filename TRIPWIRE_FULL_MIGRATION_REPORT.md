# 🚀 TRIPWIRE MIGRATION REPORT - Полная Изоляция Базы Данных

**Дата миграции:** 3 декабря 2025  
**Выполнил:** Senior System Architect & Database Engineer (AI)  
**Статус:** ✅ COMPLETED  
**Цель:** Отделить Tripwire от Main Platform в отдельный Supabase проект

---

## 📋 СОДЕРЖАНИЕ

1. [Проблема и Архитектурное Решение](#проблема)
2. [Создание Нового Supabase Клиента](#клиенты)
3. [Миграция Схемы Базы Данных](#схема)
4. [Рефакторинг Frontend](#frontend)
5. [Рефакторинг Backend](#backend)
6. [Инструкции по Деплою](#deploy)
7. [Чеклист Проверки](#checklist)
8. [Известные Риски](#risks)

---

<a name="проблема"></a>
## 1. ❌ ПРОБЛЕМА И АРХИТЕКТУРНОЕ РЕШЕНИЕ

### Текущая Ситуация (До Миграции)
- **Одна база данных** Supabase для Main Platform и Tripwire
- **Конфликты пользователей:** Сброс пароля на Tripwire влияет на Main Platform
- **Отсутствие изоляции:** Tripwire пользователи видны в основной админке
- **Риски безопасности:** Общий `auth.users` для разных продуктов

### Архитектурное Решение
```
БЫЛО:                             СТАЛО:
┌─────────────────┐              ┌─────────────────┐  ┌─────────────────┐
│  ONE SUPABASE   │              │ MAIN PLATFORM   │  │   TRIPWIRE      │
│                 │              │   SUPABASE      │  │   SUPABASE      │
│  ┌───────────┐  │              │                 │  │                 │
│  │auth.users │  │  ──────►     │ ┌───────────┐   │  │ ┌───────────┐  │
│  │(Platform +│  │              │ │auth.users │   │  │ │auth.users │  │
│  │ Tripwire) │  │              │ │(Main only)│   │  │ │(Tripwire) │  │
│  └───────────┘  │              │ └───────────┘   │  │ └───────────┘  │
│                 │              │                 │  │                 │
│  ┌───────────┐  │              │ ┌───────────┐   │  │ ┌───────────┐  │
│  │  public   │  │              │ │  public   │   │  │ │  public   │  │
│  │  tables   │  │              │ │  tables   │   │  │ │  tables   │  │
│  └───────────┘  │              │ └───────────┘   │  │ └───────────┘  │
└─────────────────┘              └─────────────────┘  └─────────────────┘
     ❌ Монолит                      ✅ Изолированные Системы
```

### Преимущества Изоляции
✅ **Безопасность:** Tripwire пользователи не видны в Main Platform  
✅ **Изоляция:** Сброс пароля на Tripwire не влияет на основных студентов  
✅ **Масштабируемость:** Можно масштабировать каждую базу независимо  
✅ **Гибкость:** Разные настройки Auth, RLS, хранилища для каждого продукта  
✅ **Простота:** Чистый код без условий `if (platform === 'tripwire')`

---

<a name="клиенты"></a>
## 2. 🔧 СОЗДАНИЕ НОВОГО SUPABASE КЛИЕНТА

### Frontend: `src/lib/supabase-tripwire.ts`

**Особенности:**
- Отдельный Supabase URL и Anon Key
- Уникальный `storageKey: 'sb-tripwire-auth-token'` (не конфликтует с Main Platform)
- Отдельный JWT токен в `localStorage` под ключом `'tripwire_supabase_token'`

**Переменные окружения (`.env`):**
```env
# Tripwire Supabase (НОВЫЙ ПРОЕКТ)
VITE_TRIPWIRE_SUPABASE_URL=https://your-tripwire-project.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=eyJhbG...your_tripwire_anon_key
```

### Backend: `backend/src/config/supabase-tripwire.ts`

**Особенности:**
- Использует `TRIPWIRE_SERVICE_ROLE_KEY` для admin операций
- Полностью изолирован от Main Platform
- Используется в `tripwireManagerService.ts` для создания пользователей

**Переменные окружения (`backend/.env`):**
```env
# Tripwire Supabase (Backend Admin Client)
TRIPWIRE_SUPABASE_URL=https://your-tripwire-project.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbG...your_tripwire_service_role_key
```

---

<a name="схема"></a>
## 3. 📊 МИГРАЦИЯ СХЕМЫ БАЗЫ ДАННЫХ

### SQL Скрипты
1. **`TRIPWIRE_MIGRATION_SCHEMA.sql`** - Создание всех таблиц в новой БД
2. **`TRIPWIRE_MIGRATION_DATA.sql`** - Миграция данных (закомментирована, требует создания пользователей в Auth)

### Таблицы, Созданные в Новой Базе

| Таблица | Описание | Комментарий |
|---------|----------|-------------|
| `public.courses` | Курсы Tripwire | Сейчас 1 курс (ID: 13) |
| `public.modules` | Модули курса | 3 модуля |
| `public.lessons` | Уроки | 3 урока (ID: 67, 68, 69) |
| `public.users` | Базовая таблица пользователей | Связь с `auth.users` |
| `public.tripwire_users` | Метаданные Tripwire пользователей | Создано Sales Manager |
| `public.tripwire_user_profile` | Профили (прогресс, сертификаты) | |
| `public.tripwire_progress` | Прогресс по урокам | |
| `public.tripwire_achievements` | Достижения (3 за модули) | |
| `public.tripwire_certificates` | Сертификаты | |
| `public.tripwire_ai_threads` | AI-куратор (треды) | |
| `public.tripwire_ai_messages` | AI-куратор (сообщения) | |
| `public.tripwire_ai_attachments` | AI-куратор (файлы) | |
| `public.tripwire_ai_costs` | Трекинг затрат на AI | |
| `public.sales_activity_log` | Логи Sales Manager | |

### RLS Policies

**Пример для `tripwire_progress`:**
```sql
CREATE POLICY "Users can view own progress" 
  ON public.tripwire_progress 
  FOR SELECT 
  USING (tripwire_user_id::uuid = auth.uid());
```

Все таблицы защищены RLS политиками — пользователи видят только свои данные.

---

<a name="frontend"></a>
## 4. 🎨 РЕФАКТОРИНГ FRONTEND

### Обновленные Файлы

| Файл | Изменения |
|------|-----------|
| `src/lib/supabase-tripwire.ts` | **НОВЫЙ** - Tripwire Supabase клиент |
| `src/hooks/useTripwireAuth.ts` | Использует `tripwireSupabase` вместо `supabase` |
| `src/hooks/useTripwireVideoTracking.ts` | Использует `tripwireSupabase` |
| `src/lib/tripwire-chat.ts` | Все запросы через `tripwireSupabase` |
| `src/lib/tripwire-openai.ts` | Использует `tripwireSupabase` |
| `src/pages/tripwire/TripwireProfile.tsx` | Обновлен импорт клиента |
| `src/pages/tripwire/TripwireCertificatePage.tsx` | Обновлен импорт клиента |
| `src/pages/tripwire/components/AccountSettings.tsx` | Использует `tripwireSupabase` |

### Ключевые Изменения

**До:**
```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase.from('tripwire_progress').select('*');
```

**После:**
```typescript
import { tripwireSupabase } from '@/lib/supabase-tripwire'; // 🔥 НОВЫЙ КЛИЕНТ

const { data } = await tripwireSupabase.from('tripwire_progress').select('*');
```

**JWT Token Storage:**
- Старая версия: `localStorage.setItem('supabase_token', token)`
- Новая версия: `localStorage.setItem('tripwire_supabase_token', token)`

---

<a name="backend"></a>
## 5. 🔧 РЕФАКТОРИНГ BACKEND

### Новые/Обновленные Файлы

| Файл | Описание |
|------|----------|
| `backend/src/config/supabase-tripwire.ts` | **НОВЫЙ** - Admin клиент для Tripwire |
| `backend/src/services/tripwire/tripwireService.ts` | **НОВЫЙ** - Service для Tripwire операций |
| `backend/src/routes/tripwire.ts` | **НОВЫЙ** - API роуты для Tripwire |
| `backend/src/services/tripwireManagerService.ts` | Использует `tripwireAdminSupabase` |

### API Эндпоинты

#### Sales Manager Dashboard
```
POST   /api/admin/tripwire/users       - Создать Tripwire пользователя
GET    /api/admin/tripwire/users       - Получить список пользователей
PATCH  /api/admin/tripwire/users/:id   - Обновить статус пользователя
GET    /api/admin/tripwire/stats       - Статистика Tripwire
GET    /api/admin/tripwire/activity    - Логи действий
GET    /api/admin/tripwire/leaderboard - Рейтинг менеджеров
```

#### Tripwire API
```
POST   /api/tripwire/users             - Создать пользователя (service)
GET    /api/tripwire/users             - Получить пользователей
PUT    /api/tripwire/users/:id/status  - Обновить статус
GET    /api/tripwire/stats             - Статистика
```

### Пример Создания Пользователя (Backend)

**До:**
```typescript
import { adminSupabase } from '../config/supabase';

const { data } = await adminSupabase.auth.admin.createUser({...});
```

**После:**
```typescript
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

const { data } = await tripwireAdminSupabase.auth.admin.createUser({...});
```

---

<a name="deploy"></a>
## 6. 🚀 ИНСТРУКЦИИ ПО ДЕПЛОЮ

### Шаг 1: Создать Новый Supabase Проект

1. Зайти на [supabase.com](https://supabase.com)
2. Создать новый проект `onai-tripwire` (или аналогичное имя)
3. Скопировать URL и ключи:
   - `SUPABASE_URL`
   - `ANON_KEY`
   - `SERVICE_ROLE_KEY`

### Шаг 2: Настроить Переменные Окружения

**Frontend (`.env`):**
```env
VITE_TRIPWIRE_SUPABASE_URL=https://your-tripwire-project.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=eyJhbG...
```

**Backend (`backend/.env`):**
```env
TRIPWIRE_SUPABASE_URL=https://your-tripwire-project.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbG...
```

### Шаг 3: Выполнить SQL Миграции

1. Зайти в Supabase Dashboard нового проекта → SQL Editor
2. Выполнить `TRIPWIRE_MIGRATION_SCHEMA.sql` (создание таблиц)
3. ⚠️ **НЕ ЗАПУСКАТЬ** `TRIPWIRE_MIGRATION_DATA.sql` сразу!

### Шаг 4: Настроить Supabase Auth

В Supabase Dashboard нового проекта → Authentication → URL Configuration:

```
Site URL: https://onai.academy
Redirect URLs:
  - https://onai.academy/tripwire
  - https://onai.academy/tripwire/login
  - https://onai.academy/tripwire/update-password
```

**Email Templates:**
- Загрузить HTML шаблоны для:
  - Reset Password
  - Welcome Email
  - Email Confirmation

### Шаг 5: Миграция Данных (Опционально)

**⚠️ ВНИМАНИЕ:** Пароли пользователей НЕ мигрируются! Хэши паролей нельзя перенести.

**Варианты:**
1. **Создать пользователей заново** через Sales Manager Dashboard (рекомендуется)
2. **Использовать Password Reset** для всех существующих пользователей
3. **Ручная миграция** (см. `TRIPWIRE_MIGRATION_DATA.sql`)

### Шаг 6: Деплой Frontend

```bash
cd /Users/miso/onai-integrator-login
npm run build
# Деплой на Vercel (автоматически через GitHub push)
```

### Шаг 7: Деплой Backend

```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
git pull origin main
cd backend
npm install --production
npm run build
pm2 restart onai-backend
pm2 logs onai-backend --lines 20
```

**Проверка:**
```bash
curl https://api.onai.academy/api/health
```

---

<a name="checklist"></a>
## 7. ✅ ЧЕКЛИСТ ПРОВЕРКИ

### После Деплоя Frontend:

- [ ] Открыть `/tripwire/login`
- [ ] Попытаться залогиниться (должна быть ошибка, если пользователь не мигрирован)
- [ ] Проверить в DevTools → Network → Headers: запросы идут на новый Supabase URL
- [ ] Проверить `localStorage`: должен быть `tripwire_supabase_token` (не `supabase_token`)

### После Деплоя Backend:

- [ ] Проверить логи PM2: `pm2 logs onai-backend`
- [ ] Убедиться, что Backend использует `TRIPWIRE_SUPABASE_URL`
- [ ] Протестировать создание пользователя через Sales Manager Dashboard

### Тестирование Изоляции:

- [ ] Создать пользователя на Tripwire
- [ ] Проверить, что он НЕ виден в Main Platform Admin Dashboard
- [ ] Сбросить пароль на Tripwire
- [ ] Убедиться, что Main Platform пользователи НЕ затронуты
- [ ] Залогиниться на Tripwire
- [ ] Проверить прогресс видео (трекинг работает)
- [ ] Проверить AI-куратора (сообщения сохраняются)

---

<a name="risks"></a>
## 8. ⚠️ ИЗВЕСТНЫЕ РИСКИ И ОГРАНИЧЕНИЯ

### Риск 1: Потеря Паролей При Миграции
**Проблема:** Хэши паролей нельзя перенести из одной Supabase БД в другую.  
**Решение:** Отправить всем Tripwire пользователям письмо с инструкцией по сбросу пароля.

### Риск 2: Связь Sales Manager → Tripwire Users
**Проблема:** `granted_by` в `tripwire_users` ссылается на UUID менеджера из СТАРОЙ базы.  
**Решение:** Поле `granted_by` теперь просто UUID (без Foreign Key), `manager_name` хранит имя менеджера.

### Риск 3: Двойные Credentials
**Проблема:** Нужно поддерживать 2 набора Supabase credentials.  
**Решение:** Использовать переменные окружения с префиксом `TRIPWIRE_` для разделения.

### Риск 4: Увеличение Стоимости
**Проблема:** Два Supabase проекта = двойная стоимость.  
**Решение:** Tripwire — небольшой проект (3 урока), стоимость минимальна. Можно использовать Free Tier.

---

## 9. 📝 ДОПОЛНИТЕЛЬНЫЕ ЗАМЕТКИ

### Supabase Projects:

| Проект | URL | Назначение |
|--------|-----|------------|
| **Main Platform** | `https://arqhkacellqbhjhbebfh.supabase.co` | Основная платформа (студенты, курсы, AI-наставник) |
| **Tripwire** | `https://your-tripwire-project.supabase.co` | Tripwire (3 урока, Sales Manager Dashboard) |

### API Endpoints:

| Endpoint | База Данных |
|----------|-------------|
| `POST /api/students` | Main Platform Supabase |
| `POST /api/admin/tripwire/users` | Tripwire Supabase |
| `GET /api/tripwire/progress` | Tripwire Supabase |
| `POST /api/ai-curator/message` (Main) | Main Platform Supabase |
| `POST /api/ai-curator/message` (Tripwire) | Tripwire Supabase |

### JWT Tokens:

| Ключ в `localStorage` | Назначение |
|----------------------|------------|
| `supabase_token` | Main Platform JWT |
| `tripwire_supabase_token` | Tripwire JWT |
| `sb-arqhkacellqbhjhbebfh-auth-token` | Main Platform session |
| `sb-tripwire-auth-token` | Tripwire session |

---

## 10. 🎯 ИТОГО

### Что Было Сделано:

✅ Создан отдельный Supabase клиент для Tripwire (Frontend & Backend)  
✅ Экспортирована схема БД Tripwire из старой базы  
✅ Созданы SQL скрипты для миграции (schema + data)  
✅ Рефакторен Frontend: все Tripwire компоненты используют `tripwireSupabase`  
✅ Рефакторен Backend: `tripwireManagerService` использует `tripwireAdminSupabase`  
✅ Написан детальный отчет с инструкциями по деплою  

### Следующие Шаги:

1. Создать новый Supabase проект для Tripwire
2. Добавить credentials в `.env` файлы
3. Выполнить SQL миграции
4. Настроить Auth URLs и Email Templates
5. Задеплоить Frontend и Backend
6. Протестировать полный цикл: создание пользователя → логин → прогресс → сертификат

---

**Выполнено:** Senior System Architect & Database Engineer (AI)  
**Дата:** 3 декабря 2025  
**Статус:** ✅ READY FOR DEPLOYMENT

