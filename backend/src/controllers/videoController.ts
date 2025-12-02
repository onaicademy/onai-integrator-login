/**
 * Video Controller
 * Handles HTTP requests for video uploads
 */

import { Request, Response } from 'express';
import * as videoService from '../services/videoService';

/**
 * POST /lessons/:lessonId/video - Upload video
 */
export async function upload(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const file = req.file;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'Video file is required' });
      return;
    }

    console.log('[VideoController] Uploading video:', {
      lessonId,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // Extract duration from body (if provided)
    const duration = req.body.duration ? parseInt(req.body.duration) : undefined;

    const video = await videoService.uploadLessonVideo(
      parseInt(lessonId),
      file.buffer,
      file.originalname,
      file.mimetype,
      duration,
      file.size
    );

    res.status(201).json({ success: true, data: video });
  } catch (error: any) {
    console.error('[VideoController] Error:', error.message);
    if (error.message === 'Lesson not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * GET /lessons/:lessonId/video - Get video with signed URL
 */
export async function get(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const video = await videoService.getLessonVideo(parseInt(lessonId));
    res.json({ success: true, data: video });
  } catch (error: any) {
    console.error('[VideoController] Error:', error.message);
    if (error.message === 'Video not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /lessons/:lessonId/video - Delete video
 */
export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    await videoService.deleteLessonVideo(parseInt(lessonId));
    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error: any) {
    console.error('[VideoController] Error:', error.message);
    if (error.message === 'Video not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

