// backend/src/middleware/requestResponseLogging.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from './tenantResolution';
import { log } from '../utils/logger';
import { AuditLogService } from '../services/auditLogService';
import { config } from '../config/config';

export interface LoggingConfig {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logPerformance: boolean;
  logHeaders: boolean;
  logBody: boolean;
  logQuery: boolean;
  maxBodySize: number;
  maxHeaderSize: number;
  sensitiveFields: string[];
  excludePaths: string[];
  includePaths: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface RequestLogData {
  requestId: string;
  timestamp: Date;
  method: string;
  url: string;
  path: string;
  query: any;
  headers: any;
  body: any;
  userAgent: string;
  ip: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  isSuperAdmin?: boolean;
  tenantDomain?: string;
}

export interface ResponseLogData {
  requestId: string;
  timestamp: Date;
  statusCode: number;
  headers: any;
  body?: any;
  responseTime: number;
  size: number;
  tenantId?: string;
  userId?: string;
  error?: string;
}

export interface PerformanceMetrics {
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  tenantId?: string;
  userId?: string;
  statusCode: number;
}

export class RequestResponseLoggingService {
  private static config: LoggingConfig = {
    enabled: true,
    logRequests: true,
    logResponses: true,
    logErrors: true,
    logPerformance: true,
    logHeaders: false,
    logBody: true,
    logQuery: true,
    maxBodySize: 1024, // 1KB
    maxHeaderSize: 512, // 512B
    sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization', 'cookie'],
    excludePaths: ['/health', '/ping', '/metrics', '/favicon.ico'],
    includePaths: [],
    logLevel: 'info'
  };

  private static performanceMetrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS_HISTORY = 50; // Reduced from 1000 to 50

  /**
   * Configure logging settings
   */
  static configure(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('Request/Response logging configuration updated', { config: this.config });
  }

  /**
   * Main logging middleware
   */
  static createLoggingMiddleware() {
    return async (req: TenantRequest, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const requestId = this.generateRequestId();
      const startTime = process.hrtime();
      const startCpuUsage = process.cpuUsage();
      const startMemory = process.memoryUsage();

      // Attach request ID to request and response
      (req as any).requestId = requestId;
      (res as any).setHeader('X-Request-ID', requestId);

      // Log request
      if (this.config.logRequests && this.shouldLogRequest(req)) {
        await this.logRequest(req, requestId);
      }

      // Override response methods to capture response data
      const originalSend = (res as any).send;
      const originalJson = (res as any).json;
      const originalEnd = (res as any).end;

      let responseBody: any;
      let responseSize = 0;

      (res as any).send = function(data: any) {
        responseBody = data;
        try {
          if (typeof data === 'string') {
            responseSize = Buffer.byteLength(data, 'utf8');
          } else if (data && typeof data === 'object') {
            responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
          } else {
            responseSize = Buffer.byteLength(String(data || ''), 'utf8');
          }
        } catch (error) {
          responseSize = 0;
        }
        return originalSend.call(this, data);
      };

      (res as any).json = function(data: any) {
        responseBody = data;
        try {
          responseSize = Buffer.byteLength(JSON.stringify(data || {}), 'utf8');
        } catch (error) {
          responseSize = 0;
        }
        return originalJson.call(this, data);
      };

      (res as any).end = function(data?: any) {
        responseBody = data;
        if (data) {
          try {
            if (typeof data === 'string') {
              responseSize = Buffer.byteLength(data, 'utf8');
            } else {
              responseSize = Buffer.byteLength(String(data), 'utf8');
            }
          } catch (error) {
            responseSize = 0;
          }
        }
        return originalEnd.call(this, data, 'utf8');
      };

      // Capture response completion
      (res as any).on('finish', async () => {
        const endTime = process.hrtime(startTime);
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const endMemory = process.memoryUsage();
        const responseTime = (endTime as any)[0] * 1000 + (endTime as any)[1] / 1000000; // Convert to milliseconds

        // Log response
        if (this.config.logResponses && this.shouldLogRequest(req)) {
          await this.logResponse(req, res, requestId, responseTime, responseSize, responseBody);
        }

        // Log performance metrics
        if (this.config.logPerformance) {
          await this.logPerformanceMetrics(req, res, requestId, responseTime, endMemory, endCpuUsage);
        }

        // Log errors
        if (this.config.logErrors && (res as any).statusCode >= 400) {
          await this.logError(req, res, requestId, responseTime, responseBody);
        }
      });

      // Handle errors
      (res as any).on('error', async (error: Error) => {
        const endTime = process.hrtime(startTime);
        const responseTime = (endTime as any)[0] * 1000 + (endTime as any)[1] / 1000000;

        await this.logError(req, res, requestId, responseTime, error instanceof Error ? error.message : String(error), error);
      });

      next();
    };
  }

