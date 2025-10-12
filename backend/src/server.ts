// backend/src/server.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
// Look for .env file in the current directory (backend/)
dotenv.config({ path: './.env' });

// Load New Relic AFTER environment variables are loaded
import 'newrelic';

// Validate environment variables
import { validateEnvironmentVariables, getEnvironmentInfo } from './config/envValidation';
try {
  validateEnvironmentVariables();
  const envInfo = getEnvironmentInfo();
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Environment Info:', envInfo);
  }
} catch (error) {
  console.error('❌ Environment validation failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

// Debug: Check if environment variables are loaded
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Environment check:');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? '***LOADED***' : 'NOT LOADED');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('REDIS_ENABLED:', process.env.REDIS_ENABLED);
  console.log('REDIS_URL:', process.env.REDIS_URL ? '***LOADED***' : 'NOT LOADED');
  console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? '***LOADED***' : 'NOT LOADED');
}

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDatabase, disconnectDatabase, isDatabaseConnected, getDatabaseInfo } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { initializeRowLevelSecurity } from './middleware/rowLevelSecurity';
import { requestResponseLogging } from './middleware/requestResponseLogging';
import { 
  sentryMiddleware, 
  errorTrackingMiddleware,
} from './middleware/apmMiddleware';
import { comprehensiveLogging } from './middleware/loggingMiddleware';
import { PerformanceMonitoringService } from './services/performanceMonitoringService';
import SentryService from './config/sentry';
import mongoose from 'mongoose';
import { log } from './utils/logger';
import { PortManager } from './utils/portManager';
import { ProcessManager } from './utils/processManager';
import { NotificationService } from './services/notificationService';
import { RateLimitService } from './services/rateLimitService';
import { SessionService } from './services/sessionService';
import { SecurityService } from './services/securityService';
import { DataIsolationService } from './services/dataIsolationService';
import { ImpersonationService } from './services/impersonationService';
import { TenantResolutionService } from './services/tenantResolutionService';
import { DatabaseMigrationService } from './services/databaseMigrationService';
import { sessionManagement, sessionActivityTracking, sessionSecurityPolicy } from './middleware/sessionManagement';
import { 
  securityHeaders, 
  corsSecurity, 
  mongoSanitization, 
  xssProtection, 
  parameterPollutionProtection,
  csrfProtection,
  inputValidation,
  requestSizeLimit,
  securityMonitoring,
  tenantSecurityValidation,
  contentTypeValidation
} from './middleware/securityHardening';
import { dynamicCorsSecurity } from './middleware/dynamicCorsSecurity';
import { 
  bulletproofTenantIsolation,
  databaseQueryIsolation,
  resourceAccessValidation,
  tenantIdEnforcement,
  queryValidation,
  crossTenantAccessPrevention,
  dataIsolationMonitoring,
  comprehensiveDataIsolation
} from './middleware/dataIsolation';
import { 
  comprehensiveImpersonation
} from './middleware/impersonation';
import { 
  comprehensiveTenantResolution
} from './middleware/enhancedTenantResolution';
import { sanitizeRequest } from './utils/sanitization';
import { LightweightMonitoring } from './utils/lightweightMonitoring';

// Import routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import profileRoutes from './routes/profileRoutes';
import drawRoutes from './routes/drawRoutes';
import fileRoutes from './routes/fileRoutes';
import tenantRoutes from './routes/tenantRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import auditLogRoutes from './routes/auditLogRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';
import healthRoutes from './routes/healthRoutes';
import mfaRoutes from './routes/mfaRoutes';
import apiKeyRoutes from './routes/apiKeyRoutes';
import tenantValidationRoutes from './routes/tenantValidationRoutes';
import requestLoggingRoutes from './routes/requestLoggingRoutes';
import logoRoutes from './routes/logoRoutes';
import tenantActivityRoutes from './routes/tenantActivityRoutes';
import performanceMonitoringRoutes from './routes/performanceMonitoringRoutes';
import dnsAutomationRoutes from './routes/dnsAutomationRoutes';
import sslAutomationRoutes from './routes/sslAutomationRoutes';
import subdomainProvisioningRoutes from './routes/subdomainProvisioningRoutes';
import loggingRoutes from './routes/loggingRoutes';
import backupRoutes from './routes/backupRoutes';
import indexingRoutes from './routes/indexingRoutes';
import enhancedAuditRoutes from './routes/enhancedAuditRoutes';
import rateLimitRoutes from './routes/rateLimitRoutes';
import sessionRoutes from './routes/sessionRoutes';
import securityRoutes from './routes/securityRoutes';
import dataIsolationRoutes from './routes/dataIsolationRoutes';
import impersonationRoutes from './routes/impersonationRoutes';
import tenantResolutionRoutes from './routes/tenantResolutionRoutes';
import databaseMigrationRoutes from './routes/databaseMigrationRoutes';
import themeRoutes from './routes/themeRoutes';
import superAdminRoutes from './routes/superAdminRoutes';
import teamMemberRoutes from './routes/teamMemberRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// APM Middleware
try {
  app.use(sentryMiddleware);
  log.info('Sentry middleware applied');
} catch (error) {
  log.error('Sentry middleware error', { error: error instanceof Error ? error.message : String(error) });
}

