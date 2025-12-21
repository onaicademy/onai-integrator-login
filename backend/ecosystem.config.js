/**
 * 🛡️ PM2 CONFIGURATION - ЗАЩИТА ОТ ПАДЕНИЙ
 * 
 * PM2 автоматически перезапустит backend при крашах
 * Мониторинг, логи, автоматический restart
 */

module.exports = {
  apps: [{
    name: 'onai-backend',
    script: 'tsx',
    args: 'src/server.ts',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      START_WORKER: 'true', // ✅ Enable Tripwire Queue Worker
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    
    // 🛡️ ЗАЩИТА ОТ КРАХА
    min_uptime: '5s',         // Минимальное время работы
    max_restarts: 15,         // Макс 15 рестартов за listen_timeout
    listen_timeout: 10000,    // Таймаут на старт (10 сек)
    kill_timeout: 5000,       // Таймаут на остановку
    wait_ready: false,        // НЕ ждать ready signal (избегаем зависаний)
    
    // 🔄 RESTART STRATEGY
    exp_backoff_restart_delay: 100,  // Экспоненциальная задержка
    
    // 📊 МОНИТОРИНГ
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
