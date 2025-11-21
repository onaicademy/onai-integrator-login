# 🤖 СТРАТЕГИЯ ИНТЕГРАЦИИ AI-НАСТАВНИКА С БАЗОЙ ДАННЫХ

**Дата создания:** 21 ноября 2025
**Проект:** onAI Academy - AI-Наставник (NeuroHub)
**Статус:** Архитектурная стратегия и план внедрения

---

## 📋 ОГЛАВЛЕНИЕ

1. [Текущее состояние системы](#текущее-состояние-системы)
2. [Архитектура интеграции](#архитектура-интеграции)
3. [Структура базы данных для AI-наставника](#структура-базы-данных-для-ai-наставника)
4. [Стратегия подключения функционала](#стратегия-подключения-функционала)
5. [Этапы разработки](#этапы-разработки)
6. [Технические детали реализации](#технические-детали-реализации)
7. [Риски и их минимизация](#риски-и-их-минимизация)

---

## 🎯 ТЕКУЩЕЕ СОСТОЯНИЕ СИСТЕМЫ

### ✅ Что уже работает:

1. **AI-чат (OpenAI Assistant API)**
   - Отправка/получение сообщений ✅
   - Прикрепление файлов (изображения, PDF, DOCX) ✅
   - История чатов в Supabase ✅
   - Markdown форматирование ✅
   - Thread Management (localStorage) ✅
   - Три типа ассистентов: `curator`, `mentor`, `analyst` ✅

2. **Frontend страница NeuroHub**
   - Полностью готовый UI/UX дизайн ✅
   - Анимации и интерактивность ✅
   - Карточки статистики ✅
   - Система достижений (UI) ✅
   - Миссии (UI) ✅
   - Цели (локальное редактирование) ✅

3. **Backend API**
   - Express.js сервер ✅
   - JWT аутентификация ✅
   - API клиент на Frontend ✅
   - Загрузка файлов в Supabase Storage ✅
   - OpenAI интеграция ✅

4. **База данных (Supabase)**
   - Таблицы `users`, `profiles` ✅
   - Таблицы курсов: `courses`, `modules`, `lessons` ✅
   - Видео контент: `video_content`, `video_analytics` ✅
   - Базовая структура gamification ✅

### ⚠️ Что отсутствует (критично для AI-наставника):

1. **Аналитика пользователей**
   - ❌ Отслеживание прогресса по урокам
   - ❌ Сбор метрик просмотра видео (сколько посмотрел, на какой секунде остановился)
   - ❌ История активности ученика
   - ❌ Streak (дни обучения подряд)

2. **Система достижений**
   - ❌ Backend API для достижений
   - ❌ Автоматическая разблокировка при выполнении условий
   - ❌ Уведомления о получении достижений

3. **Система миссий**
   - ❌ Backend API для миссий
   - ❌ Автоматическое обновление прогресса
   - ❌ Загрузка домашних заданий

4. **Персонализация AI**
   - ❌ AI не знает информацию о студенте (прогресс, имя, достижения)
   - ❌ Нет базы знаний куратора
   - ❌ Нет контекста для персонализированных советов

---

## 🏗️ АРХИТЕКТУРА ИНТЕГРАЦИИ

### 📊 Концептуальная схема

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  NeuroHub Page (src/pages/NeuroHub.tsx)                    │ │
│  │  - AI-чат                                                   │ │
│  │  - Карточки статистики (прогресс, streak, XP, достижения)  │ │
│  │  - Миссии и цели                                            │ │
│  │  - Достижения (все категории)                               │ │
│  │  - Советы и рекомендации                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Client (src/utils/apiClient.ts)                        │ │
│  │  - Все запросы к Backend через JWT                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS (JWT)
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  API Routes                                                  │ │
│  │  /api/analytics/student/:userId/dashboard                   │ │
│  │  /api/analytics/student/:userId/video-progress              │ │
│  │  /api/achievements/:userId                                   │ │
│  │  /api/missions/:userId                                       │ │
│  │  /api/goals/:userId                                          │ │
│  │  /api/openai/threads/:threadId/messages                     │ │
│  │  /api/ai-mentor/context/:userId                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  AI Context Builder                                          │ │
│  │  - Собирает ВСЕ данные о студенте                           │ │
│  │  - Формирует контекст для OpenAI                            │ │
│  │  - Инжектирует базу знаний куратора                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Analytics Engine                                            │ │
│  │  - Обработка событий (просмотр видео, завершение урока)     │ │
│  │  - Обновление достижений                                     │ │
│  │  - Подсчет streak                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↕ service_role_key
┌─────────────────────────────────────────────────────────────────┐
│                    БАЗА ДАННЫХ (Supabase)                       │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Пользователи       │  │  Аналитика и Прогресс           │  │
│  │  - users            │  │  - user_stats                   │  │
│  │  - profiles         │  │  - user_progress                │  │
│  │                     │  │  - video_watch_sessions         │  │
│  └─────────────────────┘  │  - student_learning_metrics     │  │
│                           └─────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │  Обучение           │  │  Gamification                   │  │
│  │  - courses          │  │  - achievements                 │  │
│  │  - modules          │  │  - user_achievements            │  │
│  │  - lessons          │  │  - missions                     │  │
│  │  - video_content    │  │  - weekly_goals                 │  │
│  └─────────────────────┘  │  - daily_challenges             │  │
│                           └─────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  AI-Наставник                                             │  │
│  │  - curator_chat_history                                   │  │
│  │  - ai_mentor_advice_log                                   │  │
│  │  - curator_knowledge_base                                 │  │
│  │  - student_questions_log                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                      ВНЕШНИЕ СЕРВИСЫ                             │
│  ┌────────────────┐   ┌──────────────────┐                     │
│  │  OpenAI API    │   │  Telegram Bots   │                     │
│  │  - GPT-4o      │   │  - AI-Mentor     │                     │
│  │  - Assistants  │   │  - AI-Analyst    │                     │
│  │  - Whisper     │   └──────────────────┘                     │
│  └────────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 🔑 Ключевые принципы архитектуры:

1. **Единый источник правды** - БД Supabase хранит ВСЕ данные
2. **Backend как центр** - Вся логика на Backend, Frontend только отображает
3. **Real-time обновления** - Supabase Realtime для live-данных
4. **Контекстная персонализация** - AI получает полный контекст о студенте
5. **Event-driven architecture** - События триггерят обновления (просмотр видео → обновление прогресса → проверка достижений)

---

## 📊 СТРУКТУРА БАЗЫ ДАННЫХ ДЛЯ AI-НАСТАВНИКА

### 1️⃣ Таблицы аналитики пользователей

#### `user_stats` - Общая статистика студента
```sql
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Прогресс обучения
  lessons_completed INTEGER DEFAULT 0 NOT NULL,
  total_study_time_minutes INTEGER DEFAULT 0 NOT NULL,
  courses_completed INTEGER DEFAULT 0 NOT NULL,
  modules_completed INTEGER DEFAULT 0 NOT NULL,

  -- Gamification
  total_xp INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  longest_streak INTEGER DEFAULT 0 NOT NULL,
  achievements_unlocked INTEGER DEFAULT 0 NOT NULL,

  -- AI взаимодействие
  messages_sent_to_ai INTEGER DEFAULT 0 NOT NULL,
  files_uploaded_to_ai INTEGER DEFAULT 0 NOT NULL,
  ai_sessions_total INTEGER DEFAULT 0 NOT NULL,

  -- Временные метки
  last_activity_at TIMESTAMPTZ,
  last_lesson_at TIMESTAMPTZ,
  streak_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX idx_user_stats_streak ON user_stats(current_streak DESC);
CREATE INDEX idx_user_stats_level ON user_stats(level DESC);
```

**Назначение:** Основная таблица со всей статистикой студента. Используется для:
- Карточек статистики в NeuroHub
- Расчета уровня и XP
- Подсчета streak
- Контекста для AI (сколько уроков прошёл, какой уровень)

---

#### `user_progress` - Детальный прогресс по урокам
```sql
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

  -- Статус урока
  status TEXT DEFAULT 'not_started' NOT NULL
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  progress_percent INTEGER DEFAULT 0 NOT NULL
    CHECK (progress_percent >= 0 AND progress_percent <= 100),

  -- Видео прогресс
  video_current_second INTEGER DEFAULT 0,
  video_total_seconds INTEGER,
  video_watched_seconds INTEGER DEFAULT 0,

  -- Временные метки
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  time_spent_minutes INTEGER DEFAULT 0 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, lesson_id)
);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX idx_user_progress_status ON user_progress(user_id, status);
CREATE INDEX idx_user_progress_updated ON user_progress(user_id, updated_at DESC);
```

**Назначение:** Хранит детальный прогресс по каждому уроку:
- На какой секунде остановился студент
- Сколько времени потратил
- Статус завершения
- AI может видеть: "Студент застрял на уроке X"

---

#### `video_watch_sessions` - Сессии просмотра видео
```sql
CREATE TABLE IF NOT EXISTS public.video_watch_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  video_id UUID REFERENCES video_content(id) ON DELETE CASCADE,

  -- Детали сессии
  session_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,

  -- Прогресс просмотра
  start_second INTEGER DEFAULT 0,
  end_second INTEGER DEFAULT 0,
  max_second_reached INTEGER DEFAULT 0,

  -- Поведение
  pauses_count INTEGER DEFAULT 0,
  seeks_count INTEGER DEFAULT 0, -- Перемотки
  playback_speed DECIMAL(3,2) DEFAULT 1.0,

  -- Метрики вовлеченности
  engagement_score DECIMAL(3,2), -- 0-1, рассчитывается автоматически
  is_fully_watched BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_video_sessions_user_id ON video_watch_sessions(user_id);
CREATE INDEX idx_video_sessions_lesson_id ON video_watch_sessions(lesson_id);
CREATE INDEX idx_video_sessions_date ON video_watch_sessions(user_id, session_start DESC);
```

**Назначение:** Детальная аналитика просмотра видео:
- Сколько секунд посмотрел
- Как часто ставил на паузу (может быть сложный материал)
- Перематывал ли назад (повторное изучение)
- AI видит: "Студент пересматривал момент с 2:30 до 3:00 несколько раз"

---

### 2️⃣ Таблицы Gamification

#### `achievements` - Шаблоны достижений
```sql
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT PRIMARY KEY, -- 'first-lesson', 'streak-7', 'master-module-1'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji
  category TEXT NOT NULL CHECK (category IN (
    'learning', 'streak', 'mastery', 'social', 'speed', 'exploration', 'milestone'
  )),
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),

  -- Требование для разблокировки
  requirement_type TEXT NOT NULL, -- 'lessons_completed', 'streak_days', 'modules_completed'
  requirement_value INTEGER NOT NULL,
  requirement_description TEXT NOT NULL,

  -- Награда
  xp_reward INTEGER DEFAULT 0 NOT NULL,

  -- Видимость
  is_hidden BOOLEAN DEFAULT false, -- Скрытые достижения (сюрприз для студента)
  is_daily BOOLEAN DEFAULT false, -- Ежедневное достижение (x2 XP)

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Примеры достижений:**
- `first-lesson`: "Первый шаг" - Завершил первый урок (+10 XP)
- `streak-7`: "Неделя силы" - 7 дней обучения подряд (+50 XP)
- `master-module-1`: "Мастер модуля 1" - Завершил все уроки модуля 1 на 100% (+100 XP)

---

#### `user_achievements` - Достижения пользователя
```sql
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,

  -- Прогресс
  progress_current INTEGER DEFAULT 0 NOT NULL,
  progress_required INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,

  -- Временные метки
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(user_id, is_completed);
```

**Назначение:** Хранит прогресс студента по каждому достижению:
- Текущий прогресс (например, 5/10 уроков)
- Дата разблокировки
- AI видит: "До достижения 'Неделя силы' осталось 2 дня!"

---

#### `missions` - Мини-миссии (задания)
```sql
CREATE TABLE IF NOT EXISTS public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип миссии
  mission_type TEXT NOT NULL CHECK (mission_type IN (
    'complete_lessons', 'watch_videos', 'earn_xp', 'streak_days', 'homework_submit'
  )),

  -- Детали миссии
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0 NOT NULL,

  -- Награда
  xp_reward INTEGER DEFAULT 0 NOT NULL,

  -- Статус
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Миссии могут истекать

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_missions_user_id ON missions(user_id);
CREATE INDEX idx_missions_active ON missions(user_id, is_completed) WHERE is_completed = false;
CREATE INDEX idx_missions_expires ON missions(expires_at) WHERE expires_at IS NOT NULL;
```

**Примеры миссий:**
- "Пройди 2 урока сегодня" → +50 XP
- "Посмотри 3 видео" → +30 XP
- "Сдай домашку по модулю 1" → +100 XP

---

#### `weekly_goals` - Недельные цели
```sql
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип цели
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'lessons_completed', 'study_time_minutes', 'modules_completed', 'streak_maintain'
  )),

  -- Целевое значение
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0 NOT NULL,

  -- Период недели
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,

  -- Статус
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, goal_type, week_start_date)
);

CREATE INDEX idx_weekly_goals_user_id ON weekly_goals(user_id);
CREATE INDEX idx_weekly_goals_week ON weekly_goals(week_start_date, week_end_date);
CREATE INDEX idx_weekly_goals_active ON weekly_goals(user_id, is_completed) WHERE is_completed = false;
```

**Назначение:** Автоматически генерируемые недельные цели:
- "Пройди 5 уроков на этой неделе"
- "Занимайся минимум 2 часа"
- AI видит прогресс и может мотивировать

---

#### `daily_challenges` - Челленджи дня
```sql
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип челленджа
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji

  -- Награда
  xp_reward INTEGER DEFAULT 0 NOT NULL,

  -- Дата челленджа
  challenge_date DATE NOT NULL,

  -- Статус
  is_accepted BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(user_id, challenge_date)
);

CREATE INDEX idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);
CREATE INDEX idx_daily_challenges_active ON daily_challenges(user_id, is_completed)
  WHERE is_completed = false AND is_accepted = true;
```

---

### 3️⃣ Таблицы для AI-наставника

#### `curator_knowledge_base` - База знаний куратора
```sql
CREATE TABLE IF NOT EXISTS public.curator_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Категория знаний
  category TEXT NOT NULL CHECK (category IN (
    'course_faq', 'technical_help', 'motivation', 'study_tips', 'platform_guide'
  )),

  -- Содержимое
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[], -- Ключевые слова для поиска

  -- Связь с контентом
  related_course_id INTEGER REFERENCES courses(id),
  related_module_id INTEGER REFERENCES modules(id),
  related_lesson_id UUID REFERENCES lessons(id),

  -- Метаданные
  priority INTEGER DEFAULT 0, -- Приоритет при выдаче
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0, -- Сколько раз использовалась

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_knowledge_base_category ON curator_knowledge_base(category);
CREATE INDEX idx_knowledge_base_keywords ON curator_knowledge_base USING GIN (keywords);
CREATE INDEX idx_knowledge_base_active ON curator_knowledge_base(is_active) WHERE is_active = true;
```

**Назначение:** Хранит ответы куратора на типовые вопросы:
- "Как настроить вебхук в n8n?" → Подробная инструкция
- "Где получить API ключ OpenAI?" → Ссылка на урок 1
- AI использует эту базу для ответов студентам

---

#### `student_questions_log` - Лог вопросов студентов
```sql
CREATE TABLE IF NOT EXISTS public.student_questions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Вопрос студента
  question_text TEXT NOT NULL,
  question_category TEXT, -- Автоматически определяется AI

  -- Контекст вопроса
  asked_at_lesson_id UUID REFERENCES lessons(id),
  asked_at_course_id INTEGER REFERENCES courses(id),

  -- Ответ AI
  ai_response TEXT NOT NULL,
  ai_model_used TEXT DEFAULT 'gpt-4o',
  response_time_ms INTEGER,

  -- Метаданные
  openai_thread_id TEXT,
  openai_message_id TEXT,

  -- Оценка студента
  student_rating INTEGER CHECK (student_rating BETWEEN 1 AND 5),
  is_helpful BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_questions_log_user_id ON student_questions_log(user_id);
CREATE INDEX idx_questions_log_lesson ON student_questions_log(asked_at_lesson_id);
CREATE INDEX idx_questions_log_date ON student_questions_log(user_id, created_at DESC);
CREATE INDEX idx_questions_log_category ON student_questions_log(question_category);
```

**Назначение:** Логирует все вопросы студентов:
- AI анализирует популярные вопросы
- Можно выявить сложные темы
- Генерация FAQ и топ-советов

---

#### `ai_mentor_advice_log` - Лог советов от AI-наставника
```sql
CREATE TABLE IF NOT EXISTS public.ai_mentor_advice_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Тип совета
  advice_type TEXT NOT NULL CHECK (advice_type IN (
    'motivation', 'study_plan', 'achievement_tip', 'course_recommendation', 'technical_help'
  )),

  -- Содержимое
  advice_title TEXT NOT NULL,
  advice_content TEXT NOT NULL,

  -- Триггер совета
  triggered_by TEXT, -- 'low_activity', 'achievement_near', 'streak_broken'
  trigger_context JSONB, -- Дополнительные данные

  -- Метаданные
  is_shown BOOLEAN DEFAULT false,
  shown_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_advice_log_user_id ON ai_mentor_advice_log(user_id);
CREATE INDEX idx_advice_log_type ON ai_mentor_advice_log(advice_type);
CREATE INDEX idx_advice_log_shown ON ai_mentor_advice_log(user_id, is_shown);
```

**Назначение:** Хранит все советы, которые AI дал студенту:
- Мотивационные сообщения
- Рекомендации по обучению
- Можно отслеживать эффективность советов

---

### 4️⃣ Функции PostgreSQL для автоматизации

#### Функция: Обновление streak при активности
```sql
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_activity DATE;
  days_diff INTEGER;
BEGIN
  -- Получаем дату последней активности
  SELECT DATE(last_activity_at) INTO last_activity
  FROM user_stats
  WHERE user_id = NEW.user_id;

  -- Если активность была сегодня, ничего не делаем
  IF last_activity = CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  -- Считаем разницу в днях
  days_diff := CURRENT_DATE - last_activity;

  -- Обновляем streak
  IF days_diff = 1 THEN
    -- Продолжаем streak
    UPDATE user_stats
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_activity_at = NOW(),
        streak_updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF days_diff > 1 THEN
    -- Streak прерван, начинаем заново
    UPDATE user_stats
    SET current_streak = 1,
        last_activity_at = NOW(),
        streak_updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на таблицу user_progress
CREATE TRIGGER on_lesson_activity
  AFTER UPDATE ON user_progress
  FOR EACH ROW
  WHEN (NEW.last_accessed_at <> OLD.last_accessed_at)
  EXECUTE FUNCTION update_user_streak();
```

---

#### Функция: Проверка и разблокировка достижений
```sql
CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS TABLE(newly_unlocked_achievement_id TEXT, xp_earned INTEGER) AS $$
DECLARE
  v_achievement RECORD;
  v_current_value INTEGER;
  v_is_unlocked BOOLEAN;
BEGIN
  -- Получаем все активные достижения пользователя
  FOR v_achievement IN
    SELECT a.id, a.requirement_type, a.requirement_value, a.xp_reward,
           ua.progress_current, ua.is_completed
    FROM achievements a
    LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = p_user_id
    WHERE a.is_hidden = false
  LOOP
    -- Если уже разблокировано, пропускаем
    IF v_achievement.is_completed THEN
      CONTINUE;
    END IF;

    -- Получаем текущее значение метрики из user_stats
    EXECUTE format('SELECT %I FROM user_stats WHERE user_id = $1', v_achievement.requirement_type)
    INTO v_current_value
    USING p_user_id;

    -- Проверяем условие разблокировки
    IF v_current_value >= v_achievement.requirement_value THEN
      -- Разблокируем достижение
      INSERT INTO user_achievements (user_id, achievement_id, progress_current, progress_required, is_completed, unlocked_at)
      VALUES (p_user_id, v_achievement.id, v_current_value, v_achievement.requirement_value, true, NOW())
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET is_completed = true,
          unlocked_at = NOW(),
          progress_current = v_current_value;

      -- Начисляем XP
      UPDATE user_stats
      SET total_xp = total_xp + v_achievement.xp_reward,
          achievements_unlocked = achievements_unlocked + 1,
          level = 1 + FLOOR((total_xp + v_achievement.xp_reward) / 100)
      WHERE user_id = p_user_id;

      -- Возвращаем информацию о разблокированном достижении
      newly_unlocked_achievement_id := v_achievement.id;
      xp_earned := v_achievement.xp_reward;
      RETURN NEXT;
    ELSE
      -- Обновляем прогресс
      INSERT INTO user_achievements (user_id, achievement_id, progress_current, progress_required)
      VALUES (p_user_id, v_achievement.id, v_current_value, v_achievement.requirement_value)
      ON CONFLICT (user_id, achievement_id) DO UPDATE
      SET progress_current = v_current_value;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 СТРАТЕГИЯ ПОДКЛЮЧЕНИЯ ФУНКЦИОНАЛА

### Принцип работы системы:

```
События студента → Backend обработка → БД обновление → AI контекст обновлен
                 ↓
           Frontend отображает
```

### 📦 Компоненты системы:

#### 1. **Analytics Engine (Backend)**

**Расположение:** `backend/src/services/analyticsEngine.ts`

**Ответственность:**
- Обработка событий от Frontend (просмотр видео, завершение урока, отправка сообщения AI)
- Обновление таблиц аналитики (`user_stats`, `user_progress`, `video_watch_sessions`)
- Триггеринг проверки достижений
- Обновление миссий и целей

**Ключевые методы:**
```typescript
class AnalyticsEngine {
  // Обработка события "студент посмотрел видео"
  async trackVideoWatchSession(params: {
    userId: string;
    lessonId: string;
    videoId: string;
    startSecond: number;
    endSecond: number;
    duration: number;
    pausesCount: number;
    seeksCount: number;
  }): Promise<void>

  // Обработка события "студент завершил урок"
  async trackLessonCompletion(params: {
    userId: string;
    lessonId: string;
    timeSpentMinutes: number;
  }): Promise<void>

  // Обработка события "студент отправил сообщение AI"
  async trackAIInteraction(params: {
    userId: string;
    questionText: string;
    aiResponse: string;
    lessonId?: string;
  }): Promise<void>

  // Обновление всех метрик студента
  async updateUserStats(userId: string): Promise<void>

  // Проверка и разблокировка достижений
  async checkAchievements(userId: string): Promise<AchievementUnlocked[]>
}
```

---

#### 2. **AI Context Builder (Backend)**

**Расположение:** `backend/src/services/aiContextBuilder.ts`

**Ответственность:**
- Сбор ВСЕХ данных о студенте из БД
- Формирование контекста для OpenAI
- Инжектирование базы знаний куратора
- Персонализация instructions для Assistant

**Ключевые методы:**
```typescript
class AIContextBuilder {
  // Получить полный контекст студента
  async buildStudentContext(userId: string): Promise<StudentContext>

  // Получить релевантные знания из базы куратора
  async getRelevantKnowledge(query: string, lessonId?: string): Promise<KnowledgeBaseEntry[]>

  // Сформировать instructions для OpenAI Assistant
  async buildAssistantInstructions(userId: string, assistantType: 'curator' | 'mentor' | 'analyst'): Promise<string>

  // Получить последние вопросы студента для анализа
  async getRecentQuestions(userId: string, limit: number): Promise<Question[]>
}

interface StudentContext {
  // Личные данные
  personal: {
    fullName: string;
    email: string;
    registeredAt: Date;
  };

  // Прогресс обучения
  learning: {
    currentCourse: string;
    currentModule: string;
    currentLesson: string;
    lessonsCompleted: number;
    totalLessons: number;
    courseProgress: number; // %
    timeSpentMinutes: number;
  };

  // Gamification
  gamification: {
    level: number;
    totalXP: number;
    currentStreak: number;
    longestStreak: number;
    achievementsUnlocked: number;
    recentAchievements: Achievement[];
  };

  // Активные миссии и цели
  missions: {
    activeMissions: Mission[];
    weeklyGoals: Goal[];
  };

  // Поведенческие метрики
  behavior: {
    lastActivityAt: Date;
    daysSinceLastActivity: number;
    averageSessionDuration: number;
    preferredStudyTime: string; // 'morning', 'afternoon', 'evening'
  };

  // История вопросов
  questions: {
    recentTopics: string[];
    mostAskedQuestions: string[];
    strugglingTopics: string[];
  };
}
```

**Пример использования:**
```typescript
// В OpenAI Assistant Instructions
const context = await aiContextBuilder.buildStudentContext(userId);

const instructions = `
Ты AI-наставник для студента ${context.personal.fullName}.

ТЕКУЩИЙ СТАТУС СТУДЕНТА:
- Уровень: ${context.gamification.level}
- XP: ${context.gamification.totalXP}
- Стрик: ${context.gamification.currentStreak} дней
- Прогресс курса: ${context.learning.courseProgress}%
- Уроков завершено: ${context.learning.lessonsCompleted}/${context.learning.totalLessons}

АКТИВНЫЕ МИССИИ:
${context.missions.activeMissions.map(m => `- ${m.title}: ${m.current}/${m.target}`).join('\n')}

ПОСЛЕДНИЕ ТЕМЫ ВОПРОСОВ:
${context.questions.recentTopics.join(', ')}

ИНСТРУКЦИИ:
1. Обращайся к студенту по имени
2. Персонализируй ответы на основе его прогресса
3. Если студент близок к достижению - мотивируй его
4. Если студент давно не был активен - спроси что случилось
5. Используй базу знаний для ответов на технические вопросы
`;
```

---

#### 3. **Dashboard API (Backend)**

**Расположение:** `backend/src/controllers/dashboardController.ts`

**API Endpoints:**

```typescript
// GET /api/analytics/student/:userId/dashboard
// Возвращает данные для страницы NeuroHub
router.get('/analytics/student/:userId/dashboard', async (req, res) => {
  const { userId } = req.params;

  const dashboard = {
    user_info: {
      full_name: string;
      avatar_url: string | null;
      level: number;
      xp: number;
      xp_to_next_level: number;
      current_streak: number;
      longest_streak: number;
    },

    today_stats: {
      lessons_completed: number;
      watch_time_minutes: number;
      xp_earned: number;
    },

    week_activity: Array<{
      date: string;
      lessons_completed: number;
      watch_time_minutes: number;
      xp_earned: number;
    }>,

    course_progress: {
      course_id: number;
      course_title: string;
      total_lessons: number;
      completed_lessons: number;
      progress_percent: number;
      current_lesson: {
        id: string;
        title: string;
        module_title: string;
      };
    },

    recent_achievements: Array<{
      id: string;
      title: string;
      icon: string;
      xp_reward: number;
      unlocked_at: string;
      is_new: boolean;
    }>,

    active_missions: Array<{
      id: string;
      title: string;
      description: string;
      current_value: number;
      target_value: number;
      progress_percent: number;
      xp_reward: number;
      expires_at: string | null;
    }>,

    weekly_goals: Array<{
      id: string;
      goal_type: string;
      target_value: number;
      current_value: number;
      progress_percent: number;
      days_remaining: number;
    }>,

    daily_challenge: {
      id: string;
      title: string;
      description: string;
      icon: string;
      xp_reward: number;
      is_accepted: boolean;
      is_completed: boolean;
    } | null
  };

  res.json({ success: true, data: dashboard });
});
```

---

#### 4. **Achievements API (Backend)**

**Расположение:** `backend/src/controllers/achievementsController.ts`

```typescript
// GET /api/achievements/:userId
// Возвращает все достижения пользователя (для раздела "Все достижения")
router.get('/achievements/:userId', async (req, res) => {
  const { userId } = req.params;

  const achievements = {
    week: Array<Achievement>, // Недельные достижения
    month: Array<Achievement>, // Месячные достижения
    permanent: Array<Achievement>, // Постоянные milestone

    summary: {
      total: number;
      completed: number;
      in_progress: number;
      completion_percent: number;
    }
  };

  res.json({ success: true, data: achievements });
});

// POST /api/achievements/:userId/check
// Принудительная проверка достижений (после завершения урока)
router.post('/achievements/:userId/check', async (req, res) => {
  const { userId } = req.params;

  const newlyUnlocked = await achievementsService.checkAndUnlock(userId);

  res.json({ success: true, data: newlyUnlocked });
});
```

---

#### 5. **Missions API (Backend)**

**Расположение:** `backend/src/controllers/missionsController.ts`

```typescript
// GET /api/missions/:userId
// Возвращает активные миссии пользователя
router.get('/missions/:userId', async (req, res) => {
  const { userId } = req.params;

  const missions = await missionsService.getActiveMissions(userId);

  res.json({ success: true, data: missions });
});

// POST /api/missions/:missionId/submit-homework
// Сдача домашнего задания
router.post('/missions/:missionId/submit-homework', upload.single('file'), async (req, res) => {
  const { missionId } = req.params;
  const { userId, comment } = req.body;
  const file = req.file;

  // Загружаем файл в Supabase Storage
  const fileUrl = await uploadToSupabaseStorage(file);

  // Отмечаем миссию как завершенную
  await missionsService.completeMission(missionId, userId, {
    homeworkUrl: fileUrl,
    comment
  });

  res.json({ success: true });
});

// POST /api/missions/update-progress
// Обновление прогресса миссии (вызывается автоматически при событиях)
router.post('/missions/update-progress', async (req, res) => {
  const { userId, missionType, incrementValue } = req.body;

  await missionsService.updateProgress(userId, missionType, incrementValue);

  res.json({ success: true });
});
```

---

#### 6. **Video Analytics Integration (Frontend + Backend)**

**Frontend:** При просмотре видео (страница Lesson.tsx)

```typescript
// src/pages/Lesson.tsx
import { trackVideoProgress } from '@/lib/video-analytics';

const VideoPlayer = () => {
  const [currentSecond, setCurrentSecond] = useState(0);
  const [pausesCount, setPausesCount] = useState(0);
  const [seeksCount, setSeeksCount] = useState(0);

  // Отправляем прогресс каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      trackVideoProgress({
        userId: user.id,
        lessonId,
        videoId,
        currentSecond,
        pausesCount,
        seeksCount
      });
    }, 10000); // 10 секунд

    return () => clearInterval(interval);
  }, [currentSecond]);

  // При завершении видео
  const handleVideoEnd = async () => {
    await trackVideoProgress({
      userId: user.id,
      lessonId,
      videoId,
      currentSecond: videoDuration,
      isFullyWatched: true
    });

    // Проверяем достижения
    await checkAchievements(user.id);
  };
};
```

**Backend:** Обработка прогресса видео

```typescript
// backend/src/controllers/videosController.ts
router.post('/videos/track-progress', async (req, res) => {
  const { userId, lessonId, videoId, currentSecond, pausesCount, seeksCount, isFullyWatched } = req.body;

  // Сохраняем сессию просмотра
  await db.query(`
    INSERT INTO video_watch_sessions
      (user_id, lesson_id, video_id, max_second_reached, pauses_count, seeks_count, is_fully_watched)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id, lesson_id, video_id) DO UPDATE
    SET max_second_reached = GREATEST(video_watch_sessions.max_second_reached, $4),
        pauses_count = video_watch_sessions.pauses_count + $5,
        seeks_count = video_watch_sessions.seeks_count + $6,
        is_fully_watched = $7,
        updated_at = NOW()
  `, [userId, lessonId, videoId, currentSecond, pausesCount, seeksCount, isFullyWatched]);

  // Обновляем прогресс урока
  await db.query(`
    UPDATE user_progress
    SET video_current_second = $1,
        video_watched_seconds = $2,
        last_accessed_at = NOW()
    WHERE user_id = $3 AND lesson_id = $4
  `, [currentSecond, currentSecond, userId, lessonId]);

  // Обновляем общую статистику
  await analyticsEngine.updateUserStats(userId);

  // Проверяем достижения
  if (isFullyWatched) {
    await analyticsEngine.checkAchievements(userId);
  }

  res.json({ success: true });
});
```

