import { Router } from 'express';
import { authenticateJWT, requireSalesOrAdmin } from '../../middleware/auth';
import { getQueueMetrics, getSystemMode, setSystemMode } from '../../services/queueService';
import { tripwireAdminSupabase } from '../../config/supabase-tripwire';

const router = Router();

/**
 * GET /api/tripwire/system/mode
 * Get current system mode (async_queue or sync_direct)
 * Protected: admin or sales role
 */
router.get('/mode', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
  try {
    const mode = await getSystemMode();
    res.json({ mode });
  } catch (error: any) {
    console.error('❌ Error getting system mode:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/tripwire/system/mode
 * Set system mode (kill switch)
 * Protected: admin or sales role
 */
router.post('/mode', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
  try {
    const { mode } = req.body;
    
    if (!mode || !['async_queue', 'sync_direct'].includes(mode)) {
      return res.status(400).json({ 
        error: 'Invalid mode. Must be "async_queue" or "sync_direct"' 
      });
    }
    
    const userId = (req as any).user?.sub;
    const userEmail = (req as any).user?.email;
    
    await setSystemMode(mode, userId);
    
    console.log(`✅ [SYSTEM] Mode changed to ${mode} by ${userEmail}`);
    
    res.json({ success: true, mode });
  } catch (error: any) {
    console.error('❌ Error setting system mode:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/system/metrics
 * Get queue metrics (waiting, active, completed, failed)
 * Protected: admin or sales role
 */
router.get('/metrics', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
  try {
    const metrics = await getQueueMetrics();
    res.json(metrics);
  } catch (error: any) {
    console.error('❌ Error getting queue metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tripwire/system/logs
 * Get recent system health logs (last 50)
 * Protected: admin or sales role
 */
router.get('/logs', authenticateJWT, requireSalesOrAdmin, async (req, res) => {
  try {
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