  /**
   * Log incoming request
   */
  private static async logRequest(req: TenantRequest, requestId: string): Promise<void> {
    try {
      const logData: RequestLogData = {
        requestId,
        timestamp: new Date(),
        method: (req as any).method,
        url: (req as any).url,
        path: (req as any).path,
        query: this.config.logQuery ? this.sanitizeData((req as any).query) : undefined,
        headers: this.config.logHeaders ? this.sanitizeData((req as any).headers) : undefined,
        body: this.config.logBody ? this.sanitizeData((req as any).body) : undefined,
        userAgent: (req as any).get('User-Agent') || 'unknown',
        ip: (req as any).ip || (req as any).connection.remoteAddress || 'unknown',
        tenantId: (req as any).tenantId,
        userId: (req as any).user?._id,
        userRole: (req as any).user?.role,
        isSuperAdmin: (req as any).isSuperAdmin,
        tenantDomain: (req as any).tenantDomain || undefined
      };

      // Log to application logger
      log.info('Incoming request', {
        requestId,
        method: logData.method,
        path: logData.path,
        tenantId: logData.tenantId,
        userId: logData.userId,
        userRole: logData.userRole,
        ip: logData.ip,
        userAgent: logData.userAgent
      });

      // Log to audit service for security-sensitive requests
      if (this.isSecuritySensitiveRequest(req) && (req as any).user?._id) {
        await AuditLogService.logAction(
          (req as any).user._id,
          (req as any).user.email || 'unknown@example.com',
          'read',
          'system',
          {
            resourceId: `${logData.method}:${logData.path}`,
            details: { method: logData.method, path: logData.path },
            ipAddress: logData.ip,
            userAgent: logData.userAgent,
            tenantId: (req as any).tenantId,
            severity: 'low',
            category: 'system'
          }
        );
      }

    } catch (error) {
      log.error('Failed to log request', {
        requestId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
  }

  /**
   * Log outgoing response
   */
  private static async logResponse(
    req: TenantRequest, 
    res: Response, 
    requestId: string, 
    responseTime: number,
    size: number,
    body?: any
  ): Promise<void> {
    try {
      const logData: ResponseLogData = {
        requestId,
        timestamp: new Date(),
        statusCode: (res as any).statusCode,
        headers: this.config.logHeaders ? this.sanitizeData((res as any).getHeaders()) : undefined,
        body: this.config.logBody ? this.sanitizeData(body) : undefined,
        responseTime,
        size,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?._id
      };

      // Determine log level based on status code
      let logLevel: 'info' | 'warn' | 'error' = 'info';
      if ((res as any).statusCode >= 500) logLevel = 'error';
      else if ((res as any).statusCode >= 400) logLevel = 'warn';

      // Log to application logger
      (log as any)[logLevel]('Outgoing response', {
        requestId,
        statusCode: logData.statusCode,
        responseTime: responseTime,
        size: `${size}B`,
        tenantId: logData.tenantId,
        userId: logData.userId
      });

      // Log to audit service for security-sensitive responses
      if (this.isSecuritySensitiveResponse(req, res) && (req as any).user?._id) {
        await AuditLogService.logAction(
          (req as any).user._id,
          (req as any).user.email || 'unknown@example.com',
          'read',
          'system',
          {
            resourceId: `${(req as any).method}:${(req as any).path}`,
            details: { method: (req as any).method, path: (req as any).path, statusCode: (res as any).statusCode },
            ipAddress: (req as any).ip,
            userAgent: (req as any).get('User-Agent'),
            tenantId: (req as any).tenantId,
            severity: (res as any).statusCode >= 400 ? 'medium' : 'low',
            category: 'system'
          }
        );
      }

    } catch (error) {
      log.error('Failed to log response', {
        requestId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
  }

  /**
   * Log performance metrics
   */
  private static async logPerformanceMetrics(
    req: TenantRequest,
    res: Response,
    requestId: string,
    responseTime: number,
    memoryUsage: NodeJS.MemoryUsage,
    cpuUsage: NodeJS.CpuUsage
  ): Promise<void> {
    try {
      const metrics: PerformanceMetrics = {
        requestId,
        timestamp: new Date(),
        method: (req as any).method,
        path: (req as any).path,
        responseTime,
        memoryUsage,
        cpuUsage,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?._id,
        statusCode: (res as any).statusCode
      };

      // Store metrics (keep only recent ones)
      this.performanceMetrics.push(metrics);
      if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
        this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_METRICS_HISTORY);
      }

      // Log slow requests
      if (responseTime > 1000) { // > 1 second
        log.warn('Slow request detected', {
          requestId,
          method: (req as any).method,
          path: (req as any).path,
          responseTime: responseTime,
          tenantId: (req as any).tenantId,
          userId: (req as any).user?._id,
          memoryUsage: {
            rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
          }
        });
      }

      // Log high memory usage
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // > 500MB
        log.warn('High memory usage detected', {
          requestId,
          method: (req as any).method,
          path: (req as any).path,
          memoryUsage: {
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
          },
          tenantId: (req as any).tenantId,
          userId: (req as any).user?._id
        });
      }

    } catch (error) {
      log.error('Failed to log performance metrics', {
        requestId,
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
  }

  /**
   * Log errors
   */
  private static async logError(
    req: TenantRequest,
    res: Response,
    requestId: string,
    responseTime: number,
    errorMessage?: string,
    error?: Error
  ): Promise<void> {
    try {
      log.error('Request error', {
        requestId,
        method: (req as any).method,
        path: (req as any).path,
        statusCode: (res as any).statusCode,
        responseTime: responseTime,
        error: errorMessage || error?.message,
        stack: error?.stack,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?._id,
        ip: (req as any).ip,
        userAgent: (req as any).get('User-Agent')
      });

      // Log to audit service for security-relevant errors
      if (((res as any).statusCode === 401 || (res as any).statusCode === 403 || (res as any).statusCode === 429) && (req as any).user?._id) {
        await AuditLogService.logAction(
          (req as any).user._id,
          (req as any).user.email || 'unknown@example.com',
          'read',
          'system',
          {
            resourceId: `${(req as any).method}:${(req as any).path}`,
            details: { method: (req as any).method, path: (req as any).path, statusCode: (res as any).statusCode, error: errorMessage },
            ipAddress: (req as any).ip,
            userAgent: (req as any).get('User-Agent'),
            tenantId: (req as any).tenantId,
            severity: 'high',
            category: 'security'
          }
        );
      }

    } catch (logError) {
      log.error('Failed to log error', {
        requestId,
        originalError: errorMessage || error?.message,
        logError: logError instanceof Error ? logError.message : String(logError)
      });
    }
  }

  /**
   * Check if request should be logged
   */
  private static shouldLogRequest(req: TenantRequest): boolean {
    const path = (req as any).path;

    // Ensure config is properly initialized
    if (!this.config) {
      log.warn('RequestResponseLogging config is not initialized, using defaults');
      return true;
    }

    // Check exclude paths
    if (this.config.excludePaths && this.config.excludePaths.some((excludePath: any) => path.startsWith(excludePath))) {
      return false;
    }

    // Check include paths (if specified, only log these)
    if (this.config.includePaths && this.config.includePaths.length > 0) {
      return this.config.includePaths.some((includePath: any) => path.startsWith(includePath));
    }

    return true;
  }

  /**
   * Check if request is security-sensitive
   */
  private static isSecuritySensitiveRequest(req: TenantRequest): boolean {
    const sensitivePaths = ['/auth', '/login', '/register', '/mfa', '/api-keys', '/admin'];
    const sensitiveMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    
    return sensitivePaths.some((path: any) => (req as any).path.startsWith(path)) || 
           sensitiveMethods.includes((req as any).method);
  }

  /**
   * Check if response is security-sensitive
   */
  private static isSecuritySensitiveResponse(req: TenantRequest, res: Response): boolean {
    return this.isSecuritySensitiveRequest(req) || 
           (res as any).statusCode >= 400;
  }

  /**
   * Sanitize sensitive data
   */
  private static sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return (data as any).map((item: any) => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      if (this.config.sensitiveFields.some((field: any) => lowerKey.includes(field))) {
        (sanitized as any)[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        (sanitized as any)[key] = this.sanitizeData(value);
      } else if (typeof value === 'string' && value.length > this.config.maxBodySize) {
        (sanitized as any)[key] = value.substring(0, this.config.maxBodySize) + '...[TRUNCATED]';
      } else {
        (sanitized as any)[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): {
    recent: PerformanceMetrics[];
    averageResponseTime: number;
    slowestRequests: PerformanceMetrics[];
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const recent = this.performanceMetrics.slice(-100); // Last 100 requests
    const averageResponseTime = recent.length > 0 
      ? recent.reduce((sum: any, m: any) => sum + m.responseTime, 0) / recent.length 
      : 0;
    
    const slowestRequests = [...this.performanceMetrics]
      .sort((a, b) => b.responseTime - (a as any).responseTime)
      .slice(0, 10);

    return {
      recent,
      averageResponseTime,
      slowestRequests,
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Clear performance metrics
   */
  static clearMetrics(): void {
    this.performanceMetrics = [];
    log.info('Performance metrics cleared');
  }
}

// Default middleware instance
export const requestResponseLogging = RequestResponseLoggingService.createLoggingMiddleware();

export default RequestResponseLoggingService;
