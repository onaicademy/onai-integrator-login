/**
 * Health Monitoring System
 * Tracks application health, error rates, and performance metrics
 */

import { AuditLogger } from './logger';

interface HealthMetrics {
  errorRate: number;           // Errors per minute
  avgResponseTime: number;     // Average API response time (ms)
  memoryUsage: number;         // Memory usage percentage
  failedRequests: number;      // Failed API requests count
  successfulRequests: number;  // Successful requests count
  uptime: number;              // Uptime in milliseconds
}

interface ErrorEntry {
  timestamp: number;
  message: string;
  endpoint?: string;
  status?: number;
}

interface ResponseTimeEntry {
  timestamp: number;
  endpoint: string;
  duration: number;
}

interface HealthAlert {
  id: string;
  type: 'error_rate' | 'response_time' | 'memory' | 'failures' | 'custom';
  message: string;
  severity: 'warning' | 'critical';
  timestamp: string;
  resolved: boolean;
}

interface MonitoringConfig {
  enabled: boolean;
  errorRateThreshold: number;          // Errors per minute to trigger alert
  responseTimeThreshold: number;        // ms to trigger slow response alert
  memoryThreshold: number;              // Percentage to trigger memory alert
  failedRequestThreshold: number;       // Failed requests to trigger alert
  checkIntervalMs: number;              // Health check interval
  retentionMinutes: number;             // How long to keep metrics data
  alertCallback?: (alert: HealthAlert) => void;
}

class HealthMonitorClass {
  private errors: ErrorEntry[] = [];
  private responseTimes: ResponseTimeEntry[] = [];
  private alerts: HealthAlert[] = [];
  private startTime: number = Date.now();
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private checkInterval: NodeJS.Timeout | null = null;

