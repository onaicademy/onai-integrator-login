/**
 * ⚠️ DISABLED: Telegram Report Scheduler
 * 
 * Этот модуль был отключен по запросу пользователя.
 * Причина: баг с дублированием сообщений (3x) из-за множественных PM2 инстансов.
 * 
 * Для повторного включения:
 * 1. Раскомментировать код ниже
 * 2. Перезапустить backend с одним инстансом PM2
 */

// Все функции - заглушки (stubs)
export function scheduleYesterdayReport() {
  // DISABLED - см. комментарий выше
}

export function scheduleCurrentStatusReport() {
  // DISABLED - см. комментарий выше
}

export function scheduleDailyReport() {
  // DISABLED - см. комментарий выше
}

export function scheduleWeeklyReport() {
  // DISABLED - см. комментарий выше
}

// Инициализация - полностью отключена
export function initScheduler() {
  console.log('⚠️ [Scheduler] Telegram отчеты ОТКЛЮЧЕНЫ');
  console.log('   Функционал деактивирован по запросу администратора');
  // Ничего не инициализируем
}

export default {
  initScheduler,
  scheduleYesterdayReport,
  scheduleCurrentStatusReport,
  scheduleDailyReport,
  scheduleWeeklyReport,
};
