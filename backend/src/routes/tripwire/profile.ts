/**
 * Tripwire Profile Routes
 * API для работы с профилями Tripwire студентов (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import * as tripwireProfileController from '../../controllers/tripwire/tripwireProfileController';

const router = express.Router();

/**
 * GET /api/tripwire/users/:userId/profile
 * Получить профиль Tripwire студента
 */
router.get('/:userId/profile', tripwireProfileController.getProfile);

export default router;

