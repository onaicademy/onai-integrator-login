import express from 'express';
import { authenticateTripwireJWT, requireTripwireSalesOrAdmin } from '../middleware/tripwire-auth';
import * as tripwireManagerController from '../controllers/tripwireManagerController';
import createWithProgressRouter from './admin-tripwire-create-with-progress';

const router = express.Router();

/**
 * Sales Manager Dashboard Routes
 * Для управления Tripwire пользователями (роли: admin, sales)
 *
 * ✅ ВАЖНО: Все роуты защищены authenticateTripwireJWT + requireTripwireSalesOrAdmin
 * ✅ ИСПРАВЛЕНО: Используем Tripwire Supabase вместо Main Supabase
 */

// POST /api/admin/tripwire/users - Создать пользователя
router.post('/users', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.createTripwireUser);

// 🚀 POST /api/admin/tripwire/users/create-with-progress - Создать пользователя с прогресс-баром (SSE)
router.use(createWithProgressRouter);

// GET /api/admin/tripwire/users - Получить список пользователей
router.get('/users', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.getTripwireUsers);

// GET /api/admin/tripwire/stats - Получить статистику
router.get('/stats', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.getTripwireStats);

// PATCH /api/admin/tripwire/users/:id - Обновить статус пользователя
router.patch('/users/:id', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.updateTripwireUserStatus);

// DELETE /api/admin/tripwire/users/:userId - Удалить студента (ONLY FOR smmmcwin@gmail.com)
router.delete('/users/:userId', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.deleteTripwireUser);

// GET /api/admin/tripwire/activity - Получить историю действий
router.get('/activity', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.getSalesActivityLog);

// GET /api/admin/tripwire/leaderboard - Получить рейтинг менеджеров
router.get('/leaderboard', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.getSalesLeaderboard);

// GET /api/admin/tripwire/sales-chart - Получить данные для графика продаж
router.get('/sales-chart', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.getSalesChartData);

// GET /api/admin/tripwire/my-stats - Получить МОЮ статистику (для конкретного user_id)
router.get('/my-stats', authenticateTripwireJWT, requireTripwireSalesOrAdmin, tripwireManagerController.getMyStats);

export default router;