---

## 📅 ЭТАПЫ РАЗРАБОТКИ

### 🏁 ЭТАП 0: Подготовка (1-2 дня)

**Цель:** Применить миграции БД и настроить Backend структуру

**Задачи:**
1. ✅ Создать SQL миграции для новых таблиц
2. ✅ Применить миграции в Supabase
3. ✅ Создать seed данные для achievements (базовый набор)
4. ✅ Настроить RLS политики для новых таблиц
5. ✅ Протестировать структуру БД

**Файлы для создания:**
- `supabase/migrations/20251121_ai_mentor_analytics.sql` - Таблицы аналитики
- `supabase/migrations/20251121_ai_mentor_gamification.sql` - Таблицы gamification
- `supabase/migrations/20251121_ai_mentor_knowledge_base.sql` - Таблицы AI
- `supabase/seeds/achievements_seed.sql` - Базовый набор достижений

**Критерий завершения:**
- Все таблицы созданы в Supabase
- RLS политики работают
- Seed данные загружены

---

### 🏁 ЭТАП 1: Analytics Engine (3-4 дня)

**Цель:** Реализовать отслеживание активности студентов

**Задачи:**
1. Создать `AnalyticsEngine` класс в Backend
2. Реализовать трекинг просмотра видео
3. Реализовать трекинг завершения уроков
4. Реализовать обновление `user_stats`
5. Интегрировать с Frontend (страница Lesson.tsx)

