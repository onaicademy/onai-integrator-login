# 🎯 АРХИТЕКТУРА ОБЪЕКТИВНЫХ МЕТРИК

**Дата:** 15 ноября 2025  
**Принцип:** Показываем только то, что можем ОБЪЕКТИВНО измерить

---

## 1️⃣ **ДЛЯ СТУДЕНТА (Profile / NeuroHub)**

### **ПРИНЦИП:** 
Студент видит только **ФАКТЫ** о своем обучении. Никаких субъективных оценок!

### **МЕТРИКИ:**

#### ✅ **Прогресс обучения**
```typescript
interface StudentProgress {
  completedLessons: number;        // Завершено уроков
  totalLessons: number;             // Всего уроков в курсе
  progressPercentage: number;       // Процент завершения
  currentModule: string;            // Текущий модуль
  nextLesson: string;               // Следующий урок
}
```

**Источник данных:**
```sql
SELECT 
  COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_lessons,
  COUNT(*) as total_lessons,
  ROUND(COUNT(CASE WHEN is_completed = true THEN 1 END) * 100.0 / COUNT(*), 0) as progress_percentage
FROM public.student_progress sp
JOIN public.lessons l ON l.id = sp.lesson_id
WHERE sp.user_id = '<user_id>';
```

---

#### ✅ **Время обучения**
```typescript
interface WatchTime {
  totalMinutes: number;            // Всего минут
  thisWeek: number;                // За эту неделю
  average: number;                 // Среднее в день
}
```

**Источник данных:**
```sql
SELECT 
  SUM(watch_time_seconds) / 60 as total_minutes,
  SUM(CASE 
    WHEN last_watched_at >= NOW() - INTERVAL '7 days' 
    THEN watch_time_seconds 
  END) / 60 as this_week_minutes
FROM public.student_progress
WHERE user_id = '<user_id>';
```

---

#### ✅ **Стрик (Streak)**
```typescript
interface Streak {
  currentDays: number;             // Текущий стрик
  longestDays: number;             // Рекорд
  lastActivityDate: Date;          // Последняя активность
}
```

**Логика расчета:**
```typescript
// Студент смотрит уроки каждый день подряд = +1 день к стрику
// Пропустил день = стрик сбрасывается до 0
// Считаем по last_watched_at

function calculateStreak(userId: string): number {
  // Получаем все дни активности
  const activityDays = await db.query(`
    SELECT DISTINCT DATE(last_watched_at) as activity_date
    FROM public.student_progress
    WHERE user_id = $1
    ORDER BY activity_date DESC
  `, [userId]);
  
  let streak = 0;
  let currentDate = new Date();
  
  // Идем по дням назад
  for (const day of activityDays) {
    const dayDate = new Date(day.activity_date);
    const diffDays = Math.floor((currentDate - dayDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === streak) {
      streak++;
    } else {
      break; // Пропуск найден, стоп
    }
  }
  
  return streak;
}
```

---

#### ✅ **XP и Уровень**
```typescript
interface Experience {
  currentXP: number;               // Текущий XP
  level: number;                   // Текущий уровень
  nextLevelXP: number;             // XP для следующего уровня
  percentage: number;              // % до следующего уровня
}
```

**Логика начисления XP:**
```typescript
// XP начисляется за:
const XP_REWARDS = {
  LESSON_COMPLETED: 50,           // Завершил урок
  MODULE_COMPLETED: 200,          // Завершил модуль
  COURSE_COMPLETED: 500,          // Завершил курс
  STREAK_7_DAYS: 100,             // 7 дней стрика
  STREAK_30_DAYS: 500,            // 30 дней стрика
  QUESTION_TO_AI: 5,              // Задал вопрос AI-куратору
  ACHIEVEMENT_UNLOCKED: 100,      // Разблокировал достижение
};

// Расчет уровня:
function calculateLevel(xp: number): number {
  // Уровень 1: 0-1000 XP
  // Уровень 2: 1001-2000 XP
  // Уровень 3: 2001-3500 XP
  // Уровень N: требуется на 500 больше чем для N-1
  
  let level = 1;
  let xpForNextLevel = 1000;
  let totalXP = 0;
  
  while (xp >= totalXP + xpForNextLevel) {
    totalXP += xpForNextLevel;
    level++;
    xpForNextLevel += 500; // Каждый уровень на 500 сложнее
  }
  
  return level;
}
```

**Источник данных:**
```sql
-- Таблица profiles
SELECT level, xp FROM public.profiles WHERE id = '<user_id>';
```

---

