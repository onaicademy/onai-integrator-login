/**
 * Core Module - Central export point
 *
 * This module provides:
 * - SecureLogger: Production-safe logging
 * - DataMasker: Sensitive data filtering
 * - ServiceHealthManager: Self-healing coordination
 * - Health Routes: Unified monitoring endpoints
 *
 * Usage:
 * ```typescript
 * import { logger, healthManager, initializeServiceRegistry } from './core/index.js';
 *
 * // In server startup:
 * await initializeServiceRegistry();
 * app.use('/health', healthRoutes);
 *
 * // In services:
 * logger.info('Service started', { service: 'myService' });
 * ```
 */

// Logging
export {
  SecureLogger,
  logger,
  createLogger,
  getLogger,
  LogLevel,
  LogContext,
} from './secure-logger.js';

// Data Masking
export {
  DataMasker,
  dataMasker,
  maskSensitiveData,
  safeStringify,
  containsSensitiveData,
} from './data-masker.js';

// Health Management
export {
  ServiceHealthManager,
  healthManager,
  ServiceConfig,
  ServiceStatus,
  SystemHealth,
  HealthCheckResult,
} from './service-health-manager.js';

// Service Registry
export {
  initializeServiceRegistry,
  registerCustomService,
  registerSupabaseMain,
  registerOpenAI,
  registerAmoCRM,
} from './service-registry.js';

// Health Routes
export { default as healthRoutes } from './health-routes.js';
