/**
 * Tripwire Dashboard Service (SIMPLIFIED)
 * Сервис для получения данных дашборда студента (БЕЗ XP/Levels/Missions)
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';

/**
 * ✅ SIMPLE Dashboard Activity (NO XP)
 */
interface DashboardActivity {
  date: string;
  lessons_completed: number;
  watch_time_minutes: number;
}

/**
 * ✅ SIMPLE Dashboard Data (based on UI requirements)
 * NO XP, NO Levels, NO Streaks, NO Missions
 */
interface DashboardData {
  user_info: {
    full_name: string;
    avatar_url: string | null;
    modules_completed: number;
  };
  today_stats: {
    lessons_completed: number;
    watch_time_minutes: number;
  };
  week_activity: DashboardActivity[];
  recent_achievements: Array<{
    id: string;
    title: string;
    icon: string;
    unlocked_at: string;
  }>;
}

/**
 * Получить данные для дашборда студента (УПРОЩЕННЫЙ)
 */
export async function getStudentDashboard(userId: string): Promise<DashboardData> {
  try {
    console.log('📊 [Tripwire DashboardService] Получаем dashboard для:', userId);

    // 1. Информация о пользователе (из tripwire_user_profile)
    const { data: profile, error: profileError } = await supabase
      .from('tripwire_user_profile')
      .select('modules_completed')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.warn('⚠️ [Tripwire] Профиль не найден, используем дефолтные значения');
    }

    // Получаем email и имя из auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const fullName = userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Tripwire Student';
    const avatarUrl = userData?.user?.user_metadata?.avatar_url || null;

    // 2. Статистика за сегодня (из tripwire_progress)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayProgress, error: todayError } = await supabase
      .from('tripwire_progress')
      .select('is_completed, watch_time_seconds, updated_at')
      .eq('tripwire_user_id', userId)
      .gte('updated_at', `${today}T00:00:00`)
      .lte('updated_at', `${today}T23:59:59`);

    if (todayError) {
      console.warn('⚠️ [Tripwire] Ошибка получения статистики за сегодня:', todayError);
    }

    const todayLessonsCompleted = todayProgress?.filter(p => p.is_completed).length || 0;
    const todayWatchTime = todayProgress?.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0) || 0;

    // 3. Активность за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: weekProgress, error: weekError } = await supabase
      .from('tripwire_progress')
      .select('completed_at, watch_time_seconds')
      .eq('tripwire_user_id', userId)
      .eq('is_completed', true)
      .gte('completed_at', `${sevenDaysAgoStr}T00:00:00`);

    if (weekError) {
      console.warn('⚠️ [Tripwire] Ошибка получения недельной статистики:', weekError);
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
      });
    }

    // 4. Последние достижения (топ-3, только разблокированные)
    const { data: achievements, error: achievementsError } = await supabase
      .from('tripwire_achievements')
      .select('id, title, icon, unlocked_at')
      .eq('user_id', userId)
      .eq('unlocked', true)
      .order('unlocked_at', { ascending: false })
      .limit(3);

    if (achievementsError) {
      console.warn('⚠️ [Tripwire] Ошибка получения достижений:', achievementsError);
    }

    const dashboardData: DashboardData = {
      user_info: {
        full_name: fullName,
        avatar_url: avatarUrl,
        modules_completed: profile?.modules_completed || 0,
      },
      today_stats: {
        lessons_completed: todayLessonsCompleted,
        watch_time_minutes: Math.round(todayWatchTime / 60),
      },
      week_activity: weekActivity,
      recent_achievements: achievements || [],
    };

    console.log('✅ [Tripwire DashboardService] Dashboard загружен для:', fullName);
    return dashboardData;
  } catch (error: any) {
    console.error('❌ [Tripwire DashboardService] Ошибка:', error);
    throw error;
  }
}
