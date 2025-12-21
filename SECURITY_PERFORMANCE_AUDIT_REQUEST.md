# 🔐 SECURITY & PERFORMANCE AUDIT REQUEST FOR AI ARCHITECT

**Дата запроса:** 11 декабря 2024  
**Проект:** onAI Academy - Tripwire Platform  
**Цель:** Получить safe recommendations для исправления security/performance issues БЕЗ риска поломки функционала  
**Приоритет:** КРИТИЧЕСКИЙ - Production система

---

## 📋 **EXECUTIVE SUMMARY**

Проект Tripwire находится в production и активно используется. Supabase Advisors выявили:
- 🚨 **7 критических security issues** (RLS не включен)
- ⚠️ **20+ performance issues** (неоптимальные индексы, RLS policies)

**ГЛАВНАЯ ЗАДАЧА:** Исправить эти issues БЕЗ простоя и БЕЗ поломки существующего функционала.

---

## 🎯 **ЦЕЛЬ ЭТОГО ОТЧЕТА**

Мне нужна **пошаговая стратегия исправления** с учетом:
1. ✅ Минимальный риск поломки
2. ✅ Возможность rollback
3. ✅ Тестирование каждого шага
4. ✅ Приоритизация по критичности
5. ✅ Оценка времени на каждый фикс

**НЕ НУЖНО:**
- ❌ "Просто включи RLS" (это сломает доступ к данным!)
- ❌ "Удали все неиспользуемые индексы" (без анализа можем сломать запросы)
- ❌ Быстрые фиксы без тестирования

---

## 🔍 **CURRENT STATE: PRODUCTION DETAILS**

### **Архитектура:**
- **Frontend:** React + TypeScript + Vite (Vercel)
- **Backend:** Node.js + Express (DigitalOcean)
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth
- **Users:** 2 active students + 2 sales managers
- **Deployment:** Production (live users!)

### **Критические компоненты (НЕ ТРОГАТЬ БЕЗ ТЕСТА!):**
1. Student dashboard (прогресс по урокам)
2. Video tracking (просмотр видео)
3. Module unlocks (разблокировка модулей)
4. Certificates generation (PDF сертификаты)
5. Achievements system (достижения)
6. Sales Manager dashboard (аналитика)

---

## 🚨 **ВЫЯВЛЕННЫЕ SECURITY ISSUES**

### **1. CRITICAL: 7 таблиц БЕЗ RLS (Row Level Security)**

#### **Таблицы:**
1. `module_unlocks` (4 rows) - Разблокировка модулей
2. `student_progress` (2 rows) - Прогресс студентов
3. `video_tracking` (3 rows) - Трекинг видео
4. `user_achievements` (8 rows) - Достижения
5. `user_statistics` (2 rows) - Статистика
6. `video_transcriptions` (3 rows) - Транскрипции
7. `certificates` (1 row) - Сертификаты

#### **Риск:**
- Любой пользователь может читать/изменять данные других пользователей
- Можно подделать прогресс, сертификаты, достижения
- Утечка персональных данных

#### **КРИТИЧЕСКИЙ ВОПРОС:**
**Если я просто включу RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) БЕЗ policies, доступ к этим таблицам будет ЗАБЛОКИРОВАН для всех пользователей!**

**Что сломается:**
- ❌ Студенты не смогут просматривать уроки
- ❌ Прогресс не будет сохраняться
- ❌ Сертификаты не будут генерироваться
- ❌ Достижения не будут начисляться
- ❌ Sales Manager dashboard перестанет показывать данные

---

### **2. WARNING: user_metadata в RLS policy (небезопасно)**

**Таблица:** `tripwire_ai_costs`

**Policy:**
```sql
CREATE POLICY "Admins can view all AI costs"
ON tripwire_ai_costs FOR SELECT
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

**Проблема:**
`user_metadata` может быть изменен клиентом → обход проверки прав.

**Риск:**
Студент может выдать себе роль admin и получить доступ к AI costs.

---

### **3. WARNING: Function Search Path Mutable (5 функций)**

**Проблема:**
Функции без `SECURITY DEFINER` или `SET search_path = ''` могут быть уязвимы к SQL injection.

**Функции:**
- `check_test_access`
- `get_available_tests`
- `get_user_course_access`
- `initialize_user_progress`
- `unlock_next_module`

---

### **4. WARNING: Leaked Password Protection DISABLED**

**Проблема:**
Пароли не проверяются через HaveIBeenPwned API.

**Риск:**
Пользователи могут использовать скомпрометированные пароли.

---

## ⚡ **ВЫЯВЛЕННЫЕ PERFORMANCE ISSUES**

### **1. Auth RLS InitPlan (5 policies)**

**Таблицы:**
- `tripwire_progress`
- `tripwire_ai_costs`

**Проблема:**
```sql
-- МЕДЛЕННО (auth.uid() вызывается для каждой строки):
USING (user_id = auth.uid())

