/**
 * Backend Rate Limiter Middleware
 * Protects against DDoS and brute force attacks
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

interface RateLimitConfig {
  windowMs: number;           // Time window in ms
  maxRequests: number;        // Max requests per window
  blockDurationMs: number;    // How long to block after limit exceeded
  message?: string;           // Custom error message
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

// In-memory store (use Redis for production with multiple instances)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configurations for different endpoints
const ENDPOINT_CONFIGS: Record<string, RateLimitConfig> = {
  // Auth endpoints - strict limits
  '/api/traffic-auth/login': {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,            // 5 attempts
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
    message: 'Too many login attempts. Please try again later.'
  },
  '/api/traffic-auth/register': {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 3,            // 3 registrations per hour
    blockDurationMs: 60 * 60 * 1000,
    message: 'Registration limit exceeded. Please try again later.'
  },
  '/api/traffic-auth/refresh': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 10,           // 10 refresh attempts
    blockDurationMs: 60 * 1000,
    message: 'Too many token refresh attempts.'
  },
  
  // API endpoints - standard limits
  'default': {
    windowMs: 60 * 1000,       // 1 minute
    maxRequests: 100,          // 100 requests per minute
    blockDurationMs: 60 * 1000,
    message: 'Too many requests. Please slow down.'
  }
};

/**
 * Get IP address from request
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Generate rate limit key
 */
function generateKey(req: Request, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(req);
  }
  
  const ip = getClientIP(req);
  const path = req.path;
  return `ratelimit:${ip}:${path}`;
}

/**
 * Get configuration for endpoint
 */
function getConfig(path: string): RateLimitConfig {
  // Check for exact match
  if (ENDPOINT_CONFIGS[path]) {
    return ENDPOINT_CONFIGS[path];
  }
  
  // Check for prefix match
  for (const [pattern, config] of Object.entries(ENDPOINT_CONFIGS)) {
    if (pattern !== 'default' && path.startsWith(pattern)) {
      return config;
    }
  }
  
  return ENDPOINT_CONFIGS['default'];
}

/**
 * Clean expired entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries that are not blocked and window has passed
    if (!entry.blocked && now - entry.firstRequest > 24 * 60 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
    // Unblock entries whose block duration has passed
    if (entry.blocked && entry.blockedUntil && now > entry.blockedUntil) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Rate Limiter Middleware Factory
 */
export function createRateLimiter(customConfig?: Partial<RateLimitConfig>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const config = { ...getConfig(req.path), ...customConfig };
    const key = generateKey(req, config);
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // Check if currently blocked
    if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Reset', String(entry.blockedUntil));
      
      console.warn(`⚠️ [RateLimit] Blocked request from ${getClientIP(req)} to ${req.path}`);
      
      return res.status(429).json({
        error: config.message || 'Too many requests',
        retryAfter,
        blockedUntil: new Date(entry.blockedUntil).toISOString()
      });
    }
    
    // Reset if window has passed
    if (!entry || now - entry.firstRequest > config.windowMs) {
      entry = {
        count: 1,
        firstRequest: now,
        blocked: false
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      entry.blockedUntil = now + config.blockDurationMs;
      rateLimitStore.set(key, entry);
      
      const retryAfter = Math.ceil(config.blockDurationMs / 1000);
      
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Reset', String(entry.blockedUntil));
      
      console.warn(`⚠️ [RateLimit] Blocking ${getClientIP(req)} for ${req.path} - exceeded ${config.maxRequests} requests`);
      
      return res.status(429).json({
        error: config.message || 'Too many requests',
        retryAfter,
        blockedUntil: new Date(entry.blockedUntil).toISOString()
      });
    }
    
    // Set rate limit headers
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const resetTime = entry.firstRequest + config.windowMs;
    
    res.set('X-RateLimit-Limit', String(config.maxRequests));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(resetTime));
    
    next();
  };
}

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
  message: 'Too many attempts. Please try again later.'
});

/**
 * Standard rate limiter for general API
 */
export const standardRateLimiter = createRateLimiter();

/**
 * Relaxed rate limiter for read-only endpoints
 */
export const relaxedRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 200,
  blockDurationMs: 30 * 1000
});

/**
 * IP Blacklist (for known bad actors)
 */
const ipBlacklist = new Set<string>();

export function addToBlacklist(ip: string): void {
  ipBlacklist.add(ip);
  console.warn(`🚫 [Security] IP blacklisted: ${ip}`);
}

export function removeFromBlacklist(ip: string): void {
  ipBlacklist.delete(ip);
}

export function isBlacklisted(ip: string): boolean {
  return ipBlacklist.has(ip);
}

/**
 * IP Blacklist Middleware
 */
export function blacklistMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  
  if (isBlacklisted(ip)) {
    console.warn(`🚫 [Security] Blocked blacklisted IP: ${ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  
  next();
}

/**
 * Security Headers Middleware
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
  
  // HSTS (if using HTTPS)
  if (req.secure) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

/**
 * Request Logging Middleware for Security Audit
 */
export function securityAuditMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const ip = getClientIP(req);
  
  // Log after response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      // Don't log sensitive data
      query: Object.keys(req.query).length > 0 ? '[FILTERED]' : undefined
    };
    
    // Log suspicious activity
    if (res.statusCode >= 400) {
      console.warn(`⚠️ [Audit] ${JSON.stringify(logEntry)}`);
    }
    
    // Detect potential attacks
    if (res.statusCode === 401 || res.statusCode === 403) {
      // Track failed auth attempts
      const authFailKey = `authfail:${ip}`;
      const fails = (rateLimitStore.get(authFailKey)?.count || 0) + 1;
      rateLimitStore.set(authFailKey, {
        count: fails,
        firstRequest: Date.now(),
        blocked: false
      });
      
      // Auto-blacklist after too many failures
      if (fails >= 50) {
        addToBlacklist(ip);
      }
    }
  });
  
  next();
}

export default {
  createRateLimiter,
  strictRateLimiter,
  standardRateLimiter,
  relaxedRateLimiter,
  blacklistMiddleware,
  securityHeadersMiddleware,
  securityAuditMiddleware,
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted
};
