import { Router } from 'express';
import { authenticateJWT, requireSalesOrAdmin } from '../../middleware/auth';
import { getDebugStats, getErrorLogs, getAllLogs } from '../../services/debugService';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire';

const router = Router();

/**
 * GET /api/tripwire/debug/stats
 * Get debug statistics (errors, success rate, response times)
 * Protected: admin or sales role
 */
router.get('/stats', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.get('/errors', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.get('/logs', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.post('/cleanup', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
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
router.post('/client-error', authenticateJWT, async (req, res) => {
  try {
    const { message, stack, userAgent, url, context } = req.body;
    const userId = (req as any).user?.sub;
    const userEmail = (req as any).user?.email;
    
    // Save to system_health_logs
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

export default router;
