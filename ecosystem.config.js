module.exports = {
  apps: [
    {
      name: 'deals247-backend',
      script: 'server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_file: './server/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'deals247-web',
      script: 'npm run preview',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/web-err.log',
      out_file: './logs/web-out.log',
      log_file: './logs/web-combined.log',
      time: true
    },
    {
      name: 'amazon-daily-ingestion',
      script: 'server/scripts/scheduler.js',
      args: 'daily',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 2 * * *', // Daily at 2 AM
      env_file: './server/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/amazon-daily-err.log',
      out_file: './logs/amazon-daily-out.log',
      log_file: './logs/amazon-daily.log',
      time: true
    },
    {
      name: 'amazon-hourly-refresh',
      script: 'server/scripts/scheduler.js',
      args: 'hourly',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 * * * *', // Every hour
      env_file: './server/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/amazon-hourly-err.log',
      out_file: './logs/amazon-hourly-out.log',
      log_file: './logs/amazon-hourly.log',
      time: true
    },
    {
      name: 'amazon-weekly-maintenance',
      script: 'server/scripts/scheduler.js',
      args: 'weekly',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 3 * * 0', // Weekly on Sunday at 3 AM
      env_file: './server/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/amazon-weekly-err.log',
      out_file: './logs/amazon-weekly-out.log',
      log_file: './logs/amazon-weekly.log',
      time: true
    },
    {
      name: 'amazon-health-monitor',
      script: 'server/scripts/scheduler.js',
      args: 'health',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '*/15 * * * *', // Every 15 minutes
      env_file: './server/.env',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/amazon-health-err.log',
      out_file: './logs/amazon-health-out.log',
      log_file: './logs/amazon-health.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/deals247.git',
      path: '/var/www/deals247',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};