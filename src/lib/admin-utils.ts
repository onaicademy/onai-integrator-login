/**
 * Утилиты для админ-панели: получение и анализ данных пользователей
 */

import { supabase } from './supabase';

// ============= ТИПЫ =============

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  achievement_id: string;
  unlocked_at: string;
}

export interface AchievementWithStatus extends Achievement {
  completed: boolean;
  unlocked_at?: string;
}

export interface UserProgress {
  lesson_id: string;
  is_completed: boolean;
  xp_earned: number;
  seconds_watched: number;
  updated_at: string;
}

export interface DailyActivity {
  date: string;
  minutes: number;
  lessons_watched: number;
  xp_earned: number;
}

export interface UserStats {
  totalXP: number;
  completedLessons: number;
  totalSecondsWatched: number;
  achievementsCount: number;
  currentStreak: number;
  avgMinutesPerDay: number;
}

export interface UserActivityLog {
  id: string;
  page: string;
  action: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface DiagnosticsData {
  lessons_completed: number;
  avg_minutes_per_day: number;
  current_streak: number;
  flag_low_engagement: boolean;
  stuck_lessons: string[];
  recommendation: string;
}

export interface UserDiagnostics {
  id: string;
  user_id: string;
  data_json: DiagnosticsData;
  created_at: string;
}

// ============= ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ =============

/**
 * Получить все достижения из базы
 */
export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('rarity', { ascending: false });

  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Получить достижения пользователя
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('achievement_id, unlocked_at')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user achievements:', error);
    return [];
  }

  return data || [];
}

/**
 * Получить достижения пользователя с полной информацией
 */
export async function getUserAchievementsWithDetails(
  userId: string
): Promise<AchievementWithStatus[]> {
  // Получаем все достижения
  const allAchievements = await getAllAchievements();

  // Получаем достижения пользователя
  const userAchievements = await getUserAchievements(userId);

  // Создаем Map для быстрого поиска
  const userAchievementMap = new Map(
    userAchievements.map(ua => [ua.achievement_id, ua.unlocked_at])
  );

  // Объединяем данные
  return allAchievements.map(achievement => ({
    ...achievement,
    completed: userAchievementMap.has(achievement.id),
    unlocked_at: userAchievementMap.get(achievement.id),
  }));
}

/**
 * Получить прогресс пользователя по урокам
 */
export async function getUserProgress(userId: string): Promise<UserProgress[]> {
  const { data, error } = await supabase
    .from('progress')
    .select('lesson_id, is_completed, xp_earned, seconds_watched, updated_at')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user progress:', error);
    return [];
  }

  return data || [];
}

/**
 * Получить статистику пользователя (XP, завершенные уроки, etc.)
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  // Получаем прогресс
  const progress = await getUserProgress(userId);

  // Считаем метрики
  const totalXP = progress.reduce((sum, p) => sum + (p.xp_earned || 0), 0);
  const completedLessons = progress.filter(p => p.is_completed).length;
  const totalSecondsWatched = progress.reduce(
    (sum, p) => sum + (p.seconds_watched || 0),
    0
  );

  // Получаем достижения
  const userAchievements = await getUserAchievements(userId);
  const achievementsCount = userAchievements.length;

  // Получаем активность за последние 7 дней
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: activityData } = await supabase
    .from('daily_activity')
    .select('date, minutes')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false });

  // Считаем стрик и среднее время
  let currentStreak = 0;
  let totalMinutes = 0;

  if (activityData && activityData.length > 0) {
    totalMinutes = activityData.reduce((sum, day) => sum + (day.minutes || 0), 0);

    // Считаем стрик (последовательные дни)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const hasActivity = activityData.some(
        day => day.date === dateStr && day.minutes > 0
      );

      if (hasActivity) {
        currentStreak++;
      } else if (i > 0) {
        // Если пропущен день (не сегодня) - стрик прерывается
        break;
      }
    }
  }

  const avgMinutesPerDay = totalMinutes / 7;

  return {
    totalXP,
    completedLessons,
    totalSecondsWatched,
    achievementsCount,
    currentStreak,
    avgMinutesPerDay: Math.round(avgMinutesPerDay),
  };
}

/**
 * Получить ежедневную активность пользователя за период
 */
export async function getUserDailyActivity(
  userId: string,
  days: number = 7
): Promise<DailyActivity[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('daily_activity')
    .select('date, minutes, lessons_watched, xp_earned')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily activity:', error);
    return [];
  }

  return data || [];
}

/**
 * Получить лог активности пользователя (последние N записей)
 */
export async function getUserActivityLog(
  userId: string,
  limit: number = 20
): Promise<UserActivityLog[]> {
  const { data, error } = await supabase
    .from('user_activity')
    .select('id, page, action, meta, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching activity log:', error);
    return [];
  }

  return data || [];
}