**Файлы для создания/изменения:**
- `backend/src/services/analyticsEngine.ts` (НОВЫЙ)
- `backend/src/controllers/videosController.ts` (ОБНОВИТЬ)
- `backend/src/controllers/lessonsController.ts` (ОБНОВИТЬ)
- `src/pages/Lesson.tsx` (ОБНОВИТЬ - добавить трекинг)
- `src/lib/video-analytics.ts` (НОВЫЙ)

**API Endpoints:**
- `POST /api/videos/track-progress`
- `POST /api/lessons/:lessonId/complete`
- `GET /api/analytics/student/:userId/stats`

**Критерий завершения:**
- При просмотре видео данные сохраняются в БД
- При завершении урока обновляется прогресс
- `user_stats` автоматически обновляется
- Streak правильно рассчитывается

---

### 🏁 ЭТАП 2: Achievements System (3-4 дня)

**Цель:** Реализовать систему достижений с автоматической разблокировкой

**Задачи:**
1. Создать сервис `AchievementsService`
2. Реализовать функцию проверки достижений
3. Реализовать начисление XP
4. Создать Backend API для достижений
5. Подключить Frontend (секция "Все достижения")

**Файлы для создания/изменения:**
- `backend/src/services/achievementsService.ts` (НОВЫЙ)
- `backend/src/controllers/achievementsController.ts` (НОВЫЙ)
- `backend/src/routes/achievements.ts` (НОВЫЙ)
- `src/lib/achievements-api.ts` (ОБНОВИТЬ)
- `src/pages/NeuroHub.tsx` (ОБНОВИТЬ - подключить реальные данные)

