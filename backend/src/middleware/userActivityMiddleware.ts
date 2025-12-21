/**
 * User Activity Middleware
 * Logs API errors (4xx, 5xx) for authenticated users to user_activity_logs
 */

import { Request, Response, NextFunction } from 'express';
import { logUserActivity } from '../services/userActivityLogger';

/**
 * Middleware to log API errors for authenticated users
 * Captures 4xx and 5xx responses and stores them in user_activity_logs
 */
export function userActivityErrorLogger(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send;
  
  res.send = function(data: any): Response {
    const userId = (req as any).user?.sub;
    const statusCode = res.statusCode;
    
    // Log API errors only for authenticated users with Tripwire access
    if (userId && statusCode >= 400 && req.originalUrl.includes('/tripwire')) {
      // Truncate response data to prevent large payloads
      const responseSnippet = typeof data === 'string' 
        ? data.substring(0, 500) 
        : JSON.stringify(data).substring(0, 500);
      
      logUserActivity({
        userId,
        eventType: 'API_ERROR',
        eventCategory: 'error',
        message: `API Error: ${req.method} ${req.originalUrl} - ${statusCode}`,
        metadata: {
          method: req.method,
          url: req.originalUrl,
          statusCode,
          response: responseSnippet,
          userAgent: req.get('user-agent'),
          ip: req.ip,
        },
        severity: statusCode >= 500 ? 'error' : 'warning',
      }).catch(err => console.error('[USER ACTIVITY MIDDLEWARE] Error:', err));
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}
