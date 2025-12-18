# 🏗️ АРХИТЕКТУРА БАЗ ДАННЫХ: MAIN vs TRIPWIRE

**Дата:** 2025-12-04  
**Автор:** AI Architect  
**Проект:** onAI Academy Platform

---

## 📊 EXECUTIVE SUMMARY

В проекте используются **ДВЕ ИЗОЛИРОВАННЫЕ БАЗЫ ДАННЫХ**:
1. **Main Database** (arqhkacellqbhjhbebfh.supabase.co) - Основная платформа
2. **Tripwire Database** (pjmvxecykysfrzppdcto.supabase.co) - Sales Manager система

**Ключевое открытие:** Main Database УЖЕ использует Direct Query Builder (без RPC) для ВСЕХ операций.  
**Решение:** Tripwire Database переписана в том же стиле для единообразия архитектуры.

---

## 🌐 СХЕМА ДВУХ БАЗ ДАННЫХ

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                            │
│                      https://onai.academy                            │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BACKEND API (DigitalOcean)                        │
│                   https://api.onai.academy                           │
│                                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐         │
│  │   adminSupabase      │         │ tripwireAdminSupabase│         │
│  │  (Main Database)     │         │  (Tripwire Database) │         │
│  └──────────┬───────────┘         └──────────┬───────────┘         │
└─────────────┼────────────────────────────────┼─────────────────────┘
              │                                │
              ▼                                ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│   Main Supabase DB      │    │  Tripwire Supabase DB   │
│ arqhkacellqbhjhbebfh... │    │ pjmvxecykysfrzppdcto... │
│                         │    │                         │
│ • users                 │    │ • users                 │
│ • courses               │    │ • tripwire_users        │
│ • student_progress      │    │ • sales_activity_log    │
│ • user_achievements     │    │ • tripwire_progress     │
│ • user_missions         │    │ • tripwire_lessons      │
│ • profiles              │    │                         │
│ • ...                   │    │                         │
└─────────────────────────┘    └─────────────────────────┘
```

---

## 🔧 КОНФИГУРАЦИЯ КЛИЕНТОВ

### 1. Main Database Client (`backend/src/config/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false  // Prevent session contamination
  },
  global: {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`  // 🔥 Explicit Bearer token
    }
  }
});

// Backward compatibility
export const supabase = adminSupabase;
```

**Ключевые особенности:**
- ✅ Service Role Key (bypasses RLS)
- ✅ No session persistence (безопасность)
- ✅ Explicit Authorization header

---

### 2. Tripwire Database Client (`backend/src/config/supabase-tripwire.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const tripwireServiceRoleKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

export const tripwireAdminSupabase = createClient(tripwireUrl, tripwireServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'  // ← Явно указываем схему для PostgREST
  },
  global: {
    headers: {
      Authorization: `Bearer ${tripwireServiceRoleKey}`
    }
  }
});
```

**Ключевые особенности:**
- ✅ Отдельный Service Role Key
- ✅ Изолирован от Main Database
- ✅ Explicit schema: 'public'

---

## 📁 СТРУКТУРА СЕРВИСОВ

### Main Database Services (используют `adminSupabase`)

```
backend/src/services/
├── studentService.ts          ← CRUD студентов (Direct Query Builder)
├── dashboardService.ts        ← Статистика дашборда (JS агрегация)
├── courseService.ts           ← Курсы
├── lessonService.ts           ← Уроки
├── profileService.ts          ← Профили
├── supabaseDatabaseService.ts ← Metadata файлов
├── ...
```

**Все сервисы используют Direct Query Builder:**
- `.from('table').select()`
- `.from('table').insert()`
- `.from('table').update()`
- `.from('table').delete()`

**NO RPC вызовов** (кроме одного специального случая в `fileCleanupService.ts`).

---

### Tripwire Database Services (используют `tripwireAdminSupabase`)

```
backend/src/services/
├── tripwireManagerService.ts           ← 🔥 НОВАЯ ВЕРСИЯ (Direct Query Builder)
├── tripwireManagerService_RPC_VERSION.ts ← Старая версия (RPC)
├── tripwire/
│   ├── tripwireService.ts
│   ├── tripwireDashboardService.ts
│   ├── tripwireProfileService.ts
│   ├── ...
```

**Новая версия (`tripwireManagerService.ts`):**
- ✅ Переписана на Direct Query Builder
- ✅ Следует архитектуре Main Database
- ✅ JS агрегация для статистики

---

## 🔍 СРАВНЕНИЕ ПОДХОДОВ

### ✅ Main Database: Direct Query Builder (ИСПОЛЬЗУЕТСЯ СЕЙЧАС)

#### Пример 1: Создание студента (`studentService.ts`)

```typescript
// 1. Создаём пользователя в Supabase Auth
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: data.email,
  password: data.password,
  email_confirm: true,
  user_metadata: { full_name: data.full_name, role: data.role },
});

