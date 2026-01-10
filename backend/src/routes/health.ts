import { Router, Request, Response } from 'express';
import { tripwireSupabase } from '../config/supabase-tripwire.js';
import { createClient } from '@supabase/supabase-js';

const router = Router();

/**
 * GET /api/health
 * Общий health check для всех сервисов
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {}
    };

    // Check Tripwire DB
    try {
      const { data, error } = await tripwireSupabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      health.services.tripwire_db = data ? 'healthy' : 'degraded';
    } catch (e: any) {
      console.error('❌ Tripwire DB health check failed:', e.message);
      health.services.tripwire_db = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Traffic DB (Supabase REST API)
    try {
      const trafficUrl = process.env.TRAFFIC_SUPABASE_URL;
      const trafficKey = process.env.TRAFFIC_SERVICE_ROLE_KEY;
      if (!trafficUrl || !trafficKey) {
        throw new Error('Traffic Supabase not configured');
      }
      const trafficSupabase = createClient(trafficUrl, trafficKey);
      const { error } = await trafficSupabase.from('traffic_users').select('id').limit(1);
      if (error) throw error;
      health.services.traffic_db = 'healthy';
    } catch (e: unknown) {
      const err = e as Error;
      console.error('Traffic DB health check failed:', err.message);
      health.services.traffic_db = 'unhealthy';
      health.status = 'degraded';
    }

    // Check OpenAI API Key
    health.services.openai = process.env.OPENAI_API_KEY ? 'configured' : 'missing';
    if (!process.env.OPENAI_API_KEY) {
      health.status = 'degraded';
    }

    // Check AmoCRM
    health.services.amocrm = {
      domain: process.env.AMOCRM_DOMAIN ? 'configured' : 'missing',
      token: process.env.AMOCRM_ACCESS_TOKEN ? 'configured' : 'missing'
    };

    // Check Facebook Token
    health.services.facebook = process.env.FACEBOOK_PERMANENT_TOKEN ? 'configured' : 'missing';

    // Response status code
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/tripwire
 * Tripwire-specific detailed checks
 */
router.get('/tripwire', async (req: Request, res: Response) => {
  const checks: any = {
    db: false,
    auth: false,
    video_tracking: false,
    ai_mentor: false,
    achievements: false
  };

  try {
    // DB check
    const { data: users, error: usersError } = await tripwireSupabase
      .from('users')
      .select('id')
      .limit(1);
    checks.db = !usersError && !!users;

    // Auth check (JWT secret exists)
    checks.auth = !!process.env.JWT_SECRET;

    // Video tracking
    checks.video_tracking = true; // Always enabled

    // AI Mentor (OpenAI key)
    checks.ai_mentor = !!process.env.OPENAI_API_KEY;

    // Achievements (table exists)
    const { data: achievements, error: achievementsError } = await tripwireSupabase
      .from('achievements')
      .select('id')
      .limit(1);
    checks.achievements = !achievementsError;

    const allHealthy = Object.values(checks).every(v => v === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      product: 'tripwire',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Tripwire health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      product: 'tripwire',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/traffic
 * Traffic Dashboard specific checks
 */
router.get('/traffic', async (req: Request, res: Response) => {
  const checks: any = {
    db: false,
    fb_integration: false,
    amocrm_domain: false,
    amocrm_token: false,
    analytics: false
  };

  try {
    // Traffic DB (Supabase REST API)
    const trafficUrl = process.env.TRAFFIC_SUPABASE_URL;
    const trafficKey = process.env.TRAFFIC_SERVICE_ROLE_KEY;
    if (trafficUrl && trafficKey) {
      const trafficSupabase = createClient(trafficUrl, trafficKey);
      const { error } = await trafficSupabase.from('traffic_users').select('id').limit(1);
      checks.db = !error;
    }

    // FB Token
    checks.fb_integration = !!process.env.FACEBOOK_PERMANENT_TOKEN;

    // AmoCRM
    checks.amocrm_domain = !!process.env.AMOCRM_DOMAIN;
    checks.amocrm_token = !!process.env.AMOCRM_ACCESS_TOKEN;

    // Analytics endpoint
    checks.analytics = true; // Assume healthy if code reaches here

    const allHealthy = Object.values(checks).every(v => v === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      product: 'traffic',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Traffic health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      product: 'traffic',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/referral
 * Referral system checks
 */
router.get('/referral', async (req: Request, res: Response) => {
  const checks: any = {
    service: false,
    db: false,
    link_generation: false,
    tracking: false
  };

  try {
    // Check if referral service file exists
    checks.service = true; // File exists if this route is loaded
    
    // Check DB (assume referral uses Tripwire DB for now)
    const { data, error } = await tripwireSupabase
      .from('users')
      .select('id')
      .limit(1);
    checks.db = !error && !!data;

    // Link generation logic exists
    checks.link_generation = true; // TODO: Add actual check

    // Tracking logic exists
    checks.tracking = true; // TODO: Add actual check

    const allHealthy = Object.values(checks).every(v => v === true);
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      product: 'referral',
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Referral health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      product: 'referral',
      checks,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/ping
 * Simple ping-pong для быстрой проверки
 */
router.get('/ping', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'pong',
    timestamp: new Date().toISOString()
  });
});

export default router;
