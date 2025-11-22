# 📊 **БАЗА ДАННЫХ ДЛЯ AI-НАСТАВНИКА (NeuroHub)**

## 📅 **Дата:** 21 ноября 2025

---

## 🎯 **ИТОГО: СКОЛЬКО ТАБЛИЦ ДЛЯ AI-НАСТАВНИКА?**

### **Основные таблицы AI-Наставника:**
```
📊 ВСЕГО: 18 таблиц

Разбивка по категориям:
- 🤖 AI Система:         8 таблиц
- 📈 Аналитика/Метрики:  4 таблицы
- 🎮 Геймификация:       4 таблицы
- 👤 Пользователи:       2 таблицы
```

---

## 📦 **ДЕТАЛЬНАЯ СТРУКТУРА БАЗЫ ДАННЫХ:**

### **1️⃣ AI СИСТЕМА (8 таблиц)**

#### **a) `ai_chat_history`** - История чата с AI-куратором
```sql
Колонки:
- id (UUID)
- user_id (UUID) → связь с auth.users
- thread_id (TEXT) → OpenAI thread ID
- role (TEXT) → 'user' | 'assistant' | 'system'
- content (TEXT) → текст сообщения
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```
**Назначение:** Хранит всю переписку студентов с AI-куратором

---

#### **b) `ai_mentor_sessions`** - Сессии AI-наставника
```sql
Колонки:
- id (UUID)
- student_id (UUID) → кто начал сессию
- session_type (TEXT) → 'learning_support', 'motivation', 'career_guidance', etc
- context_data (JSONB) → достижения, прогресс, проблемы
- recommendations (JSONB) → рекомендации наставника
- action_items (JSONB) → конкретные задачи
- status (TEXT) → 'active', 'completed', 'cancelled'
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```
**Назначение:** Отдельные сессии AI-наставника с учениками (консультации, обзор прогресса)

---

#### **c) `ai_mentor_messages`** - Сообщения в сессиях AI-наставника
```sql
Колонки:
- id (UUID)
- session_id (UUID) → связь с ai_mentor_sessions
- role (TEXT) → 'user', 'mentor', 'system'
- content (TEXT) → текст сообщения
- metadata (JSONB) → использованные данные, источники
- created_at (TIMESTAMP)
```
**Назначение:** Хранит переписку внутри сессий AI-наставника

---

#### **d) `ai_mentor_tasks`** - Задачи для AI-наставника
```sql
Колонки:
- id (UUID)
- triggered_by (TEXT) → 'ai_curator_alert', 'analyst_report', 'admin_request', etc
- student_id (UUID) → для кого задача
- task_type (TEXT) → тип задачи
- description (TEXT)
- priority (TEXT) → 'low', 'medium', 'high', 'urgent'
- context_data (JSONB)
- status (TEXT) → 'pending', 'in_progress', 'completed', 'cancelled'
- result (JSONB)
- created_at (TIMESTAMP)
```
**Назначение:** Задачи которые триггерятся автоматически (например, если студент грустный → создать задачу)

---

#### **e) `ai_analyst_reports`** - Отчёты AI-аналитика
```sql
Колонки:
- id (UUID)
- report_type (TEXT) → 'student_progress', 'ai_curator_effectiveness', 'learning_patterns', etc
- target_student_id (UUID) → для кого отчёт (NULL = общая аналитика)
- period_start (TIMESTAMP)
- period_end (TIMESTAMP)
- raw_data (JSONB) → исходные данные
- analysis_results (JSONB) → результаты анализа
- insights (JSONB) → инсайты
- recommendations (JSONB) → рекомендации
- metrics (JSONB) → ключевые метрики
- status (TEXT) → 'processing', 'completed', 'failed'
- generated_by (TEXT) → 'gpt-4o'
- processing_time_ms (INTEGER)
- created_at (TIMESTAMP)
```
**Назначение:** Автоматические отчёты AI-аналитика о студентах и платформе

---

#### **f) `ai_analytics_metrics`** - Метрики AI-аналитика
```sql
Колонки:
- id (SERIAL)
- user_id (UUID)
- metric_type (VARCHAR) → 'daily_progress', 'weekly_summary', 'study_streak'
- metric_data (JSONB)
- created_at (TIMESTAMP)
```
**Назначение:** Метрики для AI-аналитики прогресса студентов

---

