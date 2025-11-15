# 🚀 AI AGENTS SETUP GUIDE

**Полная инструкция по настройке AI Аналитика и AI Ментора**  
**Версия:** 2.0.0 Production Ready  
**Дата:** 15 ноября 2025

---

## 📋 OVERVIEW

Созданы 2 production-ready промпта для AI агентов:

1. **AI Analyst** (`AI_ANALYST_PRODUCTION_PROMPT.md`)
   - Анализирует данные студентов
   - Даёт рекомендации администраторам
   - Выявляет студентов в зоне риска
   - Прогнозирует отток (churn prediction)

2. **AI Mentor** (`AI_MENTOR_PRODUCTION_PROMPT.md`)
   - Мотивирует студентов каждые 3 дня
   - Отправляет персонализированные сообщения
   - Поддерживает в процессе обучения
   - Не отвечает на вопросы (отсылает к AI Куратору)

---

## ⚠️ ВАЖНО: ЧТО Я МОГУ И НЕ МОГУ

### ✅ Я МОГУ:
- Создать промпты для OpenAI Assistants
- Написать Backend код для интеграции
- Разработать логику функций (OpenAI Functions)
- Создать SQL миграции для БД
- Настроить cron jobs
- Протестировать логику на тестовых данных

### ❌ Я НЕ МОГУ:
- **Напрямую обновлять промпты в вашем OpenAI аккаунте** (нужен доступ к вашему Dashboard)
- **Создавать Assistants автоматически** (требуется ваш API ключ с правами на создание Assistants)
- **Получать доступ к вашим секретным ключам** (безопасность)
- **Автоматически загружать функции в OpenAI** (делается вручную через UI или API)

---

## 🔧 ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ

### 1. Создать AI Analyst в OpenAI

**Где:** https://platform.openai.com/assistants

**Шаги:**
1. Нажать "Create Assistant"
2. **Name:** `AI Analyst - onAI Academy`
3. **Instructions:** Скопировать весь текст из секции "SYSTEM PROMPT" в файле `AI_ANALYST_PRODUCTION_PROMPT.md`
4. **Model:** `gpt-4o`
5. **Tools → Functions:** Добавить 5 функций (JSON конфиги есть в том же файле)
6. **Temperature:** `0.3`
7. **Top P:** `0.8`
8. Нажать "Save"
9. **Скопировать Assistant ID** (например, `asst_ABC123...`)

---

### 2. Создать AI Mentor в OpenAI

**Где:** https://platform.openai.com/assistants

**Шаги:**
1. Нажать "Create Assistant"
2. **Name:** `AI Mentor - onAI Academy`
3. **Instructions:** Скопировать весь текст из секции "SYSTEM PROMPT" в файле `AI_MENTOR_PRODUCTION_PROMPT.md`
4. **Model:** `gpt-4o`
5. **Tools → Functions:** Добавить 3 функции (JSON конфиги есть в том же файле)
6. **Temperature:** `0.7`
7. **Top P:** `0.9`
8. Нажать "Save"
9. **Скопировать Assistant ID** (например, `asst_XYZ789...`)

---

### 3. Добавить ID в Backend `.env`

Открыть `backend/.env` и добавить:

```env
# AI Assistants
OPENAI_ASSISTANT_CURATOR_ID=asst_GjNXpeLRD1iw8KOCj5WpMeh6  # Уже есть
OPENAI_ASSISTANT_ANALYST_ID=asst_ABC123...  # НОВЫЙ! Вставить из шага 1
OPENAI_ASSISTANT_MENTOR_ID=asst_XYZ789...   # НОВЫЙ! Вставить из шага 2

# Telegram Bot для Mentor (если ещё нет)
TELEGRAM_BOT_MENTOR_TOKEN=YOUR_BOT_TOKEN
```

---

### 4. Создать Telegram Bot для AI Mentor (если нужно)

