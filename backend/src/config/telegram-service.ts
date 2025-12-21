/**
 * Telegram Service - COMPLETELY INDEPENDENT from Redis
 * ⭐ Uses only Supabase for data storage
 */
import TelegramBot from 'node-telegram-bot-api';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';

const logger = pino();

interface TelegramServiceState {
    bot: TelegramBot | null;
    isRunning: boolean;
    supabase: any;
    startTime: Date | null;
}

const telegramService: TelegramServiceState = {
    bot: null,
    isRunning: false,
    supabase: null,
    startTime: null
};

/**
 * ⭐ Initialize Telegram COMPLETELY INDEPENDENT from Redis
 * - Uses Supabase directly (no Redis)
 * - Non-blocking initialization
 * - Can run even if Redis fails
 */
export async function initTelegramService(): Promise<void> {
    return new Promise((resolve) => {
        // Defer to next tick (but don't block server)
        setImmediate(async () => {
            try {
                const TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN;
                if (!TOKEN) {
                    logger.warn('⚠️ Telegram: No token provided, skipping initialization');
                    resolve();
                    return;
                }

                // ⭐ Initialize Supabase for Telegram
                telegramService.supabase = createClient(
                    process.env.LANDING_SUPABASE_URL || '',
                    process.env.LANDING_SUPABASE_SERVICE_KEY || '',
                    {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false
                        }
                    }
                );

                // ⭐ Initialize bot in polling mode (completely independent)
                telegramService.bot = new TelegramBot(TOKEN, {
                    polling: {
                        interval: 300,
                        autoStart: true,
                        params: {
                            allowed_updates: ['message', 'my_chat_member', 'chat_member']
                        }
                    }
                });

                setupTelegramHandlers();
                telegramService.isRunning = true;
                telegramService.startTime = new Date();

                logger.info('✅ Telegram: Service initialized (independent from Redis)');
                resolve();

            } catch (err: any) {
                logger.error('❌ Telegram initialization failed:', err.message);
                telegramService.isRunning = false;
                resolve(); // Don't block even if Telegram fails
            }
        });
    });
}

/**
 * ⭐ Setup Telegram message handlers
 * - NO external dependencies on Redis
 * - Pure Supabase queries
 */
