/**
 * 🏥 Extended Health & Status Endpoints
 * БЕЗОПАСНЫЙ МОДУЛЬ - только READ-ONLY операции
 * 
 * Не модифицирует никакой бизнес-логики!
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { getAmoCRMRedisStatus, getAmoCRMRedis } from '../config/redis.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// 📊 КРИТИЧЕСКИЕ СЦЕНАРИИ - СТАТУС ENDPOINTS
// ═══════════════════════════════════════════════════════════════

interface ServiceStatus {
  name: string;
  status: 'ok' | 'degraded' | 'down';
  latency_ms?: number;
  error?: string;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime_seconds: number;
  services: ServiceStatus[];
  checks: {
    auth: boolean;
    tripwire: boolean;
    referral: boolean;
    amocrm_webhook: boolean;
    landing: boolean;
  };
}

// Server start time for uptime calculation
const SERVER_START = Date.now();

/**
 * GET /api/monitoring/health
 * Расширенная проверка здоровья всей системы
 */
router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const services: ServiceStatus[] = [];
  
  try {
    // 1. Check Main Supabase (Main Platform)
    const mainDbStart = Date.now();
    try {
      const mainSupabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await mainSupabase.from('profiles').select('id').limit(1);
      services.push({
        name: 'supabase_main',
        status: 'ok',
        latency_ms: Date.now() - mainDbStart
      });
    } catch (err: any) {
      services.push({
        name: 'supabase_main',
        status: 'down',
        error: err.message
      });
    }

    // 2. Check Tripwire Supabase
    const tripwireDbStart = Date.now();
    try {
      const tripwireSupabase = createClient(
        process.env.SUPABASE_TRIPWIRE_URL!,
        process.env.SUPABASE_TRIPWIRE_SERVICE_KEY!
      );
      await tripwireSupabase.from('tripwire_users').select('id').limit(1);
      services.push({
        name: 'supabase_tripwire',
        status: 'ok',
        latency_ms: Date.now() - tripwireDbStart
      });
    } catch (err: any) {
      services.push({
        name: 'supabase_tripwire',
        status: 'down',
        error: err.message
      });
    }

    // 3. Check LeadLand Supabase (Referral)
    const leadlandDbStart = Date.now();
    try {
      const leadlandSupabase = createClient(
        process.env.LEADLAND_SUPABASE_URL!,
        process.env.LEADLAND_SUPABASE_SERVICE_KEY!
      );
      await leadlandSupabase.from('referrers').select('id').limit(1);
      services.push({
        name: 'supabase_leadland',
        status: 'ok',
        latency_ms: Date.now() - leadlandDbStart
      });
    } catch (err: any) {
      services.push({
        name: 'supabase_leadland',
        status: 'down',
        error: err.message
      });
    }

    // 4. Check Redis
    const redisStart = Date.now();
    try {
      const redisClient = getAmoCRMRedis();
      const redisStatus = getAmoCRMRedisStatus();
      
      if (redisClient && redisStatus.connected) {
        await redisClient.ping();
        services.push({
          name: 'redis',
          status: 'ok',
          latency_ms: Date.now() - redisStart
        });
      } else {
        services.push({
          name: 'redis',
          status: 'degraded',
          error: 'Redis not connected (non-critical)'
        });
      }
    } catch (err: any) {
      services.push({
        name: 'redis',
        status: 'degraded',
        error: 'Redis unavailable (non-critical)'
      });
    }

    // Calculate overall health
    const downServices = services.filter(s => s.status === 'down');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (downServices.length > 0) {
      overall = downServices.length >= 2 ? 'critical' : 'degraded';
    } else if (degradedServices.length > 0) {
      overall = 'degraded';
    }

    // Check critical scenarios
    const checks = {
      auth: services.find(s => s.name === 'supabase_main')?.status === 'ok',
      tripwire: services.find(s => s.name === 'supabase_tripwire')?.status === 'ok',
      referral: services.find(s => s.name === 'supabase_leadland')?.status === 'ok',
      amocrm_webhook: services.find(s => s.name === 'supabase_tripwire')?.status === 'ok',
      landing: services.find(s => s.name === 'supabase_leadland')?.status === 'ok',
    };

    const health: SystemHealth = {
      overall,
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - SERVER_START) / 1000),
      services,
      checks,
    };

    const statusCode = overall === 'critical' ? 503 : overall === 'degraded' ? 200 : 200;
    res.status(statusCode).json(health);

  } catch (error: any) {
    res.status(500).json({
      overall: 'critical',
      timestamp: new Date().toISOString(),
      error: error.message,
      services,
    });
  }
});

