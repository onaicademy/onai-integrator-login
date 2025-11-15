/**
 * Missions Service
 * Сервис для получения мини-миссий студента
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
 * Получить активные миссии студента
 */
export async function getUserMissions(userId: string): Promise<Mission[]> {
  try {
    console.log('🎯 [MissionsService] Получаем миссии для:', userId);

    const { data: missions, error } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .order('is_completed', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Ошибка получения миссий:', error);
      throw new Error(`Failed to fetch missions: ${error.message}`);
    }

    if (!missions || missions.length === 0) {
      console.log('ℹ️ Миссий не найдено, создаём дефолтные...');
      
      // Создаём дефолтные миссии
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Срок 7 дней

      const defaultMissions = [
        {
          user_id: userId,
          mission_type: 'complete_lessons',
          title: 'Завершите 3 урока',
          description: 'Пройдите любые 3 урока до конца',
          target_value: 3,
          current_value: 0,
          xp_reward: 150,
          expires_at: expiresAt.toISOString(),
        },
        {
          user_id: userId,
          mission_type: 'daily_streak',
          title: 'Стрик 3 дня',
          description: 'Занимайтесь 3 дня подряд',
          target_value: 3,
          current_value: 0,
          xp_reward: 200,
          expires_at: expiresAt.toISOString(),
        },
      ];

      const { data: newMissions, error: createError } = await supabase
        .from('user_missions')
        .insert(defaultMissions)
        .select();

      if (createError) {
        console.error('❌ Ошибка создания миссий:', createError);
        return [];
      }

      return (newMissions || []).map(enrichMission);
    }

    // Обогащаем данные
    const enrichedMissions = missions.map(enrichMission);

    console.log('✅ [MissionsService] Найдено миссий:', enrichedMissions.length);
    return enrichedMissions;
  } catch (error: any) {
    console.error('❌ [MissionsService] Ошибка:', error);
    throw error;
  }
}

/**
 * Обогащаем миссию вычисляемыми полями
 */
function enrichMission(mission: any): Mission {
  const now = new Date();
  const progressPercent = Math.round((mission.current_value / mission.target_value) * 100);
  
  let timeRemainingHours = null;
  if (mission.expires_at) {
    const expiresAt = new Date(mission.expires_at);
    const diff = expiresAt.getTime() - now.getTime();
    timeRemainingHours = Math.max(0, Math.round(diff / (1000 * 60 * 60)));
  }

  return {
    ...mission,
    progress_percent: Math.min(progressPercent, 100),
    time_remaining_hours: timeRemainingHours,
  };
}

/**
 * Обновить прогресс миссии
 */
export async function updateMissionProgress(
  userId: string,
  missionType: string,
  incrementValue: number = 1
): Promise<void> {
  try {
    console.log('🎯 [MissionsService] Обновляем миссию:', missionType, '+', incrementValue);

    // Получаем незавершённые миссии данного типа
    const { data: missions, error: fetchError } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_type', missionType)
      .eq('is_completed', false);

    if (fetchError || !missions || missions.length === 0) {
      console.warn('⚠️ Миссия не найдена:', missionType);
      return;
    }

    // Обновляем первую найденную миссию
    const mission = missions[0];
    const newValue = mission.current_value + incrementValue;
    const isCompleted = newValue >= mission.target_value;

    const { error: updateError } = await supabase
      .from('user_missions')
      .update({
        current_value: newValue,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', mission.id);

    if (updateError) {
      console.error('❌ Ошибка обновления миссии:', updateError);
    } else {
      console.log('✅ Миссия обновлена:', newValue, '/', mission.target_value);
      
      if (isCompleted) {
        console.log('🎉 Миссия завершена! XP награда:', mission.xp_reward);
      }
    }
  } catch (error) {
    console.error('❌ [MissionsService] Ошибка updateMissionProgress:', error);
  }
}

