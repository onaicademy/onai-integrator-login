/**
 * 🛡️ GRACEFUL SHUTDOWN
 * Корректное завершение всех операций при остановке сервера
 */

import type { Server } from 'http';

type CleanupHandler = () => Promise<void> | void;

class GracefulShutdown {
  private cleanupHandlers: CleanupHandler[] = [];
  private isShuttingDown: boolean = false;
  private server: Server | null = null;

  /**
   * Регистрируем HTTP сервер для корректного закрытия
   */
  registerServer(server: Server) {
    this.server = server;
  }

  /**
   * Регистрируем cleanup handler
   */
  registerCleanup(handler: CleanupHandler) {
    this.cleanupHandlers.push(handler);
  }

  /**
   * Запуск graceful shutdown
   */
  async shutdown(signal: string) {
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n🛑 Получен ${signal}, начинаем graceful shutdown...`);

    try {
      // 1. Останавливаем прием новых запросов
      if (this.server) {
        console.log('🔒 Stopping server from accepting new connections...');
        await new Promise<void>((resolve, reject) => {
          this.server!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Server closed');
      }

      // 2. Выполняем все cleanup handlers
      console.log(`🧹 Running ${this.cleanupHandlers.length} cleanup handlers...`);
      await Promise.all(
        this.cleanupHandlers.map(async (handler, index) => {
          try {
            await Promise.race([
              handler(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Cleanup timeout')), 10000)
              ),
            ]);
            console.log(`✅ Cleanup handler ${index + 1} completed`);
          } catch (error: any) {
            console.error(`❌ Cleanup handler ${index + 1} failed:`, error.message);
          }
        })
      );

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error: any) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Инициализация обработчиков сигналов
   */
  init() {
    // SIGTERM: Docker, Kubernetes
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));

    // SIGINT: Ctrl+C
    process.on('SIGINT', () => this.shutdown('SIGINT'));

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      this.shutdown('UNCAUGHT_EXCEPTION');
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('UNHANDLED_REJECTION');
    });

    console.log('🛡️ Graceful shutdown handlers initialized');
  }
}

// Singleton instance
export const gracefulShutdown = new GracefulShutdown();

/**
 * Convenience function для регистрации cleanup
 */
export function onShutdown(handler: CleanupHandler) {
  gracefulShutdown.registerCleanup(handler);
}
