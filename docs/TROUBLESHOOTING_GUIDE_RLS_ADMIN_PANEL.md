# 🔧 Гайд: Исправление проблемы с пропадающей админ-панелью

**Дата:** 8 ноября 2025  
**Проект:** OnAI Academy Platform  
**Проблема:** Админ-панель пропадает при обновлении страницы

---

## 📋 Оглавление

1. [Симптомы проблемы](#симптомы-проблемы)
2. [Диагностика](#диагностика)
3. [Корневая причина](#корневая-причина)
4. [Решение](#решение)
5. [Тестирование](#тестирование)
6. [Методология для будущих проблем](#методология-для-будущих-проблем)

---

## 🚨 Симптомы проблемы

### Что наблюдалось:

1. ✅ **При первом входе** - админ-панель отображается нормально
2. ❌ **При обновлении страницы (F5)** - админ-панель пропадает из меню
3. ❌ **Бесконечная загрузка** при попытке открыть `/admin` после обновления
4. ❌ **Раздел "Ученики"** показывает "Ошибка загрузки учеников"
5. ⚠️ **Непоследовательное поведение** - иногда показывает полный админ дашборд, иногда студенческое меню

### Дополнительные симптомы:

- Logout не работал корректно
- Данные пользователя не подтягивались в "Настройки" и "Профиль"
- При обновлении страницы в админ-панели сайт "крашился"

---

## 🔍 Диагностика

### ШАГ 1: Анализ браузерных логов

**Где смотреть:** Developer Console (F12) → Console Tab

**Что искали:**
```javascript
❌ Ошибки авторизации
❌ Failed requests
❌ Бесконечные циклы
```

**Что нашли:**
```
⚠️ Роль определяется как "student" после обновления
⚠️ Множественные запросы к auth.getUser()
```

### ШАГ 2: Анализ Supabase Logs

**Где смотреть:**
```
https://supabase.com/dashboard/project/[PROJECT_ID]/logs/edge-logs
```

**Экспортировали CSV логи** за период проблемы (7-8 ноября)

**Критическая находка:**
```csv
GET | 500 | /rest/v1/profiles?select=*&order=created_at.desc
GET | 500 | /rest/v1/profiles?select=role&id=eq.1d063207...
```

**❌ ПРОБЛЕМА:** Таблица `profiles` возвращает **500 Internal Server Error**

### ШАГ 3: Анализ RLS политик

**Запрос для проверки:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Проблема:**
```sql
-- Старая политика (РЕКУРСИВНАЯ!)
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    -- ☠️ РЕКУРСИЯ: profiles запрашивает сам себя!
  );
```

### ШАГ 4: Трассировка flow авторизации

**Проблемный flow:**
```
1. User обновляет страницу /admin
2. AdminGuard → supabase.auth.getUser() ✅
3. MainLayout → supabase.auth.getUser() ✅ (дублирование!)
4. MainLayout → supabase.from('profiles').select('role') ❌ (500 error!)
5. MainLayout устанавливает роль = "student" (fallback)
6. AppSidebar скрывает "Админ панель" для студентов
7. AdminGuard перенаправляет на /courses
```

---

## 💡 Корневая причина

### Две основные проблемы:

#### 1. **Бесконечная рекурсия в RLS политиках**

**Причина:**
- RLS политика на `profiles` проверяла роль, запрашивая саму таблицу `profiles`
- PostgreSQL входил в бесконечный цикл при проверке прав доступа
- Запросы к `profiles` возвращали **500 Internal Server Error**

**Пример проблемного кода:**
```sql
-- ❌ ПЛОХО: Рекурсия
CREATE POLICY "Check role from profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    -- profiles → profiles → profiles → ...
  );
```

#### 2. **Race condition и дублирование auth запросов**

**Причина:**
- `AdminGuard` и `MainLayout` оба делали `supabase.auth.getUser()` одновременно
- Каждый раз при обновлении страницы - **4-6 запросов к Supabase**
- Отсутствие кеширования роли пользователя

**Лог запросов при обновлении:**
```
GET /auth/v1/user (AdminGuard)
GET /auth/v1/user (MainLayout)
GET /rest/v1/profiles?select=role (MainLayout) → 500 error
GET /auth/v1/user (повторный запрос из-за ошибки)
```

---

## ✅ Решение

### ИСПРАВЛЕНИЕ 1: Новые RLS политики (БЕЗ рекурсии)

**Файл:** `supabase/migrations/20251108_CLEAN_AND_FIX_RLS.sql`

**Ключевые изменения:**

```sql
-- 1. Удаляем ВСЕ старые политики
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- 2. Создаём БЕЗОПАСНУЮ функцию is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users  -- ✅ Запрашиваем auth.users (НЕ profiles!)
    WHERE id = auth.uid()
  ) = 'saint@onaiacademy.kz';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;  -- STABLE = кешируется!

-- 3. Простые RLS политики
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);  -- ✅ Все могут читать (для упрощения)

CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());  -- ✅ Используем функцию (БЕЗ рекурсии)
```

**Почему это работает:**
- ✅ Функция `is_admin()` запрашивает `auth.users` (НЕ `profiles`)
- ✅ `STABLE` означает что результат кешируется в рамках транзакции
- ✅ Нет циклических зависимостей

### ИСПРАВЛЕНИЕ 2: sessionStorage кеширование роли

**Файлы:**
- `src/components/layouts/MainLayout.tsx`
- `src/components/AdminGuard.tsx`
- `src/pages/Login.tsx`
- `src/pages/ProfileSettings.tsx`

**Ключевые изменения:**

#### MainLayout.tsx
```typescript
async function loadUserRole() {
  // ✅ ОПТИМИЗАЦИЯ: Проверяем sessionStorage сначала
  const cachedRole = sessionStorage.getItem('user_role');
  const cachedEmail = sessionStorage.getItem('user_email');
  
  if (cachedRole && cachedEmail) {
    console.log('✅ MainLayout: Роль из кеша:', cachedRole);
    setUserRole(cachedRole as "admin" | "student");
    setIsLoading(false);
    return;  // ✅ Выходим БЕЗ запроса к Supabase!
  }

  // Если нет кеша - делаем запрос
  const { data: { user } } = await supabase.auth.getUser();
  
  const role = user.email === 'saint@onaiacademy.kz' ? 'admin' : 'student';
  
  // ✅ Кешируем на время сессии
  sessionStorage.setItem('user_role', role);
  sessionStorage.setItem('user_email', user.email || '');
  
  setUserRole(role);
}
```

#### AdminGuard.tsx
```typescript
async function checkAdmin() {
  // ✅ ОПТИМИЗАЦИЯ: Проверяем sessionStorage сначала
  const cachedRole = sessionStorage.getItem('user_role');
  const cachedEmail = sessionStorage.getItem('user_email');
  
  if (cachedRole === 'admin' && cachedEmail === 'saint@onaiacademy.kz') {
    console.log('✅ AdminGuard: Роль из кеша - admin');
    setIsAdmin(true);
    setIsLoading(false);
    return;  // ✅ Нет запроса к Supabase!
  }

  // Только если нет кеша - делаем запрос
  const { data: { user } } = await supabase.auth.getUser();
  const userIsAdmin = user?.email === 'saint@onaiacademy.kz';
  
  if (userIsAdmin) {
    sessionStorage.setItem('user_role', 'admin');
    sessionStorage.setItem('user_email', user.email);
    setIsAdmin(true);
  }
}
```

#### Login.tsx (очистка кеша при новом входе)
```typescript
if (data.user) {
  // ✅ ВАЖНО: Очищаем старый кеш при новом входе
  sessionStorage.clear();
  
  toast({ title: '✅ Добро пожаловать!' });
  navigate(from, { replace: true });
}
```

#### ProfileSettings.tsx (очистка кеша при выходе)
```typescript
const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  // ✅ ВАЖНО: Очищаем кеш при выходе
  console.log('👋 Пользователь вышел из системы');
  sessionStorage.clear();

  navigate("/login", { replace: true });
};
```

**Результат:**
- ✅ При первом входе - 1 запрос к Supabase
- ✅ При обновлении страницы - 0 запросов (берётся из кеша)
- ✅ При выходе - кеш очищается
- ✅ При новом входе - кеш пересоздаётся

---

## 🧪 Тестирование

### Тест 1: Localhost

**Команды:**
```bash
# 1. Создать SSL сертификаты для HTTPS
mkdir -p ssl
openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# 2. Запустить dev server
npm run dev

# 3. Открыть https://localhost:8080
```

**Чек-лист:**
- ✅ Вход работает
- ✅ Админ-панель отображается
- ✅ При обновлении (F5) - админ-панель НЕ пропадает
- ✅ Раздел "Ученики" загружает 12 студентов
- ✅ Logout работает
- ✅ В Console НЕТ 500 ошибок

### Тест 2: Production (Digital Ocean)

**Команды:**
```bash
# Деплой
git add -A
git commit -m "fix: ФИНАЛЬНОЕ исправление RLS + sessionStorage"
git push origin main
./deploy.sh
```

**Чек-лист:**
- ✅ Вход работает на https://onai.academy
- ✅ Админ-панель стабильна
- ✅ Обновление страницы (F5) x10 раз - всё работает
- ✅ Студенты загружаются
- ✅ Logout → Login → всё работает

### Тест 3: Console проверка

**Открыть Console (F12):**

**✅ Должно быть:**
```
✅ MainLayout: Роль из кеша: admin
✅ AdminGuard: Роль из кеша - admin
✅ Загружено студентов: 12
```

**❌ НЕ должно быть:**
```
❌ 500 error на /rest/v1/profiles
❌ infinite recursion detected
❌ Ошибка загрузки профиля
```

---

## 📚 Методология для будущих проблем

### 1️⃣ ДИАГНОСТИКА (в этом порядке!)

```
┌─────────────────────────────────────┐
│ 1. Браузерные логи (Console)       │
│    - Ошибки JS                      │
│    - Failed requests                │
│    - Warnings                       │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 2. Supabase Edge Logs               │
│    - Status codes (500, 403, 401)   │
│    - Request paths                  │
│    - Error messages                 │
│    - Экспортировать CSV за период   │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 3. Database (RLS + Policies)        │
│    SELECT * FROM pg_policies        │
│    WHERE tablename = 'TABLE_NAME';  │
│    - Проверить рекурсию             │
│    - Проверить permissions          │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│ 4. Frontend Code                    │
│    - useEffect dependencies         │
│    - Auth state management          │
│    - Race conditions                │
└─────────────────────────────────────┘
```

### 2️⃣ ГДЕ ИСКАТЬ ПРОБЛЕМЫ

#### Supabase проблемы (90% случаев):

**✅ ВСЕГДА проверяй сначала:**
1. **Edge Logs** - показывают реальные HTTP ошибки
2. **RLS Policies** - часто причина 500/403 ошибок
3. **Database triggers** - могут вызывать рекурсию
4. **Auth settings** - неправильные JWT или roles

**Команды для диагностики:**
```sql
-- Проверить все RLS политики
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
ORDER BY tablename;

-- Проверить triggers
SELECT * FROM pg_trigger 
WHERE tgrelid = 'profiles'::regclass;

-- Проверить функции
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname LIKE '%admin%';
```

#### Frontend проблемы (10% случаев):

**Проверь:**
1. `useEffect` с отсутствующими зависимостями
2. Множественные auth listeners
3. Отсутствие кеширования данных
4. Race conditions при параллельных запросах

### 3️⃣ BEST PRACTICES для Supabase + React

#### RLS Policies:

```sql
-- ✅ ХОРОШО: Простая проверка
CREATE POLICY "Users view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- ✅ ХОРОШО: Функция с STABLE (кешируется)
CREATE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@example.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ❌ ПЛОХО: Рекурсивный запрос
CREATE POLICY "Bad policy"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    -- ☠️ profiles запрашивает profiles!
  );

-- ❌ ПЛОХО: Сложный JOIN в политике
CREATE POLICY "Bad join policy"
  ON table_a FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM table_b 
      JOIN table_c ON ...
      WHERE ...
    )
    -- ☠️ Медленно и может зависнуть
  );
```

#### React Auth State:

```typescript
// ✅ ХОРОШО: Кеширование роли
const cachedRole = sessionStorage.getItem('user_role');
if (cachedRole) {
  return cachedRole; // Нет запроса к Supabase
}

// ✅ ХОРОШО: Один useEffect с защитой
useEffect(() => {
  let isMounted = true;
  let roleChecked = false;

  async function load() {
    if (roleChecked) return; // Защита от повторного вызова
    roleChecked = true;
    
    const role = await fetchRole();
    if (isMounted) setRole(role);
  }

  load();
  return () => { isMounted = false; };
}, []); // Пустой массив = ОДИН РАЗ

// ❌ ПЛОХО: Множественные запросы
useEffect(() => {
  supabase.auth.getUser(); // Запрос 1
}, []);

useEffect(() => {
  supabase.auth.getUser(); // Запрос 2 (дублирование!)
}, []);
```

### 4️⃣ ИНСТРУМЕНТЫ для диагностики

#### Browser DevTools:
```
F12 → Console: Логи и ошибки
F12 → Network: HTTP запросы (фильтр: fetch/xhr)
F12 → Application → Session Storage: Проверить кеш
```

#### Supabase Dashboard:
```
Logs → Edge Logs: HTTP статус коды
Database → Tables: Просмотр данных
Database → Policies: RLS политики
SQL Editor: Запросы для диагностики
```

#### Terminal:
```bash
# Логи production сервера (если PM2)
ssh user@server
pm2 logs onai-app

# Логи Vite dev server
npm run dev 2>&1 | tee dev.log
```

---

## 📁 Файлы изменений

### SQL Миграции:
- `supabase/migrations/20251108_FINAL_FIX_profiles_sync_and_secure_rls.sql`
- `supabase/migrations/20251108_CLEAN_AND_FIX_RLS.sql`

### Frontend:
- `src/components/layouts/MainLayout.tsx` - sessionStorage кеш
- `src/components/AdminGuard.tsx` - sessionStorage кеш
- `src/pages/Login.tsx` - очистка кеша при входе
- `src/pages/ProfileSettings.tsx` - очистка кеша при выходе

---

## 🎯 Итоги

### Что сработало:

1. ✅ **Анализ Supabase Edge Logs** - нашли 500 ошибки
2. ✅ **Исправление RLS политик** - убрали рекурсию
3. ✅ **sessionStorage кеширование** - убрали race conditions
4. ✅ **Тестирование на localhost** - быстрая проверка без деплоя

### Ключевые уроки:

- 🔍 **Всегда проверяй Supabase Logs ПЕРВЫМИ** при проблемах с БД
- 💾 **Кешируй данные** которые не меняются часто (роль пользователя)
- 🔄 **Избегай рекурсии** в RLS политиках
- 🧪 **Тестируй на localhost** с той же Supabase БД

---

## 📞 Контакты

**Проект:** OnAI Academy Platform  
**GitHub:** https://github.com/onaicademy/onai-integrator-login  
**Production:** https://onai.academy

---

**Дата создания:** 8 ноября 2025  
**Последнее обновление:** 8 ноября 2025

