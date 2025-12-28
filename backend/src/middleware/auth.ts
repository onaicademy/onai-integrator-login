/**
 * Supabase Authentication Middleware
 * JWT verification for LMS/Integrator API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface JWTPayload {
  sub: string; // user UUID
  email: string;
  role?: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role?: string;
  };
}

/**
 * Verify Supabase JWT token and attach user info to request
 */
export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user info to request
    req.user = {
      userId: data.user.id,
      email: data.user.email || '',
      role: data.user.user_metadata?.role,
    };

    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Authentication failed:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Alias for authMiddleware (for backward compatibility)
 */
export const authenticateJWT = authMiddleware;

/**
 * Admin-only middleware (can be chained after authMiddleware)
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

/**
 * Sales or Admin middleware (for Tripwire Manager)
 */
export function requireSalesOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'sales')) {
    return res.status(403).json({ error: 'Sales or Admin access required' });
  }

  next();
}