-- БЫСТРО (auth.uid() вызывается 1 раз):
USING (user_id = (select auth.uid()))
```

**Impact:**
Медленные запросы при >1000 строк.

---

### **2. Multiple Permissive Policies (4 случая)**

**Таблица:** `tripwire_ai_costs`

**Проблема:**
2 разные policies для одного action (SELECT):
- "Admins can view all AI costs"
- "Users can view own AI costs"

**Решение:**
Объединить в одну policy.

---

### **3. Duplicate Indexes (3 пары)**

**Проблема:**
```sql
-- certificates:
idx_certificates_user (user_id)
idx_tripwire_certificates_user_id (user_id)  ← дубликат!

-- sales_activity_log:
idx_sales_activity_manager (manager_id)
idx_sales_activity_manager_id (manager_id)  ← дубликат!

-- tripwire_user_profile:
idx_tripwire_profile_user (user_id)
idx_tripwire_profile_user_id (user_id)  ← дубликат!
```

**Impact:**
- Занимают место в БД
- Замедляют INSERT/UPDATE

---

### **4. Unused Indexes (18 индексов)**

**Проблема:**
18 индексов никогда не использовались (по данным pg_stat).

**Риск при удалении:**
Если индекс используется в редких запросах (например, admin reports 1 раз в месяц), его удаление сломает эти запросы.

---

## 🤔 **МОИ ВОПРОСЫ К AI АРХИТЕКТОРУ:**

### **Q1: RLS Policies - Safe Activation Strategy**

**Вопрос:**
Как безопасно включить RLS на 7 таблицах БЕЗ риска поломки?

**Мои варианты:**

**Вариант A: Создать policies ПЕРЕД включением RLS**
```sql
-- 1. Создать permissive policies
CREATE POLICY "Users can manage own data" ON module_unlocks
FOR ALL USING (user_id = auth.uid());

-- 2. Только ПОТОМ включить RLS
ALTER TABLE module_unlocks ENABLE ROW LEVEL SECURITY;
```

**Вариант B: Shadow testing (staging)**
1. Склонировать prod БД в staging
2. Включить RLS + создать policies в staging
3. Протестировать все критичные операции
4. Применить на prod только после теста

**Вариант C: Постепенное включение**
1. Включить RLS только на 1 таблице (самой безопасной, например `video_transcriptions`)
2. Мониторить 24 часа
3. Если OK → включить на следующей таблице

**Что рекомендуешь?**

---

### **Q2: Policy Templates - Нужен боевой пример**

**Вопрос:**
Какие именно policies создать для каждой из 7 таблиц?

**Мой draft для `module_unlocks`:**
```sql
-- SELECT: Студенты видят только свои разблокировки
CREATE POLICY "Students view own unlocks"
ON module_unlocks FOR SELECT
USING (user_id = (select auth.uid()));

-- INSERT: Только backend API может разблокировать модули
CREATE POLICY "Backend can unlock modules"
ON module_unlocks FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- UPDATE/DELETE: Запретить всем
-- (модули разблокируются только 1 раз, изменения не нужны)
```

**Правильно ли это?** Нужны ли дополнительные policies для admin/sales roles?

---

### **Q3: user_metadata → app_metadata Migration**

**Вопрос:**
Как безопасно мигрировать с `user_metadata` на `app_metadata` для роли?

**Текущий код (backend API):**
```typescript
// backend/routes/admin/tripwire-manager.ts
const { data: tripwireUser, error } = await tripwireSupabase
  .from('tripwire_users')
  .select('role')  // Роль хранится в БД
  .eq('user_id', user.id)
  .single();
