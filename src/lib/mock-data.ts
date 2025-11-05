// Mock данные для админ-панели Activity
// Используется для демонстрации всех возможностей дашборда

export interface MockUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  stats: {
    total_xp: number;
    completed_lessons: number;
    achievements_count: number;
    avg_minutes_per_day: number;
    current_streak: number;
    questions_asked: number;
    completion_rate: number;
    average_score: number;
  };
  lastActive: string;
}

// Генерация случайного числа в диапазоне
const randomInRange = (min: number, max: number) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

// Генерация даты в прошлом
const randomPastDate = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInRange(0, daysAgo));
  return date.toISOString();
};

// Список имен для генерации пользователей
const firstNames = [
  'Алексей', 'Мария', 'Дмитрий', 'Анна', 'Иван', 'Елена', 'Сергей', 'Ольга',
  'Михаил', 'Наталья', 'Андрей', 'Татьяна', 'Владимир', 'Екатерина', 'Николай',
  'Юлия', 'Павел', 'Светлана', 'Артём', 'Ирина', 'Максим', 'Виктория', 'Денис',
  'Александра', 'Роман', 'Людмила', 'Евгений', 'Марина', 'Константин', 'Дарья'
];

const lastNames = [
  'Иванов', 'Петров', 'Сидоров', 'Козлов', 'Смирнов', 'Попов', 'Лебедев', 'Новиков',
  'Морозов', 'Волков', 'Соловьёв', 'Васильев', 'Зайцев', 'Павлов', 'Семёнов',
  'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фёдоров', 'Михайлов', 'Беляев',
  'Тарасов', 'Белов', 'Комаров', 'Орлов', 'Киселёв', 'Макаров', 'Андреев', 'Ковалёв'
];

// Генерация mock пользователей
export const generateMockUsers = (count: number = 50): MockUser[] => {
  const users: MockUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[randomInRange(0, firstNames.length - 1)];
    const lastName = lastNames[randomInRange(0, lastNames.length - 1)];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    
    // Генерируем статистику с правдоподобными значениями
    const xp = randomInRange(100, 25000);
    const completedLessons = randomInRange(5, 150);
    const achievementsCount = randomInRange(1, 25);
    const avgMinutesPerDay = randomInRange(10, 180);
    const currentStreak = randomInRange(0, 45);
    const questionsAsked = randomInRange(5, 200);
    const completionRate = randomInRange(45, 100);
    const averageScore = randomInRange(60, 100) / 10; // 6.0 - 10.0
    
    users.push({
      id: `mock-user-${i + 1}`,
      email,
      full_name: fullName,
      avatar_url: null,
      role: i === 0 ? 'admin' : 'student',
      created_at: randomPastDate(365),
      stats: {
        total_xp: xp,
        completed_lessons: completedLessons,
        achievements_count: achievementsCount,
        avg_minutes_per_day: avgMinutesPerDay,
        current_streak: currentStreak,
        questions_asked: questionsAsked,
        completion_rate: completionRate,
        average_score: averageScore,
      },
      lastActive: randomPastDate(30),
    });
  }
  
  // Сортируем по XP (чтобы топ ученики были реалистичны)
  return users.sort((a, b) => b.stats.total_xp - a.stats.total_xp);
};

// Генерируем 50 mock пользователей
export const MOCK_USERS = generateMockUsers(50);

// Mock статистика платформы
export const MOCK_PLATFORM_STATS = {
  active_today: 42,
  active_today_change: 15,
  messages_today: 387,
  messages_today_change: 23,
  active_week: 156,
  active_week_change: 8,
  at_risk: 12,
};

// Mock данные для графика активности за неделю
export const MOCK_WEEKLY_ACTIVITY = [
  { day: 'Пн', users: 120, messages: 450 },
  { day: 'Вт', users: 145, messages: 580 },
  { day: 'Ср', users: 160, messages: 620 },
  { day: 'Чт', users: 135, messages: 510 },
  { day: 'Пт', users: 170, messages: 680 },
  { day: 'Сб', users: 95, messages: 320 },
  { day: 'Вс', users: 85, messages: 280 },
];

// Mock данные для недельного тренда
export const MOCK_WEEKLY_TREND = [
  { week: 'Нед 1', active: 320, atRisk: 12 },
  { week: 'Нед 2', active: 345, atRisk: 8 },
  { week: 'Нед 3', active: 380, atRisk: 15 },
  { week: 'Нед 4', active: 420, atRisk: 10 },
];

