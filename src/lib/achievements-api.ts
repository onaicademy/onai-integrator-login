/**
 * API для получения достижений пользователя
 * Используется AI-куратором для персонализации советов
 */

import { ACHIEVEMENTS } from './achievements-config';
import { isDailyAchievement, getAchievementXP } from './daily-achievements';

// Mock данные для демонстрации (позже заменим на Supabase)
const MOCK_USER_ACHIEVEMENTS = {
  'user-1': {
    lessons_completed: 23,
    modules_completed: 2,
    courses_completed: 0,
    streak_days: 7,
    total_xp: 845,
    level: 5,
    perfect_lessons: 3,
    messages_sent: 15,
    ai_conversations: 8,
    profile_completion: 80,
    videos_watched: 12,
    completed_achievement_ids: ['first-lesson', 'lessons-5', 'streak-3']
  }
};

/**
 * Получить достижения пользователя для AI-куратора
 */
export async function getUserAchievementsForAI(userId: string) {
  try {
    // TODO: Заменить на реальный запрос к Supabase
    // const { data: stats } = await supabase
    //   .from('user_statistics')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .single();
    
    // const { data: completedAchievements } = await supabase
    //   .from('user_achievements')
    //   .select('achievement_id')
    //   .eq('user_id', userId)
    //   .eq('is_completed', true);
    
    // Пока используем mock данные
    const userStats = MOCK_USER_ACHIEVEMENTS[userId as keyof typeof MOCK_USER_ACHIEVEMENTS] || {
      lessons_completed: 0,
      modules_completed: 0,
      streak_days: 0,
      total_xp: 0,
      level: 1,
      completed_achievement_ids: []
    };
    
    // Расчёт прогресса по всем достижениям
    const achievementsProgress = ACHIEVEMENTS
      .filter(a => !a.hidden) // Скрытые не показываем
      .map(achievement => {
        const currentValue = userStats[achievement.requirement.type as keyof typeof userStats] as number || 0;
        const isCompleted = userStats.completed_achievement_ids.includes(achievement.id) || 
                           currentValue >= achievement.requirement.value;
        const progress = Math.min((currentValue / achievement.requirement.value) * 100, 100);
        const isDaily = isDailyAchievement(achievement.id);
        const xpReward = getAchievementXP(achievement, isDaily);
        
        return {
          id: achievement.id,
          title: achievement.title,
          category: achievement.category,
          rarity: achievement.rarity,
          is_completed: isCompleted,
          progress: Math.round(progress),
          current_value: currentValue,
          required_value: achievement.requirement.value,
          requirement_description: achievement.requirement.description,
          xp_reward: xpReward,
          is_daily: isDaily
        };
      });
    
    // Группировка для AI
    const completed = achievementsProgress.filter(a => a.is_completed);
    const inProgress = achievementsProgress.filter(a => !a.is_completed && a.progress > 0);
    const notStarted = achievementsProgress.filter(a => a.progress === 0);
    
    // Ближайшие к завершению (топ-5)
    const nearest = achievementsProgress
      .filter(a => !a.is_completed)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);
    
    // Достижения дня
    const dailyAchievements = achievementsProgress.filter(a => a.is_daily);
    
    return {
      user_id: userId,
      summary: {
        total_achievements: ACHIEVEMENTS.filter(a => !a.hidden).length,
        completed_count: completed.length,
        in_progress_count: inProgress.length,
        completion_percentage: Math.round((completed.length / ACHIEVEMENTS.filter(a => !a.hidden).length) * 100),
        total_xp_earned: completed.reduce((sum, a) => sum + a.xp_reward, 0),
        current_level: userStats.level,
        current_streak: userStats.streak_days
      },
      daily_achievements: dailyAchievements.map(a => ({
        title: a.title,
        is_completed: a.is_completed,
        progress: a.progress,
        bonus_xp: a.xp_reward - Math.floor(a.xp_reward / 2) // Бонус
      })),
      nearest_achievements: nearest.map(a => ({
        title: a.title,
        progress: a.progress,
        requirement: a.requirement_description,
        remaining: a.required_value - a.current_value
      })),
      completed_recently: completed.slice(-3).map(a => a.title), // Последние 3
      categories_progress: getCategoriesProgress(achievementsProgress)
    };
  } catch (error) {
    console.error('Error getting user achievements:', error);
    throw error;
  }
}

/**
 * Получить прогресс по категориям
 */
function getCategoriesProgress(achievements: any[]) {
  const categories = ['learning', 'streak', 'mastery', 'social', 'speed', 'exploration', 'milestone'];
  
  return categories.map(category => {
    const categoryAchievements = achievements.filter(a => a.category === category);
    const completed = categoryAchievements.filter(a => a.is_completed).length;
    const total = categoryAchievements.length;
    
    return {
      category,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });
}

/**
 * Форматировать данные о достижениях для AI (краткая версия)
 */
export function formatAchievementsForAI(data: Awaited<ReturnType<typeof getUserAchievementsForAI>>): string {
  const { summary, daily_achievements, nearest_achievements, categories_progress } = data;
  
  return `
📊 СТАТИСТИКА ДОСТИЖЕНИЙ УЧЕНИКА:

Общий прогресс: ${summary.completed_count}/${summary.total_achievements} (${summary.completion_percentage}%)
Уровень: ${summary.current_level}
Текущий стрик: ${summary.current_streak} дней
Заработано XP: ${summary.total_xp_earned}

🔥 ДОСТИЖЕНИЯ ДНЯ (x2 XP):
${daily_achievements.map(a => `- ${a.title}: ${a.is_completed ? '✅ Выполнено' : `${a.progress}%`}`).join('\n')}

🎯 БЛИЖАЙШИЕ К ЗАВЕРШЕНИЮ:
${nearest_achievements.map(a => `- ${a.title} (${a.progress}%) - осталось: ${a.remaining}`).join('\n')}

📈 ПРОГРЕСС ПО КАТЕГОРИЯМ:
${categories_progress.map(c => `- ${c.category}: ${c.completed}/${c.total} (${c.percentage}%)`).join('\n')}
`.trim();
}

