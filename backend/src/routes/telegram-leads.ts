/**
 * 🤖 Telegram Leads Bot Routes
 * ⭐ Uses telegram-service.ts (independent from Redis)
 */
import { Router, Request, Response } from 'express';
import pino from 'pino';
import {
    getTelegramBot,
    isTelegramRunning,
    getTelegramStatus,
    sendTelegramMessage,
    getTelegramSupabase
} from '../config/telegram-service';

const logger = pino();
const router = Router();

// ================================================
// ⭐ HEALTH CHECK
// ================================================
router.get('/health', async (req: Request, res: Response) => {
    try {
        const telegramStatus = getTelegramStatus();
        const supabase = getTelegramSupabase();

        // Quick Supabase check with timeout
        let supabaseOk = false;
        let activeGroupsCount = 0;

        if (supabase) {
            try {
                const result: any = await Promise.race([
                    supabase
                        .from('telegram_groups')
                        .select('id', { count: 'exact', head: true })
                        .eq('is_active', true),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), 2000)
                    )
                ]);
                supabaseOk = !result.error;
                activeGroupsCount = result.count || 0;
            } catch (err) {
                supabaseOk = false;
            }
        }

        return res.json({
            success: telegramStatus.running,
            status: {
                telegram: telegramStatus,
                database: {
                    connected: supabaseOk,
                    active_groups_count: activeGroupsCount
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (err: any) {
        logger.error('Health check error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ================================================
// ⭐ ACTIVE GROUPS
// ================================================
router.get('/active-groups', async (req: Request, res: Response) => {
    try {
        const supabase = getTelegramSupabase();
        if (!supabase) {
            return res.status(503).json({
                success: false,
                error: 'Telegram service not initialized'
            });
        }

        const { data: groups, error } = await Promise.race([
            supabase
                .from('telegram_groups')
                .select('*')
                .eq('group_type', 'leads')
                .eq('is_active', true)
                .order('activated_at', { ascending: false }),
            new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('Query timeout')), 3000)
            )
        ]);

        if (error) throw error;

        return res.json({
            success: true,
            groups: groups || [],
            count: groups?.length || 0,
            telegram_running: isTelegramRunning()
        });

    } catch (err: any) {
        logger.error('Active groups error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message,
            groups: []
        });
    }
});

// ================================================
// ⭐ TEST SEND (Send test lead to all active groups)
// ================================================
router.post('/test', async (req: Request, res: Response) => {
    try {
        const { name = 'Тест Тестович', phone = '+7 777 123 45 67' } = req.body;

        const bot = getTelegramBot();
        const supabase = getTelegramSupabase();

        if (!bot) {
            return res.status(503).json({
                success: false,
                error: 'Telegram bot not initialized'
            });
        }

        if (!supabase) {
            return res.status(503).json({
                success: false,
                error: 'Telegram service not initialized'
            });
        }

        // Get active groups
        const { data: groups, error } = await Promise.race([
            supabase
                .from('telegram_groups')
                .select('chat_id, chat_title')
                .eq('is_active', true),
            new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 3000)
            )
        ]);

        if (error) throw error;

        if (!groups || groups.length === 0) {
            return res.json({
                success: false,
                message: 'No active groups found. Please activate a group first by sending "2134"',
                sent: 0,
                total: 0
            });
        }

        const message = 
            `🧪 <b>ТЕСТОВОЕ УВЕДОМЛЕНИЕ</b>\\n\\n` +
            `👤 <b>Имя:</b> ${name}\\n` +
            `📱 <b>Телефон:</b> ${phone}\\n` +
            `📧 <b>Email:</b> test@example.com\\n` +
            `💳 <b>Способ оплаты:</b> 💳 Kaspi банк\\n` +
            `📍 <b>Источник:</b> expresscourse\\n\\n` +
            `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

        let sent = 0;
        let failed = 0;
        const results = [];

        for (const group of groups) {
            const success = await sendTelegramMessage(
                group.chat_id, 
                message,
                { parse_mode: 'HTML' }
            );
            
            if (success) {
                sent++;
                results.push({ chat_id: group.chat_id, success: true });
            } else {
                failed++;
                results.push({ chat_id: group.chat_id, success: false });
            }
        }

        return res.json({
            success: true,
            sent,
            failed,
            total: groups.length,
            results
        });

    } catch (err: any) {
        logger.error('Test send error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message,
            sent: 0
        });
    }
});

// ================================================
// ⭐ SEND LEAD NOTIFICATION (called from landing submit)
// ================================================
router.post('/send-lead', async (req: Request, res: Response) => {
    try {
        const { name, phone, email, source, paymentMethod } = req.body;

        const bot = getTelegramBot();
        const supabase = getTelegramSupabase();

        if (!bot || !supabase) {
            logger.warn('Telegram service not available for lead notification');
            return res.json({
                success: false,
                message: 'Telegram service not available',
                sent: 0
            });
        }

        // Get active groups
        const { data: groups, error } = await supabase
            .from('telegram_groups')
            .select('chat_id')
            .eq('is_active', true);

        if (error || !groups || groups.length === 0) {
            logger.warn('No active Telegram groups found');
            return res.json({
                success: false,
                message: 'No active groups',
                sent: 0
            });
        }

        // Format message
        const sourceName = source === 'proftest' ? '🎓 ПРОФТЕСТ' : '🎓 ЭКСПРЕСС КУРС';
        const paymentMethodText = paymentMethod === 'kaspi' ? '💳 Kaspi банк' : '💰 Другой способ';

        const message = 
            `🎯 <b>НОВАЯ ЗАЯВКА - ${sourceName}</b>\\n\\n` +
            `👤 <b>Имя:</b> ${name}\\n` +
            `📱 <b>Телефон:</b> ${phone}\\n` +
            `📧 <b>Email:</b> ${email || 'Не указан'}\\n` +
            `💳 <b>Способ оплаты:</b> ${paymentMethodText}\\n` +
            `📍 <b>Источник:</b> ${source}\\n\\n` +
            `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}`;

        let sent = 0;
        for (const group of groups) {
            const success = await sendTelegramMessage(
                group.chat_id,
                message,
                { parse_mode: 'HTML' }
            );
            if (success) sent++;
        }

        logger.info(`✅ Lead notification sent to ${sent}/${groups.length} groups`);

        return res.json({
            success: true,
            sent,
            total: groups.length
        });

    } catch (err: any) {
        logger.error('Send lead error:', err.message);
        return res.status(500).json({
            success: false,
            error: err.message,
            sent: 0
        });
    }
});

export default router;
