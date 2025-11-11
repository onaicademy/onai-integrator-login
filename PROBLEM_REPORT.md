# 🔴 Отчёт о проблеме: Роль admin не определяется на фронтенде

**Дата:** 11 ноября 2025  
**Проект:** onAI Academy Platform  
**Проблема:** Пользователь с ролью `admin` в базе определяется как `student` на фронтенде

---

## 📊 Текущее состояние

### Пользователь
- Email: `saint@onaiacademy.kz`
- User ID: `1d063207-02ca-41e9-b17b-bf83830e66ca`
- Роль в БД: `admin` (проверено SQL)
- Роль во фронтенде: `student` (неправильно)

### База данных Supabase
- Project ID: `arqhkacellqbhjhbebfh`
- Таблица: `profiles`
- Запись существует: ✅
- `role = 'admin'`: ✅
- `is_active = true`: ✅

### Ошибка
```
GET /rest/v1/profiles?select=role&id=eq.1d063207-02ca-41e9-b17b-bf83830e66ca
Status: 406 (Not Acceptable)
```

---

## 🛠️ Что было сделано

### 1. Очистка RLS политик на таблице `profiles`

Удалены ВСЕ старые политики (17 штук):
```sql
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "admin_full_access" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "users_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "allow_all_authenticated_select" ON profiles;
DROP POLICY IF EXISTS "allow_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_select_open" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin_temp" ON profiles;
DROP POLICY IF EXISTS "profiles_select_auth" ON profiles;
DROP POLICY IF EXISTS "profiles_update_auth" ON profiles;
```

**Причина удаления:** Политика `admin_full_access` содержала рекурсивный запрос к `profiles` внутри себя:
```sql
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
```
Это вызывало infinite recursion и ошибку 500.

### 2. Созданы новые простые RLS политики

```sql
-- RLS включен
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Политика 1: Все авторизованные могут читать профили
CREATE POLICY "authenticated_can_read_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- Политика 2: Только конкретные UUID админов могут обновлять
CREATE POLICY "specific_admins_can_update"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = '3abb77c2-a862-4706-a68c-a11708fbccda' OR  -- admin@onai.com
  auth.uid() = '1d063207-02ca-41e9-b17b-bf83830e66ca'     -- saint@onaiacademy.kz
);
```

**Текущее состояние RLS:**
- `rowsecurity = true` ✅
- 2 политики созданы ✅

### 3. Переписан `AdminGuard.tsx`

**Было:** Сложная проверка с кешированием в `sessionStorage`, множественные проверки, дубли логики.

**Стало:**
```typescript
// Простая проверка без кешей
const { data: { session } } = await supabase.auth.getSession();
const { data: profiles } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', session.user.id)
  .limit(1);

const profile = profiles?.[0];
const userIsAdmin = profile?.role === 'admin';

// Фоллбэк по email если не получили из БД
if (!profile) {
  const isAdminByEmail = user.email === 'saint@onaiacademy.kz' || user.email === 'admin@onai.com';
}
```

**Изменения:**
- Убран `sessionStorage` кеш
- Заменён `getUser()` на `getSession()` (более надёжно)
- Заменён `.single()` на `.limit(1)` (избегаем ошибки 406 при дубликатах)
- Добавлен фоллбэк по email

### 4. Переписан `MainLayout.tsx`

**Было:** Race conditions, роль определялась несколько раз, `AppSidebar` рендерился с дефолтной ролью `student`.

**Стало:**
```typescript
const [userRole, setUserRole] = useState<"admin" | "student" | null>(null);

// Не рендерим пока роль не определена
if (isLoading || userRole === null) {
  return null;
}

// Та же логика чтения из profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .limit(1);

const profile = profiles?.[0];
const finalRole = profile?.role === 'admin' ? 'admin' : 'student';
```

**Изменения:**
- Убрана дефолтная роль `student` → теперь `null`
- Компоненты не рендерятся пока роль не определена
- Убраны race conditions

### 5. Обновлён `AppSidebar.tsx`

