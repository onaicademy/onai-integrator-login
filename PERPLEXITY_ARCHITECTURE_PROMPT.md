# 🏗️ ПРОМПТ ДЛЯ PERPLEXITY: АРХИТЕКТУРА TRIPWIRE БЕЗ БАГОВ

## 📋 КОНТЕКСТ ПРОЕКТА

Я разрабатываю **onAI Academy** - образовательную платформу на **Supabase + PostgreSQL + Node.js Backend + React Frontend**.

У меня **ДВЕ ИЗОЛИРОВАННЫЕ БАЗЫ ДАННЫХ**:

1. **Main Platform** (основная платформа) - работает **ОТЛИЧНО с Direct Query Builder**
2. **Tripwire Product** (мини-курс для лидогенерации) - **ИМЕЕТ ПРОБЛЕМЫ с RPC Functions**

---

## 🎯 TRIPWIRE PRODUCT - ЧТО ЭТО?

**Tripwire** - это мини-продукт за 5000 руб., который:
- Состоит из **3 модулей** (Module 16, 17, 18)
- В каждом модуле **1 урок** (Lesson 67, 68, 69 соответственно)
- Студента создает **Sales Manager** через Dashboard
- Студент получает доступ к 3 урокам и **может получить сертификат** после прохождения
- **НЕТ ГЕЙМИФИКАЦИИ** (нет XP, нет уровней, нет стриков) - только прогресс прохождения

---

## 🗄️ ТЕКУЩАЯ СТРУКТУРА БАЗЫ ДАННЫХ TRIPWIRE

### 1. **auth.users** (Supabase Auth)
```sql
-- Создаются через supabase.auth.admin.createUser()
-- Поля:
- id (UUID, PK)
- email (TEXT)
- created_at (TIMESTAMPTZ)
- user_metadata (JSONB) - хранит full_name, role
```

---

### 2. **public.users** (Основная таблица пользователей)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. **public.tripwire_users** (Студенты Tripwire)
```sql
CREATE TABLE public.tripwire_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id), -- Sales Manager ID
  manager_name TEXT, -- Имя менеджера
  status TEXT DEFAULT 'active', -- active, inactive, completed
  modules_completed INTEGER DEFAULT 0, -- 0, 1, 2, 3
  price NUMERIC DEFAULT 5000,
  welcome_email_sent BOOLEAN DEFAULT false,
  welcome_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tripwire_users_granted_by ON public.tripwire_users(granted_by);
CREATE INDEX idx_tripwire_users_status ON public.tripwire_users(status);
```

---

### 4. **public.tripwire_user_profile** (Профиль студента)
```sql
CREATE TABLE public.tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_modules INTEGER DEFAULT 3, -- Всегда 3 для Tripwire
  modules_completed INTEGER DEFAULT 0,
  completion_percentage NUMERIC DEFAULT 0,
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5. **public.module_unlocks** (Открытые модули)
```sql
CREATE TABLE public.module_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL, -- 16, 17, или 18
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);

CREATE INDEX idx_module_unlocks_user_id ON public.module_unlocks(user_id);
```

**ЛОГИКА ОТКРЫТИЯ МОДУЛЕЙ:**
- При регистрации: открывается **Module 16**
- После завершения Module 16: открывается **Module 17**
- После завершения Module 17: открывается **Module 18**

---

### 6. **public.student_progress** (Прогресс по урокам)
```sql
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL, -- 16, 17, или 18
  lesson_id INTEGER NOT NULL, -- 67, 68, или 69
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_student_progress_user_id ON public.student_progress(user_id);
CREATE INDEX idx_student_progress_lesson_id ON public.student_progress(user_id, lesson_id);
```

**ЛОГИКА:**
- При регистрации: создается запись **ТОЛЬКО для Module 16 (Lesson 67)**
- Для Module 17 и 18: записи создаются **АВТОМАТИЧЕСКИ после открытия модуля**

---

### 7. **public.video_tracking** (Честный трекинг просмотра видео)
```sql
CREATE TABLE public.video_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL,
  watched_segments JSONB, -- Массив сегментов [{start: 10, end: 25}, {start: 30, end: 60}]
  total_watched_seconds INTEGER DEFAULT 0, -- Сумма уникальных просмотренных секунд
  video_duration_seconds INTEGER DEFAULT 0,
  watch_percentage INTEGER DEFAULT 0, -- Процент просмотра (0-100)
  last_position_seconds INTEGER DEFAULT 0,
  is_qualified_for_completion BOOLEAN DEFAULT false, -- true если watch_percentage >= 80%
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_tracking_user_lesson ON public.video_tracking(user_id, lesson_id);
```

**ЧЕСТНЫЙ ТРЕКИНГ (80% ПРАВИЛО):**
- **НЕ учитывается перемотка вперед** - только реально просмотренные секунды
- Хранится массив сегментов просмотра: `[{start: 0, end: 120}, {start: 300, end: 450}]`
- Сегменты объединяются для расчета уникального времени просмотра
- Урок считается **завершенным** если `watch_percentage >= 80%` **ИЛИ** студент перемотал на 80%+ видео
- Пример: видео 10 минут (600 сек), студент посмотрел 8 минут (480 сек) → `watch_percentage = 80%` → `is_qualified_for_completion = true`

**Формула:**
```
total_watched_seconds = sum(unique_segments) // Уникальные секунды
watch_percentage = (total_watched_seconds / video_duration_seconds) * 100
is_qualified = watch_percentage >= 80 OR current_position >= 80% of video
```

---

### 8. **public.user_achievements** (Достижения)
```sql
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL, -- first_module_complete, second_module_complete, third_module_complete, tripwire_graduate
  current_value INTEGER DEFAULT 0,
  required_value INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON public.user_achievements(user_id);
