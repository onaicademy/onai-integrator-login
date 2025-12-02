# ⚡ Quick Reference: Supabase RLS Troubleshooting

> Быстрая шпаргалка для решения проблем с RLS политиками

---

## 🚨 Частые ошибки

### 1. "infinite recursion detected in policy"

**Причина:** RLS политика запрашивает ту же таблицу

**❌ Плохо:**
```sql
CREATE POLICY "Check role"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    -- ☠️ profiles → profiles (рекурсия!)
  );
```

**✅ Исправление:**
```sql
-- Вариант 1: Проверка по email
CREATE POLICY "Check admin email"
  ON profiles FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@example.com'
  );

-- Вариант 2: Функция с STABLE
CREATE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'admin@example.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admin can view all"
  ON profiles FOR SELECT
  USING (is_admin());
```

---

### 2. "500 Internal Server Error" на запросах

**Диагностика:**
```
1. Открой Supabase Dashboard
2. Logs → Edge Logs
3. Экспортируй CSV логи за период проблемы
4. Найди все запросы со status_code = 500
5. Проверь таблицу и RLS политики
```

**Команды для проверки:**
```sql
-- Все политики на таблице
SELECT * FROM pg_policies WHERE tablename = 'YOUR_TABLE';

-- Проверить есть ли RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'YOUR_TABLE';

-- Включить/выключить RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;
```

---

### 3. Race conditions при auth запросах

**Проблема:** Множественные компоненты делают `getUser()` одновременно

**❌ Плохо:**
```typescript
// AdminGuard.tsx
useEffect(() => {
  supabase.auth.getUser(); // Запрос 1
}, []);

// MainLayout.tsx
useEffect(() => {
  supabase.auth.getUser(); // Запрос 2 (дублирование!)
}, []);
```

**✅ Исправление:**
```typescript
// Кеширование в sessionStorage
async function loadUser() {
  const cached = sessionStorage.getItem('user_data');
  if (cached) return JSON.parse(cached);
  
  const { data: { user } } = await supabase.auth.getUser();
  sessionStorage.setItem('user_data', JSON.stringify(user));
  return user;
}
```

---

## 🔧 Полезные SQL команды

### Диагностика RLS

```sql
-- Все политики в базе
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
ORDER BY tablename, policyname;

-- Политики конкретной таблицы
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Проверить включен ли RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public';
```

### Удаление политик

```sql
-- Удалить одну политику
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Удалить ВСЕ политики таблицы
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
```

### Создание безопасных политик

```sql
-- Базовая политика: пользователь видит только свои данные
CREATE POLICY "Users view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

-- Политика для админа (через функцию)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users 
    WHERE id = auth.uid()
  ) = 'admin@example.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admin can do anything"
  ON table_name FOR ALL
  USING (is_admin());

-- Комбинированная политика
CREATE POLICY "Users or admin can view"
  ON table_name FOR SELECT
  USING (
    auth.uid() = user_id  -- Свои данные
    OR 
    is_admin()  -- Или админ
  );
```

---

## 📊 Checklist: Перед деплоем изменений RLS

- [ ] Протестировал политики в SQL Editor
- [ ] Проверил что нет рекурсии
- [ ] Проверил что `auth.uid()` работает
- [ ] Создал функции с `STABLE` для кеширования
- [ ] Протестировал на localhost
- [ ] Проверил Edge Logs на 500 ошибки
- [ ] Сделал бекап таблицы (если важные данные)

---

## 🎯 Быстрые команды для деплоя

```bash
# 1. Создать миграцию
echo "-- SQL код" > supabase/migrations/$(date +%Y%m%d)_fix.sql

# 2. Применить в Supabase Dashboard
# Открыть SQL Editor и вставить код

# 3. Тестировать на localhost
npm run dev

# 4. Деплой на production
git add -A
git commit -m "fix: RLS policies"
git push origin main
./deploy.sh
```

---

## 🔍 Debugging flow

```
Проблема с доступом к данным
        ↓
Проверить Console (F12)
        ↓
Есть 403/500 ошибки?
        ↓
Открыть Supabase Edge Logs
        ↓
Найти failed requests
        ↓
Проверить RLS политики:
SELECT * FROM pg_policies WHERE tablename = '...';
        ↓
Проблема в политике?
        ↓
Удалить старую → Создать новую
        ↓
Тест в SQL Editor
        ↓
Деплой на production
```

---

**Последнее обновление:** 8 ноября 2025