**API Endpoints:**
- `GET /api/achievements/:userId` - Все достижения пользователя
- `POST /api/achievements/:userId/check` - Проверить достижения
- `GET /api/achievements/templates` - Шаблоны достижений

**Критерий завершения:**
- Достижения автоматически разблокируются
- XP начисляется при разблокировке
- Frontend отображает реальные данные
- Анимация разблокировки работает

---

### 🏁 ЭТАП 3: Missions & Goals (2-3 дня)

**Цель:** Реализовать систему миссий и недельных целей

**Задачи:**
1. Создать сервис `MissionsService`
2. Реализовать автоматическое обновление прогресса миссий
3. Реализовать еженедельную генерацию целей
4. Создать API для миссий
5. Подключить Frontend (карточка "Текущая миссия")

**Файлы для создания/изменения:**
- `backend/src/services/missionsService.ts` (НОВЫЙ)
- `backend/src/services/goalsService.ts` (НОВЫЙ)
- `backend/src/controllers/missionsController.ts` (ОБНОВИТЬ)
- `backend/src/controllers/goalsController.ts` (НОВЫЙ)
- `backend/src/routes/goals.ts` (ОБНОВИТЬ)
- `src/lib/missions-api.ts` (ОБНОВИТЬ)
- `src/lib/goals-api.ts` (ОБНОВИТЬ)

