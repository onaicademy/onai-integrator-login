/**
 * Traffic Onboarding API
 * 
 * Управление прогрессом обучения пользователей
 */

import { Router, Request, Response } from 'express';
import { tripwireAdminSupabase } from '../config/supabase-tripwire.js';

const router = Router();

/**
 * GET /api/traffic-onboarding/status/:userId
 * Получить статус обучения пользователя
 */
router.get('/status/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Получить прогресс из БД
    const { data: progress, error } = await tripwireAdminSupabase
      .from('traffic_onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      throw error;
    }

    // Если записи нет - это первый вход
    const isFirstLogin = !progress;
    const isCompleted = progress?.is_completed || false;

    res.json({
      success: true,
      is_first_login: isFirstLogin,
      is_completed: isCompleted,
      progress: progress || null
    });

  } catch (error: any) {
    console.error('❌ Error fetching onboarding status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-onboarding/start
 * Начать обучение
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { user_id, tour_type } = req.body;

    if (!user_id || !tour_type) {
      return res.status(400).json({
        success: false,
        error: 'user_id and tour_type are required'
      });
    }

    // Создать или обновить запись
    const { data, error } = await tripwireAdminSupabase
      .from('traffic_onboarding_progress')
      .upsert({
        user_id,
        tour_type,
        is_completed: false,
        current_step: 0,
        started_at: new Date().toISOString(),
        last_step_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Onboarding started for user ${user_id} (${tour_type})`);

    res.json({
      success: true,
      progress: data
    });

  } catch (error: any) {
    console.error('❌ Error starting onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-onboarding/progress
 * Обновить прогресс обучения
 */
router.post('/progress', async (req: Request, res: Response) => {
  try {
    const { user_id, current_step, is_completed, tour_type } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const updateData: any = {
      last_step_at: new Date().toISOString()
    };

    if (current_step !== undefined) {
      updateData.current_step = current_step;
    }

    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      if (is_completed) {
        updateData.completed_at = new Date().toISOString();
      }
    }

    // Обновить прогресс
    const { data, error } = await tripwireAdminSupabase
      .from('traffic_onboarding_progress')
      .update(updateData)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      // Если записи нет - создать
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await tripwireAdminSupabase
          .from('traffic_onboarding_progress')
          .insert({
            user_id,
            tour_type: tour_type || 'targetologist',
            ...updateData
          })
          .select()
          .single();

        if (insertError) throw insertError;

        return res.json({
          success: true,
          progress: newData
        });
      }
      throw error;
    }

    res.json({
      success: true,
      progress: data
    });

  } catch (error: any) {
    console.error('❌ Error updating onboarding progress:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-onboarding/skip
 * Пропустить обучение
 */
router.post('/skip', async (req: Request, res: Response) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Увеличить счетчик пропусков
    const { data, error } = await tripwireAdminSupabase
      .from('traffic_onboarding_progress')
      .update({
        skip_count: tripwireAdminSupabase.rpc('increment', { x: 1 }),
        is_completed: true, // Считаем что пропуск = завершение
        completed_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;

    console.log(`⏭️ Onboarding skipped by user ${user_id}`);

    res.json({
      success: true,
      progress: data
    });

  } catch (error: any) {
    console.error('❌ Error skipping onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-onboarding/restart
 * Перезапустить обучение
 */
router.post('/restart', async (req: Request, res: Response) => {
  try {
    const { user_id, tour_type } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Сбросить прогресс
    const { data, error } = await tripwireAdminSupabase
      .from('traffic_onboarding_progress')
      .update({
        is_completed: false,
        current_step: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
        view_count: tripwireAdminSupabase.rpc('increment', { x: 1 })
      })
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) throw error;

    console.log(`🔄 Onboarding restarted for user ${user_id}`);

    res.json({
      success: true,
      progress: data
    });

  } catch (error: any) {
    console.error('❌ Error restarting onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-onboarding/stats
 * Статистика обучения (для админа)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { data, error } = await tripwireAdminSupabase
      .from('onboarding_stats')
      .select('*');

    if (error) throw error;

    res.json({
      success: true,
      stats: data
    });

  } catch (error: any) {
    console.error('❌ Error fetching onboarding stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
