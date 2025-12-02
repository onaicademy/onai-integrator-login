/**
 * Система достижений onAI Academy
 * 
 * Категории:
 * - learning: Обучение и прогресс
 * - streak: Стрики и постоянство
 * - mastery: Мастерство и совершенство
 * - social: Социальные взаимодействия
 * - speed: Скорость и эффективность
 * - exploration: Исследование платформы
 * - milestone: Важные вехи
 */

export type AchievementCategory = 
  | 'learning' 
  | 'streak' 
  | 'mastery' 
  | 'social' 
  | 'speed' 
  | 'exploration'
  | 'milestone';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string; // emoji или иконка
  xpReward: number;
  requirement: {
    type: string;
    value: number;
    description: string;
  };
  hidden?: boolean; // секретные достижения
}

export const ACHIEVEMENTS: Achievement[] = [
  // ============ КАТЕГОРИЯ: ОБУЧЕНИЕ (Learning) ============
  {
    id: 'first-lesson',
    title: 'Первые шаги',
    description: 'Завершите свой первый урок',
    category: 'learning',
    rarity: 'common',
    icon: '🎯',
    xpReward: 10,
    requirement: {
      type: 'lessons_completed',
      value: 1,
      description: 'Завершить 1 урок'
    }
  },
  {
    id: 'lessons-5',
    title: 'Начинающий ученик',
    description: 'Завершите 5 уроков',
    category: 'learning',
    rarity: 'common',
    icon: '📚',
    xpReward: 25,
    requirement: {
      type: 'lessons_completed',
      value: 5,
      description: 'Завершить 5 уроков'
    }
  },
  {
    id: 'lessons-10',
    title: 'Упорный студент',
    description: 'Завершите 10 уроков',
    category: 'learning',
    rarity: 'common',
    icon: '📖',
    xpReward: 50,
    requirement: {
      type: 'lessons_completed',
      value: 10,
      description: 'Завершить 10 уроков'
    }
  },
  {
    id: 'lessons-25',
    title: 'Книжный червь',
    description: 'Завершите 25 уроков',
    category: 'learning',
    rarity: 'rare',
    icon: '🐛',
    xpReward: 100,
    requirement: {
      type: 'lessons_completed',
      value: 25,
      description: 'Завершить 25 уроков'
    }
  },
  {
    id: 'lessons-50',
    title: 'Знаток',
    description: 'Завершите 50 уроков',
    category: 'learning',
    rarity: 'rare',
    icon: '🎓',
    xpReward: 200,
    requirement: {
      type: 'lessons_completed',
      value: 50,
      description: 'Завершить 50 уроков'
    }
  },
  {
    id: 'lessons-100',
    title: 'Профессор',
    description: 'Завершите 100 уроков',
    category: 'learning',
    rarity: 'epic',
    icon: '👨‍🎓',
    xpReward: 500,
    requirement: {
      type: 'lessons_completed',
      value: 100,
      description: 'Завершить 100 уроков'
    }
  },
  {
    id: 'lessons-200',
    title: 'Мастер обучения',
    description: 'Завершите 200 уроков',
    category: 'learning',
    rarity: 'legendary',
    icon: '🏆',
    xpReward: 1000,
    requirement: {
      type: 'lessons_completed',
      value: 200,
      description: 'Завершить 200 уроков'
    }
  },
  {
    id: 'first-module',
    title: 'Модульный успех',
    description: 'Завершите свой первый модуль',
    category: 'learning',
    rarity: 'common',
    icon: '📦',
    xpReward: 50,
    requirement: {
      type: 'modules_completed',
      value: 1,
      description: 'Завершить 1 модуль'
    }
  },
  {
    id: 'modules-3',
    title: 'Тройной удар',
    description: 'Завершите 3 модуля',
    category: 'learning',
    rarity: 'rare',
    icon: '🎯',
    xpReward: 150,
    requirement: {
      type: 'modules_completed',
      value: 3,
      description: 'Завершить 3 модуля'
    }
  },
  {
    id: 'modules-5',
    title: 'Коллекционер знаний',
    description: 'Завершите 5 модулей',
    category: 'learning',
    rarity: 'epic',
    icon: '💎',
    xpReward: 300,
    requirement: {
      type: 'modules_completed',
      value: 5,
      description: 'Завершить 5 модулей'
    }
  },
  {
    id: 'modules-10',
    title: 'Энциклопедист',
    description: 'Завершите 10 модулей',
    category: 'learning',
    rarity: 'legendary',
    icon: '📚',
    xpReward: 750,
    requirement: {
      type: 'modules_completed',
      value: 10,
      description: 'Завершить 10 модулей'
    }
  },
  {
    id: 'first-course',
    title: 'Завершитель курса',
    description: 'Завершите свой первый курс полностью',
    category: 'milestone',
    rarity: 'epic',
    icon: '🎊',
    xpReward: 500,
    requirement: {
      type: 'courses_completed',
      value: 1,
      description: 'Завершить 1 курс'
    }
  },
  {
    id: 'courses-3',
    title: 'Мультидисциплинарный',
    description: 'Завершите 3 разных курса',
    category: 'milestone',
    rarity: 'legendary',
    icon: '🌟',
    xpReward: 1500,
    requirement: {
      type: 'courses_completed',
      value: 3,
      description: 'Завершить 3 курса'
    }
  },

  // ============ КАТЕГОРИЯ: СТРИКИ (Streak) ============
  {
    id: 'streak-3',
    title: 'Трёхдневка',
    description: 'Учитесь 3 дня подряд',
    category: 'streak',
    rarity: 'common',
    icon: '🔥',
    xpReward: 30,
    requirement: {
      type: 'streak_days',
      value: 3,
      description: '3 дня подряд'
    }
  },
  {
    id: 'streak-7',
    title: 'Неделя силы',
    description: 'Учитесь 7 дней подряд',
    category: 'streak',
    rarity: 'rare',
    icon: '🔥',
    xpReward: 75,
    requirement: {
      type: 'streak_days',
      value: 7,
      description: '7 дней подряд'
    }
  },
  {
    id: 'streak-14',
    title: 'Две недели стабильности',
    description: 'Учитесь 14 дней подряд',
    category: 'streak',
    rarity: 'rare',
    icon: '🔥🔥',
    xpReward: 150,
    requirement: {
      type: 'streak_days',
      value: 14,
      description: '14 дней подряд'
    }
  },
  {
    id: 'streak-30',
    title: 'Месячный марафон',
    description: 'Учитесь 30 дней подряд',
    category: 'streak',
    rarity: 'epic',
    icon: '🔥🔥🔥',
    xpReward: 300,
    requirement: {
      type: 'streak_days',
      value: 30,
      description: '30 дней подряд'
    }
  },
  {
    id: 'streak-60',
    title: 'Железная дисциплина',
    description: 'Учитесь 60 дней подряд',
    category: 'streak',
    rarity: 'epic',
    icon: '⚡',
    xpReward: 600,
    requirement: {
      type: 'streak_days',
      value: 60,
      description: '60 дней подряд'
    }
  },
  {
    id: 'streak-100',
    title: 'Стодневный воин',
    description: 'Учитесь 100 дней подряд',
    category: 'streak',
    rarity: 'legendary',
    icon: '💪',
    xpReward: 1000,
    requirement: {
      type: 'streak_days',
      value: 100,
      description: '100 дней подряд'
    }
  },
  {
    id: 'streak-365',
    title: 'Годовой чемпион',
    description: 'Учитесь 365 дней подряд',
    category: 'streak',
    rarity: 'legendary',
    icon: '👑',
    xpReward: 3650,
    requirement: {
      type: 'streak_days',
      value: 365,
      description: '365 дней подряд'
    }
  },

  // ============ КАТЕГОРИЯ: МАСТЕРСТВО (Mastery) ============
  {
    id: 'perfect-lesson',
    title: 'Перфекционист',
    description: 'Завершите урок со 100% правильностью',
    category: 'mastery',
    rarity: 'rare',
    icon: '💯',
    xpReward: 100,
    requirement: {
      type: 'perfect_lessons',
      value: 1,
      description: '1 урок со 100% правильностью'
    }
  },
  {
    id: 'perfect-5',
    title: 'Идеальная пятёрка',
    description: 'Завершите 5 уроков со 100% правильностью',
    category: 'mastery',
    rarity: 'epic',
    icon: '⭐',
    xpReward: 500,
    requirement: {
      type: 'perfect_lessons',
      value: 5,
      description: '5 уроков со 100% правильностью'
    }
  },
  {
    id: 'perfect-10',
    title: 'Безупречный',
    description: 'Завершите 10 уроков со 100% правильностью',
    category: 'mastery',
    rarity: 'legendary',
    icon: '🌟',
    xpReward: 1000,
    requirement: {
      type: 'perfect_lessons',
      value: 10,
      description: '10 уроков со 100% правильностью'
    }
  },
  {
    id: 'no-hints',
    title: 'Самостоятельный',
    description: 'Завершите урок без использования подсказок',
    category: 'mastery',
    rarity: 'rare',
    icon: '🧠',
    xpReward: 75,
    requirement: {
      type: 'lessons_no_hints',
      value: 1,
      description: '1 урок без подсказок'
    }
  },
  {
    id: 'no-hints-10',
    title: 'Уверенный в себе',
    description: 'Завершите 10 уроков без подсказок',
    category: 'mastery',
    rarity: 'epic',
    icon: '🎯',
    xpReward: 400,
    requirement: {
      type: 'lessons_no_hints',
      value: 10,
      description: '10 уроков без подсказок'
    }
  },
  {
    id: 'first-try',
    title: 'С первого раза',
    description: 'Ответьте правильно на все вопросы с первой попытки',
    category: 'mastery',
    rarity: 'epic',
    icon: '🎪',
    xpReward: 250,
    requirement: {
      type: 'first_try_perfect',
      value: 1,
      description: 'Все ответы с первой попытки'
    }
  },
  {
    id: 'quiz-master',
    title: 'Король викторин',
    description: 'Пройдите 20 тестов с результатом 90%+',
    category: 'mastery',
    rarity: 'epic',
    icon: '👑',
    xpReward: 500,
    requirement: {
      type: 'high_score_quizzes',
      value: 20,
      description: '20 тестов с 90%+'
    }
  },

  // ============ КАТЕГОРИЯ: СКОРОСТЬ (Speed) ============
  {
    id: 'speed-1',
    title: 'Быстрый старт',
    description: 'Завершите урок менее чем за 5 минут',
    category: 'speed',
    rarity: 'common',
    icon: '⚡',
    xpReward: 25,
    requirement: {
      type: 'lesson_under_minutes',
      value: 5,
      description: 'Урок менее чем за 5 минут'
    }
  },
  {
    id: 'speed-10',
    title: 'Скоростной',
    description: 'Завершите 10 уроков менее чем за 5 минут каждый',
    category: 'speed',
    rarity: 'rare',
    icon: '🚀',
    xpReward: 200,
    requirement: {
      type: 'speed_lessons',
      value: 10,
      description: '10 быстрых уроков'
    }
  },
  {
    id: 'marathon',
    title: 'Марафонец',
    description: 'Завершите 5 уроков за один день',
    category: 'speed',
    rarity: 'rare',
    icon: '🏃',
    xpReward: 150,
    requirement: {
      type: 'lessons_in_day',
      value: 5,
      description: '5 уроков за день'
    }
  },
  {
    id: 'ultra-marathon',
    title: 'Ультрамарафон',
    description: 'Завершите 10 уроков за один день',
    category: 'speed',
    rarity: 'epic',
    icon: '🏃‍♂️',
    xpReward: 400,
    requirement: {
      type: 'lessons_in_day',
      value: 10,
      description: '10 уроков за день'
    }
  },
  {
    id: 'weekend-warrior',
    title: 'Воин выходного дня',
    description: 'Завершите модуль за выходные',
    category: 'speed',
    rarity: 'rare',
    icon: '🗡️',
    xpReward: 200,
    requirement: {
      type: 'module_weekend',
      value: 1,
      description: 'Модуль за выходные'
    }
  },

  // ============ КАТЕГОРИЯ: XP И ПРОГРЕСС ============
  {
    id: 'xp-100',
    title: 'Первая сотня',
    description: 'Заработайте 100 XP',
    category: 'milestone',
    rarity: 'common',
    icon: '✨',
    xpReward: 10,
    requirement: {
      type: 'total_xp',
      value: 100,
      description: 'Заработать 100 XP'
    }
  },
  {
    id: 'xp-500',
    title: 'Пятисотка',
    description: 'Заработайте 500 XP',
    category: 'milestone',
    rarity: 'common',
    icon: '⭐',
    xpReward: 50,
    requirement: {
      type: 'total_xp',
      value: 500,
      description: 'Заработать 500 XP'
    }
  },
  {
    id: 'xp-1000',
    title: 'Тысячник',
    description: 'Заработайте 1000 XP',
    category: 'milestone',
    rarity: 'rare',
    icon: '💫',
    xpReward: 100,
    requirement: {
      type: 'total_xp',
      value: 1000,
      description: 'Заработать 1000 XP'
    }
  },
  {
    id: 'xp-5000',
    title: 'Пятитысячник',
    description: 'Заработайте 5000 XP',
    category: 'milestone',
    rarity: 'epic',
    icon: '🌟',
    xpReward: 500,
    requirement: {
      type: 'total_xp',
      value: 5000,
      description: 'Заработать 5000 XP'
    }
  },
  {
    id: 'xp-10000',
    title: 'Легенда XP',
    description: 'Заработайте 10000 XP',
    category: 'milestone',
    rarity: 'legendary',
    icon: '👑',
    xpReward: 1000,
    requirement: {
      type: 'total_xp',
      value: 10000,
      description: 'Заработать 10000 XP'
    }
  },
  {
    id: 'level-5',
    title: 'Пятый уровень',
    description: 'Достигните 5 уровня',
    category: 'milestone',
    rarity: 'common',
    icon: '🎖️',
    xpReward: 50,
    requirement: {
      type: 'level',
      value: 5,
      description: 'Достичь 5 уровня'
    }
  },
  {
    id: 'level-10',
    title: 'Десятый уровень',
    description: 'Достигните 10 уровня',
    category: 'milestone',
    rarity: 'rare',
    icon: '🏅',
    xpReward: 100,
    requirement: {
      type: 'level',
      value: 10,
      description: 'Достичь 10 уровня'
    }
  },
  {
    id: 'level-20',
    title: 'Двадцатый уровень',
    description: 'Достигните 20 уровня',
    category: 'milestone',
    rarity: 'epic',
    icon: '🎯',
    xpReward: 300,
    requirement: {
      type: 'level',
      value: 20,
      description: 'Достичь 20 уровня'
    }
  },
  {
    id: 'level-50',
    title: 'Полтинник',
    description: 'Достигните 50 уровня',
    category: 'milestone',
    rarity: 'legendary',
    icon: '👑',
    xpReward: 1000,
    requirement: {
      type: 'level',
      value: 50,
      description: 'Достичь 50 уровня'
    }
  },

  // ============ КАТЕГОРИЯ: СОЦИАЛЬНЫЕ (Social) ============
  {
    id: 'first-message',
    title: 'Социальный дебют',
    description: 'Отправьте первое сообщение',
    category: 'social',
    rarity: 'common',
    icon: '💬',
    xpReward: 10,
    requirement: {
      type: 'messages_sent',
      value: 1,
      description: 'Отправить 1 сообщение'
    }
  },
  {
    id: 'messages-10',
    title: 'Болтун',
    description: 'Отправьте 10 сообщений',
    category: 'social',
    rarity: 'common',
    icon: '💭',
    xpReward: 25,
    requirement: {
      type: 'messages_sent',
      value: 10,
      description: 'Отправить 10 сообщений'
    }
  },
  {
    id: 'messages-50',
    title: 'Коммуникатор',
    description: 'Отправьте 50 сообщений',
    category: 'social',
    rarity: 'rare',
    icon: '🗣️',
    xpReward: 100,
    requirement: {
      type: 'messages_sent',
      value: 50,
      description: 'Отправить 50 сообщений'
    }
  },
  {
    id: 'ai-chat-10',
    title: 'Друг AI',
    description: 'Пообщайтесь с AI-куратором 10 раз',
    category: 'social',
    rarity: 'common',
    icon: '🤖',
    xpReward: 50,
    requirement: {
      type: 'ai_conversations',
      value: 10,
      description: '10 диалогов с AI'
    }
  },
  {
    id: 'ai-chat-50',
    title: 'AI-компаньон',
    description: 'Пообщайтесь с AI-куратором 50 раз',
    category: 'social',
    rarity: 'rare',
    icon: '🦾',
    xpReward: 200,
    requirement: {
      type: 'ai_conversations',
      value: 50,
      description: '50 диалогов с AI'
    }
  },
  {
    id: 'help-others',
    title: 'Помощник',
    description: 'Помогите другим студентам (получите 5 благодарностей)',
    category: 'social',
    rarity: 'rare',
    icon: '🤝',
    xpReward: 150,
    requirement: {
      type: 'thanks_received',
      value: 5,
      description: '5 благодарностей'
    }
  },

  // ============ КАТЕГОРИЯ: ИССЛЕДОВАНИЕ (Exploration) ============
  {
    id: 'profile-complete',
    title: 'Заполненный профиль',
    description: 'Заполните свой профиль на 100%',
    category: 'exploration',
    rarity: 'common',
    icon: '👤',
    xpReward: 50,
    requirement: {
      type: 'profile_completion',
      value: 100,
      description: 'Профиль 100%'
    }
  },
  {
    id: 'first-avatar',
    title: 'Свой стиль',
    description: 'Загрузите свой аватар',
    category: 'exploration',
    rarity: 'common',
    icon: '🖼️',
    xpReward: 25,
    requirement: {
      type: 'avatar_uploaded',
      value: 1,
      description: 'Загрузить аватар'
    }
  },
  {
    id: 'neurohub-explorer',
    title: 'Исследователь NeuroHUB',
    description: 'Посетите все разделы NeuroHUB',
    category: 'exploration',
    rarity: 'rare',
    icon: '🧭',
    xpReward: 100,
    requirement: {
      type: 'neurohub_sections_visited',
      value: 5,
      description: 'Все разделы NeuroHUB'
    }
  },
  {
    id: 'course-preview',
    title: 'Любопытный',
    description: 'Просмотрите 5 разных курсов',
    category: 'exploration',
    rarity: 'common',
    icon: '👀',
    xpReward: 30,
    requirement: {
      type: 'courses_viewed',
      value: 5,
      description: 'Просмотреть 5 курсов'
    }
  },
  {
    id: 'early-bird',
    title: 'Ранняя пташка',
    description: 'Завершите урок до 8:00 утра',
    category: 'exploration',
    rarity: 'rare',
    icon: '🌅',
    xpReward: 75,
    requirement: {
      type: 'lesson_before_8am',
      value: 1,
      description: 'Урок до 8:00'
    }
  },
  {
    id: 'night-owl',
    title: 'Сова',
    description: 'Завершите урок после 23:00',
    category: 'exploration',
    rarity: 'rare',
    icon: '🦉',
    xpReward: 75,
    requirement: {
      type: 'lesson_after_11pm',
      value: 1,
      description: 'Урок после 23:00'
    }
  },
  {
    id: 'feedback-giver',
    title: 'Критик',
    description: 'Оставьте отзыв о курсе',
    category: 'exploration',
    rarity: 'common',
    icon: '📝',
    xpReward: 30,
    requirement: {
      type: 'feedback_given',
      value: 1,
      description: 'Оставить отзыв'
    }
  },

  // ============ КАТЕГОРИЯ: СЕКРЕТНЫЕ ДОСТИЖЕНИЯ ============
  {
    id: 'birthday',
    title: 'С днём рождения!',
    description: 'Зайдите на платформу в свой день рождения',
    category: 'milestone',
    rarity: 'legendary',
    icon: '🎂',
    xpReward: 500,
    requirement: {
      type: 'login_birthday',
      value: 1,
      description: 'Вход в день рождения'
    },
    hidden: true
  },
  {
    id: 'new-year',
    title: 'С Новым Годом!',
    description: 'Учитесь 31 декабря или 1 января',
    category: 'milestone',
    rarity: 'epic',
    icon: '🎉',
    xpReward: 300,
    requirement: {
      type: 'lesson_new_year',
      value: 1,
      description: 'Урок в Новый Год'
    },
    hidden: true
  },
  {
    id: 'midnight-scholar',
    title: 'Полуночный учёный',
    description: 'Завершите урок ровно в полночь (00:00)',
    category: 'exploration',
    rarity: 'epic',
    icon: '🕛',
    xpReward: 200,
    requirement: {
      type: 'lesson_at_midnight',
      value: 1,
      description: 'Урок в 00:00'
    },
    hidden: true
  },
  {
    id: 'lucky-7',
    title: 'Счастливая семёрка',
    description: 'Завершите 7 уроков 7-го числа',
    category: 'exploration',
    rarity: 'rare',
    icon: '🍀',
    xpReward: 150,
    requirement: {
      type: 'seven_lessons_7th',
      value: 7,
      description: '7 уроков 7-го числа'
    },
    hidden: true
  },
  {
    id: 'comeback',
    title: 'Возвращение',
    description: 'Вернитесь после перерыва в 30+ дней',
    category: 'milestone',
    rarity: 'rare',
    icon: '🔄',
    xpReward: 100,
    requirement: {
      type: 'return_after_break',
      value: 30,
      description: 'Возврат после 30 дней'
    },
    hidden: true
  },

  // ============ ДОПОЛНИТЕЛЬНЫЕ ДОСТИЖЕНИЯ ============
  {
    id: 'weekend-learner',
    title: 'Выходной? Не для меня!',
    description: 'Учитесь каждые выходные в течение месяца',
    category: 'streak',
    rarity: 'rare',
    icon: '📅',
    xpReward: 200,
    requirement: {
      type: 'weekend_streak',
      value: 4,
      description: '4 выходных подряд'
    }
  },
  {
    id: 'video-watcher',
    title: 'Киноман',
    description: 'Просмотрите 20 видео-уроков',
    category: 'learning',
    rarity: 'common',
    icon: '🎬',
    xpReward: 75,
    requirement: {
      type: 'videos_watched',
      value: 20,
      description: '20 видео-уроков'
    }
  },
  {
    id: 'note-taker',
    title: 'Конспектатор',
    description: 'Сделайте 50 заметок в уроках',
    category: 'learning',
    rarity: 'rare',
    icon: '📔',
    xpReward: 100,
    requirement: {
      type: 'notes_created',
      value: 50,
      description: '50 заметок'
    }
  },
  {
    id: 'bookmark-collector',
    title: 'Коллекционер закладок',
    description: 'Добавьте 25 уроков в избранное',
    category: 'exploration',
    rarity: 'common',
    icon: '🔖',
    xpReward: 50,
    requirement: {
      type: 'bookmarks_created',
      value: 25,
      description: '25 закладок'
    }
  },
  {
    id: 'practice-master',
    title: 'Мастер практики',
    description: 'Выполните 50 практических заданий',
    category: 'learning',
    rarity: 'epic',
    icon: '⚒️',
    xpReward: 400,
    requirement: {
      type: 'practice_exercises',
      value: 50,
      description: '50 практических заданий'
    }
  },
  {
    id: 'certification-ready',
    title: 'Готов к сертификации',
    description: 'Сдайте все финальные экзамены курса',
    category: 'mastery',
    rarity: 'legendary',
    icon: '📜',
    xpReward: 1500,
    requirement: {
      type: 'all_exams_passed',
      value: 1,
      description: 'Все экзамены сданы'
    }
  },
  {
    id: 'multitasker',
    title: 'Мультизадачник',
    description: 'Изучайте 3 курса одновременно',
    category: 'exploration',
    rarity: 'rare',
    icon: '🎭',
    xpReward: 150,
    requirement: {
      type: 'active_courses',
      value: 3,
      description: '3 активных курса'
    }
  },
  {
    id: 'resourceful',
    title: 'Находчивый',
    description: 'Используйте все доступные материалы урока',
    category: 'exploration',
    rarity: 'rare',
    icon: '🧰',
    xpReward: 100,
    requirement: {
      type: 'all_resources_used',
      value: 5,
      description: 'Все материалы в 5 уроках'
    }
  },
  {
    id: 'knowledge-sharer',
    title: 'Делитель знаниями',
    description: 'Поделитесь 10 уроками с друзьями',
    category: 'social',
    rarity: 'rare',
    icon: '🎁',
    xpReward: 100,
    requirement: {
      type: 'lessons_shared',
      value: 10,
      description: '10 уроков поделились'
    }
  },
  {
    id: 'error-hunter',
    title: 'Охотник за ошибками',
    description: 'Сообщите о 5 найденных ошибках в курсах',
    category: 'social',
    rarity: 'epic',
    icon: '🐛',
    xpReward: 250,
    requirement: {
      type: 'bugs_reported',
      value: 5,
      description: '5 сообщений об ошибках'
    }
  },
];

