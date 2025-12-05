/**
 * TRIPWIRE DIRECT POSTGRESQL CONNECTION
 * 
 * ОБХОД Kong API Gateway и PostgREST schema cache!
 * 
 * Прямое подключение к PostgreSQL через порт 5432.
 * Работает ВСЕГДА, независимо от HTTP кэшей.
 * 
 * Connection: Direct Connect (db.*.supabase.co:5432)
 */

import { Pool, QueryResult } from 'pg';

// Create PostgreSQL connection pool for Tripwire database
export const tripwirePool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Supabase uses self-signed certs
  },
  max: 10, // Maximum 10 connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Timeout after 10s if can't connect
});

/**
 * Execute RPC function via direct SQL query
 * Bypasses PostgREST completely!
 */
export async function executeRPC<T = any>(
  functionName: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const client = await tripwirePool.connect();
  
  try {
    // Build SQL: SELECT * FROM function_name(p1 := $1, p2 := $2, ...)
    const paramKeys = Object.keys(params);
    const paramPlaceholders = paramKeys
      .map((key, i) => `${key} := $${i + 1}`)
      .join(', ');
    
    const sql = paramPlaceholders 
      ? `SELECT * FROM public.${functionName}(${paramPlaceholders})`
      : `SELECT * FROM public.${functionName}()`;
    
    const values = paramKeys.map(key => params[key]);
    
    console.log(`🔌 [Direct SQL] ${functionName}`, { params });
    
    const result: QueryResult = await client.query(sql, values);
    
    console.log(`✅ [Direct SQL] Success: ${result.rows.length} rows`);
    
    return result.rows as T[];
  } catch (error: any) {
    console.error(`❌ [Direct SQL] ${functionName} failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute RPC function that returns JSONB (like create/update/delete)
 */
export async function executeRPCJson<T = any>(
  functionName: string,
  params: Record<string, any> = {}
): Promise<T> {
  const client = await tripwirePool.connect();
  
  try {
    const paramKeys = Object.keys(params);
    const paramPlaceholders = paramKeys
      .map((key, i) => `${key} := $${i + 1}`)
      .join(', ');
    
    const sql = `SELECT public.${functionName}(${paramPlaceholders}) AS result`;
    const values = paramKeys.map(key => params[key]);
    
    console.log(`🔌 [Direct SQL JSON] ${functionName}`, { params });
    
    const result: QueryResult = await client.query(sql, values);
    
    console.log(`✅ [Direct SQL JSON] Success:`, result.rows[0]);
    
    return result.rows[0]?.result as T;
  } catch (error: any) {
    console.error(`❌ [Direct SQL JSON] ${functionName} failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test connection on startup
 */
tripwirePool.on('connect', () => {
  console.log('🔌 Tripwire Direct PostgreSQL: New connection established');
});

tripwirePool.on('error', (err) => {
  console.error('❌ Tripwire Direct PostgreSQL: Unexpected error:', err);
});

// Test connection immediately
(async () => {
  try {
    const result = await tripwirePool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Tripwire Direct PostgreSQL: Connected successfully');
    console.log('   Time:', result.rows[0].current_time);
    console.log('   PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
  } catch (error: any) {
    console.error('❌ Tripwire Direct PostgreSQL: Connection test failed:', error.message);
  }
})();

export default tripwirePool;