// Comprehensive Logging Middleware
app.use(comprehensiveLogging);

// Performance tracking middleware
import { trackApiPerformance } from './controllers/performanceController';
app.use(trackApiPerformance);

// Security middleware (order is important!)
app.use(securityHeaders());
// ENHANCED: Dynamic CORS with multi-domain tenant support
app.use(dynamicCorsSecurity());

// Static file serving will be configured after frontendDistPath is declared

// Trust proxy for rate limiting with X-Forwarded-For headers
// This is essential for proper rate limiting behind a reverse proxy (Nginx)
app.set('trust proxy', 1);

app.use(requestSizeLimit('10mb'));

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // Much higher limit for development testing
  message: 'Too many requests from this IP, please try again later.',
  skip: (req: any) => {
    // Skip rate limiting for health checks
    return (req as any).url === '/api/health' || (req as any).url.startsWith('/api/health');
  }
});
app.use(limiter);

// Body parsing middleware - ENHANCED with better error handling
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json',
  verify: (req, res, buf, encoding) => {
    // Store raw body for debugging
    (req as any).rawBody = buf.toString(encoding as BufferEncoding);
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add error handling for malformed JSON
app.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof SyntaxError && (error as any).status === 400 && 'body' in error) {
    console.log('🔍 JSON PARSE ERROR DEBUG:');
    console.log('Error:', error.message);
    console.log('Raw body:', (req as any).rawBody);
    console.log('Content-Type:', req.get('content-type'));
    console.log('Headers:', req.headers);
    
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format',
      code: 'INVALID_JSON',
      debug: {
        error: error.message,
        receivedContentType: req.get('content-type'),
        bodyLength: (req as any).rawBody?.length || 0
      }
    });
  }
  next(error);
});

// Input sanitization middleware (must be after body parsing)
app.use(sanitizeRequest);

// Request/Response logging middleware
app.use(requestResponseLogging);

// Performance monitoring middleware
app.use(PerformanceMonitoringService.createMonitoringMiddleware());

// Security hardening middleware
app.use(mongoSanitization());
app.use(xssProtection());
app.use(parameterPollutionProtection());
app.use(contentTypeValidation());
app.use(securityMonitoring());

// Performance middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic health check route (no database dependency)
app.get('/api/health', (req: any, res: any) => {
  const dbInfo = getDatabaseInfo();
  (res as any).status(200).json({
    status: 'OK',
    message: 'Immigration Portal API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: isDatabaseConnected(),
      readyState: dbInfo.readyState,
      host: dbInfo.host,
      port: dbInfo.port,
      name: dbInfo.name
    }
  });
});