  private config: MonitoringConfig = {
    enabled: true,
    errorRateThreshold: 10,      // 10 errors per minute
    responseTimeThreshold: 3000, // 3 seconds
    memoryThreshold: 80,         // 80%
    failedRequestThreshold: 5,   // 5 failed requests
    checkIntervalMs: 60000,      // Check every minute
    retentionMinutes: 60,        // Keep 1 hour of data
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.startHealthChecks();
    }
  }

  /**
   * Configure monitoring
   */
  configure(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart health checks with new interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.startHealthChecks();
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (!this.config.enabled) return;

    this.checkInterval = setInterval(() => {
      this.runHealthCheck();
      this.cleanOldData();
    }, this.config.checkIntervalMs);
  }

  /**
   * Run comprehensive health check
   */
  private runHealthCheck(): void {
    const metrics = this.getMetrics();

    // Check error rate
    if (metrics.errorRate > this.config.errorRateThreshold) {
      this.createAlert('error_rate', 
        `High error rate: ${metrics.errorRate.toFixed(1)} errors/min (threshold: ${this.config.errorRateThreshold})`,
        metrics.errorRate > this.config.errorRateThreshold * 2 ? 'critical' : 'warning'
      );
    }

    // Check response time
    if (metrics.avgResponseTime > this.config.responseTimeThreshold) {
      this.createAlert('response_time',
        `Slow response time: ${metrics.avgResponseTime.toFixed(0)}ms (threshold: ${this.config.responseTimeThreshold}ms)`,
        metrics.avgResponseTime > this.config.responseTimeThreshold * 2 ? 'critical' : 'warning'
      );
    }

    // Check memory (if available)
    if (metrics.memoryUsage > this.config.memoryThreshold) {
      this.createAlert('memory',
        `High memory usage: ${metrics.memoryUsage.toFixed(1)}% (threshold: ${this.config.memoryThreshold}%)`,
        metrics.memoryUsage > 90 ? 'critical' : 'warning'
      );
    }

    // Check failed requests
    if (metrics.failedRequests > this.config.failedRequestThreshold) {
      this.createAlert('failures',
        `High failure rate: ${metrics.failedRequests} failed requests in last minute`,
        'warning'
      );
    }

    // Log health status
    AuditLogger.debug('Health Check', {
      errorRate: metrics.errorRate,
      avgResponseTime: metrics.avgResponseTime,
      failedRequests: metrics.failedRequests,
      successfulRequests: metrics.successfulRequests,
      uptime: this.formatUptime(metrics.uptime)
    }, 'Monitoring');
  }

  /**
   * Create and store an alert
   */
  private createAlert(type: HealthAlert['type'], message: string, severity: 'warning' | 'critical'): void {
    // Check if similar unresolved alert exists
    const existingAlert = this.alerts.find(
      a => a.type === type && !a.resolved && 
      Date.now() - new Date(a.timestamp).getTime() < 5 * 60 * 1000 // Within 5 minutes
    );

    if (existingAlert) return; // Don't duplicate

    const alert: HealthAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);

    // Log the alert
    if (severity === 'critical') {
      AuditLogger.error(`Health Alert: ${message}`, { type, severity }, 'Monitoring');
    } else {
      AuditLogger.warn(`Health Alert: ${message}`, { type, severity }, 'Monitoring');
    }

    // Trigger callback if configured
    if (this.config.alertCallback) {
      this.config.alertCallback(alert);
    }

    // Console warning
    console.warn(`🚨 [Health Monitor] ${severity.toUpperCase()}: ${message}`);
  }

  /**
   * Clean old data beyond retention period
   */
  private cleanOldData(): void {
    const cutoff = Date.now() - (this.config.retentionMinutes * 60 * 1000);
    
    this.errors = this.errors.filter(e => e.timestamp > cutoff);
    this.responseTimes = this.responseTimes.filter(r => r.timestamp > cutoff);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // ============================================
  // Public Methods for Recording Metrics
  // ============================================

  /**
   * Record an error
   */
  recordError(message: string, endpoint?: string, status?: number): void {
    if (!this.config.enabled) return;

    this.errors.push({
      timestamp: Date.now(),
      message,
      endpoint,
      status
    });

    if (status && status >= 400) {
      this.failedRequests++;
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(): void {
    if (!this.config.enabled) return;
    this.successfulRequests++;
  }

  /**
   * Record API response time
   */
  recordResponseTime(endpoint: string, durationMs: number): void {
    if (!this.config.enabled) return;

    this.responseTimes.push({
      timestamp: Date.now(),
      endpoint,
      duration: durationMs
    });

    // Check for slow response immediately
    if (durationMs > this.config.responseTimeThreshold) {
      AuditLogger.warn('Slow API Response', {
        endpoint,
        duration: durationMs,
        threshold: this.config.responseTimeThreshold
      }, 'Monitoring');
    }
  }

  /**
   * Create custom alert
   */
  alert(message: string, severity: 'warning' | 'critical' = 'warning'): void {
    this.createAlert('custom', message, severity);
  }

  // ============================================
  // Public Methods for Getting Metrics
  // ============================================

  /**
   * Get current health metrics
   */
  getMetrics(): HealthMetrics {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Calculate error rate (errors per minute)
    const recentErrors = this.errors.filter(e => e.timestamp > oneMinuteAgo);
    const errorRate = recentErrors.length;

    // Calculate average response time
    const recentResponses = this.responseTimes.filter(r => r.timestamp > oneMinuteAgo);
    const avgResponseTime = recentResponses.length > 0
      ? recentResponses.reduce((sum, r) => sum + r.duration, 0) / recentResponses.length
      : 0;

    // Get memory usage if available
    let memoryUsage = 0;
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      memoryUsage = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
    }

    // Get recent failed requests
    const recentFailed = this.errors.filter(
      e => e.timestamp > oneMinuteAgo && e.status && e.status >= 400
    ).length;

    return {
      errorRate,
      avgResponseTime,
      memoryUsage,
      failedRequests: recentFailed,
      successfulRequests: this.successfulRequests,
      uptime: now - this.startTime
    };
  }

  /**
   * Get all unresolved alerts
   */
  getAlerts(includeResolved: boolean = false): HealthAlert[] {
    return includeResolved 
      ? this.alerts 
      : this.alerts.filter(a => !a.resolved);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      AuditLogger.info('Alert Resolved', { alertId, type: alert.type }, 'Monitoring');
    }
  }

  /**
   * Get health status summary
   */
  getStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const metrics = this.getMetrics();
    const unresolvedCritical = this.alerts.filter(a => !a.resolved && a.severity === 'critical').length;

    if (unresolvedCritical > 0 || metrics.errorRate > this.config.errorRateThreshold * 2) {
      return 'unhealthy';
    }

    const unresolvedWarnings = this.alerts.filter(a => !a.resolved && a.severity === 'warning').length;
    if (unresolvedWarnings > 0 || 
        metrics.errorRate > this.config.errorRateThreshold / 2 ||
        metrics.avgResponseTime > this.config.responseTimeThreshold / 2) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Format uptime for display
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get uptime formatted
   */
  getUptime(): string {
    return this.formatUptime(Date.now() - this.startTime);
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.errors = [];
    this.responseTimes = [];
    this.alerts = [];
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.startTime = Date.now();
  }

  /**
   * Stop monitoring
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const HealthMonitor = new HealthMonitorClass();

// Export class for testing/custom instances
export { HealthMonitorClass };

export default HealthMonitor;
