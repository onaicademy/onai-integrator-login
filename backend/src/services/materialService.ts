/**
 * Material Service
 * Handles lesson materials database operations
 */

import { supabase } from '../config/supabase';
import { LessonMaterial, CreateMaterialDto } from '../types/courses.types';

/**
 * Add material to lesson
 */
export async function addLessonMaterial(data: CreateMaterialDto): Promise<LessonMaterial> {
  try {
    console.log('[MaterialService] Adding material to lesson:', data.lesson_id);

    // Check if lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', data.lesson_id)
      .single();

    if (lessonError || !lesson) {
      console.error('[MaterialService] ❌ Lesson not found:', data.lesson_id);
      throw new Error('Lesson not found');
    }

    const { data: material, error } = await supabase
      .from('lesson_materials')
      .insert({
        lesson_id: data.lesson_id,
        storage_path: data.storage_path,
        bucket_name: data.bucket_name || 'lesson-materials',
        filename: data.filename,
        display_name: data.display_name,
        file_type: data.file_type,
        file_size_bytes: data.file_size_bytes,
        is_downloadable: data.is_downloadable !== undefined ? data.is_downloadable : true,
        requires_completion: data.requires_completion !== undefined ? data.requires_completion : false,
      })
      .select()
      .single();

    if (error) {
      console.error('[MaterialService] ❌ Error adding material:', error);
      throw new Error(`Failed to add material: ${error.message}`);
    }

    console.log('[MaterialService] ✅ Material added:', material.id);
    return {
      id: material.id,
      lesson_id: material.lesson_id,
      storage_path: material.storage_path,
      bucket_name: material.bucket_name,
      filename: material.filename,
      display_name: material.display_name,
      file_type: material.file_type,
      file_size_bytes: material.file_size_bytes,
      is_downloadable: material.is_downloadable,
      requires_completion: material.requires_completion,
      created_at: material.created_at,
      updated_at: material.updated_at,
    };
  } catch (error: any) {
    console.error('[MaterialService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get all materials for a lesson
 */
export async function getLessonMaterials(lessonId: number): Promise<LessonMaterial[]> {
  try {
    console.log('[MaterialService] Fetching materials for lesson:', lessonId);

    const { data: materials, error } = await supabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[MaterialService] ❌ Error fetching materials:', error);
      throw new Error(`Failed to fetch materials: ${error.message}`);
    }

    console.log(`[MaterialService] ✅ Found ${materials?.length || 0} materials`);
    return materials.map((material) => ({
      id: material.id,
      lesson_id: material.lesson_id,
      storage_path: material.storage_path,
      bucket_name: material.bucket_name,
      filename: material.filename,
      display_name: material.display_name,
      file_type: material.file_type,
      file_size_bytes: material.file_size_bytes,
      is_downloadable: material.is_downloadable,
      requires_completion: material.requires_completion,
      created_at: material.created_at,
      updated_at: material.updated_at,
    }));
  } catch (error: any) {
    console.error('[MaterialService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Delete material
 */
export async function deleteMaterial(materialId: string): Promise<void> {
  try {
    console.log('[MaterialService] Deleting material:', materialId);

    // Check if material exists
    const { data: material, error: checkError } = await supabase
      .from('lesson_materials')
      .select('id')
      .eq('id', materialId)
      .single();

    if (checkError || !material) {
      console.error('[MaterialService] ❌ Material not found:', materialId);
      throw new Error('Material not found');
    }

    // Delete material
    const { error } = await supabase
      .from('lesson_materials')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('[MaterialService] ❌ Error deleting material:', error);
      throw new Error(`Failed to delete material: ${error.message}`);
    }

    console.log('[MaterialService] ✅ Material deleted:', materialId);
  } catch (error: any) {
    console.error('[MaterialService] ❌ Exception:', error.message);
    throw error;
  }
}

