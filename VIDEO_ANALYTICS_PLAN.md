# 📊 ПЛАН АНАЛИТИКИ ВИДЕО: Система мониторинга обучения

**Дата:** 15 ноября 2025  
**Проект:** onAI Academy - Образовательная платформа

---

## 🎯 ЦЕЛЬ АНАЛИТИКИ

Отслеживать **реальное качество обучения** через поведение студентов при просмотре видео, чтобы:
1. AI-аналитик мог выявлять проблемные места в курсах
2. AI-ментор мог помогать студентам индивидуально
3. Админы видели где нужно улучшить контент

---

## 📊 СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ

### **1. `student_progress`** - Прогресс по урокам
```sql
- video_progress_percent (0-100) -- Процент просмотра
- last_position_seconds -- Где остановился
- watch_time_seconds -- Суммарное время просмотра
- is_started / is_completed -- Статусы
- times_watched -- Сколько раз смотрел
- average_speed -- Средняя скорость воспроизведения
```

### **2. `video_analytics`** - Детальные события
```sql
- event_type (play, pause, seek, complete, skip, replay)
- position_seconds -- Позиция при событии
- session_id -- Группировка сессии
- playback_speed -- Скорость воспроизведения
- quality_setting -- Качество видео
- device_type -- Тип устройства
```

---

## 🔥 НОВЫЕ МЕТРИКИ ДЛЯ ДОБАВЛЕНИЯ

### **1. Engagement Score (Вовлечённость)**

**Формула:**
```
Engagement = (
  watch_time / video_duration * 0.4 +
  completion_rate * 0.3 +
  (1 - skip_rate) * 0.2 +
  replay_count * 0.1
)
```

**Что показывает:**
- 0-30% = ❌ Низкая вовлечённость (контент не интересен)
- 30-60% = ⚠️ Средняя вовлечённость (можно улучшить)
- 60-100% = ✅ Высокая вовлечённость (отличный контент)

---

### **2. Difficulty Score (Сложность)**

**Формула:**
```
Difficulty = (
  replay_count * 0.4 +
  pause_count / video_duration * 0.3 +
  seek_back_count * 0.2 +
  (1 - playback_speed) * 0.1
)
```

**Что показывает:**
- Высокий Difficulty = Студенты часто перематывают назад → контент сложный
- Низкий Difficulty = Смотрят быстрее 1x → слишком просто

---

### **3. Attention Heatmap (Тепловая карта внимания)**

**Данные:**
```sql
CREATE TABLE video_heatmap (
  video_id UUID,
  time_segment INTEGER, -- Сегмент видео (например, каждые 10 секунд)
  total_views INTEGER, -- Сколько раз просмотрели этот сегмент
  skip_count INTEGER, -- Сколько раз пропустили
  replay_count INTEGER, -- Сколько раз перемотали назад
  average_watch_time DECIMAL -- Среднее время просмотра сегмента
);
```

**Что показывает:**
- 🔴 "Горячие" зоны = Студенты часто перематывают назад → сложный момент
- 🟢 "Холодные" зоны = Студенты пропускают → скучный момент
- ⚡ "Быстрые" зоны = Смотрят на 1.5x-2x → повторение материала

---

### **4. Drop-off Rate (Процент отсева)**

**Формула:**
```sql
DROP_OFF_RATE = (started_count - completed_count) / started_count * 100
```

**По времени:**
```sql
- 0-25% видео: Early drop-off (проблема с введением)
- 25-50%: Mid drop-off (сложный момент или скука)
- 50-75%: Late drop-off (потеря интереса)
- 75-100%: Near completion (почти досмотрели)
```

**Критичные значения:**
- > 50% drop-off = 🚨 ПРОБЛЕМА! Нужно переснимать видео
- 30-50% drop-off = ⚠️ Требуется улучшение
- < 30% drop-off = ✅ Хорошее видео

---

### **5. Learning Efficiency (Эффективность обучения)**

**Формула:**
```
Efficiency = (
  completion_rate * 0.5 +
  (1 / times_watched) * 0.3 +
  (average_speed - 1) * 0.2
)
```

