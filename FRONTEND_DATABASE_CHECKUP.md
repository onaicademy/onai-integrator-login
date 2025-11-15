# 🔍 ЧЕКАП: Фронтенд ↔ База данных

**Дата:** 15 ноября 2025  
**Задача:** Проверить что ВСЕ данные с фронтенда есть в базе данных

---

## 📱 **1. СТРАНИЦА `/neurohub` (AI Наставник)**

### **Текущее состояние:** ❌ ВСЕ ДАННЫЕ ЗАХАРДКОЖЕНЫ!

```typescript
// src/pages/NeuroHub.tsx

// ❌ ЗАХАРДКОЖЕНО (строка 10):
const [streak] = useState(4); // Стрик 4 дня

// ❌ ЗАХАРДКОЖЕНО (строки 12-16):
const missions = [
  { id: 1, title: "Пройди 3 урока подряд", completed: false, progress: 1 },
  { id: 2, title: "Создай первого бота", completed: false, progress: 0 },
  { id: 3, title: "Заработай +100 XP за день", completed: true, progress: 100 },
];

// ❌ ЗАХАРДКОЖЕНО (строка 420):
<p className="text-lg font-bold text-white">2ч 15м</p> // Время обучения

// ❌ ЗАХАРДКОЖЕНО (строка 411):
<span className="text-sm font-bold text-white ml-3">65%</span> // Недельная цель
```

### **ЧТО НУЖНО В БД:**

#### 1️⃣ **Стрик (Streak)**
```sql
-- Таблица: profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
  current_streak INTEGER DEFAULT 0;
```

**Логика:** 
- Увеличивается +1 каждый день когда студент смотрит уроки
- Сбрасывается если пропустил день

---

#### 2️⃣ **Время обучения (Watch Time)**
```sql
-- Таблица: student_progress (УЖЕ ЕСТЬ!)
-- Колонка: watch_time_seconds
-- Нужно просто суммировать по user_id
```

**SQL запрос:**
```sql
SELECT SUM(watch_time_seconds) as total_watch_time_seconds
FROM public.student_progress
WHERE user_id = '<user_id>';
```

**API endpoint:** `GET /api/analytics/student/:userId/total-watch-time`

---

#### 3️⃣ **Недельная цель (Weekly Goal)**
```sql
-- Новая таблица: user_goals
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL, -- 'weekly_lessons', 'daily_minutes', etc
  target_value INTEGER NOT NULL, -- Цель (например, 10 уроков)
  current_value INTEGER DEFAULT 0, -- Текущий прогресс
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, goal_type, week_start_date)
);
```

**API endpoint:** `GET /api/goals/weekly/:userId`

---

#### 4️⃣ **Мини-миссии (Missions)**
```sql
-- Новая таблица: user_missions
CREATE TABLE public.user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_type VARCHAR(50) NOT NULL, -- 'complete_3_lessons', 'create_bot', etc
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  xp_reward INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API endpoint:** `GET /api/missions/:userId`

---

## 📱 **2. СТРАНИЦА `/profile` (Профиль)**

### **Текущее состояние:** ❌ ВСЕ ДАННЫЕ ЗАХАРДКОЖЕНЫ!

```typescript
// src/pages/Profile.tsx

// ❌ ЗАХАРДКОЖЕНО (строка 80):
<h1>Александр</h1> // Имя

// ❌ ЗАХАРДКОЖЕНО (строки 82-88):
<span>Интегратор I</span> // Роль
<span>Уровень 3</span> // Уровень
<span>1,240 XP</span> // XP

// ❌ ЗАХАРДКОЖЕНО (строка 121):
<div>12</div> // Уроков завершено

// ❌ ЗАХАРДКОЖЕНО (строка 126):
<div>45%</div> // Прогресс

// ❌ ЗАХАРДКОЖЕНО (строка 132):
<div>7</div> // Дней стрик

// ❌ ЗАХАРДКОЖЕНО (строка 150):
{ label: "Энергия", value: "78%", icon: "⚡" }
```

### **ЧТО НУЖНО В БД:**

#### 1️⃣ **Профиль пользователя (User Profile)**
```sql
-- Таблица: profiles (УЖЕ СУЩЕСТВУЕТ!)
-- Проверим что есть все нужные колонки:

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS 
  full_name TEXT,
  role TEXT DEFAULT 'student',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  total_watch_time_seconds INTEGER DEFAULT 0,
  energy_percentage INTEGER DEFAULT 100,
  avatar_url TEXT;
```

**API endpoint:** `GET /api/users/:userId/profile`

---

#### 2️⃣ **Завершенные уроки (Completed Lessons)**
```sql
-- Таблица: student_progress (УЖЕ ЕСТЬ!)
-- Нужно просто посчитать где is_completed = true

SELECT COUNT(*) as completed_lessons_count
FROM public.student_progress
WHERE user_id = '<user_id>' AND is_completed = true;
```

**API endpoint:** `GET /api/analytics/student/:userId/completed-lessons`

---

#### 3️⃣ **Общий прогресс (Overall Progress)**
```sql
-- Среднее по всем урокам курса

