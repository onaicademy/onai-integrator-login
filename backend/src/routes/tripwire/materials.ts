/**
 * Tripwire Materials Routes
 * API для работы с материалами к урокам (ИЗОЛИРОВАННАЯ БД)
 */

import express from 'express';
import * as tripwireMaterialsController from '../../controllers/tripwire/tripwireMaterialsController';

const router = express.Router();

/**
 * GET /api/tripwire/lessons/:lessonId/materials
 * Получить все материалы для урока
 */
router.get('/lessons/:lessonId/materials', tripwireMaterialsController.getMaterials);

/**
 * POST /api/tripwire/lessons/:lessonId/materials
 * Добавить материал к уроку (admin only)
 */
router.post('/lessons/:lessonId/materials', tripwireMaterialsController.addMaterial);

/**
 * DELETE /api/tripwire/materials/:materialId
 * Удалить материал (admin only)
 */
router.delete('/materials/:materialId', tripwireMaterialsController.deleteMaterial);

export default router;

