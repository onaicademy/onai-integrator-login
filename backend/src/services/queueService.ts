// @ts-nocheck
import { Queue } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '../config/redis';
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

// ===================================
// 🚀 Config Cache (60s TTL)
// ===================================
interface CachedConfig {
  mode: 'async_queue' | 'sync_direct';
  timestamp: number;
}

let configCache: CachedConfig | null = null;
const CONFIG_CACHE_TTL = 60000; // 60 seconds

function isCacheValid(): boolean {
  if (!configCache) return false;
  return (Date.now() - configCache.timestamp) < CONFIG_CACHE_TTL;
}

function clearCache() {
  configCache = null;
  console.log('🔄 [CACHE] Config cache cleared');
}

// Create BullMQ Queue (only if Redis is available)
export const userCreationQueue = new Queue<CreateUserJobData>('tripwire-user-creation', {
  connection: isRedisAvailable() ? getRedisConnection() : undefined,
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
 * ✅ CACHED: 60s TTL to prevent DB overload
 */
export async function getSystemMode(): Promise<'async_queue' | 'sync_direct'> {
  // Check cache first
  if (isCacheValid() && configCache) {
    return configCache.mode;
  }
  
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
    
    const mode = (data?.value as any) || 'async_queue';
    
    // Update cache
    configCache = {
      mode,
      timestamp: Date.now()
    };
    
    console.log(`✅ [CACHE] System mode cached: ${mode} (valid for ${CONFIG_CACHE_TTL / 1000}s)`);
    
    return mode;
  } catch (error) {
    console.error('❌ [QUEUE] Exception getting system mode:', error);
    return 'async_queue';
  }
}

/**
 * Set system mode (kill switch)
 * ✅ Clears cache after mode change
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
    
    // Clear cache immediately
    clearCache();
    
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
 * ✅ CRITICAL/SWITCH events trigger instant Telegram alerts
 */
export async function logHealthEvent(
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SWITCH' | 'CRITICAL', 
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
    
    // 🚨 Send Telegram alert for critical events
    if (type === 'CRITICAL' || type === 'SWITCH') {
      await sendTelegramAlert(type, message, metadata);
    }
  } catch (error) {
    // Don't throw - logging should never break main flow
    console.error('⚠️ [QUEUE] Failed to log health event:', error);
  }
}

/**
 * Send instant Telegram alert to admin
 * 🚨 Only for CRITICAL/SWITCH events
 */
async function sendTelegramAlert(
  type: 'CRITICAL' | 'SWITCH',
  message: string,
  metadata?: any
) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
    
    if (!botToken || !adminChatId) {
      console.warn('⚠️ [TELEGRAM] Bot token or admin chat ID not configured');
      return;
    }
    
    const emoji = type === 'CRITICAL' ? '🚨' : '🔄';
    const alertMessage = `${emoji} **SYSTEM ALERT**\n\n` +
      `**Type:** ${type}\n` +
      `**Message:** ${message}\n` +
      `**Time:** ${new Date().toISOString()}\n` +
      (metadata ? `\n**Details:**\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`` : '');
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: alertMessage,
        parse_mode: 'Markdown'
      })
    });
    
    if (!response.ok) {
      console.error('❌ [TELEGRAM] Failed to send alert:', await response.text());
    } else {
      console.log(`✅ [TELEGRAM] ${type} alert sent to admin`);
    }
  } catch (error) {
    // Non-critical - don't break main flow
    console.error('⚠️ [TELEGRAM] Exception sending alert:', error);
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
