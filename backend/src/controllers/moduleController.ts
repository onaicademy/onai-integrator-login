/**
 * Module Controller
 * Handles HTTP requests for modules
 */

import { Request, Response } from 'express';
import * as moduleService from '../services/moduleService';
import { CreateModuleDto, UpdateModuleDto } from '../types/courses.types';

/**
 * POST /courses/:courseId/modules - Create new module
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;
    const { title, order_index } = req.body;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    if (!title || order_index === undefined) {
      res.status(400).json({ error: 'Title and order_index are required' });
      return;
    }

    const data: CreateModuleDto = {
      course_id: courseId,
      title,
      order_index: parseInt(order_index),
    };

    const module = await moduleService.createModule(data);
    res.status(201).json({ success: true, data: module });
  } catch (error: any) {
    console.error('[ModuleController] Error:', error.message);
    if (error.message === 'Course not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * GET /courses/:courseId/modules - Get all modules for course
 */
export async function getByCourse(req: Request, res: Response): Promise<void> {
  try {
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    const modules = await moduleService.getModulesByCourse(courseId);
    res.json({ success: true, data: modules });
  } catch (error: any) {
    console.error('[ModuleController] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /modules/:moduleId - Get module by ID
 */
export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      res.status(400).json({ error: 'Module ID is required' });
      return;
    }

    const module = await moduleService.getModuleById(parseInt(moduleId));
    res.json({ success: true, data: module });
  } catch (error: any) {
    console.error('[ModuleController] Error:', error.message);
    if (error.message === 'Module not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * PUT /modules/:moduleId - Update module
 */
export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { moduleId } = req.params;
    const { title, order_index } = req.body;

    if (!moduleId) {
      res.status(400).json({ error: 'Module ID is required' });
      return;
    }

    const data: UpdateModuleDto = {
      title,
      order_index: order_index !== undefined ? parseInt(order_index) : undefined,
    };

    const module = await moduleService.updateModule(parseInt(moduleId), data);
    res.json({ success: true, data: module });
  } catch (error: any) {
    console.error('[ModuleController] Error:', error.message);
    if (error.message === 'Module not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * DELETE /modules/:moduleId - Delete module
 */
export async function deleteModule(req: Request, res: Response): Promise<void> {
  try {
    const { moduleId } = req.params;

    if (!moduleId) {
      res.status(400).json({ error: 'Module ID is required' });
      return;
    }

    await moduleService.deleteModule(parseInt(moduleId));
    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (error: any) {
    console.error('[ModuleController] Error:', error.message);
    if (error.message === 'Module not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

