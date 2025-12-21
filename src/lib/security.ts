/**
 * Security Module Exports
 * Unified export for all security-related functionality
 */

// Authentication
export { AuthManager } from './auth';
export type { AuthTokens, AuthUser } from './auth';

// Secure API Client
export { createSecureApiClient, createAuthenticatedApiClient } from './apiClient';

// Encryption & Security
export { 
  Encryption,
  encryptData,
  decryptData,
  hashData,
  generateSignature,
  verifySignature,
  generateSecureToken,
  generateCSRFToken,
  verifyCSRFToken,
  maskSensitiveData,
  encryptPayload,
  decryptPayload,
  hashPassword,
  verifyPassword
} from './encryption';

// Secure Storage
export { 
  SecureStorage, 
  SecureTokenStorage,
  SecureStorageClass 
} from './secureStorage';

// Rate Limiting
export { 
  RateLimiter, 
  RateLimiterClass,
  rateLimitMiddleware 
} from './rateLimiter';

// Validation
export {
  // Schemas
  EmailSchema,
  PasswordSchema,
  SimplePasswordSchema,
  TeamNameSchema,
  FullNameSchema,
  PhoneSchema,
  UUIDSchema,
  DateSchema,
  RoleSchema,
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema,
  ChangePasswordSchema,
  DateRangeSchema,
  TeamFilterSchema,
  AnalyticsQuerySchema,
  CampaignSchema,
  LeadSchema,
  UserSettingsSchema,
  ProfileUpdateSchema,
  passwordRecoverySchema,
  tripwireLoginSchema,
  // Utilities
  validate,
  validateOrThrow,
  createValidator,
  sanitizeString,
  sanitizeObject,
  Validators
} from './validation';

// Types from validation
export type {
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ChangePasswordInput,
  AnalyticsQueryInput,
  CampaignInput,
  LeadInput,
  UserSettingsInput,
  ProfileUpdateInput,
  DateRangeInput,
  PasswordRecoveryFormData,
  TripwireLoginFormData
} from './validation';

// Audit Logging
export { 
  AuditLogger,
  AuditLoggerClass 
} from './logger';

// Health Monitoring
export { 
  HealthMonitor,
  HealthMonitorClass 
} from './monitoring';

// Permissions (RBAC)
export {
  Permissions,
  PermissionsClass,
  ROLES,
  ROLE_PERMISSIONS,
  RESOURCE_RULES,
  usePermission,
  useRole
} from './permissions';

export type { Role, Permission } from './permissions';

/**
 * Initialize all security modules
 * Call this once at app startup
 */
export function initializeSecurity(options?: {
  sessionTimeoutMs?: number;
  enableConsoleLogging?: boolean;
  onSessionExpired?: () => void;
}): void {
  const {
    sessionTimeoutMs = 30 * 60 * 1000, // 30 minutes
    enableConsoleLogging = import.meta.env.DEV,
    onSessionExpired
  } = options || {};

  // Configure secure storage
  SecureStorage.setSessionTimeout(sessionTimeoutMs);
  if (onSessionExpired) {
    SecureStorage.setOnSessionExpired(onSessionExpired);
  }

  // Configure logger
  AuditLogger.configure({
    consoleOutput: enableConsoleLogging,
    sendToServer: !import.meta.env.DEV
  });

  // Configure health monitor
  HealthMonitor.configure({
    enabled: true,
    errorRateThreshold: 10,
    responseTimeThreshold: 3000
  });

  console.log('✅ Security modules initialized');
}

/**
 * Cleanup all security modules
 * Call this on app unmount
 */
export function cleanupSecurity(): void {
  SecureStorage.destroy();
  AuditLogger.destroy();
  HealthMonitor.destroy();
  console.log('🧹 Security modules cleaned up');
}
