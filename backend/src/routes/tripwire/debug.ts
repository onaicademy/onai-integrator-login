import { Router } from 'express';
import { authenticateTripwireJWT, requireTripwireSalesOrAdmin } from '../../middleware/tripwire-auth';
import { getDebugStats, getErrorLogs, getAllLogs } from '../../services/debugService';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire';
import { 
  logUserActivity, 
  getUserActivityLogs, 
  findTripwireUser, 
  getUserActivityStats 
} from '../../services/userActivityLogger';

const router = Router();

/**
 * GET /api/tripwire/debug/stats
 * Get debug statistics (errors, success rate, response times)
 * Protected: admin or sales role
 */
router.get('/stats', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    // Parse date range
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    const stats = await getDebugStats(startDate, endDate);

    res.json(stats);
  } catch (error: any) {
    console.error('❌ Error getting debug stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/debug/errors
 * Get detailed error logs
 * Protected: admin or sales role
 */
router.get('/errors', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    const errors = await getErrorLogs(limit, startDate, endDate);

    res.json({ errors });
  } catch (error: any) {
    console.error('❌ Error getting error logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/debug/logs
 * Get all logs (with optional filtering)
 * Protected: admin or sales role
 */
router.get('/logs', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const eventType = req.query.eventType as string | undefined;
    
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    const logs = await getAllLogs(limit, startDate, endDate, eventType);

    res.json({ logs });
  } catch (error: any) {
    console.error('❌ Error getting all logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tripwire/debug/cleanup
 * Manually trigger cleanup of old logs (older than 7 days)
 * Protected: admin or sales role
 */
router.post('/cleanup', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    // Call cleanup function
    const { cleanupOldLogs } = await import('../../services/queueService');
    await cleanupOldLogs();

    console.log('✅ [DEBUG] Manual cleanup triggered by', (req as any).user?.email);

    res.json({ success: true, message: 'Old logs cleaned up (7+ days)' });
  } catch (error: any) {
    console.error('❌ Error triggering cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tripwire/debug/client-error
 * Log client-side errors from production
 * Protected: authenticated users only
 */
router.post('/client-error', authenticateTripwireJWT, async (req, res) => {
  try {
    const { message, stack, userAgent, url, context } = req.body;
    const userId = (req as any).user?.sub;
    const userEmail = (req as any).user?.email;
    
    // Log to user_activity_logs (if userId exists)
    if (userId) {
      await logUserActivity({
        userId,
        eventType: 'CLIENT_ERROR',
        eventCategory: 'error',
        message: `Client Error: ${message}`,
        metadata: { stack, userAgent, url, context, userEmail },
        severity: 'error',
      });
    }
    
    // Also log to system_health_logs (for general statistics)
    await tripwireAdminSupabase
      .from('system_health_logs')
      .insert({
        event_type: 'CLIENT_ERROR',
        message: `Client Error: ${message}`,
        metadata: { 
          stack, 
          userAgent, 
          url, 
          context, 
          userId,
          userEmail 
        }
      });
    
    console.log(`📱 [CLIENT ERROR] ${userEmail}: ${message}`);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error logging client error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/debug/search-users?q=email_or_phone
 * Search Tripwire users by email or phone
 * Protected: admin or sales role
 */
router.get('/search-users', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    const searchTerm = req.query.q as string;
    
    if (!searchTerm || searchTerm.length < 3) {
      return res.status(400).json({ error: 'Search term must be at least 3 characters' });
    }
    
    const users = await findTripwireUser(searchTerm);
    
    res.json({ users });
  } catch (error: any) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/debug/user-logs/:userId
 * Get activity logs for specific user
 * Protected: admin or sales role
 */
router.get('/user-logs/:userId', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const eventType = req.query.eventType as string | undefined;
    
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : undefined;
    
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : undefined;
    
    const logs = await getUserActivityLogs(userId, {
      limit,
      eventType,
      startDate,
      endDate,
    });
    
    // Get user info
    const { data: user } = await tripwireAdminSupabase
      .from('tripwire_users')
      .select('user_id, full_name, email, phone, created_at')
      .eq('user_id', userId)
      .single();
    
    res.json({ 
      user,
      logs,
      totalLogs: logs.length 
    });
  } catch (error: any) {
    console.error('❌ Error getting user logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/debug/user-stats/:userId
 * Get error/event statistics for specific user
 * Protected: admin or sales role
 */
router.get('/user-stats/:userId', authenticateTripwireJWT, requireTripwireSalesOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const stats = await getUserActivityStats(userId);
    
    res.json(stats);
  } catch (error: any) {
    console.error('❌ Error getting user stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
