/**
 * TRANSACTION WRAPPER HELPER
 * Обеспечивает ACID гарантии для операций в базе данных
 * С автоматическим retry на serialization failures
 */

import { Pool, PoolClient } from 'pg';

/**
 * Уровни изоляции PostgreSQL
 */
export type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

/**
 * Выполняет callback в транзакции с автоматическим ROLLBACK при ошибке
 * 
 * @param pool - PostgreSQL connection pool
 * @param callback - Функция которая будет выполнена в транзакции
 * @param isolationLevel - Уровень изоляции (default: READ COMMITTED)
 * @param maxRetries - Максимум попыток при serialization failure (default: 3)
 * 
 * @returns Результат callback функции
 * 
 * @example
 * ```typescript
 * const result = await withTransaction(
 *   pool,
 *   async (client) => {
 *     await client.query('INSERT INTO users ...');
 *     await client.query('INSERT INTO profiles ...');
 *     return { success: true };
 *   },
 *   'READ COMMITTED'
 * );
 * ```
 */
export async function withTransaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>,
  isolationLevel: IsolationLevel = 'READ COMMITTED',
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();

    try {
      // BEGIN транзакция с уровнем изоляции
      await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
      
      // Выполняем callback
      const result = await callback(client);
      
      // COMMIT если всё успешно
      await client.query('COMMIT');
      
      return result;
    } catch (error: any) {
      // ROLLBACK при любой ошибке
      await client.query('ROLLBACK');
      lastError = error;

      // Retry на serialization failure (PostgreSQL error code 40001)
      if (error.code === '40001' && attempt < maxRetries) {
        console.log(`⚠️ Serialization failure, retrying transaction (${attempt}/${maxRetries})...`);
        
        // Exponential backoff: 100ms, 200ms, 300ms...
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }

      // Для всех других ошибок - не retry
      throw error;
    } finally {
      // Всегда release connection обратно в pool
      client.release();
    }
  }

  // Если все retry провалились
  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Проверяет является ли ошибка serialization failure
 */
export function isSerializationFailure(error: any): boolean {
  return error?.code === '40001';
}

/**
 * Проверяет является ли ошибка deadlock
 */
export function isDeadlock(error: any): boolean {
  return error?.code === '40P01';
}

/**
 * Проверяет является ли ошибка constraint violation
 */
export function isConstraintViolation(error: any): boolean {
  return error?.code === '23505' || // unique_violation
         error?.code === '23503' || // foreign_key_violation
         error?.code === '23514';   // check_violation
}

/**
 * Форматирует ошибку базы данных для логирования
 */
export function formatDatabaseError(error: any): string {
  if (!error) return 'Unknown error';
  
  const parts: string[] = [];
  
  if (error.code) parts.push(`Code: ${error.code}`);
  if (error.message) parts.push(`Message: ${error.message}`);
  if (error.detail) parts.push(`Detail: ${error.detail}`);
  if (error.hint) parts.push(`Hint: ${error.hint}`);
  
  return parts.join(' | ');
}
