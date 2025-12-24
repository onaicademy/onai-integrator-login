// @ts-nocheck
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

/**
 * 🚔 DEBUG SERVICE
 * 
 * Aggregates operation logs for Debug Panel
 * Provides statistics and error analysis
 */

export interface DebugStats {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  error_rate: number; // percentage
  avg_response_time: number; // ms
  errors_by_type: { [key: string]: number };
  slowest_endpoints: Array<{
    path: string;
    avg_time: number;
    count: number;
  }>;
}

export interface OperationLogEntry {
  id: number;
  event_type: string;
  message: string;
  metadata: any;
  created_at: string;
}

/**
 * Get debug statistics for time period
 */
export async function getDebugStats(
  startDate?: Date,
  endDate?: Date
): Promise<DebugStats> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h
    const end = endDate || new Date();
    
    // Get all logs in period
    const { data: logs, error } = await tripwireAdminSupabase
      .from('system_health_logs')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ [DEBUG] Failed to fetch logs:', error);
      return getEmptyStats();
    }
    
    if (!logs || logs.length === 0) {
      return getEmptyStats();
    }
    
    // Calculate statistics
    const totalOps = logs.length;
    const failedOps = logs.filter(l => l.event_type === 'ERROR' || l.event_type === 'CRITICAL').length;
    const successfulOps = totalOps - failedOps;
    const errorRate = totalOps > 0 ? (failedOps / totalOps) * 100 : 0;
    
    // Average response time
    const responseTimes = logs
      .filter(l => l.metadata?.response_time_ms)
      .map(l => l.metadata.response_time_ms);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
    
    // Errors by type
    const errorsByType: { [key: string]: number } = {};
    logs.filter(l => l.event_type === 'ERROR' || l.event_type === 'CRITICAL').forEach(log => {
      const errorMsg = log.metadata?.error_message || log.message || 'Unknown error';
      const errorType = extractErrorType(errorMsg);
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
    });
    
    // Slowest endpoints
    const endpointTimes: { [path: string]: { times: number[], count: number } } = {};
    logs.filter(l => l.metadata?.path && l.metadata?.response_time_ms).forEach(log => {
      const path = log.metadata.path;
      if (!endpointTimes[path]) {
        endpointTimes[path] = { times: [], count: 0 };
      }
      endpointTimes[path].times.push(log.metadata.response_time_ms);
      endpointTimes[path].count++;
    });
    
    const slowestEndpoints = Object.entries(endpointTimes)
      .map(([path, data]) => ({
        path,
        avg_time: data.times.reduce((a, b) => a + b, 0) / data.times.length,
        count: data.count
      }))
      .sort((a, b) => b.avg_time - a.avg_time)
      .slice(0, 10);
    
    return {
      total_operations: totalOps,
      successful_operations: successfulOps,
      failed_operations: failedOps,
      error_rate: Math.round(errorRate * 100) / 100,
      avg_response_time: Math.round(avgResponseTime),
      errors_by_type: errorsByType,
      slowest_endpoints
    };
  } catch (error) {
    console.error('❌ [DEBUG] Exception in getDebugStats:', error);
    return getEmptyStats();
  }
}

/**
 * Get detailed error logs
 */
export async function getErrorLogs(
  limit: number = 50,
  startDate?: Date,
  endDate?: Date
): Promise<OperationLogEntry[]> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    const { data, error } = await tripwireAdminSupabase
      .from('system_health_logs')
      .select('*')
      .in('event_type', ['ERROR', 'CRITICAL', 'WARNING'])
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ [DEBUG] Failed to fetch error logs:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ [DEBUG] Exception in getErrorLogs:', error);
    return [];
  }
}

/**
 * Get all logs (for full debug view)
 */
export async function getAllLogs(
  limit: number = 100,
  startDate?: Date,
  endDate?: Date,
  eventType?: string
): Promise<OperationLogEntry[]> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate || new Date();
    
    let query = tripwireAdminSupabase
      .from('system_health_logs')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());
    
    if (eventType && eventType !== 'ALL') {
      query = query.eq('event_type', eventType);
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('❌ [DEBUG] Failed to fetch logs:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ [DEBUG] Exception in getAllLogs:', error);
    return [];
  }
}

/**
 * Extract error type from error message
 */
function extractErrorType(errorMsg: string): string {
  // Common error patterns
  if (errorMsg.includes('duplicate') || errorMsg.includes('already exists')) {
    return 'Duplicate Entry';
  }
  if (errorMsg.includes('not found') || errorMsg.includes('404')) {
    return 'Not Found';
  }
  if (errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
    return 'Unauthorized';
  }
  if (errorMsg.includes('forbidden') || errorMsg.includes('403')) {
    return 'Forbidden';
  }
  if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
    return 'Timeout';
  }
  if (errorMsg.includes('connection') || errorMsg.includes('network')) {
    return 'Connection Error';
  }
  if (errorMsg.includes('validation') || errorMsg.includes('invalid')) {
    return 'Validation Error';
  }
  if (errorMsg.includes('database') || errorMsg.includes('query')) {
    return 'Database Error';
  }
  if (errorMsg.includes('Redis') || errorMsg.includes('queue')) {
    return 'Queue Error';
  }
  
  return 'Other Error';
}

/**
 * Get empty stats (fallback)
 */
function getEmptyStats(): DebugStats {
  return {
    total_operations: 0,
    successful_operations: 0,
    failed_operations: 0,
    error_rate: 0,
    avg_response_time: 0,
    errors_by_type: {},
    slowest_endpoints: []
  };
}
