// @ts-nocheck
/**
 * Audit Log Middleware for Backend
 * Logs all requests for security and debugging
 */

import { Request, Response, NextFunction } from 'express';
import { maskSensitiveData } from './rateLimiter';

// Sensitive fields to mask in logs
const SENSITIVE_FIELDS = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'authorization'];

interface AuditLogEntry {
  timestamp: string;
  requestId: string;
  ip: string;
  method: string;
  path: string;
  query?: Record<string, any>;
  userAgent?: string;
  userId?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
}

// In-memory log storage (use database or log service in production)
const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 10000;

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get client IP from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Mask sensitive data in objects
 */
function maskSensitiveFields(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  
  const masked: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      masked[key] = typeof value === 'string' && value.length > 0 ? '***MASKED***' : value;
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveFields(value);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Store audit log entry
 */
function storeLog(entry: AuditLogEntry): void {
  auditLogs.push(entry);
  
  // Limit log size
  if (auditLogs.length > MAX_LOGS) {
    auditLogs.shift();
  }
  
  // Console output for important events
  if (entry.statusCode && entry.statusCode >= 400) {
    console.warn(`⚠️ [Audit] ${entry.method} ${entry.path} - ${entry.statusCode} (${entry.responseTime}ms) [${entry.ip}]`);
  }
}

/**
 * Main audit logging middleware
 */
export function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Attach request ID to request for tracking
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Create initial log entry
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    requestId,
    ip: getClientIP(req),
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    userId: (req as any).userId || undefined
  };
  
  // Log query params (masked)
  if (Object.keys(req.query).length > 0) {
    entry.query = maskSensitiveFields(req.query as Record<string, any>);
  }
  
  // Capture response data
  res.on('finish', () => {
    entry.statusCode = res.statusCode;
    entry.responseTime = Date.now() - startTime;
    entry.userId = (req as any).userId || undefined;
    
    storeLog(entry);
  });
  
  // Capture errors
  res.on('error', (error) => {
    entry.statusCode = 500;
    entry.responseTime = Date.now() - startTime;
    entry.error = error.message;
    
    storeLog(entry);
  });
  
  next();
}

/**
 * Get audit logs with optional filtering
 */
export function getAuditLogs(filter?: {
  startTime?: Date;
  endTime?: Date;
  ip?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  limit?: number;
}): AuditLogEntry[] {
  let filtered = [...auditLogs];
  
  if (filter?.startTime) {
    filtered = filtered.filter(log => new Date(log.timestamp) >= filter.startTime!);
  }
  if (filter?.endTime) {
    filtered = filtered.filter(log => new Date(log.timestamp) <= filter.endTime!);
  }
  if (filter?.ip) {
    filtered = filtered.filter(log => log.ip === filter.ip);
  }
  if (filter?.path) {
    filtered = filtered.filter(log => log.path.includes(filter.path!));
  }
  if (filter?.method) {
    filtered = filtered.filter(log => log.method === filter.method);
  }
  if (filter?.statusCode) {
    filtered = filtered.filter(log => log.statusCode === filter.statusCode);
  }
  
  // Apply limit
  if (filter?.limit && filter.limit > 0) {
    filtered = filtered.slice(-filter.limit);
  }
  
  return filtered;
}

/**
 * Get security summary from logs
 */
export function getSecuritySummary(): {
  totalRequests: number;
  errorRate: number;
  uniqueIPs: number;
  topEndpoints: { path: string; count: number }[];
  recentErrors: AuditLogEntry[];
  suspiciousActivity: AuditLogEntry[];
} {
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentLogs = auditLogs.filter(log => new Date(log.timestamp) >= last24h);
  
  const totalRequests = recentLogs.length;
  const errorLogs = recentLogs.filter(log => log.statusCode && log.statusCode >= 400);
  const errorRate = totalRequests > 0 ? (errorLogs.length / totalRequests) * 100 : 0;
  
  const uniqueIPs = new Set(recentLogs.map(log => log.ip)).size;
  
  // Count endpoints
  const endpointCounts = new Map<string, number>();
  recentLogs.forEach(log => {
    const count = endpointCounts.get(log.path) || 0;
    endpointCounts.set(log.path, count + 1);
  });
  
  const topEndpoints = Array.from(endpointCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  // Get recent errors
  const recentErrors = errorLogs.slice(-20);
  
  // Detect suspicious activity (many 401/403 from same IP)
  const ipFailures = new Map<string, number>();
  recentLogs
    .filter(log => log.statusCode === 401 || log.statusCode === 403)
    .forEach(log => {
      const count = ipFailures.get(log.ip) || 0;
      ipFailures.set(log.ip, count + 1);
    });
  
  const suspiciousIPs = Array.from(ipFailures.entries())
    .filter(([_, count]) => count >= 10)
    .map(([ip]) => ip);
  
  const suspiciousActivity = recentLogs.filter(log => suspiciousIPs.includes(log.ip));
  
  return {
    totalRequests,
    errorRate,
    uniqueIPs,
    topEndpoints,
    recentErrors,
    suspiciousActivity
  };
}

/**
 * Clear old logs
 */
export function clearOldLogs(olderThan: Date): number {
  const initialLength = auditLogs.length;
  const cutoffTime = olderThan.getTime();
  
  // Filter in-place
  let i = 0;
  while (i < auditLogs.length) {
    if (new Date(auditLogs[i].timestamp).getTime() < cutoffTime) {
      auditLogs.splice(i, 1);
    } else {
      i++;
    }
  }
  
  return initialLength - auditLogs.length;
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  return JSON.stringify(auditLogs, null, 2);
}

export default {
  auditLogMiddleware,
  getAuditLogs,
  getSecuritySummary,
  clearOldLogs,
  exportLogs
};
