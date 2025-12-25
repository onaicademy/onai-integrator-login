/**
 * Traffic Dashboard Authentication Middleware
 * JWT verification for Traffic Admin API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface TrafficJWTPayload {
  userId: string;
  email: string;
  team?: string;
  role?: string;
}

export function authenticateTrafficJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const decoded = jwt.verify(token, JWT_SECRET) as TrafficJWTPayload;

    // Attach user info to request object
    (req as any).user = {
      userId: decoded.userId,
      email: decoded.email,
      team: decoded.team,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('[Traffic Auth] JWT verification failed:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional: Admin-only middleware (can be chained after authenticateTrafficJWT)
 */
export function requireTrafficAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}