// 2. Создаём запись в таблице users
const { error: profileError } = await supabase
  .from('users')
  .upsert({
    id: authData.user.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role,
    onboarding_completed: data.role !== 'student',
  }, { onConflict: 'id' });

// 3. Создаём student_profiles (если студент)
if (data.role === 'student') {
  const { error: studentProfileError } = await supabase
    .from('student_profiles')
    .insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      phone: data.phone || null,
      is_active: true,
    });
}

// 4. Назначаем курсы
if (data.course_ids && data.course_ids.length > 0) {
  const courseAssignments = data.course_ids.map(courseId => ({
    user_id: authData.user!.id,
    course_id: courseId,
    is_active: true,
  }));

  const { error: coursesError } = await supabase
    .from('user_courses')
    .insert(courseAssignments);
}
```

**Характеристики:**
- 4 отдельных запроса
- Прозрачная логика
- Легко дебажить
- Нет зависимости от Schema Cache

---

#### Пример 2: Статистика дашборда (`dashboardService.ts`)

```typescript
// 1. Получаем профиль
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, avatar_url, level, xp, current_streak')
  .eq('id', userId)
  .single();

// 2. Статистика за сегодня
const today = new Date().toISOString().split('T')[0];
const { data: todayProgress } = await supabase
  .from('student_progress')
  .select('is_completed, watch_time_seconds, updated_at')
  .eq('user_id', userId)
  .gte('updated_at', `${today}T00:00:00`)
  .lte('updated_at', `${today}T23:59:59`);

// 🔥 JS АГРЕГАЦИЯ
const todayLessonsCompleted = todayProgress?.filter(p => p.is_completed).length || 0;
const todayWatchTime = todayProgress?.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0) || 0;
const todayXpEarned = todayLessonsCompleted * 50;

// 3. Активность за неделю
const { data: weekProgress } = await supabase
  .from('student_progress')
  .select('completed_at, watch_time_seconds')
  .eq('user_id', userId)
  .eq('is_completed', true)
  .gte('completed_at', `${sevenDaysAgoStr}T00:00:00`);

// 🔥 JS ГРУППИРОВКА по дням
const weekActivity: DashboardActivity[] = [];
for (let i = 6; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];
  
  const dayData = weekProgress?.filter(p => p.completed_at?.startsWith(dateStr)) || [];
  const lessonsCompleted = dayData.length;
  const watchTime = dayData.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0);
  
  weekActivity.push({
    date: dateStr,
    lessons_completed: lessonsCompleted,
    watch_time_minutes: Math.round(watchTime / 60),
    xp_earned: lessonsCompleted * 50,
  });
}
```

**Характеристики:**
- Получаем сырые данные
- Агрегация в JavaScript
- `Array.filter()`, `Array.reduce()`, циклы
- Полный контроль над логикой

---

### ❌ Tripwire Database: RPC Functions (СТАРАЯ ВЕРСИЯ)

#### Пример: Создание студента (старый подход)

```typescript
// Одна RPC функция делает всё
const { data, error } = await tripwireAdminSupabase
  .rpc('rpc_create_tripwire_user_full', {
    p_user_id: newUser.user.id,
    p_full_name: full_name,
    p_email: email,
    p_granted_by: currentUserId,
    p_manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
    p_generated_password: userPassword,
    p_welcome_email_sent: false,
  });
```

**Внутри RPC функции (SQL):**
```sql
CREATE OR REPLACE FUNCTION rpc_create_tripwire_user_full(
  p_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_granted_by UUID,
  p_manager_name TEXT,
  p_generated_password TEXT,
  p_welcome_email_sent BOOLEAN
) RETURNS JSON AS $$
BEGIN
  -- INSERT в tripwire_users
  INSERT INTO tripwire_users (user_id, full_name, email, granted_by, ...)
  VALUES (p_user_id, p_full_name, p_email, p_granted_by, ...);
  
  -- INSERT в sales_activity_log
  INSERT INTO sales_activity_log (manager_id, action_type, student_id, ...)
  VALUES (p_granted_by, 'user_created', p_user_id, ...);
  
  RETURN json_build_object('success', true, 'user_id', p_user_id);
END;
$$ LANGUAGE plpgsql;
```

**Проблемы:**
- ❌ Schema Cache не обновляется автоматически
- ❌ Нужен `NOTIFY pgrst, 'reload schema'` после каждой миграции
- ❌ Логика размазана между Backend (TS) и Database (SQL)
- ❌ Сложнее дебажить (нужно смотреть pg_stat_statements)

---

## 🔄 НОВАЯ АРХИТЕКТУРА TRIPWIRE (ПОСЛЕ РЕФАКТОРИНГА)

### Пример: Создание студента (новый подход)

```typescript
// 1. Создаём в Auth
const { data: newUser, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
  email: email,
  password: userPassword,
  email_confirm: true,
  user_metadata: {
    granted_by: currentUserId,
    created_by_manager: true,
    full_name: full_name,
    platform: 'tripwire',
  },
});

