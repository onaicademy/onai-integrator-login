/**
 * Centralized Authentication Management
 * Handles JWT tokens, validation, and user state
 *
 * ENHANCED: Added analyst role, refresh token flow, better type safety
 */

import axios from 'axios';
import { TRAFFIC_API_URL } from '@/config/traffic-api';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  team: string | null;
  role: 'admin' | 'targetologist' | 'analyst';
}

class AuthManager {
  private static readonly ACCESS_TOKEN_KEY = 'traffic_token';
  private static readonly REFRESH_TOKEN_KEY = 'traffic_refresh_token';
  private static readonly EXPIRES_AT_KEY = 'traffic_token_expires';
  private static readonly USER_KEY = 'traffic_user';

  /**
   * Save tokens after login
   */
  static saveTokens(tokens: AuthTokens, user: AuthUser): void {
    sessionStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expiresIn);
    localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toISOString());
  }

  /**
   * Get valid access token (checks expiration)
   */
  static getAccessToken(): string | null {
    const token = sessionStorage.getItem(this.ACCESS_TOKEN_KEY);

    if (!token) return null;

    // Check expiration
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      this.clearAll();
      return null;
    }

    return token;
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get authenticated user with proper typing
   */
  static getUser(): AuthUser | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getAccessToken() !== null && this.getUser() !== null;
  }

  /**
   * Clear all tokens (proper logout)
   */
  static clearAll(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get time until expiration (in milliseconds)
   */
  static getTimeUntilExpiry(): number {
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    if (!expiresAt) return 0;

    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.max(0, expiry.getTime() - now.getTime());
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await axios.post(`${TRAFFIC_API_URL}/api/traffic-auth/refresh`, {
        refreshToken
      });

      if (response.data.success && response.data.token) {
        sessionStorage.setItem(this.ACCESS_TOKEN_KEY, response.data.token);

        // Update expiration
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + (response.data.expiresIn || 604800));
        localStorage.setItem(this.EXPIRES_AT_KEY, expiresAt.toISOString());

        return response.data.token;
      }
      return null;
    } catch {
      this.clearAll();
      return null;
    }
  }

  /**
   * Parse JWT token payload
   */
  static parseJwt(token: string): Record<string, unknown> | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  /**
   * Validate token hasn't expired
   */
  static isTokenValid(token: string): boolean {
    try {
      const decoded = this.parseJwt(token);
      if (!decoded || typeof decoded.exp !== 'number') return false;

      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /**
   * Check if user has admin role
   */
  static isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }

  /**
   * Check if user has analyst role (can edit UTM)
   */
  static isAnalyst(): boolean {
    const user = this.getUser();
    return user?.role === 'analyst' || user?.role === 'admin';
  }

  /**
   * Logout with optional API call
   */
  static async logout(callApi = true): Promise<void> {
    if (callApi) {
      try {
        const token = this.getAccessToken();
        if (token) {
          await axios.post(
            `${TRAFFIC_API_URL}/api/traffic-auth/logout`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      } catch {
        // Ignore logout API errors
      }
    }
    this.clearAll();
  }
}

export { AuthManager };
export type { AuthTokens, AuthUser };
