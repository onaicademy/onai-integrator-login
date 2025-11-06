/**
 * Система "Достижений дня" с ротацией каждые 24 часа
 * 
 * Особенности:
 * - Обновляется в полночь (00:00)
 * - Бонус XP x2 за выполнение
 * - Выбираются достижения, стимулирующие активность
 * - Детерминированный выбор (у всех пользователей одинаковые достижения дня)
 */

import { ACHIEVEMENTS, type Achievement } from './achievements-config';

export const DAILY_ACHIEVEMENT_BONUS_MULTIPLIER = 2; // x2 XP за достижения дня

// Достижения, подходящие для "Достижений дня"
// Критерии: можно выполнить за день, стимулируют активность
const DAILY_ELIGIBLE_ACHIEVEMENT_IDS = [
  // Обучение - можно за день
  'first-lesson',
  'lessons-5',
  'lessons-10',
  'first-module',
  'video-watcher',
  'note-taker',
  
  // Стрики - ежедневная активность
  'streak-3',
  'streak-7',
  'weekend-learner',
  
  // Мастерство - вызов на день
  'perfect-lesson',
  'no-hints',
  'first-try',
  'quiz-master',
  
  // Скорость - мотивация сделать больше
  'speed-1',
  'marathon',
  'ultra-marathon',
  'weekend-warrior',
  
  // Социальные - взаимодействие
  'first-message',
  'messages-10',
  'ai-chat-10',
  'help-others',
  'knowledge-sharer',
  
  // Исследование - изучение платформы
  'profile-complete',
  'first-avatar',
  'neurohub-explorer',
  'course-preview',
  'early-bird',
  'night-owl',
  'feedback-giver',
  'bookmark-collector',
  
  // Практика
  'practice-master',
  'multitasker',
  'resourceful',
];

/**
 * Получить "достижения дня" на основе текущей даты
 * Использует детерминированный алгоритм, чтобы у всех пользователей были одинаковые достижения
 */
export function getDailyAchievements(date: Date = new Date()): Achievement[] {
  // Получаем начало дня (00:00:00)
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  
  // Используем timestamp начала дня как seed для псевдослучайного выбора
  const seed = Math.floor(dayStart.getTime() / 1000 / 86400); // дней с epoch
  
  // Фильтруем доступные достижения
  const eligibleAchievements = ACHIEVEMENTS.filter(a => 
    DAILY_ELIGIBLE_ACHIEVEMENT_IDS.includes(a.id) && !a.hidden
  );
  
  // Детерминированная "перемешка" на основе seed
  const shuffled = [...eligibleAchievements].sort((a, b) => {
    const hashA = simpleHash(a.id + seed);
    const hashB = simpleHash(b.id + seed);
    return hashA - hashB;
  });
  
  // Выбираем 3 достижения разной сложности
  const result: Achievement[] = [];
  
  // 1. Лёгкое (common/rare)
  const easy = shuffled.find(a => (a.rarity === 'common' || a.rarity === 'rare') && !result.includes(a));
  if (easy) result.push(easy);
  
  // 2. Среднее (rare/epic)
  const medium = shuffled.find(a => (a.rarity === 'rare' || a.rarity === 'epic') && !result.includes(a));
  if (medium) result.push(medium);
  
  // 3. Сложное (epic/legendary или то, что требует больше усилий)
  const hard = shuffled.find(a => 
    (a.rarity === 'epic' || a.rarity === 'legendary' || a.requirement.value >= 10) && 
    !result.includes(a)
  );
  if (hard) result.push(hard);
  
  // Если не набрали 3, добавляем оставшиеся
  for (const achievement of shuffled) {
    if (result.length >= 3) break;
    if (!result.includes(achievement)) {
      result.push(achievement);
    }
  }
  
  return result.slice(0, 3);
}

/**
 * Простая хеш-функция для детерминированного выбора
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Проверить, является ли достижение "достижением дня"
 */
export function isDailyAchievement(achievementId: string, date: Date = new Date()): boolean {
  const dailyAchievements = getDailyAchievements(date);
  return dailyAchievements.some(a => a.id === achievementId);
}

/**
 * Получить бонусный XP для достижения
 */
export function getAchievementXP(achievement: Achievement, isDaily: boolean = false): number {
  return isDaily 
    ? achievement.xpReward * DAILY_ACHIEVEMENT_BONUS_MULTIPLIER 
    : achievement.xpReward;
}

/**
 * Получить время до следующей смены достижений дня
 */
export function getTimeUntilNextDailyReset(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
}

/**
 * Форматировать время до сброса
 */
export function formatTimeUntilReset(): string {
  const { hours, minutes } = getTimeUntilNextDailyReset();
  
  if (hours > 0) {
    return `${hours}ч ${minutes}м`;
  }
  return `${minutes}м`;
}