**Что показывает:**
- Студент завершил урок с 1 просмотра на 1.2x скорости = **Высокая эффективность**
- Студент смотрел 3 раза, не завершил = **Низкая эффективность**

---

### **6. Cohort Analysis (Анализ когорт)**

**Сравниваем группы студентов:**
```sql
- Новички (< 1 месяца) vs Опытные (> 3 месяцев)
- По возрасту
- По времени суток просмотра
- По устройствам (mobile vs desktop)
```

**Вопросы:**
- Где новички застревают чаще?
- В какое время дня engagement выше?
- На каких устройствах досматривают до конца?

---

### **7. Predict Churn (Предсказание ухода)**

**AI-модель предсказывает уход студента если:**
```
- Не заходил > 7 дней
- Drop-off rate > 60% на последних 3 уроках
- Watch time < 30% от длительности видео
- Средняя скорость > 1.8x (торопится закончить)
```

**Действия:**
- AI-ментор отправляет персональное сообщение
- Предлагает более простой контент
- Напоминает о незавершённых уроках

---

## 📈 ДАШБОРД ДЛЯ АДМИНА

### **Общая статистика:**
```
┌─────────────────────────────────────────────────┐
│  📊 ОБЩАЯ СТАТИСТИКА                            │
│  ┌──────────────┬──────────────┬─────────────┐ │
│  │ Всего студ.  │ Активных     │ Завершили   │ │
│  │ 2,000        │ 1,245 (62%)  │ 456 (23%)   │ │
│  └──────────────┴──────────────┴─────────────┘ │
│                                                  │
│  Средний Engagement:    78% ✅                  │
│  Средний Drop-off:      32% ⚠️                  │
│  Средняя скорость:      1.15x ✅                │
└─────────────────────────────────────────────────┘
```

### **Топ проблемных видео:**
```
🔴 Модуль 3, Урок 5: "Списки в Python"
   Drop-off: 68% | Engagement: 34% | Replays: 4.2
   💡 Рекомендация: Переснять с примерами

⚠️ Модуль 2, Урок 3: "Циклы"
   Drop-off: 45% | Engagement: 52% | Replays: 3.1
   💡 Рекомендация: Добавить практику

✅ Модуль 1, Урок 1: "Введение"
   Drop-off: 12% | Engagement: 89% | Replays: 1.2
   💡 Отличное видео!
```

### **Тепловая карта курса:**
```
Курс: Python для начинающих
┌─────────┬─────────┬─────────┬─────────┐
│ Модуль 1│ Модуль 2│ Модуль 3│ Модуль 4│
│  🟢 89% │  🟡 67% │  🔴 34% │  🟡 56% │
│  10 ур. │  12 ур. │  15 ур. │  8 ур.  │
└─────────┴─────────┴─────────┴─────────┘

🔴 Модуль 3 требует срочного улучшения!
```

---

## 🤖 ИНТЕГРАЦИЯ С AI

### **AI-Аналитик видит:**
1. **Где студенты застревают** (высокий replay_count)
2. **Что пропускают** (высокий skip_rate)
3. **Когда уходят** (drop-off points)
4. **Кто нуждается в помощи** (низкий Engagement)

### **AI-Ментор действует:**
```typescript
// Пример логики AI-ментора
if (student.drop_off_rate > 60% && student.replay_count > 3) {
  mentor.sendMessage(
    "Вижу что урок 'Циклы в Python' даётся сложно. " +
    "Хочешь разберём вместе? Могу объяснить попроще 😊"
  );
  mentor.suggestAlternativeLesson("Циклы для начинающих");
}

if (student.last_activity > 7_days) {
  mentor.sendReminder(
    "Давно не виделись! Продолжим изучение Python? " +
    "Ты остановился на уроке '{{last_lesson}}'"
  );
}
```

---

## 🗄️ НОВЫЕ ТАБЛИЦЫ ДЛЯ АНАЛИТИКИ

### **1. `video_segments_analytics`** - Посегментная аналитика