#### ✅ **Достижения (Achievements)**
```typescript
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: Date | null;       // null = еще не разблокировано
  progress: number;               // Прогресс к разблокировке (0-100)
}

const ACHIEVEMENTS = [
  {
    id: 'first_lesson',
    title: 'Первые шаги',
    description: 'Завершите первый урок',
    icon: '🎓',
    xpReward: 50,
    condition: (student) => student.completedLessons >= 1
  },
  {
    id: 'marathoner',
    title: 'Марафонец',
    description: 'Поддерживайте стрик 7 дней',
    icon: '🔥',
    xpReward: 100,
    condition: (student) => student.currentStreak >= 7
  },
  {
    id: 'expert',
    title: 'Эксперт',
    description: 'Завершите 50 уроков',
    icon: '⭐',
    xpReward: 500,
    condition: (student) => student.completedLessons >= 50
  },
  {
    id: 'time_master',
    title: 'Мастер времени',
    description: 'Проведите 10 часов в обучении',
    icon: '⏰',
    xpReward: 200,
    condition: (student) => student.totalWatchTimeMinutes >= 600
  },
];
```

**Источник данных:**
```sql
-- Таблица user_achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
```

---

#### ✅ **Недельная цель**
```typescript
interface WeeklyGoal {
  targetLessons: number;           // Цель: уроков
  currentLessons: number;          // Текущий прогресс
  percentage: number;              // %
  weekStart: Date;
  weekEnd: Date;
}
```

**Источник данных:**
```sql
-- Таблица user_goals
CREATE TABLE public.user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL,  -- 'weekly_lessons'
  target_value INTEGER NOT NULL,   -- 10 уроков
  current_value INTEGER DEFAULT 0,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, goal_type, week_start_date)
);
```

---

## 2️⃣ **ДЛЯ AI-АНАЛИТИКА (Admin Panel)**

### **ПРИНЦИП:**
AI-Аналитик видит **ОБЪЕКТИВНЫЕ МЕТРИКИ + AI-ИНТЕРПРЕТАЦИЮ**

### **МЕТРИКИ:**

#### ✅ **Video Analytics (Объективная)**
```typescript
interface VideoAnalytics {
  // Насколько студент досматривает видео
  averageWatchRate: number;        // 0-100% (среднее по всем видео)
  
  // Где бросает смотреть
  dropOffRate: number;             // % видео где не досмотрел до конца
  
  // Сколько перематывает назад (материал сложный?)
  rewindCount: number;             // Количество перемоток за период
  
  // Пропускает ли части видео
  skipCount: number;               // Количество пропусков
  
  // Скорость просмотра
  averagePlaybackSpeed: number;    // 1.0x, 1.5x, 2.0x
}
```

**Источник данных:**
```sql
SELECT 
  AVG(video_progress) as avg_watch_rate,
  COUNT(CASE WHEN video_progress < 90 THEN 1 END) * 100.0 / COUNT(*) as drop_off_rate
FROM public.student_progress
WHERE user_id = '<user_id>';

SELECT 
  COUNT(*) as rewind_count
FROM public.video_analytics
WHERE user_id = '<user_id>' 
AND event_type = 'seek'
AND timestamp_seconds < (
  SELECT MAX(timestamp_seconds) 
  FROM public.video_analytics va2 
  WHERE va2.video_id = video_analytics.video_id 
  AND va2.session_id = video_analytics.session_id
  AND va2.created_at < video_analytics.created_at
);
```

---

#### ✅ **Engagement Score (Объективный)**
```typescript
interface EngagementMetrics {
  // Активность
  daysActive: number;              // Дней активен за месяц
  daysInactive: number;            // Дней неактивен подряд
  
  // Взаимодействие
  lessonsStarted: number;          // Начал уроков
  lessonsCompleted: number;        // Завершил уроков
  completionRate: number;          // % завершения
  
  // Коммуникация с AI
  aiCuratorMessages: number;       // Сообщений AI-куратору
  aiCuratorSessions: number;       // Сессий общения
  
  // Итоговый score (0-100)
  engagementScore: number;
}
```

**Расчет Engagement Score:**
```typescript
function calculateEngagementScore(metrics: EngagementMetrics): number {
  let score = 0;
  
  // 1. Активность (40 баллов)
  const activityScore = Math.min(40, (metrics.daysActive / 30) * 40);
  score += activityScore;
  
  // 2. Completion Rate (30 баллов)
  score += metrics.completionRate * 0.3;
  
  // 3. Взаимодействие с AI (20 баллов)
  const aiInteractionScore = Math.min(20, (metrics.aiCuratorMessages / 50) * 20);
  score += aiInteractionScore;
  
  // 4. Регулярность (10 баллов) - нет пропусков
  const regularityScore = metrics.daysInactive === 0 ? 10 : Math.max(0, 10 - metrics.daysInactive * 2);
  score += regularityScore;
  
  return Math.round(score);
}
```

