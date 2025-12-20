/**
 * Secure Authenticated API Client
 * Features: Auto token refresh, rate limiting, request tracking, CSRF protection
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthManager, AuthTokens, AuthUser } from './auth';
import { RateLimiter } from './rateLimiter';
import { AuditLogger } from './logger';
import { HealthMonitor } from './monitoring';
import { Encryption } from './encryption';

interface SecureApiClientConfig {
  baseURL: string;
  enableRateLimiting?: boolean;
  enableLogging?: boolean;
  enableMonitoring?: boolean;
  timeout?: number;
}

/**
 * ✅ Create secure API client with all security features
 */
export function createSecureApiClient(config: SecureApiClientConfig): AxiosInstance {
  const {
    baseURL,
    enableRateLimiting = true,
    enableLogging = true,
    enableMonitoring = true,
    timeout = 30000
  } = config;

  const client = axios.create({ 
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Request interceptor - attach token, CSRF, rate limit check
  client.interceptors.request.use(
    async (reqConfig: InternalAxiosRequestConfig) => {
      const endpoint = reqConfig.url || '';
      const startTime = Date.now();
      (reqConfig as any)._startTime = startTime;

      // ✅ Rate limiting check
      if (enableRateLimiting) {
        const rateLimitResult = RateLimiter.checkAndRecord(endpoint);
        if (!rateLimitResult.allowed) {
          const error = new Error(rateLimitResult.reason || 'Rate limit exceeded');
          (error as any).isRateLimitError = true;
          (error as any).retryAfterMs = rateLimitResult.retryAfterMs;
          throw error;
        }
      }

      // ✅ Attach Bearer token
      const token = AuthManager.getAccessToken();
      if (token) {
        reqConfig.headers.Authorization = `Bearer ${token}`;
      }

      // ✅ Add CSRF token for state-changing requests
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(reqConfig.method?.toUpperCase() || '')) {
        reqConfig.headers['X-CSRF-Token'] = Encryption.generateCSRF();
      }

      // ✅ Add request ID for tracking
      const requestId = Encryption.generateToken(8);
      reqConfig.headers['X-Request-ID'] = requestId;
      (reqConfig as any)._requestId = requestId;

      // ✅ Log outgoing request
      if (enableLogging) {
        AuditLogger.debug('API Request', {
          method: reqConfig.method?.toUpperCase(),
          endpoint,
          requestId
        }, 'API');
      }

      return reqConfig;
    },
    (error) => {
      if (enableLogging) {
        AuditLogger.error('API Request Error', { error: error.message }, 'API');
      }
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors, log, monitor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      const reqConfig = response.config as any;
      const duration = Date.now() - (reqConfig._startTime || Date.now());
      const endpoint = reqConfig.url || '';

      // ✅ Record success for monitoring
      if (enableMonitoring) {
        HealthMonitor.recordSuccess();
        HealthMonitor.recordResponseTime(endpoint, duration);
      }

      // ✅ Log successful response
      if (enableLogging) {
        AuditLogger.apiCall(endpoint, reqConfig.method?.toUpperCase() || 'GET', response.status, duration);
      }

      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as any;
      const endpoint = originalRequest?.url || '';
      const duration = Date.now() - (originalRequest?._startTime || Date.now());

      // ✅ Record error for monitoring
      if (enableMonitoring) {
        HealthMonitor.recordError(
          error.message,
          endpoint,
          error.response?.status
        );
        HealthMonitor.recordResponseTime(endpoint, duration);
      }

      // ✅ Log error
      if (enableLogging) {
        AuditLogger.apiCall(
          endpoint,
          originalRequest?.method?.toUpperCase() || 'GET',
          error.response?.status || 0,
          duration
        );
      }

      // ✅ Handle 401 Unauthorized - refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = AuthManager.getRefreshToken();
          if (!refreshToken) {
            AuthManager.clearAll();
            redirectToLogin();
            return Promise.reject(error);
          }

          AuditLogger.info('Token refresh initiated', undefined, 'Auth');

          const response = await axios.post(
            `${baseURL}/api/traffic-auth/refresh`,
            { refreshToken }
          );

          const { accessToken, expiresIn } = response.data;
          const user = AuthManager.getUser();

          if (!user) {
            AuthManager.clearAll();
            redirectToLogin();
            return Promise.reject(error);
          }

          AuthManager.saveTokens(
            { accessToken, refreshToken, expiresIn },
            user
          );

          AuditLogger.info('Token refreshed successfully', undefined, 'Auth');

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          AuditLogger.error('Token refresh failed', { error: (refreshError as Error).message }, 'Auth');
          AuthManager.clearAll();
          redirectToLogin();
          return Promise.reject(refreshError);
        }
      }

      // ✅ Handle rate limit errors from server
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        AuditLogger.warn('Server rate limit hit', { endpoint, retryAfter }, 'API');
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Redirect to login based on environment
 */
function redirectToLogin(): void {
  const isTrafficDomain = window.location.hostname === 'traffic.onai.academy';
  window.location.href = isTrafficDomain ? '/login' : '/traffic/login';
}

/**
 * Legacy function for backward compatibility
 */
export function createAuthenticatedApiClient(baseURL: string): AxiosInstance {
  return createSecureApiClient({ baseURL });
}

// Export helpers
export { AuthManager };
export type { AuthTokens, AuthUser };
