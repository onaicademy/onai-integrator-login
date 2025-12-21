import { Request, Response, NextFunction } from 'express';
import { tripwireAdminSupabase } from '../config/supabase-tripwire';

/**
 * 🚔 OPERATION LOGGER - "The Policeman"
 * 
 * Tracks ALL operations in the system for debugging
 * Auto-cleanup: 7 days retention
 * 
 * Logged data:
 * - Request: method, path, body, user
 * - Response: status, time, error
 * - System: success/failure rate
 */

interface OperationLog {
  operation_type: string;
  method: string;
  path: string;
  user_id?: string;
  user_email?: string;
  request_body?: any;
  response_status?: number;
  response_time_ms?: number;
  error_message?: string;
  error_stack?: string;
  metadata?: any;
}

/**
 * Log operation to system_health_logs
 */
async function logOperation(log: OperationLog) {
  try {
    const eventType = log.error_message ? 'ERROR' : 'INFO';
    
    await tripwireAdminSupabase
      .from('system_health_logs')
      .insert({
        event_type: eventType,
        message: `${log.method} ${log.path} → ${log.response_status || 'pending'}`,
        metadata: {
          operation_type: log.operation_type,
          method: log.method,
          path: log.path,
          user_id: log.user_id,
          user_email: log.user_email,
          request_body: log.request_body,
          response_status: log.response_status,
          response_time_ms: log.response_time_ms,
          error_message: log.error_message,
          error_stack: log.error_stack,
          ...log.metadata
        }
      });
  } catch (error) {
    // Don't break main flow if logging fails
    console.error('⚠️ [POLICEMAN] Failed to log operation:', error);
  }
}

/**
 * Middleware: Track ALL API operations
 */
export function operationLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Capture request data
  const requestLog: OperationLog = {
    operation_type: 'API_REQUEST',
    method: req.method,
    path: req.path,
    user_id: (req as any).user?.sub || (req as any).user?.id,
    user_email: (req as any).user?.email,
    request_body: req.method !== 'GET' ? req.body : undefined
  };
  
  // Hook into response to capture result
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Override res.send
  res.send = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    logOperation({
      ...requestLog,
      response_status: res.statusCode,
      response_time_ms: responseTime,
      error_message: res.statusCode >= 400 ? 'Request failed' : undefined,
      metadata: {
        response_size: data?.length || 0
      }
    });
    
    return originalSend.call(this, data);
  };
  
  // Override res.json
  res.json = function(data: any) {
    const responseTime = Date.now() - startTime;
    
    logOperation({
      ...requestLog,
      response_status: res.statusCode,
      response_time_ms: responseTime,
      error_message: res.statusCode >= 400 ? JSON.stringify(data) : undefined,
      metadata: {
        response_data: res.statusCode >= 400 ? data : undefined
      }
    });
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Log critical system events (not HTTP requests)
 */
export async function logSystemEvent(
  type: 'QUEUE_JOB' | 'DATABASE' | 'REDIS' | 'TELEGRAM' | 'EMAIL' | 'AUTH',
  success: boolean,
  details: {
    action: string;
    user_id?: string;
    error?: Error;
    metadata?: any;
  }
) {
  try {
    await tripwireAdminSupabase
      .from('system_health_logs')
      .insert({
        event_type: success ? 'INFO' : 'ERROR',
        message: `[${type}] ${details.action} → ${success ? 'SUCCESS' : 'FAILED'}`,
        metadata: {
          system_component: type,
          action: details.action,
          user_id: details.user_id,
          error_message: details.error?.message,
          error_stack: details.error?.stack,
          ...details.metadata
        }
      });
  } catch (error) {
    console.error('⚠️ [POLICEMAN] Failed to log system event:', error);
  }
}

export default operationLogger;
