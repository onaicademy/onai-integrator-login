import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as tokenController from '../controllers/tokenController';

const router = Router();

// Все роуты требуют аутентификацию
router.use(authenticateJWT);

// POST /api/tokens/log - Логировать использование токенов
router.post('/log', tokenController.logTokenUsage);

// GET /api/tokens/stats - Получить статистику пользователя
router.get('/stats', tokenController.getUserStats);

// GET /api/tokens/stats/total - Общая статистика (только админы)
router.get('/stats/total', tokenController.getTotalStats);

export default router;