```sql
CREATE TABLE video_segments_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
  
  -- Сегмент видео (каждые 10 секунд)
  start_second INTEGER NOT NULL,
  end_second INTEGER NOT NULL,
  
  -- Метрики сегмента
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  replay_count INTEGER DEFAULT 0,
  average_watch_time DECIMAL(5,2) DEFAULT 0,
  
  -- Индикаторы
  is_hot_zone BOOLEAN DEFAULT false, -- Часто перематывают назад
  is_cold_zone BOOLEAN DEFAULT false, -- Часто пропускают
  difficulty_score DECIMAL(3,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_video_segment UNIQUE (video_id, start_second)
);

CREATE INDEX idx_segments_video ON video_segments_analytics(video_id);
CREATE INDEX idx_segments_hot ON video_segments_analytics(video_id, is_hot_zone) WHERE is_hot_zone = true;
```

---

### **2. `student_learning_metrics`** - Метрики обучения

```sql
CREATE TABLE student_learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Общие метрики
  total_watch_time_seconds INTEGER DEFAULT 0,
  average_engagement_score DECIMAL(3,2) DEFAULT 0,
  average_difficulty_score DECIMAL(3,2) DEFAULT 0,
  learning_efficiency DECIMAL(3,2) DEFAULT 0,
  
  -- Прогресс
  lessons_started INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  completion_rate DECIMAL(3,2) DEFAULT 0,
  
  -- Поведение
  average_session_duration INTEGER DEFAULT 0, -- секунды
  total_sessions INTEGER DEFAULT 0,
  average_playback_speed DECIMAL(3,2) DEFAULT 1.0,
  
  -- Риски
  days_since_last_activity INTEGER DEFAULT 0,
  churn_risk_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  predicted_completion_date DATE,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_student_course_metrics UNIQUE (user_id, course_id)
);

CREATE INDEX idx_learning_metrics_user ON student_learning_metrics(user_id);
CREATE INDEX idx_learning_metrics_course ON student_learning_metrics(course_id);
CREATE INDEX idx_learning_metrics_churn ON student_learning_metrics(churn_risk_score) WHERE churn_risk_score > 0.7;
```

---

### **3. `course_health_metrics`** - Здоровье курса

```sql
CREATE TABLE course_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Общие показатели
  total_enrollments INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  completed_students INTEGER DEFAULT 0,
  
  -- Качество курса
  average_engagement DECIMAL(3,2) DEFAULT 0,
  average_drop_off_rate DECIMAL(3,2) DEFAULT 0,
  average_completion_time_days INTEGER DEFAULT 0,
  
  -- Проблемные места
  most_difficult_lesson_id UUID REFERENCES lessons(id),
  most_skipped_lesson_id UUID REFERENCES lessons(id),
  highest_drop_off_lesson_id UUID REFERENCES lessons(id),
  
  -- Оценки
  overall_health_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  needs_improvement BOOLEAN DEFAULT false,
  
  -- Дата расчёта
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_course_health UNIQUE (course_id)
);

CREATE INDEX idx_course_health ON course_health_metrics(course_id);
CREATE INDEX idx_course_needs_improvement ON course_health_metrics(course_id) WHERE needs_improvement = true;
```

---

## 🔧 API ENDPOINTS ДЛЯ АНАЛИТИКИ

### **1. Обновление прогресса видео**

```http
POST /api/videos/progress
Content-Type: application/json

{
  "userId": "uuid",
  "lessonId": "uuid",
  "videoId": "uuid",
  "currentPosition": 125, // секунды
  "videoProgress": 42, // процент
  "playbackSpeed": 1.25,
  "quality": "1080p",
  "deviceType": "desktop",
  "sessionId": "uuid"
}
```

**Логика:**
- Обновляет `student_progress.last_position_seconds`
- Обновляет `student_progress.video_progress_percent`
- Записывает событие в `video_analytics`
- Пересчитывает `student_learning_metrics`

---

### **2. Трекинг событий видео**

