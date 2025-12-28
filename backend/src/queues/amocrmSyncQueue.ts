// @ts-nocheck
/**
 * BullMQ Queue for AmoCRM Bulk Sync
 * Handles async processing of lead synchronization with retry logic
 */
import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { landingSupabase } from '../config/supabase-landing';
import { amoCrmBulkService } from '../services/amoCrmBulkService';
import { errorTracking, ErrorSeverity, ErrorCategory } from '../services/errorTrackingService';
import pino from 'pino';

const logger = pino();

// ================================================
// JOB DATA INTERFACES
// ================================================
export interface SyncJobData {
  leadId: string;
  name: string;
  email?: string;
  phone: string;
  campaignSlug?: string;
  paymentMethod?: string;
  utmParams?: Record<string, any>;
  syncId: string; // Bulk sync identifier
}

export interface SyncJobResult {
  leadId: string;
  status: 'success' | 'failed' | 'retrying';
  contactId?: number;
  dealId?: number;
  error?: string;
  timestamp: string;
  attemptsMade: number;
}

// ================================================
// CREATE QUEUE
// ================================================
export const amocrmSyncQueue = new Queue<SyncJobData, SyncJobResult>('amocrm-sync', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, then 4s, then 8s
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

// ================================================
// QUEUE EVENTS (for real-time monitoring)
// ================================================
export const queueEvents = new QueueEvents('amocrm-sync', {
  connection: getRedisConnection(),
});

// Log queue events
queueEvents.on('completed', ({ jobId }) => {
  logger.info(`✅ Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`❌ Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`📊 Job ${jobId} progress:`, data);
});

// ================================================
// WORKER (Process jobs)
// ================================================
export const amocrmSyncWorker = new Worker<SyncJobData, SyncJobResult>(
  'amocrm-sync',
  async (job: Job<SyncJobData>) => {
    const { leadId, name, email, phone, campaignSlug, paymentMethod, utmParams, syncId } =
      job.data;

    const attemptNum = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || 3;

    logger.info(`🔄 [Job ${job.id}] Attempt ${attemptNum}/${maxAttempts} for lead ${leadId}`);

    try {
      // ⭐ Mark as in_progress
      await redis.hincrby(`sync:${syncId}:progress`, 'in_progress', 1);

      // Update job progress
      await job.updateProgress(10);

      // 1️⃣ Sync to AmoCRM
      const amocrmResult = await amoCrmBulkService.syncLead({
        name,
        email,
        phone,
        campaignSlug,
        paymentMethod,
        utmParams,
      });

      await job.updateProgress(70);

      if (!amocrmResult.success) {
        throw new Error(amocrmResult.error || 'AmoCRM sync failed');
      }

      // 2️⃣ Update database with sync results
      const { error: dbError } = await landingSupabase
        .from('landing_leads')
        .update({
          amocrm_lead_id: amocrmResult.leadId?.toString(),
          amocrm_contact_id: amocrmResult.contactId?.toString(),
          amocrm_sync_status: 'synced',
          amocrm_sync_attempts: attemptNum,
          amocrm_sync_last_error: null,
          amocrm_synced: true,
        })
        .eq('id', leadId);

      if (dbError) {
        logger.error(`Database update error for lead ${leadId}:`, dbError);
      }

      await job.updateProgress(90);

      // 3️⃣ Save sync result
      await saveSyncResult(syncId, leadId, 'success', {
        contactId: amocrmResult.contactId,
        dealId: amocrmResult.leadId,
        attempt: attemptNum,
      });

      await job.updateProgress(100);

      // ✅ SUCCESS: Update progress counters
      await redis.hincrby(`sync:${syncId}:progress`, 'processed', 1);
      await redis.hincrby(`sync:${syncId}:progress`, 'successful', 1);
      await redis.hincrby(`sync:${syncId}:progress`, 'in_progress', -1);

      logger.info(`✅ [Job ${job.id}] SUCCESS on attempt ${attemptNum}`);

      return {
        leadId,
        status: 'success',
        contactId: amocrmResult.contactId,
        dealId: amocrmResult.leadId,
        timestamp: new Date().toISOString(),
        attemptsMade: attemptNum,
      };
    } catch (error: any) {
      logger.error(`❌ [Job ${job.id}] Error on attempt ${attemptNum}/${maxAttempts}:`, error.message);

      if (attemptNum < maxAttempts) {
        // ⭐ Will retry - don't update processed yet
        await redis.hincrby(`sync:${syncId}:progress`, 'in_progress', -1);

        // Update database with retry status
        await landingSupabase
          .from('landing_leads')
          .update({
            amocrm_sync_status: 'retrying',
            amocrm_sync_attempts: attemptNum,
            amocrm_sync_last_error: error.message,
          })
          .eq('id', leadId);

        const backoffDelay = 2 ** (attemptNum - 1);
        logger.info(`🔄 [Job ${job.id}] Will retry after ${backoffDelay}s`);

        throw error; // BullMQ handles retry

      } else {
        // ⭐ Final failure - all attempts exhausted
        await redis.hincrby(`sync:${syncId}:progress`, 'processed', 1);
        await redis.hincrby(`sync:${syncId}:progress`, 'failed', 1);
        await redis.hincrby(`sync:${syncId}:progress`, 'in_progress', -1);

        // Update database with final failed status
        await landingSupabase
          .from('landing_leads')
          .update({
            amocrm_sync_status: 'failed',
            amocrm_sync_attempts: attemptNum,
            amocrm_sync_last_error: error.message,
          })
          .eq('id', leadId);

        // Save sync result
        await saveSyncResult(syncId, leadId, 'failed', {
          error: error.message,
          attempt: attemptNum,
        });

        // 🛡️ Track critical error
        await errorTracking.trackError(
          error,
          ErrorSeverity.HIGH,
          ErrorCategory.AMOCRM,
          {
            leadId,
            syncId,
            jobId: job.id?.toString(),
            metadata: {
              attempts: attemptNum,
              leadName: name,
              phone: phone,
            },
          }
        );

        logger.error(`💀 [Job ${job.id}] FINAL FAILURE after ${maxAttempts} attempts`);

        throw error;
      }
    }
  },
  {
    connection: getRedisConnection(),
    concurrency: 1, // 🚦 Process 1 job at a time (prevent amoCRM rate limit!)
    maxStalledCount: 3, // Max retries for stalled jobs
    stalledInterval: 5000, // Check every 5 seconds
    limiter: {
      max: 1, // Max 1 job
      duration: 2000, // Per 2 seconds (safe rate for amoCRM API)
    },
  }
);

// ================================================
// WORKER EVENTS
// ================================================
amocrmSyncWorker.on('completed', (job, result) => {
  logger.info(`✅ Worker completed job ${job.id}`, {
    leadId: result.leadId,
    dealId: result.dealId,
  });
});

amocrmSyncWorker.on('failed', (job, error) => {
  logger.error(`❌ Worker failed job ${job?.id}:`, error.message);
});

amocrmSyncWorker.on('error', (error) => {
  logger.error('❌ Worker error:', error);
});

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Save sync result to database
 */
async function saveSyncResult(
  syncId: string,
  leadId: string,
  status: string,
  data: { contactId?: number; dealId?: number; error?: string; attempt?: number }
): Promise<void> {
  try {
    const { error } = await landingSupabase.from('bulk_sync_results').insert({
      sync_id: syncId,
      lead_id: leadId,
      status,
      contact_id: data.contactId,
      deal_id: data.dealId,
      error: data.error,
      attempt: data.attempt || 1,
    });

    if (error) {
      logger.error('Error saving sync result:', error);
    }
  } catch (error: any) {
    logger.error('Exception saving sync result:', error.message);
  }
}

/**
 * Graceful shutdown
 */
export const closeQueue = async (): Promise<void> => {
  logger.info('🛑 Closing AmoCRM sync queue...');

  try {
    await amocrmSyncWorker.close();
    await queueEvents.close();
    await amocrmSyncQueue.close();
    logger.info('✅ Queue closed gracefully');
  } catch (error: any) {
    logger.error('❌ Error closing queue:', error.message);
  }
};

// Log queue initialization
logger.info('✅ AmoCRM sync queue initialized');

export default amocrmSyncQueue;