function setupTelegramHandlers(): void {
    if (!telegramService.bot) return;

    const bot = telegramService.bot;

    // ⭐ Message handler for activation code
    bot.on('message', async (msg) => {
        try {
            const chatId = msg.chat.id;
            const chatType = msg.chat.type;
            const messageText = msg.text?.trim();

            // Ignore private messages
            if (chatType === 'private') {
                await bot.sendMessage(
                    chatId,
                    '👋 Привет! Я бот для уведомлений о новых лидах.\\n\\n' +
                    '📋 Чтобы активировать группу:\\n' +
                    '1️⃣ Добавь меня в группу как администратора\\n' +
                    '2️⃣ Отправь код активации: 2134\\n' +
                    '3️⃣ Все новые лиды будут приходить в твою группу! 🚀'
                );
                return;
            }

            // Check for activation code
            if (messageText === '2134') {
                logger.info(`🔐 Activation code received from chat ${chatId} (${msg.chat.title})`);

                const chatTitle = msg.chat.title || 'Без названия';
                const username = msg.from?.username || msg.from?.first_name || 'unknown';

                // Check if bot is admin
                try {
                    const botInfo = await bot.getMe();
                    const botChatMember = await bot.getChatMember(chatId, botInfo.id);

                    if (botChatMember.status !== 'administrator') {
                        await bot.sendMessage(
                            chatId,
                            '❌ Я должен быть администратором группы!\\n\\n' +
                            'Пожалуйста, назначьте меня администратором и попробуйте снова.'
                        );
                        return;
                    }
                } catch (error) {
                    logger.error('❌ Error checking bot admin status:', error);
                }

                // Save to Supabase (NO Redis)
                const { error } = await telegramService.supabase
                    .from('telegram_groups')
                    .upsert({
                        chat_id: String(chatId),
                        chat_title: chatTitle,
                        group_type: 'leads',
                        is_active: true,
                        activated_by: username,
                        activated_at: new Date().toISOString()
                    }, {
                        onConflict: 'chat_id'
                    });

                if (error) {
                    logger.error('❌ Error saving group:', error);
                    await bot.sendMessage(chatId, '❌ Ошибка активации группы. Попробуйте позже.');
                    return;
                }

                await bot.sendMessage(
                    chatId,
                    '✅ <b>БОТ АКТИВИРОВАН!</b>\\n\\n' +
                    `📍 <b>Chat ID:</b> <code>${chatId}</code>\\n` +
                    `🏷️ <b>Группа:</b> ${chatTitle}\\n\\n` +
                    `Теперь все новые заявки с сайта будут приходить сюда! 🚀`,
                    { parse_mode: 'HTML' }
                );

                logger.info(`✅ Telegram: Group activated - ${chatTitle} (${chatId})`);
            }
        } catch (err: any) {
            logger.error('Telegram message handler error:', err.message);
        }
    });

    // Handle bot join/leave
    bot.on('my_chat_member', async (update) => {
        try {
            const chat = update.chat;
            const newStatus = update.new_chat_member.status;
            const oldStatus = update.old_chat_member.status;

            logger.info(`🔄 Chat member update: ${oldStatus} → ${newStatus} in ${chat.title} (${chat.id})`);

            // Bot added as admin
            if (newStatus === 'administrator' && oldStatus !== 'administrator') {
                logger.info(`✅ Bot added as admin to group: ${chat.title} (${chat.id})`);
                
                await bot.sendMessage(
                    chat.id,
                    '👋 <b>Привет!</b>\\n\\n' +
                    'Я бот для уведомлений о новых лидах! 🤖\\n\\n' +
                    '📋 <b>Чтобы активировать группу, отправь:</b>\\n' +
                    '<code>2134</code>\\n\\n' +
                    'После этого все заявки с лендингов <b>ProfTest</b> и <b>ExpressCourse</b> будут приходить сюда! 🚀',
                    { parse_mode: 'HTML' }
                );
            }
            
            // Bot removed
            if (newStatus === 'left' || newStatus === 'kicked') {
                logger.info(`🚫 Bot removed from group: ${chat.title} (${chat.id})`);
                
                // Deactivate in DB
                await telegramService.supabase
                    .from('telegram_groups')
                    .update({ is_active: false })
                    .eq('chat_id', chat.id.toString());
            }
        } catch (err: any) {
            logger.error('Telegram chat member handler error:', err.message);
        }
    });

    logger.info('✅ Telegram handlers installed');
}

/**
 * Get Telegram bot instance
 */
export function getTelegramBot(): TelegramBot | null {
    return telegramService.bot;
}

/**
 * Check if Telegram is running
 */
export function isTelegramRunning(): boolean {
    return telegramService.isRunning && !!telegramService.bot;
}

/**
 * Get Telegram status
 */
export function getTelegramStatus() {
    const uptime = telegramService.startTime 
        ? Math.floor((Date.now() - telegramService.startTime.getTime()) / 1000)
        : 0;

    return {
        running: telegramService.isRunning,
        available: !!telegramService.bot,
        start_time: telegramService.startTime?.toISOString() || null,
        uptime_seconds: uptime
    };
}

/**
 * Send message to group (independent function)
 */
export async function sendTelegramMessage(chatId: string, message: string, options?: any): Promise<boolean> {
    if (!telegramService.bot) {
        logger.warn('Telegram: Bot not initialized');
        return false;
    }

    try {
        await telegramService.bot.sendMessage(chatId, message, options);
        return true;
    } catch (err: any) {
        logger.error('Failed to send Telegram message:', err.message);
        return false;
    }
}

/**
 * Get Supabase client
 */
export function getTelegramSupabase() {
    return telegramService.supabase;
}

/**
 * Graceful shutdown
 */
export async function closeTelegramService(): Promise<void> {
    if (telegramService.bot) {
        logger.info('Stopping Telegram bot...');
        await telegramService.bot.stopPolling();
        telegramService.bot = null;
        telegramService.isRunning = false;
        telegramService.startTime = null;
    }
}














