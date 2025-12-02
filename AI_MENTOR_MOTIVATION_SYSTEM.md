# 🤖 AI-МЕНТОР: Система мотивации и поддержки студентов

**Дата:** 15 ноября 2025  
**Проект:** onAI Academy  
**Интеграция:** AI-Ментор + AI-Куратор + AI-Аналитик

---

## 🎯 ЦЕЛЬ СИСТЕМЫ

AI-Ментор **автоматически** мотивирует студентов продолжать обучение на основе анализа их активности за последние 3 дня.

---

## ⏰ РАСПИСАНИЕ РАБОТЫ

### **Каждые 3 дня в 8:00 утра (UTC+6 Алматы):**
```
День 1 (Понедельник 8:00) → Анализ Пт-Сб-Вс → Отправка мотивации
День 4 (Четверг 8:00)     → Анализ Пн-Вт-Ср → Отправка мотивации
День 7 (Воскресенье 8:00) → Анализ Чт-Пт-Сб → Отправка мотивации
```

---

## 📊 ТАБЛИЦА ДЛЯ ОТСЛЕЖИВАНИЯ МОТИВАЦИОННЫХ СООБЩЕНИЙ

```sql
-- ========================================
-- ТАБЛИЦА: mentor_motivation_log
-- ========================================
CREATE TABLE IF NOT EXISTS public.mentor_motivation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Анализируемый период
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  
  -- Метрики за период
  days_active INTEGER DEFAULT 0, -- Сколько дней был активен из 3
  lessons_watched INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  total_watch_time_seconds INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Статус студента
  student_status VARCHAR(50) NOT NULL, -- 'active', 'inactive', 'at_risk', 'dropping'
  motivation_type VARCHAR(50) NOT NULL, -- 'keep_going', 'come_back', 'great_progress', 'need_help'
  
  -- Отправленное сообщение
  message_sent TEXT NOT NULL,
  message_sent_at TIMESTAMPTZ DEFAULT NOW(),
  telegram_message_id VARCHAR(100),
  
  -- Реакция студента
  student_clicked_button BOOLEAN DEFAULT false,
  student_resumed_learning BOOLEAN DEFAULT false,
  resumed_within_hours INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_mentor_log_user ON mentor_motivation_log(user_id);
CREATE INDEX idx_mentor_log_course ON mentor_motivation_log(course_id);
CREATE INDEX idx_mentor_log_status ON mentor_motivation_log(student_status);
CREATE INDEX idx_mentor_log_sent_at ON mentor_motivation_log(message_sent_at);

-- Комментарии
COMMENT ON TABLE mentor_motivation_log IS 'Лог мотивационных сообщений от AI-Ментора';
COMMENT ON COLUMN mentor_motivation_log.student_status IS 'Статус: active, inactive, at_risk, dropping';
COMMENT ON COLUMN mentor_motivation_log.motivation_type IS 'Тип: keep_going, come_back, great_progress, need_help';
```

---

## 🧮 ЛОГИКА АНАЛИЗА СТУДЕНТА

### **Функция: Определение статуса студента**

