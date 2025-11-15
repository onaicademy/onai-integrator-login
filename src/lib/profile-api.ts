/**
 * Profile API Client
 * Клиент для работы с Backend API профиля студента
 */

import { api } from '../utils/apiClient';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string;
  role: string;
  created_at: string;
}

interface ProfileStats {
  total_lessons_completed: number;
  total_modules_completed: number;
  total_courses_enrolled: number;
  total_watch_time_hours: number;
  avg_video_progress: number;
  achievements_unlocked: number;
  active_goals: number;
  active_missions: number;
}

interface ProfileResponse {
  profile: UserProfile;
  stats: ProfileStats;
}

/**
 * Получить полный профиль пользователя
 */
export async function getUserProfile(userId: string): Promise<ProfileResponse> {
  try {
    console.log('📊 [ProfileAPI] Запрос профиля для:', userId);
    
    const response = await api.get(`/users/${userId}/profile`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch profile');
    }

    console.log('✅ [ProfileAPI] Профиль получен');
    return response.data;
  } catch (error) {
    console.error('❌ [ProfileAPI] Ошибка:', error);
    throw error;
  }
}

