/**
 * Courses Routes
 */

import express from 'express';
import * as courseController from '../controllers/courseController';
import * as moduleController from '../controllers/moduleController';

const router = express.Router();

// Course routes
router.post('/', courseController.create);
router.get('/', courseController.getAll);
router.get('/:courseId', courseController.getById);
router.put('/:courseId', courseController.update);
router.delete('/:courseId', courseController.deleteCourse);

// Module routes (nested under courses)
router.post('/:courseId/modules', moduleController.create);
router.get('/:courseId/modules', moduleController.getByCourse);

export default router;

