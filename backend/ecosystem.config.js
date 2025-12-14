module.exports = {
  apps: [{
    name: 'onai-backend',
    script: 'npx',
    args: 'tsx src/server.ts',
    instances: 1,
    exec_mode: 'fork',
    
    // 🚀 МАКСИМАЛЬНЫЕ ЛИМИТЫ для массовой загрузки видео
    node_args: '--max-old-space-size=6144', // 6GB heap для Node.js (из 7.8GB RAM)
    max_memory_restart: '6G', // Рестарт если память > 6GB
    
    // 📊 Логирование
    error_file: '/root/.pm2/logs/onai-backend-error.log',
    out_file: '/root/.pm2/logs/onai-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    
    // 🔄 Автоперезапуск при падении
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // 🌐 Окружение
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    
    // 📈 Мониторинг
    listen_timeout: 30000, // 30 секунд
    kill_timeout: 10000, // 10 секунд
  }]
};

