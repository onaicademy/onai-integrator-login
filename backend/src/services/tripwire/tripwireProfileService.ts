/**
 * Tripwire Profile Service (SIMPLIFIED)
 * Сервис для получения профиля студента Tripwire (БЕЗ XP/Levels/Streaks)
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { tripwireAdminSupabase as supabase } from '../../config/supabase-tripwire';

/**
 * ✅ SIMPLE Profile (based on UI requirements)
 * NO XP, NO Levels, NO Streaks
 */
interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  modules_completed: number;
  total_modules: number;
  completion_percentage: number;
  certificate_issued: boolean;
  certificate_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ✅ SIMPLE Stats (based on UI requirements)
 * Only lessons completed and watch time
 */
interface ProfileStats {
  total_lessons_completed: number;
  total_watch_time_hours: number;
  achievements_unlocked: number; // Only 3 achievements (module completion)
}

/**
 * ✅ SIMPLE Achievement (only 3 types exist)
 * module_1_completed, module_2_completed, module_3_completed
 */
interface Achievement {
  id: string;
  achievement_type: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

/**
 * Получить профиль Tripwire пользователя (УПРОЩЕННЫЙ)
 */
export async function getUserProfile(userId: string): Promise<{ profile: UserProfile; stats: ProfileStats; achievements: Achievement[] }> {
  try {
    console.log('📊 [Tripwire ProfileService] Получаем профиль для:', userId);

    // 1. Получаем профиль из tripwire_user_profile
    const { data: profileData, error: profileError } = await supabase
      .from('tripwire_user_profile')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profileError || !profileData) {
      // Если профиль не существует, создаём его
      console.log('⚠️ [Tripwire] Профиль не найден, создаём новый');
      const { data: newProfile, error: createError } = await supabase
        .from('tripwire_user_profile')
        .insert({
          user_id: userId,
          modules_completed: 0,
          total_modules: 3, // Tripwire always has 3 modules
          completion_percentage: 0,
          certificate_issued: false,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }

      // Получаем email и имя из auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const profile = {
        ...newProfile,
        full_name: userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Tripwire Student',
        email: userData?.user?.email || '',
        avatar_url: userData?.user?.user_metadata?.avatar_url || null,
      };

      return {
        profile: profile as UserProfile,
        stats: {
          total_lessons_completed: 0,
          total_watch_time_hours: 0,
          achievements_unlocked: 0,
        },
        achievements: [],
      };
    }

    // 2. Получаем email и имя из auth.users
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const fullProfile = {
      ...profileData,
      full_name: userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Tripwire Student',
      email: userData?.user?.email || '',
      avatar_url: userData?.user?.user_metadata?.avatar_url || null,
    };

    // 3. Получаем статистику по урокам (из tripwire_progress)
    const { data: lessonsStats, error: lessonsError } = await supabase
      .from('tripwire_progress')
      .select('is_completed, watch_time_seconds')
      .eq('tripwire_user_id', userId);

    if (lessonsError) {
      console.warn('⚠️ [Tripwire] Ошибка получения прогресса:', lessonsError);
    }

    const totalLessonsCompleted = lessonsStats?.filter(l => l.is_completed).length || 0;
    const totalWatchTimeSeconds = lessonsStats?.reduce((sum, l) => sum + (l.watch_time_seconds || 0), 0) || 0;

    // 4. Получаем достижения (только 3)
    const { data: achievementsData, error: achievementsError } = await supabase
      .from('tripwire_achievements')
      .select('*')
      .eq('user_id', userId);

    if (achievementsError) {
      console.warn('⚠️ [Tripwire] Ошибка получения достижений:', achievementsError);
    }

    const achievementsUnlocked = achievementsData?.filter(a => a.unlocked).length || 0;

    const stats: ProfileStats = {
      total_lessons_completed: totalLessonsCompleted,
      total_watch_time_hours: Math.round(totalWatchTimeSeconds / 3600 * 10) / 10,
      achievements_unlocked: achievementsUnlocked,
    };

    console.log('✅ [Tripwire ProfileService] Профиль загружен:', fullProfile.full_name);
    console.log('📊 [Tripwire ProfileService] Статистика:', stats);

    return {
      profile: fullProfile as UserProfile,
      stats,
      achievements: (achievementsData || []) as Achievement[],
    };
  } catch (error: any) {
    console.error('❌ [Tripwire ProfileService] Ошибка:', error);
    throw error;
  }
}

/**
 * Обновить последнюю активность пользователя
 */
export async function updateLastActivity(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('tripwire_user_profile')
      .update({ updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [Tripwire] Ошибка обновления last activity:', error);
    } else {
      console.log('✅ [Tripwire] Last activity обновлён для:', userId);
    }
  } catch (error) {
    console.error('❌ [Tripwire] Ошибка updateLastActivity:', error);
  }
}
