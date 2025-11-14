import { Request, Response } from 'express';
import * as tokenService from '../services/tokenService';

/**
 * POST /api/tokens/log
 * Логировать использование токенов
 */
export async function logTokenUsage(req: Request, res: Response) {
  try {
    const { userId, assistantType, promptTokens, completionTokens, totalTokens, modelUsed, openaiThreadId, openaiMessageId, openaiRunId } = req.body;

    if (!userId || !assistantType || !promptTokens || !completionTokens || !totalTokens) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, assistantType, promptTokens, completionTokens, totalTokens' 
      });
    }

    const result = await tokenService.logTokenUsage({
      userId,
      assistantType,
      model: modelUsed || 'gpt-4o',
      promptTokens,
      completionTokens,
      totalTokens,
      openaiThreadId,
      openaiMessageId,
      openaiRunId,
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ Error in logTokenUsage:', error.message);
    res.status(500).json({ error: 'Failed to log token usage', message: error.message });
  }
}

/**
 * GET /api/tokens/stats
 * Получить статистику пользователя по токенам
 */
export async function getUserStats(req: Request, res: Response) {
  try {
    const { userId, assistantType } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' });
    }

    const stats = await tokenService.getUserTokenStats(
      userId as string,
      assistantType as string | undefined
    );

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ Error in getUserStats:', error.message);
    res.status(500).json({ error: 'Failed to get user stats', message: error.message });
  }
}

/**
 * GET /api/tokens/stats/total
 * Общая статистика (только для админов)
 */
export async function getTotalStats(req: Request, res: Response) {
  try {
    const stats = await tokenService.getTotalTokenStats();

    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('❌ Error in getTotalStats:', error.message);
    res.status(500).json({ error: 'Failed to get total stats', message: error.message });
  }
}