#### **g) `bot_conflicts`** - Конфликты AI-бота
```sql
Колонки:
- id (SERIAL)
- student_id (UUID)
- conversation_id (TEXT)
- question (TEXT) → вопрос студента
- bot_answer (TEXT) → ответ бота
- conflict_type (TEXT) → 'INCORRECT_ANSWER', 'HALLUCINATION', 'MISUNDERSTOOD_QUESTION'
- confidence_score (DECIMAL)
- resolution_status (TEXT) → 'pending', 'reviewed', 'resolved'
- admin_notes (TEXT)
- created_at (TIMESTAMP)
```
**Назначение:** Отслеживание проблемных ответов AI-куратора

---

#### **h) `file_uploads`** - Загруженные файлы (для AI)
```sql
Колонки:
- id (SERIAL)
- user_id (UUID)
- thread_id (TEXT) → OpenAI thread
- filename (VARCHAR)
- file_path (TEXT)
- file_url (TEXT)
- file_size (INTEGER)
- file_type (VARCHAR) → 'application/pdf', 'image/png', etc
- extracted_text (TEXT) → текст из PDF/DOCX
- processing_status (TEXT) → 'pending', 'completed', 'failed'
- error_message (TEXT)
- created_at (TIMESTAMP)
```
**Назначение:** Файлы прикреплённые в чате с AI-куратором

---

### **2️⃣ АНАЛИТИКА/МЕТРИКИ (4 таблицы)**

#### **a) `mood_tracking`** - Отслеживание настроения
```sql
Колонки:
- id (UUID)
- user_id (UUID)
- mood_level (INTEGER) → 1-5 (очень плохо → отлично)
- mood_emoji (TEXT) → 😢, 😐, 😊, 😄, 🤩
- comment (TEXT) → необязательный комментарий
- created_at (TIMESTAMP)
```
**Назначение:** Студенты отмечают своё настроение каждый день

---

#### **b) `student_rankings`** - Рейтинг студентов
```sql
Колонки:
- id (SERIAL)
- user_id (UUID) UNIQUE
- total_completed_lessons (INTEGER)
- total_xp (INTEGER)
- streak_days (INTEGER) → дни подряд с активностью
- rank_position (INTEGER) → место в рейтинге
- percentile (DECIMAL) → процентиль (топ 10%, топ 50%, etc)
- last_updated (TIMESTAMP)
```
**Назначение:** Рейтинг студентов по прогрессу и активности

---

#### **c) `student_progress`** - Прогресс по урокам
```sql
Колонки:
- id (UUID)
- user_id (UUID)
- lesson_id (INTEGER)
- module_id (INTEGER)
- course_id (INTEGER)
- started_at (TIMESTAMP)
- completed (BOOLEAN)
- completed_at (TIMESTAMP)
- watch_time_seconds (INTEGER)
- xp_earned (INTEGER)
- created_at (TIMESTAMP)
```
**Назначение:** Отслеживание прогресса студентов по урокам

---

#### **d) `video_analytics`** - Аналитика просмотров видео
```sql
Колонки:
- id (UUID)
- user_id (UUID)
- lesson_id (INTEGER)
- video_url (TEXT)
- watch_duration_seconds (INTEGER)
- completion_percentage (DECIMAL)
- paused_at_timestamps (JSONB) → где студент ставил на паузу
- rewatched_segments (JSONB)
- playback_speed (DECIMAL) → 0.5x, 1x, 1.5x, 2x
- created_at (TIMESTAMP)
```
**Назначение:** Детальная аналитика просмотра видео-уроков

---

### **3️⃣ ГЕЙМИФИКАЦИЯ (4 таблицы)**

#### **a) `user_achievements`** - Достижения пользователей
```sql
Колонки:
- id (UUID)
- user_id (UUID)
- achievement_id (TEXT) → 'first_lesson', 'speed_demon', etc
- current_value (INTEGER) → текущий прогресс
- required_value (INTEGER) → цель
- is_completed (BOOLEAN)
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```
**Назначение:** Прогресс по достижениям

---

#### **b) `achievement_history`** - История разблокированных достижений
```sql
Колонки:
- id (UUID)
- user_id (UUID)
- achievement_id (TEXT)
- xp_earned (INTEGER) → сколько XP получено
- notification_seen (BOOLEAN)
- unlocked_at (TIMESTAMP)
```
**Назначение:** Лог всех разблокированных достижений (для уведомлений)

---

