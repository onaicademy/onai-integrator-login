import { Request, Response } from 'express';
import * as onboardingService from '../services/onboardingService';

/**
 * GET /api/onboarding/status
 * Проверить статус онбординга пользователя
 */
export async function checkStatus(req: Request, res: Response) {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const isCompleted = await onboardingService.checkOnboardingStatus(userId);

    res.json({ completed: isCompleted });
  } catch (error: any) {
    console.error('❌ Error in checkStatus:', error.message);
    res.status(500).json({ error: 'Failed to check status', message: error.message });
  }
}

/**
 * POST /api/onboarding/complete
 * Сохранить ответы онбординга
 */
export async function completeOnboarding(req: Request, res: Response) {
  try {
    const { userId, responses } = req.body;

    if (!userId || !responses) {
      return res.status(400).json({ error: 'Missing userId or responses' });
    }

    await onboardingService.saveOnboardingResponses(userId, responses);

    res.json({ success: true, message: 'Onboarding completed' });
  } catch (error: any) {
    console.error('❌ Error in completeOnboarding:', error.message);
    res.status(500).json({ error: 'Failed to complete onboarding', message: error.message });
  }
}

/**
 * GET /api/onboarding/responses/:userId
 * Получить ответы пользователя
 */
export async function getUserResponses(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const responses = await onboardingService.getOnboardingResponses(userId);

    res.json(responses);
  } catch (error: any) {
    console.error('❌ Error in getUserResponses:', error.message);
    res.status(500).json({ error: 'Failed to get responses', message: error.message });
  }
}

/**
 * GET /api/onboarding/all
 * Получить все ответы (только админы)
 */
export async function getAllResponses(req: Request, res: Response) {
  try {
    const responses = await onboardingService.getAllOnboardingResponses();

    res.json(responses);
  } catch (error: any) {
    console.error('❌ Error in getAllResponses:', error.message);
    res.status(500).json({ error: 'Failed to get all responses', message: error.message });
  }
}

