/**
 * Direct PostgreSQL Connection for Traffic Database
 * 
 * WORKAROUND для PostgREST schema cache issue
 * Используется когда Supabase JS SDK не видит новые таблицы
 */

import pg from 'pg';
const { Pool } = pg;

// Traffic DB connection string (session mode pooler port 5432)
const TRAFFIC_PG_URL = 'postgresql://postgres.oetodaexnjcunklkdlkv:RaDug5-qixreb-givdev@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

export const trafficPgPool = new Pool({
  connectionString: TRAFFIC_PG_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

console.log('✅ Traffic PG Direct Pool initialized');

export default trafficPgPool;
