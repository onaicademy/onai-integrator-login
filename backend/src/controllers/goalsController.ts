/**
 * Goals Controller
 * Контроллер для работы с целями студента
 */

import { Request, Response } from 'express';
import { getWeeklyGoals, updateGoalProgress } from '../services/goalsService';

/**
 * GET /api/goals/weekly/:userId
 * Получить недельные цели студента
 */
export async function getWeekly(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    console.log('🎯 [GoalsController] Запрос недельных целей для:', userId);

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const goals = await getWeeklyGoals(userId);

    console.log('✅ [GoalsController] Цели отправлены:', goals.length);

    res.status(200).json({
      success: true,
      data: goals,
    });
  } catch (error: any) {
    console.error('❌ [GoalsController] Ошибка:', error);
    res.status(500).json({
      error: 'Failed to fetch goals',
      message: error.message,
    });
  }
}

/**
 * POST /api/goals/update-progress
 * Обновить прогресс цели (вызывается при завершении урока)
 */
export async function updateProgress(req: Request, res: Response): Promise<void> {
  try {
    const { userId, goalType, incrementValue } = req.body;

    console.log('🎯 [GoalsController] Обновление прогресса цели:', goalType);

    if (!userId || !goalType) {
      res.status(400).json({ error: 'userId and goalType are required' });
      return;
    }

    await updateGoalProgress(userId, goalType, incrementValue || 1);

    res.status(200).json({
      success: true,
      message: 'Goal progress updated',
    });
  } catch (error: any) {
    console.error('❌ [GoalsController] Ошибка:', error);
    res.status(500).json({
      error: 'Failed to update goal progress',
      message: error.message,
    });
  }
}

