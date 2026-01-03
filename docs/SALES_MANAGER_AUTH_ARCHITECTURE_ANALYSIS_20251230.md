# Архитектура авторизации Sales Manager - Полный анализ

**Дата:** 2025-12-30  
**Время:** 13:45 UTC  
**Базы данных:** Traffic DB + Tripwire DB (supabase-tripwire)

---

## 📊 Обзор баз данных

### 1. Traffic Database (oetodaexnjcunklkdlkv)

**Назначение:** Traffic Dashboard для таргетологов и администраторов

#### 1.1 Пользователи в traffic_users

| ID | Email | Full Name | Role | Team | Created |
|-----|--------|-----------|-------|-------|---------|
| 4609fee5-6627-4e78-92ed-8702e8c18c88 | admin@onai.academy | Администратор | admin | null | 2025-12-18 |
| 340087a2-c68d-43b2-af17-1a644a32a8e8 | arystan@onai.academy | null | targetologist | Arystan | 2025-12-22 |
| f0decafb-8598-4671-9b02-bb097ae44452 | kenesary@onai.academy | Kenesary | targetologist | Kenesary | 2025-12-22 |
| 405c6e6b-12b8-4ff7-9f17-808551d81754 | muha@onai.academy | null | targetologist | Muha | 2025-12-22 |
| 297a3c45-355b-4cd3-acee-57d9491a6b43 | traf4@onai.academy | null | targetologist | Traf4 | 2025-12-22 |

**Важно:**
- ❌ **Нет Sales Manager** (role = 'sales_manager' или 'sales')
- ✅ Только 1 admin + 4 targetologist
- ✅ Использует **custom auth** (password_hash в таблице)
- ❌ **Нет связи** с auth.users (auth_user_id = null для всех)

#### 1.2 Схема таблицы traffic_users

| Column | Type | Nullable | Default |
|---------|-------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| email | text | NO | null |
| password_hash | text | NO | null |
| full_name | text | NO | null |
| team_name | text | NO | null |
| role | text | NO | 'targetologist' |
| avatar_url | text | YES | null |
| is_active | boolean | YES | true |
| last_login_at | timestamptz | YES | null |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| team_id | uuid | YES | null |

---

### 2. Tripwire Database (pjmvxecykysfrzppdcto - supabase-tripwire)

**Назначение:** LMS Platform для студентов и Sales Manager

#### 2.1 Sales Manager в public.users

| ID | Email | Full Name | Role | Created |
|-----|--------|-----------|-------|---------|
| a902044d-8c7a-4129-bd6a-855736a3190f | amina@onaiacademy.kz | Amina Sales Manager | sales_manager | 2025-12-04 |
| 7d57dc6b-20d7-49bf-9542-e8f2465104e2 | aselya@onaiacademy.kz | Aselya Sales Manager | sales_manager | 2025-12-17 |
| fead9709-f70b-4b63-a5c3-38dfa944aff4 | ayaulym@onaiacademy.kz | Ayaulym Sales Manager | sales_manager | 2025-12-18 |
| a81e1721-c895-4ce1-b5ad-8eeead234594 | rakhat@onaiacademy.kz | Rakhat Sales Manager | sales_manager | 2025-12-04 |
| 465e3f1c-705c-40c9-8ebf-85982a6e419a | smmmcwin@gmail.com | Alexander CEO | admin | 2025-12-04 |

**Важно:**
- ✅ **4 Sales Manager** + 1 admin
- ✅ Используют **Supabase Auth** (связь с auth.users)
- ✅ Одинаковые ID в public.users и auth.users

#### 2.2 Связь public.users ↔ auth.users

| public_user_id | public_email | public_role | auth_user_id | auth_email |
|----------------|--------------|-------------|--------------|------------|
| a902044d-8c7a-4129-bd6a-855736a3190f | amina@onaiacademy.kz | sales_manager | a902044d-8c7a-4129-bd6a-855736a3190f | amina@onaiacademy.kz |
| 7d57dc6b-20d7-49bf-9542-e8f2465104e2 | aselya@onaiacademy.kz | sales_manager | 7d57dc6b-20d7-49bf-9542-e8f2465104e2 | aselya@onaiacademy.kz |
| fead9709-f70b-4b63-a5c3-38dfa944aff4 | ayaulym@onaiacademy.kz | sales_manager | fead9709-f70b-4b63-a5c3-38dfa944aff4 | ayaulym@onaiacademy.kz |
| a81e1721-c895-4ce1-b5ad-8eeead234594 | rakhat@onaiacademy.kz | sales_manager | a81e1721-c895-4ce1-b5ad-8eeead234594 | rakhat@onaiacademy.kz |
| 465e3f1c-705c-40c9-8ebf-85982a6e419a | smmmcwin@gmail.com | admin | 465e3f1c-705c-40c9-8ebf-85982a6e419a | smmmcwin@gmail.com |