```sql
CREATE OR REPLACE FUNCTION analyze_student_status(
  p_user_id UUID,
  p_course_id INTEGER,
  p_days_to_analyze INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_days_active INTEGER;
  v_lessons_watched INTEGER;
  v_lessons_completed INTEGER;
  v_total_watch_time INTEGER;
  v_last_activity_date DATE;
  v_days_since_last_activity INTEGER;
  v_status VARCHAR(50);
  v_motivation_type VARCHAR(50);
  v_churn_risk DECIMAL;
BEGIN
  -- Подсчитываем активность за последние N дней
  SELECT 
    COUNT(DISTINCT DATE(sp.updated_at)) as days_active,
    COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.is_started = true) as lessons_watched,
    COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.is_completed = true) as lessons_completed,
    SUM(sp.watch_time_seconds) as total_watch_time,
    MAX(DATE(sp.updated_at)) as last_activity_date
  INTO 
    v_days_active,
    v_lessons_watched,
    v_lessons_completed,
    v_total_watch_time,
    v_last_activity_date
  FROM student_progress sp
  JOIN lessons l ON l.id = sp.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE sp.user_id = p_user_id
    AND m.course_id = p_course_id
    AND sp.updated_at >= NOW() - INTERVAL '1 day' * p_days_to_analyze;
  
  -- Рассчитываем дни с последней активности
  v_days_since_last_activity := COALESCE(CURRENT_DATE - v_last_activity_date, 999);
  
  -- Определяем статус студента
  IF v_days_active >= 2 AND v_lessons_completed > 0 THEN
    v_status := 'active';
    v_motivation_type := 'great_progress';
    v_churn_risk := 0.1;
    
  ELSIF v_days_active = 1 AND v_lessons_watched > 0 THEN
    v_status := 'active';
    v_motivation_type := 'keep_going';
    v_churn_risk := 0.3;
    
  ELSIF v_days_since_last_activity BETWEEN 3 AND 7 THEN
    v_status := 'at_risk';
    v_motivation_type := 'come_back';
    v_churn_risk := 0.6;
    
  ELSIF v_days_since_last_activity > 7 THEN
    v_status := 'dropping';
    v_motivation_type := 'need_help';
    v_churn_risk := 0.9;
    
  ELSE
    v_status := 'inactive';
    v_motivation_type := 'come_back';
    v_churn_risk := 0.7;
  END IF;
  
  -- Формируем результат
  v_result := jsonb_build_object(
    'userId', p_user_id,
    'courseId', p_course_id,
    'daysActive', COALESCE(v_days_active, 0),
    'lessonsWatched', COALESCE(v_lessons_watched, 0),
    'lessonsCompleted', COALESCE(v_lessons_completed, 0),
    'totalWatchTime', COALESCE(v_total_watch_time, 0),
    'lastActivityDate', v_last_activity_date,
    'daysSinceLastActivity', v_days_since_last_activity,
    'status', v_status,
    'motivationType', v_motivation_type,
    'churnRisk', v_churn_risk
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Комментарий
COMMENT ON FUNCTION analyze_student_status IS 'Анализирует статус студента за последние N дней';
```

---

## 💬 ШАБЛОНЫ МОТИВАЦИОННЫХ СООБЩЕНИЙ

### **1. GREAT_PROGRESS (Отличный прогресс)**

**Условие:** Активен 2+ дня, завершил уроки

```
🎉 {student_name}, отличная работа!

За последние 3 дня:
✅ Завершено уроков: {lessons_completed}
⏱️ Время обучения: {watch_time_formatted}
📊 Прогресс курса: {course_progress}%

Ты молодец! Продолжай в том же духе 🚀

Текущий урок: "{current_lesson}"
Следующий: "{next_lesson}"

📚 Есть вопросы по материалу?
Задай их на платформе в чате с AI-Куратором!

🔗 Продолжить обучение:
https://academy.onai.kz/courses/python-basics

---
💡 Я — AI-Ментор. Я даю рекомендации и поддержку, но не отвечаю на вопросы. Для вопросов используй AI-Куратора на платформе! 😊
```

---

### **2. KEEP_GOING (Продолжай)**

**Условие:** Активен 1 день, смотрел уроки

```
👋 {student_name}, привет!

Вижу, что ты продолжаешь изучать "{course_name}" — это здорово!

За последние 3 дня:
📺 Просмотрено уроков: {lessons_watched}
⏱️ Время обучения: {watch_time_formatted}

🎯 Небольшая мотивация:
Ты уже прошёл {course_progress}% курса. Давай не будем останавливаться! Каждый урок — это шаг к цели 💪

Следующий урок: "{next_lesson}"
Примерное время: {lesson_duration} минут

📚 Если что-то непонятно — спроси AI-Куратора на платформе!

🔗 Продолжить обучение:
https://academy.onai.kz/courses/python-basics/lesson/{next_lesson_id}

---
💡 Я — AI-Ментор. Моя задача — мотивировать тебя! За ответами на вопросы обращайся к AI-Куратору на платформе 😊
```

