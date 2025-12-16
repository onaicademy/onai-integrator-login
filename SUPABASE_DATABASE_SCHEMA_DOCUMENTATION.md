# 🗄️ ONAI INTEGRATOR - SUPABASE DATABASE SCHEMA

**Версия:** 2.0  
**Последнее обновление:** 14 декабря 2025  
**Тип базы данных:** PostgreSQL (Supabase)  
**Проект:** onAI Academy Learning Platform + Tripwire Course System

---

## 📋 СОДЕРЖАНИЕ

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Основные таблицы](#основные-таблицы)
3. [Модули курсов](#модули-курсов)
4. [Tripwire система](#tripwire-система)
5. [AI агенты](#ai-агенты)
6. [Лидогенерация](#лидогенерация)
7. [Геймификация](#геймификация)
8. [Безопасность (RLS)](#безопасность-rls)
9. [Индексы и производительность](#индексы-и-производительность)
10. [RPC функции](#rpc-функции)

---

## 🏗️ ОБЗОР АРХИТЕКТУРЫ

### Структура проекта

Проект состоит из **двух основных платформ**:

1. **onAI Academy** - полноценная платформа онлайн-обучения с AI-наставником
2. **Tripwire Course** - упрощенная воронка продаж с мини-курсом из 3 модулей

### Архитектурные принципы

- **90% Direct Query Builder + 10% Strategic RPC** - предпочтение прямым запросам
- **Row Level Security (RLS)** на всех таблицах
- **JSONB для гибких данных** - метаданные, настройки, аналитика
- **Триггеры для автообновления** - `updated_at` поля
- **GIN индексы для JSONB** - быстрый поиск в JSON полях
- **Composite индексы** - оптимизация частых запросов

---

## 📊 ОСНОВНЫЕ ТАБЛИЦЫ

### 1. `auth.users` (Supabase Auth)

**Назначение:** Базовая таблица аутентификации Supabase.

**Важные поля:**
- `id` (UUID) - уникальный идентификатор пользователя
- `email` (TEXT) - email для входа
- `raw_user_meta_data` (JSONB) - дополнительные данные

### 2. `public.users`

**Назначение:** Расширенная информация о пользователях.

```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN (
    'student',      -- Обычный студент
    'sales_manager', -- Менеджер по продажам
    'admin',        -- Администратор
    'curator',      -- Куратор студентов
    'tech_support'  -- Техподдержка
  )),
  telegram_chat_id BIGINT,        -- ID чата Telegram для уведомлений
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_users_role` - по роли
- `idx_users_email` - по email

**Связи:**
- → `auth.users` (CASCADE DELETE)

---

## 📚 МОДУЛИ КУРСОВ

### 3. `courses`

**Назначение:** Курсы на платформе.

```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,               -- URL обложки
  total_xp INTEGER DEFAULT 0,     -- Общее XP за курс
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. `modules`

**Назначение:** Модули внутри курса.

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,   -- Порядок модуля в курсе
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_modules_course_id` - по курсу
- `idx_modules_order` - по курсу + порядку

### 5. `lessons`

**Назначение:** Уроки внутри модулей.

```sql
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,                 -- URL видео (legacy)
  bunny_video_id TEXT,            -- ID видео в Bunny.net CDN
  duration INTEGER,               -- Длительность в секундах
  duration_minutes INTEGER,       -- Длительность в минутах
  order_index INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 10,   -- XP за прохождение
  ai_tips TEXT,                   -- AI-сгенерированные подсказки
  ai_description TEXT,            -- AI-описание урока
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_lessons_module_id` - по модулю
- `idx_lessons_order` - по модулю + порядку

### 6. `lesson_materials`

**Назначение:** Материалы к урокам (PDF, документы).

```sql
CREATE TABLE lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  display_name TEXT,              -- Человекочитаемое имя
  file_url TEXT NOT NULL,         -- URL файла
  file_size_bytes BIGINT,
  file_type TEXT,                 -- pdf, docx, zip, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. `student_progress`

**Назначение:** Прогресс студентов по урокам.

```sql
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  status TEXT DEFAULT 'not_started' CHECK (status IN (
    'not_started',
    'in_progress',
    'completed'
  )),
  xp_earned INTEGER DEFAULT 0,
  completion_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
```

**Индексы:**
- `idx_student_progress_user_id` - по пользователю
- `idx_student_progress_composite` - по пользователю + уроку
- `idx_student_progress_status` - по статусу (WHERE completed)

---

## 🎯 TRIPWIRE СИСТЕМА

**Tripwire** - упрощенная воронка продаж с мини-курсом из 3 модулей (ID: 16, 17, 18).

### 8. `tripwire_users`

**Назначение:** Студенты Tripwire курса.

```sql
CREATE TABLE tripwire_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  granted_by UUID REFERENCES auth.users(id),  -- ID Sales Manager
  manager_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  modules_completed INTEGER DEFAULT 0 CHECK (modules_completed BETWEEN 0 AND 3),
  price NUMERIC DEFAULT 5000 CHECK (price >= 0),
  welcome_email_sent BOOLEAN DEFAULT false,
  welcome_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_tripwire_users_user_id` - по пользователю
- `idx_tripwire_users_granted_by` - по менеджеру
- `idx_tripwire_users_status` - по статусу (WHERE active)
- `idx_tripwire_users_created_at` - по дате создания (DESC)

### 9. `tripwire_user_profile`

**Назначение:** Профиль студента Tripwire.

```sql
CREATE TABLE tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_modules INTEGER DEFAULT 3,
  modules_completed INTEGER DEFAULT 0 CHECK (modules_completed BETWEEN 0 AND 3),
  completion_percentage NUMERIC DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  certificate_issued BOOLEAN DEFAULT false,
  certificate_url TEXT,           -- URL сертификата
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10. `tripwire_progress`

**Назначение:** Прогресс по урокам Tripwire (упрощенный).

```sql
CREATE TABLE tripwire_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tripwire_user_id TEXT NOT NULL,  -- UUID или localStorage ID (для анонимов)
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  module_id INTEGER CHECK (module_id IN (16, 17, 18)),
  video_progress_percent INTEGER DEFAULT 0 CHECK (video_progress_percent BETWEEN 0 AND 100),
  last_position_seconds INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,  -- Честное время просмотра
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tripwire_user_id, lesson_id)
);
```

**Индексы:**
- `idx_tripwire_progress_user_id` - по пользователю
- `idx_tripwire_progress_lesson_id` - по уроку
- `idx_tripwire_progress_module_id` - по модулю
- `idx_tripwire_progress_user_lesson` - **COMPOSITE** (критичный для /complete endpoint)

### 11. `module_unlocks`

**Назначение:** Разблокировка модулей Tripwire.

```sql
CREATE TABLE module_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL CHECK (module_id IN (16, 17, 18)),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id)
);
```

### 12. `video_tracking`

**Назначение:** Честный трекинг видео с правилом 80%.

```sql
CREATE TABLE video_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL CHECK (lesson_id IN (67, 68, 69)), -- Tripwire уроки
  watched_segments JSONB DEFAULT '[]'::jsonb,  -- [{start: 10, end: 25}, ...]
  total_watched_seconds INTEGER DEFAULT 0,
  video_duration_seconds INTEGER DEFAULT 0,
  watch_percentage INTEGER DEFAULT 0 CHECK (watch_percentage BETWEEN 0 AND 100),
  last_position_seconds INTEGER DEFAULT 0,
  is_qualified_for_completion BOOLEAN DEFAULT false,  -- >= 80%
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
```

**Индексы:**
- `idx_video_tracking_user_lesson` - по пользователю + уроку
- `idx_video_tracking_segments` - **GIN индекс** для JSONB поиска

### 13. `tripwire_certificates`

**Назначение:** Сертификаты за прохождение Tripwire.

```sql
CREATE TABLE tripwire_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_url TEXT NOT NULL,  -- R2/S3 URL
  full_name TEXT NOT NULL,        -- Имя на сертификате
  issued_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 14. `sales_activity_log`

**Назначение:** Логи действий Sales Manager.

```sql
CREATE TABLE sales_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_created',
    'user_status_updated',
    'user_deleted',
    'email_sent'
  )),
  target_user_id UUID REFERENCES auth.users(id),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_sales_activity_manager_id` - по менеджеру
- `idx_sales_activity_created_at` - по дате (DESC)
- `idx_sales_activity_composite` - по менеджеру + дате
- `idx_sales_activity_details` - **GIN индекс** для JSONB

---

## 🤖 AI АГЕНТЫ

Система включает 3 AI агента:
1. **AI Curator** - ежедневная поддержка студентов
2. **AI Mentor** - персональный наставник
3. **AI Analyst** - аналитика и инсайты

### 15. `ai_curator_chats`

**Назначение:** Чаты с AI-куратором.

```sql
CREATE TABLE ai_curator_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 16. `ai_curator_messages`

**Назначение:** Сообщения в чатах с AI-куратором.

```sql
CREATE TABLE ai_curator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES ai_curator_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Анализ настроения (sentiment analysis)
  student_mood VARCHAR(50),       -- positive, neutral, negative, frustrated, confused, motivated
  mood_confidence DECIMAL(3,2),   -- 0.00 - 1.00
  mood_indicators JSONB,          -- Индикаторы настроения
  is_problem_detected BOOLEAN DEFAULT false,
  problem_type VARCHAR(100),      -- understanding, motivation, technical, personal
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_curator_messages_chat` - по чату
- `idx_curator_mood` - по настроению
- `idx_curator_problems` - по проблемам (WHERE detected)

### 17. `ai_mentor_sessions`

**Назначение:** Сессии с AI-наставником.

```sql
CREATE TABLE ai_mentor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN (
    'learning_support',   -- Помощь в обучении
    'motivation',         -- Мотивация
    'career_guidance',    -- Карьерные советы
    'progress_review',    -- Обзор прогресса
    'problem_solving'     -- Решение проблем
  )),
  context_data JSONB,             -- Достижения, прогресс, проблемы
  recommendations JSONB,          -- Рекомендации
  action_items JSONB,             -- Конкретные задачи
  follow_up_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 18. `ai_mentor_messages`

**Назначение:** Сообщения в сессиях с наставником.

```sql
CREATE TABLE ai_mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_mentor_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'mentor', 'system')),
  content TEXT NOT NULL,
  metadata JSONB,                 -- Используемые данные, источники
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 19. `ai_mentor_tasks`

**Назначение:** Задачи для AI-наставника.

```sql
CREATE TABLE ai_mentor_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN (
    'ai_curator_alert',    -- Триггер от AI-куратора
    'analyst_report',      -- Из отчёта аналитика
    'admin_request',       -- Запрос админа
    'scheduled',           -- Запланированная задача
    'student_request'      -- Запрос ученика
  )),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  context_data JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 20. `ai_analyst_reports`

**Назначение:** Аналитические отчёты AI-аналитика.

```sql
CREATE TABLE ai_analyst_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'student_progress',         -- Анализ прогресса ученика
    'ai_curator_effectiveness', -- Эффективность AI-куратора
    'learning_patterns',        -- Паттерны обучения
    'engagement_analysis',      -- Анализ вовлечённости
    'problem_areas',            -- Проблемные области
    'overall_platform'          -- Общая аналитика платформы
  )),
  target_student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  raw_data JSONB NOT NULL,         -- Исходные данные
  analysis_results JSONB NOT NULL, -- Результаты анализа
  insights JSONB,                  -- Инсайты
  recommendations JSONB,           -- Рекомендации
  metrics JSONB,                   -- Ключевые метрики
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  generated_by TEXT DEFAULT 'gpt-4o',
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 21. `ai_token_usage`

**Назначение:** Отслеживание использования токенов OpenAI.

```sql
CREATE TABLE ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,  -- ai_curator, ai_mentor, ai_analyst
  model VARCHAR(50) NOT NULL,       -- gpt-4o, gpt-3.5-turbo, whisper-1
  operation_type VARCHAR(50) NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  audio_duration_seconds INTEGER,   -- Для Whisper
  cost_usd DECIMAL(10, 6) NOT NULL,
  cost_kzt DECIMAL(10, 2),          -- В тенге (автоматически)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thread_id UUID,                   -- ID диалога/сессии
  request_id TEXT,                  -- Уникальный ID запроса для дебага
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE
);
```

**Индексы:**
- `idx_token_usage_agent` - по агенту
- `idx_token_usage_model` - по модели
- `idx_token_usage_date` - по дате (DESC)
- `idx_token_usage_user` - по пользователю (WHERE NOT NULL)
- `idx_token_usage_created` - по времени создания (DESC)

### 22. `ai_token_usage_daily`

**Назначение:** Дневная агрегация токенов (для дашборда).

```sql
CREATE TABLE ai_token_usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- По агентам
  curator_tokens INTEGER DEFAULT 0,
  curator_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  mentor_tokens INTEGER DEFAULT 0,
  mentor_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  analyst_tokens INTEGER DEFAULT 0,
  analyst_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  -- По моделям
  gpt4o_tokens INTEGER DEFAULT 0,
  gpt4o_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  gpt35_tokens INTEGER DEFAULT 0,
  gpt35_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  whisper_minutes DECIMAL(10, 2) DEFAULT 0,
  whisper_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  -- Общие метрики
  total_tokens INTEGER DEFAULT 0,
  total_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 23. `ai_budget_limits`

**Назначение:** Лимиты и бюджет на AI агенты.

```sql
CREATE TABLE ai_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_limit_kzt DECIMAL(10, 2) DEFAULT 5000,      -- 5000 KZT в день
  monthly_limit_kzt DECIMAL(10, 2) DEFAULT 100000,  -- 100,000 KZT в месяц
  alert_threshold_percentage INTEGER DEFAULT 80,    -- При 80% лимита
  alert_enabled BOOLEAN DEFAULT true,
  alert_contacts JSONB,                             -- Email/Telegram для алертов
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 ЛИДОГЕНЕРАЦИЯ

Система сбора лидов с лендинга и отслеживания их пути (journey).

### 24. `landing_leads`

**Назначение:** Лиды с лендинга /twland и профтестов.

```sql
CREATE TABLE landing_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_normalized TEXT,          -- Нормализованный номер для дедупликации
  source TEXT DEFAULT 'twland',   -- twland, proftest_arystan, proftest_kenesary, expresscourse
  
  -- AmoCRM интеграция
  amocrm_lead_id TEXT,
  amocrm_contact_id TEXT,
  amocrm_synced BOOLEAN DEFAULT FALSE,
  
  -- Email/SMS маркетинг
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  email_clicked BOOLEAN DEFAULT FALSE,
  email_clicked_at TIMESTAMPTZ,
  sms_clicked BOOLEAN DEFAULT FALSE,
  sms_clicked_at TIMESTAMPTZ,
  click_count INTEGER DEFAULT 0,
  
  metadata JSONB DEFAULT '{}'::jsonb, -- UTM параметры, device info, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `landing_leads_email_idx` - по email
- `landing_leads_phone_normalized_idx` - по нормализованному телефону
- `landing_leads_created_at_idx` - по дате (DESC)
- `landing_leads_amocrm_synced_idx` - по статусу синхронизации

### 25. `lead_journey` / `journey_stages`

**Назначение:** Отслеживание пути лида (профтест → экспресс-курс → оплата).

```sql
CREATE TABLE lead_journey (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES landing_leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,  -- proftest_submitted, expresscourse_clicked, expresscourse_submitted, payment_kaspi, payment_card, payment_manager
  source TEXT,          -- proftest_arystan, proftest_kenesary, expresscourse
  metadata JSONB DEFAULT '{}'::jsonb,  -- Ответы на профтест, UTM, платежные данные
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `lead_journey_lead_id_idx` - по лиду
- `lead_journey_stage_idx` - по стадии
- `lead_journey_created_at_idx` - по дате (DESC)

### 26. `leads_with_journey` (VIEW)

**Назначение:** Комбинированное представление лидов с их путешествием.

```sql
CREATE VIEW leads_with_journey AS
SELECT 
  ll.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', js.id,
        'stage', js.stage,
        'source', js.source,
        'metadata', js.metadata,
        'created_at', js.created_at
      ) ORDER BY js.created_at ASC
    ) FILTER (WHERE js.id IS NOT NULL),
    '[]'::json
  ) as journey_stages
FROM landing_leads ll
LEFT JOIN journey_stages js ON ll.id = js.lead_id
GROUP BY ll.id
ORDER BY ll.created_at DESC;
```

### 27. `scheduled_notifications`

**Назначение:** Запланированные уведомления для лидов.

```sql
CREATE TABLE scheduled_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES landing_leads(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'email',
    'sms',
    'whatsapp'
  )),
  scheduled_for TIMESTAMPTZ NOT NULL,
  template_id TEXT,               -- ID шаблона письма/SMS
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🏆 ГЕЙМИФИКАЦИЯ

### 28. `achievements`

**Назначение:** Базовые достижения платформы.

```sql
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,                      -- Иконка (emoji или Iconify icon)
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  xp_requirement INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 29. `user_achievements`

**Назначение:** Достижения пользователей.

```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,   -- first_module_complete, second_module_complete, etc.
  current_value INTEGER DEFAULT 0,
  required_value INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
```

### 30. `goal_achievements`

**Назначение:** Достижения за выполнение целей.

```sql
CREATE TABLE goal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'goals_completed',
    'goals_weekly',
    'goals_streak',
    'goals_priority_high',
    'goals_before_deadline'
  )),
  condition_value INTEGER NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  rarity TEXT CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 31. `user_goals`

**Назначение:** Личные цели студентов.

```sql
CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  ai_analyzed BOOLEAN DEFAULT FALSE,
  ai_feedback JSONB
);
```

**Индексы:**
- `idx_user_goals_user_id` - по пользователю
- `idx_user_goals_status` - по статусу
- `idx_user_goals_completed_at` - по дате завершения
- `idx_user_goals_due_date` - по дедлайну

### 32. `weekly_goal_reports`

**Назначение:** Еженедельные отчёты по целям.

```sql
CREATE TABLE weekly_goal_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  goals_created INTEGER NOT NULL DEFAULT 0,
  goals_completed INTEGER NOT NULL DEFAULT 0,
  goals_in_progress INTEGER NOT NULL DEFAULT 0,
  goals_overdue INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  achievements_unlocked JSONB DEFAULT '[]'::jsonb,
  ai_productivity_score DECIMAL(3,2),
  ai_feedback TEXT,
  ai_recommendations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start)
);
```

### 33. `user_statistics`

**Назначение:** Общая статистика пользователя.

```sql
CREATE TABLE user_statistics (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  lessons_completed INTEGER DEFAULT 0 CHECK (lessons_completed >= 0),
  total_time_spent INTEGER DEFAULT 0 CHECK (total_time_spent >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 34. `user_activity`

**Назначение:** Логи активности пользователей.

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  page TEXT,
  action TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Индексы:**
- `idx_activity_user_id` - по пользователю
- `idx_activity_created_at` - по дате (DESC)

---

## 🔒 БЕЗОПАСНОСТЬ (RLS)

### Row Level Security Policies

**Все таблицы** имеют включенный RLS (`ENABLE ROW LEVEL SECURITY`).

#### Основные паттерны политик:

**1. Студенты видят только свои данные:**
```sql
CREATE POLICY "Users can view own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

**2. Админы видят всё:**
```sql
CREATE POLICY "Admins can view all"
  ON table_name FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'curator')
    )
  );