**API Endpoints:**
- `GET /api/missions/:userId` - Активные миссии
- `POST /api/missions/:missionId/complete` - Завершить миссию
- `POST /api/missions/:missionId/submit-homework` - Сдать ДЗ
- `GET /api/goals/weekly/:userId` - Недельные цели
- `POST /api/goals/weekly/generate` - Генерация целей (автоматически)

**Критерий завершения:**
- Миссии отображаются в Frontend
- Прогресс миссий обновляется автоматически
- Недельные цели генерируются по понедельникам
- Можно сдать домашку через модалку

---

### 🏁 ЭТАП 4: Dashboard API (2 дня)

**Цель:** Реализовать API для страницы NeuroHub

**Задачи:**
1. Создать агрегированный endpoint для dashboard
2. Оптимизировать SQL запросы (JOIN, INDEX)
3. Подключить Frontend к реальному API
4. Добавить кэширование данных

**Файлы для создания/изменения:**
- `backend/src/controllers/dashboardController.ts` (НОВЫЙ)
- `backend/src/routes/dashboard.ts` (НОВЫЙ)
- `src/lib/dashboard-api.ts` (ОБНОВИТЬ)
- `src/pages/NeuroHub.tsx` (ОБНОВИТЬ - подключить все API)

**API Endpoints:**
- `GET /api/analytics/student/:userId/dashboard` - Полный dashboard

