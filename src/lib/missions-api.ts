/**
 * Missions API Client
 * Клиент для работы с Backend API мини-миссий
 */

import { api } from '../utils/apiClient';

interface Mission {
  id: string;
  mission_type: string;
  title: string;
  description: string | null;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  xp_reward: number;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  progress_percent: number;
  time_remaining_hours: number | null;
}

/**
 * Получить миссии студента
 */
export async function getUserMissions(userId: string): Promise<Mission[]> {
  try {
    console.log('🎯 [MissionsAPI] Запрос миссий для:', userId);
    
    const response = await api.get(`/api/missions/${userId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch missions');
    }

    console.log('✅ [MissionsAPI] Миссии получены:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ [MissionsAPI] Ошибка:', error);
    throw error;
  }
}

/**
 * Обновить прогресс миссии (вызывается при событиях)
 */
export async function updateMissionProgress(
  userId: string,
  missionType: string,
  incrementValue: number = 1
): Promise<void> {
  try {
    console.log('🎯 [MissionsAPI] Обновление миссии:', missionType);
    
    await api.post('/api/missions/update-progress', { userId, missionType, incrementValue });

    console.log('✅ [MissionsAPI] Прогресс миссии обновлён');
  } catch (error) {
    console.error('❌ [MissionsAPI] Ошибка обновления:', error);
  }
}

