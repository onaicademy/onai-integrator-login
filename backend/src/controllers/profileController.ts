/**
 * Profile Controller
 * Контроллер для работы с профилем студента
 */

import { Request, Response } from 'express';
import { getUserProfile, updateLastActivity } from '../services/profileService';

/**
 * GET /api/users/:userId/profile
 * Получить полный профиль пользователя
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    console.log('📊 [ProfileController] Запрос профиля для:', userId);

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Получаем профиль
    const { profile, stats, achievements } = await getUserProfile(userId);

    // Обновляем последнюю активность (async, не ждём)
    updateLastActivity(userId).catch(err => {
      console.warn('⚠️ Не удалось обновить last_activity_at:', err);
    });

    console.log('✅ [ProfileController] Профиль отправлен:', profile.full_name);

    res.status(200).json({
      success: true,
      data: {
        profile,
        stats,
        achievements,
      },
    });
  } catch (error: any) {
    console.error('❌ [ProfileController] Ошибка:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message,
    });
  }
}

