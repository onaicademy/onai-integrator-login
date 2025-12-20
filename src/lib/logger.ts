/**
 * Audit Logger for User Actions
 * Tracks all user actions with masked sensitive data
 */

import { Encryption } from './encryption';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  action: string;
  userId?: string;
  userEmail?: string;
  component?: string;
  details?: Record<string, any>;
  metadata?: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

interface LogConfig {
  enabled: boolean;
  consoleOutput: boolean;
  maxLogs: number;
  sendToServer: boolean;
  serverEndpoint?: string;
  batchSize: number;
  batchIntervalMs: number;
}

class AuditLoggerClass {
  private logs: LogEntry[] = [];
  private pendingBatch: LogEntry[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  
  private config: LogConfig = {
    enabled: true,
    consoleOutput: import.meta.env.DEV,
    maxLogs: 1000,
    sendToServer: !import.meta.env.DEV,
    serverEndpoint: '/api/audit-logs',
    batchSize: 50,
    batchIntervalMs: 30000 // 30 seconds
  };

  private currentUser: { id?: string; email?: string } | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    
    // Start batch sender if server logging enabled
    if (this.config.sendToServer && typeof window !== 'undefined') {
      this.startBatchSender();
    }

    // Log unhandled errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Unhandled Error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled Promise Rejection', {
          reason: String(event.reason)
        });
      });
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Set current user for logging
   */
  setUser(user: { id?: string; email?: string } | null): void {
    this.currentUser = user;
  }

  /**
   * Update configuration
   */
  configure(config: Partial<LogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Mask sensitive fields in data
   */
  private maskSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'creditCard'];
    const masked: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = typeof value === 'string' ? Encryption.mask(value) : '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = Array.isArray(value) ? value : this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }

  /**
   * Create and store a log entry
   */
  private log(level: LogLevel, action: string, details?: Record<string, any>, component?: string): void {
    if (!this.config.enabled) return;

    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      action,
      userId: this.currentUser?.id,
      userEmail: this.currentUser?.email ? Encryption.mask(this.currentUser.email) : undefined,
      component,
      details: details ? this.maskSensitiveData(details) : undefined,
      metadata: {
        sessionId: this.sessionId,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      }
    };

    // Store locally
    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogs) {
      this.logs.shift();
    }

    // Add to batch for server
    if (this.config.sendToServer) {
      this.pendingBatch.push(entry);
    }

    // Console output
    if (this.config.consoleOutput) {
      const emoji = this.getEmoji(level);
      const color = this.getColor(level);
      console.log(
        `%c${emoji} [${level.toUpperCase()}] ${action}`,
        `color: ${color}; font-weight: bold`,
        details ? this.maskSensitiveData(details) : ''
      );
    }
  }

  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      security: '🔒'
    };
    return emojis[level];
  }

  private getColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: '#888',
      info: '#00bcd4',
      warn: '#ff9800',
      error: '#f44336',
      security: '#9c27b0'
    };
    return colors[level];
  }

  /**
   * Start batch sender for server logging
   */
  private startBatchSender(): void {
    this.batchTimer = setInterval(() => {
      this.flushBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Send batch to server
   */
  private async flushBatch(): Promise<void> {
    if (this.pendingBatch.length === 0) return;
    if (!this.config.serverEndpoint) return;

    const batch = this.pendingBatch.splice(0, this.config.batchSize);

    try {
      await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: batch }),
        keepalive: true // Allow sending even if page unloads
      });
    } catch (error) {
      // Re-add to batch if failed
      this.pendingBatch.unshift(...batch);
      console.error('Failed to send audit logs to server:', error);
    }
  }

  // Public logging methods
  debug(action: string, details?: Record<string, any>, component?: string): void {
    this.log('debug', action, details, component);
  }

  info(action: string, details?: Record<string, any>, component?: string): void {
    this.log('info', action, details, component);
  }

  warn(action: string, details?: Record<string, any>, component?: string): void {
    this.log('warn', action, details, component);
  }

  error(action: string, details?: Record<string, any>, component?: string): void {
    this.log('error', action, details, component);
  }

  security(action: string, details?: Record<string, any>, component?: string): void {
    this.log('security', action, details, component);
  }

  // Specific action loggers
  loginAttempt(email: string, success: boolean, reason?: string): void {
    this.security('Login Attempt', {
      email: Encryption.mask(email),
      success,
      reason
    }, 'Auth');
  }

  logout(): void {
    this.info('User Logout', undefined, 'Auth');
  }

  pageView(page: string, params?: Record<string, any>): void {
    this.info('Page View', { page, ...params }, 'Navigation');
  }

  apiCall(endpoint: string, method: string, status: number, durationMs?: number): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, 'API Call', {
      endpoint,
      method,
      status,
      durationMs
    }, 'API');
  }

  userAction(action: string, target: string, details?: Record<string, any>): void {
    this.info('User Action', { action, target, ...details }, 'UI');
  }

  settingsChange(setting: string, oldValue?: any, newValue?: any): void {
    this.info('Settings Change', {
      setting,
      oldValue: oldValue !== undefined ? '***' : undefined,
      newValue: newValue !== undefined ? '***' : undefined
    }, 'Settings');
  }

  /**
   * Get all logs (for debugging)
   */
  getLogs(filter?: { level?: LogLevel; action?: string; startTime?: Date; endTime?: Date }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }
    if (filter?.action) {
      filtered = filtered.filter(log => log.action.includes(filter.action!));
    }
    if (filter?.startTime) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.startTime!);
    }
    if (filter?.endTime) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= filter.endTime!);
    }

    return filtered;
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.pendingBatch = [];
  }

  /**
   * Destroy logger (cleanup)
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushBatch(); // Send any remaining logs
    this.clearLogs();
  }
}

// Export singleton instance
export const AuditLogger = new AuditLoggerClass();

// Export class for testing/custom instances
export { AuditLoggerClass };

export default AuditLogger;
