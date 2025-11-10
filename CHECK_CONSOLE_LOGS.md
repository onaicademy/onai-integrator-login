# 📋 Проверка логов консоли

## ✅ Что мы узнали из тестов:

1. **Сессия работает** ✅
   - User: `saint@onaiacademy.kz`
   - Role: `admin`
   - Authenticated: `true`

2. **API ключ в тест-файле был неправильный** ❌
   - Обновил тест-файл, теперь берёт ключ из localStorage
   - Обнови страницу `test-supabase-connection.html` и запусти тесты снова

---

## 🔍 Следующий шаг: Проверить консоль админ-панели

### Открой:
```
https://localhost:8080/admin/students-activity
```

### В консоли (F12 → Console) должно быть:

#### ✅ Если всё работает:
```
📋 StudentsActivity: fetchStudents вызван, searchTerm: 
🔐 Проверка сессии...
✅ Сессия активна, user: saint@onaiacademy.kz
📤 Запрос student_profiles...
✅ Получено X записей из student_profiles
✅ Смаппировано X студентов
📊 Первые 3 студента: [{...}, {...}, {...}]
```

#### ❌ Если таблица не существует:
```
❌ Ошибка student_profiles: {
  "code": "42P01",
  "message": "relation \"public.student_profiles\" does not exist"
}
```

**Решение:** Нужно создать таблицу в Supabase

#### ❌ Если RLS блокирует:
```
❌ Ошибка student_profiles: {
  "code": "PGRST301",
  "message": "permission denied for table student_profiles"
}
```

**Решение:** Нужно настроить RLS политики

#### ❌ Если сессия истекла:
```
⚠️ Сессия не найдена
Сессия истекла. Войдите заново, чтобы продолжить работу.
```

**Решение:** Выйди и войди заново

---

## 🛠️ Быстрое решение для каждой ошибки:

### 1. Таблица `student_profiles` не существует

Открой Supabase Dashboard → SQL Editor и выполни:

```sql
-- Создать таблицу student_profiles
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{}',
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создать индексы
CREATE INDEX IF NOT EXISTS idx_student_profiles_email ON public.student_profiles(email);
CREATE INDEX IF NOT EXISTS idx_student_profiles_is_active ON public.student_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_student_profiles_invited_by ON public.student_profiles(invited_by);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут читать свой профиль
CREATE POLICY "Users can read own student profile"
ON public.student_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Политика: админы могут читать все профили
CREATE POLICY "Admins can read all student profiles"
ON public.student_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);

-- Политика: админы могут обновлять профили
CREATE POLICY "Admins can update student profiles"
ON public.student_profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);
```

### 2. RLS блокирует запросы (но таблица есть)

Проверь политики:

```sql
-- Посмотреть текущие политики
SELECT * FROM pg_policies WHERE tablename = 'student_profiles';

-- Если нет политики для админов, добавь:
CREATE POLICY "Admins can read all student profiles"
ON public.student_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.is_active = true
  )
);
```

### 3. Проверить что у тебя роль admin в profiles

```sql
-- Проверить свою роль
SELECT id, email, role, is_active 
FROM public.profiles 
WHERE email = 'saint@onaiacademy.kz';

-- Если роли нет или не admin, обнови:
UPDATE public.profiles 
SET role = 'admin', is_active = true 
WHERE email = 'saint@onaiacademy.kz';
```

---

## 📸 Пришли мне скриншот консоли

Когда откроешь `/admin/students-activity`, сделай скриншот консоли (F12 → Console) и пришли мне.

Там будет видно **точная ошибка**, и я смогу дать точное решение.

---

## 🔄 После исправления

1. Обнови тест-файл (Ctrl+R)
2. Запусти тесты 3-5 снова
3. Они должны пройти успешно ✅