---

#### ✅ **Churn Risk (Риск отсева)**
```typescript
interface ChurnRisk {
  riskScore: number;               // 0-100 (0=низкий риск, 100=высокий)
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    daysInactive: number;          // Дней неактивен
    dropOffRate: number;           // % незавершенных видео
    completionRate: number;        // % завершенных уроков
    aiQuestions: number;           // Вопросов к AI (много = сложность)
  };
  prediction: string;              // AI-интерпретация
}
```

**Расчет Churn Risk:**
```typescript
function calculateChurnRisk(student: StudentMetrics): ChurnRisk {
  let riskScore = 0;
  
  // 1. Дни неактивности (40 баллов)
  if (student.daysInactive === 0) riskScore += 0;
  else if (student.daysInactive <= 2) riskScore += 10;
  else if (student.daysInactive <= 5) riskScore += 25;
  else if (student.daysInactive <= 7) riskScore += 35;
  else riskScore += 40;
  
  // 2. Drop-off rate (30 баллов)
  riskScore += Math.min(30, student.dropOffRate * 0.3);
  
  // 3. Completion rate (20 баллов) - низкий completion = высокий риск
  riskScore += Math.min(20, (100 - student.completionRate) * 0.2);
  
  // 4. Недавняя активность (10 баллов)
  const hoursSinceLastActivity = (Date.now() - student.lastActivityAt) / (1000 * 60 * 60);
  if (hoursSinceLastActivity > 72) riskScore += 10;
  else if (hoursSinceLastActivity > 48) riskScore += 5;
  
  // Определяем уровень риска
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore < 25) riskLevel = 'low';
  else if (riskScore < 50) riskLevel = 'medium';
  else if (riskScore < 75) riskLevel = 'high';
  else riskLevel = 'critical';
  
  return {
    riskScore: Math.round(riskScore),
    riskLevel,
    factors: {
      daysInactive: student.daysInactive,
      dropOffRate: student.dropOffRate,
      completionRate: student.completionRate,
      aiQuestions: student.aiCuratorMessages
    },
    prediction: generateChurnPrediction(riskLevel, student)
  };
}
```

---

#### ✅ **AI-Анализ настроения (через чаты)**
```typescript
interface SentimentAnalysis {
  // Тональность сообщений студента к AI-куратору
  positivePercent: number;         // % позитивных сообщений
  neutralPercent: number;          // % нейтральных
  negativePercent: number;         // % негативных
  
  // Типы вопросов
  clarificationQuestions: number;  // "А как это сделать?"
  confusionQuestions: number;      // "Не понял, объясни"
  technicalQuestions: number;      // "Ошибка X, что делать?"
  
  // Эмоциональные маркеры
  emotionalMarkers: {
    thanks: number;                // "спасибо", "круто"
    frustration: number;           // "не получается", "сложно"
    excitement: number;            // "классно!", "получилось!"
  };
  
  // AI-интерпретация
  aiInsight: string;
}
```

**Источник данных:**
```sql
-- Анализируем сообщения из curator_chat_history
SELECT 
  message_text,
  created_at
FROM public.curator_chat_history
WHERE user_id = '<user_id>'
AND role = 'user' -- только сообщения студента
ORDER BY created_at DESC
LIMIT 100;
```

**AI-Обработка:**
```typescript
// Используем OpenAI для анализа тональности
async function analyzeSentiment(messages: string[]): Promise<SentimentAnalysis> {
  const prompt = `
Проанализируй сообщения студента к AI-куратору.
Определи:
1. Тональность каждого сообщения (позитивная/нейтральная/негативная)
2. Тип вопроса (уточняющий/непонимание/техническая проблема)
3. Эмоциональные маркеры (благодарность/фрустрация/восторг)

Сообщения:
${messages.join('\n')}

Верни JSON:
{
  "positivePercent": 70,
  "neutralPercent": 20,
  "negativePercent": 10,
  "emotionalMarkers": {
    "thanks": 10,
    "frustration": 3,
    "excitement": 5
  },
  "aiInsight": "Студент активно учится, задает уточняющие вопросы, благодарит за помощь. Иногда сталкивается со сложностями, но справляется."
}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

---

## 3️⃣ **ДЛЯ AI-МЕНТОРА (Telegram)**

### **ПРИНЦИП:**
AI-Ментор работает на основе **ОБЪЕКТИВНЫХ ДАННЫХ**, не спрашивает "как настроение?"

### **ЛОГИКА МОТИВАЦИИ:**

