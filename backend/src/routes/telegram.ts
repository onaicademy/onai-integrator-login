/**
 * Telegram Bot Routes
 * Handles webhook, deep linking, and user verification
 */

import { Router } from 'express';
import { adminSupabase } from '../config/supabase';
import TelegramBot from 'node-telegram-bot-api';
import * as crypto from 'crypto';

const router = Router();

// 🔄 АВТОМАТИЧЕСКОЕ ПЕРЕКЛЮЧЕНИЕ БОТОВ в зависимости от окружения
const isProduction = process.env.NODE_ENV === 'production';

// Localhost → @onainastavnik_bot (тестовый)
// Production → @onaimentor_bot (продакшн)
const TELEGRAM_BOT_TOKEN = isProduction 
  ? process.env.TELEGRAM_MENTOR_BOT_TOKEN || ''
  : process.env.TELEGRAM_MENTOR_BOT_TOKEN_TEST || '';

const BOT_USERNAME = isProduction ? '@onaimentor_bot' : '@onainastavnik_bot';

console.log(`🤖 Выбран ${isProduction ? 'ПРОДАКШН' : 'ТЕСТОВЫЙ'} бот: ${BOT_USERNAME}`);
console.log(`   Environment: ${process.env.NODE_ENV}`);
console.log(`   Token: ${TELEGRAM_BOT_TOKEN.substring(0, 10)}...`);

let bot: TelegramBot;

if (isProduction && process.env.BACKEND_URL) {
  // Production: webhook mode
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN);
  const webhookUrl = `${process.env.BACKEND_URL}/api/telegram/webhook/${TELEGRAM_BOT_TOKEN}`;
  bot.setWebHook(webhookUrl).then(() => {
    console.log(`🤖 Telegram webhook set to: ${webhookUrl}`);
  }).catch(e => {
    console.error('❌ Failed to set Telegram webhook:', e);
  });
} else {
  // Development: polling mode (для localhost)
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('🤖 Telegram bot started in POLLING mode (localhost)');
  console.log(`   Bot username: ${BOT_USERNAME}`);
}

/**
 * POST /api/telegram/generate-token
 * Generate verification token for deep link
 */
