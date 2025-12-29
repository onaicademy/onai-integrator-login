/**
 * Tripwire Authentication Middleware
 * JWT verification для Tripwire API endpoints
 *
 * ⚠️ ВАЖНО: Использует TRIPWIRE_SUPABASE_URL, а не SUPABASE_URL!
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL || '';
const tripwireServiceKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!tripwireUrl || !tripwireServiceKey) {
  console.error('❌ Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY');
  throw new Error('Missing Tripwire Supabase credentials');
}

const tripwireSupabase = createClient(tripwireUrl, tripwireServiceKey);

console.log('✅ [Tripwire Auth] Middleware initialized with URL:', tripwireUrl);

interface TripwireAuthRequest extends Request {
  user?: {
    sub: string;      // ✅ JWT standard claim for user ID
    id: string;       // ✅ Alias for compatibility
    userId: string;   // ✅ Legacy field
    email: string;
    role?: string;
    user_metadata?: any;
  };
}

/**
 * Verify Tripwire Supabase JWT token
 */
export async function authenticateTripwireJWT(req: TripwireAuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[Tripwire Auth] No authorization header');
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Tripwire Supabase
    const { data, error } = await tripwireSupabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('[Tripwire Auth] Token validation failed:', error?.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log(`✅ [Tripwire Auth] User authenticated: ${data.user.email} (${data.user.id})`);

    // Attach user info to request (with JWT standard claims)
    req.user = {
      sub: data.user.id,        // ✅ JWT standard claim for user ID
      id: data.user.id,         // ✅ Alias for compatibility
      userId: data.user.id,     // ✅ Legacy field
      email: data.user.email || '',
      role: data.user.user_metadata?.role || 'student',
      user_metadata: data.user.user_metadata,
    };

    next();
  } catch (error: any) {
    console.error('[Tripwire Auth] Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Require Sales or Admin role (for Tripwire Manager)
 */
export function requireTripwireSalesOrAdmin(req: TripwireAuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const role = req.user.role;

  if (role !== 'admin' && role !== 'sales' && role !== 'sales_manager') {
    console.warn(`[Tripwire Auth] Access denied for role: ${role}`);
    return res.status(403).json({ error: 'Sales or Admin access required', currentRole: role });
  }

  console.log(`✅ [Tripwire Auth] Access granted for role: ${role}`);
  next();
}

/**
 * Require Admin role only
 */
export function requireTripwireAdmin(req: TripwireAuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