// Категории достижений с описаниями
export const ACHIEVEMENT_CATEGORIES = {
  learning: {
    name: 'Обучение',
    description: 'Достижения за прохождение уроков и модулей',
    color: '#3b82f6', // blue
    icon: '📚'
  },
  streak: {
    name: 'Постоянство',
    description: 'Достижения за регулярное обучение',
    color: '#ef4444', // red
    icon: '🔥'
  },
  mastery: {
    name: 'Мастерство',
    description: 'Достижения за идеальное выполнение',
    color: '#8b5cf6', // purple
    icon: '⭐'
  },
  social: {
    name: 'Социальные',
    description: 'Достижения за взаимодействие',
    color: '#10b981', // green
    icon: '🤝'
  },
  speed: {
    name: 'Скорость',
    description: 'Достижения за быстрое обучение',
    color: '#f59e0b', // amber
    icon: '⚡'
  },
  exploration: {
    name: 'Исследование',
    description: 'Достижения за изучение платформы',
    color: '#06b6d4', // cyan
    icon: '🧭'
  },
  milestone: {
    name: 'Вехи',
    description: 'Важные этапы развития',
    color: '#ec4899', // pink
    icon: '🏆'
  }
};

// Редкость достижений
export const RARITY_CONFIG = {
  common: {
    name: 'Обычное',
    color: '#9ca3af', // gray
    glow: 'rgba(156, 163, 175, 0.3)'
  },
  rare: {
    name: 'Редкое',
    color: '#3b82f6', // blue
    glow: 'rgba(59, 130, 246, 0.4)'
  },
  epic: {
    name: 'Эпическое',
    color: '#a855f7', // purple
    glow: 'rgba(168, 85, 247, 0.5)'
  },
  legendary: {
    name: 'Легендарное',
    color: '#f59e0b', // amber/gold
    glow: 'rgba(245, 158, 11, 0.6)'
  }
};

// Функция для получения достижений по категории
export const getAchievementsByCategory = (category: AchievementCategory) => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

// Функция для получения достижения по ID
export const getAchievementById = (id: string) => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

// Функция для получения всех не скрытых достижений
export const getVisibleAchievements = () => {
  return ACHIEVEMENTS.filter(a => !a.hidden);
};

// Функция для получения скрытых достижений
export const getHiddenAchievements = () => {
  return ACHIEVEMENTS.filter(a => a.hidden);
};

