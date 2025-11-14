import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as onboardingController from '../controllers/onboardingController';

const router = Router();

// Все роуты требуют аутентификацию
router.use(authenticateJWT);

/**
 * GET /api/onboarding/status?userId=xxx
 * Проверить статус онбординга
 */
router.get('/status', onboardingController.checkStatus);

/**
 * POST /api/onboarding/complete
 * Сохранить ответы онбординга
 */
router.post('/complete', onboardingController.completeOnboarding);

/**
 * GET /api/onboarding/responses/:userId
 * Получить ответы пользователя
 */
router.get('/responses/:userId', onboardingController.getUserResponses);

/**
 * GET /api/onboarding/all
 * Получить все ответы (только админы)
 */
router.get('/all', onboardingController.getAllResponses);

export default router;

