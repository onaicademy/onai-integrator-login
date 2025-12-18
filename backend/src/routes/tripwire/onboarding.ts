/**
 * 🎯 TRIPWIRE ONBOARDING API
 * 
 * API endpoints для управления onboarding состоянием.
 */

import express from 'express';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire.js';

const router = express.Router();

/**
 * POST /api/tripwire/onboarding/complete
 * 
 * Отмечает onboarding как завершенный для текущего пользователя.
 * Требует аутентификацию через JWT token.
 */
router.post('/complete', async (req, res) => {
  try {
    console.log('🎯 [Onboarding] Complete request received');
    
    // Получаем user_id из JWT токена
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [Onboarding] No authorization header');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Верифицируем токен через Supabase
    const { data: { user }, error: authError } = await tripwireAdminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ [Onboarding] Invalid token:', authError);
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    console.log('✅ [Onboarding] User authenticated:', user.email);
    
    // Обновляем флаг onboarding_completed в tripwire_users
    const { error: updateError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('email', user.email);
    
    if (updateError) {
      console.error('❌ [Onboarding] Update failed:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update onboarding status',
        details: updateError.message,
      });
    }
    
    console.log('🎉 [Onboarding] Completed for user:', user.email);
    
    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      completed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [Onboarding] Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
});

/**
 * GET /api/tripwire/onboarding/status
 * 
 * Получить текущий статус onboarding для пользователя.
 */
router.get('/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Верифицируем токен
    const { data: { user }, error: authError } = await tripwireAdminSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
    
    // Получаем статус onboarding
    const { data: userData, error: fetchError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .select('onboarding_completed, onboarding_completed_at')
      .eq('email', user.email)
      .single();
    
    if (fetchError) {
      console.error('❌ [Onboarding] Fetch status failed:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch onboarding status',
      });
    }
    
    return res.status(200).json({
      success: true,
      onboarding_completed: userData?.onboarding_completed || false,
      onboarding_completed_at: userData?.onboarding_completed_at || null,
    });
  } catch (error: any) {
    console.error('❌ [Onboarding] Status fetch error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
