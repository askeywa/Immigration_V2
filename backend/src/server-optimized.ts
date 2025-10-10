// backend/src/server-optimized.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
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

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { connectDatabase, disconnectDatabase, isDatabaseConnected, getDatabaseInfo } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { log } from './utils/logger';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 5000;

// Basic security middleware (minimal set for fast startup)
app.use(helmet());
app.use(cors());
app.use(compression());

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Basic rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Basic logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Basic health check route (no database dependency)
app.get('/api/health', (req: Request, res: Response) => {
  const dbInfo = getDatabaseInfo();
  res.status(200).json({
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

// Import only essential routes for fast startup
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import tenantRoutes from './routes/tenantRoutes';
import healthRoutes from './routes/healthRoutes';
import superAdminRoutes from './routes/superAdminRoutes';

// Essential API routes only
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/super-admin', superAdminRoutes);

// Frontend serving
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  lastModified: true,
  index: false
}));

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$/)) {
    return next();
  }
  
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

// 404 handler
app.use('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      status: 'error',
      message: `API route ${req.originalUrl} not found`
    });
  }
});

// Global error handler
app.use(errorHandler);

// Optimized startup function
const startServer = async () => {
  try {
    const startTime = Date.now();
    log.info('🚀 Starting Immigration Portal Server (Optimized)...', {
      environment: process.env.NODE_ENV,
      port: PORT,
      nodeVersion: process.version
    });

    // Connect to MongoDB (essential only)
    try {
      await connectDatabase();
      log.info('✅ Database connected successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('❌ Database connection failed', { error: errorMessage });
      
      if (process.env.NODE_ENV === 'production') {
        throw error;
      } else {
        log.warn('⚠️  Continuing without database in development mode');
      }
    }

    // Start the server immediately
    const server = app.listen(PORT, () => {
      const startupTime = Date.now() - startTime;
      log.info(`🚀 Server running on port ${PORT}`, {
        port: PORT,
        startupTime: `${startupTime}ms`,
        apiDocs: `http://localhost:${PORT}/api/health`,
        environment: process.env.NODE_ENV || 'development',
        database: {
          connected: isDatabaseConnected(),
          info: getDatabaseInfo()
        }
      });
      
      console.log(`\n🎉 Server started in ${startupTime}ms!`);
      console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Frontend: http://localhost:${PORT}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      log.info(`👋 ${signal} received. Shutting down gracefully...`, { signal });
      
      server.close(async () => {
        log.info('✅ Server closed');
        
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
      
      setTimeout(() => {
        log.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 15000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('❌ Failed to start server', { 
      error: errorMessage,
      environment: process.env.NODE_ENV
    });
    
    console.error('❌ Failed to start server:', errorMessage);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  log.error('❌ Unhandled Promise Rejection:', { error: errorMessage });
  
  if (process.env.NODE_ENV === 'production') {
    log.warn('⚠️  Continuing despite unhandled promise rejection in production');
  } else {
    console.error('Unhandled Promise Rejection:', reason);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  log.error('❌ Uncaught Exception:', { 
    error: error.message, 
    stack: error.stack,
    name: error.name
  });
  
  console.error('Uncaught Exception:', error);
  
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Start the server
startServer();

export default app;
