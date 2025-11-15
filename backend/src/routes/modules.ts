/**
 * Modules Routes
 */

import express from 'express';
import * as moduleController from '../controllers/moduleController';
import * as lessonController from '../controllers/lessonController';

const router = express.Router();

// Module routes
router.get('/:moduleId', moduleController.getById);
router.put('/:moduleId', moduleController.update);
router.delete('/:moduleId', moduleController.deleteModule);

// Lesson routes (nested under modules)
router.post('/:moduleId/lessons', lessonController.create);
router.get('/:moduleId/lessons', lessonController.getByModule);

export default router;

