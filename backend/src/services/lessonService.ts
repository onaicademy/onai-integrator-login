/**
 * Lesson Service
 * Handles all lesson-related database operations
 */

import { supabase } from '../config/supabase';
import { Lesson, CreateLessonDto, UpdateLessonDto, LessonWithDetails } from '../types/courses.types';

/**
 * Create a new lesson
 */
export async function createLesson(data: CreateLessonDto): Promise<Lesson> {
  try {
    console.log('[LessonService] Creating lesson:', data.title);

    // Check if module exists
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id')
      .eq('id', data.module_id)
      .single();

    if (moduleError || !module) {
      console.error('[LessonService] ❌ Module not found:', data.module_id);
      throw new Error('Module not found');
    }

    // ===== AUTO-INCREMENT: Get next ID (lessons uses INTEGER) =====
    const { data: maxIdRow } = await supabase
      .from('lessons')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const nextId = maxIdRow ? parseInt(maxIdRow.id.toString()) + 1 : 1;
    console.log('[LessonService] Next ID:', nextId);
    // ===============================================================

    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({
        id: nextId, // AUTO-INCREMENT ID
        module_id: data.module_id,
        title: data.title,
        // NOTE: description column doesn't exist in lessons table
        order_index: data.order_index,
      })
      .select()
      .single();

    if (error) {
      console.error('[LessonService] ❌ Error creating lesson:', error);
      throw new Error(`Failed to create lesson: ${error.message}`);
    }

    console.log('[LessonService] ✅ Lesson created:', lesson.id);
    return {
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description || undefined, // May not exist in DB
      order_index: lesson.order_index,
      video_url: lesson.video_url || undefined,
      video_duration: lesson.video_duration || undefined,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
    };
  } catch (error: any) {
    console.error('[LessonService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get all lessons by module ID
 */
export async function getLessonsByModule(moduleId: string): Promise<Lesson[]> {
  try {
    console.log('[LessonService] Fetching lessons for module:', moduleId);

    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[LessonService] ❌ Error fetching lessons:', error);
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }

    console.log(`[LessonService] ✅ Found ${lessons?.length || 0} lessons`);
    return lessons.map((lesson) => ({
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description,
      order_index: lesson.order_index,
      video_url: lesson.video_url,
      video_duration: lesson.video_duration,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
    }));
  } catch (error: any) {
    console.error('[LessonService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get lesson by ID with video and materials
 */
export async function getLessonById(lessonId: number): Promise<LessonWithDetails> {
  try {
    console.log('[LessonService] Fetching lesson:', lessonId);

    // Fetch lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('[LessonService] ❌ Lesson not found:', lessonId);
      throw new Error('Lesson not found');
    }

    // Fetch video
    const { data: video, error: videoError } = await supabase
      .from('video_content')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (videoError && videoError.code !== 'PGRST116') {
      console.error('[LessonService] ❌ Error fetching video:', videoError);
    }

    // Fetch materials
    const { data: materials, error: materialsError } = await supabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    if (materialsError) {
      console.error('[LessonService] ❌ Error fetching materials:', materialsError);
    }

    console.log(`[LessonService] ✅ Lesson found with video: ${!!video}, materials: ${materials?.length || 0}`);
    return {
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description,
      order_index: lesson.order_index,
      video_url: lesson.video_url,
      video_duration: lesson.video_duration,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
      video: video
        ? {
            id: video.id,
            lesson_id: video.lesson_id,
            r2_key: video.r2_key,
            r2_url: video.r2_url,
            title: video.title,
            duration_seconds: video.duration_seconds,
            file_size_bytes: video.file_size_bytes,
            mime_type: video.mime_type,
            status: video.status,
            created_at: video.created_at,
          }
        : undefined,
      materials: materials?.map((material) => ({
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
      })),
    };
  } catch (error: any) {
    console.error('[LessonService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Update lesson
 */
export async function updateLesson(lessonId: number, data: UpdateLessonDto): Promise<Lesson> {
  try {
    console.log('[LessonService] Updating lesson:', lessonId);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.order_index !== undefined) updateData.order_index = data.order_index;
    if (data.video_url !== undefined) updateData.video_url = data.video_url;
    if (data.video_duration !== undefined) updateData.video_duration = data.video_duration;

    const { data: lesson, error } = await supabase
      .from('lessons')
      .update(updateData)
      .eq('id', lessonId)
      .select()
      .single();

    if (error || !lesson) {
      console.error('[LessonService] ❌ Error updating lesson:', error);
      throw new Error(error?.message || 'Lesson not found');
    }

    console.log('[LessonService] ✅ Lesson updated:', lessonId);
    return {
      id: lesson.id,
      module_id: lesson.module_id,
      title: lesson.title,
      description: lesson.description,
      order_index: lesson.order_index,
      video_url: lesson.video_url,
      video_duration: lesson.video_duration,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
    };
  } catch (error: any) {
    console.error('[LessonService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Delete lesson (and related video, materials)
 */
export async function deleteLesson(lessonId: number): Promise<void> {
  try {
    console.log('[LessonService] Deleting lesson:', lessonId);

    // Check if lesson exists
    const { data: lesson, error: checkError } = await supabase
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .single();

    if (checkError || !lesson) {
      console.error('[LessonService] ❌ Lesson not found:', lessonId);
      throw new Error('Lesson not found');
    }

    // Delete lesson (cascade will handle video_content and lesson_materials)
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      console.error('[LessonService] ❌ Error deleting lesson:', error);
      throw new Error(`Failed to delete lesson: ${error.message}`);
    }

    console.log('[LessonService] ✅ Lesson deleted:', lessonId);
  } catch (error: any) {
    console.error('[LessonService] ❌ Exception:', error.message);
    throw error;
  }
}

