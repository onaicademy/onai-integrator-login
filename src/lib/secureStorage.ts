/**
 * Secure Storage with Memory-Based Storage and Session Timeout
 * Prevents token theft through XSS by using memory instead of localStorage
 */

import { Encryption } from './encryption';

interface StorageItem {
  value: string;
  expiresAt: number;
  encrypted: boolean;
}

class SecureStorageClass {
  private storage: Map<string, StorageItem> = new Map();
  private sessionTimeout: number = 30 * 60 * 1000; // 30 minutes
  private lastActivity: number = Date.now();
  private timeoutCheckInterval: NodeJS.Timeout | null = null;
  private onSessionExpired: (() => void) | null = null;

  constructor() {
    // Start session timeout checker
    this.startTimeoutChecker();
    
    // Track user activity
    if (typeof window !== 'undefined') {
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateActivity(), { passive: true });
      });
    }
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Start session timeout checker
   */
  private startTimeoutChecker(): void {
    if (typeof window === 'undefined') return;
    
    this.timeoutCheckInterval = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      
      if (inactiveTime >= this.sessionTimeout) {
        console.warn('⚠️ Session expired due to inactivity');
        this.clearAll();
        
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
      }
      
      // Also clean expired items
      this.cleanExpiredItems();
    }, 60000); // Check every minute
  }

  /**
   * Clean expired items from storage
   */
  private cleanExpiredItems(): void {
    const now = Date.now();
    
    for (const [key, item] of this.storage.entries()) {
      if (item.expiresAt > 0 && item.expiresAt <= now) {
        this.storage.delete(key);
      }
    }
  }

  /**
   * Set session expired callback
   */
  setOnSessionExpired(callback: () => void): void {
    this.onSessionExpired = callback;
  }

  /**
   * Set session timeout duration
   */
  setSessionTimeout(durationMs: number): void {
    this.sessionTimeout = durationMs;
  }

  /**
   * Store a value securely
   */
  set(key: string, value: string | object, options?: { 
    ttlMs?: number; 
    encrypt?: boolean;
  }): void {
    this.updateActivity();
    
    const { ttlMs = 0, encrypt = false } = options || {};
    
    let storedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (encrypt) {
      storedValue = Encryption.encrypt(storedValue);
    }
    
    this.storage.set(key, {
      value: storedValue,
      expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
      encrypted: encrypt
    });
  }

  /**
   * Retrieve a value from storage
   */
  get<T = string>(key: string): T | null {
    this.updateActivity();
    
    const item = this.storage.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check expiration
    if (item.expiresAt > 0 && item.expiresAt <= Date.now()) {
      this.storage.delete(key);
      return null;
    }
    
    let value = item.value;
    
    // Decrypt if encrypted
    if (item.encrypted) {
      try {
        value = Encryption.decrypt(value);
      } catch {
        console.error('Failed to decrypt stored value');
        return null;
      }
    }
    
    // Try to parse as JSON
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  /**
   * Remove a value from storage
   */
  remove(key: string): void {
    this.storage.delete(key);
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    const item = this.storage.get(key);
    
    if (!item) return false;
    
    // Check expiration
    if (item.expiresAt > 0 && item.expiresAt <= Date.now()) {
      this.storage.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all stored values
   */
  clearAll(): void {
    this.storage.clear();
  }

  /**
   * Get storage size
   */
  size(): number {
    return this.storage.size;
  }

  /**
   * Stop the timeout checker (for cleanup)
   */
  destroy(): void {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }
    this.clearAll();
  }

  /**
   * Get time until session expires
   */
  getTimeUntilExpiry(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - elapsed);
  }

  /**
   * Extend session by updating activity
   */
  extendSession(): void {
    this.updateActivity();
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.storage.keys());
  }
}

// Export singleton instance
export const SecureStorage = new SecureStorageClass();

// Export class for testing/custom instances
export { SecureStorageClass };

// Convenience methods for auth tokens
export const SecureTokenStorage = {
  setAccessToken(token: string, expiresIn: number = 3600): void {
    SecureStorage.set('access_token', token, { 
      ttlMs: expiresIn * 1000,
      encrypt: true 
    });
  },

  getAccessToken(): string | null {
    return SecureStorage.get<string>('access_token');
  },

  setRefreshToken(token: string): void {
    SecureStorage.set('refresh_token', token, { 
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      encrypt: true 
    });
  },

  getRefreshToken(): string | null {
    return SecureStorage.get<string>('refresh_token');
  },

  setUser(user: object): void {
    SecureStorage.set('user', user, { encrypt: true });
  },

  getUser<T = object>(): T | null {
    return SecureStorage.get<T>('user');
  },

  clearAuth(): void {
    SecureStorage.remove('access_token');
    SecureStorage.remove('refresh_token');
    SecureStorage.remove('user');
  },

  isAuthenticated(): boolean {
    return SecureStorage.has('access_token') && SecureStorage.has('user');
  }
};

export default SecureStorage;
