/**
 * Tripwire Materials Controller
 * HTTP Controller для материалов к урокам
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { Request, Response } from 'express';
import { getLessonMaterials, addLessonMaterial, deleteLessonMaterial } from '../../services/tripwire/tripwireMaterialsService';

/**
 * GET /api/tripwire/lessons/:lessonId/materials
 * Получить все материалы для урока
 */
export async function getMaterials(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    console.log('📚 [Tripwire MaterialsController] Запрос материалов для урока:', lessonId);
    
    const materials = await getLessonMaterials(parseInt(lessonId));
    
    res.json({
      success: true,
      data: materials,
      count: materials.length
    });
  } catch (error: any) {
    console.error('❌ [Tripwire MaterialsController] Ошибка getMaterials:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch materials'
    });
  }
}

/**
 * POST /api/tripwire/lessons/:lessonId/materials
 * Добавить материал к уроку (admin only)
 */
export async function addMaterial(req: Request, res: Response): Promise<void> {
  try {
    const { lessonId } = req.params;
    const { title, filename, file_url, file_type, file_size_bytes } = req.body;
    
    console.log('📚 [Tripwire MaterialsController] Добавление материала для урока:', lessonId);
    
    if (!title || !filename || !file_url || !file_type) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: title, filename, file_url, file_type'
      });
      return;
    }
    
    const material = await addLessonMaterial(
      parseInt(lessonId),
      title,
      filename,
      file_url,
      file_type,
      file_size_bytes
    );
    
    res.json({
      success: true,
      data: material
    });
  } catch (error: any) {
    console.error('❌ [Tripwire MaterialsController] Ошибка addMaterial:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add material'
    });
  }
}

/**
 * DELETE /api/tripwire/materials/:materialId
 * Удалить материал (admin only)
 */
export async function deleteMaterial(req: Request, res: Response): Promise<void> {
  try {
    const { materialId } = req.params;
    console.log('📚 [Tripwire MaterialsController] Удаление материала:', materialId);
    
    await deleteLessonMaterial(materialId);
    
    res.json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error: any) {
    console.error('❌ [Tripwire MaterialsController] Ошибка deleteMaterial:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete material'
    });
  }
}