```http
POST /api/videos/events
Content-Type: application/json

{
  "userId": "uuid",
  "lessonId": "uuid",
  "videoId": "uuid",
  "eventType": "seek", // play, pause, seek, complete, skip, replay
  "position": 180,
  "sessionId": "uuid",
  "playbackSpeed": 1.5,
  "quality": "720p",
  "deviceType": "mobile"
}
```

**Логика:**
- Записывает событие в `video_analytics`
- Обновляет `video_segments_analytics` (если seek/skip)
- Триггерит пересчёт метрик

---

### **3. Получение аналитики студента**

```http
GET /api/analytics/student/:userId/course/:courseId
```

**Ответ:**
```json
{
  "userId": "uuid",
  "courseId": 1,
  "courseProgress": {
    "totalLessons": 45,
    "completedLessons": 12,
    "completionRate": 26.7,
    "currentModule": "Модуль 3: Циклы"
  },
  "metrics": {
    "totalWatchTime": 7200, // 2 часа
    "averageEngagement": 0.78,
    "averageDifficulty": 0.42,
    "learningEfficiency": 0.85,
    "averagePlaybackSpeed": 1.15
  },
  "behavior": {
    "totalSessions": 15,
    "averageSessionDuration": 480, // 8 минут
    "daysSinceLastActivity": 2,
    "churnRiskScore": 0.15, // Низкий риск
    "predictedCompletionDate": "2025-12-15"
  },
  "recommendations": [
    "Отличный прогресс! Продолжай в том же духе 🚀",
    "Модуль 3 даётся сложнее — не стесняйся задавать вопросы AI-ментору"
  ]
}
```

---

### **4. Аналитика курса (для админа)**

```http
GET /api/analytics/course/:courseId
```

**Ответ:**
```json
{
  "courseId": 1,
  "courseName": "Основы Python",
  "overall": {
    "totalEnrollments": 2000,
    "activeStudents": 1245,
    "completedStudents": 456,
    "averageEngagement": 0.78,
    "averageDropOffRate": 0.32,
    "overallHealthScore": 0.76,
    "needsImprovement": false
  },
  "problemLessons": [
    {
      "lessonId": "uuid",
      "lessonTitle": "Списки в Python",
      "moduleTitle": "Модуль 3",
      "dropOffRate": 0.68,
      "engagement": 0.34,
      "averageReplays": 4.2,
      "recommendation": "Переснять с дополнительными примерами"
    }
  ],
  "topPerformingLessons": [
    {
      "lessonId": "uuid",
      "lessonTitle": "Введение в Python",
      "engagement": 0.89,
      "dropOffRate": 0.12
    }
  ],
  "moduleHealth": [
    { "moduleId": 1, "healthScore": 0.89, "status": "excellent" },
    { "moduleId": 2, "healthScore": 0.67, "status": "good" },
    { "moduleId": 3, "healthScore": 0.34, "status": "needs_improvement" }
  ]
}
```

---

### **5. Тепловая карта видео**

```http
GET /api/analytics/video/:videoId/heatmap
```

**Ответ:**
```json
{
  "videoId": "uuid",
  "videoDuration": 600, // 10 минут
  "segments": [
    {
      "startSecond": 0,
      "endSecond": 10,
      "totalViews": 1500,
      "skipCount": 50,
      "replayCount": 20,
      "averageWatchTime": 9.5,
      "zone": "normal"
    },
    {
      "startSecond": 120,
      "endSecond": 130,
      "totalViews": 1200,
      "skipCount": 10,
      "replayCount": 450, // Высокий replay
      "averageWatchTime": 12.3, // Смотрят дольше
      "zone": "hot", // 🔴 Сложный момент
      "note": "Студенты часто перематывают назад"
    },
    {
      "startSecond": 420,
      "endSecond": 430,
      "totalViews": 800,
      "skipCount": 600, // Высокий skip
      "replayCount": 5,
      "averageWatchTime": 3.2,
      "zone": "cold", // 🔵 Скучный момент
      "note": "Студенты пропускают этот сегмент"
    }
  ]
}
```

