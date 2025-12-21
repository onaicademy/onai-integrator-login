/**
 * User Activity Logger Service
 * Tracks all user activities, errors, and events for debugging and analytics
 */

import { tripwireAdminSupabase } from '../config/supabase-tripwire';

export type EventType = 
  | 'CLIENT_ERROR' 
  | 'API_ERROR' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'VIDEO_VIEW'
  | 'HOMEWORK_SUBMIT'
  | 'LESSON_COMPLETE'
  | 'USER_CREATED';

export type EventCategory = 'error' | 'auth' | 'content' | 'activity';
export type Severity = 'critical' | 'error' | 'warning' | 'info' | 'debug';

interface LogUserActivityParams {
  userId: string;
  eventType: EventType;
  eventCategory: EventCategory;
  message: string;
  metadata?: any;
  severity?: Severity;
}

/**
 * Log a user activity event
 * @param params - Event parameters
 */
export async function logUserActivity(params: LogUserActivityParams): Promise<void> {
  const { userId, eventType, eventCategory, message, metadata = {}, severity = 'info' } = params;
  
  try {
    const { error } = await tripwireAdminSupabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_category: eventCategory,
        message,
        metadata,
        severity,
      });
    
    if (error) {
      console.error('[USER ACTIVITY LOGGER] Failed to log:', error);
    } else {
      console.log(`📝 [USER ACTIVITY] ${eventType} - ${userId.substring(0, 8)}... - ${message}`);
    }
  } catch (e) {
    console.error('[USER ACTIVITY LOGGER] Exception:', e);
  }
}

/**
 * Get user activity logs
 * @param userId - User ID to fetch logs for
 * @param options - Query options (limit, filters, date range)
 * @returns Array of activity logs
 */
export async function getUserActivityLogs(userId: string, options?: {
  limit?: number;
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 100, eventType, startDate, endDate } = options || {};
  
  let query = tripwireAdminSupabase
    .from('user_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (eventType) {
    query = query.eq('event_type', eventType);
  }
  
  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }
  
  query = query.limit(limit);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('[USER ACTIVITY LOGGER] Error fetching logs:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Search for Tripwire users by email or phone
 * @param searchTerm - Search term (email or phone)
 * @returns Array of matching users
 */
export async function findTripwireUser(searchTerm: string) {
  const { data, error } = await tripwireAdminSupabase
    .from('tripwire_users')
    .select('user_id, full_name, email, phone, created_at')
    .or(`email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
    .limit(10);
  
  if (error) {
    console.error('[USER ACTIVITY LOGGER] Error searching users:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get aggregated statistics for a user
 * @param userId - User ID
 * @returns User activity statistics
 */
export async function getUserActivityStats(userId: string) {
  const { data: logs, error } = await tripwireAdminSupabase
    .from('user_activity_logs')
    .select('event_type, event_category, severity')
    .eq('user_id', userId);
  
  if (error) {
    console.error('[USER ACTIVITY LOGGER] Error fetching stats:', error);
    throw error;
  }
  
  const stats = logs || [];
  
  // Aggregate statistics
  const totalEvents = stats.length;
  const errorCount = stats.filter(s => s.event_category === 'error').length;
  const criticalCount = stats.filter(s => s.severity === 'critical').length;
  
  const eventsByType = stats.reduce((acc, s) => {
    acc[s.event_type] = (acc[s.event_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const errorRate = totalEvents > 0 ? (errorCount / totalEvents * 100).toFixed(2) : '0';
  
  return {
    totalEvents,
    errorCount,
    criticalCount,
    errorRate,
    eventsByType,
  };
}
