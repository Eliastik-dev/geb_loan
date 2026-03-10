/**
 * PM2 Ecosystem Configuration for GEB Equipment Loan
 */

module.exports = {
  apps: [
    // ========================================================================
    // BACKEND
    // ========================================================================
    {
      name: 'geb-equipment-api',
      cwd: './server',
      script: 'dist/index.js', // Ensure this points to the built JS file
      
      // Cluster mode for production (use all CPUs)
      instances: process.env.NODE_ENV === 'production' ? 'max' : 1,
      exec_mode: 'cluster',
      
      // -----------------------------------------------------------------------
      // PRODUCTION (materiel.pn2.geb)
      // Uses: server/.env
      // -----------------------------------------------------------------------
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Optional debugging flags
        DEBUG: 'false',
        LOG_LEVEL: 'info',
        LOG_FORMAT: 'pretty',
      },
      
      // -----------------------------------------------------------------------
      // LOCAL DEVELOPMENT
      // -----------------------------------------------------------------------
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        DEBUG: 'true',
        LOG_LEVEL: 'debug',
        LOG_FORMAT: 'pretty',
      },
      
      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '../logs/backend-error.log', // Ensure the logs folder exists
      out_file: '../logs/backend-out.log',
      merge_logs: true,
      
      // Watch mode
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    }
  ],
  
  // ==========================================================================
  // DEPLOYMENT (optional)
  // ==========================================================================
  deploy: {
    production: {
      user: 'deploy', // Update if necessary
      host: ['materiel.pn2.geb'], // Update if necessary
      ref: 'origin/main',
      repo: 'git@github.com:your-org/geb-equipment-loan.git',
      path: '/var/www/geb-equipment-loan',
      'pre-deploy-local': '',
      'post-deploy': 'npm run install:all && npm run build:server && npm run build:client && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