// Mock достижения учеников
export const MOCK_ACHIEVEMENTS_DATA = {
  total_xp_earned: MOCK_USERS.reduce((acc, user) => acc + user.stats.total_xp, 0),
  avg_streak: Math.round(MOCK_USERS.reduce((acc, user) => acc + user.stats.current_streak, 0) / MOCK_USERS.length),
  modules_completed: MOCK_USERS.reduce((acc, user) => acc + user.stats.completed_lessons, 0),
  top_performers: 15,
};

// Mock AI Diagnostician метрики
export const MOCK_AI_DIAGNOSTICS_DATA = {
  engagement_score: 78,
  at_risk_students: 12,
  stuck_lessons_count: 8,
  avg_response_time: 4.2,
  recommendations_sent: 156,
  success_rate: 85,
};

// Mock AI Curator метрики
export const MOCK_AI_CURATOR_DATA = {
  motivation_messages: 234,
  personalized_paths: 45,
  engagement_boost: 23,
  retention_rate: 89,
};

// Mock маркетинговые данные
export const MOCK_MARKETING_DATA = {
  traffic_sources: [
    { name: 'Органика', value: 45, color: '#10b981' },
    { name: 'Реклама', value: 30, color: '#3b82f6' },
    { name: 'Соц. сети', value: 15, color: '#8b5cf6' },
    { name: 'Прямой', value: 10, color: '#f59e0b' },
  ],
  bounce_rate: 23,
  avg_session: 8.5,
  conversion_rate: 4.2,
};

// Mock достижения для конкретного пользователя
export const generateMockUserAchievements = (userId: string) => [
  {
    id: `achievement-1-${userId}`,
    title: '🚀 Первые шаги',
    description: 'Завершите первый урок',
    completed: true,
    unlocked_at: randomPastDate(180),
  },
  {
    id: `achievement-2-${userId}`,
    title: '🔥 Горячая серия',
    description: 'Достигните стрика в 7 дней',
    completed: true,
    unlocked_at: randomPastDate(150),
  },
  {
    id: `achievement-3-${userId}`,
    title: '⚡ Энергетик',
    description: 'Заработайте 1000 XP',
    completed: true,
    unlocked_at: randomPastDate(120),
  },
  {
    id: `achievement-4-${userId}`,
    title: '📚 Книжный червь',
    description: 'Завершите 10 модулей',
    completed: randomInRange(0, 1) === 1,
    unlocked_at: randomInRange(0, 1) === 1 ? randomPastDate(90) : null,
  },
  {
    id: `achievement-5-${userId}`,
    title: '🎯 Мастер точности',
    description: 'Ответьте правильно на 50 вопросов подряд',
    completed: randomInRange(0, 1) === 1,
    unlocked_at: randomInRange(0, 1) === 1 ? randomPastDate(60) : null,
  },
  {
    id: `achievement-6-${userId}`,
    title: '👑 Король платформы',
    description: 'Войдите в топ-10 учеников',
    completed: randomInRange(0, 1) === 1,
    unlocked_at: randomInRange(0, 1) === 1 ? randomPastDate(30) : null,
  },
  {
    id: `achievement-7-${userId}`,
    title: '💎 Легенда',
    description: 'Заработайте 10,000 XP',
    completed: false,
    unlocked_at: null,
  },
];

// Mock диагностика для конкретного пользователя
export const generateMockUserDiagnostics = (user: MockUser) => ({
  lessons_completed: user.stats.completed_lessons,
  avg_minutes_per_day: user.stats.avg_minutes_per_day,
  current_streak: user.stats.current_streak,
  flag_low_engagement: user.stats.current_streak < 3,
  stuck_lessons: user.stats.completion_rate < 70 
    ? ['Модуль 3: Интеграция API', 'Модуль 5: Основы ML']
    : [],
  recommendation: user.stats.completion_rate < 70
    ? '🔍 Рекомендуется персонализированная помощь AI-куратора. Ученик испытывает трудности с модулями по интеграции и ML.'
    : user.stats.current_streak < 3
    ? '💡 Низкая вовлечённость. Рекомендуется отправить мотивационное сообщение и напомнить о целях обучения.'
    : '✅ Отличный прогресс! Продолжайте в том же духе. Можно предложить более сложные задания для роста.',
});

// Флаг для включения/выключения mock данных
export const USE_MOCK_DATA = true;