```typescript
interface MentorDecision {
  shouldSendMessage: boolean;
  messageType: 'GREAT_JOB' | 'KEEP_GOING' | 'COME_BACK' | 'NEED_HELP';
  message: string;
  reason: string;
}

function decideMentorAction(student: StudentMetrics): MentorDecision {
  const { daysInactive, completionRate, currentStreak, churnRisk } = student;
  
  // 1. Студент неактивен 3+ дней → COME_BACK
  if (daysInactive >= 3) {
    return {
      shouldSendMessage: true,
      messageType: 'COME_BACK',
      message: `Привет! Заметил, что ты не заходил ${daysInactive} дней. Твой прогресс: ${completionRate}%. Продолжим обучение? 🚀`,
      reason: `Inactive for ${daysInactive} days`
    };
  }
  
  // 2. Студент активен, стрик 7+ дней → GREAT_JOB
  if (currentStreak >= 7 && completionRate > 50) {
    return {
      shouldSendMessage: true,
      messageType: 'GREAT_JOB',
      message: `Невероятно! ${currentStreak} дней подряд ты учишься! 🔥 Прогресс: ${completionRate}%. Так держать!`,
      reason: `High streak: ${currentStreak} days`
    };
  }
  
  // 3. Студент начал много уроков, но не завершает → NEED_HELP
  if (student.lessonsStarted > student.lessonsCompleted * 2 && churnRisk.riskLevel === 'high') {
    return {
      shouldSendMessage: true,
      messageType: 'NEED_HELP',
      message: `Вижу, что материал может быть сложным. Ты начал ${student.lessonsStarted} уроков, завершил ${student.lessonsCompleted}. Если нужна помощь — задай вопрос AI-Куратору на платформе! 💬`,
      reason: `Low completion rate: ${completionRate}%`
    };
  }
  
  // 4. Студент прогрессирует нормально → KEEP_GOING
  if (daysInactive === 0 && completionRate >= 20) {
    return {
      shouldSendMessage: true,
      messageType: 'KEEP_GOING',
      message: `Отличная работа! Ты завершил ${student.completedLessons} уроков. Следующий шаг: "${student.nextLesson}". Вперед! 💪`,
      reason: `Good progress: ${completionRate}%`
    };
  }
  
  // Не отправляем сообщение
  return {
    shouldSendMessage: false,
    messageType: 'KEEP_GOING',
    message: '',
    reason: 'No action needed'
  };
}
```

---

## 📊 **ИТОГОВАЯ ТАБЛИЦА МЕТРИК:**

| Метрика | Для студента | Для админа | Объективная? |
|---------|-------------|-----------|-------------|
| Прогресс обучения (%) | ✅ | ✅ | ✅ Да |
| Завершенные уроки | ✅ | ✅ | ✅ Да |
| Время обучения | ✅ | ✅ | ✅ Да |
| Стрик (дни) | ✅ | ✅ | ✅ Да |
| XP / Уровень | ✅ | ✅ | ✅ Да |
| Достижения | ✅ | ✅ | ✅ Да |
| Недельная цель | ✅ | ✅ | ✅ Да |
| **"Энергия"** | ❌ НЕТ | ❌ НЕТ | ❌ Субъективно |
| **"Настроение"** | ❌ НЕТ | ❌ НЕТ | ❌ Субъективно |
| Video Analytics | ❌ | ✅ | ✅ Да |
| Engagement Score | ❌ | ✅ | ✅ Да (расчет) |
| Churn Risk | ❌ | ✅ | ✅ Да (расчет) |
| Sentiment Analysis | ❌ | ✅ | ⚠️ AI-интерпретация |

---

## ✅ **ФИНАЛЬНОЕ РЕШЕНИЕ:**

### **УБИРАЕМ ИЗ ФРОНТЕНДА:**
- ❌ "Энергия: 78%"
- ❌ "Настроение: 😊"
- ❌ Любые субъективные метрики

### **ОСТАВЛЯЕМ В ФРОНТЕНДЕ:**
- ✅ Прогресс обучения: 45% (12/50 уроков)
- ✅ Время обучения: 8ч 45м
- ✅ Стрик: 7 дней 🔥
- ✅ Уровень: 3 (1,240 / 2,000 XP)
- ✅ Достижения: 🎓🔥⭐
- ✅ Недельная цель: 7/10 уроков (70%)

### **ДОБАВЛЯЕМ В АДМИН-ПАНЕЛЬ:**
- ✅ Video Analytics (объективная)
- ✅ Engagement Score (расчет на основе фактов)
- ✅ Churn Risk (расчет на основе фактов)
- ✅ AI-Sentiment Analysis (анализ чатов с AI-куратором)

---

**ВСЁ ОБЪЕКТИВНО. ВСЁ ИЗМЕРИМО. ВСЁ ЧЕСТНО.** 🎯