---

### **6. Когортный анализ**

```http
GET /api/analytics/cohorts?courseId=1&groupBy=registration_month
```

**Ответ:**
```json
{
  "courseId": 1,
  "groupBy": "registration_month",
  "cohorts": [
    {
      "cohortName": "Сентябрь 2025",
      "totalStudents": 450,
      "activeStudents": 320,
      "completedStudents": 89,
      "averageEngagement": 0.82,
      "averageCompletionTime": 45 // дней
    },
    {
      "cohortName": "Октябрь 2025",
      "totalStudents": 620,
      "activeStudents": 510,
      "completedStudents": 134,
      "averageEngagement": 0.79,
      "averageCompletionTime": 42
    }
  ],
  "insights": [
    "Октябрьская когорта учится быстрее (42 vs 45 дней)",
    "Engagement стабильный (~80%)"
  ]
}
```

---

### **7. Предсказание ухода студента**

```http
GET /api/analytics/churn-prediction/:userId
```

**Ответ:**
```json
{
  "userId": "uuid",
  "churnRiskScore": 0.73, // Высокий риск!
  "riskLevel": "high",
  "factors": [
    {
      "factor": "Не заходил 9 дней",
      "weight": 0.35
    },
    {
      "factor": "Drop-off rate 62% на последних 3 уроках",
      "weight": 0.28
    },
    {
      "factor": "Engagement снизился с 0.85 до 0.42",
      "weight": 0.10
    }
  ],
  "recommendations": [
    "AI-ментор должен отправить персональное сообщение",
    "Предложить более простой контент",
    "Напомнить о незавершённых уроках"
  ],
  "suggestedActions": {
    "sendMessage": true,
    "offerHelp": true,
    "adjustDifficulty": "easier"
  }
}
```

---

## 🎯 РЕЗЮМЕ: ЧТО ДОБАВИТЬ

### **Новые таблицы (3 шт):**
1. ✅ `video_segments_analytics` - Посегментная аналитика
2. ✅ `student_learning_metrics` - Метрики обучения студента
3. ✅ `course_health_metrics` - Здоровье курса

### **Новые API endpoints (7 шт):**
1. ✅ `POST /api/videos/progress` - Обновление прогресса
2. ✅ `POST /api/videos/events` - Трекинг событий
3. ✅ `GET /api/analytics/student/:userId/course/:courseId` - Аналитика студента
4. ✅ `GET /api/analytics/course/:courseId` - Аналитика курса
5. ✅ `GET /api/analytics/video/:videoId/heatmap` - Тепловая карта
6. ✅ `GET /api/analytics/cohorts` - Когортный анализ
7. ✅ `GET /api/analytics/churn-prediction/:userId` - Предсказание ухода

### **Новые метрики (7 шт):**
1. ✅ Engagement Score (Вовлечённость)
2. ✅ Difficulty Score (Сложность)
3. ✅ Attention Heatmap (Тепловая карта)
4. ✅ Drop-off Rate (Процент отсева)
5. ✅ Learning Efficiency (Эффективность обучения)
6. ✅ Cohort Analysis (Анализ когорт)
7. ✅ Predict Churn (Предсказание ухода)

---

## 📅 ПЛАН РЕАЛИЗАЦИИ

### **Этап 1: Базовый трекинг (1-2 дня)**
- Добавить API endpoints для обновления прогресса
- Реализовать трекинг событий (play, pause, seek)
- Тестирование на frontend

### **Этап 2: Таблицы аналитики (1 день)**
- Создать 3 новые таблицы
- Написать функции для расчёта метрик
- Настроить автоматические триггеры

### **Этап 3: Дашборд админа (2-3 дня)**
- Визуализация метрик
- Тепловые карты
- Списки проблемных уроков

### **Этап 4: AI интеграция (2 дня)**
- AI-аналитик анализирует данные
- AI-ментор отправляет рекомендации
- Автоматические алерты

---

**ГОТОВ К РЕАЛИЗАЦИИ!** 🚀

