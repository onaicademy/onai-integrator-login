import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as fileCleanupController from '../controllers/fileCleanupController';

const router = Router();

// ✅ Все роуты требуют JWT авторизацию
router.use(authenticateJWT);

/**
 * POST /api/admin/cleanup/run - Запустить очистку вручную
 * Требует: JWT токен, роль admin
 */
router.post('/run', fileCleanupController.runCleanup);

/**
 * GET /api/admin/cleanup/stats - Получить статистику по файлам
 * Требует: JWT токен, роль admin
 */
router.get('/stats', fileCleanupController.getStats);

/**
 * GET /api/admin/cleanup/history - Получить историю очисток
 * Требует: JWT токен, роль admin
 * Query params: ?limit=20
 */
router.get('/history', fileCleanupController.getHistory);

export default router;


