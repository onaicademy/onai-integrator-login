/**
 * 🎯 TRAFFIC DASHBOARD - Direct PostgreSQL Connection
 * 
 * РЕШЕНИЕ SCHEMA CACHE ISSUE:
 * Используем прямое PostgreSQL подключение вместо PostgREST API
 * чтобы избежать проблем с schema cache в локальной разработке
 * 
 * @see SUPABASE-CACHE-FIX.md (Вариант 1)
 */

import pg from 'pg';

// ✅ Построить DATABASE_URL из существующих credentials
const getDatabaseUrl = (): string => {
  // Если уже есть готовый DATABASE_URL - используем его
  if (process.env.TRAFFIC_DATABASE_URL) {
    return process.env.TRAFFIC_DATABASE_URL;
  }
  
  // Иначе строим из Supabase URL + пароля
  const supabaseUrl = process.env.TRAFFIC_SUPABASE_URL;
  const serviceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('TRAFFIC_SUPABASE_URL not set');
  }
  
  // Извлекаем project ref из URL: https://PROJECT_REF.supabase.co
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    throw new Error(`Invalid TRAFFIC_SUPABASE_URL format: ${supabaseUrl}`);
  }
  
  const projectRef = match[1];
  
  // ⚠️ ВРЕМЕННОЕ РЕШЕНИЕ: Пробуем использовать serviceKey как пароль
  // На production нужно будет получить настоящий DB password из Supabase Dashboard
  console.warn('⚠️ [DB] Using fallback connection method. Set TRAFFIC_DATABASE_URL in env.env for best performance.');
  
  // Формат: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  // Для начала пробуем без пароля (для локального тестирования)
  return `postgresql://postgres@db.${projectRef}.supabase.co:5432/postgres`;
};

// Создаем прямой пул PostgreSQL (bypass PostgREST cache)
let pgPool: pg.Pool | null = null;

const getPool = (): pg.Pool => {
  if (!pgPool) {
    try {
      const connectionString = getDatabaseUrl();
      console.log('📊 [DB] Creating PostgreSQL pool for Traffic Dashboard');
      console.log('   Connection:', connectionString.replace(/:[^:@]+@/, ':***@')); // Hide password
      
      pgPool = new pg.Pool({
        connectionString,
        max: 10, // Максимум 10 соединений
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      // Тест подключения
      pgPool.query('SELECT 1').then(() => {
        console.log('✅ [DB] PostgreSQL connection established');
      }).catch((err) => {
        console.error('❌ [DB] PostgreSQL connection failed:', err.message);
      });
    } catch (err: any) {
      console.error('❌ [DB] Failed to create pool:', err.message);
      throw err;
    }
  }
  
  return pgPool;
};

/**
 * Прямой запрос к PostgreSQL
 * ByPass PostgREST schema cache completely
 * 
 * @example
 * const users = await queryRaw<User>('SELECT * FROM users WHERE email = $1', ['test@example.com']);
 */
export const queryRaw = async <T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> => {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    console.log('🔍 [DB] Executing query:', sql.substring(0, 100) + '...');
    const result = await client.query(sql, params);
    console.log(`✅ [DB] Query returned ${result.rows.length} rows`);
    return result.rows as T[];
  } catch (error: any) {
    console.error('❌ [DB] Query failed:', error.message);
    console.error('   SQL:', sql);
    console.error('   Params:', params);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Вызов RPC функции напрямую через PostgreSQL
 * 
 * @example
 * const user = await callFunction<User>('get_targetologist_by_email', { p_email: 'test@example.com' });
 */
export const callFunction = async <T = any>(
  functionName: string,
  params: Record<string, any> = {}
): Promise<T | null> => {
  const paramNames = Object.keys(params);
  const paramValues = Object.values(params);
  
  // Построить вызов функции: SELECT * FROM function_name($1, $2, ...)
  const placeholders = paramNames.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `SELECT * FROM ${functionName}(${placeholders})`;
  
  console.log(`📞 [DB] Calling function: ${functionName}(${paramNames.join(', ')})`);
  
  const result = await queryRaw<T>(sql, paramValues);
  
  // Возвращаем первую строку (обычно RPC функции возвращают одну запись)
  return result.length > 0 ? result[0] : null;
};

/**
 * Закрыть все соединения (для graceful shutdown)
 */
export const closePool = async (): Promise<void> => {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
    console.log('👋 [DB] PostgreSQL pool closed');
  }
};

export { pgPool, getPool };