---

### **3. COME_BACK (Возвращайся)**

**Условие:** Не активен 3-7 дней

```
😊 {student_name}, давно не виделись!

Заметил, что ты не заходил в курс "{course_name}" уже {days_since_last_activity} дней.

🤔 Всё в порядке? Может быть, сложно? Или просто нет времени?

📍 Ты остановился на уроке:
"{last_lesson}"

🎯 Помни свою цель:
Ты начал этот курс не просто так! Ты хотел {course_goal}.

💪 Предлагаю:
Выдели сегодня всего 15 минут и посмотри следующий урок. Даже небольшой прогресс — это прогресс!

Следующий урок: "{next_lesson}"
Длительность: {lesson_duration} минут

📚 Если урок кажется сложным — AI-Куратор объяснит доступнее на платформе!

🔗 Вернуться к обучению:
https://academy.onai.kz/courses/python-basics/lesson/{last_lesson_id}

---
💡 Я — AI-Ментор. Я здесь, чтобы поддержать тебя! Вопросы по материалу задавай AI-Куратору на платформе 😊
```

---

### **4. NEED_HELP (Нужна помощь)**

**Условие:** Не активен 7+ дней

```
😟 {student_name}, всё хорошо?

Ты не заходил в курс "{course_name}" уже {days_since_last_activity} дней.

🤷‍♂️ Что случилось?
Возможные причины:
• Слишком сложно?
• Нет времени?
• Потерял интерес?
• Технические проблемы?

💡 Давай разберёмся:

Если СЛОЖНО:
AI-Куратор объяснит материал проще. Он умеет разбирать любую тему на примерах!

Если НЕТ ВРЕМЕНИ:
Попробуй выделять по 10-15 минут в день. Это лучше, чем ничего!

Если ПОТЕРЯЛ ИНТЕРЕС:
Вспомни, зачем ты начинал. Твоя цель: {course_goal}

📍 Ты остановился здесь:
Модуль: "{current_module}"
Урок: "{last_lesson}"

🎯 Давай попробуем снова?
Я верю в тебя! Ты можешь это пройти 💪

🔗 Вернуться на платформу:
https://academy.onai.kz/courses/python-basics/lesson/{last_lesson_id}

Там тебя ждёт AI-Куратор, который ответит на все вопросы!

---
💡 Я — AI-Ментор. Моя задача — вернуть тебя на путь обучения! Вопросы задавай AI-Куратору на платформе 😊
```

---

## 🔧 BACKEND API ENDPOINTS

### **1. Запуск анализа всех студентов (CRON задача)**

```http
POST /api/mentor/analyze-all
Authorization: Bearer {service_role_key}

{
  "daysToAnalyze": 3
}
```

**Логика:**
1. Получает всех активных студентов
2. Для каждого вызывает `analyze_student_status()`
3. Формирует мотивационное сообщение
4. Отправляет в Telegram
5. Записывает лог в `mentor_motivation_log`

**Ответ:**
```json
{
  "success": true,
  "analyzed": 2000,
  "messagesSent": 847,
  "breakdown": {
    "active": 1153,
    "at_risk": 520,
    "dropping": 327
  }
}
```

---

### **2. Анализ конкретного студента**

```http
GET /api/mentor/analyze/:userId?courseId=1&days=3
```

