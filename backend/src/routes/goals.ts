/**
 * Goals Routes
 * API для работы с целями студентов
 */

import express from 'express';
import { getWeekly, updateProgress } from '../controllers/goalsController';

const router = express.Router();

/**
 * GET /api/goals/weekly/:userId
 * Получить недельные цели студента
 */
router.get('/weekly/:userId', getWeekly);

/**
 * POST /api/goals/update-progress
 * Обновить прогресс цели
 */
router.post('/update-progress', updateProgress);

export default router;

