import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting middleware for API protection
 * 
 * WHY:
 * - Protects against brute-force attacks
 * - Prevents DDoS from spamming AI endpoints (costs money!)
 * - Protects against credential stuffing
 * 
 * SAFE: Only adds limits, doesn't change existing logic
 * 
 * NOTE: Using default keyGenerator (req.ip) with built-in IPv6 support
 */

// 🔴 STRICT: AI endpoints (expensive, easy to abuse)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  // Use default keyGenerator (properly handles IPv6)
  message: {
    error: 'Too many AI requests. Please try again in 1 minute.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🟡 MODERATE: Regular API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Too many requests. Please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🟢 RELAXED: Auth endpoints (login should be accessible)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 login attempts per 15 minutes
  message: {
    error: 'Too many login attempts. Please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
