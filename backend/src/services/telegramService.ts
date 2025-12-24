// @ts-nocheck
/**
 * Telegram Service - отправка сообщений через Telegram Bot API
 */

import { getTelegramConfig } from '../config/telegram';
import { createClient } from '@supabase/supabase-js';

const config = getTelegramConfig();

// Подключение к Landing Supabase для получения активных групп
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

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
 * 🔥 ОБНОВЛЕНО: Теперь использует активные группы из БД вместо статичного chat_id
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

    if (!botToken) {
      console.warn('⚠️ No Telegram bot token configured for lead notifications');
      return false;
    }

    // 🔥 НОВОЕ: Получаем активные группы из БД
    const { data: activeGroups, error: dbError } = await landingSupabase
      .from('telegram_groups')
      .select('chat_id, chat_title')
      .eq('group_type', 'leads')
      .eq('is_active', true);

    if (dbError) {
      console.error('❌ Error fetching active groups from DB:', dbError);
      // Fallback на старый метод
      const fallbackChatId = config.leadsChatId || config.adminChatId;
      if (!fallbackChatId) {
        console.warn('⚠️ No active groups found and no fallback chat ID configured');
        return false;
      }
      console.log(`⚠️ Using fallback chat ID: ${fallbackChatId}`);
      activeGroups = [{ chat_id: fallbackChatId, chat_title: 'Fallback Group' }];
    }

    if (!activeGroups || activeGroups.length === 0) {
      console.warn('⚠️ No active Telegram groups found for lead notifications');
      console.warn('💡 Add bot to a group and send activation code "2134" to activate it!');
      return false;
    }

    console.log(`📱 Found ${activeGroups.length} active group(s) for lead notifications`);

    // Определяем тип заявки по source
    const isProftest = leadData.source?.toLowerCase().includes('proftest');
    const leadType = isProftest ? '📝 ПРОФТЕСТ' : '🎓 ЭКСПРЕСС КУРС';

    // Форматируем способ оплаты
    // ✅ ЛОГИКА: Показываем ТОЛЬКО если способ оплаты выбран (передан в leadData)
    // ❌ НЕ показываем если paymentMethod undefined/null (форма без выбора оплаты)
    let paymentMethodLine = '';
    if (leadData.paymentMethod) {
      // ✅ Способ оплаты ВЫБРАН - показываем
      const paymentMethodText = 
        leadData.paymentMethod === 'kaspi'
          ? '💳 Kaspi банк'
          : leadData.paymentMethod === 'card'
          ? '💰 Банковская карта'
          : '💬 Чат с менеджером';
      paymentMethodLine = `💳 <b>Способ оплаты:</b> ${paymentMethodText}\n`;
    }
    // ❌ paymentMethod не передан → строка НЕ показывается (ProfTest, TF4, и т.д.)

    // Создаем красивое сообщение (HTML формат - более надежный чем Markdown!)
    const message =
      `🎯 <b>НОВАЯ ЗАЯВКА - ${leadType}</b>\n\n` +
      `👤 <b>Имя:</b> ${leadData.name}\n` +
      `📱 <b>Телефон:</b> ${leadData.phone}\n` +
      `${leadData.email ? `📧 <b>Email:</b> ${leadData.email}\n` : ''}` +
      paymentMethodLine + // ✅ Показываем ТОЛЬКО для ExpressCourse!
      `📍 <b>Источник:</b> ${leadData.source || 'expresscourse'}\n\n` +
      `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

    // 🔥 НОВОЕ: Отправляем во ВСЕ активные группы
    let successCount = 0;
    let failCount = 0;

    for (const group of activeGroups) {
      try {
        console.log(`📱 Sending lead notification to group "${group.chat_title}" (${group.chat_id})`);

        const response = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: group.chat_id,
              text: message,
              parse_mode: 'HTML',
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`❌ Failed to send to group ${group.chat_id}:`, errorData);
          failCount++;
          
          // Если бот был заблокирован или удален из группы, деактивируем её
          if (errorData.error_code === 403 || errorData.error_code === 400) {
            console.log(`🚫 Deactivating group ${group.chat_id} due to error ${errorData.error_code}`);
            await landingSupabase
              .from('telegram_groups')
              .update({ is_active: false })
              .eq('chat_id', group.chat_id);
          }
        } else {
          console.log(`✅ Lead notification sent to group "${group.chat_title}" (${group.chat_id})`);
          successCount++;
        }
      } catch (error: any) {
        console.error(`❌ Error sending to group ${group.chat_id}:`, error.message);
        failCount++;
      }
    }

    console.log(`📊 Lead notification results: ${successCount} success, ${failCount} failed out of ${activeGroups.length} groups`);
    return successCount > 0; // Успех если хотя бы в одну группу отправили
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