/**
 * Получить последнюю диагностику пользователя
 */
export async function getUserLatestDiagnostics(
  userId: string
): Promise<UserDiagnostics | null> {
  const { data, error } = await supabase
    .from('diagnostics_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching diagnostics:', error);
    return null;
  }

  return data;
}

/**
 * Получить всю историю диагностики пользователя
 */
export async function getUserDiagnosticsHistory(
  userId: string
): Promise<UserDiagnostics[]> {
  const { data, error } = await supabase
    .from('diagnostics_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching diagnostics history:', error);
    return [];
  }

  return data || [];
}

// ============= ФУНКЦИИ ДЛЯ АДМИН-АНАЛИТИКИ =============

/**
 * Получить общую статистику платформы
 */
export async function getPlatformStats() {
  try {
    // Активные пользователи сегодня (с активностью за сегодня)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayActive, error: todayError } = await supabase
      .from('daily_activity')
      .select('user_id', { count: 'exact', head: true })
      .eq('date', today)
      .gt('minutes', 0);

    if (todayError) console.error('Error fetching today active:', todayError);

    // Активные пользователи на этой неделе
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: weekActive, error: weekError } = await supabase
      .from('daily_activity')
      .select('user_id', { count: 'exact', head: false })
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .gt('minutes', 0);

    if (weekError) console.error('Error fetching week active:', weekError);

    // Уникальные пользователи за неделю
    const uniqueWeekUsers = new Set(weekActive?.map(a => a.user_id) || []).size;

    // Пользователи в риске (без активности 7+ дней)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id');

    if (usersError) console.error('Error fetching users:', usersError);

    const allUserIds = new Set(allUsers?.map(u => u.id) || []);
    const activeUserIds = new Set(weekActive?.map(a => a.user_id) || []);
    const atRiskCount = allUserIds.size - activeUserIds.size;

    // Сообщения (можно взять из user_activity где action содержит "message")
    const { data: todayMessages, error: messagesError } = await supabase
      .from('user_activity')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().setHours(0, 0, 0, 0).toString())
      .ilike('action', '%message%');

    if (messagesError) console.error('Error fetching messages:', messagesError);

    return {
      active_today: todayActive?.length || 0,
      active_today_change: 0,
      messages_today: messagesError ? 0 : ((todayMessages as { count?: number })?.count || 0),
      messages_today_change: 0,
      active_week: uniqueWeekUsers,
      active_week_change: 0,
      at_risk: atRiskCount,
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return {
      active_today: 0,
      active_today_change: 0,
      messages_today: 0,
      messages_today_change: 0,
      active_week: 0,
      active_week_change: 0,
      at_risk: 0,
    };
  }
}

/**
 * Получить данные активности по дням для графика
 */
export async function getWeeklyActivityData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('daily_activity')
    .select('date, user_id, minutes')
    .gte('date', sevenDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching weekly activity:', error);
    return [];
  }

  // Группируем по дням
  const dayMap = new Map<string, { users: Set<string>; minutes: number }>();

  data?.forEach(activity => {
    if (!dayMap.has(activity.date)) {
      dayMap.set(activity.date, { users: new Set(), minutes: 0 });
    }
    const day = dayMap.get(activity.date)!;
    day.users.add(activity.user_id);
    day.minutes += activity.minutes || 0;
  });

  // Преобразуем в формат для графика
  const daysOfWeek = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const result = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayName = daysOfWeek[date.getDay()];

    const dayData = dayMap.get(dateStr);

    result.push({
      day: dayName,
      users: dayData?.users.size || 0,
      messages: 0, // TODO: добавить подсчет сообщений из user_activity
    });
  }

  return result;
}

/**
 * Получить список всех пользователей с базовой информацией
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data || [];
}

/**
 * Создать тестовые достижения (если их еще нет)
 */
export async function seedAchievements() {
  const testAchievements = [
    {
      title: 'Первый шаг',
      description: 'Завершите первый урок',
      icon: 'Footprints',
      rarity: 'common' as const,
    },
    {
      title: 'Быстрый старт',
      description: 'Завершите 5 уроков за неделю',
      icon: 'Zap',
      rarity: 'common' as const,
    },
    {
      title: 'Марафонец',
      description: 'Занимайтесь 7 дней подряд',
      icon: 'Flame',
      rarity: 'rare' as const,
    },
    {
      title: 'Знаток AI',
      description: 'Завершите курс по AI',
      icon: 'Brain',
      rarity: 'epic' as const,
    },
    {
      title: 'Мастер интеграции',
      description: 'Завершите все проектные модули',
      icon: 'Trophy',
      rarity: 'legendary' as const,
    },
  ];

  const { data, error } = await supabase
    .from('achievements')
    .insert(testAchievements)
    .select();

  if (error) {
    console.error('Error seeding achievements:', error);
    return null;
  }

  return data;
}

