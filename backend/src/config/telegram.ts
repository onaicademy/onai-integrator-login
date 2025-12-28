/**
 * Telegram Bots Configuration
 */

export interface TelegramConfig {
  mentorBotToken: string;
  adminBotToken: string;
  adminChatId?: string;
  leadsBotToken?: string;
  leadsChatId?: string;
}

/**
 * Получить конфигурацию Telegram ботов
 */
export function getTelegramConfig(): TelegramConfig {
  const mentorBotToken = process.env.TELEGRAM_MENTOR_BOT_TOKEN || 'placeholder_bot_token';
  const adminBotToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || 'placeholder_admin_bot_token';
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const leadsBotToken = process.env.TELEGRAM_LEADS_BOT_TOKEN;
  const leadsChatId = process.env.TELEGRAM_LEADS_CHAT_ID;

  // ✅ Allow placeholder tokens (Telegram features disabled in production)
  if (!mentorBotToken || mentorBotToken === 'undefined') {
    throw new Error('Missing TELEGRAM_MENTOR_BOT_TOKEN in environment variables');
  }

  if (!adminBotToken || adminBotToken === 'undefined') {
    throw new Error('Missing TELEGRAM_ADMIN_BOT_TOKEN in environment variables');
  }

  return {
    mentorBotToken,
    adminBotToken,
    adminChatId,
    leadsBotToken,
    leadsChatId,
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