**Ответ:**
```json
{
  "userId": "uuid",
  "courseId": 1,
  "analysis": {
    "daysActive": 1,
    "lessonsWatched": 3,
    "lessonsCompleted": 1,
    "totalWatchTime": 1200,
    "lastActivityDate": "2025-11-12",
    "daysSinceLastActivity": 3,
    "status": "at_risk",
    "motivationType": "come_back",
    "churnRisk": 0.6
  },
  "message": {
    "type": "come_back",
    "text": "😊 Александр, давно не виделись!...",
    "buttons": [
      {
        "text": "Задать вопрос AI-Куратору 💬",
        "callback_data": "ask_curator"
      },
      {
        "text": "Продолжить обучение 📚",
        "url": "https://academy.com/courses/python-basics/lesson/5"
      }
    ]
  }
}
```

---

### **3. Отправка мотивации конкретному студенту**

```http
POST /api/mentor/send-motivation
Content-Type: application/json

{
  "userId": "uuid",
  "courseId": 1,
  "force": false
}
```

**Логика:**
- Анализирует студента
- Формирует сообщение
- Отправляет в Telegram
- Записывает лог

---

### **4. История мотивационных сообщений**

```http
GET /api/mentor/history/:userId?limit=10
```

**Ответ:**
```json
{
  "userId": "uuid",
  "messages": [
    {
      "id": "uuid",
      "sentAt": "2025-11-15T08:00:00Z",
      "motivationType": "come_back",
      "studentStatus": "at_risk",
      "studentClickedButton": true,
      "studentResumedLearning": true,
      "resumedWithinHours": 2
    }
  ]
}
```

---

## 🤖 TELEGRAM БОТ: Отправка мотивации (БЕЗ КНОПОК!)

### **Только отправка сообщений, БЕЗ обработки ответов**

```typescript
// backend/src/services/telegramMentorService.ts

export async function sendMotivationToTelegram(
  userId: string,
  telegramId: number,
  motivationData: {
    type: string;
    message: string;
    courseUrl: string;
    courseName: string;
  }
) {
  try {
    // Формируем сообщение
    const fullMessage = `${motivationData.message}

🔗 Продолжить обучение:
${motivationData.courseUrl}

---
💡 Вопросы? Задай их AI-Куратору прямо на платформе!`;

    // Отправляем в Telegram (БЕЗ КНОПОК!)
    await bot.sendMessage(telegramId, fullMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: false
    });

    // Логируем отправку
    await logMentorMessage(userId, 'sent', motivationData.type);
    
    console.log(`✅ [MENTOR] Мотивация отправлена пользователю ${userId}`);
  } catch (error) {
    console.error(`❌ [MENTOR] Ошибка отправки мотивации:`, error);
    throw error;
  }
}
```

**Важно:** 
- НЕТ кнопок в Telegram
- НЕТ обработки callback_query
- НЕТ inline keyboard
- Только текст + ссылка на платформу

---

## ⏰ НАСТРОЙКА CRON ЗАДАЧИ

### **Вариант 1: Supabase pg_cron**

```sql
-- Запуск каждые 3 дня в 8:00 утра (UTC+6 = 02:00 UTC)
SELECT cron.schedule(
  'mentor-motivation-3days',
  '0 2 */3 * *', -- Каждые 3 дня в 02:00 UTC (08:00 Алматы)
  $$
  SELECT net.http_post(
    url := 'https://your-backend.com/api/mentor/analyze-all',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'daysToAnalyze', 3
    )
  );
  $$
);
```

---

### **Вариант 2: Node.js node-cron (если pg_cron недоступен)**

```typescript
// backend/src/jobs/mentorMotivationJob.ts
import cron from 'node-cron';
import { analyzeMentorAllStudents } from '../services/mentorService';

// Каждые 3 дня в 8:00 утра (по местному времени)
cron.schedule('0 8 */3 * *', async () => {
  console.log('[MENTOR JOB] Начинаем анализ студентов...');
  
  try {
    const result = await analyzeMentorAllStudents({
      daysToAnalyze: 3
    });
    
    console.log('[MENTOR JOB] Успешно!', result);
  } catch (error) {
    console.error('[MENTOR JOB] Ошибка:', error);
  }
}, {
  timezone: "Asia/Almaty"
});
```

