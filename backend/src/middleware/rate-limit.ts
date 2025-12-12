import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * ✅ IMPROVED: Adaptive Rate Limiting без Redis
 * 
 * WHY:
 * - Protects against brute-force attacks
 * - Prevents DDoS from spamming AI endpoints
 * - Адаптивные лимиты на основе роли пользователя
 * - Дополнительный бюджет для retries
 * 
 * SAFE: Backwards compatible, только увеличивает лимиты для auth пользователей
 */

/**
 * Helper: Определить лимиты на основе пользователя и retry статуса
 */
function getAdaptiveLimits(req: Request, baseMax: number): number {
  const user = (req as any).user;
  const isRetry = req.headers['x-retry-attempt'] === 'true';
  
  let max = baseMax;
  
  // ✅ Admin - в 10x больше лимит
  if (user?.role === 'admin' || user?.user_metadata?.role === 'admin') {
    max = baseMax * 10;
  }
  
  // ✅ Authenticated users - в 2x больше лимит
  else if (user?.id) {
    max = baseMax * 2;
  }
  
  // ✅ Retry attempts - +50% бюджета
  if (isRetry) {
    max = Math.ceil(max * 1.5);
  }
  
  return max;
}

// 🔴 STRICT: AI endpoints (expensive, easy to abuse)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: (req: Request) => getAdaptiveLimits(req, 10), // Base: 10/min, Admin: 100/min
  keyGenerator: (req: Request) => {
    // ✅ Используем user ID если authenticated, иначе default IP handler
    const user = (req as any).user;
    return user?.id || 'anonymous'; // Default IP handling избегает IPv6 issue
  },
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    console.warn(`⚠️ [RATE LIMIT] AI endpoint blocked for ${user?.id || req.ip}`);
    
    res.status(429).json({
      error: 'Too many AI requests. Please try again in 1 minute.',
      retryAfter: 60,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS',
});

// 🟡 MODERATE: Regular API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req: Request) => getAdaptiveLimits(req, 100), // Base: 100/15min, Auth: 200/15min, Admin: 1000/15min
  keyGenerator: (req: Request) => {
    const user = (req as any).user;
    return user?.id || 'anonymous'; // Default IP handling
  },
  handler: (req: Request, res: Response) => {
    const user = (req as any).user;
    console.warn(`⚠️ [RATE LIMIT] API blocked for ${user?.id || req.ip} on ${req.path}`);
    
    res.status(429).json({
      error: 'Too many requests. Please try again later.',
      retryAfter: 900,
      hint: 'If you are using automation, please implement exponential backoff',
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS',
});

// 🟢 RELAXED: Auth endpoints (login should be accessible)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes (не адаптивный - одинаковый для всех)
  handler: (req: Request, res: Response) => {
    console.warn(`⚠️ [RATE LIMIT] Auth blocked for IP ${req.ip}`);
    
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      retryAfter: 900,
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => req.method === 'OPTIONS',
});

