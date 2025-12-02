/**
 * TypeScript types for Courses API
 * Generated: 2025-11-15
 */

export interface Course {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  order_index: number;
  video_url?: string;
  video_duration?: number;
  created_at: string;
  updated_at: string;
}

export interface VideoContent {
  id: string;
  lesson_id: string;
  r2_key: string;
  r2_url: string;
  title: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  mime_type: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
}

export interface LessonMaterial {
  id: string; // UUID
  lesson_id: number; // INTEGER
  storage_path: string;
  bucket_name: string;
  filename: string;
  display_name?: string;
  file_type?: string;
  file_size_bytes?: number;
  is_downloadable?: boolean;
  requires_completion?: boolean;
  created_at: string;
  updated_at?: string;
}

// Create types (without id, created_at, updated_at)
export interface CreateCourseDto {
  title: string;
  description?: string;
  thumbnail_url?: string;
}

export interface UpdateCourseDto {
  title?: string;
  description?: string;
  thumbnail_url?: string;
}

export interface CreateModuleDto {
  course_id: string;
  title: string;
  order_index: number;
}

export interface UpdateModuleDto {
  title?: string;
  order_index?: number;
}

export interface CreateLessonDto {
  module_id: number; // INTEGER in database
  title: string;
  description?: string;
  order_index: number;
}

export interface UpdateLessonDto {
  title?: string;
  description?: string;
  order_index?: number;
  video_url?: string;
  video_duration?: number;
}

export interface CreateVideoDto {
  lesson_id: string;
  title: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  mime_type: string;
}

export interface CreateMaterialDto {
  lesson_id: number; // INTEGER in database
  storage_path: string; // Path in Supabase Storage
  bucket_name?: string; // Default: 'lesson-materials'
  filename: string;
  display_name?: string; // Display name for UI
  file_type?: string;
  file_size_bytes?: number;
  is_downloadable?: boolean;
  requires_completion?: boolean;
}

// Response types with nested data
export interface CourseWithModules extends Course {
  modules?: Module[];
}

export interface ModuleWithLessons extends Module {
  lessons?: Lesson[];
}

export interface LessonWithDetails extends Lesson {
  video?: VideoContent;
  materials?: LessonMaterial[];
}

export interface VideoContentWithSignedUrl extends VideoContent {
  signed_url: string;
}

