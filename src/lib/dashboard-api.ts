/**
 * Dashboard API Client
 * Клиент для работы с Backend API dashboard студента (/neurohub)
 */

import { api } from '../utils/apiClient';

interface DashboardActivity {
  date: string;
  lessons_completed: number;
  watch_time_minutes: number;
  xp_earned: number;
}

interface DashboardMission {
  id: string;
  title: string;
  description: string;
  current_value: number;
  target_value: number;
  progress_percent: number;
  xp_reward: number;
}

interface DashboardAchievement {
  id: string;
  title: string;
  icon: string;
  xp_reward: number;
  unlocked_at: string;
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
  recent_achievements: DashboardAchievement[];
  active_missions: DashboardMission[];
}

/**
 * Получить данные dashboard для студента
 */
export async function getStudentDashboard(userId: string): Promise<DashboardData> {
  try {
    console.log('📊 [DashboardAPI] Запрос dashboard для:', userId);
    
    const response = await api.get(`/api/analytics/student/${userId}/dashboard`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch dashboard');
    }

    console.log('✅ [DashboardAPI] Dashboard получен');
    return response.data;
  } catch (error) {
    console.error('❌ [DashboardAPI] Ошибка:', error);
    throw error;
  }
}

