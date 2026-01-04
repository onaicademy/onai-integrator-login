/**
 * Bulk Sync Routes
 * Handles bulk AmoCRM synchronization with real-time progress via SSE
 */
import { Router, Request, Response } from 'express';
import { bulkSyncService } from '../services/bulkSyncService';
import { trafficAdminSupabase } from '../config/supabase-traffic';
import pino from 'pino';

const logger = pino();
const router = Router();

// ================================================
// START BULK SYNC
// ================================================
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { leadIds, source } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'leadIds array required and non-empty',
      });
    }

    logger.info(`📥 Starting bulk sync for ${leadIds.length} leads`);

    // Fetch lead data from database
    const { data: leads, error: dbError } = await trafficAdminSupabase
      .from('traffic_leads')
      .select('*')
      .in('id', leadIds);

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No leads found with provided IDs',
      });
    }

    // Transform to sync format
    const syncLeads = leads.map((lead: any) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      campaignSlug: lead.source,
      paymentMethod: lead.paymentMethod,
      metadata: lead.metadata,
    }));

    // Start sync
    const syncId = await bulkSyncService.startBulkSync({ leads: syncLeads });

    logger.info(`✅ Bulk sync started: ${syncId}`);

    return res.json({
      success: true,
      syncId,
      totalLeads: syncLeads.length,
      progressUrl: `/api/bulk-sync/progress/${syncId}`,
      progressStreamUrl: `/api/bulk-sync/progress-stream/${syncId}`,
      resultsUrl: `/api/bulk-sync/results/${syncId}`,
    });
  } catch (error: any) {
    logger.error('❌ Error starting bulk sync:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start bulk sync',
    });
  }
});

// ================================================
// SERVER-SENT EVENTS (Real-time progress)
// ================================================
router.get('/progress-stream/:syncId', (req: Request, res: Response) => {
  const { syncId } = req.params;

  logger.info(`📡 SSE connection opened for sync ${syncId}`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

  // Enable CORS for SSE
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', syncId })}\n\n`);

  let intervalId: NodeJS.Timeout | null = null;

  // Start polling progress
  const pollProgress = async () => {
    try {
      const progress = await bulkSyncService.getProgress(syncId);

      // Send progress update
      res.write(`data: ${JSON.stringify(progress)}\n\n`);

      // Stop polling if sync is completed or failed
      if (progress.status === 'completed' || progress.status === 'failed') {
        logger.info(`✅ Sync ${syncId} finished with status: ${progress.status}`);

        // Send final message
        res.write(
          `data: ${JSON.stringify({
            ...progress,
            message: `Sync ${progress.status}`,
          })}\n\n`
        );

        // Close connection after a short delay
        setTimeout(() => {
          if (intervalId) clearInterval(intervalId);
          res.end();
        }, 1000);
      }
    } catch (error: any) {
      logger.error(`❌ SSE error for sync ${syncId}:`, error.message);
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          error: error.message,
        })}\n\n`
      );

      if (intervalId) clearInterval(intervalId);
      res.end();
    }
  };

  // Send initial progress
  pollProgress();

  // Poll every 500ms
  intervalId = setInterval(pollProgress, 500);

  // Client disconnected
  req.on('close', () => {
    logger.info(`📡 SSE connection closed for sync ${syncId}`);
    if (intervalId) clearInterval(intervalId);
  });
});

// ================================================
// GET PROGRESS (polling alternative)
// ================================================
router.get('/progress/:syncId', async (req: Request, res: Response) => {
  try {
    const { syncId } = req.params;
    const progress = await bulkSyncService.getProgress(syncId);

    return res.json({
      success: true,
      progress,
    });
  } catch (error: any) {
    logger.error('❌ Error getting progress:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get progress',
    });
  }
});

// ================================================
// GET RESULTS
// ================================================
router.get('/results/:syncId', async (req: Request, res: Response) => {
  try {
    const { syncId } = req.params;
    const summary = await bulkSyncService.getResults(syncId);

    return res.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    logger.error('❌ Error getting results:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get results',
    });
  }
});

// ================================================
// GET ACTIVE SYNCS
// ================================================
router.get('/active', async (req: Request, res: Response) => {
  try {
    const syncs = await bulkSyncService.getActiveSyncs();

    return res.json({
      success: true,
      syncs,
    });
  } catch (error: any) {
    logger.error('❌ Error getting active syncs:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get active syncs',
    });
  }
});

// ================================================
// RETRY FAILED LEADS
// ================================================
router.post('/retry/:syncId', async (req: Request, res: Response) => {
  try {
    const { syncId } = req.params;
    const retriedCount = await bulkSyncService.retryFailed(syncId);

    return res.json({
      success: true,
      retriedCount,
      message: `Retrying ${retriedCount} failed leads`,
    });
  } catch (error: any) {
    logger.error('❌ Error retrying failed leads:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry',
    });
  }
});

// ================================================
// SYNC ALL LEADS (convenience endpoint)
// ================================================
router.post('/sync-all', async (req: Request, res: Response) => {
  try {
    const { source } = req.body;

    logger.info(`📥 Fetching all leads for bulk sync (source: ${source || 'all'})`);

    // Build query
    let query = trafficAdminSupabase
      .from('traffic_leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by source if provided
    if (source) {
      query = query.eq('source', source);
    }

    // Optionally filter by sync status
    // Uncomment to only sync leads that haven't been synced
    // query = query.or('amocrm_synced.is.null,amocrm_synced.eq.false');

    const { data: leads, error: dbError } = await query;

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!leads || leads.length === 0) {
      return res.json({
        success: true,
        message: 'No leads found to sync',
        syncId: null,
      });
    }

    // Transform to sync format
    const syncLeads = leads.map((lead: any) => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      campaignSlug: lead.source,
      paymentMethod: lead.paymentMethod,
      metadata: lead.metadata,
    }));

    // Start sync
    const syncId = await bulkSyncService.startBulkSync({ leads: syncLeads });

    logger.info(`✅ Bulk sync all started: ${syncId} (${syncLeads.length} leads)`);

    return res.json({
      success: true,
      syncId,
      totalLeads: syncLeads.length,
      progressUrl: `/api/bulk-sync/progress/${syncId}`,
      progressStreamUrl: `/api/bulk-sync/progress-stream/${syncId}`,
      resultsUrl: `/api/bulk-sync/results/${syncId}`,
    });
  } catch (error: any) {
    logger.error('❌ Error syncing all leads:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync all leads',
    });
  }
});

export default router;