```

**3. Публичный доступ для чтения:**
```sql
CREATE POLICY "All users can read"
  ON table_name FOR SELECT
  USING (true);
```

**4. Service role полный доступ:**
```sql
CREATE POLICY "Service role full access"
  ON table_name FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

**5. Анонимы могут только вставлять (лендинг):**
```sql
CREATE POLICY "Allow anon to insert"
  ON landing_leads FOR INSERT
  TO anon
  WITH CHECK (true);
```

#### Критичные таблицы с RLS:

- ✅ `users` - пользователи видят только себя
- ✅ `student_progress` - только свой прогресс
- ✅ `tripwire_users` - Sales Manager видят только своих студентов
- ✅ `tripwire_progress` - только свой прогресс
- ✅ `video_tracking` - только свои данные
- ✅ `ai_curator_chats` - только свои чаты
- ✅ `ai_mentor_sessions` - только свои сессии
- ✅ `ai_token_usage` - **ТОЛЬКО админы** (финансовые данные)
- ✅ `landing_leads` - Service role + anon insert
- ✅ `user_goals` - только свои цели
- ✅ `user_achievements` - только свои достижения

**Публичный доступ (без ограничений):**
- ✅ `courses` - все могут читать
- ✅ `modules` - все могут читать
- ✅ `lessons` - все могут читать
- ✅ `lesson_materials` - все могут читать
- ✅ `achievements` - все могут читать

