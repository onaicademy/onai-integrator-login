/**
 * Missions Routes
 * API для работы с миссиями студентов
 */

import express from 'express';
import { getMissions, updateProgress } from '../controllers/missionsController';

const router = express.Router();

/**
 * GET /api/missions/:userId
 * Получить миссии студента
 */
router.get('/:userId', getMissions);

/**
 * POST /api/missions/update-progress
 * Обновить прогресс миссии
 */
router.post('/update-progress', updateProgress);

export default router;