router.post('/generate-token', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    // Generate unique token
    const token = crypto.randomUUID();

    // Save token to database (expires in 10 minutes)
    const { error } = await adminSupabase
      .from('users')
      .update({ 
        telegram_verification_token: token 
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error saving verification token:', error);
      return res.status(500).json({ success: false, message: 'Failed to generate token' });
    }

    console.log(`✅ Generated verification token for user ${userId}: ${token}`);

    res.json({ 
      success: true, 
      token,
      deepLink: `https://t.me/${BOT_USERNAME.replace('@', '')}?start=${token}`
    });
  } catch (error) {
    console.error('❌ Error in generate-token:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/telegram/webhook/:token
 * Telegram webhook endpoint
 */
router.post('/webhook/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify webhook token matches bot token
    if (token !== TELEGRAM_BOT_TOKEN) {
      return res.status(403).json({ success: false, message: 'Invalid webhook token' });
    }

    // Process Telegram update
    await bot.processUpdate(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * Handle /start command with deep link verification
 */
bot.onText(/\/start (.+)/, async (msg, match) => {
  try {
    const verificationToken = match?.[1];
    const telegramUserId = msg.from?.id;
    const telegramChatId = msg.chat?.id;
    const telegramUsername = msg.from?.username;

    if (!verificationToken || !telegramUserId || !telegramChatId) {
      await bot.sendMessage(msg.chat.id, '❌ Ошибка: неверная ссылка активации.');
      return;
    }

    console.log(`📱 Telegram /start: user_id=${telegramUserId}, token=${verificationToken}`);

    // Find user by verification token
    const { data: user, error: findError } = await adminSupabase
      .from('users')
      .select('id, full_name, email')
      .eq('telegram_verification_token', verificationToken)
      .single();

    if (findError || !user) {
      console.error('❌ User not found by token:', findError);
      await bot.sendMessage(
        msg.chat.id,
        '❌ Ссылка активации недействительна или устарела.\n\n' +
        'Пожалуйста, создайте новую ссылку в личном кабинете.'
      );
      return;
    }

    // Update user with Telegram data
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        telegram_connected: true,
        telegram_connected_at: new Date().toISOString(),
        telegram_verification_token: null // Clear token after use
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Failed to update user:', updateError);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка при подключении. Попробуйте позже.');
      return;
    }

    console.log(`✅ Telegram connected for user ${user.id} (${user.email})`);

    // Send success message
    await bot.sendMessage(
      msg.chat.id,
      `✅ *Telegram успешно подключен!*\n\n` +
      `👤 Привет, ${user.full_name}!\n\n` +
      `Теперь я буду присылать тебе напоминания о задачах.\n\n` +
      `🔔 *Как это работает:*\n` +
      `• За 15-60 минут до дедлайна я пришлю уведомление\n` +
      `• Ты можешь настроить время напоминания для каждой задачи\n` +
      `• Чтобы отключить бота, используй команду /disconnect\n\n` +
      `📱 Управляй задачами на платформе: ${process.env.FRONTEND_URL || 'https://app.onaiacademy.kz'}`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('❌ Error in /start handler:', error);
    await bot.sendMessage(msg.chat.id, '❌ Произошла ошибка. Попробуйте позже.');
  }
});

/**
 * Handle /disconnect command
 */
bot.onText(/\/disconnect/, async (msg) => {
  try {
    const telegramUserId = msg.from?.id;

    if (!telegramUserId) return;

    // Find and disconnect user
    const { data: user, error: findError } = await adminSupabase
      .from('users')
      .select('id, full_name')
      .eq('telegram_user_id', telegramUserId)
      .single();

    if (findError || !user) {
      await bot.sendMessage(msg.chat.id, '❌ Аккаунт не найден.');
      return;
    }

    // Disconnect Telegram
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        telegram_connected: false,
        telegram_user_id: null,
        telegram_chat_id: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('❌ Failed to disconnect:', updateError);
      await bot.sendMessage(msg.chat.id, '❌ Ошибка при отключении.');
      return;
    }

    console.log(`🔌 Telegram disconnected for user ${user.id}`);

    await bot.sendMessage(
      msg.chat.id,
      `👋 *Telegram отключен*\n\n` +
      `${user.full_name}, ты больше не будешь получать уведомления.\n\n` +
      `Чтобы подключить снова, создай новую ссылку в личном кабинете.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('❌ Error in /disconnect handler:', error);
  }
});

/**
 * Handle /help command
 */
bot.onText(/\/help/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `🤖 *onAI Mentor Bot - Справка*\n\n` +
    `*Команды:*\n` +
    `/start <token> - Подключить Telegram\n` +
    `/disconnect - Отключить уведомления\n` +
    `/help - Показать эту справку\n\n` +
    `*О боте:*\n` +
    `Я помогаю тебе не забывать о важных задачах, отправляя напоминания за 15-60 минут до дедлайна.\n\n` +
    `📚 Платформа: ${process.env.FRONTEND_URL || 'https://app.onaiacademy.kz'}`,
    { parse_mode: 'Markdown' }
  );
});

/**
 * GET /api/telegram/status/:userId
 * Check Telegram connection status
 */
router.get('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await adminSupabase
      .from('users')
      .select('telegram_connected, telegram_connected_at, telegram_user_id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      connected: user.telegram_connected || false,
      connectedAt: user.telegram_connected_at,
      telegramUserId: user.telegram_user_id
    });
  } catch (error) {
    console.error('❌ Error checking status:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

/**
 * POST /api/telegram/send-reminder
 * Send reminder to user (used by scheduler)
 */
router.post('/send-reminder', async (req, res) => {
  try {
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res.status(400).json({ success: false, message: 'chatId and message required' });
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error sending reminder:', error);

    // Check if bot was blocked by user (403 Forbidden)
    if (error.response?.statusCode === 403) {
      return res.status(403).json({ 
        success: false, 
        message: 'Bot blocked by user',
        blocked: true 
      });
    }

    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

/**
 * POST /api/telegram/test-reminder
 * TEST endpoint to trigger immediate reminder check
 */
router.post('/test-reminder', async (req, res) => {
  try {
    const { triggerReminderCheck } = await import('../services/reminderScheduler');
    
    console.log('🧪 [API] Manual reminder trigger requested');
    await triggerReminderCheck();
    
    res.json({ 
      success: true, 
      message: 'Reminder check triggered! Check console and Telegram.' 
    });
  } catch (error: any) {
    console.error('❌ Error triggering reminder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
