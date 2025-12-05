/**
 * TRIPWIRE DIRECT DATABASE CONNECTION
 * Обходим PostgREST полностью, используем прямой PostgreSQL connection
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const TRIPWIRE_DB_PASSWORD = process.env.TRIPWIRE_DB_PASSWORD!;
const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL!;

// Извлекаем project ref из URL
const projectRef = TRIPWIRE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  throw new Error('Cannot extract project ref from TRIPWIRE_SUPABASE_URL');
}

// Direct PostgreSQL connection (Transaction Mode для долгих соединений)
const connectionString = `postgresql://postgres.${projectRef}:${TRIPWIRE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require`;

export const tripwireDbPool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20, // Максимум соединений
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

console.log('✅ Tripwire Direct DB Pool initialized');
console.log('   Project:', projectRef);

// Helper для выполнения запросов
export async function queryTripwireDb<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const client = await tripwireDbPool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await tripwireDbPool.end();
});