```

**4 ДОСТИЖЕНИЯ ДЛЯ TRIPWIRE:**
1. `first_module_complete` - Завершение Module 16
2. `second_module_complete` - Завершение Module 17
3. `third_module_complete` - Завершение Module 18
4. `tripwire_graduate` - Завершение всех 3 модулей (выдается сертификат)

---

### 9. **public.user_statistics** (Общая статистика)
```sql
CREATE TABLE public.user_statistics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- Секунды
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 10. **public.sales_activity_log** (Логи действий Sales Manager)
```sql
CREATE TABLE public.sales_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL, -- user_created, user_status_updated, etc.
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB, -- Дополнительные данные (email, full_name, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_activity_log_manager_id ON public.sales_activity_log(manager_id);
CREATE INDEX idx_sales_activity_log_created_at ON public.sales_activity_log(created_at DESC);
```

---

## 🔄 ТЕКУЩАЯ АРХИТЕКТУРА (ПРОБЛЕМНАЯ)

### Проблема #1: RPC Functions + PostgREST Schema Cache
```typescript
// ❌ ТЕКУЩИЙ ПОДХОД (НЕ РАБОТАЕТ):
const { data, error } = await supabase.rpc('rpc_get_sales_leaderboard');

// ПРОБЛЕМА:
// - PostgREST Schema Cache не обновляется после миграций
// - Нужен NOTIFY pgrst, 'reload schema' - но не помогает
// - Нужен Restart проекта в Supabase Dashboard - неудобно
// - Ошибка: "Could not find the function in the schema cache"
```

### Проблема #2: Trigger на auth.users не срабатывает
```sql
-- ❌ ТЕКУЩИЙ ПОДХОД (НЕ РАБОТАЕТ):
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_tripwire_user();

-- ПРОБЛЕМА:
-- - Trigger НЕ срабатывает при createUser()
-- - Таблицы не инициализируются
-- - Silent failure
```

---

## ✅ MAIN PLATFORM ARCHITECTURE (РАБОТАЕТ ИДЕАЛЬНО)

### Подход: Direct Query Builder

```typescript
// ✅ СОЗДАНИЕ СТУДЕНТА (Main Platform):

// 1. Create user in Auth
const { data: authData } = await supabase.auth.admin.createUser({
  email: data.email,
  password: data.password,
  email_confirm: true,
  user_metadata: { full_name: data.full_name, role: data.role }
});

// 2. Create in public.users
await supabase
  .from('users')
  .upsert({
    id: authData.user.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    onboarding_completed: data.role !== 'student'
  }, { onConflict: 'id' });

// 3. Create in student_profiles (if student)
if (data.role === 'student') {
  await supabase
    .from('student_profiles')
    .insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || null,
      is_active: true
    });
}

// 4. Assign courses
if (data.course_ids) {
  const courseAssignments = data.course_ids.map(courseId => ({
    user_id: authData.user.id,
    course_id: courseId,
    is_active: true
  }));
  
  await supabase.from('user_courses').insert(courseAssignments);
}
```

**ХАРАКТЕРИСТИКИ:**
- ✅ Прозрачная логика (все видно в коде)
- ✅ Легко дебажить
- ✅ Нет зависимости от Schema Cache
- ✅ Работает сразу после миграций
- ⚠️ Больше запросов к БД (4 INSERT вместо 1 RPC)

---

## 🎯 МОЙ ВОПРОС К PERPLEXITY

**Я хочу переписать Tripwire на Direct Query Builder (как Main Platform), но ПРАВИЛЬНО, чтобы:**

### 1. **Создание студента работало корректно**
```typescript
// Что нужно сделать после createUser()?
// Какой порядок INSERT в таблицы?
// Как обработать ошибки?
// Нужны ли транзакции через pg.Pool?
```

### 2. **Открытие модулей работало автоматически**
```
- При регистрации: открыть Module 16
- После завершения Module 16: открыть Module 17
- После завершения Module 17: открыть Module 18

КАК РЕАЛИЗОВАТЬ БЕЗ TRIGGERS?
Варианты:
A) Backend проверяет после завершения урока и открывает следующий модуль
B) Edge Function на UPDATE в student_progress
C) Что-то другое?
```

