/**
 * Rate Limiter for Frontend DDoS Protection
 * Prevents excessive API requests and protects against abuse
 */

interface RateLimitConfig {
  maxRequests: number;      // Max requests in window
  windowMs: number;         // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

interface RequestLog {
  timestamp: number;
  endpoint: string;
}

interface BlockedEndpoint {
  endpoint: string;
  blockedUntil: number;
  reason: string;
}

class RateLimiterClass {
  private requestLogs: RequestLog[] = [];
  private blockedEndpoints: Map<string, BlockedEndpoint> = new Map();
  
  // Default configurations
  private globalConfig: RateLimitConfig = {
    maxRequests: 60,        // 60 requests per minute
    windowMs: 60 * 1000,    // 1 minute window
    blockDurationMs: 60 * 1000 // Block for 1 minute
  };
  
  private endpointConfigs: Map<string, RateLimitConfig> = new Map([
    // Stricter limits for auth endpoints
    ['/api/traffic-auth/login', { maxRequests: 5, windowMs: 60 * 1000, blockDurationMs: 5 * 60 * 1000 }],
    ['/api/traffic-auth/refresh', { maxRequests: 10, windowMs: 60 * 1000, blockDurationMs: 60 * 1000 }],
    // Higher limits for read-only endpoints
    ['/api/traffic-analytics', { maxRequests: 100, windowMs: 60 * 1000, blockDurationMs: 30 * 1000 }],
  ]);
  
  private requestsPerSecondLimit: number = 10;
  private lastSecondRequests: number = 0;
  private lastSecondTimestamp: number = 0;