SELECT AVG(video_progress) as average_progress
FROM public.student_progress
WHERE user_id = '<user_id>';
```

**API endpoint:** `GET /api/analytics/student/:userId/overall-progress`

---

#### 4️⃣ **Энергия (Energy)**

**Концепция:** Метрика игрофикации, показывает "усталость" студента

**Логика расчета:**
```typescript
// Энергия = 100% если смотрел уроки сегодня
// Энергия = 80% если смотрел вчера
// Энергия = 50% если не смотрел 2 дня
// Энергия = 20% если не смотрел 3+ дней

const daysSinceLastActivity = Math.floor(
  (Date.now() - lastWatchedAt) / (24 * 60 * 60 * 1000)
);

let energy = 100;
if (daysSinceLastActivity === 1) energy = 80;
else if (daysSinceLastActivity === 2) energy = 50;
else if (daysSinceLastActivity >= 3) energy = 20;
```

**Данные из БД:**
```sql
SELECT last_watched_at
FROM public.student_progress
WHERE user_id = '<user_id>'
ORDER BY last_watched_at DESC
LIMIT 1;
```

**API endpoint:** `GET /api/analytics/student/:userId/energy`

---

## 📊 **3. КОМПОНЕНТЫ: UserDashboard.tsx**

### **Текущее состояние:** ❌ ЗАХАРДКОЖЕНО

```typescript
// src/components/profile/v2/UserDashboard.tsx

const xp = 1240; // ❌
const maxXp = 2000; // ❌
const level = 3; // ❌
```

### **ЧТО НУЖНО:**

```sql
-- Все данные из profiles
SELECT 
  full_name,
  role,
  level,
  xp,
  avatar_url
FROM public.profiles
WHERE id = '<user_id>';
```

**Расчет maxXp:**
```typescript
// XP для следующего уровня = level * 500 + 500
const maxXp = level * 500 + 500;

// Пример:
// Уровень 1: 1000 XP
// Уровень 2: 1500 XP
// Уровень 3: 2000 XP
// Уровень 4: 2500 XP
```

---

## 📊 **4. КОМПОНЕНТЫ: LearningStats.tsx**

### **Текущее состояние:** ❌ ЗАХАРДКОЖЕНО

```typescript
// src/components/profile/v2/LearningStats.tsx

const stats = [
  { label: "Всего XP", value: "1,240", progress: 62 }, // ❌
  { label: "Энергия", value: "78%", progress: 78 }, // ❌
  { label: "Статус", value: "Онлайн" }, // ❌
];
```

### **ЧТО НУЖНО:**

```sql
-- 1. XP из profiles
SELECT xp FROM public.profiles WHERE id = '<user_id>';

-- 2. Энергия (расчет из last_watched_at)
-- 3. Статус (онлайн если активность < 5 минут назад)
```

---

## 🗄️ **ИТОГОВАЯ СТРУКТУРА БД:**

### ✅ **УЖЕ СУЩЕСТВУЕТ:**

1. **profiles** - профили пользователей ✅
2. **student_progress** - прогресс по урокам ✅
3. **video_analytics** - детальная аналитика видео ✅
4. **module_progress** - прогресс по модулям ✅

### ❌ **НУЖНО СОЗДАТЬ:**

1. **user_goals** - цели пользователя (недельные, дневные)
2. **user_missions** - мини-миссии для игрофикации
3. **user_activity_log** - лог активности для энергии и стрика

### 🔧 **НУЖНО ДОБАВИТЬ КОЛОНКИ В PROFILES:**

```sql
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_watch_time_seconds INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT NOW();
```

---

## 🎯 **ПЛАН ДЕЙСТВИЙ:**

### **ШАГ 1: Проверить что есть в БД** ⏳
```sql
-- Файл: CHECK_PROFILES_STRUCTURE.sql
-- Проверить структуру profiles
-- Проверить какие колонки нужно добавить
```

### **ШАГ 2: Создать недостающие колонки** ⏳
```sql
-- Файл: ADD_GAMIFICATION_COLUMNS.sql
-- Добавить level, xp, current_streak, etc в profiles
```

### **ШАГ 3: Создать таблицы user_goals и user_missions** ⏳
```sql
-- Файл: CREATE_GAMIFICATION_TABLES.sql
-- user_goals
-- user_missions
```

### **ШАГ 4: Создать Backend API** ⏳
```typescript
// GET /api/users/:userId/profile - полный профиль
// GET /api/analytics/student/:userId/dashboard - дашборд для neurohub
// GET /api/goals/weekly/:userId - недельные цели
// GET /api/missions/:userId - мини-миссии
```

### **ШАГ 5: Подключить фронтенд к API** ⏳
```typescript
// Заменить все захардкоженные данные на API вызовы
// useEffect для загрузки данных при монтировании
```

---

## 🚀 **СЛЕДУЮЩИЙ ШАГ:**

Запусти SQL проверку профиля:

```sql
-- Файл: CHECK_PROFILES_STRUCTURE.sql
```

Я создам этот файл сейчас!

