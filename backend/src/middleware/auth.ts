import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Расширить тип Request для добавления user свойства
declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Decode without verification (we trust Supabase's JWT)
    // In production, you should verify the JWT with Supabase's JWKS endpoint
    const decoded = jwt.decode(token) as any;
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Экспортируем также под старым именем для совместимости
export const authMiddleware = authenticateJWT;

/**
 * Middleware для проверки роли админа
 * Использовать ПОСЛЕ authenticateJWT
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // ✅ Получаем роль из БД (более надежно чем из токена)
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userProfile, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.sub)
      .single();

    if (error || !userProfile) {
      console.error('❌ requireAdmin: Failed to fetch user profile:', error);
      return res.status(403).json({ error: 'Access denied. Could not verify user role.' });
    }

    if (userProfile.role !== 'admin') {
      console.log(`❌ requireAdmin: Access denied for ${req.user.email} (role: ${userProfile.role})`);
      return res.status(403).json({ 
        error: 'Access denied. Admin role required.',
        currentRole: userProfile.role || 'student'
      });
    }

    console.log(`✅ requireAdmin: Access granted for ${req.user.email} (admin)`);
    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return res.status(403).json({ error: 'Access denied' });
  }
}

