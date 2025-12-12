/**
 * TRIPWIRE POSTGRESQL POOL CONNECTION
 * Direct connection через pg.Pool для ACID транзакций
 * Используется в TripwireService v2 (Direct DB Pattern)
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// ✅ IMPORTANT: DO NOT call dotenv.config() here!
// server.ts already loaded backend/env.env
// ❌ REMOVED: dotenv.config(); - causes env override bug

const connectionString = process.env.TRIPWIRE_DATABASE_URL!;

if (!connectionString) {
  throw new Error('❌ Missing TRIPWIRE_DATABASE_URL environment variable');
}

/**
 * PostgreSQL Connection Pool для Tripwire Database
 * 
 * Features:
 * - ACID транзакции
 * - Connection pooling (max: 20)
 * - SSL connection
 * - Auto-retry на serialization failures
 * - Graceful shutdown
 */
export const tripwirePool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Supabase требует SSL
  },
  max: 20, // Максимум соединений
  idleTimeoutMillis: 30000, // 30 секунд idle before disconnect
  connectionTimeoutMillis: 2000, // 2 секунды timeout на подключение
});

console.log('✅ Tripwire Pool initialized');
console.log('   Max connections:', 20);
console.log('   SSL:', 'enabled');

// Test connection on startup
tripwirePool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Failed to connect to Tripwire database:', err.message);
    return;
  }
  
  console.log('✅ Tripwire database connection successful');
  release();
});

// Graceful shutdown
const shutdown = async () => {
  console.log('🔄 Closing Tripwire database pool...');
  await tripwirePool.end();
  console.log('✅ Tripwire database pool closed');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Export pool
export default tripwirePool;
