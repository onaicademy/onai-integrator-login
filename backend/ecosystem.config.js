module.exports = {
  apps: [{
    name: 'onai-backend',
    script: 'npx',
    args: 'tsx src/server.ts',
    instances: 1,
    exec_mode: 'fork',
    
    // 🚀 Память через NODE_OPTIONS (tsx требует)
    max_memory_restart: '4G', // Рестарт если память > 4GB
    
    // 📊 Логирование
    error_file: '/root/.pm2/logs/onai-backend-error.log',
    out_file: '/root/.pm2/logs/onai-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    
    // 🔄 Агрессивный автоперезапуск при падении
    autorestart: true,
    max_restarts: 50, // Увеличено с 10 до 50 попыток
    min_uptime: '5s', // Уменьшено с 10s до 5s для быстрого обнаружения проблем
    restart_delay: 2000, // 2 секунды между рестартами
    exp_backoff_restart_delay: 100, // Экспоненциальная задержка: 2s → 4s → 8s → 16s...
    
    // 🎯 Дополнительные настройки стабильности
    watch: false, // Не перезапускаем при изменении файлов (только для production)
    ignore_watch: ['node_modules', 'logs', '.git', 'dist'],
    
    // 🌐 Окружение
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=4096', // 4GB для Node через ENV (сервер имеет 31GB RAM)
    },
    
    // 📈 Мониторинг
    listen_timeout: 30000, // 30 секунд
    kill_timeout: 10000, // 10 секунд
  }]
};

