# 🔧 ИСПРАВЛЕНИЕ: Duplicate Key Error в Edge Function

**Дата:** 8 ноября 2025  
**Проблема:** Двойной INSERT в profiles → duplicate key error  
**Причина:** Автоматический триггер в базе данных

---

## ❌ ПРОБЛЕМА

### **Симптомы:**
```
21:52:24 ✅ Создан profiles с role: curator
21:52:24 ❌ Profile error: duplicate key value violates unique constraint "profiles_pkey"
```

### **Что происходит:**

```
1. Edge Function вызывает: 
   supabaseAdmin.auth.admin.createUser(...)
   
   ↓ Автоматически срабатывает триггер
   
   Триггер on_auth_user_created → handle_new_user()
   ✅ ПЕРВЫЙ INSERT в profiles (role='student' по умолчанию)

2. Edge Function вызывает:
   .from('profiles').insert({ role: 'curator', ... })
   
   ❌ ВТОРОЙ INSERT → duplicate key!
```

### **Корень проблемы:**

В базе существует триггер из миграции `20251108_FINAL_FIX_profiles_sync_and_secure_rls.sql`:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

Этот триггер создаёт profile автоматически, но:
- ❌ Всегда role = 'student' (игнорирует переданный role)
- ❌ Не устанавливает account_expires_at
- ❌ Не учитывает phone, курсы и другие данные

---

## ✅ РЕШЕНИЕ

### **Шаг 1: Удалить триггер**

```
Файл: supabase/migrations/20251108_REMOVE_AUTO_PROFILE_TRIGGER.sql
URL: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql/new

Действия:
1. Открой Supabase SQL Editor
2. Скопируй ВЕСЬ код из файла
3. Нажми "Run"
4. Дождись успешного выполнения
```

**Ожидаемый вывод:**
```
✅ Триггер on_auth_user_created удалён
✅ Функция handle_new_user удалена
═══════════════════════════════════════════════════
🎯 ГОТОВО! Edge Function теперь единственный создатель profiles
═══════════════════════════════════════════════════
```

---

### **Шаг 2: Задеплоить Edge Function (опционально)**

Edge Function уже правильная (только ОДИН INSERT), но для уверенности:

```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"
supabase functions deploy create-student --project-ref arqhkacellqbhjhbebfh
```

---

### **Шаг 3: Протестировать**

```
URL: https://localhost:8080/admin/students-activity

Действия:
1. Нажми "Добавить пользователя"
2. Заполни форму:
   - Email: test-after-fix@gmail.com
   - Полное имя: Тест После Фикса
   - Телефон: +7 777 111 2222
   - Пароль: afterfix123
   - Роль: Куратор
   - Курсы: ✅ Интегратор 2.0
3. Нажми "Создать пользователя"
```

**Ожидаемый результат:**
```
✅ Уведомление: "Пользователь создан!"
✅ Пользователь появился в таблице
✅ БЕЗ ошибки "duplicate key"
```

**Логи Edge Function (Supabase Dashboard):**
```
📥 Полученные данные: {email, full_name, phone, role: 'curator', ...}
🔑 Creating user with provided password...
✅ User created in auth.users: <user_id>
👤 Creating profile...
✅ Создан profiles с role: curator  ← ТОЛЬКО ОДИН РАЗ!
📚 Назначаю курсы: ['6518f042...']
✅ Назначено курсов: 1
🎉 User created successfully!
```

**Проверь в Supabase:**
```sql
SELECT * FROM profiles WHERE email = 'test-after-fix@gmail.com';

-- Должно быть:
-- ✅ role = 'curator' (НЕ student!)
-- ✅ full_name = 'Тест После Фикса'
-- ✅ account_expires_at = NULL (вечный доступ)
-- ✅ ТОЛЬКО ОДНА запись (без дубликатов)
```

---

## 📊 АНАЛИЗ EDGE FUNCTION

Проверил файл `supabase/functions/create-student/index.ts`:

```typescript
// Строки 111-121: ЕДИНСТВЕННЫЙ INSERT в profiles
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .insert({
    id: authData.user.id,
    email,
    full_name,
    role,  // ← Правильный role из запроса
    is_active: true,
    account_expires_at,  // ← Срок действия
    created_at: new Date().toISOString()
  })

console.log('✅ Создан profiles с role:', role)
```

**Вывод:** Edge Function правильная! Проблема была только в триггере.

---

## 🎯 ИТОГ

### **Было:**
```
auth.users.INSERT 
  → Триггер → profiles.INSERT (role='student')
  → Edge Function → profiles.INSERT (role='curator')
  → ❌ duplicate key error!
```

### **Стало:**
```
auth.users.INSERT
  → (триггер удалён)
  → Edge Function → profiles.INSERT (role='curator')
  → ✅ Success!
```

---

## ⚠️ ВАЖНО

После удаления триггера:
- ✅ Только Edge Function создаёт profiles
- ✅ Полный контроль над role, account_expires_at, phone, курсами
- ✅ Нет дубликатов
- ✅ Нет ошибок duplicate key

Но:
- ⚠️ Если создашь пользователя вручную в Supabase Auth UI → profile НЕ создастся автоматически
- ⚠️ Нужно создавать пользователей ТОЛЬКО через форму на платформе

---

**ГОТОВО К ПРИМЕНЕНИЮ!** 🚀