---

## ⚡ ИНДЕКСЫ И ПРОИЗВОДИТЕЛЬНОСТЬ

### Критически важные индексы

**1. Composite индексы для JOIN'ов:**
```sql
CREATE INDEX idx_tripwire_progress_user_lesson ON tripwire_progress(tripwire_user_id, lesson_id);
CREATE INDEX idx_student_progress_composite ON student_progress(user_id, lesson_id);
CREATE INDEX idx_module_unlocks_composite ON module_unlocks(user_id, module_id);
```

**2. GIN индексы для JSONB:**
```sql
CREATE INDEX idx_video_tracking_segments ON video_tracking USING GIN (watched_segments jsonb_path_ops);
CREATE INDEX idx_sales_activity_details ON sales_activity_log USING GIN (details jsonb_path_ops);
```

**3. Partial индексы для активных записей:**
```sql
CREATE INDEX idx_tripwire_users_status ON tripwire_users(status) WHERE status = 'active';
CREATE INDEX idx_student_progress_status ON student_progress(user_id, status) WHERE status = 'completed';
```

**4. Индексы по датам (DESC для последних):**
```sql
CREATE INDEX idx_tripwire_users_created_at ON tripwire_users(created_at DESC);
CREATE INDEX idx_sales_activity_created_at ON sales_activity_log(created_at DESC);
CREATE INDEX idx_token_usage_date ON ai_token_usage(date DESC);
```

