/**
 * Telegram Service - отправка сообщений через Telegram Bot API
 */

import { getTelegramConfig } from '../config/telegram';

const config = getTelegramConfig();

/**
 * Отправить сообщение через Mentor бота
 */
export async function sendMentorMessage(
  chatId: string,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.mentorBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parseMode,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Telegram API error:', errorData);
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Mentor message sent to chat ${chatId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send mentor message:', error.message);
    throw error;
  }
}

/**
 * Отправить сообщение через Admin бота
 */
export async function sendAdminMessage(
  chatId: string,
  message: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown'
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.adminBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parseMode,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Telegram API error:', errorData);
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Admin message sent to chat ${chatId}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send admin message:', error.message);
    throw error;
  }
}

/**
 * Отправить сообщение администратору (использует TELEGRAM_ADMIN_CHAT_ID из .env)
 */
export async function sendAdminNotification(message: string): Promise<boolean> {
  if (!config.adminChatId) {
    console.warn('⚠️ TELEGRAM_ADMIN_CHAT_ID not configured, skipping notification');
    return false;
  }

  return sendAdminMessage(config.adminChatId, message);
}

/**
 * Отправить уведомление о новом лиде через Leads бота
 */
export async function sendLeadNotification(
  leadData: {
    name: string;
    phone: string;
    email?: string;
    paymentMethod?: 'kaspi' | 'card' | 'manager';
    source?: string;
  }
): Promise<boolean> {
  try {
    // Используем LEADS бот если настроен, иначе ADMIN бот
    const botToken = config.leadsBotToken || config.adminBotToken;
    const chatId = config.leadsChatId || config.adminChatId;

    if (!botToken) {
      console.warn('⚠️ No Telegram bot token configured for lead notifications');
      return false;
    }

    if (!chatId) {
      console.warn('⚠️ No Telegram chat ID configured for lead notifications');
      return false;
    }

    // Определяем тип заявки по source
    const isProftest = leadData.source?.toLowerCase().includes('proftest');
    const leadType = isProftest ? '📝 ПРОФТЕСТ' : '🎓 ЭКСПРЕСС КУРС';
    
    // Форматируем способ оплаты
    const paymentMethodText = leadData.paymentMethod 
      ? leadData.paymentMethod === 'kaspi' 
        ? '💳 Kaspi банк'
        : leadData.paymentMethod === 'card' 
        ? '💰 Банковская карта'
        : '💬 Чат с менеджером'
      : '❓ Не выбран';

    // Создаем красивое сообщение
    const message = 
      `🎯 *НОВАЯ ЗАЯВКА - ${leadType}*\n\n` +
      `👤 *Имя:* ${leadData.name}\n` +
      `📱 *Телефон:* ${leadData.phone}\n` +
      `${leadData.email ? `📧 *Email:* ${leadData.email}\n` : ''}` +
      `${leadData.paymentMethod ? `💳 *Способ оплаты:* ${paymentMethodText}\n` : ''}` +
      `📍 *Источник:* ${leadData.source || 'expresscourse'}\n\n` +
      `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

    console.log(`📱 Sending lead notification to chat ${chatId} using ${config.leadsBotToken ? 'LEADS' : 'ADMIN'} bot`);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Telegram Leads Bot API error:', errorData);
      throw new Error(`Telegram API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Lead notification sent to chat ${chatId} using ${config.leadsBotToken ? 'LEADS' : 'ADMIN'} bot`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send lead notification:', error.message);
    // Не выбрасываем ошибку, чтобы не блокировать основной процесс
    return false;
  }
}

/**
 * Шаблоны сообщений для студентов (Mentor Bot)
 */
export const MENTOR_TEMPLATES = {
  motivation: (name: string, progress: number) =>
    `Привет, ${name}! 💪\n\nТы уже на ${progress}% курса - отличный результат!\nПродолжай в том же духе! 🚀`,

  reminder: (name: string, daysInactive: number) =>
    `${name}, давно не виделись! 😊\n\nПрошло уже ${daysInactive} дня с последнего урока.\nГотов продолжить обучение? 📚`,

  help: (name: string, lessonName: string) =>
    `${name}, замечаю что урок "${lessonName}" вызывает сложности 🤔\n\nНужна помощь? Напиши AI-куратору или задай вопрос в сообществе!`,

  achievement: (name: string, achievementName: string) =>
    `Поздравляю, ${name}! 🎉\n\nТы разблокировал достижение: "${achievementName}"!\nПродолжай в том же духе! ⭐`,

  streak: (name: string, days: number) =>
    `Огонь, ${name}! 🔥\n\n${days} дней подряд на платформе!\nТы настоящий чемпион! 🏆`,

  warning: (name: string) =>
    `${name}, твой стрик под угрозой! ⚠️\n\nЗайди сегодня на платформу чтобы не потерять прогресс! 💪`,
};

/**
 * Шаблоны отчётов для администратора (Admin Bot)
 */
export const ADMIN_TEMPLATES = {
  dailyReport: (stats: {
    activeStudents: number;
    completedLessons: number;
    newRegistrations: number;
  }) =>
    `📊 *Ежедневный отчёт*\n\n` +
    `👥 Активных студентов: ${stats.activeStudents}\n` +
    `✅ Завершено уроков: ${stats.completedLessons}\n` +
    `🆕 Новых регистраций: ${stats.newRegistrations}\n\n` +
    `_${new Date().toLocaleDateString('ru-RU')}_`,

  weeklyReport: (stats: {
    totalStudents: number;
    activePercentage: number;
    avgProgress: number;
    topCourse: string;
  }) =>
    `📈 *Недельный отчёт*\n\n` +
    `👥 Всего студентов: ${stats.totalStudents}\n` +
    `🔥 Активность: ${stats.activePercentage}%\n` +
    `📊 Средний прогресс: ${stats.avgProgress}%\n` +
    `⭐ Топ курс: ${stats.topCourse}\n\n` +
    `_${new Date().toLocaleDateString('ru-RU')}_`,

  alert: (message: string) =>
    `⚠️ *Уведомление*\n\n${message}\n\n_${new Date().toLocaleString('ru-RU')}_`,
};

