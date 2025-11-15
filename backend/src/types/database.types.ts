/**
 * ========================================
 * DATABASE TYPES: Образовательная платформа onAI Academy
 * ========================================
 * Автоматически генерируемые TypeScript типы для таблиц Supabase
 * Миграция: 20251115_fix_course_structure.sql
 * Дата: 2025-11-15
 */

// ====================================
// ENUM TYPES
// ====================================

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export type LessonType = 'video' | 'text' | 'quiz' | 'assignment';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export type TranscodingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type VideoEventType = 'play' | 'pause' | 'seek' | 'complete' | 'skip' | 'replay';

// ====================================
// TABLE: courses
// ====================================

export interface Course {
  id: string; // UUID
  title: string;
  slug: string;
  description?: string | null;
  thumbnail_url?: string | null;
  instructor_id?: string | null; // UUID → auth.users
  duration_hours?: number;
  level?: CourseLevel | null;
  is_published?: boolean;
  price?: number; // DECIMAL(10, 2)
  order_index?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CourseInsert {
  id?: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnail_url?: string | null;
  instructor_id?: string | null;
  duration_hours?: number;
  level?: CourseLevel | null;
  is_published?: boolean;
  price?: number;
  order_index?: number;
}

export interface CourseUpdate {
  title?: string;
  slug?: string;
  description?: string | null;
  thumbnail_url?: string | null;
  instructor_id?: string | null;
  duration_hours?: number;
  level?: CourseLevel | null;
  is_published?: boolean;
  price?: number;
  order_index?: number;
}

// ====================================
// TABLE: modules
// ====================================

export interface Module {
  id: string; // UUID
  course_id: string; // UUID → courses
  title: string;
  description?: string | null;
  order_index: number;
  is_locked?: boolean;
  unlock_after_module_id?: string | null; // UUID → modules
  created_at?: Date;
  updated_at?: Date;
}

export interface ModuleInsert {
  id?: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  is_locked?: boolean;
  unlock_after_module_id?: string | null;
}

export interface ModuleUpdate {
  title?: string;
  description?: string | null;
  order_index?: number;
  is_locked?: boolean;
  unlock_after_module_id?: string | null;
}

// ====================================
// TABLE: lessons
// ====================================

export interface Lesson {
  id: string; // UUID
  module_id: string; // UUID → modules
  title: string;
  description?: string | null;
  content?: string | null; // Markdown
  lesson_type?: LessonType;
  duration_minutes?: number;
  order_index: number;
  is_preview?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface LessonInsert {
  id?: string;
  module_id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  lesson_type?: LessonType;
  duration_minutes?: number;
  order_index: number;
  is_preview?: boolean;
}

export interface LessonUpdate {
  title?: string;
  description?: string | null;
  content?: string | null;
  lesson_type?: LessonType;
  duration_minutes?: number;
  order_index?: number;
  is_preview?: boolean;
}

// ====================================
// TABLE: video_content (Cloudflare R2)
// ====================================

export interface VideoContent {
  id: string; // UUID
  lesson_id: string; // UUID → lessons
  
  // Cloudflare R2 метаданные
  r2_object_key: string;
  r2_bucket_name: string;
  public_url?: string | null;
  
  // Метаданные видео
  filename: string;
  file_size_bytes?: number | null;
  duration_seconds?: number | null;
  resolution?: string | null; // '1080p', '720p', '480p'
  format?: string | null; // 'mp4', 'webm'
  
  // Статус обработки
  upload_status?: UploadStatus;
  transcoding_status?: TranscodingStatus;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface VideoContentInsert {
  id?: string;
  lesson_id: string;
  r2_object_key: string;
  r2_bucket_name?: string;
  public_url?: string | null;
  filename: string;
  file_size_bytes?: number | null;
  duration_seconds?: number | null;
  resolution?: string | null;
  format?: string | null;
  upload_status?: UploadStatus;
  transcoding_status?: TranscodingStatus;
}

export interface VideoContentUpdate {
  r2_object_key?: string;
  public_url?: string | null;
  file_size_bytes?: number | null;
  duration_seconds?: number | null;
  resolution?: string | null;
  format?: string | null;
  upload_status?: UploadStatus;
  transcoding_status?: TranscodingStatus;
}

// ====================================
// TABLE: lesson_materials (Supabase Storage)
// ====================================

export interface LessonMaterial {
  id: string; // UUID
  lesson_id: string; // UUID → lessons
  
  // Supabase Storage метаданные
  storage_path: string;
  bucket_name: string;
  
  // Информация о файле
  filename: string;
  file_type?: string | null; // 'PDF', 'DOCX', 'XLSX'
  file_size_bytes?: number | null;
  display_name?: string | null;
  
  // Доступность
  is_downloadable?: boolean;
  requires_completion?: boolean;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface LessonMaterialInsert {
  id?: string;
  lesson_id: string;
  storage_path: string;
  bucket_name?: string;
  filename: string;
  file_type?: string | null;
  file_size_bytes?: number | null;
  display_name?: string | null;
  is_downloadable?: boolean;
  requires_completion?: boolean;
}

export interface LessonMaterialUpdate {
  storage_path?: string;
  filename?: string;
  file_type?: string | null;
  display_name?: string | null;
  is_downloadable?: boolean;
  requires_completion?: boolean;
}

// ====================================
// TABLE: student_progress
// ====================================

export interface StudentProgress {
  id: string; // UUID
  user_id: string; // UUID → auth.users
  lesson_id: string; // UUID → lessons
  
  // Прогресс видео
  video_progress_percent?: number; // 0-100
  last_position_seconds?: number;
  watch_time_seconds?: number;
  
  // Статус урока
  is_started?: boolean;
  is_completed?: boolean;
  completed_at?: Date | null;
  