### Ожидаемая производительность

**ДО добавления индексов:**
- Query time: 200-400ms
- Scan type: Sequential Scan (проверяет ВСЕ строки)

**ПОСЛЕ добавления индексов:**
- Query time: 20-50ms (10x faster! ⚡)
- Scan type: Index Scan (проверяет только нужные строки)

### Проверка использования индексов

```sql
EXPLAIN ANALYZE 
SELECT * FROM tripwire_progress 
WHERE tripwire_user_id = '00000000-0000-0000-0000-000000000000' 
LIMIT 10;
```

Если видите "**Index Scan using idx_tripwire_progress_user_id**" - ✅ работает!  
Если видите "**Seq Scan on tripwire_progress**" - ❌ индекс не используется.

---

## 🔧 RPC ФУНКЦИИ

### Статистические функции (для дашбордов)

#### 1. `rpc_get_sales_leaderboard`
**Назначение:** Топ Sales Managers по количеству студентов.

```sql
SELECT * FROM rpc_get_sales_leaderboard(10);
```

**Возвращает:**
- `manager_id`, `manager_name`, `email`
- `total_students`, `active_students`, `completed_students`
- `total_revenue`, `avg_completion_rate`

#### 2. `rpc_get_sales_chart_data`
**Назначение:** Продажи по датам для графика.

