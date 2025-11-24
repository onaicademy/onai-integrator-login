import { api } from '../utils/apiClient';

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  ai_analyzed?: boolean;
  ai_feedback?: any;
  telegram_reminder?: boolean;
  reminder_before?: 30 | 60;
}

export interface GoalStatistics {
  total_goals: number;
  completed_goals: number;
  in_progress_goals: number;
  overdue_goals: number;
  completion_rate: number;
  goals_this_week: number;
  productivity_score: number;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  week_end: string;
  goals_created: number;
  goals_completed: number;
  goals_in_progress: number;
  goals_overdue: number;
  xp_earned: number;
  achievements_unlocked: any[];
  ai_productivity_score: number;
  ai_feedback?: string;
  ai_recommendations?: any;
  created_at: string;
  processed_at?: string;
}

export async function getUserGoals(userId: string): Promise<Goal[]> {
  try {
    console.log('📋 [GoalsAPI] Загрузка целей для пользователя:', userId);
    const response = await api.get(`/api/goals?userId=${userId}`);
    console.log('✅ [GoalsAPI] Цели загружены:', response?.goals?.length || 0);
    return response?.goals || [];
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка загрузки целей:', error);
    throw error;
  }
}

export async function getGoal(id: string): Promise<Goal> {
  try {
    const response = await api.get(`/api/goals/${id}`);
    return response?.goal;
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка получения цели:', error);
    throw error;
  }
}

export async function createGoal(goal: Partial<Goal>): Promise<Goal> {
  try {
    console.log('➕ [GoalsAPI] Создание цели:', goal.title);
    const response = await api.post('/api/goals', goal);
    console.log('✅ [GoalsAPI] Цель создана:', response?.goal?.id);
    return response?.goal;
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка создания цели:', error);
    throw error;
  }
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
  try {
    console.log('🔄 [GoalsAPI] Обновление цели:', id);
    const response = await api.put(`/api/goals/${id}`, updates);
    console.log('✅ [GoalsAPI] Цель обновлена:', id);
    return response?.goal;
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка обновления цели:', error);
    throw error;
  }
}

export async function deleteGoal(id: string): Promise<void> {
  try {
    console.log('🗑️ [GoalsAPI] Удаление цели:', id);
    await api.delete(`/api/goals/${id}`);
    console.log('✅ [GoalsAPI] Цель удалена:', id);
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка удаления цели:', error);
    throw error;
  }
}

export interface CompleteGoalResponse {
  goal: Goal;
  xp_awarded: number;
  is_first_use_bonus: boolean;
}

export async function completeGoal(id: string): Promise<CompleteGoalResponse> {
  try {
    console.log('✅ [GoalsAPI] Выполнение цели:', id);
    const response = await api.post(`/api/goals/${id}/complete`, {});
    
    if (response.is_first_use_bonus) {
      console.log('🎉 [GoalsAPI] ПЕРВОЕ использование Kanban! +' + response.xp_awarded + ' XP');
    } else {
      console.log('✅ [GoalsAPI] Цель выполнена');
    }
    
    return {
      goal: response.goal,
      xp_awarded: response.xp_awarded || 0,
      is_first_use_bonus: response.is_first_use_bonus || false
    };
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка выполнения цели:', error);
    throw error;
  }
}

export async function uncompleteGoal(id: string): Promise<Goal> {
  try {
    console.log('↩️ [GoalsAPI] Отмена выполнения цели:', id);
    const response = await api.post(`/api/goals/${id}/uncomplete`, {});
    console.log('✅ [GoalsAPI] Выполнение цели отменено');
    return response?.goal;
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка отмены выполнения:', error);
    throw error;
  }
}

export async function getGoalStatistics(userId: string): Promise<GoalStatistics> {
  try {
    console.log('📊 [GoalsAPI] Загрузка статистики для пользователя:', userId);
    const response = await api.get(`/api/goals/statistics/${userId}`);
    console.log('✅ [GoalsAPI] Статистика загружена');
    return response?.statistics;
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка загрузки статистики:', error);
    throw error;
  }
}

export async function getWeeklyReports(userId: string): Promise<WeeklyReport[]> {
  try {
    console.log('📅 [GoalsAPI] Загрузка еженедельных отчетов:', userId);
    const response = await api.get(`/api/goals/report/${userId}`);
    console.log('✅ [GoalsAPI] Отчеты загружены:', response?.reports?.length || 0);
    return response?.reports || [];
  } catch (error: any) {
    console.error('❌ [GoalsAPI] Ошибка загрузки отчетов:', error);
    throw error;
  }
}
