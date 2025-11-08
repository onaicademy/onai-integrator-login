# 🚀 ИНСТРУКЦИЯ ПО ДЕПЛОЮ EDGE FUNCTION `create-student`

## ✅ ЧТО БЫЛО ИСПРАВЛЕНО:

### 1️⃣ **Принимаем новые поля из формы:**
```typescript
✅ phone                  // Телефон студента
✅ password               // Пароль (НЕ генерируем!)
✅ account_expires_at     // Срок действия аккаунта
```

### 2️⃣ **Валидация:**
```typescript
✅ Проверка phone (обязательное)
✅ Проверка password (минимум 8 символов)
```

### 3️⃣ **Создание профиля:**
```typescript
❌ БЫЛО: Таблица 'users'
✅ СТАЛО: Таблица 'profiles'

✅ Добавлено: account_expires_at
✅ Добавлено: is_active = true
```

### 4️⃣ **Создание student_profiles:**
```typescript
✅ Добавлена запись в student_profiles
✅ Сохраняется phone
```

### 5️⃣ **Пароль:**
```typescript
❌ БЫЛО: Генерация случайного пароля
✅ СТАЛО: Используем переданный пароль из формы
```

---

## 📋 КАК ЗАДЕПЛОИТЬ:

### **Вариант 1: Через Supabase CLI** ⭐ (Рекомендуется)

```bash
# 1. Убедись что установлен Supabase CLI
supabase --version

# Если не установлен:
# brew install supabase/tap/supabase  (macOS)
# npm install -g supabase              (любая ОС)

# 2. Логин в Supabase
supabase login

# 3. Перейди в папку проекта
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"

# 4. Задеплой функцию
supabase functions deploy create-student --project-ref arqhkacellqbhjhbebfh

# 5. Проверь что функция задеплоена
supabase functions list --project-ref arqhkacellqbhjhbebfh
```

### **Вариант 2: Через Supabase Dashboard** (Если нет CLI)

```bash
1. Открой: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/functions

2. Найди функцию "create-student"

3. Нажми "Edit"

4. Скопируй ВЕСЬ код из файла:
   supabase/functions/create-student/index.ts

5. Вставь в редактор

6. Нажми "Deploy"

7. Дождись сообщения "Function deployed successfully"
```

---

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ДЕПЛОЯ:

### **Тест 1: Создание студента**

```bash
1. Открой: https://localhost:8080/admin/students-activity

2. Нажми "Добавить пользователя"

3. Заполни форму:
   - Email: test@example.com
   - Полное имя: Тестовый Пользователь
   - Телефон: +7 777 123 4567
   - Пароль: testpassword123
   - Роль: Студент
   - Срок: 3 месяца

4. Нажми "Создать пользователя"

5. Ожидаемый результат:
   ✅ "Пользователь создан!"
   ✅ Модалка с email и паролем
```

### **Тест 2: Проверь в Supabase**

```sql
-- 1. Проверь profiles
SELECT * FROM profiles WHERE email = 'test@example.com';

-- Должно быть:
-- ✅ full_name: Тестовый Пользователь
-- ✅ role: student
-- ✅ is_active: true
-- ✅ account_expires_at: через 3 месяца от сейчас

-- 2. Проверь student_profiles
SELECT * FROM student_profiles WHERE user_id = (
  SELECT id FROM profiles WHERE email = 'test@example.com'
);

-- Должно быть:
-- ✅ full_name: Тестовый Пользователь
-- ✅ phone: +7 777 123 4567
-- ✅ total_xp: 0
-- ✅ is_active: true

-- 3. Проверь auth.users
SELECT * FROM auth.users WHERE email = 'test@example.com';

-- Должно быть:
-- ✅ email_confirmed_at: установлен
```

### **Тест 3: Логин тестовым пользователем**

```bash
1. Выйди из админ-аккаунта

2. Попробуй войти:
   Email: test@example.com
   Password: testpassword123

3. Ожидаемый результат:
   ✅ Успешный вход
   ✅ Редирект на /courses
   ✅ Роль: student
```

---

## 🔍 ПРОВЕРКА ЛОГОВ EDGE FUNCTION:

### **В Supabase Dashboard:**

```bash
1. Открой: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/functions

2. Найди "create-student"

3. Нажми "Logs"

4. Должен увидеть:
   📥 Received data: {...}
   🔑 Creating user with provided password...
   ✅ User created in auth.users: <user_id>
   👤 Creating profile...
   ✅ Profile created
   🎓 Creating student profile...
   ✅ Student profile created
   🎉 User created successfully!
```

### **Если ошибка:**

Смотри в логах что именно не так:
- `Failed to create user` → Проблема с паролем или email
- `Failed to create profile` → Проблема с RLS или таблицей profiles
- `Student profile error` → Проблема с таблицей student_profiles

---

## ⚠️ ВОЗМОЖНЫЕ ПРОБЛЕМЫ:

### **Проблема 1: "Function not found"**

```bash
# Решение: Задеплой функцию заново
supabase functions deploy create-student --project-ref arqhkacellqbhjhbebfh
```

### **Проблема 2: "Service role key not set"**

```bash
# Решение: Установи секреты
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<твой_service_role_key> \
  --project-ref arqhkacellqbhjhbebfh
```

### **Проблема 3: "Failed to create profile"**

```bash
# Решение: Проверь RLS политики на profiles
# Убедись что они применены из миграции 20251108_add_account_expiration.sql
```

### **Проблема 4: "Phone is required" в логах**

```bash
# Решение: Обнови frontend код (StudentsActivity.tsx)
# Убедись что phone передаётся в body запроса
```

---

## 🎯 ФИНАЛЬНЫЙ ЧЕКЛИСТ:

- [ ] SQL миграция применена (`20251108_add_account_expiration.sql`)
- [ ] Edge Function задеплоена
- [ ] Тест 1: Создание студента со сроком → ✅
- [ ] Тест 2: Данные в Supabase корректны → ✅
- [ ] Тест 3: Логин тестовым пользователем → ✅
- [ ] Логи Edge Function без ошибок → ✅

---

**ГОТОВО К ТЕСТИРОВАНИЮ!** 🚀

После успешного тестирования можно деплоить на сервер!