### 3. **Трекинг видео работал честно (80% правило)**
```typescript
// У меня есть useHonestVideoTracking hook (React)
// Он сохраняет сегменты в video_tracking каждые 10 секунд
// Вопросы:
// - Правильно ли я храню сегменты в JSONB?
// - Как эффективно проверять is_qualified_for_completion?
// - Нужны ли индексы на JSONB поля?
```

### 4. **Статистика Sales Manager работала быстро**
```typescript
// Нужна статистика для Sales Dashboard:
// - Leaderboard (топ менеджеров по количеству студентов)
// - Activity Log (последние действия менеджера)
// - Chart Data (продажи по датам)
// - Stats (total students, active students, total revenue)

// ВОПРОС: RPC vs Direct Query Builder?
// - RPC: быстрее (агрегация в PostgreSQL)
// - Direct: проще (агрегация в JavaScript/Node.js)

// Что выбрать для 10,000+ студентов?
```

### 5. **Выдача сертификата работала автоматически**
```
- Студент завершил Module 18 (Lesson 69)
- Должен автоматически получить сертификат
- Должно обновиться достижение tripwire_graduate

КАК РЕАЛИЗОВАТЬ БЕЗ TRIGGERS?
Варианты:
A) Backend проверяет после завершения Lesson 69
B) Edge Function генерирует сертификат
C) Отложенная выдача через cron job
```

---

## 📊 МАСШТАБ ПРОЕКТА

**Текущие цифры:**
- Main Platform: ~5,000 студентов
- Tripwire: планируется 500-10,000 студентов

**Ожидаемая нагрузка:**
- 100+ одновременных просмотров видео
- 10+ Sales Managers создают студентов
- Dashboard обновляется каждые 30 секунд

---

## 🔥 ГЛАВНЫЙ ВОПРОС

**КАК ПРАВИЛЬНО ПОСТРОИТЬ DIRECT DB АРХИТЕКТУРУ ДЛЯ TRIPWIRE, ЧТОБЫ:**

1. ✅ **Не было багов** (все INSERT/UPDATE корректны)
2. ✅ **Не было Schema Cache проблем** (без RPC или с минимумом RPC)
3. ✅ **Работало быстро** (оптимальные индексы, запросы)
4. ✅ **Было масштабируемо** (готово к 10,000+ студентов)
5. ✅ **Было легко поддерживать** (прозрачная логика)

---

## 📝 ТРЕБУЕМЫЙ ФОРМАТ ОТВЕТА

Пожалуйста, предоставь:

### 1. **Архитектурное решение**
- Какой подход использовать: Pure Direct Query Builder, Hybrid (RPC + Direct), или что-то другое?
- Где использовать RPC, где Direct?
- Нужны ли PostgreSQL транзакции через pg.Pool?

### 2. **Миграционная стратегия**
- Полный SQL код для создания таблиц (с правильными индексами)
- SQL triggers (если они нужны) или альтернативы
- RPC Functions (если они нужны для статистики)

### 3. **Backend Implementation Pattern**
```typescript
// Пример кода для:
// - createTripwireUser()
// - completeLesson()
// - unlockNextModule()
// - issueCertificate()
// - getSalesStats()
```

### 4. **Performance Optimization**
- Какие индексы создать?
- Нужны ли материализованные views?
- Где применить кэширование (Redis)?

### 5. **Error Handling & Rollback**
- Как обрабатывать ошибки в цепочке INSERT?
- Нужны ли compensating transactions?

### 6. **Testing Strategy**
- Как протестировать каждый сценарий?
- Какие edge cases учесть?

---

## 🎯 ЦЕЛЬ

**Создать bulletproof архитектуру Direct DB для Tripwire, которая будет работать ТАК ЖЕ НАДЕЖНО, как Main Platform, но БЕЗ БАГОВ, связанных с RPC Functions и Triggers.**

**Спасибо!** 🙏

---

## 📎 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Tech Stack:
- **Database:** Supabase PostgreSQL 15
- **Backend:** Node.js 18 + Express + TypeScript
- **Frontend:** React 18 + Vite + TypeScript
- **Client Library:** @supabase/supabase-js ^2.x
- **Connection:** Service Role Key (bypasses RLS)

### Constraints:
- ❌ Нельзя использовать Supabase CLI (только Dashboard + API)
- ✅ Можно использовать pg.Pool для прямых SQL запросов
- ✅ Можно использовать Edge Functions (Deno)
- ✅ Можно использовать Database Webhooks

### Current Files:
- `backend/src/services/tripwireManagerService.ts` - сервис для управления Tripwire
- `backend/src/config/supabase-tripwire.ts` - клиент Supabase для Tripwire DB
- `backend/src/config/tripwire-db-direct.ts` - прямое подключение через pg.Pool
- `src/hooks/useHonestVideoTracking.ts` - React hook для трекинга видео