#### **c) `user_statistics`** - Статистика пользователя
```sql
Колонки:
- user_id (UUID) PRIMARY KEY
- lessons_completed (INTEGER)
- modules_completed (INTEGER)
- courses_completed (INTEGER)
- perfect_lessons (INTEGER)
- current_streak (INTEGER)
- longest_streak (INTEGER)
- total_xp (INTEGER)
- current_level (INTEGER)
- messages_sent (INTEGER)
- ai_conversations (INTEGER)
- speed_lessons (INTEGER)
- early_bird_count (INTEGER) → уроки до 8:00
- night_owl_count (INTEGER) → уроки после 23:00
- ... ещё 20+ метрик
```
**Назначение:** Агрегированная статистика для расчёта достижений и рейтингов

---

#### **d) `user_goals`** - Цели пользователей
```sql
Колонки:
- id (UUID)
- user_id (UUID)
- goal_text (TEXT) → "Пройти 3 урока на этой неделе"
- goal_type (TEXT) → 'daily', 'weekly', 'monthly', 'custom'
- target_value (INTEGER)
- current_value (INTEGER)
- is_completed (BOOLEAN)
- deadline (TIMESTAMP)
- created_at (TIMESTAMP)
```
**Назначение:** Персональные цели студентов (показываются в NeuroHub)

---

### **4️⃣ ПОЛЬЗОВАТЕЛЬСКИЕ ДАННЫЕ (2 таблицы)**

#### **a) `users`** - Пользователи (из auth.users)
```sql
Основные колонки:
- id (UUID)
- email (TEXT)
- full_name (TEXT)
- avatar_url (TEXT)
- role (TEXT) → 'student', 'admin', 'tech_specialist'
- created_at (TIMESTAMP)
```
**Назначение:** Базовая информация о пользователях

---

#### **b) `student_profiles`** - Расширенные профили студентов
```sql
Колонки:
- id (UUID) → связь с users
- telegram_chat_id (TEXT)
- onboarding_completed (BOOLEAN)
- invited_at (TIMESTAMP)
- last_login_at (TIMESTAMP)
- account_status (TEXT) → 'active', 'suspended', 'expired'
- expiration_date (TIMESTAMP)
- ... дополнительные поля
```
**Назначение:** Дополнительная информация о студентах

---

## 🔗 **СВЯЗИ МЕЖДУ ТАБЛИЦАМИ:**

```
users (студенты)
  └─→ ai_chat_history (чат с AI)
  └─→ ai_mentor_sessions (сессии наставника)
  └─→ ai_mentor_tasks (задачи)
  └─→ mood_tracking (настроение)
  └─→ student_progress (прогресс по урокам)
  └─→ user_achievements (достижения)
  └─→ user_statistics (статистика)
  └─→ user_goals (цели)
  └─→ student_rankings (рейтинг)

ai_mentor_sessions
  └─→ ai_mentor_messages (сообщения в сессии)

lessons
  └─→ student_progress (прогресс)
  └─→ video_analytics (аналитика видео)
```

---

## 📊 **РАЗМЕР ДАННЫХ (Примерно):**

### **Для 1 студента за 1 месяц:**

```
ai_chat_history:        ~100 записей (2-3 сообщения в день)
mood_tracking:          ~30 записей (ежедневно)
student_progress:       ~20 записей (20 уроков)
video_analytics:        ~20 записей
user_achievements:      ~10 записей (прогресс по достижениям)
achievement_history:    ~3 записи (новые достижения)
user_statistics:        1 запись (обновляется)
student_rankings:       1 запись (обновляется)

ИТОГО: ~185 записей в месяц на студента
```

### **Для 1000 студентов:**
```
~185,000 записей в месяц
~2.2 миллиона записей в год
```

---

## 🔍 **КЛЮЧЕВЫЕ SQL ФУНКЦИИ:**

### **Для AI-Наставника:**

1. **`get_student_progress_stats(user_id)`**
   - Возвращает: прогресс, XP, рейтинг, streak
   - Используется в NeuroHub дашборде

2. **`calculate_user_streak(user_id)`**
   - Подсчитывает дни подряд с активностью
   - Возвращает: INTEGER (количество дней)

3. **`get_top_students(limit)`**
   - Возвращает топ N студентов
   - Используется для лидерборда

4. **`update_student_ranking()`**
   - Триггер: автоматически обновляет рейтинг при изменении прогресса

5. **`get_student_analytics_data(user_id, period_start, period_end)`**
   - Возвращает JSONB с аналитикой для AI-аналитика
   - Включает: learning_stats, achievements, ai_curator_interactions, activity

