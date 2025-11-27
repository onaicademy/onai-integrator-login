import { Router } from 'express';
import { adminSupabase } from '../config/supabase';

const router = Router();

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

export default router;