  // Метрики для AI
  times_watched?: number;
  average_speed?: number; // DECIMAL(3, 2)
  
  created_at?: Date;
  updated_at?: Date;
}

export interface StudentProgressInsert {
  id?: string;
  user_id: string;
  lesson_id: string;
  video_progress_percent?: number;
  last_position_seconds?: number;
  watch_time_seconds?: number;
  is_started?: boolean;
  is_completed?: boolean;
  completed_at?: Date | null;
  times_watched?: number;
  average_speed?: number;
}

export interface StudentProgressUpdate {
  video_progress_percent?: number;
  last_position_seconds?: number;
  watch_time_seconds?: number;
  is_started?: boolean;
  is_completed?: boolean;
  completed_at?: Date | null;
  times_watched?: number;
  average_speed?: number;
}

// ====================================
// TABLE: video_analytics (для AI-аналитики)
// ====================================

export interface VideoAnalytics {
  id: string; // UUID
  user_id: string; // UUID → auth.users
  lesson_id: string; // UUID → lessons
  video_id: string; // UUID → video_content
  
  // События просмотра
  event_type: VideoEventType;
  position_seconds?: number | null;
  session_id?: string | null; // UUID
  
  // Контекст
  playback_speed?: number; // DECIMAL(3, 2)
  quality_setting?: string | null; // '1080p', '720p', 'auto'
  device_type?: string | null; // 'mobile', 'desktop', 'tablet'
  
  // Временные метки
  event_timestamp?: Date;
  created_at?: Date;
}

export interface VideoAnalyticsInsert {
  id?: string;
  user_id: string;
  lesson_id: string;
  video_id: string;
  event_type: VideoEventType;
  position_seconds?: number | null;
  session_id?: string | null;
  playback_speed?: number;
  quality_setting?: string | null;
  device_type?: string | null;
  event_timestamp?: Date;
}

// ====================================
// TABLE: module_progress
// ====================================

export interface ModuleProgress {
  id: string; // UUID
  user_id: string; // UUID → auth.users
  module_id: string; // UUID → modules
  
  // Статистика модуля
  total_lessons?: number;
  completed_lessons?: number;
  progress_percent?: number; // 0-100
  
  // Статус
  is_started?: boolean;
  is_completed?: boolean;
  started_at?: Date | null;
  completed_at?: Date | null;
  
  created_at?: Date;
  updated_at?: Date;
}

export interface ModuleProgressInsert {
  id?: string;
  user_id: string;
  module_id: string;
  total_lessons?: number;
  completed_lessons?: number;
  progress_percent?: number;
  is_started?: boolean;
  is_completed?: boolean;
  started_at?: Date | null;
  completed_at?: Date | null;
}

export interface ModuleProgressUpdate {
  total_lessons?: number;
  completed_lessons?: number;
  progress_percent?: number;
  is_started?: boolean;
  is_completed?: boolean;
  started_at?: Date | null;
  completed_at?: Date | null;
}

// ====================================
// API RESPONSE TYPES
// ====================================

/**
 * Полная структура курса (курс + модули + уроки)
 * Возвращается функцией get_course_structure(UUID)
 */
export interface CourseStructureResponse {
  course: Course;
  modules: Array<{
    module: Module;
    lessons: Lesson[];
  }>;
}

/**
 * Прогресс студента по курсу
 * Возвращается функцией get_student_course_progress(UUID, UUID)
 */
export interface StudentCourseProgressResponse {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  in_progress_lessons: number;
  total_watch_time: number; // секунды
  progress_percent: number; // 0-100
}

// ====================================
// RELATIONSHIPS (для JOIN запросов)
// ====================================

/**
 * Урок с видео-контентом
 */
export interface LessonWithVideo extends Lesson {
  video: VideoContent | null;
}

/**
 * Урок с материалами
 */
export interface LessonWithMaterials extends Lesson {
  materials: LessonMaterial[];
}

/**
 * Модуль с уроками
 */
export interface ModuleWithLessons extends Module {
  lessons: Lesson[];
}

/**
 * Курс с модулями и уроками (полная структура)
 */
export interface CourseWithModulesAndLessons extends Course {
  modules: ModuleWithLessons[];
}

/**
 * Прогресс студента с информацией об уроке
 */
export interface StudentProgressWithLesson extends StudentProgress {
  lesson: Lesson;
}

/**
 * Прогресс модуля с информацией о модуле
 */
export interface ModuleProgressWithModule extends ModuleProgress {
  module: Module;
}

// ====================================
// UTILITY TYPES
// ====================================

/**
 * Объединенный тип для всех таблиц
 */
export type DatabaseTables = {
  courses: Course;
  modules: Module;
  lessons: Lesson;
  video_content: VideoContent;
  lesson_materials: LessonMaterial;
  student_progress: StudentProgress;
  video_analytics: VideoAnalytics;
  module_progress: ModuleProgress;
};

/**
 * Типы для INSERT операций
 */
export type DatabaseInserts = {
  courses: CourseInsert;
  modules: ModuleInsert;
  lessons: LessonInsert;
  video_content: VideoContentInsert;
  lesson_materials: LessonMaterialInsert;
  student_progress: StudentProgressInsert;
  video_analytics: VideoAnalyticsInsert;
  module_progress: ModuleProgressInsert;
};

/**
 * Типы для UPDATE операций
 */
export type DatabaseUpdates = {
  courses: CourseUpdate;
  modules: ModuleUpdate;
  lessons: LessonUpdate;
  video_content: VideoContentUpdate;
  lesson_materials: LessonMaterialUpdate;
  student_progress: StudentProgressUpdate;
  module_progress: ModuleProgressUpdate;
};

// ====================================
// EXPORT ALL
// ====================================
// All types are already exported above with individual exports

