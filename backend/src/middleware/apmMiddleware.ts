// backend/src/middleware/apmMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from './tenantResolution';
import SentryService from '../config/sentry';
import NewRelicService from '../config/newrelic';
import { log } from '../utils/logger';

/**
 * Sentry middleware for Express
 */
export const sentryMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  try {
    const sentryService = SentryService.getInstance();
    
    if (!sentryService.isReady()) {
      return next();
    }

    // Set request context
    sentryService.setRequestContext(req);

    // Set user context if available
    if ((req as any).user) {
      sentryService.setUser({
        id: (req as any).user.id,
        username: (req as any).user.username,
        email: (req as any).user.email,
        tenantId: (req as any).tenantId
      });
    }

    // Set tenant context if available
    if ((req as any).tenantId) {
      sentryService.setTenantContext((req as any).tenantId, (req as any).tenant?.name);
    }

    // Add breadcrumb for request
    sentryService.addBreadcrumb({
      message: `${(req as any).method} ${(req as any).path}`,
      category: 'http',
      level: 'info',
      data: {
        method: (req as any).method,
        url: (req as any).url,
        status_code: (res as any).statusCode,
        tenant_id: (req as any).tenantId,
        user_id: (req as any).user?.id
      }
    });

    next();
  } catch (error) {
    log.error('Sentry middleware error', {
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
    next();
  }
};

/**
 * New Relic middleware for Express
 */
export const newRelicMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  try {
    const newRelicService = NewRelicService.getInstance();
    
    if (!newRelicService.isReady()) {
      return next();
    }

    // Set request context
    newRelicService.setRequestContext(req);

    // Set user context if available
    if ((req as any).user) {
      newRelicService.setUser({
        id: (req as any).user.id,
        username: (req as any).user.username,
        email: (req as any).user.email,
        tenantId: (req as any).tenantId
      });
    }

    // Set tenant context if available
    if ((req as any).tenantId) {
      newRelicService.setTenantContext((req as any).tenantId, (req as any).tenant?.name);
    }

    // Record custom event for API calls
    newRelicService.recordCustomEvent('APIRequest', {
      method: (req as any).method,
      endpoint: (req as any).path,
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      userAgent: (req as any).get('User-Agent'),
      ip: (req as any).ip
    });

    next();
  } catch (error) {
    log.error('New Relic middleware error', {
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
    next();
  }
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Override (res as any).end to capture response time
  const originalEnd = (res as any).end;
  (res as any).end = function(chunk?: any, encoding?: any): any {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage();
    const memoryDelta = {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external
    };

    try {
      // Send metrics to Sentry
      const sentryService = SentryService.getInstance();
      if (sentryService.isReady()) {
        sentryService.startSpan('http.request', 'http', (span: any) => {
          (span as any).setTag('http.method', (req as any).method);
          (span as any).setTag('http.url', (req as any).url);
          (span as any).setTag('http.status_code', (res as any).statusCode.toString());
          (span as any).setTag('tenant_id', (req as any).tenantId || 'unknown');
          (span as any).setData('response_time', responseTime);
          (span as any).setData('memory_delta', memoryDelta);
        });

        // Record custom event
        (sentryService as any).recordCustomEvent('RequestPerformance', {
          method: (req as any).method,
          url: (req as any).url,
          statusCode: (res as any).statusCode,
          responseTime,
          memoryDelta,
          tenantId: (req as any).tenantId,
          userId: (req as any).user?.id
        });
      }

      // Send metrics to New Relic
      const newRelicService = NewRelicService.getInstance();
      if (newRelicService.isReady()) {
        newRelicService.recordApiCall((req as any).method, (req as any).path, (res as any).statusCode, responseTime);
        newRelicService.recordMetric('ResponseTime', responseTime);
        newRelicService.recordMetric('MemoryUsage', endMemory.heapUsed);
        newRelicService.recordMetric('MemoryDelta', memoryDelta.heapUsed);

        // Record custom attributes
        newRelicService.setAttributes({
          'request.responseTime': responseTime,
          'request.memoryDelta': memoryDelta.heapUsed,
          'request.statusCode': (res as any).statusCode,
          'request.tenantId': (req as any).tenantId || 'unknown'
        });
      }

      // Log performance metrics
      if (responseTime > 1000) { // Log slow requests
        log.warning('Slow request detected', {
          method: (req as any).method,
          url: (req as any).url,
          responseTime,
          statusCode: (res as any).statusCode,
          tenantId: (req as any).tenantId,
          userId: (req as any).user?.id,
          memoryDelta
        });
      }

    } catch (error) {
      log.error('Performance monitoring error', {
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error tracking middleware
 */
export const errorTrackingMiddleware = (error: Error, req: TenantRequest, res: Response, next: NextFunction): void => {
  try {
    // Send error to Sentry
    const sentryService = SentryService.getInstance();
    if (sentryService.isReady()) {
      sentryService.captureException(error, {
        request: {
          method: (req as any).method,
          url: (req as any).url,
          headers: (req as any).headers,
          body: (req as any).body,
          query: (req as any).query,
          params: (req as any).params
        },
        user: {
          id: (req as any).user?.id,
          username: (req as any).user?.username,
          email: (req as any).user?.email,
          tenantId: (req as any).tenantId
        },
        tenant: {
          id: (req as any).tenantId,
          name: (req as any).tenant?.name,
          domain: (req as any).tenantDomain
        }
      });
    }

    // Send error to New Relic
    const newRelicService = NewRelicService.getInstance();
    if (newRelicService.isReady()) {
      newRelicService.recordError(error, {
        method: (req as any).method,
        url: (req as any).url,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
        statusCode: (res as any).statusCode
      });

      // Record custom event for errors
      newRelicService.recordCustomEvent('Error', {
        errorType: error.constructor.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error.stack,
        method: (req as any).method,
        url: (req as any).url,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      });
    }

    log.error('Application error captured', {
      error: error instanceof Error ? error.message : String(error),
      stack: error.stack,
      method: (req as any).method,
      url: (req as any).url,
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id
    });

  } catch (trackingError) {
    log.error('Error tracking failed', {
      originalError: error instanceof Error ? error.message : String(error),
      trackingError: trackingError instanceof Error ? trackingError.message : String(trackingError)
    });
  }

  next(error);
};

/**
 * Database query monitoring middleware
 */
export const databaseMonitoringMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const newRelicService = NewRelicService.getInstance();
  
  if (!newRelicService.isReady()) {
    return next();
  }

  // Monitor MongoDB operations
  const originalQuery = require('mongoose').Query.prototype.exec;
  require('mongoose').Query.prototype.exec = function(...args: any[]) {
    const startTime = Date.now();
    const query = this;
    
    return originalQuery.apply(this, args).then((result: any) => {
      const duration = Date.now() - startTime;
      
      newRelicService.recordDatabaseQuery(
        query.op || 'find',
        query.model?.modelName || 'Unknown',
        duration
      );

      return result;
    }).catch((error: Error) => {
      const duration = Date.now() - startTime;
      
      newRelicService.recordDatabaseQuery(
        query.op || 'find',
        query.model?.modelName || 'Unknown',
        duration,
        error
      );

      throw error;
    });
  };

  next();
};

/**
 * Business transaction monitoring
 */
export const businessTransactionMiddleware = (transactionName: string) => {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    
    // Override (res as any).end to capture business transaction metrics
    const originalEnd = (res as any).end;
    (res as any).end = function(chunk?: any, encoding?: any): any {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const success = (res as any).statusCode < 400;

      try {
        const newRelicService = NewRelicService.getInstance();
        if (newRelicService.isReady()) {
          newRelicService.recordBusinessTransaction(transactionName, duration, success);
        }

        const sentryService = SentryService.getInstance();
        if (sentryService.isReady()) {
          (sentryService as any).recordCustomEvent('BusinessTransaction', {
            name: transactionName,
            duration,
            success,
            statusCode: (res as any).statusCode,
            tenantId: (req as any).tenantId,
            userId: (req as any).user?.id
          });
        }

      } catch (error) {
        log.error('Business transaction monitoring error', {
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

/**
 * APM health check middleware
 */
export const apmHealthCheckMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  if ((req as any).url === '/health/apm') {
    try {
      const sentryService = SentryService.getInstance();
      const newRelicService = NewRelicService.getInstance();

      const health = {
        timestamp: new Date().toISOString(),
        apm: {
          sentry: {
            enabled: sentryService.isReady(),
            dsn: sentryService.isReady() ? 'configured' : 'not configured'
          },
          newRelic: {
            enabled: newRelicService.isReady(),
            licenseKey: newRelicService.isReady() ? 'configured' : 'not configured'
          }
        },
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      };

      (res as any).json(health);
    } catch (error) {
      (res as any).status(500).json({
        error: 'APM health check failed',
        message: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
      });
    }
  } else {
    next();
  }
};