```sql
SELECT * FROM rpc_get_sales_chart_data(
  manager_id_param := 'uuid-here',
  days_back := 30
);
```

**Возвращает:**
- `date`, `students_created`, `revenue`

#### 3. `rpc_get_manager_stats`
**Назначение:** Общая статистика для Sales Manager.

```sql
SELECT * FROM rpc_get_manager_stats('uuid-here');
```

**Возвращает:**
- `total_students`, `active_students`, `completed_students`
- `total_revenue`, `avg_completion_rate`
- `students_this_month`, `revenue_this_month`

#### 4. `rpc_get_manager_activity`
**Назначение:** Последние действия менеджера.

```sql
SELECT * FROM rpc_get_manager_activity(
  manager_id_param := 'uuid-here',
  limit_count := 50
);
```

**Возвращает:**
- `id`, `action_type`, `target_user_id`
- `target_user_email`, `target_user_name`
- `details`, `created_at`

#### 5. `rpc_check_video_qualification`
**Назначение:** Проверка, посмотрел ли студент >= 80% видео.

```sql
SELECT rpc_check_video_qualification(
  user_id_param := 'uuid-here',
  lesson_id_param := 67
);
```

**Возвращает:** BOOLEAN

### Утилитарные функции

#### 6. `log_token_usage`
**Назначение:** Логирование использования токенов OpenAI.

