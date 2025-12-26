/**
 * Centralized Authentication Management
 * Handles JWT tokens, validation, and user state
 */

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  team: string | null; // ✅ Can be NULL for admin (no team assignment)
  role: 'admin' | 'targetologist';
}

class AuthManager {
  private static readonly ACCESS_TOKEN_KEY = 'traffic_token';
  private static readonly REFRESH_TOKEN_KEY = 'traffic_refresh_token';
  private static readonly EXPIRES_AT_KEY = 'traffic_token_expires';
  private static readonly USER_KEY = 'traffic_user';

  /**
   * ✅ Save tokens after login
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
   * ✅ Get valid access token
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
   * ✅ Get refresh token
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * ✅ Get authenticated user
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
   * ✅ Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return this.getAccessToken() !== null && this.getUser() !== null;
  }

  /**
   * ✅ Clear all tokens
   */
  static clearAll(): void {
    sessionStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.EXPIRES_AT_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * ✅ Get time until expiration (in milliseconds)
   */
  static getTimeUntilExpiry(): number {
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY);
    if (!expiresAt) return 0;

    const now = new Date();
    const expiry = new Date(expiresAt);
    return Math.max(0, expiry.getTime() - now.getTime());
  }

  /**
   * ✅ Parse JWT token payload
   */
  static parseJwt(token: string): any {
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
   * ✅ Validate token hasn't expired
   */
  static isTokenValid(token: string): boolean {
    try {
      const decoded = this.parseJwt(token);
      if (!decoded || !decoded.exp) return false;
      
      // Check if token expired
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}

export { AuthManager };
export type { AuthTokens, AuthUser };
