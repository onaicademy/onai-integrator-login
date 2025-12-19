# 🚨 QUICK FIX GUIDE - СТУДЕНТЫ НЕ МОГУТ ЗАВЕРШИТЬ УРОКИ

## ⚡ БЫСТРАЯ ДИАГНОСТИКА (30 секунд)

### 1️⃣ **Проверь логи:**
```bash
ssh root@207.154.231.30 "pm2 logs onai-backend --err --lines 30 | grep 'foreign key'"
```

**Если видишь:**
```
❌ Foreign key constraint violation
❌ Key (tripwire_user_id)=(xxx) is not present in table "users"
```

**→ ЭТО ПРОБЛЕМА С ID! Смотри FIX ниже ⬇️**

---

## ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ (2 минуты)

### 🔴 **ПРОБЛЕМА: Неправильный ID**

**Файл:** `backend/src/routes/tripwire-lessons.ts`

**❌ НЕПРАВИЛЬНО:**
```typescript
tripwire_user_id: tripwire_user_id  // ❌ tripwire_users.id
```

**✅ ПРАВИЛЬНО:**
```typescript
tripwire_user_id: main_user_id  // ✅ auth.users.id
```

### 📝 **ГДЕ МЕНЯТЬ:**

**Найди строки (~430-540):**

```typescript
// ❌ НЕПРАВИЛЬНО:
.upsert({
  tripwire_user_id: tripwire_user_id,  // МЕНЯЙ ЭТО!
  lesson_id,
  is_completed: true
})

// ❌ НЕПРАВИЛЬНО:
.eq('tripwire_user_id', tripwire_user_id)  // МЕНЯЙ ЭТО!

// ✅ ПРАВИЛЬНО:
.upsert({
  tripwire_user_id: main_user_id,  // ✅ 
  lesson_id,
  is_completed: true
})

// ✅ ПРАВИЛЬНО:
.eq('tripwire_user_id', main_user_id)  // ✅
```

### 🚀 **DEPLOY:**
```bash
cd /Users/miso/onai-integrator-login
git add backend/src/routes/tripwire-lessons.ts
git commit -m "HOTFIX: Use main_user_id instead of tripwire_user_id"
git push origin main

# Deploy
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull && pm2 restart onai-backend"
```

### ✅ **ПРОВЕРКА:**
```bash
# 1. Залогинься как студент
# 2. Открой урок 67
# 3. Досмотри до 80%+
# 4. Нажми "Завершить урок"
# 5. Должно работать без ошибок!
```

---

## 📋 CHECKLIST ДЛЯ VERIFICATION

- [ ] Логи НЕ показывают FK ошибки
- [ ] Студент может завершить урок
- [ ] Прогресс сохраняется в БД
- [ ] Модуль разблокируется после завершения
- [ ] Нет 500 ошибок в frontend console

---

## 🎯 ПРАВИЛО (ЗАПОМНИ!)

### ✅ **ДА:**
```typescript
tripwire_progress.tripwire_user_id = main_user_id  // auth.users.id
tripwire_user_profile.user_id = main_user_id       // auth.users.id
module_unlocks.user_id = main_user_id              // auth.users.id
user_achievements.user_id = main_user_id           // auth.users.id
```

### ❌ **НЕТ:**
```typescript
tripwire_progress.tripwire_user_id = tripwire_user_id  // tripwire_users.id ❌
```

### 🔑 **SUMMARY:**

**ВСЕ ТАБЛИЦЫ ПРОГРЕССА → `auth.users.id`**

**ТОЛЬКО `tripwire_users.id` для внутренних ссылок в коде!**

---

## 📞 ЕСЛИ НЕ ПОМОГЛО

### 1️⃣ Проверь DATABASE schema:
```sql
-- Проверь FK constraint
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'tripwire_progress';

-- Должно показать:
-- tripwire_progress_tripwire_user_id_fkey → auth.users(id)
```

### 2️⃣ Проверь данные:
```sql
-- Проверь что user_id существует в auth.users
SELECT id, email FROM auth.users WHERE id = 'xxx';

-- Проверь tripwire_users
SELECT id, user_id, email FROM tripwire_users WHERE user_id = 'xxx';
```

### 3️⃣ Откатывай к последней рабочей версии:
```bash
git log --oneline | head -10  # Найди последний working commit
git reset --hard [commit_hash]
git push origin main --force
```

---

## 🛡️ ЗАЩИТА НА БУДУЩЕЕ

**Читай файл:** `🛡️_КРИТИЧЕСКАЯ_ЗАЩИТА_НЕ_ТРОГАТЬ.md`

**Запускай тесты:** `npm test __tests__/tripwire-complete.test.ts`

**CI/CD проверка:** GitHub Actions автоматически проверит код!

---

**СОЗДАНО: 19.12.2024 после критической ошибки**

**ЦЕЛЬ: Быстро починить если студенты не могут завершить уроки**
