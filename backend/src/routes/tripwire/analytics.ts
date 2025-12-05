/**
 * Tripwire Analytics Routes
 * API для аналитики Tripwire студентов (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import * as tripwireDashboardController from '../../controllers/tripwire/tripwireDashboardController';

const router = express.Router();

/**
 * GET /api/tripwire/analytics/student/:userId/dashboard
 * Получить данные dashboard для Tripwire студента
 */
router.get('/student/:userId/dashboard', tripwireDashboardController.getDashboard);

export default router;