**Критерий завершения:**
- Dashboard загружается быстро (< 500ms)
- Все карточки отображают реальные данные
- Данные обновляются в real-time (через Supabase Realtime)

---

### 🏁 ЭТАП 5: AI Context Builder (4-5 дней)

**Цель:** AI-наставник получает полный контекст о студенте

**Задачи:**
1. Создать `AIContextBuilder` класс
2. Реализовать сбор данных о студенте
3. Создать базу знаний куратора (начальный набор)
4. Интегрировать контекст с OpenAI Assistant
5. Реализовать логирование вопросов студентов

**Файлы для создания/изменения:**
- `backend/src/services/aiContextBuilder.ts` (НОВЫЙ)
- `backend/src/controllers/openaiController.ts` (ОБНОВИТЬ)
- `src/lib/openai-assistant.ts` (ОБНОВИТЬ - передавать context)
- `supabase/seeds/curator_knowledge_base_seed.sql` (НОВЫЙ)

**API Endpoints:**
- `GET /api/ai-mentor/context/:userId` - Контекст студента
- `POST /api/ai-mentor/ask` - Вопрос к AI с контекстом
- `GET /api/ai-mentor/knowledge-base/search` - Поиск в базе знаний

**Критерий завершения:**
- AI обращается к студенту по имени
- AI знает прогресс студента
- AI может отвечать на вопросы по базе знаний
- Все вопросы логируются