// Enhanced health check route
app.get('/api/health/detailed', async (req: any, res: any) => {
  try {
    const dbInfo = getDatabaseInfo();
    const isDbConnected = isDatabaseConnected();
    
    // Try to ping database if connected
    let dbPing = false;
    if (isDbConnected) {
      try {
        await mongoose.connection.db?.admin().ping();
        dbPing = true;
      } catch (error) {
        log.warn('Database ping failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    (res as any).status(200).json({
      status: isDbConnected && dbPing ? 'OK' : 'PARTIAL',
      message: 'Immigration Portal API Health Check',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: isDbConnected,
        pingSuccess: dbPing,
        readyState: dbInfo.readyState,
        readyStateDescription: getReadyStateDescription(dbInfo.readyState),
        host: dbInfo.host,
        port: dbInfo.port,
        name: dbInfo.name
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      uptime: Math.round(process.uptime())
    });
  } catch (error) {
    (res as any).status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Function to get readable description of mongoose ready state
function getReadyStateDescription(state: number): string {
  switch (state) {
    case 0: return 'disconnected';
    case 1: return 'connected';
    case 2: return 'connecting';
    case 3: return 'disconnecting';
    default: return 'unknown';
  }
}

// Health check routes (no authentication required)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/team-members', teamMemberRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/draw', drawRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/audit-logs', enhancedAuditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/tenant-validation', tenantValidationRoutes);
app.use('/api/request-logging', requestLoggingRoutes);
app.use('/api/performance-monitoring', performanceMonitoringRoutes);
app.use('/api/dns', dnsAutomationRoutes);
app.use('/api/ssl', sslAutomationRoutes);
app.use('/api/subdomains', subdomainProvisioningRoutes);
app.use('/api/logging', loggingRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/database', indexingRoutes);
app.use('/api/rate-limits', rateLimitRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/data-isolation', dataIsolationRoutes);
app.use('/api/impersonation', impersonationRoutes);
app.use('/api/tenant-resolution', tenantResolutionRoutes);
app.use('/api/database-migration', databaseMigrationRoutes);
app.use('/api/themes', themeRoutes);
app.use('/api/logos', logoRoutes);
app.use('/api/tenant', tenantActivityRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Tenant-specific API routes (for tenant website integration)
import tenantApiRoutes from './routes/tenantApiRoutes';
app.use('/api/v1', tenantApiRoutes);

// ==================== FRONTEND SERVING ====================
// CommonJS already has __dirname available

// Path to frontend build
const frontendDistPath = path.join(__dirname, '../../frontend/dist');

console.log('Frontend dist path:', frontendDistPath);

// Serve static files from React build (CSS, JS, images, etc.)
// IMPORTANT: This must be AFTER security middleware to apply CSP headers
app.use(express.static(frontendDistPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  index: false // Don't auto-serve index.html for directory requests
}));

// SPA fallback: Serve index.html for all non-API routes (but not static assets)
app.get('*', (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Skip if it's a static asset (JS, CSS, images, etc.)
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
    return next(); // Let express.static handle it
  }
  
  console.log(`Serving React app for route: ${req.path}`);
  
  // Serve index.html for client-side routing
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).json({
        status: 'error',
        message: 'Failed to load application',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  });
});
// ==================== END FRONTEND SERVING ====================

// 404 handler (for API routes only - now handled above for frontend)
app.use('*', (req: any, res: any) => {
  // This should only catch API routes that weren't handled
  if (req.path.startsWith('/api/')) {
    (res as any).status(404).json({
      status: 'error',
      message: `API route ${(req as any).originalUrl} not found`
    });
  }
});

// Error tracking middleware (before error handler)
app.use(errorTrackingMiddleware);

// Global error handler (must be last)
app.use(errorHandler);

// Import Redis service
import { RedisService } from './services/redisService';

// Initialize services with proper error handling
const initializeServices = async () => {
  const services = [
    {
      name: 'Redis Service',
      init: () => RedisService.getInstance().initialize(),
      critical: false
    },
    {
      name: 'Sentry Service',
      init: async () => {
        await SentryService.getInstance().initialize();
      },
      critical: false
    },
    {
      name: 'Rate Limiting Service',
      init: () => RateLimitService.initialize(),
      critical: false
    },
    {
      name: 'Session Management Service',
      init: () => SessionService.initialize(),
      critical: false
    },
    {
      name: 'Security Service',
      init: () => SecurityService.initialize(),
      critical: false
    },
    {
      name: 'Data Isolation Service',
      init: () => DataIsolationService.initialize(),
      critical: false
    },
    {
      name: 'Impersonation Service',
      init: () => ImpersonationService.initialize(),
      critical: false
    },
    {
      name: 'Tenant Resolution Service',
      init: () => TenantResolutionService.initialize(),
      critical: false
    },
    {
      name: 'Database Migration Service',
      init: () => DatabaseMigrationService.initialize(),
      critical: false
    }
  ];

  for (const service of services) {
    try {
      await service.init();
      log.info(`✅ ${service.name} initialized`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (service.critical) {
        log.error(`❌ ${service.name} failed to initialize (CRITICAL)`, { error: errorMessage });
        throw error;
      } else {
        log.warn(`⚠️  ${service.name} failed to initialize (non-critical)`, { error: errorMessage });
      }
    }
  }
};

// Database connection and server startup
const startServer = async () => {
  try {
    log.info('🚀 Starting Immigration Portal Server...', {
      environment: process.env.NODE_ENV,
      port: PORT,
      nodeVersion: process.version
    });

    // Connect to MongoDB with better error handling
    try {
      await connectDatabase();
      log.info('✅ Database connected successfully');
      
      // Run database migrations
      try {
        const { addTenantDomainIndex } = await import('./models/migrations/add-tenant-domain-index');
        await addTenantDomainIndex();
        log.info('✅ Database migrations completed successfully');
      } catch (migrationError) {
        const errorMessage = migrationError instanceof Error ? migrationError.message : String(migrationError);
        log.error('❌ Database migration failed:', { error: errorMessage });
        // Don't fail startup for migration errors, but log them
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('❌ Database connection failed', { error: errorMessage });
      
      // In production, we must have a database connection
      if (process.env.NODE_ENV === 'production') {
        throw error;
      } else {
        log.warn('⚠️  Continuing without database in development mode');
      }
    }

    // Initialize Row-Level Security system
    initializeRowLevelSecurity();
    
    // Initialize services
    await initializeServices();
    
    // Initialize Performance Monitoring Service
    try {
      PerformanceMonitoringService.initialize();
      log.info('✅ Performance Monitoring Service initialized (memory optimized)');
    } catch (error) {
      log.error('❌ Performance Monitoring Service failed to initialize', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      log.warn('⚠️  Continuing without performance monitoring - service will be unavailable');
    }
    
    // Initialize Lightweight Monitoring
    LightweightMonitoring.initialize();
    log.info('✅ Lightweight Monitoring initialized');
    
    // Configure session middleware AFTER SessionService initialization
    try {
      app.use(SessionService.createSessionMiddleware() as any);
      app.use(sessionActivityTracking());
      app.use(sessionSecurityPolicy());
      log.info('✅ Session middleware configured');
    } catch (error) {
      log.warn('⚠️  Session middleware configuration skipped', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Configure comprehensive tenant resolution middleware
    try {
      app.use(comprehensiveTenantResolution());
      log.info('✅ Tenant resolution middleware configured');
    } catch (error) {
      log.warn('⚠️  Tenant resolution middleware configuration skipped', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Configure comprehensive data isolation middleware
    try {
      app.use(comprehensiveDataIsolation());
      log.info('✅ Data isolation middleware configured');
    } catch (error) {
      log.warn('⚠️  Data isolation middleware configuration skipped', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
    
    // Configure comprehensive impersonation middleware
    try {
      app.use(comprehensiveImpersonation());
      log.info('✅ Impersonation middleware configured');
    } catch (error) {
      log.warn('⚠️  Impersonation middleware configuration skipped', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    // Check for existing instances before starting
    const isAnotherInstanceRunning = await ProcessManager.isAnotherInstanceRunning();
    if (isAnotherInstanceRunning) {
      const instanceInfo = ProcessManager.getInstanceInfo();
      console.log('⚠️  Another server instance is already running!');
      console.log('📊 Instance Info:', instanceInfo);
      console.log('💡 To start a new instance:');
      console.log('   1. Stop the existing instance first');
      console.log('   2. Or use: npm run force-start (to force cleanup and start)');
      process.exit(1);
    }

    // Create instance lock
    await ProcessManager.createInstanceLock();

    // Start the server with intelligent port management
    const { port, server } = await PortManager.startServerWithPortManagement(app, {
      preferredPort: parseInt(process.env.PORT || '5000', 10),
      fallbackPorts: [5001, 5002, 5003, 5004, 5005, 3000, 3001, 8000, 8001]
    });

    log.info(`🚀 Server running on port ${port}`, {
      port: port,
      apiDocs: `http://localhost:${port}/api/health`,
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: isDatabaseConnected(),
        info: getDatabaseInfo()
      },
      redis: {
        enabled: process.env.REDIS_ENABLED === 'true',
        url: process.env.REDIS_URL ? 'configured' : 'not configured',
        password: process.env.REDIS_PASSWORD ? 'configured' : 'not configured'
      }
    });
      
    // Start automated notification checks only if database is connected
    if (isDatabaseConnected()) {
      try {
        NotificationService.startAutomatedChecks();
        log.info('✅ Notification service automated checks started');
      } catch (error) {
        log.warn('⚠️  Failed to start notification automated checks', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      log.info(`👋 ${signal} received. Shutting down gracefully...`, { signal });
      
      // Close server gracefully
      server.close(async () => {
        log.info('✅ Server closed');
        
        // Close database connection if connected
        if (isDatabaseConnected()) {
          try {
            await disconnectDatabase();
            log.info('✅ Database connection closed');
          } catch (error) {
            log.error('❌ Error closing database connection', { 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        }
        
        process.exit(0);
      });
      
      // Force close after 15 seconds
      setTimeout(() => {
        log.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    log.error('❌ Failed to start server', { 
      error: errorMessage,
      stack: errorStack,
      environment: process.env.NODE_ENV
    });
    
    console.error('❌ Failed to start server:', errorMessage);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  const errorStack = reason instanceof Error ? reason.stack : undefined;
  
  log.error('❌ Unhandled Promise Rejection:', { 
    error: {
      name: 'UnhandledPromiseRejection',
      message: errorMessage,
      stack: errorStack
    }
  });
  
  // In production, log the error but don't crash immediately
  if (process.env.NODE_ENV === 'production') {
    log.warn('⚠️  Continuing despite unhandled promise rejection in production');
  } else {
    // In development, we might want to crash to catch issues early
    console.error('Unhandled Promise Rejection:', reason);
    // Uncomment the line below if you want to crash on unhandled rejections in dev
    // process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  log.error('❌ Uncaught Exception:', { 
    error: error.message, 
    stack: error.stack,
    name: error.name
  });
  
  // Log the error and exit gracefully
  console.error('Uncaught Exception:', error);
  
  // Give some time for logging before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle process warnings
process.on('warning', (warning) => {
  log.warn('⚠️  Process Warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

// Start the server
startServer();

export default app;