/**
 * 🛡️ INPUT VALIDATION & SANITIZATION
 * 
 * Production-ready input validation with:
 * - XSS prevention
 * - SQL injection prevention
 * - Request body size limits
 * - Content type validation
 * - Parameter sanitization
 */

import { Request, Response, NextFunction } from 'express';

// ═══════════════════════════════════════════════════════════════
// 🎯 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const VALIDATION_CONFIG = {
  // Maximum request body sizes (in bytes)
  MAX_JSON_SIZE: 10 * 1024 * 1024,  // 10MB for JSON
  MAX_URL_ENCODED_SIZE: 1 * 1024 * 1024,  // 1MB for URL encoded
  
  // String length limits
  MAX_STRING_LENGTH: 50000,  // 50KB per string field
  MAX_EMAIL_LENGTH: 254,
  MAX_URL_LENGTH: 2048,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 6,
  
  // Array limits
  MAX_ARRAY_LENGTH: 1000,
  
  // Nested object depth
  MAX_OBJECT_DEPTH: 10,
  
  // Dangerous patterns to block
  BLOCKED_PATTERNS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // Script tags
    /javascript:/gi,  // JavaScript protocol
    /on\w+\s*=/gi,  // Event handlers (onclick, onerror, etc.)
    /data:\s*[^,]*base64/gi,  // Base64 data URIs (can hide scripts)
  ],
  
  // SQL injection patterns
  SQL_PATTERNS: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/gi,
    /--/g,  // SQL comments
    /;\s*\w+\s+/gi,  // Chained statements
    /\'\s*OR\s*\'1\'\s*=\s*\'1/gi,  // Classic injection
    /\bEXEC\s*\(/gi,  // EXEC calls
  ],
};