  constructor() {
    // Clean old logs every minute
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanOldLogs(), 60 * 1000);
    }
  }

  /**
   * Clean logs older than the longest window
   */
  private cleanOldLogs(): void {
    const maxWindow = 5 * 60 * 1000; // Keep 5 minutes of logs
    const cutoff = Date.now() - maxWindow;
    this.requestLogs = this.requestLogs.filter(log => log.timestamp > cutoff);
    
    // Clean expired blocks
    const now = Date.now();
    for (const [key, block] of this.blockedEndpoints.entries()) {
      if (block.blockedUntil <= now) {
        this.blockedEndpoints.delete(key);
      }
    }
  }

  /**
   * Get config for specific endpoint or global config
   */
  private getConfig(endpoint: string): RateLimitConfig {
    // Check for exact match
    if (this.endpointConfigs.has(endpoint)) {
      return this.endpointConfigs.get(endpoint)!;
    }
    
    // Check for pattern match (e.g., /api/traffic-*)
    for (const [pattern, config] of this.endpointConfigs.entries()) {
      if (endpoint.startsWith(pattern.replace('*', ''))) {
        return config;
      }
    }
    
    return this.globalConfig;
  }

  /**
   * Check if an endpoint is currently blocked
   */
  isBlocked(endpoint: string): boolean {
    // Check global block
    const globalBlock = this.blockedEndpoints.get('*');
    if (globalBlock && globalBlock.blockedUntil > Date.now()) {
      return true;
    }
    
    // Check endpoint-specific block
    const endpointBlock = this.blockedEndpoints.get(endpoint);
    if (endpointBlock && endpointBlock.blockedUntil > Date.now()) {
      return true;
    }
    
    return false;
  }

  /**
   * Get remaining time until unblock (in ms)
   */
  getBlockedRemainingTime(endpoint: string): number {
    const block = this.blockedEndpoints.get(endpoint) || this.blockedEndpoints.get('*');
    if (block && block.blockedUntil > Date.now()) {
      return block.blockedUntil - Date.now();
    }
    return 0;
  }

  /**
   * Block an endpoint
   */
  private blockEndpoint(endpoint: string, reason: string): void {
    const config = this.getConfig(endpoint);
    const blockDuration = config.blockDurationMs || 60 * 1000;
    
    this.blockedEndpoints.set(endpoint, {
      endpoint,
      blockedUntil: Date.now() + blockDuration,
      reason
    });
    
    console.warn(`⚠️ [RateLimiter] Endpoint blocked: ${endpoint} - ${reason}`);
  }

  /**
   * Check rate limit and record request
   * Returns true if request is allowed, false if rate limited
   */
  checkAndRecord(endpoint: string): { allowed: boolean; reason?: string; retryAfterMs?: number } {
    const now = Date.now();
    
    // Check if blocked
    if (this.isBlocked(endpoint)) {
      const retryAfterMs = this.getBlockedRemainingTime(endpoint);
      return {
        allowed: false,
        reason: 'Endpoint temporarily blocked due to rate limiting',
        retryAfterMs
      };
    }
    
    // Check requests per second limit (DDoS protection)
    if (now - this.lastSecondTimestamp < 1000) {
      this.lastSecondRequests++;
      if (this.lastSecondRequests > this.requestsPerSecondLimit) {
        this.blockEndpoint('*', 'Too many requests per second (possible DDoS)');
        return {
          allowed: false,
          reason: 'Too many requests per second',
          retryAfterMs: 60 * 1000
        };
      }
    } else {
      this.lastSecondTimestamp = now;
      this.lastSecondRequests = 1;
    }
    
    const config = this.getConfig(endpoint);
    const windowStart = now - config.windowMs;
    
    // Count requests in window for this endpoint
    const recentRequests = this.requestLogs.filter(
      log => log.timestamp > windowStart && log.endpoint === endpoint
    );
    
    if (recentRequests.length >= config.maxRequests) {
      this.blockEndpoint(endpoint, `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowMs / 1000}s`);
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowMs / 1000} seconds`,
        retryAfterMs: config.blockDurationMs
      };
    }
    
    // Record the request
    this.requestLogs.push({ timestamp: now, endpoint });
    
    return { allowed: true };
  }

  /**
   * Get current rate limit status for an endpoint
   */
  getStatus(endpoint: string): {
    requestsInWindow: number;
    maxRequests: number;
    windowMs: number;
    remaining: number;
    isBlocked: boolean;
    blockedReason?: string;
  } {
    const config = this.getConfig(endpoint);
    const windowStart = Date.now() - config.windowMs;
    
    const recentRequests = this.requestLogs.filter(
      log => log.timestamp > windowStart && log.endpoint === endpoint
    );
    
    const block = this.blockedEndpoints.get(endpoint);
    
    return {
      requestsInWindow: recentRequests.length,
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      remaining: Math.max(0, config.maxRequests - recentRequests.length),
      isBlocked: this.isBlocked(endpoint),
      blockedReason: block?.reason
    };
  }

  /**
   * Set custom rate limit for an endpoint
   */
  setEndpointLimit(endpoint: string, config: RateLimitConfig): void {
    this.endpointConfigs.set(endpoint, config);
  }

  /**
   * Set global rate limit
   */
  setGlobalLimit(config: RateLimitConfig): void {
    this.globalConfig = config;
  }

  /**
   * Manually unblock an endpoint
   */
  unblock(endpoint: string): void {
    this.blockedEndpoints.delete(endpoint);
  }

  /**
   * Get all current blocks
   */
  getBlocks(): BlockedEndpoint[] {
    return Array.from(this.blockedEndpoints.values()).filter(
      block => block.blockedUntil > Date.now()
    );
  }

  /**
   * Reset all rate limiting (for testing)
   */
  reset(): void {
    this.requestLogs = [];
    this.blockedEndpoints.clear();
    this.lastSecondRequests = 0;
  }
}

// Export singleton instance
export const RateLimiter = new RateLimiterClass();

// Export class for testing/custom instances
export { RateLimiterClass };

// Middleware-style function for use with API clients
export function rateLimitMiddleware(endpoint: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const result = RateLimiter.checkAndRecord(endpoint);
    
    if (result.allowed) {
      resolve();
    } else {
      const error = new Error(result.reason || 'Rate limit exceeded');
      (error as any).retryAfterMs = result.retryAfterMs;
      (error as any).isRateLimitError = true;
      reject(error);
    }
  });
}

export default RateLimiter;
