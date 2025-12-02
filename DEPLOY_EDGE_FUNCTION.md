# 🚀 ДЕПЛОЙ EDGE FUNCTION: create-student

**Дата:** 8 ноября 2025  
**Изменение:** Добавлено сохранение `phone` в `auth.users`

---

## ✅ **ЧТО ИЗМЕНЕНО:**

### **Файл:** `supabase/functions/create-student/index.ts`

**Было:**
```typescript
const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: {
    full_name,
    role
  }
});
```

**Стало:**
```typescript
const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  phone,  // ← ДОБАВЛЕНО: Телефон сохраняется в auth.users!
  email_confirm: true,
  user_metadata: {
    full_name,
    role
  }
});

console.log('📞 Phone saved to auth.users:', phone);
```

---

## 🚀 **КАК ЗАДЕПЛОИТЬ:**

### **Вариант 1: Через терминал (рекомендуется)**

```bash
# Перейди в папку проекта
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"

# Задеплой Edge Function
supabase functions deploy create-student --project-ref arqhkacellqbhjhbebfh
```

**Если просит логин:**
```bash
# Залогинься один раз
supabase login

# Потом снова задеплой
supabase functions deploy create-student --project-ref arqhkacellqbhjhbebfh
```

---

### **Вариант 2: Через Supabase Dashboard**

Если CLI не работает:

1. Открой Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/functions
   ```

2. Нажми на функцию **`create-student`**

3. Нажми **"Edit Function"**

4. Скопируй **ВЕСЬ** код из файла:
   ```
   supabase/functions/create-student/index.ts
   ```

5. Вставь в редактор

6. Нажми **"Deploy"**

---

## ✅ **ПРОВЕРКА ДЕПЛОЯ:**

### **Шаг 1: Проверь версию функции**

```bash
# Посмотри версию
supabase functions list --project-ref arqhkacellqbhjhbebfh

# Или в Dashboard
https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/functions
```

**Ожидается:** Дата обновления должна быть сегодняшней

---

### **Шаг 2: Протестируй создание пользователя**

```
URL: https://localhost:8080/admin/students-activity

Действия:
1. Нажми "Добавить пользователя"
2. Заполни:
   - Email: test-phone@gmail.com
   - Имя: Тест Телефона
   - Телефон: +7 777 555 4433  ← ВАЖНО!
   - Пароль: testphone123
   - Роль: Куратор
   - Курсы: ✅ Интегратор 2.0
3. Создай
```

**Ожидается:**
```
✅ Уведомление: "Пользователь создан!"
✅ Пользователь появился в таблице
```

---

### **Шаг 3: Проверь в Supabase**

#### **3.1. Проверь auth.users**

```sql
-- Открой SQL Editor
https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql/new

-- Выполни:
SELECT 
  id,
  email,
  phone,  -- ← ДОЛЖЕН БЫТЬ ТЕЛЕФОН!
  raw_user_meta_data
FROM auth.users
WHERE email = 'test-phone@gmail.com';
```

**Ожидается:**
```
phone: +7 777 555 4433  ← ЕСТЬ!
raw_user_meta_data: {
  full_name: "Тест Телефона",
  role: "curator"
}
```

#### **3.2. Проверь profiles**

```sql
SELECT * FROM profiles WHERE email = 'test-phone@gmail.com';
```

**Ожидается:**
```
role: curator
full_name: Тест Телефона
is_active: true
account_expires_at: NULL (для куратора)
```

#### **3.3. Проверь student_courses**

```sql
SELECT * FROM student_courses WHERE student_id = (
  SELECT id FROM auth.users WHERE email = 'test-phone@gmail.com'
);
```

**Ожидается:**
```
course_id: 6518f042-54b9-4b69-8e93-b18df98cd7eb (Интегратор 2.0)
status: active
```

---

### **Шаг 4: Проверь логи Edge Function**

```
URL: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/functions/create-student/logs

Что искать:
```

**Успешные логи:**
```javascript
📥 Полученные данные: {email, full_name, phone: "+7 777 555 4433", ...}
🔑 Creating user with provided password...
📞 Phone saved to auth.users: +7 777 555 4433  ← НОВЫЙ ЛОГ!
✅ User created in auth.users: <user_id>
👤 Creating profile...
✅ Создан profiles с role: curator
📚 Назначаю курсы: ['6518f042...']
✅ Назначено курсов: 1
🎉 User created successfully!
```

**Если ошибка:**
```javascript
❌ Auth error: {...}
// Или
❌ Profile error: duplicate key  ← Если триггер не удалён!
```

---

## 📊 **ЧТО ДАЁТ ЭТО ИЗМЕНЕНИЕ:**

### **Было:**
```
phone сохраняется только в:
- student_profiles (если role = 'student')
- НЕ сохраняется для curator/admin/tech_support
```

### **Стало:**
```
phone сохраняется в:
1. auth.users ← НОВОЕ! Для ВСЕХ ролей!
2. student_profiles (дублируется для студентов)
```

### **Преимущества:**

✅ **Единое хранение:** Телефон в `auth.users` - стандартное место  
✅ **Для всех ролей:** Теперь и у кураторов, и у админов есть телефон  
✅ **Supabase Auth API:** Можно использовать встроенные функции:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log(user.phone);  // ← Работает!
   ```
✅ **SMS авторизация:** В будущем можно легко добавить вход по СМС  
✅ **Консистентность:** Все данные пользователя в одном месте

---

## 🎯 **ВАЖНО ПЕРЕД ДЕПЛОЕМ:**

### **1. Удали триггер auto-create profiles**

```
Файл: supabase/migrations/20251108_REMOVE_AUTO_PROFILE_TRIGGER.sql

Открой SQL Editor и выполни ЭТОТ SQL!
Иначе будет ошибка duplicate key!
```

### **2. Убедись что localhost работает**

```bash
# Запусти dev server
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"
npm run dev

# Открой
https://localhost:8080
```

---

## 🔥 **БЫСТРАЯ КОМАНДА:**

```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login" && \
supabase functions deploy create-student --project-ref arqhkacellqbhjhbebfh
```

---

## ⚠️ **ЕСЛИ ОШИБКА:**

### **"Access token not provided"**
```bash
# Решение:
supabase login
# Или установи токен:
export SUPABASE_ACCESS_TOKEN="твой_токен"
```

### **"Function not found"**
```bash
# Проверь что файл существует:
ls -la supabase/functions/create-student/index.ts

# Если нет - что-то удалилось, восстанови из git
```

### **"duplicate key" в логах после деплоя**
```
Это значит триггер НЕ удалён!
Выполни: supabase/migrations/20251108_REMOVE_AUTO_PROFILE_TRIGGER.sql
```

---

**ГОТОВО К ДЕПЛОЮ!** 🚀

