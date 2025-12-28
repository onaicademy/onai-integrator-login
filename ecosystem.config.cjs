module.exports = {
  apps: [
    {
      name: 'onai-backend',
      cwd: '/var/www/onai-integrator-login-main/backend',
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      env_file: '/var/www/onai-integrator-login-main/.env',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/onai-integrator-login-main/logs/backend-error.log',
      out_file: '/var/www/onai-integrator-login-main/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
