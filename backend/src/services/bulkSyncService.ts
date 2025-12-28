// @ts-nocheck
/**
 * Bulk Sync Service
 * Orchestrates bulk synchronization operations with progress tracking
 */
import { v4 as uuidv4 } from 'uuid';
import { landingSupabase } from '../config/supabase-landing';
import { hset, expire, set, hgetall, get } from '../config/redis';
import { amocrmSyncQueue } from '../queues/amocrmSyncQueue';
import pino from 'pino';

const logger = pino();

// ================================================
// INTERFACES
// ================================================
export interface BulkSyncLead {
  id: string;
  name: string;
  email?: string;
  phone: string;
  source?: string;
  campaignSlug?: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
}

export interface BulkSyncRequest {
  leads: BulkSyncLead[];
}

export interface SyncProgress {
  syncId: string;
  totalLeads: number;
  processed: number;
  successful: number;
  failed: number;
  in_progress: number;
  queued: number;
  progress: number; // Percentage (0-100)
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  estimatedTimeRemaining?: number; // seconds
}

export interface SyncResult {
  syncId: string;
  lead_id: string;
  status: string;
  contact_id?: number;
  deal_id?: number;
  error?: string;
  created_at: string;
}

export interface SyncSummary {
  syncId: string;
  totalLeads: number;
  successful: number;
  failed: number;
  retried: number;
  duration: number; // seconds
  results: SyncResult[];
}

