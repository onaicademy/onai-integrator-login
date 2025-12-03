import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import { adminSupabase } from '../config/supabase';
import crypto from 'crypto';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 🚫 BUNNY STORAGE УДАЛЁН
// Видео теперь загружаются через Bunny Stream API в /api/stream/upload
// Старые функции uploadToBunny и deleteFromBunny больше не используются

// GET /api/tripwire/lessons - Get all lessons for a module
router.get('/lessons', async (req, res) => {
  try {
    const { module_id } = req.query;

    if (!module_id) {
      return res.status(400).json({ error: 'module_id is required' });
    }

    const { data: lessons, error } = await adminSupabase
      .from('lessons')
      .select('*')
      .eq('module_id', module_id)
      .eq('is_archived', false)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('❌ Error fetching lessons:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ lessons });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/lessons/:id - Get single lesson
router.get('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .eq('is_archived', false)
      .single();

    if (error) {
      console.error('❌ Error fetching lesson:', error);
      return res.status(404).json({ error: 'Lesson not found' });
    }

    res.json({ lesson });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/videos/:lessonId - Get video for lesson
router.get('/videos/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const { data: video, error } = await adminSupabase
      .from('video_content')
      .select('*')
      .eq('lesson_id', lessonId)
      .single();

    if (error) {
      console.error('❌ Error fetching video:', error);
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({ video });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/materials/:lessonId - Get materials for lesson
router.get('/materials/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;

    const { data: materials, error } = await adminSupabase
      .from('lesson_materials')
      .select('*')
      .eq('lesson_id', lessonId);

    if (error) {
      console.error('❌ Error fetching materials:', error);
      return res.status(500).json({ error: error.message });
    }

    // Generate public URLs for each material
    const materialsWithUrls = materials.map((material: any) => {
      const { data } = adminSupabase.storage
        .from(material.bucket_name)
        .getPublicUrl(material.storage_path);

      return {
        ...material,
        file_url: data.publicUrl
      };
    });

    res.json({ materials: materialsWithUrls });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/progress/:lessonId - Get progress for lesson
router.get('/progress/:lessonId', async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { tripwire_user_id } = req.query;
    
    if (!tripwire_user_id) {
      return res.json({ isCompleted: false });
    }

    const { data: progress, error } = await adminSupabase
      .from('tripwire_progress')
      .select('*')
      .eq('tripwire_user_id', tripwire_user_id)
      .eq('lesson_id', lessonId)
      .single();

    if (error || !progress) {
      return res.json({ isCompleted: false });
    }

    res.json({ 
      isCompleted: progress.is_completed,
      progress 
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tripwire/complete - Mark lesson as complete
router.post('/complete', async (req, res) => {
  try {
    const { lesson_id, tripwire_user_id } = req.body;

    if (!lesson_id) {
      return res.status(400).json({ error: 'lesson_id is required' });
    }

    if (!tripwire_user_id) {
      return res.status(400).json({ error: 'tripwire_user_id is required' });
    }

    // Upsert progress
    const { data, error } = await adminSupabase
      .from('tripwire_progress')
      .upsert({
        tripwire_user_id,
        lesson_id,
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tripwire_user_id,lesson_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving progress:', error);
      return res.status(500).json({ error: error.message });
    }

    // 🎯 ARCHITECT SOLUTION #1: Check if course is completed after marking lesson
    const { checkTripwireCompletion } = require('../services/tripwireCompletionService');
    checkTripwireCompletion(tripwire_user_id).catch((err: any) => {
      console.error('❌ Error checking completion:', err);
    });

    res.json({ success: true, message: 'Lesson marked as complete', progress: data });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tripwire/progress - Update video progress
router.post('/progress', async (req, res) => {
  try {
    const { lesson_id, tripwire_user_id, video_progress_percent, last_position_seconds, watch_time_seconds } = req.body;

    if (!lesson_id || !tripwire_user_id) {
      return res.status(400).json({ error: 'lesson_id and tripwire_user_id are required' });
    }

    const { data, error } = await adminSupabase
      .from('tripwire_progress')
      .upsert({
        tripwire_user_id,
        lesson_id,
        video_progress_percent: video_progress_percent || 0,
        last_position_seconds: last_position_seconds || 0,
        watch_time_seconds: watch_time_seconds || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'tripwire_user_id,lesson_id'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving progress:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, progress: data });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tripwire/module-progress/:moduleId - Check if all lessons in module are completed
router.get('/module-progress/:moduleId', async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { tripwire_user_id } = req.query;

    if (!tripwire_user_id) {
      return res.status(400).json({ error: 'tripwire_user_id is required' });
    }

    // Get all lessons in this module
    const { data: lessons, error: lessonsError } = await adminSupabase
      .from('lessons')
      .select('id')
      .eq('module_id', moduleId)
      .eq('is_archived', false);

    if (lessonsError || !lessons) {
      console.error('❌ Error fetching lessons:', lessonsError);
      return res.status(500).json({ error: 'Failed to fetch lessons' });
    }

    if (lessons.length === 0) {
      return res.json({ all_lessons_completed: false, total: 0, completed: 0 });
    }

    // Get progress for all lessons
    const lessonIds = lessons.map(l => l.id);
    const { data: progress, error: progressError } = await adminSupabase
      .from('tripwire_progress')
      .select('lesson_id, is_completed')
      .eq('tripwire_user_id', tripwire_user_id)
      .in('lesson_id', lessonIds);

    if (progressError) {
      console.error('❌ Error fetching progress:', progressError);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    const completedLessons = progress?.filter(p => p.is_completed) || [];
    const all_lessons_completed = completedLessons.length === lessons.length;

    res.json({ 
      all_lessons_completed,
      total: lessons.length,
      completed: completedLessons.length
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tripwire/unlock-achievement - Unlock achievement for completing module
router.post('/unlock-achievement', async (req, res) => {
  try {
    const { module_number } = req.body;
    
    // Get user ID from auth header (Supabase JWT)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (!module_number || module_number < 1 || module_number > 3) {
      return res.status(400).json({ error: 'module_number must be 1, 2, or 3' });
    }

    // Call database function to unlock achievement
    const { data: result, error } = await adminSupabase.rpc('unlock_tripwire_achievement', {
      p_user_id: user.id,
      p_module_number: module_number
    });

    if (error) {
      console.error('❌ Error unlocking achievement:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Achievement unlocked for user ${user.id}, module ${module_number}`);
    res.json(result);
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// CRUD ENDPOINTS FOR TRIPWIRE LESSONS
// ========================================

// POST /api/tripwire/lessons - Create new lesson
router.post('/lessons', async (req, res) => {
  try {
    const { title, description, tip, module_id } = req.body;

    if (!title || !module_id) {
      return res.status(400).json({ error: 'title and module_id are required' });
    }

    // Get max order_index for this module
    const { data: existingLessons } = await adminSupabase
      .from('lessons')
      .select('order_index')
      .eq('module_id', module_id)
      .order('order_index', { ascending: false })
      .limit(1);

    const maxOrderIndex = existingLessons && existingLessons.length > 0 
      ? existingLessons[0].order_index 
      : 0;

    // Create lesson
    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .insert({
        title,
        description: description || '',
        tip: tip || '',
        module_id: parseInt(module_id),
        order_index: maxOrderIndex + 1,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Lesson created:', lesson.id);
    res.json({ lesson });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tripwire/lessons/:id - Update lesson
router.put('/lessons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, tip } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    console.log(`📝 [TRIPWIRE UPDATE LESSON ${id}] Updating with:`, {
      title,
      description_length: description?.length || 0,
      tip_length: tip?.length || 0
    });

    const { data: lesson, error } = await adminSupabase
      .from('lessons')
      .update({
        title,
        description: description || '',
        tip: tip || '',
        ai_description: description || '', // ✅ КРИТИЧНО: Синхронизация
        ai_tips: tip || '', // ✅ КРИТИЧНО: Синхронизация
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ [TRIPWIRE UPDATE LESSON ${id}] Successfully updated`);
    res.json({ lesson });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🚫 СТАРЫЕ РОУТЫ BUNNY STORAGE УДАЛЕНЫ
// Видео теперь загружаются через /api/stream/upload (Bunny Stream HLS)
// Для удаления видео используется DELETE /api/stream/video/:videoId

// POST /api/tripwire/materials/upload - Upload material
router.post('/materials/upload', upload.single('file'), async (req, res) => {
  try {
    const { lessonId, display_name } = req.body;

    if (!req.file || !lessonId) {
      return res.status(400).json({ error: 'file and lessonId are required' });
    }

    console.log('📚 Uploading material for Tripwire lesson:', lessonId);

    // Upload to Supabase Storage
    const fileExtension = req.file.originalname.split('.').pop() || 'pdf';
    const uniqueFilename = `tripwire-lesson-${lessonId}-${crypto.randomBytes(8).toString('hex')}.${fileExtension}`;

    const { error: uploadError } = await adminSupabase.storage
      .from('lesson-materials')
      .upload(uniqueFilename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error uploading to Supabase Storage:', uploadError);
      return res.status(500).json({ error: uploadError.message });
    }

    // Get public URL
    const { data: publicUrlData } = adminSupabase.storage
      .from('lesson-materials')
      .getPublicUrl(uniqueFilename);

    const publicUrl = publicUrlData.publicUrl;
    console.log('✅ Material uploaded to Supabase Storage:', publicUrl);

    // Insert material record
    const { data: material, error } = await adminSupabase
      .from('lesson_materials')
      .insert({
        lesson_id: parseInt(lessonId),
        display_name: display_name || req.file.originalname,
        filename: req.file.originalname,
        file_type: req.file.mimetype,                    // ✅ FIXED: Added file_type
        file_size_bytes: req.file.size,                  // ✅ FIXED: Was file_size, now file_size_bytes
        bucket_name: 'lesson-materials',
        storage_path: uniqueFilename,
        is_downloadable: true,
        requires_completion: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving material to DB:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ material: { ...material, file_url: publicUrl } });
  } catch (error: any) {
    console.error('❌ Error uploading material:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tripwire/materials/:id - Delete material
router.delete('/materials/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get material record
    const { data: material } = await adminSupabase
      .from('lesson_materials')
      .select('storage_path, bucket_name')
      .eq('id', id)
      .single();

    if (material?.storage_path) {
      // Delete from Supabase Storage
      await adminSupabase.storage
        .from(material.bucket_name || 'lesson-materials')
        .remove([material.storage_path]);

      console.log('✅ Material deleted from Supabase Storage:', material.storage_path);
    }

    // Delete from DB
    await adminSupabase
      .from('lesson_materials')
      .delete()
      .eq('id', id);

    console.log('✅ Material record deleted from DB');
    res.json({ success: true, message: 'Material deleted' });
  } catch (error: any) {
    console.error('❌ Error deleting material:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

