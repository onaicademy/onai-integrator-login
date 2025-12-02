/**
 * Lesson Controller
 * Handles HTTP requests for lessons
 */

import { Request, Response } from 'express';
import * as lessonService from '../services/lessonService';
import { CreateLessonDto, UpdateLessonDto } from '../types/courses.types';

/**
 * POST /modules/:moduleId/lessons - Create new lesson
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { moduleId } = req.params;
    const { title, description, order_index } = req.body;

    if (!moduleId) {
      res.status(400).json({ error: 'Module ID is required' });
      return;
    }

    if (!title || order_index === undefined) {
      res.status(400).json({ error: 'Title and order_index are required' });
      return;
    }

    const data: CreateLessonDto = {
      module_id: parseInt(moduleId),
      title,
      description,
      order_index: parseInt(order_index),
    };

    const lesson = await lessonService.createLesson(data);
    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('[LessonController] Error:', error.message);
    if (error.message === 'Module not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * GET /modules/:moduleId/lessons - Get all lessons for module
 */
export async function getByModule(req: Request, res: Response): Promise<void> {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      res.status(400).json({ error: 'Module ID is required' });
      return;
    }

    const lessons = await lessonService.getLessonsByModule(moduleId);
    res.json({ success: true, data: lessons });
  } catch (error: any) {
    console.error('[LessonController] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /lessons/:lessonId - Get lesson by ID
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const lesson = await lessonService.getLessonById(parseInt(lessonId));
    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('[LessonController] Error:', error.message);
    if (error.message === 'Lesson not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /lessons/:lessonId - Update lesson
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const { title, description, order_index, video_url, video_duration } = req.body;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const data: UpdateLessonDto = {
      title,
      description,
      order_index: order_index !== undefined ? parseInt(order_index) : undefined,
      video_url,
      video_duration: video_duration !== undefined ? parseInt(video_duration) : undefined,
    };

    const lesson = await lessonService.updateLesson(parseInt(lessonId), data);
    res.json({ success: true, data: lesson });
  } catch (error: any) {
    console.error('[LessonController] Error:', error.message);
    if (error.message === 'Lesson not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /lessons/:lessonId - Delete lesson
 */
export async function deleteLesson(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    await lessonService.deleteLesson(parseInt(lessonId));
    res.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error: any) {
    console.error('[LessonController] Error:', error.message);
    if (error.message === 'Lesson not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