// ================================================
// BULK SYNC SERVICE
// ================================================
class BulkSyncService {
  /**
   * Start a new bulk sync operation
   */
  async startBulkSync(request: BulkSyncRequest): Promise<string> {
    const syncId = uuidv4();
    const totalLeads = request.leads.length;

    logger.info(`🚀 Starting bulk sync ${syncId} with ${totalLeads} leads`);

    try {
      // 1️⃣ Create sync record in database
      const { error: dbError } = await landingSupabase.from('bulk_syncs').insert({
        id: syncId,
        total_leads: totalLeads,
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });

      if (dbError) {
        logger.error('Error creating sync record:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // 2️⃣ Initialize progress tracking in Redis
      await hset(`sync:${syncId}:progress`, {
        total: totalLeads,
        processed: 0,
        successful: 0,
        failed: 0,
        in_progress: 0,
      });

      // Set TTL for progress data (expire after 7 days)
      await expire(`sync:${syncId}:progress`, 7 * 24 * 60 * 60);

      // 3️⃣ Add all leads to the queue
      const jobs = request.leads.map((lead) => ({
        name: `sync-${lead.id}`,
        data: {
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          campaignSlug: lead.campaignSlug || lead.source,
          paymentMethod: lead.paymentMethod,
          utmParams: lead.metadata?.utmParams || {},
          syncId,
        },
      }));

      await amocrmSyncQueue.addBulk(jobs);

      logger.info(`✅ Added ${jobs.length} jobs to queue for sync ${syncId}`);

      // 4️⃣ Store start time for ETA calculation
      await set(`sync:${syncId}:start_time`, Date.now().toString());

      return syncId;
    } catch (error: any) {
      logger.error(`Error starting bulk sync:`, error);

      // Mark sync as failed
      await landingSupabase.from('bulk_syncs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      }).eq('id', syncId);

      throw error;
    }
  }

  /**
   * Get current sync progress
   */
  async getProgress(syncId: string): Promise<SyncProgress> {
    try {
      // Get progress from Redis
      const progress = await hgetall(`sync:${syncId}:progress`);

      // Get sync record from database
      const { data: syncRecord, error } = await landingSupabase
        .from('bulk_syncs')
        .select('*')
        .eq('id', syncId)
        .single();

      if (error) {
        throw new Error(`Sync not found: ${error.message}`);
      }

      const total = parseInt(progress.total || '0');
      const processed = parseInt(progress.processed || '0');
      const successful = parseInt(progress.successful || '0');
      const failed = parseInt(progress.failed || '0');
      const inProgress = parseInt(progress.in_progress || '0');
      const queued = total - processed - inProgress;

      // Calculate progress percentage
      const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;

      // Calculate estimated time remaining
      let estimatedTimeRemaining: number | undefined;
      if (processed > 0 && processed < total) {
        const startTime = await get(`sync:${syncId}:start_time`);
        if (startTime) {
          const elapsedMs = Date.now() - parseInt(startTime);
          const avgTimePerLead = elapsedMs / processed;
          const remainingLeads = total - processed;
          estimatedTimeRemaining = Math.round((avgTimePerLead * remainingLeads) / 1000);
        }
      }

      // Determine status
      let status: SyncProgress['status'] = syncRecord.status;
      if (processed >= total && status === 'in_progress') {
        // All jobs processed, mark as completed
        status = 'completed';
        await this.markSyncCompleted(syncId);
      }

      return {
        syncId,
        totalLeads: total,
        processed,
        successful,
        failed,
        in_progress: inProgress,
        queued: queued > 0 ? queued : 0,
        progress: progressPercent,
        status,
        startedAt: syncRecord.started_at,
        completedAt: syncRecord.completed_at,
        estimatedTimeRemaining,
      };
    } catch (error: any) {
      logger.error(`Error getting progress for sync ${syncId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed sync results
   */
  async getResults(syncId: string): Promise<SyncSummary> {
    try {
      // Get sync record
      const { data: syncRecord, error: syncError } = await landingSupabase
        .from('bulk_syncs')
        .select('*')
        .eq('id', syncId)
        .single();

      if (syncError) {
        throw new Error(`Sync not found: ${syncError.message}`);
      }

      // Get all results
      const { data: results, error: resultsError } = await landingSupabase
        .from('bulk_sync_results')
        .select('*')
        .eq('sync_id', syncId)
        .order('created_at', { ascending: false });

      if (resultsError) {
        logger.error('Error fetching results:', resultsError);
      }

      const allResults = results || [];

      // Calculate summary stats
      const successful = allResults.filter((r) => r.status === 'success').length;
      const failed = allResults.filter((r) => r.status === 'failed').length;
      const retried = allResults.filter((r) => r.status === 'retrying').length;

      // Calculate duration
      const startTime = new Date(syncRecord.started_at).getTime();
      const endTime = syncRecord.completed_at
        ? new Date(syncRecord.completed_at).getTime()
        : Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      return {
        syncId,
        totalLeads: syncRecord.total_leads,
        successful,
        failed,
        retried,
        duration,
        results: allResults,
      };
    } catch (error: any) {
      logger.error(`Error getting results for sync ${syncId}:`, error);
      throw error;
    }
  }

  /**
   * Mark sync as completed
   */
  private async markSyncCompleted(syncId: string): Promise<void> {
    try {
      const { error } = await landingSupabase
        .from('bulk_syncs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncId);

      if (error) {
        logger.error(`Error marking sync ${syncId} as completed:`, error);
      } else {
        logger.info(`✅ Sync ${syncId} marked as completed`);
      }
    } catch (error: any) {
      logger.error(`Exception marking sync as completed:`, error);
    }
  }

  /**
   * Get all active syncs
   */
  async getActiveSyncs(): Promise<any[]> {
    try {
      const { data, error } = await landingSupabase
        .from('bulk_syncs')
        .select('*')
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) {
        logger.error('Error fetching active syncs:', error);
        return [];
      }

      return data || [];
    } catch (error: any) {
      logger.error('Exception fetching active syncs:', error);
      return [];
    }
  }

  /**
   * Retry failed leads from a sync
   */
  async retryFailed(syncId: string): Promise<number> {
    try {
      // Get failed results
      const { data: failedResults, error } = await landingSupabase
        .from('bulk_sync_results')
        .select('*')
        .eq('sync_id', syncId)
        .eq('status', 'failed');

      if (error || !failedResults || failedResults.length === 0) {
        return 0;
      }

      // Get lead data
      const leadIds = failedResults.map((r) => r.lead_id);
      const { data: leads, error: leadsError } = await landingSupabase
        .from('landing_leads')
        .select('*')
        .in('id', leadIds);

      if (leadsError || !leads) {
        throw new Error(`Error fetching leads: ${leadsError?.message}`);
      }

      // Add jobs to queue
      const jobs = leads.map((lead) => ({
        name: `retry-${lead.id}`,
        data: {
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          campaignSlug: lead.source,
          paymentMethod: lead.paymentMethod,
          utmParams: lead.metadata?.utmParams || {},
          syncId,
        },
      }));

      await amocrmSyncQueue.addBulk(jobs);

      logger.info(`✅ Retrying ${jobs.length} failed leads for sync ${syncId}`);

      return jobs.length;
    } catch (error: any) {
      logger.error(`Error retrying failed leads:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const bulkSyncService = new BulkSyncService();
export default bulkSyncService;

