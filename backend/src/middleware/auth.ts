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

    console.log('🔍 [authenticateJWT] Request:', req.method, req.path);
    console.log('🔍 [authenticateJWT] Auth header present:', !!authHeader);
    console.log('🔍 [authenticateJWT] Token present:', !!token);

    if (!token) {
      console.error('❌ [authenticateJWT] No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    // ✅ FIX: Use correct JWT secret based on endpoint
    // Tripwire endpoints use TRIPWIRE_JWT_SECRET, others use SUPABASE_JWT_SECRET
    const isTripwireEndpoint = req.originalUrl.includes('/tripwire');
    const jwtSecret = isTripwireEndpoint 
      ? process.env.TRIPWIRE_JWT_SECRET 
      : process.env.SUPABASE_JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('❌ [authenticateJWT] JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    console.log('🔍 [authenticateJWT] Using', isTripwireEndpoint ? 'TRIPWIRE' : 'MAIN', 'JWT secret');

    let decoded: any;
    try {
      // ✅ SECURE: Verify signature before trusting the token
      decoded = jwt.verify(token, jwtSecret) as any;
    } catch (verifyError: any) {
      console.error('❌ [authenticateJWT] Token verification failed:', verifyError.message);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    console.log('🔍 [authenticateJWT] Verified token:', {
      sub: decoded?.sub,
      email: decoded?.email,
      iss: decoded?.iss
    });
    
    if (!decoded || !decoded.sub) {
      console.error('❌ [authenticateJWT] Invalid token payload');
      return res.status(401).json({ error: 'Invalid token format' });
    }
    
    req.user = decoded;
    console.log('✅ [authenticateJWT] User authenticated:', decoded.email);
    next();
  } catch (error) {
    console.error('❌ [authenticateJWT] Auth error:', error);
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

    // ✅ Определяем какую БД использовать на основе endpoint
    const isTripwireEndpoint = req.originalUrl.includes('/tripwire');
    let supabase: any;

    if (isTripwireEndpoint) {
      // Tripwire endpoint → используем Tripwire DB
      supabase = createClient(
        process.env.TRIPWIRE_SUPABASE_URL!,
        process.env.TRIPWIRE_SERVICE_ROLE_KEY!
      );
      console.log('✅ [requireAdmin] Using TRIPWIRE DB');
    } else {
      // Main endpoint → используем Main DB
      supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('✅ [requireAdmin] Using MAIN DB');
    }

    // ✅ Получаем роль из auth.users.user_metadata (для Tripwire) или users table (для Main)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(req.user.sub);

    if (authError || !authUser.user) {
      console.error('❌ requireAdmin: Failed to fetch auth user:', authError);
      return res.status(403).json({ error: 'Access denied. Could not verify user role.' });
    }

    // Получаем роль из user_metadata (Tripwire) или пробуем из public.users (Main)
    let userRole: string | undefined = authUser.user.user_metadata?.role;

    // Если роли нет в metadata, пробуем public.users (для Main Platform)
    if (!userRole && !isTripwireEndpoint) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.sub)
        .single();
      
      userRole = userProfile?.role;
    }

    if (!userRole || userRole !== 'admin') {
      console.log(`❌ requireAdmin: Access denied for ${req.user.email} (role: ${userRole})`);
      return res.status(403).json({ 
        error: 'Access denied. Admin role required.',
        currentRole: userRole || 'student'
      });
    }

    console.log(`✅ requireAdmin: Access granted for ${req.user.email} (admin)`);
    next();
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return res.status(403).json({ error: 'Access denied' });
  }
}

/**
 * Middleware для проверки роли админа ИЛИ sales manager (для Tripwire)
 * Использовать ПОСЛЕ authenticateJWT
 * 
 * ✅ ВАЖНО: Проверяет роль В ТОЙ ЖЕ БАЗЕ, откуда пришёл токен!
 * - Токен от Tripwire Auth → Проверка в Tripwire DB
 * - Токен от Main Auth → Проверка в Main DB
 */
export async function requireSalesOrAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 🔍 ОПРЕДЕЛЯЕМ ИСТОЧНИК ТОКЕНА по пути запроса
    // ⚠️  ВАЖНО: req.path НЕ СОДЕРЖИТ базовый путь роутера!
    // Используем req.originalUrl для проверки полного пути
    const isTripwireEndpoint = req.originalUrl.includes('/tripwire');
    
    console.log('🔍 [requireSalesOrAdmin] Full URL:', req.originalUrl);
    console.log('🔍 [requireSalesOrAdmin] Is Tripwire endpoint?', isTripwireEndpoint);
    
    // ✅ Выбираем нужную базу данных
    let supabase;
    if (isTripwireEndpoint) {
      // Tripwire endpoint → проверяем в Tripwire DB
      const { tripwireAdminSupabase } = await import('../config/supabase-tripwire');
      supabase = tripwireAdminSupabase;
      console.log('✅ [requireSalesOrAdmin] Using TRIPWIRE DB');
    } else {
      // Main endpoint → проверяем в Main DB
      supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log('✅ [requireSalesOrAdmin] Using MAIN DB');
    }

    // ✅ FIX: Используем auth.admin.getUserById вместо public.users
    // Роль хранится в user_metadata (для Tripwire users)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(req.user.sub);

    if (authError || !authUser.user) {
      console.error('❌ requireSalesOrAdmin: Failed to fetch auth user:', authError);
      console.error('   User ID:', req.user.sub);
      console.error('   Database:', isTripwireEndpoint ? 'TRIPWIRE' : 'MAIN');
      return res.status(403).json({ error: 'Access denied. Could not verify user role.' });
    }

    // Получаем роль из user_metadata (Tripwire) или пробуем из public.users (Main)
    let userRole: string | undefined = authUser.user.user_metadata?.role;
    let userEmail = authUser.user.email;

    // Если роли нет в metadata, пробуем public.users (для Main Platform)
    if (!userRole && !isTripwireEndpoint) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.sub)
        .single();
      
      userRole = userProfile?.role;
    }

    if (!userRole) {
      console.error('❌ requireSalesOrAdmin: No role found for user', userEmail);
      return res.status(403).json({ error: 'Access denied. No role assigned.' });
    }

    // ✅ Разрешаем доступ для admin и sales
    if (userRole !== 'admin' && userRole !== 'sales') {
      console.log(`❌ requireSalesOrAdmin: Access denied for ${userEmail} (role: ${userRole})`);
      return res.status(403).json({ 
        error: 'Access denied. Admin or Sales role required.',
        currentRole: userRole || 'student'
      });
    }

    console.log(`✅ requireSalesOrAdmin: Access granted for ${userEmail} (${userRole})`);
    next();
  } catch (error) {
    console.error('❌ Sales/Admin check error:', error);
    return res.status(403).json({ error: 'Access denied' });
  }
}

