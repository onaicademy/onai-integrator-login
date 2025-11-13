/**
 * Telegram Bots Configuration
 */

export interface TelegramConfig {
  mentorBotToken: string;
  adminBotToken: string;
  adminChatId?: string;
}

/**
 * Получить конфигурацию Telegram ботов
 */
export function getTelegramConfig(): TelegramConfig {
  const mentorBotToken = process.env.TELEGRAM_MENTOR_BOT_TOKEN;
  const adminBotToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!mentorBotToken) {
    throw new Error('Missing TELEGRAM_MENTOR_BOT_TOKEN in environment variables');
  }

  if (!adminBotToken) {
    throw new Error('Missing TELEGRAM_ADMIN_BOT_TOKEN in environment variables');
  }

  return {
    mentorBotToken,
    adminBotToken,
    adminChatId,
  };
}

/**
 * Проверить что все токены настроены
 */
export function validateTelegramConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!process.env.TELEGRAM_MENTOR_BOT_TOKEN) {
    missing.push('TELEGRAM_MENTOR_BOT_TOKEN');
  }

  if (!process.env.TELEGRAM_ADMIN_BOT_TOKEN) {
    missing.push('TELEGRAM_ADMIN_BOT_TOKEN');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

console.log('✅ Telegram config module loaded');