---

### 🏁 ЭТАП 6: Персонализированные советы (3-4 дня)

**Цель:** AI-наставник анализирует студента и дает советы

**Задачи:**
1. Реализовать анализ активности студента
2. Генерация "Топ советов по последним вопросам"
3. Автоматическая генерация мотивационных сообщений
4. Подключить Frontend (секция "Топ советов")

**Файлы для создания/изменения:**
- `backend/src/services/aiAdviceService.ts` (НОВЫЙ)
- `backend/src/controllers/adviceController.ts` (НОВЫЙ)
- `backend/src/routes/advice.ts` (НОВЫЙ)
- `src/pages/NeuroHub.tsx` (ОБНОВИТЬ - реальные советы)

**API Endpoints:**
- `GET /api/advice/:userId/top-tips` - Топ советов
- `POST /api/advice/:userId/generate` - Генерация новых советов
- `GET /api/advice/:userId/motivation` - Мотивационные сообщения

**Критерий завершения:**
- AI анализирует последние вопросы
- Советы персонализированы под студента
- Frontend отображает релевантные советы

---

### 🏁 ЭТАП 7: Уведомления и Telegram (опционально, 3-4 дня)

**Цель:** AI-наставник отправляет уведомления в Telegram

**Задачи:**
1. Интеграция с Telegram Bot API
2. Отправка мотивационных сообщений
3. Уведомления о достижениях
4. Напоминания о недельных целях

**Файлы для создания/изменения:**
- `backend/src/services/telegramMentorService.ts` (ОБНОВИТЬ)
- `backend/src/cron/dailyMotivation.ts` (НОВЫЙ)

**Критерий завершения:**
- Студенты получают мотивационные сообщения
- Уведомления о достижениях приходят в Telegram

---

## 🛠️ ТЕХНИЧЕСКИЕ ДЕТАЛИ РЕАЛИЗАЦИИ

### 1. Архитектура Backend

```
backend/
├── src/
│   ├── services/               # Бизнес-логика
│   │   ├── analyticsEngine.ts  # Обработка событий и метрик
│   │   ├── achievementsService.ts
│   │   ├── missionsService.ts
│   │   ├── goalsService.ts
│   │   ├── aiContextBuilder.ts # Контекст для AI
│   │   └── aiAdviceService.ts  # Генерация советов
│   │
│   ├── controllers/            # API контроллеры
│   │   ├── dashboardController.ts
│   │   ├── achievementsController.ts
│   │   ├── missionsController.ts
│   │   ├── goalsController.ts
│   │   └── adviceController.ts
│   │
│   ├── routes/                 # API роуты
│   │   ├── analytics.ts
│   │   ├── achievements.ts
│   │   ├── missions.ts
│   │   ├── goals.ts
│   │   ├── dashboard.ts
│   │   └── advice.ts
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── errorHandler.ts
│   │
│   ├── utils/
│   │   ├── database.ts
│   │   └── supabase.ts
│   │
│   └── server.ts
```

---

### 2. Frontend структура

```
src/
├── pages/
│   ├── NeuroHub.tsx            # Главная страница AI-наставника
│   └── Lesson.tsx              # Страница урока (с трекингом видео)
│
├── lib/
│   ├── dashboard-api.ts        # API клиент для dashboard
│   ├── achievements-api.ts     # API клиент для достижений
│   ├── missions-api.ts         # API клиент для миссий
│   ├── goals-api.ts            # API клиент для целей
│   ├── video-analytics.ts      # Трекинг видео
│   ├── openai-assistant.ts     # AI чат
│   └── supabase.ts
│
└── utils/
    └── apiClient.ts            # Базовый HTTP клиент
```

---

### 3. Ключевые SQL запросы