```sql
SELECT log_token_usage(
  p_agent_type := 'ai_curator',
  p_model := 'gpt-4o',
  p_operation_type := 'text_message',
  p_prompt_tokens := 150,
  p_completion_tokens := 300,
  p_user_id := 'uuid-here',
  p_thread_id := 'uuid-here'
);
```

**Возвращает:** UUID записи в `ai_token_usage`

#### 7. `update_daily_aggregation`
**Назначение:** Обновление дневной агрегации токенов.

```sql
SELECT update_daily_aggregation(CURRENT_DATE);
```

#### 8. `check_budget_limits`
**Назначение:** Проверка лимитов и алерты.

```sql
SELECT * FROM check_budget_limits();
```

**Возвращает:**
- `limit_exceeded` (BOOLEAN)
- `current_daily_kzt`, `current_monthly_kzt`
- `daily_limit_kzt`, `monthly_limit_kzt`
- `alert_message` (TEXT)

#### 9. `find_or_create_unified_lead`
**Назначение:** Найти существующий лид или создать новый (дедупликация).

```sql
SELECT find_or_create_unified_lead(
  p_email := 'test@example.com',
  p_name := 'Иван Иванов',
  p_phone := '+7 (777) 123-45-67',
  p_source := 'proftest_arystan',
  p_metadata := '{"utm_source": "google"}'::jsonb
);
```

