import express from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as tripwireManagerController from '../controllers/tripwireManagerController';

const router = express.Router();

/**
 * Sales Manager Dashboard Routes
 * Для управления Tripwire пользователями (роли: admin, sales)
 */

// POST /api/admin/tripwire/users - Создать пользователя
router.post('/users', authenticateJWT, tripwireManagerController.createTripwireUser);

// GET /api/admin/tripwire/users - Получить список пользователей
router.get('/users', authenticateJWT, tripwireManagerController.getTripwireUsers);

// GET /api/admin/tripwire/stats - Получить статистику
router.get('/stats', authenticateJWT, tripwireManagerController.getTripwireStats);

// PATCH /api/admin/tripwire/users/:id - Обновить статус пользователя
router.patch('/users/:id', authenticateJWT, tripwireManagerController.updateTripwireUserStatus);

// GET /api/admin/tripwire/activity - Получить историю действий
router.get('/activity', authenticateJWT, tripwireManagerController.getSalesActivityLog);

// GET /api/admin/tripwire/leaderboard - Получить рейтинг менеджеров
router.get('/leaderboard', authenticateJWT, tripwireManagerController.getSalesLeaderboard);

// GET /api/admin/tripwire/sales-chart - Получить данные для графика продаж
router.get('/sales-chart', authenticateJWT, tripwireManagerController.getSalesChartData);

// GET /api/admin/tripwire/my-stats - Получить МОЮ статистику (для конкретного user_id)
router.get('/my-stats', authenticateJWT, tripwireManagerController.getMyStats);

export default router;

