import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const router = Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * 🔒 SECURITY MIDDLEWARE: Extract userId from Supabase JWT token
 * This prevents Timur from accessing Ivan's data!
 */
const extractUserFromToken = async (req: Request): Promise<string | null> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [Security] No Bearer token in request');
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // 🔥 USE SUPABASE TO VALIDATE TOKEN (not custom JWT!)
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      console.error('❌ [Security] Supabase token validation failed:', error?.message);
      return null;
    }
    
    const userId = data.user.id;
    console.log('🔒 [Security] User authenticated via Supabase:', userId.substring(0, 8) + '...');
    return userId;
  } catch (error: any) {
    console.error('❌ [Security] Token verification failed:', error.message);
    return null;
  }
};

/**
 * POST /api/progress/update
 * 🔒 SECURE: Update video tracking progress for AI Mentor
 * 
 * SECURITY: user_id is extracted from JWT token (NOT from body!)
 * 
 * Body:
 * - lesson_id: number (required)
 * - video_id: string (Bunny video GUID)
 * - current_time: number (current position in seconds)
 * - percentage: number (0-100)
 * - duration: number (total video duration in seconds)
 * - watched_segments: array of [start, end] ranges
 * - total_play_time: number (real seconds spent watching)
 * - seek_forward_count: number
 * - seek_backward_count: number
 * - playback_speed_avg: number
 * - max_position_reached: number
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    // 🔒 SECURITY: Extract userId from Supabase JWT token
    const user_id = await extractUserFromToken(req);
    
    if (!user_id) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid or missing authentication token' 
      });
    }

    const { 
      lesson_id, 
      video_id,
      video_guid,
      current_time, 
      percentage, 
      duration,
      // Advanced Telemetry:
      watched_segments = [],
      total_play_time = 0,
      seek_forward_count = 0,
      seek_backward_count = 0,
      playback_speed_avg = 1.0,
      max_position_reached = 0,
    } = req.body;

    console.log('📊 [Progress] Telemetry update:', { 
      user_id: user_id.substring(0, 8) + '...', 
      lesson_id, 
      percentage: percentage + '%',
      total_play_time: total_play_time + 's',
      segments: watched_segments.length,
    });

    // Validation
    if (!lesson_id) {
      return res.status(400).json({ 
        error: 'Missing required field: lesson_id' 
      });
    }

    // 🔧 Parse numbers (remove any string suffixes like "s", "%")
    const parseNumber = (val: any): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        // Remove common suffixes: "s", "%", "px", etc.
        const cleaned = val.replace(/[^\d.-]/g, '');
        return parseFloat(cleaned) || 0;
      }
      return 0;
    };

    const currentTimeSeconds = Math.floor(parseNumber(current_time));
    const progressPercent = Math.min(Math.max(Math.floor(parseNumber(percentage)), 0), 100);
    const videoDurationSeconds = Math.floor(parseNumber(duration));
    const maxPositionSeconds = Math.floor(parseNumber(max_position_reached) || currentTimeSeconds);
    const totalPlayTimeSeconds = Math.floor(parseNumber(total_play_time));
    const seekForwardCount = Math.floor(parseNumber(seek_forward_count));
    const seekBackwardCount = Math.floor(parseNumber(seek_backward_count));
    const playbackSpeedAverage = parseNumber(playback_speed_avg) || 1.0;

    console.log('🔧 [DEBUG parseNumber]:', {
      raw_total_play_time: total_play_time,
      parsed_totalPlayTimeSeconds: totalPlayTimeSeconds,
      type_raw: typeof total_play_time,
      type_parsed: typeof totalPlayTimeSeconds
    });

    // Check if qualified for completion (80% threshold)
    const isQualifiedForCompletion = progressPercent >= 80;

    const upsertData = {
      user_id,
      lesson_id,
      video_id: video_id || null,
      video_guid: video_guid || null,
      video_version: 'v1',
      total_watch_time_seconds: totalPlayTimeSeconds,
      video_duration_seconds: videoDurationSeconds,
      watch_percentage: progressPercent,
      last_position_seconds: currentTimeSeconds,
      max_position_reached: maxPositionSeconds,
      watched_segments: watched_segments || [],
      total_play_time: totalPlayTimeSeconds,
      seek_forward_count: seekForwardCount,
      seek_backward_count: seekBackwardCount,
      playback_speed_avg: playbackSpeedAverage,
      is_qualified_for_completion: isQualifiedForCompletion,
      updated_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    };

    // 🚀 JSON PAYLOAD STRATEGY: Bypass JS/Postgres type mismatch
    const p_data = {
      user_id: user_id,
      lesson_id: lesson_id,
      video_id: video_id || null,
      play_time: totalPlayTimeSeconds,
      percentage: progressPercent,
      current_position: currentTimeSeconds,
      max_position: maxPositionSeconds,
      duration: videoDurationSeconds,
      segments: watched_segments || [],
      seek_forward: seekForwardCount,
      seek_backward: seekBackwardCount,
      playback_speed: playbackSpeedAverage
    };

    console.log('🚀 [RPC JSON PAYLOAD]:', JSON.stringify(p_data, null, 2));

    // 🔥 Use RPC function with JSONB p_data (renamed to avoid Supabase client destructuring)
    const { data, error } = await supabase
      .rpc('upsert_video_progress', { p_data });

    if (error) {
      console.error('❌ [Progress] Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to update progress', 
        details: error.message 
      });
    }

    console.log('✅ [Progress] Updated successfully:', data);

    // Also update student_progress table (for lesson completion tracking)
    const { error: progressError } = await supabase
      .from('student_progress')
      .upsert(
        {
          user_id,
          lesson_id,
          video_progress_percent: progressPercent,
          last_position_seconds: currentTimeSeconds,
          watch_time_seconds: totalPlayTimeSeconds,  // ✅ Use parsed value!
          is_started: true,
          is_completed: isQualifiedForCompletion, // Auto-complete at 80%
          completed_at: isQualifiedForCompletion ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,lesson_id',
          ignoreDuplicates: false,
        }
      );

    if (progressError) {
      console.warn('⚠️ [Progress] Could not update student_progress:', progressError.message);
      // Don't fail the request, video_tracking is the primary table
    }

    res.json({ 
      success: true, 
      message: 'Progress updated',
      progress: {
        percentage: progressPercent,
        qualified_for_completion: isQualifiedForCompletion,
      }
    });
  } catch (error: any) {
    console.error('❌ [Progress] Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

/**
 * GET /api/progress/:lessonId
 * 🔒 SECURE: Get current progress for authenticated user and lesson
 * userId is extracted from JWT token (NOT from URL!)
 */
router.get('/:lessonId', async (req: Request, res: Response) => {
  try {
    // 🔒 SECURITY: Extract userId from Supabase JWT token
    const user_id = await extractUserFromToken(req);
    
    if (!user_id) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid or missing authentication token' 
      });
    }

    const { lessonId } = req.params;

    console.log('📊 [Progress] Get request:', { userId: user_id.substring(0, 8) + '...', lessonId });

    // Get from video_tracking
    const { data, error } = await supabase
      .from('video_tracking')
      .select('*')
      .eq('user_id', user_id)
      .eq('lesson_id', lessonId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ [Progress] Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to get progress', 
        details: error.message 
      });
    }

    // If no progress found, return default
    if (!data) {
      return res.json({
        progress: 0,
        last_position: 0,
        qualified_for_completion: false,
        exists: false,
      });
    }

    res.json({
      progress: data.watch_percentage || 0,
      last_position: data.last_position_seconds || 0,
      qualified_for_completion: data.is_qualified_for_completion || false,
      attention_score: data.attention_score || 0,
      exists: true,
    });
  } catch (error: any) {
    console.error('❌ [Progress] Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

export default router;