**Возвращает:** UUID лида (существующего или нового)

#### 10. `normalize_phone`
**Назначение:** Нормализация телефонного номера (удаление пробелов, скобок, дефисов).

```sql
SELECT normalize_phone('+7 (777) 123-45-67');
-- Вернёт: +77771234567
```

#### 11. `analyze_user_goals`
**Назначение:** Анализ целей пользователя (AI feedback).

```sql
SELECT analyze_user_goals('uuid-here');
```

**Возвращает:** JSONB с аналитикой целей

### Триггерные функции

#### 12. `update_updated_at_column`
**Назначение:** Автообновление `updated_at` поля.

Применяется ко всем таблицам с триггером:
```sql
CREATE TRIGGER update_table_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 13. `pgrst_watch`
**Назначение:** Автоматический reload схемы PostgREST после DDL команд.

```sql
CREATE EVENT TRIGGER pgrst_watch
ON ddl_command_end
EXECUTE FUNCTION pgrst_watch();
```

---

## 📊 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ

### Стоимость OpenAI токенов

**GPT-4o:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**GPT-3.5-turbo:**
- Input: $0.50 per 1M tokens
- Output: $1.50 per 1M tokens

**Whisper-1:**
- $0.006 per minute

**Курс:** 1 USD = 450 KZT (в функции `log_token_usage`)

### Tripwire модули и уроки

**Модули Tripwire:** 16, 17, 18  
**Уроки Tripwire:** 67, 68, 69

**Правило завершения видео:** >= 80% просмотрено

### Лимиты по умолчанию

**AI Budget:**
- Дневной лимит: 5,000 KZT
- Месячный лимит: 100,000 KZT
- Алерт при: 80% использования

### Связи между основными сущностями

```
auth.users (Supabase Auth)
    ↓
