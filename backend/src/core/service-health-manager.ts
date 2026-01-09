/**
 * ServiceHealthManager - Self-Healing Coordination System
 *
 * Provides mutual self-healing between services:
 * - Health monitoring with configurable intervals
 * - Automatic failure detection and recovery
 * - Cascading failure protection
 * - Service dependency management
 * - Circuit breaker integration
 * - Exponential backoff for recovery attempts
 *
 * @architecture Services register themselves and their dependencies.
 * The manager ensures that if one service fails, dependent services
 * are notified and can take protective action.
 */

import { EventEmitter } from 'events';
import { getLogger, SecureLogger } from './secure-logger.js';

// =====================================================
// Types & Interfaces
// =====================================================

type ServiceStatus = 'initializing' | 'healthy' | 'degraded' | 'unhealthy' | 'recovering' | 'dead';
type ServicePriority = 'critical' | 'high' | 'medium' | 'low';

interface HealthCheckResult {
  healthy: boolean;
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface ServiceConfig {
  name: string;
  priority: ServicePriority;
  dependencies?: string[];
  healthCheck: () => Promise<HealthCheckResult>;
  recover?: () => Promise<boolean>;
  onDependencyFailed?: (dependency: string) => Promise<void>;
  checkIntervalMs?: number;
  timeoutMs?: number;
  maxConsecutiveFailures?: number;
  recoveryBackoffMs?: number;
  maxRecoveryAttempts?: number;
}

interface ServiceState {
  config: ServiceConfig;
  status: ServiceStatus;
  lastCheck: Date | null;
  lastHealthy: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  recoveryAttempts: number;
  latencyMs: number | null;
  checkTimer: ReturnType<typeof setInterval> | null;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  services: Record<string, {
    status: ServiceStatus;
    lastCheck: string | null;
    consecutiveFailures: number;
    latencyMs: number | null;
  }>;
  criticalServicesDown: string[];
  warnings: string[];
}

// =====================================================
// ServiceHealthManager
// =====================================================

class ServiceHealthManager extends EventEmitter {
  private services: Map<string, ServiceState> = new Map();
  private logger: SecureLogger;
  private isShuttingDown = false;
  private startTime: Date;

  // Global configuration
  private readonly DEFAULT_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_MAX_FAILURES = 3;
  private readonly DEFAULT_RECOVERY_BACKOFF = 5000; // 5 seconds
  private readonly DEFAULT_MAX_RECOVERY_ATTEMPTS = 5;