6. **`create_mentor_task_from_alert(student_id, problem_type, context)`**
   - Создаёт задачу для AI-наставника из алерта
   - Возвращает: UUID (ID задачи)

---

## 🎯 **КАК ИСПОЛЬЗУЕТСЯ В NeuroHub:**

### **Дашборд (Правая панель):**
```
┌─────────────────────────────────┐
│ 📊 ПРОГРЕСС КУРСА              │ ← student_progress
│ 🔥 ТЕКУЩАЯ СЕРИЯ (Streak)     │ ← student_rankings.streak_days
│ ⚡ XP ЗА СЕГОДНЯ               │ ← student_progress (сегодня)
│ 🏆 ДОСТИЖЕНИЯ                  │ ← user_achievements
│ 🎯 МОИ ЦЕЛИ                    │ ← user_goals
│ 📈 НЕДЕЛЬНАЯ АКТИВНОСТЬ        │ ← student_progress (за неделю)
└─────────────────────────────────┘
```

### **Чат (Левая панель):**
```
┌─────────────────────────────────┐
│ 💬 ЧАТ С AI-КУРАТОРОМ          │ ← ai_chat_history
│                                 │
│ User: Привет, как дела?        │
│ AI: Привет! Вижу ты сегодня    │ ← Контекст из:
│     прошёл 2 урока! 🎉         │   - student_progress
│     Продолжай в том же духе!   │   - mood_tracking
│                                 │   - user_achievements
│ [Прикрепить файл] 📎           │ ← file_uploads
│ [Микрофон] 🎤                  │ ← Whisper API
└─────────────────────────────────┘
```

---

## 🚀 **API ENDPOINTS ДЛЯ AI-НАСТАВНИКА:**

### **Backend Routes:**
```
GET  /api/analytics/student/:userId/dashboard
  → Возвращает данные для дашборда NeuroHub

POST /api/openai/messages
  → Отправить сообщение в AI-чат
  → Сохраняет в ai_chat_history

POST /api/files/process
  → Обработать прикреплённый файл
  → Сохраняет в file_uploads

POST /api/whisper/transcribe
  → Транскрипция аудио
  → Возвращает текст

GET  /api/goals/:userId
  → Получить цели студента

POST /api/goals
  → Создать новую цель
```

---

## 📂 **SQL МИГРАЦИИ:**

### **Основные миграции:**
```
setup-ai-mentor-tables.sql
  └─ ai_analytics_metrics
  └─ student_rankings
  └─ Функции: calculate_user_streak, get_top_students

20250118_ai_mentor_and_analyst.sql
  └─ ai_mentor_sessions
  └─ ai_mentor_messages
  └─ ai_analyst_reports
  └─ ai_mentor_tasks

20250116_achievements_system.sql
  └─ user_achievements
  └─ achievement_history
  └─ user_statistics

20250115_add_ai_curator_chat_tables.sql
  └─ ai_chat_history
  └─ file_uploads

20250111_student_messages_storage.sql
  └─ mood_tracking

20250109_token_usage_tracking.sql
  └─ openai_token_usage
  └─ whisper_usage
```

---

## 💾 **STORAGE (Supabase Storage):**

### **Bucket: `chat-files`**
```
Хранит:
- Загруженные PDF
- Загруженные DOCX
- Загруженные изображения
- Аудио записи (Whisper)

Структура:
/chat-files/{user_id}/{file_name}
```

---

## 🎉 **ИТОГОВАЯ СВОДКА:**

```
╔════════════════════════════════════════════╗
║ БАЗА ДАННЫХ AI-НАСТАВНИКА                 ║
╠════════════════════════════════════════════╣
║                                            ║
║ Таблиц всего:            18                ║
║                                            ║
║ Категории:                                 ║
║  - AI Система:            8 таблиц        ║
║  - Аналитика/Метрики:     4 таблицы       ║
║  - Геймификация:          4 таблицы       ║
║  - Пользователи:          2 таблицы       ║
║                                            ║
║ SQL Функций:              6                ║
║ API Endpoints:            6                ║
║                                            ║
║ Средний размер:                            ║
║  - 185 записей/месяц на студента          ║
║  - 2.2M записей/год на 1000 студентов     ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

**Дата создания:** 21.11.2025  
**Автор:** AI Assistant  
**Статус:** 📊 **COMPLETE DATABASE DOCUMENTATION**



