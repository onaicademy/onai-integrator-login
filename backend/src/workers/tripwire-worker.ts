/**
 * Tripwire Worker - Queue Processing for Tripwire Sales Manager
 * Handles background jobs for sales processing, notifications, etc.
 */

import { Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Redis connection for BullMQ - using REDIS_URL for Docker compatibility
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConnection = {
  url: redisUrl,
};

// Worker instance
let worker: Worker | null = null;

/**
 * Initialize and start the Tripwire Worker
 */
export async function startWorker() {
  try {
    console.log('🔄 Starting Tripwire Worker...');

    worker = new Worker(
      'tripwire-queue',
      async (job: Job) => {
        console.log(`Processing job ${job.id}:`, job.name);
        
        switch (job.name) {
          case 'process-sale':
            await processSale(job.data);
            break;
          case 'send-notification':
            await sendNotification(job.data);
            break;
          case 'update-analytics':
            await updateAnalytics(job.data);
            break;
          default:
            console.warn(`Unknown job type: ${job.name}`);
        }
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    worker.on('completed', (job: Job) => {
      console.log(`✅ Job ${job.id} completed`);
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      console.error(`❌ Job ${job?.id} failed:`, error.message);
    });

    console.log('✅ Tripwire Worker started successfully');
  } catch (error) {
    console.error('❌ Failed to start Tripwire Worker:', error);
    throw error;
  }
}

/**
 * Process a sale job
 */
async function processSale(data: any) {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Processing sale:', data.saleId);
  
  // Update sale status
  await supabase
    .from('sales')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('id', data.saleId);
}

/**
 * Send notification job
 */
async function sendNotification(data: any) {
  console.log('Sending notification:', data.userId, data.type);
  // Implementation would send email/SMS
}

/**
 * Update analytics job
 */
async function updateAnalytics(data: any) {
  console.log('Updating analytics:', data.type);
  // Implementation would update analytics tables
}

/**
 * Close the worker gracefully
 */
export async function close() {
  if (worker) {
    await worker.close();
    console.log('✅ Tripwire Worker closed');
    worker = null;
  }
}

/**
 * Get worker status
 */
export function getStatus() {
  return {
    running: worker !== null,
  };
}

// Auto-start if this module is imported directly
if (require.main === module) {
  startWorker().catch(console.error);
}

export default {
  startWorker,
  close,
  getStatus,
};
