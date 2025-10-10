// backend/src/config/logging.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import MongoDBTransport from 'winston-mongodb';
import { config } from './config';
import { connectDatabase } from './database';

export interface LoggingConfig {
  level: string;
  format: winston.Logform.Format;
  defaultMeta: Record<string, any>;
  transports: winston.transport[];
  exitOnError: boolean;
  silent: boolean;
}

export interface LogContext {
  tenantId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  ipAddress?: string;
  userAgent?: string;
  error?: string | {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    details?: any;
  };
  metadata?: Record<string, any>;
  tags?: string[];
  [key: string]: any;
}

export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export class LoggingService {
  private static instance: LoggingService;
  private logger: winston.Logger;
  private config: LoggingConfig;

  private constructor() {
    this.config = {
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta
          });
        })
      ),
      defaultMeta: {
        service: 'immigration-portal',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: require('os').hostname(),
        processId: process.pid
      },
      transports: [],
      exitOnError: false,
      silent: process.env.NODE_ENV === 'test'
    };

    this.initializeTransports();
    this.logger = winston.createLogger(this.config);
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Initialize logging transports
   */
  private initializeTransports(): void {
    // Console transport
    if (process.env.NODE_ENV !== 'production') {
      this.config.transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({
              format: 'HH:mm:ss'
            }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          )
        })
      );
    }

    // File transports for production
    if (process.env.NODE_ENV === 'production') {
      // Error logs
      this.config.transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '5m',         // ✅ REDUCED FROM 20m to 5m
          maxFiles: '3d',        // ✅ REDUCED FROM 14d to 3d
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Combined logs
      this.config.transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '5m',         // ✅ REDUCED FROM 20m to 5m
          maxFiles: '3d',        // ✅ REDUCED FROM 14d to 3d
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // Audit logs
      this.config.transports.push(
        new DailyRotateFile({
          filename: 'logs/audit-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          maxSize: '5m',         // ✅ REDUCED FROM 20m to 5m
          maxFiles: '7d',        // ✅ REDUCED FROM 30d to 7d
          zippedArchive: true,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );
    }

    // ❌ MongoDB transport DISABLED to prevent memory leaks
    // MongoDB logging creates significant memory buildup in production
    if (config.mongoUri && process.env.LOG_MONGODB_ENABLED === 'true' && process.env.NODE_ENV !== 'production') {
      console.log('MongoDB logging disabled in production for memory optimization');
    }
  }

  /**
   * Create a child logger with default context
   */
  createChildLogger(defaultContext: LogContext): winston.Logger {
    return this.logger.child(defaultContext);
  }

  /**
   * Log error message
   */
  error(message: string, context?: LogContext): void {
    this.logger.error(message, {
      ...context,
      level: 'error',
      severity: this.determineSeverity('error', (context as any)?.severity as string)
    });
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, {
      ...context,
      level: 'warn',
      severity: this.determineSeverity('warn', (context as any)?.severity as string)
    });
  }

  /**
   * Log warning message (alias for warn)
   */
  warning(message: string, context?: LogContext): void {
    this.logger.warn(message, {
      ...context,
      level: 'warn',
      severity: this.determineSeverity('warn', (context as any)?.severity as string)
    });
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      severity: this.determineSeverity('info', (context as any)?.severity as string)
    });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, {
      ...context,
      level: 'debug',
      severity: this.determineSeverity('debug', (context as any)?.severity as string)
    });
  }

  /**
   * Log audit message
   */
  audit(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'audit',
      severity: 'medium'
    });
  }

  /**
   * Log security event
   */
  security(message: string, context?: LogContext): void {
    this.logger.warn(message, {
      ...context,
      level: 'warn',
      category: 'security',
      severity: 'high'
    });
  }

  /**
   * Log performance metrics
   */
  performance(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'performance',
      severity: 'low'
    });
  }

  /**
   * Log business event
   */
  business(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'business',
      severity: 'medium'
    });
  }

  /**
   * Log API request
   */
  apiRequest(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'api',
      source: 'backend',
      severity: 'low'
    });
  }

  /**
   * Log API response
   */
  apiResponse(message: string, context?: LogContext): void {
    const severity = context?.statusCode && context.statusCode >= 400 ? 'medium' : 'low';
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'api',
      source: 'backend',
      severity
    });
  }

  /**
   * Log database operation
   */
  database(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'database',
      source: 'database',
      severity: 'low'
    });
  }

  /**
   * Log authentication event
   */
  auth(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'auth',
      source: 'backend',
      severity: 'medium'
    });
  }

  /**
   * Log integration event
   */
  integration(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'integration',
      source: 'external',
      severity: 'medium'
    });
  }

  /**
   * Log system event
   */
  system(message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'system',
      source: 'system',
      severity: 'low'
    });
  }

  /**
   * Log with custom category
   */
  custom(category: string, message: string, context?: LogContext): void {
    this.logger.info(message, {
      ...context,
      level: 'info',
      category: 'custom',
      subcategory: category,
      severity: (context as any)?.severity as string || 'medium'
    });
  }

  /**
   * Log error with full context
   */
  logError(error: Error, context?: LogContext): void {
    this.error(error instanceof Error ? error.message : String(error), {
      ...context,
      error: {
        name: error.name,
        message: error instanceof Error ? error.message : String(error),
        stack: error.stack,
        code: (error as any).code,
        details: (error as any).details
      },
      category: context?.category || 'system',
      severity: 'high'
    });
  }

  /**
   * Log HTTP request
   */
  logHttpRequest(req: any, context?: LogContext): void {
    this.apiRequest(`HTTP Request: ${(req as any).method} ${(req as any).path}`, {
      ...context,
      method: (req as any).method,
      endpoint: (req as any).path,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      requestId: (req as any).headers['x-request-id'],
      correlationId: (req as any).headers['x-correlation-id'],
      traceId: (req as any).headers['x-trace-id'],
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID
    });
  }

  /**
   * Log HTTP response
   */
  logHttpResponse(req: any, res: any, responseTime: number, context?: LogContext): void {
    this.apiResponse(`HTTP Response: ${(req as any).method} ${(req as any).path} - ${(res as any).statusCode}`, {
      ...context,
      method: (req as any).method,
      endpoint: (req as any).path,
      statusCode: (res as any).statusCode,
      responseTime,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      requestId: (req as any).headers['x-request-id'],
      correlationId: (req as any).headers['x-correlation-id'],
      traceId: (req as any).headers['x-trace-id'],
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID
    });
  }

  /**
   * Determine severity based on level and context
   */
  private determineSeverity(level: string, contextSeverity?: string): string {
    if (contextSeverity) {
      return contextSeverity;
    }

    switch (level) {
      case 'error':
        return 'high';
      case 'warn':
        return 'medium';
      case 'info':
      case 'debug':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Get logger instance
   */
  getLogger(): winston.Logger {
    return this.logger;
  }

  /**
   * Get configuration
   */
  getConfig(): LoggingConfig {
    return { ...this.config };
  }

  /**
   * Update log level
   */
  setLevel(level: string): void {
    this.logger.level = level;
  }

  /**
   * Add transport
   */
  addTransport(transport: winston.transport): void {
    this.logger.add(transport);
  }

  /**
   * Remove transport
   */
  removeTransport(transport: winston.transport): void {
    this.logger.remove(transport);
  }

  /**
   * Close logger
   */
  async close(): Promise<void> {
    return new Promise((resolve: any) => {
      this.logger.end(() => {
        resolve();
      });
    });
  }

  /**
   * Health check
   */
  healthCheck(): {
    healthy: boolean;
    details: {
      level: string;
      transports: number;
      mongodb: boolean;
    };
  } {
    const mongodbTransport = this.config.transports.find(
      transport => transport instanceof MongoDBTransport.MongoDB
    );

    return {
      healthy: true,
      details: {
        level: this.logger.level,
        transports: this.config.transports.length,
        mongodb: !!mongodbTransport
      }
    };
  }
}

// Create and export singleton instance
export const log = LoggingService.getInstance();

// Export convenience functions
export const logger = {
  error: (message: string, context?: LogContext) => log.error(message, context),
  warn: (message: string, context?: LogContext) => log.warn(message, context),
  info: (message: string, context?: LogContext) => log.info(message, context),
  debug: (message: string, context?: LogContext) => log.debug(message, context),
  audit: (message: string, context?: LogContext) => log.audit(message, context),
  security: (message: string, context?: LogContext) => log.security(message, context),
  performance: (message: string, context?: LogContext) => log.performance(message, context),
  business: (message: string, context?: LogContext) => log.business(message, context),
  apiRequest: (message: string, context?: LogContext) => log.apiRequest(message, context),
  apiResponse: (message: string, context?: LogContext) => log.apiResponse(message, context),
  database: (message: string, context?: LogContext) => log.database(message, context),
  auth: (message: string, context?: LogContext) => log.auth(message, context),
  integration: (message: string, context?: LogContext) => log.integration(message, context),
  system: (message: string, context?: LogContext) => log.system(message, context),
  custom: (category: string, message: string, context?: LogContext) => log.custom(category, message, context),
  logError: (error: Error, context?: LogContext) => log.logError(error, context),
  logHttpRequest: (req: any, context?: LogContext) => log.logHttpRequest(req, context),
  logHttpResponse: (req: any, res: any, responseTime: number, context?: LogContext) => 
    log.logHttpResponse(req, res, responseTime, context)
};

export default LoggingService;
