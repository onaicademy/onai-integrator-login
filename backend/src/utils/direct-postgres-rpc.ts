/**
 * DIRECT POSTGRES RPC CALLER
 * 
 * ОБХОД PostgREST schema cache проблемы!
 * 
 * Вызывает RPC функции напрямую через PostgreSQL connection,
 * минуя PostgREST REST API который не видит функции из-за stale cache.
 * 
 * Based on Perplexity research: "Use direct SQL connection when PostgREST cache fails"
 */

import { Pool } from 'pg';

// Create PostgreSQL connection pool
const tripwirePool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

/**
 * Call RPC function directly via PostgreSQL (bypass PostgREST)
 */
export async function callDirectRPC<T = any>(
  functionName: string,
  params: Record<string, any> = {}
): Promise<T> {
  const client = await tripwirePool.connect();
  
  try {
    // Build SQL query: SELECT * FROM function_name(p1 := $1, p2 := $2, ...)
    const paramKeys = Object.keys(params);
    const paramPlaceholders = paramKeys
      .map((key, i) => `${key} := $${i + 1}`)
      .join(', ');
    
    const sql = `SELECT * FROM public.${functionName}(${paramPlaceholders})`;
    const values = paramKeys.map(key => params[key]);
    
    console.log(`🔌 [Direct RPC] ${functionName}`, { params });
    
    const result = await client.query(sql, values);
    
    console.log(`✅ [Direct RPC] Success:`, result.rows.length, 'rows');
    
    return result.rows as T;
  } catch (error: any) {
    console.error(`❌ [Direct RPC] ${functionName} failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Call RPC function that returns JSONB (like create/update/delete)
 */
export async function callDirectRPCJson<T = any>(
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
    
    console.log(`🔌 [Direct RPC JSON] ${functionName}`, { params });
    
    const result = await client.query(sql, values);
    
    console.log(`✅ [Direct RPC JSON] Success:`, result.rows[0]);
    
    return result.rows[0]?.result as T;
  } catch (error: any) {
    console.error(`❌ [Direct RPC JSON] ${functionName} failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Export pool for manual queries if needed
export { tripwirePool };


