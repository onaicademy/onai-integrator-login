# 🔍 PERPLEXITY CODE REVIEW PROMPT - Critical Bug Audit

**Date:** December 22, 2025  
**Purpose:** Complete code review для detection похожих багов после изменений Redis/BullMQ/Worker  
**Priority:** 🔴 CRITICAL - Prevent production issues  

---

## 📋 EXECUTIVE SUMMARY

После внедрения BullMQ queue system и email worker были обнаружены **2 критических бага**:

1. **❌ Bug #1:** Worker использовал неправильный ID (`tripwire_users.id` вместо `auth.users.id`) для `tripwire_progress.tripwire_user_id`, что привело к 70 из 71 студентов БЕЗ прогресса
2. **❌ Bug #2:** Worker не всегда создавал записи в `users` таблице, что нарушало Foreign Key constraints

**Задача:** Найти аналогичные ошибки в других частях системы, где мы работаем с:
- BullMQ jobs и workers
- Supabase database operations
- Foreign keys и relationships
- User creation flows
- Redis queue operations

---

## 🐛 НАЙДЕННЫЕ БАГИ (ДЛЯ КОНТЕКСТА)

### **Bug #1: Incorrect ID for tripwire_progress**

**Файл:** `backend/src/workers/tripwire-worker.ts`

**НЕПРАВИЛЬНЫЙ КОД:**
```typescript
// ❌ BAD: Использовал tripwire_users.id вместо auth.users.id
const { data: tripwireUser } = await supabase
  .from("tripwire_users")
  .insert({ user_id: userId, ... })
  .select("id")
  .single();

await supabase.from("tripwire_progress").insert({
  tripwire_user_id: tripwireUser.id,  // ❌ WRONG! FK ссылается на users.id
  module_id: 16,
  lesson_id: 67,
});
```

**ПРАВИЛЬНЫЙ КОД:**
```typescript
// ✅ GOOD: Использовать auth.users.id (который есть в users таблице)
await supabase.from("tripwire_progress").insert({
  tripwire_user_id: userId,  // ✅ Correct! auth.users.id
  module_id: 16,
  lesson_id: 67,
});
```

**Последствия:** 70 из 71 студентов не имели прогресса, аналитика не работала.

---

### **Bug #2: Missing users table inserts**

**Файл:** `backend/src/workers/tripwire-worker.ts`

**НЕПРАВИЛЬНЫЙ КОД:**
```typescript
// ❌ BAD: Иногда не создавался пользователь в users таблице
// Если была ошибка, FK tripwire_progress → users.id падал

await supabase.from("tripwire_users").insert({
  user_id: userId,
  email,
  full_name,
});

// users таблица пропущена или не всегда создавалась!

await supabase.from("tripwire_progress").insert({
  tripwire_user_id: userId  // FK constraint fail если нет в users!
});
```

**ПРАВИЛЬНЫЙ КОД:**
```typescript
// ✅ GOOD: Всегда создавать users перед tripwire_progress
await supabase.from("users").insert({
  id: userId,
  email,
  full_name,
  role: "student",
});

await supabase.from("tripwire_users").insert({
  user_id: userId,
  email,
  full_name,
});

await supabase.from("tripwire_progress").insert({
  tripwire_user_id: userId
});
```

**Последствия:** 7 студентов отсутствовали в `users`, FK constraints нарушены.

---

## 🎯 ЧТО НУЖНО ПРОВЕРИТЬ

### **1. Foreign Key Relationships**

Найди все места в коде, где мы делаем INSERT с foreign keys:

**Паттерны для поиска:**
- `from("table_name").insert()` с полями, которые ссылаются на другие таблицы
- Relationships между таблицами (user_id, manager_id, created_by, и т.д.)
- Случаи, где используется `.select("id")` после insert и этот ID потом используется

**Вопросы:**
1. Правильный ли ID используется для FK?
2. Существует ли referenced row перед вставкой?
3. Обрабатывается ли FK constraint error?

**Таблицы для проверки:**
- `tripwire_users` (FK: `user_id` → `auth.users.id`, `granted_by` → `users.id`)
- `tripwire_progress` (FK: `tripwire_user_id` → `users.id`)
- `tripwire_user_profile` (FK: `user_id` → `users.id`)
- `sales_activity_log` (FK: `manager_id`, `target_user_id` → `users.id`)
- `user_activity_logs` (FK: `user_id` → `users.id`)
- `traffic_targetologists` (FK: `user_id` → `auth.users.id`)
- `traffic_analytics` (FK: `targetologist_id` → `traffic_targetologists.id`)

---

### **2. BullMQ Worker Job Handlers**

**Файлы для проверки:**
- `backend/src/workers/tripwire-worker.ts` ✅ (уже проверен и исправлен)
- `backend/src/config/email-queue.ts` ✅ (новый email worker)
- Любые другие workers в проекте