/**
 * GET /api/monitoring/scenario/:name
 * Проверка конкретного критического сценария
 */
router.get('/scenario/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  
  const scenarios: Record<string, () => Promise<{ ok: boolean; details: any }>> = {
    // 1. Авторизация
    'auth': async () => {
      try {
        const mainSupabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data, error } = await mainSupabase.auth.getSession();
        return { ok: !error, details: { session_check: 'passed' } };
      } catch (err: any) {
        return { ok: false, details: { error: err.message } };
      }
    },
    
    // 2. Tripwire (обучение студентов)
    'tripwire': async () => {
      try {
        const tripwireSupabase = createClient(
          process.env.SUPABASE_TRIPWIRE_URL!,
          process.env.SUPABASE_TRIPWIRE_SERVICE_KEY!
        );
        const { count, error } = await tripwireSupabase
          .from('tripwire_users')
          .select('*', { count: 'exact', head: true });
        return { ok: !error, details: { total_students: count } };
      } catch (err: any) {
        return { ok: false, details: { error: err.message } };
      }
    },
    
    // 3. Referral System
    'referral': async () => {
      try {
        const leadlandSupabase = createClient(
          process.env.LEADLAND_SUPABASE_URL!,
          process.env.LEADLAND_SUPABASE_SERVICE_KEY!
        );
        const { count, error } = await leadlandSupabase
          .from('referrers')
          .select('*', { count: 'exact', head: true });
        return { ok: !error, details: { total_referrers: count } };
      } catch (err: any) {
        return { ok: false, details: { error: err.message } };
      }
    },
    
    // 4. Landing (заявки)
    'landing': async () => {
      try {
        const leadlandSupabase = createClient(
          process.env.LEADLAND_SUPABASE_URL!,
          process.env.LEADLAND_SUPABASE_SERVICE_KEY!
        );
        const { count, error } = await leadlandSupabase
          .from('landing_leads')
          .select('*', { count: 'exact', head: true });
        return { ok: !error, details: { total_leads: count } };
      } catch (err: any) {
        return { ok: false, details: { error: err.message } };
      }
    },
    
    // 5. AmoCRM Webhook (логи)
    'amocrm': async () => {
      try {
        const tripwireSupabase = createClient(
          process.env.SUPABASE_TRIPWIRE_URL!,
          process.env.SUPABASE_TRIPWIRE_SERVICE_KEY!
        );
        const { data, error } = await tripwireSupabase
          .from('webhook_logs')
          .select('id, received_at, processing_status')
          .order('received_at', { ascending: false })
          .limit(5);
        
        const recentErrors = data?.filter(d => d.processing_status === 'error').length || 0;
        return { 
          ok: !error && recentErrors === 0, 
          details: { 
            recent_webhooks: data?.length || 0,
            recent_errors: recentErrors 
          } 
        };
      } catch (err: any) {
        return { ok: false, details: { error: err.message } };
      }
    },
  };

  const scenarioFn = scenarios[name];
  if (!scenarioFn) {
    return res.status(404).json({
      error: 'Scenario not found',
      available: Object.keys(scenarios),
    });
  }

  const result = await scenarioFn();
  res.json({
    scenario: name,
    timestamp: new Date().toISOString(),
    ...result,
  });
});

/**
 * GET /api/monitoring/ready
 * Kubernetes-style readiness probe
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Quick check - just verify main DB is accessible
    const mainSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await mainSupabase.from('profiles').select('id').limit(1);
    
    res.json({ ready: true });
  } catch (err) {
    res.status(503).json({ ready: false });
  }
});

/**
 * GET /api/monitoring/live
 * Kubernetes-style liveness probe
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({ 
    alive: true, 
    uptime: Math.floor((Date.now() - SERVER_START) / 1000) 
  });
});

export default router;
