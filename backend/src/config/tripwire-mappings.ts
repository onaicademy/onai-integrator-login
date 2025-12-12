/**
 * 🎯 TRIPWIRE CONFIGURATION - CENTRALIZED MAPPINGS
 * 
 * Все хардкод значения для Tripwire модулей и уроков в одном месте
 * Упрощает обслуживание и изменения
 */

export const TRIPWIRE_CONFIG = {
  /**
   * Маппинг Module ID → Lesson IDs
   * Каждый Tripwire модуль содержит ровно 1 урок
   */
  MODULE_TO_LESSONS: {
    16: [67], // Module 1 (ID=16) → Lesson 67
    17: [68], // Module 2 (ID=17) → Lesson 68
    18: [69], // Module 3 (ID=18) → Lesson 69
  } as Record<number, number[]>,

  /**
   * Маппинг Lesson ID → Module ID (обратный)
   */
  LESSON_TO_MODULE: {
    67: 16, // Lesson 67 → Module 1 (ID=16)
    68: 17, // Lesson 68 → Module 2 (ID=17)
    69: 18, // Lesson 69 → Module 3 (ID=18)
  } as Record<number, number>,

  /**
   * Маппинг Lesson ID → Lesson Number (для AmoCRM)
   */
  LESSON_TO_NUMBER: {
    67: 1, // Lesson 67 → Урок 1
    68: 2, // Lesson 68 → Урок 2
    69: 3, // Lesson 69 → Урок 3
  } as Record<number, number>,

  /**
   * Маппинг Module Number → Module ID
   */
  MODULE_NUMBER_TO_ID: {
    1: 16, // Module 1 → ID 16
    2: 17, // Module 2 → ID 17
    3: 18, // Module 3 → ID 18
  } as Record<number, number>,

  /**
   * Обратный маппинг Module ID → Module Number
   */
  MODULE_ID_TO_NUMBER: {
    16: 1, // ID 16 → Module 1
    17: 2, // ID 17 → Module 2
    18: 3, // ID 18 → Module 3
  } as Record<number, number>,

  /**
   * Маппинг Module Number → Achievement ID
   */
  MODULE_TO_ACHIEVEMENT: {
    1: 'first_module_complete',
    2: 'second_module_complete',
    3: 'third_module_complete',
  } as Record<number, string>,

  /**
   * Маппинг Module Number → Next Module ID (для unlock)
   */
  NEXT_MODULE_UNLOCK: {
    1: 17, // После Module 1 (ID=16) → открываем Module 2 (ID=17)
    2: 18, // После Module 2 (ID=17) → открываем Module 3 (ID=18)
    3: null, // После Module 3 (ID=18) → нет следующего
  } as Record<number, number | null>,

  /**
   * Общие константы
   */
  TOTAL_MODULES: 3,
  MIN_MODULE_ID: 16,
  MAX_MODULE_ID: 18,
  MIN_LESSON_ID: 67,
  MAX_LESSON_ID: 69,

  /**
   * Validation helpers
   */
  isValidModuleId: (moduleId: number): boolean => {
    return moduleId >= 16 && moduleId <= 18;
  },

  isValidLessonId: (lessonId: number): boolean => {
    return lessonId >= 67 && lessonId <= 69;
  },

  isValidModuleNumber: (moduleNumber: number): boolean => {
    return moduleNumber >= 1 && moduleNumber <= 3;
  },
};

/**
 * Helper функции для работы с маппингами
 */

export function getModuleLessons(moduleId: number): number[] {
  return TRIPWIRE_CONFIG.MODULE_TO_LESSONS[moduleId] || [];
}

export function getLessonModule(lessonId: number): number | null {
  return TRIPWIRE_CONFIG.LESSON_TO_MODULE[lessonId] || null;
}

export function getModuleNumber(moduleId: number): number | null {
  return TRIPWIRE_CONFIG.MODULE_ID_TO_NUMBER[moduleId] || null;
}

export function getModuleId(moduleNumber: number): number | null {
  return TRIPWIRE_CONFIG.MODULE_NUMBER_TO_ID[moduleNumber] || null;
}

export function getNextModuleToUnlock(moduleNumber: number): number | null {
  return TRIPWIRE_CONFIG.NEXT_MODULE_UNLOCK[moduleNumber] || null;
}

export function getAchievementId(moduleNumber: number): string | null {
  return TRIPWIRE_CONFIG.MODULE_TO_ACHIEVEMENT[moduleNumber] || null;
}

export function getLessonNumber(lessonId: number): number | null {
  return TRIPWIRE_CONFIG.LESSON_TO_NUMBER[lessonId] || null;
}

/**
 * Экспорт дефолтный для удобства
 */
export default TRIPWIRE_CONFIG;
