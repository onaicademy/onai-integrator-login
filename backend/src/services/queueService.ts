import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

/**
 * Queue Service for Tripwire User Creation
 * Manages async job processing with BullMQ + Redis
 */

export interface CreateUserJobData {
  full_name: string;
  email: string;
  password: string;
  currentUserId: string;
  currentUserEmail?: string;
  currentUserName?: string;
}

// Create BullMQ Queue
export const userCreationQueue = new Queue<CreateUserJobData>('tripwire-user-creation', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000 // 2s, 4s, 8s
    },
    removeOnComplete: 100, // Keep last 100 successful jobs
    removeOnFail: 500 // Keep last 500 failed jobs for debugging
  }
});

/**
 * Enqueue user creation job
 */
export async function enqueueUserCreation(data: CreateUserJobData) {
  try {
    const job = await userCreationQueue.add('create-user', data, {
      jobId: `user-${data.email}-${Date.now()}`, // Unique ID prevents duplicates
      priority: 1
    });
    
    console.log(`✅ [QUEUE] Job ${job.id} enqueued for ${data.email}`);
    
    // Log to health logs
    await logHealthEvent('INFO', `User creation job queued: ${data.email}`, {
      jobId: job.id,
      email: data.email
    });
    
    return job;
  } catch (error: any) {
    console.error('❌ [QUEUE] Failed to enqueue:', error);
    throw error;
  }
}

/**
 * Get queue metrics (for monitoring dashboard)
 */
export async function getQueueMetrics() {
  try {
    const [waiting, active, completed, failed] = await Promise.all([
      userCreationQueue.getWaitingCount(),
      userCreationQueue.getActiveCount(),
      userCreationQueue.getCompletedCount(),
      userCreationQueue.getFailedCount()
    ]);
    
    return { waiting, active, completed, failed };
  } catch (error: any) {
    console.error('❌ [QUEUE] Failed to get metrics:', error);
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }
}

/**
 * Get current system mode (async_queue or sync_direct)
 */
export async function getSystemMode(): Promise<'async_queue' | 'sync_direct'> {
  try {
    const { data, error } = await tripwireAdminSupabase
      .from('system_config')
      .select('value')
      .eq('key', 'traffic_mode')
      .single();
    
    if (error) {
      console.error('❌ [QUEUE] Failed to get system mode:', error);
      return 'async_queue'; // Default to queue mode
    }
    
    return (data?.value as any) || 'async_queue';
  } catch (error) {
    console.error('❌ [QUEUE] Exception getting system mode:', error);
    return 'async_queue';
  }
}

/**
 * Set system mode (kill switch)
 */
export async function setSystemMode(
  mode: 'async_queue' | 'sync_direct', 
  userId: string
) {
  try {
    // Update mode in DB
    const { error: updateError } = await tripwireAdminSupabase
      .from('system_config')
      .update({ 
        value: mode, 
        updated_by: userId, 
        updated_at: new Date().toISOString() 
      })
      .eq('key', 'traffic_mode');
    
    if (updateError) throw updateError;
    
    // Log mode switch
    await logHealthEvent('SWITCH', `System mode changed to: ${mode}`, { 
      changed_by: userId,
      previous_mode: mode === 'async_queue' ? 'sync_direct' : 'async_queue'
    });
    
    console.log(`✅ [QUEUE] System mode changed to: ${mode} by ${userId}`);
  } catch (error: any) {
    console.error('❌ [QUEUE] Failed to set system mode:', error);
    throw error;
  }
}

/**
 * Log health event to system_health_logs
 */
export async function logHealthEvent(
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SWITCH', 
  message: string, 
  metadata?: any
) {
  try {
    await tripwireAdminSupabase
      .from('system_health_logs')
      .insert({
        event_type: type,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null
      });
  } catch (error) {
    // Don't throw - logging should never break main flow
    console.error('⚠️ [QUEUE] Failed to log health event:', error);
  }
}

/**
 * Cleanup old logs (call via cron or manually)
 */
export async function cleanupOldLogs() {
  try {
    const { error } = await tripwireAdminSupabase.rpc('cleanup_old_health_logs');
    
    if (error) throw error;
    
    console.log('✅ [QUEUE] Old health logs cleaned up');
  } catch (error: any) {
    console.error('❌ [QUEUE] Failed to cleanup logs:', error);
  }
}
