/**
 * TRIPWIRE ROUTES
 * 
 * ✅ ИЗОЛИРОВАННАЯ БАЗА ДАННЫХ: Все операции через tripwireAdminSupabase
 * ✅ Эндпоинты для Sales Manager Dashboard и Tripwire API
 */

import express from 'express';
import { authenticateJWT } from '../middleware/auth';
import {
  createTripwireUser,
  getTripwireUsers,
  updateTripwireUserStatus,
  getTripwireStats,
} from '../services/tripwire/tripwireService';

const router = express.Router();

/**
 * POST /api/tripwire/users
 * Создать нового Tripwire пользователя (Sales Manager)
 */
router.post('/users', authenticateJWT, async (req, res) => {
  try {
    const { email, full_name, password, granted_by, manager_name } = req.body;

    if (!email || !full_name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await createTripwireUser({
      email,
      full_name,
      password,
      granted_by,
      manager_name,
    });

    res.json(result);
  } catch (error: any) {
    console.error('❌ [TripwireRoutes] Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

/**
 * GET /api/tripwire/users
 * Получить список Tripwire пользователей (Sales Manager)
 */
router.get('/users', authenticateJWT, async (req, res) => {
  try {
    const users = await getTripwireUsers();
    res.json(users);
  } catch (error: any) {
    console.error('❌ [TripwireRoutes] Get users error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
});

/**
 * PUT /api/tripwire/users/:userId/status
 * Обновить статус Tripwire пользователя
 */
router.put('/users/:userId/status', authenticateJWT, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'completed', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await updateTripwireUserStatus(userId, status);
    res.json(result);
  } catch (error: any) {
    console.error('❌ [TripwireRoutes] Update status error:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

/**
 * GET /api/tripwire/stats
 * Получить статистику Tripwire (Sales Manager Dashboard)
 */
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const stats = await getTripwireStats();
    res.json(stats);
  } catch (error: any) {
    console.error('❌ [TripwireRoutes] Get stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

export default router;