**Вывод:** ✅ **Идеальная синхронизация** - ID совпадают

---

## 🎯 Статистика Sales Manager по Tripwire студентам

| Sales Manager | Email | Студентов | Выручка (₸) |
|--------------|--------|-----------|--------------|
| Amina Sales Manager | amina@onaiacademy.kz | 41 | 205,000 |
| Aselya Sales Manager | aselya@onaiacademy.kz | 0 | 0 |
| Ayaulym Sales Manager | ayaulym@onaiacademy.kz | 5 | 25,000 |
| Rakhat Sales Manager | rakhat@onaiacademy.kz | 43 | 215,000 |
| **ИТОГО** | | **89** | **445,000** |

---

## 🔐 RLS Политики для tripwire_users

### 1. service_role_full_access_tripwire_users
- **Роль:** service_role
- **Действие:** ALL
- **Условие:** true (полный доступ)
- **Тип:** PERMISSIVE

### 2. anon_no_access_tripwire_users
- **Роль:** anon
- **Действие:** ALL
- **Условие:** false (нет доступа)
- **Тип:** PERMISSIVE

### 3. sales_manager_read_all_tripwire_users
- **Роль:** authenticated
- **Действие:** SELECT
- **Условие:**
  ```sql
  (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('sales', 'sales_manager', 'admin')
    )
  )
  OR (user_id = auth.uid())
  ```
- **Тип:** PERMISSIVE

**Разрешает:**
- ✅ Sales Manager читать ВСЕ tripwire_users
- ✅ Студенты читать свои записи

### 4. sales_manager_insert_tripwire_users
- **Роль:** authenticated
- **Действие:** INSERT
- **Условие:**
  ```sql
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('sales', 'sales_manager', 'admin')
  )
  ```
- **Тип:** PERMISSIVE

**Разрешает:**
- ✅ Sales Manager создавать новых студентов

### 5. sales_manager_update_tripwire_users
- **Роль:** authenticated
- **Действие:** UPDATE
- **Условие:**
  ```sql
  (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role IN ('sales', 'sales_manager', 'admin')
    )
    AND (
      granted_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = auth.uid()
        AND u.role = 'admin'
      )
    )
  )
  OR (user_id = auth.uid())
  ```
- **Тип:** PERMISSIVE

**Разрешает:**
- ✅ Sales Manager обновлять своих студентов (granted_by = auth.uid())
- ✅ Admin обновлять всех студентов
- ✅ Студенты обновлять свои записи

### 6. admin_delete_tripwire_users
- **Роль:** authenticated
- **Действие:** DELETE
- **Условие:**
  ```sql
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'admin'
  )
  ```
- **Тип:** PERMISSIVE

**Разрешает:**
- ❌ **Только admin** может удалять tripwire_users
- ❌ Sales Manager НЕ могут удалять студентов через прямое удаление

---

## 🔧 RPC Функция rpc_delete_tripwire_user

### Характеристики:
- **Имя:** rpc_delete_tripwire_user
- **SECURITY DEFINER:** ✅ true (выполняется с правами владельца)
- **Параметр:** p_user_id (uuid)

### Удаляет из 11 таблиц:

1. **user_achievements** - достижения студента
2. **video_tracking** - просмотренные видео
3. **module_unlocks** - разблокированные модули
4. **tripwire_progress** - прогресс по урокам
5. **tripwire_ai_costs** - расходы на AI ментора
6. **sales_activity_log** - логи активности
7. **user_statistics** - статистика студента
8. **certificates** - сертификаты
9. **tripwire_user_profile** - профиль студента
10. **tripwire_users** - основная запись студента
11. **public.users** - запись в users таблице

### Возвращает:
```json
{
  "success": true,
  "email": "student@example.com",
  "full_name": "Student Name",
  "details": "user_achievements: 0 deleted; video_tracking: 5 deleted; ...",
  "message": "User and all related data deleted successfully from Supabase"
}
```

### Обработка ошибок:
- ✅ Каждая таблица обёрнута в BEGIN/EXCEPTION
- ✅ Подробный отчёт об удалении из каждой таблицы
- ✅ Возврат JSON с деталями ошибки

---

## 🏗️ Архитектура авторизации

### Traffic Dashboard (Таргетологи)
```
┌─────────────────────────────────────────┐
│   Traffic Database                 │
│   (oetodaexnjcunklkdlkv)      │
│                                  │
│  traffic_users                    │
│  ├─ id (uuid)                 │
│  ├─ email                      │
│  ├─ password_hash (custom auth)  │
│  ├─ role (targetologist/admin)    │
│  └─ team_name                  │
└─────────────────────────────────────────┘
           ↓
    AuthManager (LocalStorage)
           ↓
┌─────────────────────────────────────────┐
│   Traffic Dashboard Frontend       │
│   (/traffic/* routes)            │
│                                  │
│  - Custom Auth                   │
│  - LocalStorage session          │
│  - NO Supabase AuthContext      │
└─────────────────────────────────────────┘
```

