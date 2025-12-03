module.exports = {
  apps: [{
    name: 'onai-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    
    // 🚀 УВЕЛИЧЕННЫЕ ЛИМИТЫ для загрузки больших видео
    node_args: '--max-old-space-size=2048', // 2GB heap для Node.js
    max_memory_restart: '2G', // Рестарт если память > 2GB
    
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
    listen_timeout: 10000,
    kill_timeout: 5000,
  }]
};

