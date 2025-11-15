/**
 * Goals API Client
 * Клиент для работы с Backend API недельных целей
 */

import { api } from '../utils/apiClient';

interface WeeklyGoal {
  id: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  week_start_date: string;
  week_end_date: string;
  is_completed: boolean;
  completed_at: string | null;
  progress_percent: number;
  days_remaining: number;
}

/**
 * Получить недельные цели студента
 */
export async function getWeeklyGoals(userId: string): Promise<WeeklyGoal[]> {
  try {
    console.log('🎯 [GoalsAPI] Запрос недельных целей для:', userId);
    
    const response = await api.get(`/goals/weekly/${userId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch goals');
    }

    console.log('✅ [GoalsAPI] Цели получены:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ [GoalsAPI] Ошибка:', error);
    throw error;
  }
}

/**
 * Обновить прогресс цели (вызывается при завершении урока)
 */
export async function updateGoalProgress(
  userId: string,
  goalType: string,
  incrementValue: number = 1
): Promise<void> {
  try {
    console.log('🎯 [GoalsAPI] Обновление цели:', goalType);
    
    await api.post('/goals/update-progress', { userId, goalType, incrementValue });

    console.log('✅ [GoalsAPI] Прогресс цели обновлён');
  } catch (error) {
    console.error('❌ [GoalsAPI] Ошибка обновления:', error);
  }
}

