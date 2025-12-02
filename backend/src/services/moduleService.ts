/**
 * Module Service
 * Handles all module-related database operations
 */

import { supabase } from '../config/supabase';
import { Module, CreateModuleDto, UpdateModuleDto, ModuleWithLessons } from '../types/courses.types';

/**
 * Create a new module
 */
export async function createModule(data: CreateModuleDto): Promise<Module> {
  try {
    console.log('[ModuleService] Creating module:', data.title);

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', data.course_id)
      .single();

    if (courseError || !course) {
      console.error('[ModuleService] ❌ Course not found:', data.course_id);
      throw new Error('Course not found');
    }

    // ===== AUTO-INCREMENT: Get next ID (modules uses INTEGER) =====
    const { data: maxIdRow } = await supabase
      .from('modules')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const nextId = maxIdRow ? parseInt(maxIdRow.id.toString()) + 1 : 1;
    console.log('[ModuleService] Next ID:', nextId);
    // ===============================================================

    const { data: module, error } = await supabase
      .from('modules')
      .insert({
        id: nextId, // AUTO-INCREMENT ID
        course_id: data.course_id,
        title: data.title,
        order_index: data.order_index,
      })
      .select()
      .single();

    if (error) {
      console.error('[ModuleService] ❌ Error creating module:', error);
      throw new Error(`Failed to create module: ${error.message}`);
    }

    console.log('[ModuleService] ✅ Module created:', module.id);
    return {
      id: module.id,
      course_id: module.course_id.toString(),
      title: module.title,
      order_index: module.order_index,
      created_at: module.created_at,
    };
  } catch (error: any) {
    console.error('[ModuleService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get all modules by course ID
 */
export async function getModulesByCourse(courseId: string): Promise<Module[]> {
  try {
    console.log('[ModuleService] Fetching modules for course:', courseId);

    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[ModuleService] ❌ Error fetching modules:', error);
      throw new Error(`Failed to fetch modules: ${error.message}`);
    }

    console.log(`[ModuleService] ✅ Found ${modules?.length || 0} modules`);
    return modules.map((module) => ({
      id: module.id,
      course_id: module.course_id.toString(),
      title: module.title,
      order_index: module.order_index,
      created_at: module.created_at,
    }));
  } catch (error: any) {
    console.error('[ModuleService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get module by ID with its lessons
 */
export async function getModuleById(moduleId: number): Promise<ModuleWithLessons> {
  try {
    console.log('[ModuleService] Fetching module:', moduleId);

    // Fetch module
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('*')
      .eq('id', moduleId)
      .single();

    if (moduleError || !module) {
      console.error('[ModuleService] ❌ Module not found:', moduleId);
      throw new Error('Module not found');
    }

    // Fetch lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    if (lessonsError) {
      console.error('[ModuleService] ❌ Error fetching lessons:', lessonsError);
      throw new Error(`Failed to fetch lessons: ${lessonsError.message}`);
    }

    console.log(`[ModuleService] ✅ Module found with ${lessons?.length || 0} lessons`);
    return {
      id: module.id,
      course_id: module.course_id.toString(),
      title: module.title,
      order_index: module.order_index,
      created_at: module.created_at,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        module_id: lesson.module_id,
        title: lesson.title,
        description: lesson.description,
        order_index: lesson.order_index,
        video_url: lesson.video_url,
        video_duration: lesson.video_duration,
        created_at: lesson.created_at,
        updated_at: lesson.updated_at,
      })),
    };
  } catch (error: any) {
    console.error('[ModuleService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Update module
 */
export async function updateModule(moduleId: number, data: UpdateModuleDto): Promise<Module> {
  try {
    console.log('[ModuleService] Updating module:', moduleId);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.order_index !== undefined) updateData.order_index = data.order_index;

    const { data: module, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .select()
      .single();

    if (error || !module) {
      console.error('[ModuleService] ❌ Error updating module:', error);
      throw new Error(error?.message || 'Module not found');
    }

    console.log('[ModuleService] ✅ Module updated:', moduleId);
    return {
      id: module.id,
      course_id: module.course_id.toString(),
      title: module.title,
      order_index: module.order_index,
      created_at: module.created_at,
    };
  } catch (error: any) {
    console.error('[ModuleService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Delete module (and all related lessons, videos, materials)
 */
export async function deleteModule(moduleId: number): Promise<void> {
  try {
    console.log('[ModuleService] Deleting module:', moduleId);

    // Check if module exists
    const { data: module, error: checkError } = await supabase
      .from('modules')
      .select('id')
      .eq('id', moduleId)
      .single();

    if (checkError || !module) {
      console.error('[ModuleService] ❌ Module not found:', moduleId);
      throw new Error('Module not found');
    }

    // Delete module (cascade will handle lessons)
    const { error } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId);

    if (error) {
      console.error('[ModuleService] ❌ Error deleting module:', error);
      throw new Error(`Failed to delete module: ${error.message}`);
    }

    console.log('[ModuleService] ✅ Module deleted:', moduleId);
  } catch (error: any) {
    console.error('[ModuleService] ❌ Exception:', error.message);
    throw error;
  }
}

