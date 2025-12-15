/**
 * 🚨 ALERTING SYSTEM - Система уведомлений при критичных ошибках
 * 
 * Отправляет уведомления админам при:
 * - Частых падениях интеграций (AmoCRM, Email, SMS)
 * - Превышении лимитов памяти
 * - Критичных ошибках в API
 * 
 * Использование:
 * ```typescript
 * import { sendAlert, trackIntegrationFailure } from '@/utils/alerting';
 * 
 * // Простой алерт
 * await sendAlert('AmoCRM не отвечает уже 5 минут', 'critical');
 * 
 * // Отслеживание сбоев с автоматическим алертом
 * trackIntegrationFailure('amocrm', 'update_deal');
 * ```
 */

import { logger } from './logger';

type AlertSeverity = 'info' | 'warning' | 'critical';

interface AlertConfig {
  /** Telegram Bot Token для отправки уведомлений */
  telegramBotToken?: string;
  
  /** Telegram Chat ID админов */
  telegramChatId?: string;
  
  /** Email для критичных алертов */
  adminEmail?: string;
  
  /** Webhook URL (например, Slack, Discord) */
  webhookUrl?: string;
}

// Конфигурация из env
const config: AlertConfig = {
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.ADMIN_TELEGRAM_CHAT_ID,
  adminEmail: process.env.ADMIN_EMAIL,
  webhookUrl: process.env.ALERT_WEBHOOK_URL,
};

// Счётчики сбоев для предотвращения спама
const failureCounters = new Map<string, number>();
const lastAlertTime = new Map<string, number>();

// Минимальный интервал между алертами (5 минут)
const MIN_ALERT_INTERVAL = 5 * 60 * 1000;

// Пороги для срабатывания алертов
const FAILURE_THRESHOLDS = {
  amocrm: 5,      // 5 неудачных попыток подряд
  email: 10,      // 10 неудачных email
  sms: 10,        // 10 неудачных SMS
  openai: 3,      // 3 неудачных запроса к OpenAI
  database: 3,    // 3 ошибки БД подряд
};

/**
 * 📤 Отправка алерта админам
 */
export async function sendAlert(
  message: string,
  severity: AlertSeverity = 'warning'
): Promise<void> {
  const alertKey = `${severity}:${message}`;
  
  // Проверяем, не отправляли ли уже недавно такой же алерт
  const lastAlert = lastAlertTime.get(alertKey);
  if (lastAlert && Date.now() - lastAlert < MIN_ALERT_INTERVAL) {
    logger.debug(`🔕 Alert throttled: "${message}" (sent ${Math.round((Date.now() - lastAlert) / 1000)}s ago)`);
    return;
  }
  
  // Эмодзи для разных уровней
  const emoji = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🔴',
  }[severity];
  
  const formattedMessage = `${emoji} [${severity.toUpperCase()}] ${message}\n\n📅 ${new Date().toLocaleString('ru-RU')}`;
  
  logger.warn(`🚨 ALERT [${severity}]: ${message}`);
  
  // Отправка в Telegram
  if (config.telegramBotToken && config.telegramChatId) {
    try {
      await sendTelegramAlert(formattedMessage);
      logger.info('✅ Alert sent to Telegram');
    } catch (error) {
      logger.error('❌ Failed to send Telegram alert:', error);
    }
  }
  
  // Отправка на Webhook (опционально)
  if (config.webhookUrl) {
    try {
      await sendWebhookAlert(formattedMessage, severity);
      logger.info('✅ Alert sent to Webhook');
    } catch (error) {
      logger.error('❌ Failed to send Webhook alert:', error);
    }
  }
  
  // Обновляем время последнего алерта
  lastAlertTime.set(alertKey, Date.now());
}

/**
 * 📱 Отправка в Telegram
 */
async function sendTelegramAlert(message: string): Promise<void> {
  if (!config.telegramBotToken || !config.telegramChatId) {
    return;
  }
  
  const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });
}

/**
 * 🔗 Отправка на Webhook
 */
async function sendWebhookAlert(message: string, severity: AlertSeverity): Promise<void> {
  if (!config.webhookUrl) {
    return;
  }
  
  await fetch(config.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: message,
      severity,
      timestamp: new Date().toISOString(),
      service: 'onai-backend',
    }),
  });
}

/**
 * 📊 Отслеживание сбоев интеграции с автоматическим алертом
 * 
 * @param integration - Название интеграции (amocrm, email, sms, openai, database)
 * @param operation - Название операции (update_deal, send_email и т.д.)
 * @param success - Успешна ли операция
 */
export function trackIntegrationFailure(
  integration: keyof typeof FAILURE_THRESHOLDS,
  operation: string,
  success: boolean = false
): void {
  const key = `${integration}:${operation}`;
  
  if (success) {
    // Сброс счётчика при успехе
    if (failureCounters.has(key)) {
      logger.debug(`✅ ${integration}: ${operation} - success, resetting counter`);
      failureCounters.delete(key);
    }
    return;
  }
  
  // Инкрементируем счётчик ошибок
  const currentCount = (failureCounters.get(key) || 0) + 1;
  failureCounters.set(key, currentCount);
  
  logger.warn(`⚠️ ${integration}: ${operation} failed (${currentCount} consecutive failures)`);
  
  // Проверяем, превышен ли порог
  const threshold = FAILURE_THRESHOLDS[integration];
  
  if (currentCount >= threshold) {
    // Отправляем алерт
    sendAlert(
      `${integration.toUpperCase()}: ${operation} failed ${currentCount} times consecutively. Possible service degradation.`,
      currentCount >= threshold * 2 ? 'critical' : 'warning'
    );
    
    // Сбрасываем счётчик чтобы не спамить (следующий алерт через порог попыток)
    failureCounters.set(key, 0);
  }
}

/**
 * 🔍 Мониторинг памяти с алертами
 */
export function checkMemoryUsage(): void {
  const memoryUsage = process.memoryUsage();
  const heapUsedPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);
  const rssGB = (memoryUsage.rss / 1024 / 1024 / 1024).toFixed(2);
  
  logger.debug(`💾 Memory: ${heapUsedPercent}% heap, ${rssGB}GB RSS`);
  
  // Алерт при высоком использовании памяти
  if (heapUsedPercent > 90) {
    sendAlert(
      `High memory usage: ${heapUsedPercent}% heap (${rssGB}GB RSS). Risk of OOM crash.`,
      'critical'
    );
  } else if (heapUsedPercent > 80) {
    sendAlert(
      `Elevated memory usage: ${heapUsedPercent}% heap (${rssGB}GB RSS).`,
      'warning'
    );
  }
}

/**
 * 📊 Получить статистику по сбоям
 */
export function getFailureStats(): Record<string, number> {
  const stats: Record<string, number> = {};
  failureCounters.forEach((count, key) => {
    stats[key] = count;
  });
  return stats;
}

/**
 * 🔄 Сбросить счётчики (для тестирования или после решения проблемы)
 */
export function resetFailureCounters(): void {
  failureCounters.clear();
  logger.info('🔄 Failure counters reset');
}

/**
 * Экспортируем всё
 */
export default {
  sendAlert,
  trackIntegrationFailure,
  checkMemoryUsage,
  getFailureStats,
  resetFailureCounters,
};