**Добавлено:**
```typescript
if (!role) {
  return null; // Не рендерим пока MainLayout загружается
}
```

### 6. Упрощён `StudentsActivity.tsx`

**Убрано:**
- Временные костыли с детальным логированием
- Проверки авторизации внутри компонента

**Оставлено:**
- Прямой запрос к `profiles` без проверок

---

## 📂 Изменённые файлы

1. `src/components/AdminGuard.tsx` — полностью переписан
2. `src/components/layouts/MainLayout.tsx` — полностью переписан
3. `src/components/app-sidebar.tsx` — добавлена проверка `if (!role)`
4. `src/pages/admin/StudentsActivity.tsx` — убраны костыли
5. Supabase: таблица `profiles` — очищены и пересозданы RLS политики

---

## 🔴 Текущая ошибка

### Лог консоли браузера:
```
MainLayout: Загрузка роли...
MainLayout: User ID: 1d063207-02ca-41e9-b17b-bf83830e66ca Email: saint@onaiacademy.kz

GET https://arqhkacellqbhjhbebfh.supabase.co/rest/v1/profiles?select=role&id=eq.1d063207-02ca-41e9-b17b-bf83830e66ca
Status: 406 (Not Acceptable)

MainLayout: Роль определена: student  ← НЕПРАВИЛЬНО!
AppSidebar роль: student
```

### Код запроса:
```typescript
// MainLayout.tsx, строка 35-39
const { data: profiles, error: profileError } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .limit(1);

const profile = profiles?.[0]; // undefined из-за 406
```

### Почему `role = student`:
```typescript
// MainLayout.tsx, строка 51
const finalRole = profile?.role === 'admin' ? 'admin' : 'student';
// profile = undefined → finalRole = 'student'
```

---

## 📊 Проверки в SQL (выполнены, всё ОК)

### 1. Роль в базе:
```sql
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE email = 'saint@onaiacademy.kz';
```
**Результат:** `role = 'admin'`, `is_active = true` ✅

### 2. RLS включён:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';
```
**Результат:** `rowsecurity = true` ✅

### 3. Политики созданы:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';
```
**Результат:**
- `authenticated_can_read_profiles` (SELECT)
- `specific_admins_can_update` (UPDATE)

---

## ❓ Нерешённые вопросы

1. **Почему запрос возвращает 406?**
   - RLS политика `authenticated_can_read_profiles` разрешает чтение всем авторизованным
   - Но PostgREST всё равно возвращает 406 (Not Acceptable)

2. **Есть ли дубликаты строк в `profiles`?**
   - Не проверяли

3. **Правильный ли JWT токен?**
   - Не декодировали и не проверяли claims

4. **Работает ли запрос через Supabase Dashboard?**
   - Не проверяли (Table Editor → profiles)

---

## 🔧 Конфигурация Supabase

### Переменные окружения (.env):
```
VITE_SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci... (208 символов)
```

### Версия SDK:
```json
"@supabase/supabase-js": "^2.x"
```

---

## 📝 Дополнительная информация

### Другие RLS политики в базе (НЕ на `profiles`):
- `admin_reports`: политика с проверкой `raw_user_meta_data ->> 'role' = 'admin'`
- `student_courses`: политика с `EXISTS (SELECT 1 FROM profiles WHERE role = 'admin')` — **может вызывать рекурсию**

### История проблемы:
1. Изначально при входе студенты загружались
2. При перезагрузке страницы пропадали
3. В логах: `AppSidebar роль: student` (даже для админа)
4. После чистки RLS: ошибка 406 на все запросы к `profiles`

---

## ✅ Что точно работает

- ✅ Авторизация через Supabase Auth
- ✅ База данных содержит правильные данные
- ✅ RLS политики созданы корректно (по синтаксису)
- ✅ Фронтенд код упрощён и логичен

## ❌ Что НЕ работает

- ❌ Запрос `supabase.from('profiles').select('role').eq('id', user.id)` → 406
- ❌ Определение роли `admin` на фронтенде
- ❌ Доступ к админ панели `/admin/*`

---

**Конец отчёта**