**Что искать:**
1. **Idempotency issues:** Проверяет ли worker, что операция уже выполнена?
2. **Partial completion:** Что если DB insert успешен, но email/другая операция failed?
3. **Error handling:** Правильно ли обрабатываются ошибки? Не скрываем ли мы критические errors?
4. **Transaction safety:** Используются ли транзакции для multi-step operations?

**Паттерны ошибок:**
```typescript
// ❌ BAD: Silent error handling
try {
  await criticalOperation();
} catch (error) {
  console.warn('Operation failed (non-critical)');  // ← Опасно!
  // Job помечается как success даже при failure
}

// ✅ GOOD: Re-throw errors для retry
try {
  await criticalOperation();
} catch (error) {
  console.error('Critical operation failed:', error);
  throw error;  // BullMQ will retry
}
```

---

### **3. Database Insert Order**

**Проблема:** Если таблицы имеют FK relationships, порядок inserts критичен!

**Что проверить:**
1. Создается ли `users` row ПЕРЕД `tripwire_users`?
2. Создается ли `tripwire_users` ПЕРЕД `tripwire_progress`?
3. Существует ли `auth.users` ПЕРЕД любыми таблицами с `user_id` FK?

**Правильный порядок для user creation:**
```typescript
// ✅ CORRECT ORDER:
1. auth.users (createUser via Supabase Auth)
2. users (id = auth.users.id)
3. tripwire_users (user_id = auth.users.id)
4. tripwire_user_profile (user_id = auth.users.id)
5. tripwire_progress (tripwire_user_id = users.id = auth.users.id)
6. sales_activity_log (target_user_id = auth.users.id)
```

**Найди места, где порядок может быть нарушен!**

---

### **4. Redis Queue Job Data**

**Файлы для проверки:**
- Где мы добавляем jobs: `tripwireUserCreationQueue.add()`
- Где мы обрабатываем jobs: `Worker` handlers

**Что проверить:**
1. Все ли необходимые данные передаются в job?
2. Валидируются ли данные перед обработкой?
3. Корректны ли типы данных (TypeScript interfaces)?

**Пример проблемы:**
```typescript
// ❌ BAD: Передаем неполные данные
await queue.add('create-user', {
  email: 'test@test.com',
  // Отсутствует full_name, password, currentUserId!
});

// Worker ожидает эти поля и упадет с undefined error
```

---

### **5. Supabase Client Usage**

**Проверить:**
- Используется ли правильный client? (`tripwireAdminSupabase` vs `supabase` vs `trafficAdminSupabase`)
- Правильные ли permissions (service role key vs anon key)?
- Обрабатываются ли `.error` в responses?

**Паттерны ошибок:**
```typescript
// ❌ BAD: Не проверяем error
const { data } = await supabase.from('users').select();
// Если error - data = null, но мы не проверяем!

// ✅ GOOD: Всегда проверяем error
const { data, error } = await supabase.from('users').select();
if (error) {
  throw new Error(`DB query failed: ${error.message}`);
}
```

---

### **6. Email Queue Integration**

**Файл:** `backend/src/config/email-queue.ts`

**Что проверить:**
1. Правильно ли worker обновляет `welcome_email_sent` status в БД?
2. Корректно ли обрабатываются retry attempts?
3. Используется ли правильный `userId` для обновления статуса?

**Потенциальная проблема:**
```typescript
// ❌ BAD: Обновляем по неправильному ID
await supabase.from('tripwire_users').update({
  welcome_email_sent: true
}).eq('id', userId);  // ← Должно быть .eq('user_id', userId)
```

---

### **7. Traffic Dashboard (если есть workers)**

**Проверить:**
- Есть ли workers для traffic analytics?
- Правильно ли они работают с `traffic_targetologists`, `traffic_analytics`?
- Корректны ли FK relationships для traffic таблиц?

---

## 🔍 SEARCH QUERIES FOR PERPLEXITY

### **Query 1: BullMQ Best Practices**
```
BullMQ worker error handling best practices 
Foreign key constraints in queue workers
How to ensure data consistency in BullMQ jobs
BullMQ transaction safety patterns
Site: github.com/taskforcesh/bullmq
```

### **Query 2: Supabase Foreign Keys**
```
Supabase foreign key constraint errors
PostgreSQL insert order with foreign keys
How to handle FK violations in Supabase inserts
Best practices for multi-table inserts with FK
Site: supabase.com/docs
```

### **Query 3: Database Transaction Patterns**
```
PostgreSQL transaction patterns for user creation
Atomic operations with foreign key relationships
How to rollback partial inserts in Supabase
Database insert order with dependencies
```

### **Query 4: Worker Idempotency**
```
BullMQ job idempotency patterns
How to prevent duplicate processing in workers
Idempotency keys in distributed queues
Best practices for worker retry logic
Site: stackoverflow.com
```

### **Query 5: Error Handling in Queues**
```
BullMQ error handling vs job completion
When to throw errors vs return success in workers
Partial success handling in queue workers
Critical vs non-critical errors in BullMQ
```

---

## 📊 EXPECTED DELIVERABLES