### Tripwire Dashboard (Sales Manager)
```
┌─────────────────────────────────────────┐
│   Supabase Auth                  │
│   (auth.users)                   │
│                                  │
│  ├─ id (uuid)                  │
│  ├─ email                      │
│  ├─ encrypted_password           │
│  └─ created_at                 │
└─────────────────────────────────────────┘
           ↓ (sync by ID)
┌─────────────────────────────────────────┐
│   Tripwire Database               │
│   (pjmvxecykysfrzppdcto)        │
│                                  │
│  public.users                    │
│  ├─ id (FK to auth.users)      │
│  ├─ email                      │
│  ├─ full_name                  │
│  └─ role (sales_manager/admin)   │
└─────────────────────────────────────────┘
           ↓
    tripwireSupabase (Supabase Client)
           ↓
┌─────────────────────────────────────────┐
│   Sales Manager Dashboard         │
│   (/admin/* routes)              │
│                                  │
│  - Supabase AuthContext          │
│  - RPC Functions               │
│  - RLS Policies               │
└─────────────────────────────────────────┘
```

---

## 🔑 Ключевые различия

| Характеристика | Traffic Dashboard | Tripwire Dashboard |
|----------------|------------------|-------------------|
| **База данных** | oetodaexnjcunklkdlkv | pjmvxecykysfrzppdcto |
| **Таблица пользователей** | traffic_users | public.users |
| **Тип авторизации** | Custom (password_hash) | Supabase Auth |
| **Связь с auth.users** | ❌ Нет | ✅ Да (ID совпадают) |
| **Роли** | targetologist, admin | sales_manager, admin |
| **RLS политики** | Не применимо | ✅ Есть |
| **RPC функции** | Не применимо | ✅ rpc_delete_tripwire_user |
| **Sales Manager** | ❌ Нет | ✅ 4 шт. |

---

## ⚠️ Важные выводы

### 1. Traffic Dashboard НЕ содержит Sales Manager
- В traffic_users нет записей с role = 'sales_manager' или 'sales'
- Только targetologist и admin
- **Вывод:** Sales Manager Dashboard использует Tripwire Database

### 2. Tripwire Dashboard использует Supabase Auth
- public.users связана с auth.users по ID
- Все Sales Manager имеют записи в auth.users
- **Вывод:** Frontend должен использовать Supabase AuthContext

### 3. RLS политики ограничивают удаление
- **Только admin** может удалять через прямое DELETE
- Sales Manager НЕ могут удалять напрямую
- **Решение:** Использовать RPC функцию rpc_delete_tripwire_user

### 4. RPC функция - правильный способ удаления
- SECURITY DEFINER позволяет обходить RLS
- Удаляет из всех связанных таблиц
- Подробный отчёт об ошибках
- **Вывод:** Frontend должен вызывать RPC, не DELETE

---

## 📝 Рекомендации

### Для Frontend (UsersTable.tsx)
✅ **Уже реализовано:**
- Вызов RPC функции напрямую через Supabase
- Использование tripwireSupabase клиента
- Обработка ошибок с детальным отчётом

### Для Backend
1. **Удаление auth.users:**
   - RPC функция удаляет только public.users
   - auth.users должны удаляться через Admin API на backend
   - **Требуется:** Реализовать удаление через Supabase Admin API

2. **RLS политики:**
   - Рассмотреть возможность добавить RLS для DELETE для Sales Manager
   - Или оставить только RPC способ (более безопасно)

### Для Database
1. **Индексы:**
   - Проверить индексы на tripwire_users.granted_by
   - Проверить индексы на tripwire_users.user_id

2. **Триггеры:**
   - Рассмотреть триггер для автоматического удаления auth.users
   - При удалении из public.users

---

## 🔗 Связанные документы

- [SALES_MANAGER_DASHBOARD_DIAGNOSTIC_REPORT_20251230.md](./SALES_MANAGER_DASHBOARD_DIAGNOSTIC_REPORT_20251230.md) - Диагностика NULL user_id
- [SALES_MANAGER_DELETE_FIX_REPORT_20251230.md](./SALES_MANAGER_DELETE_FIX_REPORT_20251230.md) - Исправление функции удаления
- [SALES_MANAGER_CLEAR_CACHE_INSTRUCTIONS_20251230.md](./SALES_MANAGER_CLEAR_CACHE_INSTRUCTIONS_20251230.md) - Инструкция по очистке кэша

---

**Создано:** 2025-12-30 13:45 UTC  
**Статус:** ✅ Анализ завершён
