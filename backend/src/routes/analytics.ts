/**
 * Analytics Routes
 * API для аналитики студентов
 */

import express from 'express';
import { getDashboard } from '../controllers/dashboardController';

const router = express.Router();

/**
 * GET /api/analytics/student/:userId/dashboard
 * Получить данные дашборда для студента (для /neurohub)
 */
router.get('/student/:userId/dashboard', getDashboard);

export default router;