---

## 📊 ИНТЕГРАЦИЯ С AI-КУРАТОРОМ (НА ПЛАТФОРМЕ!)

### **Когда студент возвращается на платформу и открывает чат:**

```typescript
// frontend/src/components/profile/v2/AIChatDialog.tsx

useEffect(() => {
  // Проверяем был ли студент неактивен
  const checkMentorContext = async () => {
    const mentorHistory = await fetch(`/api/mentor/history/${userId}`);
    const lastMotivation = mentorHistory[0];
    
    if (lastMotivation && lastMotivation.sentAt > (Date.now() - 3 * 24 * 60 * 60 * 1000)) {
      // Последняя мотивация была менее 3 дней назад
      // AI-Куратор показывает персонализированное приветствие
      
      const greeting = `👋 Привет! Рад видеть тебя снова!

AI-Ментор отметил, что ты ${lastMotivation.studentStatus === 'at_risk' ? 'был немного неактивен' : 'продолжаешь учиться'}.

Если у тебя есть вопросы по курсу "${lastMotivation.courseName}" — задавай, я помогу! 😊`;

      // Показываем приветствие
      showCuratorGreeting(greeting);
    }
  };
  
  checkMentorContext();
}, [userId]);
```

**Важно:**
- Вопросы задаются ТОЛЬКО на платформе
- AI-Куратор видит контекст от AI-Ментора
- НЕТ интеграции через Telegram бота

---

## 🎯 МЕТРИКИ ЭФФЕКТИВНОСТИ AI-МЕНТОРА

### **Отслеживаем:**
```sql
SELECT 
  motivation_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE student_clicked_button = true) as clicked,
  COUNT(*) FILTER (WHERE student_resumed_learning = true) as resumed,
  AVG(resumed_within_hours) FILTER (WHERE student_resumed_learning = true) as avg_resume_time
FROM mentor_motivation_log
WHERE message_sent_at >= NOW() - INTERVAL '30 days'
GROUP BY motivation_type;
```

**Результат:**
```
motivation_type  | total_sent | clicked | resumed | avg_resume_time
-----------------|------------|---------|---------|----------------
great_progress   | 450        | 320     | 380     | 3.2 hours
keep_going       | 280        | 190     | 210     | 5.1 hours
come_back        | 520        | 180     | 140     | 12.5 hours
need_help        | 327        | 95      | 50      | 24.3 hours
```

---

## 📋 РЕЗЮМЕ: ЧТО НУЖНО СДЕЛАТЬ

### **1. База данных:**
- ✅ Создать таблицу `mentor_motivation_log`
- ✅ Создать функцию `analyze_student_status()`
- ✅ Настроить CRON задачу (каждые 3 дня в 8:00)

### **2. Backend:**
- ✅ API endpoint `/api/mentor/analyze-all`
- ✅ API endpoint `/api/mentor/send-motivation`
- ✅ Сервис `mentorService.ts` с логикой анализа
- ✅ Интеграция с Telegram Bot API

### **3. Telegram Bot:**
- ✅ Обработка кнопки "Задать вопрос AI-Куратору"
- ✅ Обработка кнопки "Продолжить обучение"
- ✅ Передача контекста AI-Куратору

### **4. AI-Куратор:**
- ✅ Принимает контекст от AI-Ментора
- ✅ Персонализирует приветствие

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. Создать SQL миграцию для `mentor_motivation_log`
2. Реализовать функцию `analyze_student_status()`
3. Настроить CRON задачу
4. Реализовать Backend API
5. Обновить Telegram бота
6. Протестировать на 10 студентах
7. Запустить для всех!

---

**ГОТОВ К РЕАЛИЗАЦИИ!** 🚀