**1. Foreign Key Audit Report**
- Список всех FK relationships в проекте
- Проверка правильности используемых IDs
- Места, где FK может нарушиться

**2. Worker Safety Review**
- Анализ error handling в workers
- Проверка idempotency mechanisms
- Transaction safety assessment

**3. Code Pattern Analysis**
- Найденные anti-patterns
- Best practices recommendations
- Refactoring suggestions

**4. Bug Risk Assessment**
- High risk areas (critical bugs possible)
- Medium risk areas (data inconsistency)
- Low risk areas (minor issues)

**5. Action Items**
- Immediate fixes (critical bugs)
- Short-term improvements (refactoring)
- Long-term enhancements (architecture)

---

## 🔧 SPECIFIC FILES TO REVIEW

### **High Priority:**
```
backend/src/workers/tripwire-worker.ts ✅ FIXED
backend/src/config/email-queue.ts ✅ NEW
backend/src/config/redis.ts
backend/src/services/queueService.ts
backend/src/routes/tripwire-admin.ts
backend/src/routes/auth.ts
```

### **Medium Priority:**
```
backend/src/services/emailService.ts
backend/src/services/userActivityLogger.ts
backend/src/routes/traffic-auth.ts
backend/src/routes/traffic-admin.ts
backend/src/config/supabase-tripwire.ts
backend/src/config/supabase-traffic.ts
```

### **Database Schema:**
```
Check information_schema.table_constraints
Check information_schema.referential_constraints
Verify all FK relationships are correct
```

---

## 💡 CODE REVIEW CHECKLIST

### **For Each Database INSERT Operation:**
- [ ] Правильный ли table client используется?
- [ ] Все FK references существуют перед insert?
- [ ] Проверяется ли error после insert?
- [ ] Используется ли правильный ID для FK?
- [ ] Обрабатывается ли constraint violation?

### **For Each BullMQ Worker:**
- [ ] Есть ли idempotency check?
- [ ] Правильно ли обрабатываются errors?
- [ ] Не скрываются ли critical errors?
- [ ] Используются ли transactions для multi-step ops?
- [ ] Корректно ли обновляется status в БД?

### **For Each Queue Job:**
- [ ] Все ли необходимые данные в job.data?
- [ ] Валидируются ли данные перед обработкой?
- [ ] Правильно ли типизирован interface?
- [ ] Есть ли retry logic?
- [ ] Корректно ли jobId генерируется?

---

## 🎯 CRITICAL QUESTIONS TO ANSWER

1. **Есть ли другие места, где используется неправильный ID для FK?**
2. **Все ли таблицы создаются в правильном порядке?**
3. **Обрабатываются ли FK constraint errors корректно?**
4. **Есть ли partial completion scenarios без proper handling?**
5. **Правильно ли работает idempotency во всех workers?**
6. **Не скрываем ли мы critical errors в try/catch?**
7. **Все ли FK relationships документированы и корректны?**
8. **Есть ли race conditions в worker operations?**
9. **Правильно ли используются Supabase clients (admin vs regular)?**
10. **Все ли status updates попадают в правильные таблицы?**

---

## 🚀 SEARCH STRATEGY

### **Step 1: Search for Similar Patterns**
Ищи в GitHub Issues и Stack Overflow:
- BullMQ foreign key constraint errors
- Supabase insert order with relationships
- Worker idempotency patterns
- Database transaction safety

### **Step 2: Review Best Practices**
Проверь official docs:
- BullMQ documentation (error handling, idempotency)
- Supabase foreign keys best practices
- PostgreSQL transaction patterns
- Redis queue reliability

### **Step 3: Find Real-World Examples**
Найди production codebases:
- How do large projects handle multi-step worker operations?
- Real examples of FK relationship management in queues
- Idempotency patterns in production systems

---

## 📝 OUTPUT FORMAT

**Пожалуйста, предоставь:**

1. **Executive Summary** (1-2 параграфа)
   - Общая оценка кодовой базы
   - Количество найденных issues
   - Severity breakdown

2. **Detailed Findings** (по каждой категории)
   - Foreign Key Issues
   - Worker Safety Problems
   - Error Handling Gaps
   - Transaction Safety Concerns

3. **Code Examples** (для каждой проблемы)
   - Текущий (проблемный) код
   - Рекомендуемый (исправленный) код
   - Объяснение почему это проблема

4. **Priority Action Items**
   - 🔴 Critical (fix immediately)
   - 🟡 High (fix this week)
   - 🟢 Medium (fix this month)
   - ⚪ Low (technical debt)

5. **Prevention Recommendations**
   - Code review checklist
   - Testing strategies
   - Monitoring improvements
   - Documentation needs

---

**Priority:** 🔴 URGENT  
**Blocking:** Potential production issues  
**Expected Time:** 2-3 hours for comprehensive review  

---

**END OF PROMPT**

Copy this entire document and paste it into Perplexity Pro for comprehensive code review and bug detection across the codebase.
