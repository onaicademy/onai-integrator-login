"use strict";
/**
 * Telegram Service - отправка сообщений через Telegram Bot API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_TEMPLATES = exports.MENTOR_TEMPLATES = void 0;
exports.sendMentorMessage = sendMentorMessage;
exports.sendAdminMessage = sendAdminMessage;
exports.sendAdminNotification = sendAdminNotification;
exports.sendLeadNotification = sendLeadNotification;
const telegram_1 = require("../config/telegram");
const config = (0, telegram_1.getTelegramConfig)();
/**
 * Отправить сообщение через Mentor бота
 */
async function sendMentorMessage(chatId, message, parseMode = 'Markdown') {
    try {
        const response = await fetch(`https://api.telegram.org/bot${config.mentorBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: parseMode,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Telegram API error:', errorData);
            throw new Error(`Telegram API error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`✅ Mentor message sent to chat ${chatId}`);
        return true;
    }
    catch (error) {
        console.error('❌ Failed to send mentor message:', error.message);
        throw error;
    }
}
/**
 * Отправить сообщение через Admin бота
 */
async function sendAdminMessage(chatId, message, parseMode = 'Markdown') {
    try {
        const response = await fetch(`https://api.telegram.org/bot${config.adminBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: parseMode,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Telegram API error:', errorData);
            throw new Error(`Telegram API error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`✅ Admin message sent to chat ${chatId}`);
        return true;
    }
    catch (error) {
        console.error('❌ Failed to send admin message:', error.message);
        throw error;
    }
}
/**
 * Отправить сообщение администратору (использует TELEGRAM_ADMIN_CHAT_ID из .env)
 */
async function sendAdminNotification(message) {
    if (!config.adminChatId) {
        console.warn('⚠️ TELEGRAM_ADMIN_CHAT_ID not configured, skipping notification');
        return false;
    }
    return sendAdminMessage(config.adminChatId, message);
}
/**
 * Отправить уведомление о новом лиде через Leads бота
 */
async function sendLeadNotification(leadData) {
    try {
        if (!config.leadsBotToken) {
            console.warn('⚠️ TELEGRAM_LEADS_BOT_TOKEN not configured, skipping lead notification');
            return false;
        }
        if (!config.leadsChatId) {
            console.warn('⚠️ TELEGRAM_LEADS_CHAT_ID not configured, skipping lead notification');
            return false;
        }
        // Форматируем способ оплаты
        const paymentMethodText = leadData.paymentMethod
            ? leadData.paymentMethod === 'kaspi'
                ? '💳 Kaspi банк'
                : leadData.paymentMethod === 'card'
                    ? '💰 Банковская карта'
                    : '💬 Чат с менеджером'
            : '❓ Не выбран';
        // Создаем красивое сообщение
        const message = `🎯 *НОВАЯ ЗАЯВКА С ЭКСПРЕСС КУРСА*\n\n` +
            `👤 *Имя:* ${leadData.name}\n` +
            `📱 *Телефон:* ${leadData.phone}\n` +
            `${leadData.email ? `📧 *Email:* ${leadData.email}\n` : ''}` +
            `💳 *Способ оплаты:* ${paymentMethodText}\n` +
            `📍 *Источник:* ${leadData.source || 'expresscourse'}\n\n` +
            `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;
        const response = await fetch(`https://api.telegram.org/bot${config.leadsBotToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.leadsChatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Telegram Leads Bot API error:', errorData);
            throw new Error(`Telegram API error: ${response.status}`);
        }
        const data = await response.json();
        console.log(`✅ Lead notification sent to chat ${config.leadsChatId}`);
        return true;
    }
    catch (error) {
        console.error('❌ Failed to send lead notification:', error.message);
        // Не выбрасываем ошибку, чтобы не блокировать основной процесс
        return false;
    }
}
/**
 * Шаблоны сообщений для студентов (Mentor Bot)
 */
exports.MENTOR_TEMPLATES = {
    motivation: (name, progress) => `Привет, ${name}! 💪\n\nТы уже на ${progress}% курса - отличный результат!\nПродолжай в том же духе! 🚀`,
    reminder: (name, daysInactive) => `${name}, давно не виделись! 😊\n\nПрошло уже ${daysInactive} дня с последнего урока.\nГотов продолжить обучение? 📚`,
    help: (name, lessonName) => `${name}, замечаю что урок "${lessonName}" вызывает сложности 🤔\n\nНужна помощь? Напиши AI-куратору или задай вопрос в сообществе!`,
    achievement: (name, achievementName) => `Поздравляю, ${name}! 🎉\n\nТы разблокировал достижение: "${achievementName}"!\nПродолжай в том же духе! ⭐`,
    streak: (name, days) => `Огонь, ${name}! 🔥\n\n${days} дней подряд на платформе!\nТы настоящий чемпион! 🏆`,
    warning: (name) => `${name}, твой стрик под угрозой! ⚠️\n\nЗайди сегодня на платформу чтобы не потерять прогресс! 💪`,
};
/**
 * Шаблоны отчётов для администратора (Admin Bot)
 */
exports.ADMIN_TEMPLATES = {
    dailyReport: (stats) => `📊 *Ежедневный отчёт*\n\n` +
        `👥 Активных студентов: ${stats.activeStudents}\n` +
        `✅ Завершено уроков: ${stats.completedLessons}\n` +
        `🆕 Новых регистраций: ${stats.newRegistrations}\n\n` +
        `_${new Date().toLocaleDateString('ru-RU')}_`,
    weeklyReport: (stats) => `📈 *Недельный отчёт*\n\n` +
        `👥 Всего студентов: ${stats.totalStudents}\n` +
        `🔥 Активность: ${stats.activePercentage}%\n` +
        `📊 Средний прогресс: ${stats.avgProgress}%\n` +
        `⭐ Топ курс: ${stats.topCourse}\n\n` +
        `_${new Date().toLocaleDateString('ru-RU')}_`,
    alert: (message) => `⚠️ *Уведомление*\n\n${message}\n\n_${new Date().toLocaleString('ru-RU')}_`,
};
