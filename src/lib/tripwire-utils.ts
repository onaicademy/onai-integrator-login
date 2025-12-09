/**
 * 🎯 TRIPWIRE UTILITIES
 * Утилиты для работы с достижениями и прогрессом в Tripwire
 */

export interface TripwireAchievement {
  id: string;
  user_id: string;
  achievement_type: 'module_1_completed' | 'module_2_completed' | 'module_3_completed';
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
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
 * Получить время для прямого эфира (динамический текст)
 * Если сейчас < 20:00 по Алма-Ате: "Эфир сегодня в 20:00"
 * Если сейчас >= 20:00: "Эфир завтра в 20:00"
 */
export const getStreamTime = (): string => {
  const now = new Date();
  const almatyOffset = 6 * 60; // UTC+6 в минутах
  const localOffset = now.getTimezoneOffset(); // Локальное смещение
  const almatyTime = new Date(now.getTime() + (almatyOffset + localOffset) * 60000);
  
  const currentHour = almatyTime.getHours();
  
  // Если до 18:00 Алматы → "Сегодня", после 18:00 → "Завтра"
  if (currentHour < 18) {
    return "Сегодня в 20:00";
  } else {
    return "Завтра в 20:00";
  }
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
