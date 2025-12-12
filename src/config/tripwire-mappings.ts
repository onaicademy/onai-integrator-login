/**
 * 🎯 TRIPWIRE CONFIGURATION - CENTRALIZED MAPPINGS (FRONTEND)
 * 
 * Frontend версия - те же маппинги для консистентности
 */

export const TRIPWIRE_CONFIG = {
  /**
   * Маппинг Module ID → Lesson ID (для навигации)
   */
  MODULE_TO_FIRST_LESSON: {
    16: 67, // Module 1 → Lesson 67
    17: 68, // Module 2 → Lesson 68
    18: 69, // Module 3 → Lesson 69
  } as Record<number, number>,

  /**
   * Маппинг Module ID → Next Module ID
   */
  NEXT_MODULE: {
    16: 17, // Module 1 → Module 2
    17: 18, // Module 2 → Module 3
    18: null, // Module 3 → конец
  } as Record<number, number | null>,

  /**
   * Маппинг Module ID → Next Lesson ID (для кнопки "Следующий модуль")
   */
  NEXT_LESSON: {
    16: 68, // После Module 1 (Lesson 67) → Lesson 68
    17: 69, // После Module 2 (Lesson 68) → Lesson 69
    18: null, // После Module 3 (Lesson 69) → конец
  } as Record<number, number | null>,

  TOTAL_MODULES: 3,
};

/**
 * Получить ID следующего урока после завершения модуля
 */
export function getNextLessonId(moduleId: number): number | null {
  return TRIPWIRE_CONFIG.NEXT_LESSON[moduleId] || null;
}

/**
 * Получить первый урок модуля
 */
export function getModuleFirstLesson(moduleId: number): number | null {
  return TRIPWIRE_CONFIG.MODULE_TO_FIRST_LESSON[moduleId] || null;
}

export default TRIPWIRE_CONFIG;
