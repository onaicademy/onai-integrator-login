/**
 * Redis Configuration for AmoCRM BullMQ
 * ⭐ ISOLATED from Telegram - only for AmoCRM sync queues
 */
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

interface RedisForAmoCRM {
    client: Redis | null;
    isConnected: boolean;
}

const amocrmRedis: RedisForAmoCRM = {
    client: null,
    isConnected: false
};

/**
 * ⭐ Initialize Redis ONLY for AmoCRM BullMQ
 * - Strict retry limits (3 attempts only)
 * - Doesn't block server startup
 * - NON-BLOCKING initialization
 */
export async function initAmoCRMRedis(): Promise<void> {
    return new Promise((resolve) => {
        // Defer to next event loop tick
        setImmediate(async () => {
            try {
                amocrmRedis.client = new Redis({
                    url: process.env.REDIS_URL || 'redis://localhost:6379',
                    
                    // ⭐ CRITICAL for BullMQ
                    maxRetriesPerRequest: null,
                    
                    // ⭐ Don't block
                    lazyConnect: true,
                    enableReadyCheck: false,
                    enableOfflineQueue: false,
                    
                    // ⭐ STRICT retry limits
                    retryStrategy: (times) => {
                        if (times > 3) {
                            logger.warn(
                                '⚠️ Redis for AmoCRM: Max attempts (3) exceeded. ' +
                                'AmoCRM sync will be unavailable. BullMQ disabled.'
                            );
                            return null; // Stop retrying
                        }
                        const delay = Math.min(times * 500, 1500);
                        logger.info(`Redis for AmoCRM: Retry ${times}/3 in ${delay}ms`);
                        return delay;
                    },
                    commandTimeout: 2000,
                    connectTimeout: 2000,
                    connectionName: 'onai-amocrm'
                });

                // Connect in background
                amocrmRedis.client.on('ready', () => {
                    amocrmRedis.isConnected = true;
                    logger.info('✅ Redis for AmoCRM: Connected and ready for BullMQ');
                });

                amocrmRedis.client.on('error', (err) => {
                    logger.warn('⚠️ Redis for AmoCRM error:', err.message);
                    amocrmRedis.isConnected = false;
                });

                amocrmRedis.client.on('close', () => {
                    amocrmRedis.isConnected = false;
                    logger.warn('⚠️ Redis for AmoCRM: Connection closed');
                });

                // Don't await - let it connect in background
                amocrmRedis.client.connect().catch((err) => {
                    logger.warn('Redis for AmoCRM: Connection attempt failed:', err.message);
                });

                resolve();

            } catch (err: any) {
                logger.error('Fatal error initializing AmoCRM Redis:', err.message);
                resolve(); // Still resolve - don't block
            }
        });
    });
}

/**
 * Get Redis client for AmoCRM
 */
export function getAmoCRMRedis(): Redis | null {
    return amocrmRedis.client;
}

/**
 * Check if Redis is ready for BullMQ
 */
export function isAmoCRMRedisReady(): boolean {
    return amocrmRedis.isConnected && !!amocrmRedis.client;
}

/**
 * Get AmoCRM Redis status
 */
export function getAmoCRMRedisStatus() {
    return {
        connected: amocrmRedis.isConnected,
        available: !!amocrmRedis.client
    };
}

/**
 * Graceful shutdown
 */
export async function closeAmoCRMRedis(): Promise<void> {
    if (amocrmRedis.client) {
        logger.info('Closing AmoCRM Redis...');
        await amocrmRedis.client.quit();
        amocrmRedis.client = null;
        amocrmRedis.isConnected = false;
    }
}

// Legacy export for compatibility with existing AmoCRM code
export const redis = {
    get instance() {
        return amocrmRedis.client;
    }
};

export default redis;











