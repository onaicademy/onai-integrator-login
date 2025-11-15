/**
 * Goals Service
 * Сервис для получения недельных целей студента
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.log('🎯 [GoalsService] Получаем недельные цели для:', userId);

    // Получаем текущую неделю
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay()); // Начало недели (воскресенье)
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // Конец недели (суббота)
    currentWeekEnd.setHours(23, 59, 59, 999);

    const { data: goals, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .gte('week_start_date', currentWeekStart.toISOString().split('T')[0])
      .lte('week_end_date', currentWeekEnd.toISOString().split('T')[0])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Ошибка получения целей:', error);
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    if (!goals || goals.length === 0) {
      console.log('ℹ️ Целей не найдено, создаём дефолтную...');
      
      // Создаём дефолтную цель
      const { data: newGoal, error: createError } = await supabase
        .from('user_goals')
        .insert({
          user_id: userId,
          goal_type: 'weekly_lessons',
          target_value: 10,
          current_value: 0,
          week_start_date: currentWeekStart.toISOString().split('T')[0],
          week_end_date: currentWeekEnd.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Ошибка создания цели:', createError);
        return [];
      }

      const daysRemaining = Math.ceil((currentWeekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return [{
        ...newGoal,
        progress_percent: 0,
        days_remaining: daysRemaining,
      }];
    }

    // Обогащаем данные
    const enrichedGoals = goals.map(goal => {
      const weekEnd = new Date(goal.week_end_date);
      const daysRemaining = Math.ceil((weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const progressPercent = Math.round((goal.current_value / goal.target_value) * 100);

      return {
        ...goal,
        progress_percent: Math.min(progressPercent, 100),
        days_remaining: Math.max(daysRemaining, 0),
      };
    });

    console.log('✅ [GoalsService] Найдено целей:', enrichedGoals.length);
    return enrichedGoals;
  } catch (error: any) {
    console.error('❌ [GoalsService] Ошибка:', error);
    throw error;
  }
}

/**
 * Обновить прогресс цели
 */
export async function updateGoalProgress(
  userId: string,
  goalType: string,
  incrementValue: number = 1
): Promise<void> {
  try {
    console.log('🎯 [GoalsService] Обновляем прогресс цели:', goalType, '+', incrementValue);

    // Получаем текущую неделю
    const now = new Date();
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    // Получаем цель
    const { data: goal, error: fetchError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_type', goalType)
      .gte('week_start_date', currentWeekStart.toISOString().split('T')[0])
      .single();

    if (fetchError || !goal) {
      console.warn('⚠️ Цель не найдена:', goalType);
      return;
    }

    const newValue = goal.current_value + incrementValue;
    const isCompleted = newValue >= goal.target_value;

    const { error: updateError } = await supabase
      .from('user_goals')
      .update({
        current_value: newValue,
        is_completed: isCompleted,
        completed_at: isCompleted && !goal.completed_at ? new Date().toISOString() : goal.completed_at,
      })
      .eq('id', goal.id);

    if (updateError) {
      console.error('❌ Ошибка обновления цели:', updateError);
    } else {
      console.log('✅ Цель обновлена:', newValue, '/', goal.target_value);
    }
  } catch (error) {
    console.error('❌ [GoalsService] Ошибка updateGoalProgress:', error);
  }
}

