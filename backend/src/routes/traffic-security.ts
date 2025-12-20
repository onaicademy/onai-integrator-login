/**
 * Traffic Security Routes
 * API endpoints для отслеживания безопасности пользователей
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase.js';
import { parseUserAgent, generateDeviceFingerprint } from '../utils/deviceParser.js';

const router = Router();

/**
 * Middleware для логирования входа пользователя
 * Вызывается после успешной авторизации
 */
export async function logUserSession(req: Request, userId: string, user: any) {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Парсинг устройства и браузера
    const deviceInfo = parseUserAgent(userAgent);
    
    // Device fingerprint
    const fingerprint = generateDeviceFingerprint(
      userAgent,
      String(ip),
      {
        screenResolution: req.body.screenResolution,
        timezone: req.body.timezone,
        language: req.body.language || req.headers['accept-language']
      }
    );
    
    // Сохранение в БД
    const { data, error } = await trafficAdminSupabase
      .from('traffic_user_sessions')
      .insert({
        user_id: userId,
        email: user.email,
        team_name: user.team,
        role: user.role,
        ip_address: String(ip),
        user_agent: userAgent,
        device_type: deviceInfo.deviceType,
        browser_name: deviceInfo.browserName,
        browser_version: deviceInfo.browserVersion,
        os_name: deviceInfo.osName,
        os_version: deviceInfo.osVersion,
        device_fingerprint: fingerprint,
        screen_resolution: req.body.screenResolution,
        timezone: req.body.timezone,
        language: req.body.language || req.headers['accept-language']
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to log session:', error);
    } else {
      console.log(`✅ Session logged for ${user.email} from IP ${ip}`);
      
      // Проверка на подозрительную активность
      await checkSuspiciousActivity(userId, user.email);
    }
  } catch (error) {
    console.error('❌ Error logging session:', error);
  }
}

/**
 * Проверка подозрительной активности
 * Если за последние 24 часа более 3 разных IP - пометить как подозрительное
 */
async function checkSuspiciousActivity(userId: string, email: string) {
  try {
    const { data: recentSessions } = await trafficAdminSupabase
      .from('traffic_user_sessions')
      .select('ip_address, device_fingerprint')
      .eq('user_id', userId)
      .gte('login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('login_at', { ascending: false });
    
    if (!recentSessions || recentSessions.length === 0) return;
    
    const uniqueIPs = new Set(recentSessions.map(s => s.ip_address));
    const uniqueDevices = new Set(recentSessions.map(s => s.device_fingerprint));
    
    // Подозрительно если:
    // - Более 3 разных IP за 24 часа
    // - Более 5 разных устройств за 24 часа
    const isSuspicious = uniqueIPs.size > 3 || uniqueDevices.size > 5;
    
    if (isSuspicious) {
      const reason = `${uniqueIPs.size} разных IP и ${uniqueDevices.size} разных устройств за 24 часа`;
      
      // Обновить флаг подозрительности для последних сессий
      await trafficAdminSupabase
        .from('traffic_user_sessions')
        .update({
          is_suspicious: true,
          suspicious_reason: reason
        })
        .eq('user_id', userId)
        .gte('login_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      console.warn(`⚠️  SUSPICIOUS ACTIVITY: ${email} - ${reason}`);
    }
  } catch (error) {
    console.error('❌ Error checking suspicious activity:', error);
  }
}

/**
 * GET /api/traffic-security/sessions/:userId
 * Получить историю входов пользователя (ADMIN ONLY)
 */
router.get('/sessions/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // TODO: Add auth middleware to check if user is admin
    
    const { data: sessions, error } = await trafficAdminSupabase
      .from('traffic_user_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    res.json({
      success: true,
      sessions
    });
  } catch (error: any) {
    console.error('❌ Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-security/all-sessions
 * Получить историю всех пользователей (ADMIN ONLY)
 */
router.get('/all-sessions', async (req: Request, res: Response) => {
  try {
    const { days = 7, suspicious = false } = req.query;
    
    let query = trafficAdminSupabase
      .from('traffic_user_sessions')
      .select('*')
      .gte('login_at', new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString())
      .order('login_at', { ascending: false });
    
    if (suspicious === 'true') {
      query = query.eq('is_suspicious', true);
    }
    
    const { data: sessions, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      sessions
    });
  } catch (error: any) {
    console.error('❌ Error fetching all sessions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-security/suspicious
 * Получить список пользователей с подозрительной активностью (ADMIN ONLY)
 */
router.get('/suspicious', async (req: Request, res: Response) => {
  try {
    const { data: suspicious, error } = await trafficAdminSupabase
      .from('traffic_suspicious_activity')
      .select('*')
      .order('unique_ips', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      success: true,
      suspicious
    });
  } catch (error: any) {
    console.error('❌ Error fetching suspicious users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-security/user-summary/:email
 * Получить сводку по пользователю (ADMIN ONLY)
 */
router.get('/user-summary/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const { days = 30 } = req.query;
    
    const { data: sessions, error } = await trafficAdminSupabase
      .from('traffic_user_sessions')
      .select('*')
      .eq('email', email)
      .gte('login_at', new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString())
      .order('login_at', { ascending: false });
    
    if (error) throw error;
    
    // Аналитика
    const uniqueIPs = new Set(sessions?.map(s => s.ip_address) || []);
    const uniqueDevices = new Set(sessions?.map(s => s.device_fingerprint) || []);
    const suspiciousCount = sessions?.filter(s => s.is_suspicious).length || 0;
    
    const ipChanges = [];
    for (let i = 1; i < (sessions?.length || 0); i++) {
      if (sessions![i].ip_address !== sessions![i - 1].ip_address) {
        ipChanges.push({
          from: sessions![i].ip_address,
          to: sessions![i - 1].ip_address,
          timestamp: sessions![i - 1].login_at
        });
      }
    }
    
    res.json({
      success: true,
      summary: {
        email,
        totalLogins: sessions?.length || 0,
        uniqueIPs: uniqueIPs.size,
        uniqueDevices: uniqueDevices.size,
        suspiciousCount,
        lastLogin: sessions?.[0]?.login_at,
        ipChanges: ipChanges.slice(0, 10), // последние 10 смен IP
        allIPs: Array.from(uniqueIPs),
        recentSessions: sessions?.slice(0, 20)
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching user summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
