import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { getDebugStats, getErrorLogs, getAllLogs } from '../services/debugService';

const router = Router();

/**
 * GET /api/admin/debug/stats
 * Get debug statistics (errors, success rate, response times)
 */
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;

    // Only admin can view debug stats
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

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
 * GET /api/admin/debug/errors
 * Get detailed error logs
 */
router.get('/errors', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;

    // Only admin can view error logs
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

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
 * GET /api/admin/debug/logs
 * Get all logs (with optional filtering)
 */
router.get('/logs', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;

    // Only admin can view all logs
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

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
 * POST /api/admin/debug/cleanup
 * Manually trigger cleanup of old logs (older than 7 days)
 */
router.post('/cleanup', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;

    // Only admin can trigger cleanup
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }

    // Call cleanup function
    const { cleanupOldLogs } = await import('../services/queueService');
    await cleanupOldLogs();

    console.log('✅ [DEBUG] Manual cleanup triggered by admin');

    res.json({ success: true, message: 'Old logs cleaned up (7+ days)' });
  } catch (error: any) {
    console.error('❌ Error triggering cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
