/**
 * Tripwire Profile Controller
 * HTTP Controller для профиля (ИЗОЛИРОВАННЫЙ для Tripwire DB)
 */

import { Request, Response } from 'express';
import { getUserProfile, updateLastActivity } from '../../services/tripwire/tripwireProfileService';

/**
 * GET /api/tripwire/users/:userId/profile
 * Получить профиль пользователя
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    console.log('📊 [Tripwire ProfileController] Получение профиля для:', userId);
    
    const profileData = await getUserProfile(userId);
    
    // Асинхронно обновляем время последней активности
    updateLastActivity(userId).catch(err => {
      console.warn('⚠️ [Tripwire ProfileController] Failed to update last activity:', err);
    });
    
    res.json({
      success: true,
      data: profileData
    });
  } catch (error: any) {
    console.error('❌ [Tripwire ProfileController] Ошибка getProfile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch profile'
    });
  }
}