// 2. 🔥 DIRECT INSERT в tripwire_users
const { data: tripwireUserData, error: tripwireInsertError } = await tripwireAdminSupabase
  .from('tripwire_users')
  .insert({
    user_id: newUser.user.id,
    full_name: full_name,
    email: email,
    granted_by: currentUserId,
    status: 'active',
    welcome_email_sent: false,
    generated_password: userPassword,
    payment_amount: 0,
  })
  .select()
  .single();

// 3. 🔥 DIRECT INSERT в sales_activity_log
const { error: logError } = await tripwireAdminSupabase
  .from('sales_activity_log')
  .insert({
    manager_id: currentUserId,
    action_type: 'user_created',
    student_id: newUser.user.id,
    student_name: full_name,
    student_email: email,
    manager_name: currentUserName || currentUserEmail || 'Unknown Manager',
    generated_password: userPassword,
  });

// 4. Отправляем email через emailService...

// 5. 🔥 DIRECT UPDATE email status
if (emailSent) {
  const { error: updateError } = await tripwireAdminSupabase
    .from('tripwire_users')
    .update({ welcome_email_sent: true })
    .eq('user_id', newUser.user.id);
}
```

**Теперь:**
- ✅ Идентичный стиль с Main Database
- ✅ Прозрачная логика
- ✅ Нет зависимости от Schema Cache
- ✅ Единообразная архитектура

---

## 📊 СРАВНИТЕЛЬНАЯ ТАБЛИЦА

| Критерий | Main Database | Tripwire (Старая) | Tripwire (Новая) |
|----------|---------------|-------------------|------------------|
| **Подход** | Direct Query Builder | RPC Functions | Direct Query Builder |
| **Агрегация** | JavaScript (Backend) | SQL (Database) | JavaScript (Backend) |
| **Зависимость от Schema Cache** | ❌ Нет | ✅ Да (проблема) | ❌ Нет |
| **Транзакционность** | ❌ Нет (отдельные запросы) | ✅ Да (SQL BEGIN/COMMIT) | ❌ Нет |
| **Прозрачность логики** | ✅ Высокая | ⚠️ Средняя (SQL + TS) | ✅ Высокая |
| **Легкость дебага** | ✅ Легко | ⚠️ Сложнее | ✅ Легко |
| **Перфоманс (малые данные)** | ✅ Хороший | ✅ Хороший | ✅ Хороший |
| **Перфоманс (большие данные)** | ⚠️ Средний | ✅ Отличный | ⚠️ Средний |
| **Network Traffic** | ⚠️ Высокий | ✅ Низкий | ⚠️ Высокий |
| **Memory Usage (Backend)** | ⚠️ Высокий | ✅ Низкий | ⚠️ Высокий |
| **Единообразие кодовой базы** | ✅ Да | ❌ Нет | ✅ Да |

---

## 🎯 ПОЧЕМУ ВЫБРАН DIRECT QUERY BUILDER?

### ✅ Преимущества

1. **Единообразие архитектуры**
   - Main Database УЖЕ использует Direct Query Builder
   - Tripwire Database теперь в том же стиле
   - Легче поддерживать и масштабировать

2. **Нет зависимости от PostgREST Schema Cache**
   - Не нужно `NOTIFY pgrst, 'reload schema'` после миграций
   - Работает сразу после применения миграций
   - Меньше магии, больше предсказуемости

3. **Прозрачность и дебаг**
   - Весь код в одном месте (TypeScript)
   - Легко добавить `console.log()` между запросами
   - Stack traces понятные

4. **Гибкость**
   - Легко менять логику (не нужно пересоздавать RPC функции)
   - Можно добавить условную логику между запросами
   - Retry механизмы, fallback стратегии

5. **TypeScript типизация**
   - `.from('table').select()` типизируется через Supabase codegen
   - RPC функции часто теряют типы

---

### ⚠️ Недостатки

1. **Перфоманс для больших данных**
   - `getSalesLeaderboard()` - загружает ВСЕ записи
   - `getTripwireStats()` - загружает ВСЕ записи менеджера
   - Для >10,000 студентов может быть медленно

2. **Network Traffic**
   - Передаем сырые данные от Database → Backend
   - SQL агрегация была бы эффективнее

3. **Транзакционность**
   - Нет ACID гарантий между запросами
   - Если 2й INSERT упадет, 1й останется в базе

4. **Memory Usage**
   - Все записи загружаются в память Node.js процесса
   - Для больших датасетов может быть проблема

---

## 🔧 ОПТИМИЗАЦИИ ДЛЯ PRODUCTION

### 1. Redis Кэш для Leaderboard

```typescript
// Кэшируем результат на 10 минут
const cacheKey = 'sales:leaderboard';
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const leaderboard = await getSalesLeaderboard();
await redis.setex(cacheKey, 600, JSON.stringify(leaderboard)); // 10 минут

