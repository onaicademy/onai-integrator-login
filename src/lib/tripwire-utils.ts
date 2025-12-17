/**
 * 🎯 TRIPWIRE UTILITIES
 * Утилиты для работы с достижениями и прогрессом в Tripwire
 */

export interface TripwireAchievement {
  id: string;
  user_id: string;
  achievement_id: string; // ✅ NEW: ID достижения (first_module_complete, etc)
  achievement_type: 'module_1_completed' | 'module_2_completed' | 'module_3_completed';
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  is_completed: boolean; // ✅ NEW: Статус завершения
  unlocked_at: string | null;
  notification_shown: boolean;
  created_at: string;
}

export interface TripwireUserProfile {
  id: string;
  user_id: string;
  modules_completed: number;
  total_modules: number;
  completion_percentage: number;
  certificate_issued: boolean;
  certificate_url: string | null;
  certificate_issued_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data from auth.users
  email?: string;
  full_name?: string;
}

export interface TripwireCertificate {
  id: string;
  user_id: string;
  certificate_number: string;
  full_name: string;
  issued_at: string;
  pdf_url?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
}

/**
 * 🔴 ЗАКЛЮЧИТЕЛЬНЫЙ ПРЯМОЙ ЭФИР
 * Дата: 18 декабря 2025 в 20:00 (Almaty UTC+6)
 * ⏰ ФИКСИРОВАННАЯ ДАТА
 */
const getStreamDate = (): Date => {
  // 18 декабря 2025, 20:00 по Almaty (UTC+6)
  const streamDate = new Date('2025-12-18T20:00:00+06:00');
  return streamDate;
};

/**
 * Получить время для прямого эфира
 * 📅 СТАТИЧНАЯ ДАТА: 18 декабря в 20:00
 */
export const getStreamTime = (): string => {
  return '18 декабря в 20:00';
};

/**
 * Получить обратный отсчёт до эфира
 * ⏰ ТАЙМЕР ДО 18 ДЕКАБРЯ 20:00
 */
export const getStreamCountdown = (): string => {
  const now = new Date();
  const streamDate = getStreamDate();
  
  const diff = streamDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'Эфир идёт сейчас! 🔴';
  }
  
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  // Если больше 24 часов - показываем дни
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    return `${days}д ${remainingHours}ч ${minutes}м`;
  }
  
  // Если меньше 24 часов - показываем часы:минуты:секунды
  return `${totalHours}ч ${minutes}м ${seconds}с`;
};

/**
 * Получить информацию о модуле по номеру
 */
export const getModuleInfo = (moduleNumber: number) => {
  const modules = [
    {
      number: 1,
      title: 'Вводный модуль',
      icon: '🎯',
      description: 'Определим какое направление в ИИ твое',
    },
    {
      number: 2,
      title: 'Создание GPT-бота',
      icon: '🤖',
      description: 'Instagram, WhatsApp интеграции',
    },
    {
      number: 3,
      title: 'Создание вирусных Reels',
      icon: '🎬',
      description: '100 000 👁️ | Создание сценария, видео, монтаж',
    },
  ];

  return modules.find(m => m.number === moduleNumber) || modules[0];
};

/**
 * Получить прогресс достижений (сколько разблокировано)
 */
export const getAchievementsProgress = (achievements: TripwireAchievement[]) => {
  const unlocked = achievements.filter(a => a.unlocked).length;
  const total = achievements.length;
  return { unlocked, total, percentage: total > 0 ? (unlocked / total) * 100 : 0 };
};

/**
 * Сохранить флаг ожидающего достижения в localStorage
 */
export const savePendingAchievement = (achievement: TripwireAchievement) => {
  localStorage.setItem('tripwire_pending_achievement', JSON.stringify({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    icon: achievement.icon,
  }));
};

/**
 * Получить и удалить флаг ожидающего достижения из localStorage
 */
export const getPendingAchievement = (): { id: string; title: string; description: string; icon: string } | null => {
  const stored = localStorage.getItem('tripwire_pending_achievement');
  if (stored) {
    localStorage.removeItem('tripwire_pending_achievement');
    return JSON.parse(stored);
  }
  return null;
};

/**
 * Форматировать дату для отображения
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
