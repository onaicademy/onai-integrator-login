import express from 'express';
import { authenticateJWT, requireSalesOrAdmin } from '../middleware/auth';
import * as tripwireManagerController from '../controllers/tripwireManagerController';
import createWithProgressRouter from './admin-tripwire-create-with-progress';

const router = express.Router();

/**
 * Sales Manager Dashboard Routes
 * Для управления Tripwire пользователями (роли: admin, sales)
 * 
 * ✅ ВАЖНО: Все роуты защищены requireSalesOrAdmin
 */

// POST /api/admin/tripwire/users - Создать пользователя
router.post('/users', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.createTripwireUser);

// 🚀 POST /api/admin/tripwire/users/create-with-progress - Создать пользователя с прогресс-баром (SSE)
router.use(createWithProgressRouter);

// GET /api/admin/tripwire/users - Получить список пользователей
router.get('/users', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.getTripwireUsers);

// GET /api/admin/tripwire/stats - Получить статистику
router.get('/stats', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.getTripwireStats);

// PATCH /api/admin/tripwire/users/:id - Обновить статус пользователя
router.patch('/users/:id', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.updateTripwireUserStatus);

// DELETE /api/admin/tripwire/users/:userId - Удалить студента (ONLY FOR smmmcwin@gmail.com)
router.delete('/users/:userId', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.deleteTripwireUser);

// GET /api/admin/tripwire/activity - Получить историю действий
router.get('/activity', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.getSalesActivityLog);

// GET /api/admin/tripwire/leaderboard - Получить рейтинг менеджеров
router.get('/leaderboard', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.getSalesLeaderboard);

// GET /api/admin/tripwire/sales-chart - Получить данные для графика продаж
router.get('/sales-chart', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.getSalesChartData);

// GET /api/admin/tripwire/my-stats - Получить МОЮ статистику (для конкретного user_id)
router.get('/my-stats', authenticateJWT, requireSalesOrAdmin, tripwireManagerController.getMyStats);

export default router;

