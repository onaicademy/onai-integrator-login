/**
 * Profile Service
 * Сервис для получения профиля студента с игрофикацией
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

/**
 * Получить полный профиль пользователя
 */
export async function getUserProfile(userId: string): Promise<{ profile: UserProfile; stats: ProfileStats }> {
  try {
    console.log('📊 [ProfileService] Получаем профиль для пользователя:', userId);

    // 1. Получаем базовый профиль
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, level, xp, current_streak, longest_streak, last_activity_at, role, created_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Ошибка получения профиля:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profileData) {
      throw new Error('Profile not found');
    }

    // 2. Получаем статистику по урокам
    const { data: lessonsStats, error: lessonsError } = await supabase
      .from('student_progress')
      .select('is_completed, watch_time_seconds, video_progress_percent')
      .eq('user_id', userId);

    if (lessonsError) {
      console.warn('⚠️ Ошибка получения статистики уроков:', lessonsError);
    }

    const totalLessonsCompleted = lessonsStats?.filter(l => l.is_completed).length || 0;
    const totalWatchTimeSeconds = lessonsStats?.reduce((sum, l) => sum + (l.watch_time_seconds || 0), 0) || 0;
    const avgVideoProgress = lessonsStats?.length 
      ? lessonsStats.reduce((sum, l) => sum + (l.video_progress_percent || 0), 0) / lessonsStats.length 
      : 0;

    // 3. Получаем статистику по модулям
    const { data: modulesStats, error: modulesError } = await supabase
      .from('module_progress')
      .select('is_completed')
      .eq('user_id', userId);

    if (modulesError) {
      console.warn('⚠️ Ошибка получения статистики модулей:', modulesError);
    }

    const totalModulesCompleted = modulesStats?.filter(m => m.is_completed).length || 0;

    // 4. Получаем количество достижений
    const { count: achievementsCount, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (achievementsError) {
      console.warn('⚠️ Ошибка получения достижений:', achievementsError);
    }

    // 5. Получаем активные цели
    const { count: goalsCount, error: goalsError } = await supabase
      .from('user_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_completed', false);

    if (goalsError) {
      console.warn('⚠️ Ошибка получения целей:', goalsError);
    }

    // 6. Получаем активные миссии
    const { count: missionsCount, error: missionsError } = await supabase
      .from('user_missions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_completed', false);

    if (missionsError) {
      console.warn('⚠️ Ошибка получения миссий:', missionsError);
    }

    const stats: ProfileStats = {
      total_lessons_completed: totalLessonsCompleted,
      total_modules_completed: totalModulesCompleted,
      total_courses_enrolled: 0, // TODO: Добавить когда будет таблица enrollments
      total_watch_time_hours: Math.round(totalWatchTimeSeconds / 3600 * 10) / 10,
      avg_video_progress: Math.round(avgVideoProgress),
      achievements_unlocked: achievementsCount || 0,
      active_goals: goalsCount || 0,
      active_missions: missionsCount || 0,
    };

    console.log('✅ [ProfileService] Профиль загружен:', profileData.full_name);
    console.log('📊 [ProfileService] Статистика:', stats);

    return {
      profile: profileData as UserProfile,
      stats,
    };
  } catch (error: any) {
    console.error('❌ [ProfileService] Ошибка получения профиля:', error);
    throw error;
  }
}

/**
 * Обновить последнюю активность пользователя
 */
export async function updateLastActivity(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('❌ Ошибка обновления last_activity_at:', error);
    } else {
      console.log('✅ last_activity_at обновлён для:', userId);
    }
  } catch (error) {
    console.error('❌ Ошибка updateLastActivity:', error);
  }
}