**Шаги:**
1. Открыть Telegram, найти `@BotFather`
2. Отправить `/newbot`
3. Дать имя боту: `onAI Mentor`
4. Дать username: `onai_mentor_bot` (или любой доступный)
5. **Скопировать токен** (например, `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
6. Добавить токен в `backend/.env`:
   ```env
   TELEGRAM_BOT_MENTOR_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

---

## 🛠️ BACKEND IMPLEMENTATION (Что нужно доработать)

### НОВЫЕ ЭНДПОИНТЫ ДЛЯ AI ANALYST:

#### 1. `GET /api/analytics/student/:userId/full`
**Файл:** `backend/src/services/analystService.ts`

**Создать функцию:**
```typescript
export async function getStudentFullAnalytics(
  userId: string,
  includeVideoAnalytics: boolean = true,
  timeRangeDays: number = 30
) {
  // 1. Получить профиль (уже есть в profileService)
  const { profile, stats } = await getUserProfile(userId);

  // 2. Получить детальную видео-аналитику
  let videoAnalytics = [];
  if (includeVideoAnalytics) {
    const { data, error } = await supabase
      .from('student_progress')
      .select(`
        lesson_id,
        lessons(title, module_id, modules(title)),
        video_progress_percent,
        watch_time_seconds,
        times_watched,
        average_speed,
        is_completed,
        completed_at
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20);

    videoAnalytics = data || [];
  }

  // 3. Получить timeline активности за N дней
  const activityTimeline = await getActivityTimeline(userId, timeRangeDays);

  return {
    profile,
    stats,
    video_analytics: videoAnalytics,
    activity_timeline: activityTimeline,
  };
}
```

**Добавить контроллер:**
```typescript
// backend/src/controllers/analystController.ts
export async function getFullAnalytics(req: Request, res: Response) {
  const { userId } = req.params;
  const { include_video = 'true', time_range = '30' } = req.query;

  try {
    const data = await getStudentFullAnalytics(
      userId,
      include_video === 'true',
      parseInt(time_range as string)
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
```

**Добавить роут:**
```typescript
// backend/src/routes/analytics.ts
router.get('/student/:userId/full', analystController.getFullAnalytics);
```

---

#### 2. `GET /api/analytics/cohort/:type`
**Создать функцию:**
```typescript
export async function getCohortAnalytics(
  cohortType: 'all' | 'active' | 'at_risk' | 'top_performers' | 'inactive',
  courseId?: string,
  limit: number = 50
) {
  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      level,
      xp,
      current_streak,
      last_activity_at,
      created_at
    `)
    .eq('role', 'student');

  // Фильтры по типу когорты
  const now = new Date();
  switch (cohortType) {
    case 'active':
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte('last_activity_at', sevenDaysAgo.toISOString());
      break;
    case 'at_risk':
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      query = query.lt('last_activity_at', fourteenDaysAgo.toISOString());
      break;
    case 'inactive':
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.lt('last_activity_at', thirtyDaysAgo.toISOString());
      break;
    case 'top_performers':
      query = query.gte('level', 3).order('xp', { ascending: false });
      break;
  }

  query = query.limit(limit);

  const { data: students, error } = await query;
  if (error) throw error;

  // Обогатить данными
  const enrichedStudents = await Promise.all(
    students.map(async (student) => {
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - new Date(student.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Вычислить risk_score
      let riskScore = 0;
      const riskFactors = [];
      
      if (daysSinceLastActivity > 7) {
        riskScore += 0.4;
        riskFactors.push('long_inactivity');
      }
      if (student.current_streak === 0) {
        riskScore += 0.2;
        riskFactors.push('no_streak');
      }
      if (student.level === 1 && daysSinceLastActivity > 3) {
        riskScore += 0.2;
        riskFactors.push('beginner_inactive');
      }

      return {
        user_id: student.id,
        full_name: student.full_name,
        last_activity_days_ago: daysSinceLastActivity,
        risk_score: Math.min(riskScore, 1),
        risk_factors: riskFactors,
        level: student.level,
        xp: student.xp,
        current_streak: student.current_streak,
      };
    })
  );

  return {
    cohort_type: cohortType,
    total_students: enrichedStudents.length,
    students: enrichedStudents,
  };
}
```

---

#### 3-5. Остальные эндпоинты
Аналогично создать для:
- `GET /api/analytics/course/:courseId/performance`
- `GET /api/analytics/churn-prediction`
- `GET /api/analytics/video/:lessonId/dropoff`

**Полный код есть в `AI_ANALYST_PRODUCTION_PROMPT.md`**

---

### НОВЫЕ ЭНДПОИНТЫ ДЛЯ AI MENTOR:

#### 1. `GET /api/mentor/student/:userId/data`
**Файл:** `backend/src/services/mentorService.ts`

**Создать функцию:**
```typescript
export async function getStudentMentorData(userId: string, daysBack: number = 3) {
  // 1. Профиль
  const { profile } = await getUserProfile(userId);

  // 2. Активность за последние N дней
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const { data: recentProgress } = await supabase
    .from('student_progress')
    .select('lesson_id, watch_time_seconds, is_completed, updated_at')
    .eq('user_id', userId)
    .gte('updated_at', startDate.toISOString());

  const lessonsCompleted = recentProgress?.filter(p => p.is_completed).length || 0;
  const watchTimeMinutes = Math.round(
    (recentProgress?.reduce((sum, p) => sum + p.watch_time_seconds, 0) || 0) / 60
  );
  const xpEarned = lessonsCompleted * 50; // 50 XP за урок

  // 3. Статус стрика
  const daysSinceLastActivity = Math.floor(
    (new Date().getTime() - new Date(profile.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );
  const streakStatus = daysSinceLastActivity === 0 && profile.current_streak > 0 
    ? 'active' 
    : daysSinceLastActivity <= 1 
      ? 'at_risk' 
      : 'broken';

  // 4. Текущий контекст
  const { data: lastLesson } = await supabase
    .from('student_progress')
    .select('lesson_id, lessons(title, module_id, modules(title))')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  // 5. Цели
  const weeklyGoal = await getUserWeeklyGoals(userId);

  // 6. Недавние достижения (за 7 дней)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('title, unlocked_at')
    .eq('user_id', userId)
    .gte('unlocked_at', sevenDaysAgo.toISOString());

  return {
    profile: {
      user_id: profile.id,
      full_name: profile.full_name,
      level: profile.level,
      xp: profile.xp,
      current_streak: profile.current_streak,
      longest_streak: profile.longest_streak,
      last_activity_at: profile.last_activity_at,
    },
    last_3_days: {
      lessons_completed: lessonsCompleted,
      watch_time_minutes: watchTimeMinutes,
      xp_earned: xpEarned,
      streak_status: streakStatus,
    },
    current_context: {
      current_module: lastLesson?.lessons?.modules?.title || 'Не начал обучение',
      current_lesson: lastLesson?.lessons?.title || 'Нет активных уроков',
      completion_rate: 0, // TODO: вычислить из student_progress
    },
    goals: {
      weekly_goal: weeklyGoal[0] || null,
    },
    recent_achievements: achievements || [],
  };
}
```

---

#### 2. `GET /api/mentor/student/:userId/scenario`
**Создать функцию:**
```typescript
export async function detectStudentScenario(userId: string) {
  const data = await getStudentMentorData(userId, 3);
  
  const daysSinceLastActivity = Math.floor(
    (new Date().getTime() - new Date(data.profile.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  let scenario: string;
  let scenarioDescription: string;
  let recommendedTone: string;

  // Логика определения сценария
  if (data.recent_achievements.length > 0 || data.last_3_days.lessons_completed >= 3) {
    scenario = 'breakthrough';
    scenarioDescription = 'Прорыв: новое достижение или завершение многих уроков';
    recommendedTone = 'celebrate_and_praise';
  } else if (daysSinceLastActivity > 7) {
    scenario = 'long_inactive';
    scenarioDescription = 'Долгая неактивность (7+ дней)';
    recommendedTone = 'empathetic_comeback';
  } else if (daysSinceLastActivity <= 3 && data.last_3_days.lessons_completed === 0) {
    scenario = 'stagnant';
    scenarioDescription = 'Застой: заходит, но не проходит уроки';
    recommendedTone = 'gentle_motivation';
  } else if (daysSinceLastActivity <= 3 && data.last_3_days.lessons_completed > 0) {
    scenario = 'active';
    scenarioDescription = 'Активный студент с прогрессом';
    recommendedTone = 'praise_and_motivate';
  } else {
    scenario = 'struggling';
    scenarioDescription = 'Борется с материалом';
    recommendedTone = 'supportive_advice';
  }

  return {
    user_id: userId,
    scenario,
    scenario_description: scenarioDescription,
    factors: {
      days_since_last_activity: daysSinceLastActivity,
      lessons_last_3_days: data.last_3_days.lessons_completed,
      streak_active: data.last_3_days.streak_status === 'active',
      recent_achievements: data.recent_achievements.length,
    },
    recommended_tone: recommendedTone,
  };
}
```

---

#### 3. `POST /api/mentor/send-motivation`
**Создать функцию:**
```typescript
export async function sendMotivationMessage(userId: string, forceSend: boolean = false) {
  // 1. Проверить, нужно ли отправлять (если не force_send)
  if (!forceSend) {
    const { data: lastMessage } = await supabase
      .from('ai_mentor_messages')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMessage) {
      const daysSinceLastMessage = Math.floor(
        (new Date().getTime() - new Date(lastMessage.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLastMessage < 3) {
        return {
          success: false,
          message_sent: false,
          reason: 'Too soon (last message < 3 days ago)',
        };
      }
    }
  }

  // 2. Получить данные студента
  const studentData = await getStudentMentorData(userId, 3);
  const scenario = await detectStudentScenario(userId);

  // 3. Вызвать OpenAI Assistant для генерации сообщения
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const thread = await openai.beta.threads.create();
  
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: JSON.stringify({
      action: 'generate_motivation_message',
      student_data: studentData,
      scenario: scenario,
    }),
  });

  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: process.env.OPENAI_ASSISTANT_MENTOR_ID!,
  });

  // Ждать завершения
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (runStatus.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  // Получить сообщение
  const messages = await openai.beta.threads.messages.list(thread.id);
  const aiMessage = messages.data[0].content[0];
  const messageText = aiMessage.type === 'text' ? aiMessage.text.value : '';

  // 4. Отправить в Telegram
  const telegramResult = await sendTelegramMessage(userId, messageText);

  // 5. Логировать в БД
  await supabase.from('ai_mentor_messages').insert({
    user_id: userId,
    message_content: messageText,
    scenario: scenario.scenario,
    telegram_message_id: telegramResult.message_id,
  });

  return {
    success: true,
    message_sent: true,
    message_content: messageText,
    telegram_message_id: telegramResult.message_id,
  };
}
```

---

## 📅 CRON JOB SETUP

### Создать SQL функцию и cron job:

```sql
-- backend/supabase/migrations/20251115_mentor_cron.sql

-- Включить http extension (если не включен)
CREATE EXTENSION IF NOT EXISTS http;

-- Функция для отправки мотивационных сообщений
CREATE OR REPLACE FUNCTION send_mentor_messages_cron()
RETURNS void AS $$
DECLARE
  student RECORD;
  api_url TEXT;
  api_response http_response;
BEGIN
  api_url := 'http://localhost:3000/api/mentor/send-motivation';

  -- Найти студентов, которым нужно отправить сообщение
  FOR student IN
    SELECT 
      p.id,
      p.full_name,
      COALESCE(
        EXTRACT(EPOCH FROM (NOW() - am.created_at)) / 86400,
        999
      )::INTEGER as days_since_last_mentor_message
    FROM profiles p
    LEFT JOIN LATERAL (
      SELECT created_at 
      FROM ai_mentor_messages 
      WHERE user_id = p.id 
      ORDER BY created_at DESC 
      LIMIT 1
    ) am ON TRUE
    WHERE p.role = 'student'
      AND (
        am.created_at IS NULL -- Ещё ни разу не отправляли
        OR EXTRACT(EPOCH FROM (NOW() - am.created_at)) / 86400 >= 3 -- 3+ дня
      )
    LIMIT 100 -- Не более 100 за раз
  LOOP
    BEGIN
      -- HTTP POST запрос к Backend API
      SELECT * INTO api_response FROM http((
        'POST',
        api_url,
        ARRAY[http_header('Content-Type', 'application/json')],
        'application/json',
        json_build_object('user_id', student.id, 'force_send', false)::text
      )::http_request);

      IF api_response.status = 200 THEN
        RAISE NOTICE '✅ Отправлено сообщение студенту: % (ID: %)', student.full_name, student.id;
      ELSE
        RAISE WARNING '❌ Ошибка отправки студенту: % (Status: %)', student.full_name, api_response.status;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '❌ Исключение при отправке студенту: % (Error: %)', student.full_name, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создать cron job (каждый день в 8:00 утра)
SELECT cron.schedule(
  'send-mentor-messages-daily',
  '0 8 * * *', -- Каждый день в 8:00 UTC
  'SELECT send_mentor_messages_cron();'
);

-- Проверить, что cron job создан
SELECT * FROM cron.job WHERE jobname = 'send-mentor-messages-daily';
```

**Важно:** Замените `http://localhost:3000` на реальный URL вашего Backend (например, `https://api.onaiacademy.kz`)

---

## ✅ ЧЕКЛИСТ ВНЕДРЕНИЯ

### AI Analyst:
- [ ] Создан Assistant в OpenAI Dashboard
- [ ] ID добавлен в `backend/.env`
- [ ] Созданы 5 Backend эндпоинтов:
  - [ ] `/api/analytics/student/:userId/full`
  - [ ] `/api/analytics/cohort/:type`
  - [ ] `/api/analytics/course/:courseId/performance`
  - [ ] `/api/analytics/churn-prediction`
  - [ ] `/api/analytics/video/:lessonId/dropoff`
- [ ] Реализован Function Calling в `openaiService.ts`
- [ ] Протестированы запросы через curl/Postman
- [ ] Интегрировано в админ-панель

### AI Mentor:
- [ ] Создан Assistant в OpenAI Dashboard
- [ ] ID добавлен в `backend/.env`
- [ ] Создан Telegram Bot через @BotFather
- [ ] Токен бота добавлен в `backend/.env`
- [ ] Созданы 3 Backend эндпоинта:
  - [ ] `/api/mentor/student/:userId/data`
  - [ ] `/api/mentor/student/:userId/scenario`
  - [ ] `/api/mentor/send-motivation`
- [ ] Реализована отправка в Telegram
- [ ] Создана SQL функция `send_mentor_messages_cron()`
- [ ] Создан cron job (каждый день в 8:00)
- [ ] Протестирована ручная отправка
- [ ] Протестирована автоматическая отправка (cron)

---

## 📊 МОНИТОРИНГ И МЕТРИКИ

### Для AI Analyst:
```sql
-- Количество запросов к аналитику за последние 7 дней
SELECT 
  DATE(created_at) as date,
  COUNT(*) as requests
FROM ai_analyst_queries -- Создать эту таблицу для логирования
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Для AI Mentor:
```sql
-- Эффективность мотивационных сообщений
SELECT 
  amm.scenario,
  COUNT(*) as messages_sent,
  COUNT(CASE WHEN p.last_activity_at > amm.created_at + INTERVAL '24 hours' THEN 1 END) as returned_24h,
  ROUND(
    100.0 * COUNT(CASE WHEN p.last_activity_at > amm.created_at + INTERVAL '24 hours' THEN 1 END) / COUNT(*),
    2
  ) as response_rate
FROM ai_mentor_messages amm
JOIN profiles p ON amm.user_id = p.id
WHERE amm.created_at >= NOW() - INTERVAL '30 days'
GROUP BY amm.scenario
ORDER BY response_rate DESC;
```

---

## 🐛 TROUBLESHOOTING

### Проблема 1: AI Analyst не работает
**Симптомы:** 500 ошибка при запросе

**Решение:**
1. Проверить, что Assistant ID правильный в `.env`
2. Проверить, что все функции добавлены в Assistant (Dashboard)
3. Проверить логи Backend: `npm run dev`
4. Убедиться, что RLS политики не блокируют запросы

### Проблема 2: AI Mentor не отправляет сообщения
**Симптомы:** Cron job не срабатывает

**Решение:**
1. Проверить, что cron job создан: `SELECT * FROM cron.job;`
2. Проверить логи cron: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
3. Проверить, что `http` extension включен: `CREATE EXTENSION IF NOT EXISTS http;`
4. Убедиться, что Backend доступен из Supabase (не localhost!)

### Проблема 3: Telegram сообщения не доходят
**Симптомы:** API возвращает 200, но сообщений нет

**Решение:**
1. Проверить, что `telegram_chat_id` есть у пользователя в БД
2. Проверить токен бота в `.env`
3. Проверить, что бот не заблокирован пользователем
4. Протестировать Telegram API напрямую через curl

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- **OpenAI Assistants API:** https://platform.openai.com/docs/assistants/overview
- **OpenAI Functions:** https://platform.openai.com/docs/guides/function-calling
- **Supabase Cron:** https://supabase.com/docs/guides/database/extensions/pg_cron
- **Telegram Bot API:** https://core.telegram.org/bots/api

---

## 🎯 NEXT STEPS (После внедрения)

1. **A/B тестирование AI Mentor:**
   - Разные времена отправки (8:00 vs 10:00 vs 20:00)
   - Разная частота (3 дня vs 5 дней)
   - Разная тональность (дружеская vs энергичная)

2. **Расширение AI Analyst:**
   - Predictive analytics (ML модель для churn)
   - Кластеризация студентов (personas)
   - Recommendation engine для курсов

3. **Интеграция с Frontend:**
   - Админ-панель: дашборд с аналитикой от AI Analyst
   - Студенческий профиль: история мотивационных сообщений

4. **Мониторинг:**
   - Grafana dashboard для метрик AI агентов
   - Alerts при падении response rate < 20%

---

**Версия:** 2.0.0 Production Ready  
**Статус:** ✅ Готов к внедрению  
**Поддержка:** Обращайтесь если возникнут вопросы при внедрении

