/**
 * TRIPWIRE ROUTES
 * 
 * ✅ ИЗОЛИРОВАННАЯ БАЗА ДАННЫХ: Все операции через tripwireAdminSupabase
 * ✅ Эндпоинты для Sales Manager Dashboard и Tripwire API
 * ✅ Доступ: admin и sales roles
 */

import express from 'express';
import { authenticateJWT, requireSalesOrAdmin } from '../middleware/auth';
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
router.post('/users', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.get('/users', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.put('/users/:userId/status', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.get('/stats', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
  try {
    const stats = await getTripwireStats();
    res.json(stats);
  } catch (error: any) {
    console.error('❌ [TripwireRoutes] Get stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

// 🔥 GET /api/tripwire/module-unlocks/:userId - получить разблокированные модули для Tripwire студента
router.get('/module-unlocks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔓 Getting module unlocks for Tripwire user:', userId);
    
    // ✅ FIX: Читаем из Tripwire DB (не Main!)
    const { tripwirePool } = require('../config/tripwire-db');
    const result = await tripwirePool.query(`
      SELECT * FROM module_unlocks
      WHERE user_id = $1::uuid
      ORDER BY unlocked_at DESC
    `, [userId]);
    
    const unlocks = result.rows;
    
    console.log(`✅ Found ${unlocks?.length || 0} module unlocks for user ${userId}`);
    
    return res.json({ unlocks: unlocks || [] });
  } catch (error: any) {
    console.error('❌ Error in module-unlocks endpoint:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// 🔥 POST /api/tripwire/module-unlocks/mark-shown - отметить анимацию как показанную
router.post('/module-unlocks/mark-shown', async (req, res) => {
  try {
    const { userId, moduleId } = req.body;

    if (!userId || !moduleId) {
      return res.status(400).json({ error: 'userId and moduleId are required' });
    }

    console.log(`🔔 Marking animation as shown for user ${userId}, module ${moduleId}`);

    // ✅ ИСПРАВЛЕНО: Используем Tripwire DB (Direct Pool)
    const { tripwirePool } = require('../config/tripwire-db');

    await tripwirePool.query(`
      UPDATE module_unlocks 
      SET animation_shown = true 
      WHERE user_id = $1 AND module_id = $2
    `, [userId, moduleId]);

    console.log(`✅ Animation marked as shown in Tripwire DB`);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error in mark-shown endpoint:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