// ═══════════════════════════════════════════════════════════════
// 🔧 SANITIZATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return str;
  
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return str.replace(/[&<>"'/]/g, char => htmlEscapes[char] || char);
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(str: string): string {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string for safe use
 */
export function sanitizeString(str: string, options: {
  stripHtml?: boolean;
  escapeHtml?: boolean;
  maxLength?: number;
  trim?: boolean;
} = {}): string {
  if (typeof str !== 'string') return str;
  
  let result = str;
  
  // Trim whitespace
  if (options.trim !== false) {
    result = result.trim();
  }
  
  // Limit length
  if (options.maxLength && result.length > options.maxLength) {
    result = result.substring(0, options.maxLength);
  }
  
  // Strip HTML if requested
  if (options.stripHtml) {
    result = stripHtml(result);
  }
  
  // Escape HTML if requested (default for output)
  if (options.escapeHtml) {
    result = escapeHtml(result);
  }
  
  return result;
}

/**
 * Check for dangerous patterns
 */
export function containsDangerousPatterns(str: string): boolean {
  if (typeof str !== 'string') return false;
  
  return VALIDATION_CONFIG.BLOCKED_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Check for potential SQL injection
 */
export function containsSqlInjection(str: string): boolean {
  if (typeof str !== 'string') return false;
  
  // Only check if string contains suspicious characters
  if (!str.includes("'") && !str.includes('"') && !str.includes(';') && !str.includes('--')) {
    return false;
  }
  
  return VALIDATION_CONFIG.SQL_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Recursively sanitize an object
 */
export function sanitizeObject(
  obj: any,
  depth: number = 0,
  options: {
    stripHtml?: boolean;
    escapeHtml?: boolean;
    maxStringLength?: number;
    maxArrayLength?: number;
    maxDepth?: number;
  } = {}
): any {
  const maxDepth = options.maxDepth || VALIDATION_CONFIG.MAX_OBJECT_DEPTH;
  const maxStringLength = options.maxStringLength || VALIDATION_CONFIG.MAX_STRING_LENGTH;
  const maxArrayLength = options.maxArrayLength || VALIDATION_CONFIG.MAX_ARRAY_LENGTH;
  
  // Prevent infinite recursion
  if (depth > maxDepth) {
    console.warn('⚠️ Object depth exceeded maximum, truncating');
    return null;
  }
  
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, {
      stripHtml: options.stripHtml,
      escapeHtml: options.escapeHtml,
      maxLength: maxStringLength,
    });
  }
  
  if (Array.isArray(obj)) {
    // Limit array length
    const limited = obj.slice(0, maxArrayLength);
    return limited.map(item => sanitizeObject(item, depth + 1, options));
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key as well
      const sanitizedKey = sanitizeString(key, { maxLength: 256 });
      result[sanitizedKey] = sanitizeObject(value, depth + 1, options);
    }
    return result;
  }
  
  // Numbers, booleans, etc. pass through
  return obj;
}

// ═══════════════════════════════════════════════════════════════
// ✅ VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  if (email.length > VALIDATION_CONFIG.MAX_EMAIL_LENGTH) return false;
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  if (url.length > VALIDATION_CONFIG.MAX_URL_LENGTH) return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
  if (typeof uuid !== 'string') return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }
  
  if (password.length < VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} characters`);
  }
  
  if (password.length > VALIDATION_CONFIG.MAX_PASSWORD_LENGTH) {
    errors.push(`Password cannot exceed ${VALIDATION_CONFIG.MAX_PASSWORD_LENGTH} characters`);
  }
  
  // Optional: Add more rules as needed
  // if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase');
  // if (!/[0-9]/.test(password)) errors.push('Password must contain number');
  
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════
// 🛡️ MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Input sanitization middleware
 * Sanitizes req.body, req.query, and req.params
 */
export function sanitizeInputMiddleware(
  options: {
    stripHtml?: boolean;
    checkDangerous?: boolean;
    checkSql?: boolean;
  } = {}
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { stripHtml = true, checkDangerous = true, checkSql = false } = options;
    
    // Helper to check content
    const checkContent = (obj: any, location: string): string | null => {
      if (!obj) return null;
      
      const jsonStr = JSON.stringify(obj);
      
      if (checkDangerous && containsDangerousPatterns(jsonStr)) {
        return `Potentially dangerous content detected in ${location}`;
      }
      
      if (checkSql && containsSqlInjection(jsonStr)) {
        return `Potential SQL injection detected in ${location}`;
      }
      
      return null;
    };
    
    try {
      // Check for dangerous content
      const bodyError = checkContent(req.body, 'request body');
      if (bodyError) {
        console.warn(`⚠️ ${bodyError}`, {
          path: req.path,
          ip: req.ip,
          user: (req as any).user?.email,
        });
        return res.status(400).json({
          success: false,
          error: {
            message: 'Invalid request content',
            code: 'INVALID_CONTENT',
          },
        });
      }
      
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body, 0, { stripHtml });
      }
      
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query, 0, { stripHtml }) as any;
      }
      
      // Sanitize URL parameters
      if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params, 0, { stripHtml });
      }
      
      next();
    } catch (error: any) {
      console.error('❌ Input sanitization error:', error.message);
      next(error);
    }
  };
}

/**
 * Content-Type validation middleware
 * Ensures requests have proper content types
 */
export function validateContentType(allowedTypes: string[] = ['application/json']) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for methods that typically don't have body
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }
    
    // Skip if no body
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    
    const contentType = req.headers['content-type'] || '';
    
    // Check if content type is allowed
    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );
    
    if (!isAllowed && !contentType.includes('multipart/form-data')) {
      return res.status(415).json({
        success: false,
        error: {
          message: `Unsupported Media Type. Expected: ${allowedTypes.join(' or ')}`,
          code: 'UNSUPPORTED_MEDIA_TYPE',
        },
      });
    }
    
    next();
  };
}

/**
 * Validate required fields middleware factory
 */
export function requireFields(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(field => {
      const value = req.body[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing required fields: ${missing.join(', ')}`,
          code: 'MISSING_REQUIRED_FIELDS',
          details: { missingFields: missing },
        },
      });
    }
    
    next();
  };
}

/**
 * Parameter ID validation middleware
 * Validates that :id parameters are valid UUIDs
 */
export function validateIdParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Missing ${paramName} parameter`,
          code: 'MISSING_PARAMETER',
        },
      });
    }
    
    // Allow both UUID and numeric IDs
    if (!isValidUuid(id) && !/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid ${paramName} format`,
          code: 'INVALID_PARAMETER',
        },
      });
    }
    
    next();
  };
}

export default {
  sanitizeInputMiddleware,
  validateContentType,
  requireFields,
  validateIdParam,
  sanitizeString,
  sanitizeObject,
  isValidEmail,
  isValidUrl,
  isValidUuid,
  isValidPassword,
  escapeHtml,
  stripHtml,
};