return leaderboard;
```

---

### 2. Индексы для быстрых запросов

```sql
-- tripwire_users
CREATE INDEX IF NOT EXISTS idx_tripwire_users_granted_by 
  ON tripwire_users(granted_by);
  
CREATE INDEX IF NOT EXISTS idx_tripwire_users_created_at 
  ON tripwire_users(created_at DESC);
  
CREATE INDEX IF NOT EXISTS idx_tripwire_users_status 
  ON tripwire_users(status);

-- sales_activity_log
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_manager_id 
  ON sales_activity_log(manager_id);
  
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_created_at 
  ON sales_activity_log(created_at DESC);
```

---

### 3. Limit для больших запросов

```typescript
// Топ 100 менеджеров вместо всех
const { data: students } = await tripwireAdminSupabase
  .from('tripwire_users')
  .select('granted_by, status, payment_amount')
  .order('created_at', { ascending: false })
  .limit(10000); // Ограничение
```

---

### 4. Материализованные Views (для будущего)

```sql
-- Агрегированная таблица для статистики (обновляется каждый час)
CREATE MATERIALIZED VIEW manager_stats_hourly AS
SELECT 
  granted_by as manager_id,
  COUNT(*) as total_students,
  COUNT(*) FILTER (WHERE status = 'active') as active_students,
  SUM(payment_amount) as total_revenue,
  DATE_TRUNC('hour', NOW()) as computed_at
FROM tripwire_users
GROUP BY granted_by;

-- Refresh каждый час через cron job
REFRESH MATERIALIZED VIEW manager_stats_hourly;
```

---

## 🚀 DEPLOYMENT STRATEGY

### Phase 1: Testing (Текущий этап)
1. ✅ Код написан (Direct Query Builder)
2. ⚠️ TypeScript компилируется
3. ⚠️ Линтер чист
4. ❌ Функциональное тестирование (TODO)
5. ❌ Performance тестирование (TODO)

---

### Phase 2: Staging Deployment
1. Deploy на staging server
2. Тестирование в production-like окружении
3. Проверка индексов и Foreign Keys
4. Load testing с реальными данными

---

### Phase 3: Production Deployment
1. Создать бэкап базы данных
2. Deploy на production
3. Мониторинг метрик (response time, error rate)
4. Rollback план (откат на RPC версию если что-то пойдет не так)

---

## 📝 ВЫВОДЫ

### ✅ Что сделано правильно

1. **Единообразие:** Tripwire Database теперь использует ту же архитектуру что и Main Database
2. **Прозрачность:** Весь код в TypeScript, легко читать и модифицировать
3. **Нет Schema Cache проблем:** Работает сразу после миграций
4. **Типизация:** TypeScript типы для всех запросов

---

### ⚠️ Что нужно улучшить

1. **Перфоманс:** Оптимизировать `getSalesLeaderboard()` и `getTripwireStats()` для больших данных
2. **Транзакционность:** Рассмотреть compensating transactions или SQL транзакции
3. **Кэширование:** Добавить Redis для leaderboard и статистики
4. **Индексы:** Убедиться что все индексы созданы

---

### 🎯 Next Steps

1. ✅ Проверить Database схему (Foreign Keys, Indexes, RLS)
2. ✅ Протестировать все функции через UI
3. ✅ Замерить response time для ключевых endpoints
4. ✅ Deploy на staging
5. ✅ Deploy на production

---

## 📚 ЗАКЛЮЧЕНИЕ

**Main Database и Tripwire Database теперь используют ОДИНАКОВУЮ архитектуру:**
- Direct Query Builder вместо RPC
- JavaScript агрегация вместо SQL GROUP BY
- Прозрачная и понятная логика
- Единообразный код

**Это правильное решение для:**
- Small to Medium scale (<10,000 студентов)
- Быстрая итерация и разработка
- Легкая поддержка и дебаг

**Для Enterprise scale (>100,000 студентов) рассмотреть:**
- Материализованные Views
- Redis кэш
- Гибридный подход (RPC для тяжелых запросов, Direct для CRUD)

---

**Статус:** ✅ Архитектура унифицирована, готова к тестированию  
**Риски:** ⚠️ Перфоманс для больших данных (решается кэшированием и индексами)  
**Готовность к деплою:** ❌ Требуется функциональное тестирование





























