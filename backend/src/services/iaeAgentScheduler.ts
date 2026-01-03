/**
 * ⚠️ DISABLED: IAE Agent Scheduler
 * 
 * Этот модуль отключен по запросу пользователя.
 * Причина: баг с дублированием сообщений (3x) из-за множественных PM2 инстансов.
 * 
 * Для повторного включения:
 * 1. Раскомментировать код ниже
 * 2. Перезапустить backend с одним инстансом PM2
 */

// Все функции - заглушки (stubs)
export function scheduleIAEDailyReport() {
  // DISABLED
}

export function scheduleIAECurrentStatus() {
  // DISABLED
}

export function scheduleIAEMonthlyReport() {
  // DISABLED
}

export function scheduleIAEHealthCheck() {
  // DISABLED
}

// 🚀 Start all IAE schedulers - DISABLED
export function startIAESchedulers() {
  console.log('⚠️ [IAE Scheduler] ОТКЛЮЧЕНО - функционал деактивирован по запросу администратора');
  // Ничего не запускаем
}


// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [IAE Scheduler] Received SIGTERM, stopping schedulers...');
});

process.on('SIGINT', () => {
  console.log('🛑 [IAE Scheduler] Received SIGINT, stopping schedulers...');
});
