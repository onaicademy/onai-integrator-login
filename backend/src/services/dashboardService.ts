/**
 * Dashboard Service
 * Сервис для получения данных дашборда студента (для /neurohub)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DashboardActivity {
  date: string;
  lessons_completed: number;
  watch_time_minutes: number;
  xp_earned: number;
}

interface DashboardData {
  user_info: {
    full_name: string;
    avatar_url: string | null;
    level: number;
    xp: number;
    current_streak: number;
  };
  today_stats: {
    lessons_completed: number;
    watch_time_minutes: number;
    xp_earned: number;
  };
  week_activity: DashboardActivity[];
  recent_achievements: Array<{
    id: string;
    title: string;
    icon: string;
    xp_reward: number;
    unlocked_at: string;
  }>;
  active_missions: Array<{
    id: string;
    title: string;
    description: string;
    current_value: number;
    target_value: number;
    progress_percent: number;
    xp_reward: number;
  }>;
}

/**
 * Получить данные для дашборда студента
 */
export async function getStudentDashboard(userId: string): Promise<DashboardData> {
  try {
    console.log('📊 [DashboardService] Получаем dashboard для:', userId);

    // 1. Информация о пользователе
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, level, xp, current_streak')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    // 2. Статистика за сегодня
    const today = new Date().toISOString().split('T')[0];
    const { data: todayProgress, error: todayError } = await supabase
      .from('student_progress')
      .select('is_completed, watch_time_seconds, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', `${today}T00:00:00`)
      .lte('updated_at', `${today}T23:59:59`);

    if (todayError) {
      console.warn('⚠️ Ошибка получения статистики за сегодня:', todayError);
    }

    const todayLessonsCompleted = todayProgress?.filter(p => p.is_completed).length || 0;
    const todayWatchTime = todayProgress?.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0) || 0;
    const todayXpEarned = todayLessonsCompleted * 50; // 50 XP за урок

    // 3. Активность за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: weekProgress, error: weekError } = await supabase
      .from('student_progress')
      .select('completed_at, watch_time_seconds')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .gte('completed_at', `${sevenDaysAgoStr}T00:00:00`);

    if (weekError) {
      console.warn('⚠️ Ошибка получения недельной статистики:', weekError);
    }

    // Группируем по дням
    const weekActivity: DashboardActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = weekProgress?.filter(p => p.completed_at?.startsWith(dateStr)) || [];
      const lessonsCompleted = dayData.length;
      const watchTime = dayData.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0);
      
      weekActivity.push({
        date: dateStr,
        lessons_completed: lessonsCompleted,
        watch_time_minutes: Math.round(watchTime / 60),
        xp_earned: lessonsCompleted * 50,
      });
    }

    // 4. Последние достижения (топ-3)
    const { data: achievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('id, title, icon, xp_reward, unlocked_at')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })
      .limit(3);

    if (achievementsError) {
      console.warn('⚠️ Ошибка получения достижений:', achievementsError);
    }

    // 5. Активные миссии
    const { data: missions, error: missionsError } = await supabase
      .from('user_missions')
      .select('id, title, description, current_value, target_value, xp_reward')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('created_at', { ascending: true })
      .limit(5);

    if (missionsError) {
      console.warn('⚠️ Ошибка получения миссий:', missionsError);
    }

    const activeMissions = missions?.map(m => ({
      ...m,
      progress_percent: Math.round((m.current_value / m.target_value) * 100),
    })) || [];

    const dashboardData: DashboardData = {
      user_info: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        level: profile.level || 1,
        xp: profile.xp || 0,
        current_streak: profile.current_streak || 0,
      },
      today_stats: {
        lessons_completed: todayLessonsCompleted,
        watch_time_minutes: Math.round(todayWatchTime / 60),
        xp_earned: todayXpEarned,
      },
      week_activity: weekActivity,
      recent_achievements: achievements || [],
      active_missions: activeMissions,
    };

    console.log('✅ [DashboardService] Dashboard загружен для:', profile.full_name);
    return dashboardData;
  } catch (error: any) {
    console.error('❌ [DashboardService] Ошибка:', error);
    throw error;
  }
}

