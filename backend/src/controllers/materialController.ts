/**
 * Material Controller
 * Handles HTTP requests for lesson materials
 */

import { Request, Response } from 'express';
import * as materialService from '../services/materialService';
import { CreateMaterialDto } from '../types/courses.types';

/**
 * POST /lessons/:lessonId/materials - Add material
 */
export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const { 
      storage_path, 
      bucket_name, 
      filename, 
      display_name, 
      file_type, 
      file_size_bytes,
      is_downloadable,
      requires_completion
    } = req.body;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    if (!storage_path || !filename) {
      res.status(400).json({ error: 'storage_path and filename are required' });
      return;
    }

    const data: CreateMaterialDto = {
      lesson_id: parseInt(lessonId), // Convert string to integer
      storage_path,
      bucket_name,
      filename,
      display_name,
      file_type,
      file_size_bytes: file_size_bytes ? parseInt(file_size_bytes) : undefined,
      is_downloadable: is_downloadable !== undefined ? Boolean(is_downloadable) : undefined,
      requires_completion: requires_completion !== undefined ? Boolean(requires_completion) : undefined,
    };

    const material = await materialService.addLessonMaterial(data);
    res.status(201).json({ success: true, data: material });
  } catch (error: any) {
    console.error('[MaterialController] Error:', error.message);
    if (error.message === 'Lesson not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

/**
 * GET /lessons/:lessonId/materials - Get all materials for lesson
 */
export async function getByLesson(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;

    if (!lessonId) {
      res.status(400).json({ error: 'Lesson ID is required' });
      return;
    }

    const materials = await materialService.getLessonMaterials(parseInt(lessonId));
    res.json({ success: true, data: materials });
  } catch (error: any) {
    console.error('[MaterialController] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /materials/:materialId - Delete material
 */
export async function deleteMaterial(req: Request, res: Response): Promise<void> {
  try {
    const { materialId } = req.params;

    if (!materialId) {
      res.status(400).json({ error: 'Material ID is required' });
      return;
    }

    await materialService.deleteMaterial(materialId);
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error: any) {
    console.error('[MaterialController] Error:', error.message);
    if (error.message === 'Material not found') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
}

