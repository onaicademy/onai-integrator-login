/**
 * Telegram Connection Management API
 * Подключение/отключение AI-наставника через Telegram
 */

import { Router, Request, Response } from 'express';
import { adminSupabase } from '../config/supabase';
import * as crypto from 'crypto';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';
const BOT_USERNAME = isProduction ? '@onaimentor_bot' : '@onainastavnik_bot';

/**
 * GET /api/telegram-connection/status
 * Получить статус подключения Telegram для пользователя
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId required' 
      });
    }

    const { data: user, error } = await adminSupabase
      .from('users')
      .select('telegram_connected, telegram_user_id, telegram_chat_id, telegram_connected_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      connected: user.telegram_connected || false,
      telegram_user_id: user.telegram_user_id,
      telegram_chat_id: user.telegram_chat_id,
      connected_at: user.telegram_connected_at,
      bot_username: BOT_USERNAME,
    });
  } catch (error: any) {
    console.error('❌ Error getting Telegram status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * POST /api/telegram-connection/generate-link
 * Создать deep link для подключения Telegram
 */
router.post('/generate-link', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId required' 
      });
    }

    // Генерируем уникальный токен
    const token = crypto.randomUUID();

    // Сохраняем токен (истекает через 10 минут)
    const { error } = await adminSupabase
      .from('users')
      .update({ 
        telegram_verification_token: token 
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error saving verification token:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate token' 
      });
    }

    const deepLink = `https://t.me/${BOT_USERNAME.replace('@', '')}?start=${token}`;

    console.log(`✅ Generated Telegram link for user ${userId}`);

    res.json({
      success: true,
      deepLink,
      botUsername: BOT_USERNAME,
      expiresIn: '10 minutes',
    });
  } catch (error: any) {
    console.error('❌ Error generating Telegram link:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * POST /api/telegram-connection/disconnect
 * Отключить Telegram (БЕЗ потери прогресса и базы знаний!)
 */
router.post('/disconnect', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId required' 
      });
    }

    // Отключаем Telegram (НО НЕ удаляем данные!)
    const { error } = await adminSupabase
      .from('users')
      .update({
        telegram_connected: false,
        telegram_user_id: null,
        telegram_chat_id: null,
        // telegram_connected_at оставляем для истории
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error disconnecting Telegram:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to disconnect' 
      });
    }

    console.log(`🔌 Telegram disconnected for user ${userId}`);

    res.json({
      success: true,
      message: 'Telegram успешно отключен',
      note: 'Твой прогресс и база знаний сохранены. Ты можешь подключить Telegram заново в любой момент.',
    });
  } catch (error: any) {
    console.error('❌ Error disconnecting Telegram:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;


