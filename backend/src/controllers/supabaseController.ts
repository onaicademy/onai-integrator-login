import { Request, Response } from 'express';
import * as supabaseService from '../services/supabaseService';

/**
 * =====================================================
 * AI-КУРАТОР
 * =====================================================
 */

/**
 * POST /api/supabase/curator/messages
 * Сохранить пару сообщений AI-куратора (user + assistant)
 */
export async function saveCuratorMessagePair(req: Request, res: Response) {
  try {
    const { userId, userMessage, aiMessage, options } = req.body;

    if (!userId || !userMessage || !aiMessage) {
      return res.status(400).json({
        error: 'Missing required fields',
        hint: 'userId, userMessage, aiMessage are required',
      });
    }

    const result = await supabaseService.saveCuratorMessagePair(
      userId,
      userMessage,
      aiMessage,
      options
    );

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in saveCuratorMessagePair:', error.message);
    res.status(500).json({
      error: 'Failed to save curator messages',
      message: error.message,
    });
  }
}

/**
 * POST /api/supabase/curator/thread
 * Получить или создать thread AI-куратора
 */
export async function getOrCreateCuratorThread(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
      });
    }

    const thread = await supabaseService.getOrCreateCuratorThread(userId);

    res.json(thread);
  } catch (error: any) {
    console.error('❌ Error in getOrCreateCuratorThread:', error.message);
    res.status(500).json({
      error: 'Failed to get or create curator thread',
      message: error.message,
    });
  }
}

/**
 * =====================================================
 * AI-АНАЛИТИК
 * =====================================================
 */

/**
 * POST /api/supabase/analyst/messages
 * Сохранить пару сообщений AI-аналитика (user + assistant)
 */
export async function saveAnalystMessagePair(req: Request, res: Response) {
  try {
    const { userId, userMessage, aiMessage, options } = req.body;

    if (!userId || !userMessage || !aiMessage) {
      return res.status(400).json({
        error: 'Missing required fields',
        hint: 'userId, userMessage, aiMessage are required',
      });
    }

    const result = await supabaseService.saveAnalystMessagePair(
      userId,
      userMessage,
      aiMessage,
      options
    );

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in saveAnalystMessagePair:', error.message);
    res.status(500).json({
      error: 'Failed to save analyst messages',
      message: error.message,
    });
  }
}

/**
 * POST /api/supabase/analyst/thread
 * Получить или создать thread AI-аналитика
 */
export async function getOrCreateAnalystThread(req: Request, res: Response) {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
      });
    }

    const thread = await supabaseService.getOrCreateAnalystThread(userId);

    res.json(thread);
  } catch (error: any) {
    console.error('❌ Error in getOrCreateAnalystThread:', error.message);
    res.status(500).json({
      error: 'Failed to get or create analyst thread',
      message: error.message,
    });
  }
}

/**
 * =====================================================
 * AI-НАСТАВНИК (TELEGRAM)
 * =====================================================
 */

/**
 * POST /api/supabase/mentor/messages
 * Сохранить пару сообщений AI-наставника (user + assistant)
 */
export async function saveMentorMessagePair(req: Request, res: Response) {
  try {
    const { userId, userMessage, aiMessage, options } = req.body;

    if (!userId || !userMessage || !aiMessage) {
      return res.status(400).json({
        error: 'Missing required fields',
        hint: 'userId, userMessage, aiMessage are required',
      });
    }

    const result = await supabaseService.saveMentorMessagePair(
      userId,
      userMessage,
      aiMessage,
      options
    );

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in saveMentorMessagePair:', error.message);
    res.status(500).json({
      error: 'Failed to save mentor messages',
      message: error.message,
    });
  }
}

/**
 * POST /api/supabase/mentor/thread
 * Получить или создать thread AI-наставника
 */
export async function getOrCreateMentorThread(req: Request, res: Response) {
  try {
    const { userId, telegramUserId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
      });
    }

    const thread = await supabaseService.getOrCreateMentorThread(userId, telegramUserId);

    res.json(thread);
  } catch (error: any) {
    console.error('❌ Error in getOrCreateMentorThread:', error.message);
    res.status(500).json({
      error: 'Failed to get or create mentor thread',
      message: error.message,
    });
  }
}