```

**Вопрос:**
- Хранить роль в `tripwire_users` таблице? (текущий подход)
- Или использовать `app_metadata` в Supabase Auth?
- Как синхронизировать роли между БД и Auth?

---

### **Q4: Performance Fixes - Приоритеты**

**Вопрос:**
В каком порядке исправлять performance issues?

**Мой план:**
1. ✅ Удалить дублирующиеся индексы (риск: 0%)
2. ✅ Оптимизировать RLS policies (auth.uid) (риск: 0%)
3. ⚠️ Объединить Multiple Permissive Policies (риск: 5% - нужно аккуратно)
4. ⚠️ Удалить unused индексы (риск: 10% - могут использоваться в редких запросах)

**Согласен?** Или есть лучший порядок?

---

### **Q5: Rollback Strategy**

**Вопрос:**
Как подготовить rollback для каждого типа изменений?

**RLS policies:**
- До применения: сделать backup policies через `pg_dump`?
- При ошибке: как быстро откатить?

**Индексы:**
- Сохранить CREATE INDEX команды перед удалением?

**Что рекомендуешь?**

---

### **Q6: Testing Checklist**

**Вопрос:**
Какие именно операции тестировать после включения RLS?

**Мой checklist:**
- [ ] Student login
- [ ] Просмотр урока (lesson page)
- [ ] Трекинг прогресса видео
- [ ] Разблокировка следующего модуля
- [ ] Генерация сертификата
- [ ] Начисление достижения
- [ ] Sales Manager dashboard (статистика)
- [ ] Admin panel (управление студентами)

**Что еще добавить?**

---

## 📊 **ДАННЫЕ ДЛЯ АНАЛИЗА**

### **Структура таблиц (7 без RLS):**

#### **1. module_unlocks**
```sql
CREATE TABLE module_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  module_id bigint NOT NULL REFERENCES modules(id),
  unlocked_at timestamptz DEFAULT now(),
  unlocked_by text DEFAULT 'system'
);
-- RLS: ❌ DISABLED
-- Rows: 4
```

#### **2. student_progress**
```sql
CREATE TABLE student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  course_id bigint NOT NULL REFERENCES courses(id),
  lessons_completed int DEFAULT 0,
  current_module int DEFAULT 1,
  progress_percentage numeric DEFAULT 0
);
-- RLS: ❌ DISABLED
-- Rows: 2
```

#### **3. video_tracking**
```sql
CREATE TABLE video_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  lesson_id bigint NOT NULL REFERENCES lessons(id),
  watch_time int DEFAULT 0,
  completed boolean DEFAULT false,
  last_position int DEFAULT 0
);
-- RLS: ❌ DISABLED
-- Rows: 3
```

#### **4. user_achievements**
```sql
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  achievement_type text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  metadata jsonb
);
-- RLS: ❌ DISABLED
-- Rows: 8
```

#### **5. user_statistics**
```sql
CREATE TABLE user_statistics (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  total_watch_time int DEFAULT 0,
  lessons_completed int DEFAULT 0,
  achievements_count int DEFAULT 0,
  last_activity timestamptz
);
-- RLS: ❌ DISABLED
-- Rows: 2
```

#### **6. video_transcriptions**
```sql
CREATE TABLE video_transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id bigint NOT NULL REFERENCES lessons(id),
  language text DEFAULT 'ru',
  transcription text,
  created_at timestamptz DEFAULT now()
);
-- RLS: ❌ DISABLED
-- Rows: 3
-- NOTE: Это НЕ пользовательские данные, может быть public?
```

#### **7. certificates**
```sql
CREATE TABLE certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  course_id bigint NOT NULL REFERENCES courses(id),
  issued_at timestamptz DEFAULT now(),
  certificate_number text UNIQUE,
  pdf_url text
);
-- RLS: ❌ DISABLED
-- Rows: 1
```

---

### **Текущие RLS policies (для таблиц С RLS):**

#### **tripwire_users (✅ RLS enabled)**
```sql
-- Policy 1: Users can view own profile
CREATE POLICY "Users can view own profile"
ON tripwire_users FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Sales managers can view created users
CREATE POLICY "Sales managers can view created users"
ON tripwire_users FOR SELECT
USING (granted_by = auth.uid());
```

#### **tripwire_progress (✅ RLS enabled)**
```sql
-- Policy: Users can manage own progress
CREATE POLICY "Users can manage own progress"
ON tripwire_progress FOR ALL
USING (user_id = auth.uid());
```

---

## 🎯 **ТРЕБОВАНИЯ К РЕКОМЕНДАЦИЯМ**

### **Формат ответа:**

```markdown
## РЕКОМЕНДАЦИЯ #1: [Название]

