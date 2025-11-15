/**
 * Videos Routes
 * Handles video uploads with multer
 */

import express from 'express';
import multer from 'multer';
import * as videoController from '../controllers/videoController';

const router = express.Router();

// Multer config for video uploads
const MAX_VIDEO_SIZE = 3 * 1024 * 1024 * 1024; // 3 GB

const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video format. Allowed: MP4, WebM, OGG, MOV'));
    }
  },
});

// Multer error handler
function handleMulterError(err: any, req: any, res: any, next: any) {
  if (err instanceof multer.MulterError) {
    console.error('[Video Multer Error]', err.code, err.message);

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `Максимальный размер видео: 3 GB`,
        code: err.code,
      });
    }

    return res.status(400).json({
      error: 'Multer error',
      message: err.message,
      code: err.code,
    });
  }

  if (err) {
    console.error('[Video Upload] ❌ Error:', err.message);
    return res.status(400).json({
      error: 'File upload error',
      message: err.message,
    });
  }

  next();
}

// Video upload route
router.post('/lessons/:lessonId/video', videoUpload.single('video'), handleMulterError, videoController.upload);

export default router;