  constructor() {
    super();
    this.logger = getLogger('HealthManager');
    this.startTime = new Date();

    // Handle process signals for graceful shutdown
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  // =====================================================
  // Service Registration
  // =====================================================

  /**
   * Register a service for health monitoring
   */
  register(config: ServiceConfig): void {
    if (this.services.has(config.name)) {
      this.logger.warn(`Service ${config.name} already registered, updating config`);
    }

    const state: ServiceState = {
      config: {
        ...config,
        checkIntervalMs: config.checkIntervalMs || this.DEFAULT_CHECK_INTERVAL,
        timeoutMs: config.timeoutMs || this.DEFAULT_TIMEOUT,
        maxConsecutiveFailures: config.maxConsecutiveFailures || this.DEFAULT_MAX_FAILURES,
        recoveryBackoffMs: config.recoveryBackoffMs || this.DEFAULT_RECOVERY_BACKOFF,
        maxRecoveryAttempts: config.maxRecoveryAttempts || this.DEFAULT_MAX_RECOVERY_ATTEMPTS,
      },
      status: 'initializing',
      lastCheck: null,
      lastHealthy: null,
      lastError: null,
      consecutiveFailures: 0,
      recoveryAttempts: 0,
      latencyMs: null,
      checkTimer: null,
    };

    this.services.set(config.name, state);
    this.logger.info(`Registered service: ${config.name}`, {
      priority: config.priority,
      dependencies: config.dependencies,
    });

    // Start health checking
    this.startHealthCheck(config.name);
  }

  /**
   * Unregister a service
   */
  unregister(serviceName: string): void {
    const state = this.services.get(serviceName);
    if (state?.checkTimer) {
      clearInterval(state.checkTimer);
    }
    this.services.delete(serviceName);
    this.logger.info(`Unregistered service: ${serviceName}`);
  }

  // =====================================================
  // Health Checking
  // =====================================================

  /**
   * Start periodic health checking for a service
   */
  private startHealthCheck(serviceName: string): void {
    const state = this.services.get(serviceName);
    if (!state) return;

    // Initial check
    this.checkHealth(serviceName);

    // Periodic checks
    state.checkTimer = setInterval(() => {
      if (!this.isShuttingDown) {
        this.checkHealth(serviceName);
      }
    }, state.config.checkIntervalMs!);
  }

  /**
   * Perform health check for a service
   */
  async checkHealth(serviceName: string): Promise<HealthCheckResult> {
    const state = this.services.get(serviceName);
    if (!state) {
      return { healthy: false, message: 'Service not registered' };
    }

    const startTime = Date.now();

    try {
      // Apply timeout to health check
      const result = await this.withTimeout(
        state.config.healthCheck(),
        state.config.timeoutMs!,
        `Health check timeout for ${serviceName}`
      );

      const latencyMs = Date.now() - startTime;
      state.latencyMs = latencyMs;
      state.lastCheck = new Date();

      if (result.healthy) {
        this.handleHealthyCheck(serviceName, state, latencyMs);
      } else {
        this.handleUnhealthyCheck(serviceName, state, result.message || 'Health check returned unhealthy');
      }

      return { ...result, latencyMs };

    } catch (error: any) {
      state.latencyMs = Date.now() - startTime;
      state.lastCheck = new Date();
      this.handleUnhealthyCheck(serviceName, state, error.message);

      return {
        healthy: false,
        latencyMs: state.latencyMs,
        message: error.message,
      };
    }
  }

  /**
   * Handle successful health check
   */
  private handleHealthyCheck(serviceName: string, state: ServiceState, latencyMs: number): void {
    const wasUnhealthy = state.status === 'unhealthy' || state.status === 'recovering';

    state.status = 'healthy';
    state.lastHealthy = new Date();
    state.consecutiveFailures = 0;
    state.recoveryAttempts = 0;
    state.lastError = null;

    if (wasUnhealthy) {
      this.logger.info(`Service ${serviceName} recovered`, { latencyMs });
      this.emit('service-recovered', serviceName);
    } else {
      this.logger.debug(`Service ${serviceName} healthy`, { latencyMs });
    }

    // Check for high latency (degraded)
    if (latencyMs > state.config.timeoutMs! * 0.8) {
      state.status = 'degraded';
      this.logger.warn(`Service ${serviceName} degraded (high latency)`, { latencyMs });
    }

    this.logger.health(serviceName, state.status === 'degraded' ? 'degraded' : 'healthy', { latencyMs });
  }

  /**
   * Handle failed health check
   */
  private handleUnhealthyCheck(serviceName: string, state: ServiceState, error: string): void {
    state.consecutiveFailures++;
    state.lastError = error;

    this.logger.warn(`Service ${serviceName} health check failed`, {
      consecutiveFailures: state.consecutiveFailures,
      error,
    });

    // Check if we should mark as unhealthy
    if (state.consecutiveFailures >= state.config.maxConsecutiveFailures!) {
      const wasHealthy = state.status === 'healthy' || state.status === 'degraded';

      state.status = 'unhealthy';
      this.logger.error(`Service ${serviceName} marked UNHEALTHY`, {
        consecutiveFailures: state.consecutiveFailures,
        error,
      });

      this.logger.health(serviceName, 'unhealthy', { error });

      if (wasHealthy) {
        this.emit('service-unhealthy', serviceName, error);

        // Notify dependent services
        this.notifyDependents(serviceName);

        // Attempt recovery
        this.attemptRecovery(serviceName);
      }
    } else {
      state.status = 'degraded';
      this.logger.health(serviceName, 'degraded', { error });
    }
  }

  // =====================================================
  // Recovery
  // =====================================================

  /**
   * Attempt to recover a failed service
   */
  private async attemptRecovery(serviceName: string): Promise<void> {
    const state = this.services.get(serviceName);
    if (!state || !state.config.recover) {
      this.logger.debug(`No recovery function for ${serviceName}`);
      return;
    }

    if (state.recoveryAttempts >= state.config.maxRecoveryAttempts!) {
      state.status = 'dead';
      this.logger.fatal(`Service ${serviceName} marked DEAD after ${state.recoveryAttempts} recovery attempts`, undefined, {
        service: serviceName,
      });
      this.emit('service-dead', serviceName);
      return;
    }

    state.status = 'recovering';
    state.recoveryAttempts++;

    // Exponential backoff
    const backoffMs = state.config.recoveryBackoffMs! * Math.pow(2, state.recoveryAttempts - 1);

    this.logger.info(`Attempting recovery for ${serviceName}`, {
      attempt: state.recoveryAttempts,
      backoffMs,
    });

    await this.sleep(backoffMs);

    try {
      const success = await state.config.recover();

      if (success) {
        this.logger.info(`Recovery successful for ${serviceName}`);
        // Next health check will confirm
      } else {
        this.logger.warn(`Recovery returned false for ${serviceName}`);
        // Schedule next recovery attempt
        this.scheduleRecovery(serviceName);
      }
    } catch (error: any) {
      this.logger.error(`Recovery failed for ${serviceName}`, error);
      this.scheduleRecovery(serviceName);
    }
  }

  /**
   * Schedule next recovery attempt
   */
  private scheduleRecovery(serviceName: string): void {
    const state = this.services.get(serviceName);
    if (!state || state.status === 'dead') return;

    const backoffMs = state.config.recoveryBackoffMs! * Math.pow(2, state.recoveryAttempts);
    setTimeout(() => this.attemptRecovery(serviceName), backoffMs);
  }

  /**
   * Notify dependent services about failure
   */
  private async notifyDependents(failedService: string): Promise<void> {
    for (const [name, state] of this.services) {
      if (state.config.dependencies?.includes(failedService)) {
        this.logger.warn(`Notifying ${name} about dependency failure: ${failedService}`);

        if (state.config.onDependencyFailed) {
          try {
            await state.config.onDependencyFailed(failedService);
          } catch (error: any) {
            this.logger.error(`Failed to notify ${name} about dependency failure`, error);
          }
        }

        this.emit('dependency-failed', name, failedService);
      }
    }
  }

  // =====================================================
  // Public API
  // =====================================================

  /**
   * Get current system health status
   */
  getSystemHealth(): SystemHealth {
    const services: SystemHealth['services'] = {};
    const criticalServicesDown: string[] = [];
    const warnings: string[] = [];

    for (const [name, state] of this.services) {
      services[name] = {
        status: state.status,
        lastCheck: state.lastCheck?.toISOString() || null,
        consecutiveFailures: state.consecutiveFailures,
        latencyMs: state.latencyMs,
      };

      if (state.status === 'unhealthy' || state.status === 'dead') {
        if (state.config.priority === 'critical') {
          criticalServicesDown.push(name);
        }
        warnings.push(`${name}: ${state.lastError || 'unhealthy'}`);
      } else if (state.status === 'degraded') {
        warnings.push(`${name}: degraded performance`);
      }
    }

    const status: SystemHealth['status'] = criticalServicesDown.length > 0
      ? 'critical'
      : warnings.length > 0
        ? 'degraded'
        : 'healthy';

    return {
      status,
      uptime: Date.now() - this.startTime.getTime(),
      services,
      criticalServicesDown,
      warnings,
    };
  }

  /**
   * Check if a specific service is healthy
   */
  isServiceHealthy(serviceName: string): boolean {
    const state = this.services.get(serviceName);
    return state?.status === 'healthy' || state?.status === 'degraded';
  }

  /**
   * Get service status
   */
  getServiceStatus(serviceName: string): ServiceStatus | null {
    return this.services.get(serviceName)?.status || null;
  }

  /**
   * Force recovery attempt for a service
   */
  async forceRecovery(serviceName: string): Promise<boolean> {
    const state = this.services.get(serviceName);
    if (!state) return false;

    state.recoveryAttempts = 0;
    await this.attemptRecovery(serviceName);
    return true;
  }

  /**
   * Mark service as manually recovered
   */
  markRecovered(serviceName: string): void {
    const state = this.services.get(serviceName);
    if (state) {
      state.status = 'healthy';
      state.consecutiveFailures = 0;
      state.recoveryAttempts = 0;
      state.lastHealthy = new Date();
      this.logger.info(`Service ${serviceName} manually marked as recovered`);
    }
  }

  // =====================================================
  // Watchdog Pattern - Mutual Monitoring
  // =====================================================

  /**
   * Create a watchdog pair - two services monitor each other
   */
  createWatchdogPair(service1: string, service2: string): void {
    const state1 = this.services.get(service1);
    const state2 = this.services.get(service2);

    if (!state1 || !state2) {
      this.logger.warn('Cannot create watchdog pair: service not found');
      return;
    }

    // Add mutual dependency
    state1.config.dependencies = [...(state1.config.dependencies || []), service2];
    state2.config.dependencies = [...(state2.config.dependencies || []), service1];

    this.logger.info(`Created watchdog pair: ${service1} <-> ${service2}`);
  }

  // =====================================================
  // Lifecycle
  // =====================================================

  /**
   * Graceful shutdown
   */
  async shutdown(signal?: string): Promise<void> {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    this.logger.info(`Shutting down health manager`, { signal });

    // Stop all health checks
    for (const [name, state] of this.services) {
      if (state.checkTimer) {
        clearInterval(state.checkTimer);
        state.checkTimer = null;
      }
    }

    this.emit('shutdown');
  }

  // =====================================================
  // Utilities
  // =====================================================

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =====================================================
// Singleton & Factory
// =====================================================

export const healthManager = new ServiceHealthManager();

// Export types
export { ServiceHealthManager, ServiceConfig, ServiceState, ServiceStatus, SystemHealth, HealthCheckResult };
