/**
 * Course Service
 * Handles all course-related database operations
 */

import { supabase } from '../config/supabase';
import { Course, CreateCourseDto, UpdateCourseDto, CourseWithModules } from '../types/courses.types';

/**
 * Create a new course
 */
export async function createCourse(data: CreateCourseDto): Promise<Course> {
  try {
    console.log('[CourseService] Creating course:', data.title);

    // ===== AUTO-INCREMENT: Get next ID =====
    const { data: maxIdRow } = await supabase
      .from('courses')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const nextId = maxIdRow ? parseInt(maxIdRow.id.toString()) + 1 : 1;
    console.log('[CourseService] Next ID:', nextId);
    // ========================================

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/-+/g, '-') // Replace multiple dashes with single
      .trim();
    console.log('[CourseService] Generated slug:', slug);

    const { data: course, error } = await supabase
      .from('courses')
      .insert({
        id: nextId, // AUTO-INCREMENT ID
        name: data.title, // Using 'name' column as per existing schema
        slug: slug, // Auto-generated slug
        description: data.description,
        thumbnail_url: data.thumbnail_url,
      })
      .select()
      .single();

    if (error) {
      console.error('[CourseService] ❌ Error creating course:', error);
      throw new Error(`Failed to create course: ${error.message}`);
    }

    console.log('[CourseService] ✅ Course created:', course.id);
    return {
      id: course.id.toString(),
      title: course.name,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      created_at: course.created_at,
      updated_at: course.updated_at,
    };
  } catch (error: any) {
    console.error('[CourseService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get all courses
 */
export async function getAllCourses(): Promise<Course[]> {
  try {
    console.log('[CourseService] Fetching all courses');

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CourseService] ❌ Error fetching courses:', error);
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }

    console.log(`[CourseService] ✅ Found ${courses?.length || 0} courses`);
    return courses.map((course) => ({
      id: course.id.toString(),
      title: course.name,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      created_at: course.created_at,
      updated_at: course.updated_at,
    }));
  } catch (error: any) {
    console.error('[CourseService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get course by ID with its modules
 */
export async function getCourseById(courseId: number): Promise<CourseWithModules> {
  try {
    console.log('[CourseService] Fetching course:', courseId);

    // Fetch course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('[CourseService] ❌ Course not found:', courseId);
      throw new Error('Course not found');
    }

    // Fetch modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (modulesError) {
      console.error('[CourseService] ❌ Error fetching modules:', modulesError);
      throw new Error(`Failed to fetch modules: ${modulesError.message}`);
    }

    console.log(`[CourseService] ✅ Course found with ${modules?.length || 0} modules`);
    return {
      id: course.id.toString(),
      title: course.name,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      created_at: course.created_at,
      updated_at: course.updated_at,
      modules: modules.map((module) => ({
        id: module.id,
        course_id: module.course_id.toString(),
        title: module.title,
        order_index: module.order_index,
        created_at: module.created_at,
      })),
    };
  } catch (error: any) {
    console.error('[CourseService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Update course
 */
export async function updateCourse(courseId: number, data: UpdateCourseDto): Promise<Course> {
  try {
    console.log('[CourseService] Updating course:', courseId);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.title) updateData.name = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.thumbnail_url !== undefined) updateData.thumbnail_url = data.thumbnail_url;

    const { data: course, error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single();

    if (error || !course) {
      console.error('[CourseService] ❌ Error updating course:', error);
      throw new Error(error?.message || 'Course not found');
    }

    console.log('[CourseService] ✅ Course updated:', courseId);
    return {
      id: course.id.toString(),
      title: course.name,
      description: course.description,
      thumbnail_url: course.thumbnail_url,
      created_at: course.created_at,
      updated_at: course.updated_at,
    };
  } catch (error: any) {
    console.error('[CourseService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Delete course (and all related modules, lessons, videos, materials)
 */
export async function deleteCourse(courseId: number): Promise<void> {
  try {
    console.log('[CourseService] Deleting course:', courseId);

    // Check if course exists
    const { data: course, error: checkError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (checkError || !course) {
      console.error('[CourseService] ❌ Course not found:', courseId);
      throw new Error('Course not found');
    }

    // Delete course (cascade will handle modules, lessons, etc.)
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (error) {
      console.error('[CourseService] ❌ Error deleting course:', error);
      throw new Error(`Failed to delete course: ${error.message}`);
    }

    console.log('[CourseService] ✅ Course deleted:', courseId);
  } catch (error: any) {
    console.error('[CourseService] ❌ Exception:', error.message);
    throw error;
  }
}

