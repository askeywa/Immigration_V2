// backend/src/config/envValidation.ts
import { log } from '../utils/logger';

interface EnvConfig {
  required: string[];
  optional: string[];
  defaults: Record<string, string>;
}

const envConfig: EnvConfig = {
  required: [
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ],
  optional: [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ZONE_ID',
    'REDIS_URL',
    'REDIS_PASSWORD',
    'SENTRY_DSN',
    'NEW_RELIC_LICENSE_KEY',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'PORT',
    'NODE_ENV',
    'FRONTEND_URL',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS'
  ],
  defaults: {
    PORT: '5000',
    NODE_ENV: 'development',
    FRONTEND_URL: 'http://localhost:3000'
  }
};

export function validateEnvironmentVariables(): void {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const variable of envConfig.required) {
    if (!process.env[variable]) {
      missing.push(variable);
    }
  }
  
  // Check optional variables and provide warnings
  for (const variable of envConfig.optional) {
    if (!process.env[variable]) {
      warnings.push(variable);
    }
  }
  
  // Set default values
  for (const [key, value] of Object.entries(envConfig.defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
      log.info(`Set default value for ${key}: ${value}`);
    }
  }
  
  // Log warnings for missing optional variables
  if (warnings.length > 0) {
    log.warn('⚠️  Missing optional environment variables:', { missing: warnings });
    
    // Specific warnings for critical services
    if (warnings.includes('CLOUDFLARE_API_TOKEN')) {
      log.warn('⚠️  DNS automation will be unavailable without CLOUDFLARE_API_TOKEN');
    }
    if (warnings.includes('REDIS_URL')) {
      log.warn('⚠️  Redis caching will be unavailable without REDIS_URL');
    }
    if (warnings.includes('SENTRY_DSN')) {
      log.warn('⚠️  Error monitoring will be unavailable without SENTRY_DSN');
    }
  }
  
  // Throw error for missing required variables
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}`;
    log.error('❌ Environment validation failed:', { missing });
    throw new Error(errorMessage);
  }
  
  log.info('✅ Environment variables validated successfully');
}

export function getEnvironmentInfo(): Record<string, any> {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '5000',
    hasMongoDB: !!process.env.MONGODB_URI,
    hasRedis: !!process.env.REDIS_URL,
    hasCloudflare: !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID),
    hasSentry: !!process.env.SENTRY_DSN,
    hasNewRelic: !!process.env.NEW_RELIC_LICENSE_KEY,
    hasAWS: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  };
}
