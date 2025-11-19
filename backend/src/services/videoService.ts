/**
 * Video Service
 * Handles video uploads to R2 and video_content database operations
 */

import { supabase } from '../config/supabase';
// R2 Storage removed - using Supabase Storage instead
// import { uploadVideoToR2, getSignedVideoUrl, deleteVideoFromR2 } from './r2StorageService';
import { VideoContent, VideoContentWithSignedUrl, CreateVideoDto } from '../types/courses.types';

/**
 * Upload video to R2 and save metadata to database
 */
export async function uploadLessonVideo(
  lessonId: number,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  duration?: number,
  fileSize?: number
): Promise<VideoContent> {
  try {
    console.log('[VideoService] Uploading video for lesson:', lessonId);

    // Check if lesson exists
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('[VideoService] ❌ Lesson not found:', lessonId);
      throw new Error('Lesson not found');
    }

    // Check if video already exists for this lesson
    const { data: existingVideo } = await supabase
      .from('video_content')
      .select('id, r2_key')
      .eq('lesson_id', lessonId)
      .single();

    // If exists, delete old video (R2 removed - using Supabase Storage)
    if (existingVideo) {
      console.log('[VideoService] Deleting old video:', existingVideo.r2_key);
      try {
        // TODO: Replace with Supabase Storage delete
        // await deleteVideoFromR2(existingVideo.r2_key);
        await supabase.from('video_content').delete().eq('id', existingVideo.id);
      } catch (deleteError) {
        console.warn('[VideoService] ⚠️ Failed to delete old video:', deleteError);
      }
    }

    // Upload to storage (R2 removed - using Supabase Storage)
    // TODO: Replace with Supabase Storage upload
    throw new Error('Video upload not implemented - R2 removed, need Supabase Storage implementation');
    
    /* Commented out - R2 removed
    const { url, key } = await uploadVideoToR2(fileBuffer, fileName, mimeType);

    // Save metadata to database
    const { data: video, error } = await supabase
      .from('video_content')
      .insert({
        lesson_id: lessonId,
        r2_key: key,
        r2_url: url,
        title: lesson?.title || '',
        duration_seconds: duration,
        file_size_bytes: fileSize,
        mime_type: mimeType,
        status: 'ready',
      })
      .select()
      .single();

    if (error) {
      console.error('[VideoService] ❌ Error saving video metadata:', error);
      throw new Error(`Failed to save video metadata: ${error.message}`);
    }

    // Update lesson with video URL and duration
    await supabase
      .from('lessons')
      .update({
        video_url: url,
        video_duration: duration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);
    */
    
    // Code below is unreachable - commented out
    /*
    console.log('[VideoService] ✅ Video uploaded successfully:', video.id);
    return {
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
    };
    */
  } catch (error: any) {
    console.error('[VideoService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Get video with signed URL
 */
export async function getLessonVideo(lessonId: number): Promise<VideoContentWithSignedUrl> {
  try {
    console.log('[VideoService] Fetching video for lesson:', lessonId);

    const { data: video, error } = await supabase
      .from('video_content')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (error || !video) {
      console.error('[VideoService] ❌ Video not found for lesson:', lessonId);
      throw new Error('Video not found');
    }

    // Generate signed URL (R2 removed - using Supabase Storage)
    // TODO: Replace with Supabase Storage signed URL
    // const signedUrl = await getSignedVideoUrl(video.r2_key, 7200);
    const signedUrl = video.r2_url || ''; // Temporary fallback

    console.log('[VideoService] ✅ Video found with signed URL');
    return {
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
      signed_url: signedUrl,
    };
  } catch (error: any) {
    console.error('[VideoService] ❌ Exception:', error.message);
    throw error;
  }
}

/**
 * Delete video from R2 and database
 */
export async function deleteLessonVideo(lessonId: number): Promise<void> {
  try {
    console.log('[VideoService] Deleting video for lesson:', lessonId);

    // Get video metadata
    const { data: video, error: fetchError } = await supabase
      .from('video_content')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (fetchError || !video) {
      console.error('[VideoService] ❌ Video not found:', lessonId);
      throw new Error('Video not found');
    }

    // Delete from storage (R2 removed - using Supabase Storage)
    // TODO: Replace with Supabase Storage delete
    // await deleteVideoFromR2(video.r2_key);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('video_content')
      .delete()
      .eq('id', video.id);

    if (deleteError) {
      console.error('[VideoService] ❌ Error deleting video metadata:', deleteError);
      throw new Error(`Failed to delete video metadata: ${deleteError.message}`);
    }

    // Update lesson (remove video_url and video_duration)
    await supabase
      .from('lessons')
      .update({
        video_url: null,
        video_duration: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lessonId);

    console.log('[VideoService] ✅ Video deleted successfully');
  } catch (error: any) {
    console.error('[VideoService] ❌ Exception:', error.message);
    throw error;
  }
}

