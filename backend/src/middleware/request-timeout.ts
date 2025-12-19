/**
 * 🕐 REQUEST TIMEOUT MIDDLEWARE
 * 
 * Prevents requests from hanging indefinitely.
 * Different timeout configurations for different route types.
 */

import { Request, Response, NextFunction } from 'express';

// ═══════════════════════════════════════════════════════════════
// 🎯 TIMEOUT CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const TIMEOUT_CONFIGS = {
  // Quick operations (read-only, simple queries)
  FAST: 5000,           // 5 seconds
  
  // Standard API operations
  STANDARD: 15000,      // 15 seconds
  
  // Complex operations (reports, aggregations)
  COMPLEX: 30000,       // 30 seconds
  
  // External API calls (FB, AmoCRM)
  EXTERNAL_API: 60000,  // 1 minute
  
  // AI operations (OpenAI, Groq)
  AI_PROCESSING: 120000, // 2 minutes
  
  // File uploads
  FILE_UPLOAD: 600000,  // 10 minutes
  
  // Video processing
  VIDEO_PROCESSING: 3600000, // 1 hour
};

// Route patterns and their timeout configurations
const ROUTE_TIMEOUT_PATTERNS: Array<{ pattern: RegExp | string; timeout: number }> = [
  // Health checks - very fast
  { pattern: /^\/health$/i, timeout: TIMEOUT_CONFIGS.FAST },
  { pattern: /^\/api\/health$/i, timeout: TIMEOUT_CONFIGS.FAST },
  
  // Auth routes - fast
  { pattern: /^\/api\/traffic-auth/i, timeout: TIMEOUT_CONFIGS.STANDARD },
  { pattern: /^\/api\/auth/i, timeout: TIMEOUT_CONFIGS.STANDARD },
  
  // AI routes - longer timeout
  { pattern: /^\/api\/ai/i, timeout: TIMEOUT_CONFIGS.AI_PROCESSING },
  { pattern: /^\/api\/openai/i, timeout: TIMEOUT_CONFIGS.AI_PROCESSING },
  { pattern: /^\/api\/tripwire\/ai/i, timeout: TIMEOUT_CONFIGS.AI_PROCESSING },
  
  // File uploads - longest timeout
  { pattern: /^\/api\/stream\/upload/i, timeout: TIMEOUT_CONFIGS.VIDEO_PROCESSING },
  { pattern: /^\/api\/materials\/upload/i, timeout: TIMEOUT_CONFIGS.FILE_UPLOAD },
  { pattern: /^\/api\/videos\/upload/i, timeout: TIMEOUT_CONFIGS.FILE_UPLOAD },
  
  // External API integrations
  { pattern: /^\/api\/facebook-ads/i, timeout: TIMEOUT_CONFIGS.EXTERNAL_API },
  { pattern: /^\/api\/traffic\/combined-analytics/i, timeout: TIMEOUT_CONFIGS.EXTERNAL_API },
  { pattern: /^\/api\/traffic\/sales/i, timeout: TIMEOUT_CONFIGS.EXTERNAL_API },
  { pattern: /^\/api\/amocrm/i, timeout: TIMEOUT_CONFIGS.EXTERNAL_API },
  { pattern: /^\/api\/landing/i, timeout: TIMEOUT_CONFIGS.EXTERNAL_API },
  
  // Reports and analytics - complex
  { pattern: /^\/api\/analytics/i, timeout: TIMEOUT_CONFIGS.COMPLEX },
  { pattern: /^\/api\/traffic-reports/i, timeout: TIMEOUT_CONFIGS.COMPLEX },
  { pattern: /^\/api\/utm-analytics/i, timeout: TIMEOUT_CONFIGS.COMPLEX },
  
  // Default for all other routes
  { pattern: /.*/, timeout: TIMEOUT_CONFIGS.STANDARD },
];

// ═══════════════════════════════════════════════════════════════
// 🛡️ TIMEOUT MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Get timeout for a specific route
 */
function getTimeoutForRoute(path: string): number {
  for (const { pattern, timeout } of ROUTE_TIMEOUT_PATTERNS) {
    if (typeof pattern === 'string' && path.includes(pattern)) {
      return timeout;
    }
    if (pattern instanceof RegExp && pattern.test(path)) {
      return timeout;
    }
  }
  return TIMEOUT_CONFIGS.STANDARD;
}

/**
 * Request timeout middleware
 * Automatically times out requests that exceed their allowed time
 */
export function requestTimeout(
  customTimeout?: number
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = customTimeout || getTimeoutForRoute(req.path);
    
    // Skip timeout for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    // Store timeout value on request for debugging
    (req as any).timeoutMs = timeout;
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        const requestId = (req as any).requestId || 'unknown';
        
        console.error(`🕐 REQUEST TIMEOUT: ${req.method} ${req.path} (${timeout}ms exceeded)`, {
          requestId,
          timeout,
          user: (req as any).user?.email || 'anonymous',
          ip: req.ip,
        });
        
        res.status(504).json({
          success: false,
          error: {
            message: 'Request timeout - operation took too long',
            type: 'TIMEOUT_ERROR',
            code: 'REQUEST_TIMEOUT',
            requestId,
            timeout: `${timeout}ms`,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }, timeout);
    
    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    res.on('close', () => {
      clearTimeout(timeoutId);
    });
    
    next();
  };
}

/**
 * Create timeout middleware with custom timeout
 */
export function createTimeoutMiddleware(timeoutMs: number) {
  return requestTimeout(timeoutMs);
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER: Promise with timeout
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap any promise with a timeout
 * Useful for external API calls
 */
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  }) as Promise<T>;
}

/**
 * Retry with exponential backoff
 * For unreliable external services
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    timeoutMs?: number;
    shouldRetry?: (error: any, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    timeoutMs = 30000,
    shouldRetry = () => true,
  } = options;
  
  let lastError: any;
  let delay = initialDelayMs;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      if (timeoutMs) {
        return await promiseWithTimeout(fn(), timeoutMs, `Attempt ${attempt} timed out`);
      }
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (attempt > maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      console.warn(`⚠️ Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }
  
  throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// 📊 SLOW REQUEST LOGGING
// ═══════════════════════════════════════════════════════════════

const SLOW_REQUEST_THRESHOLD_MS = 3000; // 3 seconds

/**
 * Log slow requests for performance monitoring
 */
export function slowRequestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      console.warn(`🐢 SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`, {
        duration,
        status: res.statusCode,
        user: (req as any).user?.email || 'anonymous',
        requestId: (req as any).requestId,
      });
    }
  });
  
  next();
}

export default requestTimeout;
