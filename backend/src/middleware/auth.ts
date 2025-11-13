import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

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

    // Верифицировать JWT токен
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    req.user = decoded as any;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Экспортируем также под старым именем для совместимости
export const authMiddleware = authenticateJWT;

