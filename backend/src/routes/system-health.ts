import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { getQueueMetrics, getSystemMode, setSystemMode } from '../services/queueService';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

const router = Router();

/**
 * GET /api/admin/system/mode
 * Get current system mode (async_queue or sync_direct)
 */
router.get('/mode', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;
    
    // Only admin can view system mode
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    
    const mode = await getSystemMode();
    res.json({ mode });
  } catch (error: any) {
    console.error('❌ Error getting system mode:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/system/mode
 * Set system mode (kill switch)
 */
router.post('/mode', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;
    
    // Only admin can change system mode
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    
    const { mode } = req.body;
    
    if (!mode || !['async_queue', 'sync_direct'].includes(mode)) {
      return res.status(400).json({ 
        error: 'Invalid mode. Must be "async_queue" or "sync_direct"' 
      });
    }
    
    const userId = currentUser.sub || currentUser.id;
    
    await setSystemMode(mode, userId);
    
    console.log(`✅ [SYSTEM] Mode changed to ${mode} by ${currentUser.email}`);
    
    res.json({ success: true, mode });
  } catch (error: any) {
    console.error('❌ Error setting system mode:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/system/metrics
 * Get queue metrics (waiting, active, completed, failed)
 */
router.get('/metrics', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;
    
    // Only admin can view metrics
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    
    const metrics = await getQueueMetrics();
    res.json(metrics);
  } catch (error: any) {
    console.error('❌ Error getting queue metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/system/logs
 * Get recent system health logs (last 50)
 */
router.get('/logs', authenticateJWT, async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const userRole = currentUser?.user_metadata?.role || currentUser?.role;
    
    // Only admin can view logs
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin only' });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    
    const { data, error } = await tripwireAdminSupabase
      .from('system_health_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    res.json({ logs: data || [] });
  } catch (error: any) {
    console.error('❌ Error getting system logs:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