#### Получение полного dashboard
```sql
-- Агрегированный запрос для страницы NeuroHub
WITH user_info AS (
  SELECT
    u.id,
    u.full_name,
    u.avatar_url,
    us.level,
    us.total_xp,
    us.current_streak,
    us.longest_streak
  FROM users u
  JOIN user_stats us ON u.id = us.user_id
  WHERE u.id = $1
),
today_stats AS (
  SELECT
    COUNT(DISTINCT up.lesson_id) FILTER (WHERE up.completed_at::date = CURRENT_DATE) as lessons_completed,
    COALESCE(SUM(vws.duration_seconds) / 60, 0)::int as watch_time_minutes,
    COALESCE(SUM(ua.xp_reward), 0) as xp_earned
  FROM user_progress up
  LEFT JOIN video_watch_sessions vws ON vws.user_id = up.user_id AND vws.session_start::date = CURRENT_DATE
  LEFT JOIN user_achievements ua ON ua.user_id = up.user_id AND ua.unlocked_at::date = CURRENT_DATE
  WHERE up.user_id = $1
),
week_activity AS (
  SELECT
    DATE(up.last_accessed_at) as date,
    COUNT(DISTINCT up.lesson_id) FILTER (WHERE up.completed_at IS NOT NULL) as lessons_completed,
    COALESCE(SUM(vws.duration_seconds) / 60, 0)::int as watch_time_minutes,
    0 as xp_earned
  FROM user_progress up
  LEFT JOIN video_watch_sessions vws ON vws.user_id = up.user_id AND DATE(vws.session_start) = DATE(up.last_accessed_at)
  WHERE up.user_id = $1
    AND up.last_accessed_at >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY DATE(up.last_accessed_at)
  ORDER BY date DESC
)
SELECT
  jsonb_build_object(
    'user_info', (SELECT row_to_json(user_info.*) FROM user_info),
    'today_stats', (SELECT row_to_json(today_stats.*) FROM today_stats),
    'week_activity', (SELECT jsonb_agg(row_to_json(week_activity.*)) FROM week_activity)
  ) as dashboard;
```

---

### 4. Real-time обновления (Supabase Realtime)

**Frontend подписка на изменения:**
```typescript
// src/pages/NeuroHub.tsx
useEffect(() => {
  if (!user?.id) return;

  // Подписка на изменения user_stats
  const subscription = supabase
    .channel('user_stats_changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_stats',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('✅ user_stats updated:', payload.new);
        // Обновляем UI
        setDashboardData(prev => ({
          ...prev,
          user_info: {
            ...prev.user_info,
            level: payload.new.level,
            xp: payload.new.total_xp,
            current_streak: payload.new.current_streak
          }
        }));

        // Показываем XP popup
        if (payload.new.total_xp > payload.old.total_xp) {
          const xpEarned = payload.new.total_xp - payload.old.total_xp;
          setXpAmount(xpEarned);
          setShowXPPopup(true);
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [user?.id]);
```

---

## ⚠️ РИСКИ И ИХ МИНИМИЗАЦИЯ

### Риск 1: Производительность БД при большом количестве студентов

**Проблема:** Сложные JOIN запросы могут быть медленными

**Решение:**
- Создать индексы на всех внешних ключах
- Использовать материализованные представления для dashboard
- Кэширование часто запрашиваемых данных (Redis)
- Batch обработка событий (не записывать каждые 1 сек, а раз в 10 сек)

---

### Риск 2: AI может не знать контекст, если БД недоступна

**Проблема:** При падении БД AI не сможет получить контекст

**Решение:**
- Fallback на локальный контекст (сохраненный в localStorage)
- Кэширование контекста студента на 5 минут
- Graceful degradation: AI работает без контекста, но предупреждает

---

### Риск 3: Streak может сбрасываться неправильно

**Проблема:** Часовые пояса, летнее время

**Решение:**
- Хранить timezone студента в `profiles.timezone`
- Использовать `AT TIME ZONE` в SQL запросах
- Тестировать на разных временных зонах

---

### Риск 4: Достижения могут разблокироваться дублирующе

**Проблема:** Race condition при параллельных запросах

**Решение:**
- UNIQUE constraint на `(user_id, achievement_id)`
- ON CONFLICT DO NOTHING в INSERT
- Использовать PostgreSQL транзакции

---

### Риск 5: База знаний куратора может быть неполной

**Проблема:** AI не сможет ответить на специфичные вопросы

**Решение:**
- Постоянное пополнение базы знаний
- Анализ вопросов, на которые AI не смог ответить
- Fallback: "Я не знаю точного ответа, но попробуйте посмотреть урок X"

---

## 📝 ЧЕКЛИСТ ГОТОВНОСТИ К ЗАПУСКУ

### ✅ База данных
- [ ] Все таблицы созданы
- [ ] RLS политики настроены
- [ ] Индексы созданы
- [ ] Seed данные загружены (достижения, база знаний)
- [ ] Тестовые данные для одного студента

### ✅ Backend API
- [ ] Analytics Engine работает
- [ ] Dashboard API возвращает данные
- [ ] Achievements API работает
- [ ] Missions API работает
- [ ] AI Context Builder собирает контекст
- [ ] Все endpoints покрыты тестами

### ✅ Frontend
- [ ] NeuroHub подключен к реальному API
- [ ] Трекинг видео работает
- [ ] Достижения отображаются корректно
- [ ] Миссии и цели отображаются
- [ ] AI-чат использует контекст студента
- [ ] Real-time обновления работают

### ✅ AI-наставник
- [ ] AI обращается по имени
- [ ] AI знает прогресс студента
- [ ] AI использует базу знаний
- [ ] Вопросы логируются
- [ ] Советы персонализированы

---

## 🎯 ИТОГОВАЯ РЕКОМЕНДАЦИЯ

### Приоритет разработки (в порядке важности):

1. **ЭТАП 1: Analytics Engine** (критично) - Без этого нет данных
2. **ЭТАП 4: Dashboard API** (критично) - Чтобы Frontend мог отображать данные
3. **ЭТАП 5: AI Context Builder** (критично) - Чтобы AI стал персонализированным
4. **ЭТАП 2: Achievements System** (важно) - Gamification
5. **ЭТАП 3: Missions & Goals** (важно) - Мотивация студентов
6. **ЭТАП 6: Персонализированные советы** (улучшение)
7. **ЭТАП 7: Telegram уведомления** (опционально)

### Рекомендуемые сроки:

- **Минимально жизнеспособный продукт (MVP):** 2-3 недели (Этапы 1, 4, 5)
- **Полная версия:** 4-5 недель (все этапы)
- **С Telegram уведомлениями:** 6 недель

---

## 📞 СЛЕДУЮЩИЕ ШАГИ

1. **Согласовать стратегию** - Подтвердите, что архитектура вас устраивает
2. **Выбрать этап для старта** - Рекомендую начать с Этапа 0 (подготовка БД)
3. **Создать SQL миграции** - Я создам файлы миграций
4. **Протестировать структуру БД** - Убедимся, что все работает
5. **Начать разработку Backend** - Этап 1 (Analytics Engine)

---

**Готов к работе! Подтвердите, что стратегия вас устраивает, и начнем разработку.** 🚀
