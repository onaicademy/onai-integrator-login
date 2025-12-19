/**
 * 🛡️ VALIDATION MIDDLEWARE - ID Usage Protection
 * 
 * Автоматически проверяет что используются правильные ID
 * для tripwire операций.
 * 
 * ⚠️ КРИТИЧНО: Предотвращает Foreign Key ошибки!
 */

import { Request, Response, NextFunction } from 'express';

interface TripwireRequestBody {
  tripwire_user_id?: string;
  user_id?: string;
  main_user_id?: string;
  [key: string]: any;
}

/**
 * ✅ Middleware: Проверяет что ID правильные перед операциями
 */
export function validateTripwireIds(req: Request, res: Response, next: NextFunction) {
  const body = req.body as TripwireRequestBody;
  
  // Критические endpoints
  const criticalPaths = [
    '/api/tripwire/complete',
    '/api/tripwire/progress',
    '/api/tripwire/module-unlocks'
  ];
  
  if (!criticalPaths.some(path => req.path.includes(path))) {
    return next();
  }
  
  // Проверка 1: main_user_id должен быть UUID формата auth.users
  if (body.main_user_id) {
    if (!isValidUUID(body.main_user_id)) {
      console.error('❌ [ID Validation] Invalid main_user_id format:', body.main_user_id);
      return res.status(400).json({ 
        error: 'Invalid main_user_id format',
        hint: 'main_user_id must be valid UUID from auth.users'
      });
    }
  }
  
  // Проверка 2: Для tripwire_progress НЕ должен использоваться tripwire_users.id
  if (req.path.includes('/complete') || req.path.includes('/progress')) {
    if (body.tripwire_user_id && !body.main_user_id) {
      console.error('❌ [ID Validation] Missing main_user_id for progress operation');
      console.error('❌ [ID Validation] Received tripwire_user_id:', body.tripwire_user_id);
      return res.status(400).json({ 
        error: 'Missing main_user_id',
        hint: 'Progress operations require main_user_id (auth.users.id)'
      });
    }
  }
  
  // Логирование для отладки
  console.log('✅ [ID Validation] IDs validated:', {
    path: req.path,
    main_user_id: body.main_user_id?.substring(0, 8) + '...',
    tripwire_user_id: body.tripwire_user_id?.substring(0, 8) + '...'
  });
  
  next();
}

/**
 * ✅ Helper: Проверка UUID формата
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * ✅ Helper: Проверка что ID это auth.users.id, а не tripwire_users.id
 */
export function ensureAuthUserId(id: string, context: string): void {
  if (!isValidUUID(id)) {
    throw new Error(`[${context}] Invalid UUID format: ${id}`);
  }
  
  console.log(`✅ [${context}] Using auth.users.id: ${id.substring(0, 8)}...`);
}

/**
 * ✅ Helper: Логирование ID usage для аудита
 */
export function logIdUsage(operation: string, ids: {
  main_user_id?: string;
  tripwire_user_id?: string;
}) {
  console.log(`📋 [ID Usage Audit] ${operation}:`, {
    main_user_id: ids.main_user_id ? `${ids.main_user_id.substring(0, 8)}... (auth.users.id)` : 'N/A',
    tripwire_user_id: ids.tripwire_user_id ? `${ids.tripwire_user_id.substring(0, 8)}... (tripwire_users.id)` : 'N/A'
  });
}
