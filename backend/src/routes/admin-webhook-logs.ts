// backend/src/routes/admin-webhook-logs.ts
// 🔍 Admin API for Webhook Logs Viewer

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co',
  process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || ''
);

/**
 * GET /api/admin/webhook-logs
 * Get recent webhook logs with optional filters
 */
router.get('/webhook-logs', async (req: Request, res: Response) => {
  try {
    const { limit = 50, status, routing, lead_id } = req.query;

    let query = tripwireSupabase
      .from('webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(parseInt(limit as string));

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('processing_status', status);
    }

    if (routing && routing !== 'all') {
      query = query.eq('routing_decision', routing);
    }

    if (lead_id) {
      query = query.eq('lead_id', parseInt(lead_id as string));
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching webhook logs:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      logs: data || [],
      total: data?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ Error in webhook logs API:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/webhook-logs/stats
 * Get statistics about webhook processing
 */
router.get('/webhook-logs/stats', async (req: Request, res: Response) => {
  try {
    const { data: all, error: allError } = await tripwireSupabase
      .from('webhook_logs')
      .select('routing_decision, processing_status');

    if (allError) {
      console.error('❌ Error fetching stats:', allError);
      return res.status(500).json({ error: allError.message });
    }

    // Calculate stats
    const stats = {
      total: all?.length || 0,
      by_routing: {
        referral: all?.filter(log => log.routing_decision === 'referral').length || 0,
        traffic: all?.filter(log => log.routing_decision === 'traffic').length || 0,
        both: all?.filter(log => log.routing_decision === 'both').length || 0,
        unknown: all?.filter(log => log.routing_decision === 'unknown').length || 0,
      },
      by_status: {
        success: all?.filter(log => log.processing_status === 'success').length || 0,
        error: all?.filter(log => log.processing_status === 'error').length || 0,
        partial: all?.filter(log => log.processing_status === 'partial').length || 0,
      },
      success_rate: all && all.length > 0
        ? ((all.filter(log => log.processing_status === 'success').length / all.length) * 100).toFixed(2)
        : '0',
    };

    res.json({
      success: true,
      stats,
    });

  } catch (error: any) {
    console.error('❌ Error in webhook stats API:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