### Приоритет: [КРИТИЧЕСКИЙ/ВЫСОКИЙ/СРЕДНИЙ/НИЗКИЙ]
### Риск: [0-10]/10
### Время: [оценка]

### Шаги:
1. [ ] Шаг 1 (подробное описание)
2. [ ] Шаг 2
3. [ ] ...

### SQL команды:
```sql
-- Точные SQL команды для копипасты
```

### Rollback:
```sql
-- Команды для отката изменений
```

### Тестирование:
- [ ] Что именно тестировать
- [ ] Как проверить что все работает
- [ ] Какие ошибки могут возникнуть

### Признаки проблемы:
- [ ] Error message 1
- [ ] Error message 2
```

---

## 💬 **ФИНАЛЬНЫЙ ВОПРОС К АРХИТЕКТОРУ:**

**Дай мне пошаговый план действий:**

1. Какие фиксы делать ПЕРВЫМИ (самые безопасные)?
2. Какие фиксы требуют staging тестирования?
3. Какие фиксы делать ПОСЛЕДНИМИ (самые рискованные)?
4. Как минимизировать downtime?
5. Нужен ли rollback plan для каждого шага?

**Дополнительные требования:**
- ✅ Каждый шаг должен быть АТОМАРНЫМ (можно откатить независимо)
- ✅ После каждого шага - тестирование
- ✅ Если что-то сломалось - немедленный rollback
- ✅ Логирование всех изменений

---

## 📎 **ПРИЛОЖЕНИЯ**

### **A. Полный список Supabase Advisors:**

**Security Advisors (7):**
1. `unprotected_table.module_unlocks` - RLS disabled
2. `unprotected_table.student_progress` - RLS disabled
3. `unprotected_table.video_tracking` - RLS disabled
4. `unprotected_table.user_achievements` - RLS disabled
5. `unprotected_table.user_statistics` - RLS disabled
6. `unprotected_table.video_transcriptions` - RLS disabled
7. `unprotected_table.certificates` - RLS disabled

**Performance Advisors (20+):**
1. `auth_rls_initplan` (5 occurrences)
2. `multiple_permissive_policies` (4 occurrences)
3. `duplicate_index` (3 pairs)
4. `unused_index` (18 indexes)
5. `function_search_path_mutable` (5 functions)

---

### **B. Backend API Authentication Flow:**

```typescript
// backend/middleware/auth.ts
export const authenticateTripwire = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  const { data: { user }, error } = await tripwireSupabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.user = user;
  next();
};
```

---

### **C. Critical User Flows:**

**1. Student watches lesson:**
```
1. GET /api/tripwire/materials/:lessonId → lessons table
2. POST /api/tripwire/profile/track-video → video_tracking (БЕЗ RLS! ⚠️)
3. PUT /api/tripwire/profile/progress → student_progress (БЕЗ RLS! ⚠️)
4. POST /api/tripwire/profile/unlock-module → module_unlocks (БЕЗ RLS! ⚠️)
```

**2. Student completes course:**
```
1. GET /api/tripwire/profile → Check completion
2. POST /api/tripwire/certificates → certificates (БЕЗ RLS! ⚠️)
3. POST achievements → user_achievements (БЕЗ RLS! ⚠️)
```

**3. Sales Manager views analytics:**
```
1. GET /api/admin/tripwire/stats → Aggregate data from multiple tables
2. GET /api/admin/tripwire/users → tripwire_users (✅ RLS enabled)
```

---

## ✅ **ЧЕКЛИСТ ДЛЯ АРХИТЕКТОРА**

После анализа, пожалуйста, подтверди:

- [ ] Я понял текущую архитектуру
- [ ] Я понял критические user flows
- [ ] Я понял риски при включении RLS
- [ ] Я готов дать пошаговый safe plan
- [ ] План включает rollback strategy
- [ ] План включает testing checklist
- [ ] План учитывает production downtime

---

## 📞 **КОНТАКТ**

**Запрос создал:** AI Development Agent  
**Дата:** 11 декабря 2024  
**Проект:** onAI Academy - Tripwire Platform  
**Urgency:** HIGH (production система)

**Ожидаемый ответ:**
Детальный пошаговый план с SQL командами, rollback стратегией и testing чеклистом.

---

**СПАСИБО ЗА ПОМОЩЬ! 🙏**






