public.users (Extended User Info)
    ├─→ tripwire_users (Tripwire Students)
    │   └─→ tripwire_progress (Lesson Progress)
    │   └─→ video_tracking (Video Tracking)
    │   └─→ module_unlocks (Module Access)
    │
    ├─→ student_progress (Course Progress)
    ├─→ user_goals (Personal Goals)
    ├─→ user_achievements (Achievements)
    ├─→ ai_curator_chats (AI Curator)
    │   └─→ ai_curator_messages
    │
    ├─→ ai_mentor_sessions (AI Mentor)
    │   └─→ ai_mentor_messages
    │
    └─→ ai_analyst_reports (AI Analyst)

courses
    ├─→ modules
    │   └─→ lessons
    │       └─→ lesson_materials

landing_leads (Lead Generation)
    └─→ lead_journey (Journey Tracking)
    └─→ scheduled_notifications
```

---

## 🚀 МИГРАЦИИ И РАЗВЕРТЫВАНИЕ

### Основные миграции (в порядке применения)

1. `0001_init_FIXED.sql` - базовые таблицы
2. `20251205000000_tripwire_direct_db_v2.sql` - Tripwire система
3. `20250108_create_landing_leads.sql` - лидогенерация
4. `20250114_create_lead_journey.sql` - journey tracking
5. `20250118_ai_mentor_and_analyst.sql` - AI агенты
6. `20250109_token_usage_tracking.sql` - отслеживание токенов
7. `20251122_user_goals_system_clean.sql` - система целей
8. `20251214_performance_indexes.sql` - критичные индексы

### Порядок применения в Supabase

1. Открыть **Supabase Dashboard**
2. Выбрать проект
3. **SQL Editor** → New Query
4. Скопировать миграцию
5. **Run**
6. Проверить результат

### Проверка после миграции

```sql
-- Проверка таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Проверка индексов
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Проверка RLS
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Проверка функций
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

---

## 📞 КОНТАКТЫ И ПОДДЕРЖКА

**Проект:** onAI Integrator Login  
**База данных:** Supabase PostgreSQL  
**Версия схемы:** 2.0  
**Дата обновления:** 14 декабря 2025

**Документация создана для передачи архитектору проекта.**

---

## ✅ ЧЕКЛИСТ ДЛЯ АРХИТЕКТОРА

- [ ] Изучить общую структуру базы данных
- [ ] Понять связи между таблицами
- [ ] Проверить политики RLS
- [ ] Изучить индексы и их назначение
- [ ] Понять логику работы RPC функций
- [ ] Изучить систему AI агентов
- [ ] Понять воронку Tripwire
- [ ] Изучить систему отслеживания лидов
- [ ] Проверить миграции
- [ ] Настроить бэкапы базы данных

---

**Конец документации**






