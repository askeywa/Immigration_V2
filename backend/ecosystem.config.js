module.exports = {
  apps: [{
    name: 'immigration-portal',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // ✅ Use absolute path to ensure .env is found from any working directory
    env_file: '/var/www/immigration-portal/backend/.env',
    
    // ✅ Production environment with all required variables from .env
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
      
      // === Database ===
      MONGODB_URI: process.env.MONGODB_URI,
      
      // === JWT Authentication ===
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      
      // === Frontend Configuration ===
      FRONTEND_URL: process.env.FRONTEND_URL,
      
      // === Admin Configuration ===
      SUPER_ADMIN_DOMAIN: process.env.SUPER_ADMIN_DOMAIN,
      ALLOWED_SUPER_ADMIN_DOMAINS: process.env.ALLOWED_SUPER_ADMIN_DOMAINS,
      
      // === Domain Configuration ===
      MAIN_DOMAIN: process.env.MAIN_DOMAIN,
      TENANT_DOMAIN_PREFIX: process.env.TENANT_DOMAIN_PREFIX,
      
      // === Rate Limiting ===
      RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || '900000',
      RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
      
      // === Redis Caching ===
      REDIS_ENABLED: process.env.REDIS_ENABLED || 'true',
      REDIS_URL: process.env.REDIS_URL,
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_CLUSTER_MODE: process.env.REDIS_CLUSTER_MODE || 'false',
      
      // === Error Tracking (Sentry) ===
      SENTRY_DSN: process.env.SENTRY_DSN,
      SENTRY_RELEASE: process.env.SENTRY_RELEASE,
      SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
      SENTRY_PROFILES_SAMPLE_RATE: process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1',
      
      // === Application Performance Monitoring (New Relic) ===
      NEW_RELIC_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
      NEW_RELIC_APP_NAME: process.env.NEW_RELIC_APP_NAME,
      NEW_RELIC_ENABLED: process.env.NEW_RELIC_ENABLED || 'false',
      
      // === Infrastructure ===
      EC2_PUBLIC_IP: process.env.EC2_PUBLIC_IP,
      EC2_PRIVATE_IP: process.env.EC2_PRIVATE_IP,
      EC2_PUBLIC_DNS: process.env.EC2_PUBLIC_DNS,
      
      // === API Configuration ===
      API_BASE_URL: process.env.API_BASE_URL,
      
      // === Application Settings ===
      APP_NAME: process.env.APP_NAME || 'Immigration Portal',
      ALLOW_START_WITHOUT_DB: process.env.ALLOW_START_WITHOUT_DB || 'false',
      
      // === Security ===
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY
    },
    
    // ✅ Development environment
    env_development: {
      NODE_ENV: 'development',
      PORT: 5000,
      MONGODB_URI: process.env.MONGODB_URI,
      JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-key',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5174',
      REDIS_ENABLED: process.env.REDIS_ENABLED || 'false',
      SENTRY_DSN: process.env.SENTRY_DSN,
      NEW_RELIC_ENABLED: 'false'
    },
    
    // ✅ Logging configuration
    error_file: '/var/www/immigration-portal/backend/logs/err.log',
    out_file: '/var/www/immigration-portal/backend/logs/out.log',
    log_file: '/var/www/immigration-portal/backend/logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // ✅ Startup and graceful shutdown configuration
    listen_timeout: 10000,      // 10 seconds to connect to server
    kill_timeout: 5000,         // 5 seconds graceful shutdown timeout
    max_restarts: 10,           // Restart max 10 times
    min_uptime: '10s',          // Require 10 seconds uptime before counting as started
    
    // ✅ Process monitoring
    max_memory_restart: '1G',   // Restart if memory exceeds 1GB
    
    // ✅ Disable auto-restart on file changes in production
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.git'],
    
    // ✅ Auto-restart configuration
    autorestart: true,
    
    // ✅ Additional logging for debugging
    args: '--log-level info',
    
    // ✅ Disable running multiple instances
    instances: 1,
    exec_mode: 'fork'
  }]
};