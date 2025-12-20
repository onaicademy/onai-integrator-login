/**
 * Authenticated API Client with Auto Token Refresh
 * Axios interceptors handle 401 errors and refresh tokens automatically
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AuthManager, AuthTokens, AuthUser } from './auth';

/**
 * ✅ Create API client with automatic token refresh
 */
export function createAuthenticatedApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({ baseURL });

  // Request interceptor - attach token to all requests
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = AuthManager.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle 401 and refresh tokens
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      // If 401 Unauthorized and not already retried
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = AuthManager.getRefreshToken();
          if (!refreshToken) {
            AuthManager.clearAll();
            window.location.href = '/traffic/login';
            return Promise.reject(error);
          }

          console.log('🔄 Refreshing access token...');

          // Request new access token
          const response = await axios.post(
            `${baseURL}/api/traffic-auth/refresh`,
            { refreshToken }
          );

          const { accessToken, expiresIn } = response.data;
          const user = AuthManager.getUser();

          if (!user) {
            AuthManager.clearAll();
            window.location.href = '/traffic/login';
            return Promise.reject(error);
          }

          // Save new token
          AuthManager.saveTokens(
            { accessToken, refreshToken, expiresIn },
            user
          );

          console.log('✅ Token refreshed successfully');

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          AuthManager.clearAll();
          window.location.href = '/traffic/login';
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

// Export helpers
export { AuthManager };
export type { AuthTokens, AuthUser };
