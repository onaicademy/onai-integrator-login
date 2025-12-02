/**
 * Missions Controller
 * Контроллер для работы с миссиями студента
 */

import { Request, Response } from 'express';
import { getUserMissions, updateMissionProgress } from '../services/missionsService';

/**
 * GET /api/missions/:userId
 * Получить миссии студента
 */
export async function getMissions(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    console.log('🎯 [MissionsController] Запрос миссий для:', userId);

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const missions = await getUserMissions(userId);

    console.log('✅ [MissionsController] Миссии отправлены:', missions.length);

    res.status(200).json({
      success: true,
      data: missions,
    });
  } catch (error: any) {
    console.error('❌ [MissionsController] Ошибка:', error);
    res.status(500).json({
      error: 'Failed to fetch missions',
      message: error.message,
    });
  }
}

/**
 * POST /api/missions/update-progress
 * Обновить прогресс миссии (вызывается при событиях)
 */
export async function updateProgress(req: Request, res: Response): Promise<void> {
  try {
    const { userId, missionType, incrementValue } = req.body;

    console.log('🎯 [MissionsController] Обновление миссии:', missionType);

    if (!userId || !missionType) {
      res.status(400).json({ error: 'userId and missionType are required' });
      return;
    }

    await updateMissionProgress(userId, missionType, incrementValue || 1);

    res.status(200).json({
      success: true,
      message: 'Mission progress updated',
    });
  } catch (error: any) {
    console.error('❌ [MissionsController] Ошибка:', error);
    res.status(500).json({
      error: 'Failed to update mission progress',
      message: error.message,
    });
  }
}

