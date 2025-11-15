/**
 * Lessons Routes
 */

import express from 'express';
import * as lessonController from '../controllers/lessonController';
import * as videoController from '../controllers/videoController';
import * as materialController from '../controllers/materialController';

const router = express.Router();

// Lesson routes
router.get('/:lessonId', lessonController.getById);
router.put('/:lessonId', lessonController.update);
router.delete('/:lessonId', lessonController.deleteLesson);

// Video routes (nested under lessons)
// Note: video upload is handled in videos.ts with multer middleware
router.get('/:lessonId/video', videoController.get);
router.delete('/:lessonId/video', videoController.remove);

// Material routes (nested under lessons)
router.post('/:lessonId/materials', materialController.create);
router.get('/:lessonId/materials', materialController.getByLesson);

export default router;

