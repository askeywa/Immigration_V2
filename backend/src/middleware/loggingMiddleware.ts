// backend/src/middleware/loggingMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TenantRequest } from './tenantResolution';
import { logger, LogContext } from '../config/logging';
import { log } from '../utils/logger';

/**
 * Request ID middleware - adds unique request ID to each request
 */
export const requestIdMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const requestId = (req as any).headers['x-request-id'] as string || uuidv4();
  (req as any).requestId = requestId;
  (res as any).setHeader('X-Request-ID', requestId);
  next();
};

/**
 * Correlation ID middleware - adds correlation ID for distributed tracing
 */
export const correlationIdMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const correlationId = (req as any).headers['x-correlation-id'] as string || uuidv4();
  (req as any).correlationId = correlationId;
  (res as any).setHeader('X-Correlation-ID', correlationId);
  next();
};

/**
 * Trace ID middleware - adds trace ID for distributed tracing
 */
export const traceIdMiddleware = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const traceId = (req as any).headers['x-trace-id'] as string || uuidv4();
  (req as any).traceId = traceId;
  (res as any).setHeader('X-Trace-ID', traceId);
  next();
};

/**
 * HTTP request logging middleware
 */
export const httpRequestLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request
  const requestContext: LogContext = {
    tenantId: (req as any).tenantId,
    userId: (req as any).user?.id,
    sessionId: (req as any).sessionID,
    requestId: (req as any).requestId,
    correlationId: (req as any).correlationId,
    traceId: (req as any).traceId,
    endpoint: (req as any).path,
    method: (req as any).method,
    ipAddress: (req as any).ip,
    userAgent: (req as any).get('User-Agent'),
    category: 'api',
    source: 'backend',
    action: 'request',
    resource: (req as any).path,
    metadata: {
      query: (req as any).query,
      params: (req as any).params,
      bodySize: JSON.stringify((req as any).body || {}).length,
      contentType: (req as any).get('Content-Type'),
      accept: (req as any).get('Accept'),
      referer: (req as any).get('Referer'),
      origin: (req as any).get('Origin')
    },
    tags: ['http', 'request', (req as any).method.toLowerCase()]
  };

  logger.logHttpRequest(req, requestContext);

  // Override (res as any).end to capture response time and log response
  const originalEnd = (res as any).end;
  (res as any).end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    
    // Log response
    const responseContext: LogContext = {
      ...requestContext,
      action: 'response',
      statusCode: (res as any).statusCode,
      responseTime,
      metadata: {
        ...requestContext.metadata,
        responseSize: chunk ? chunk.length : 0,
        responseTime,
        statusMessage: (res as any).statusMessage
      },
      tags: [...(requestContext.tags || []), 'response', (res as any).statusCode >= 400 ? 'error' : 'success']
    };

    logger.logHttpResponse(req, res, responseTime, responseContext);

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Authentication logging middleware
 */
export const authLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Log authentication attempts
  if ((req as any).path.includes('/auth/login') || (req as any).path.includes('/auth/register')) {
    const authContext: LogContext = {
      tenantId: (req as any).tenantId,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'auth',
      source: 'backend',
      action: (req as any).path.includes('login') ? 'login_attempt' : 'registration_attempt',
      resource: 'authentication',
      metadata: {
        email: (req as any).body?.email,
        username: (req as any).body?.username,
        provider: (req as any).body?.provider || 'local',
        userAgent: (req as any).get('User-Agent'),
        ipAddress: (req as any).ip
      },
      tags: ['auth', (req as any).path.includes('login') ? 'login' : 'register', 'attempt']
    };

    logger.auth(`Authentication attempt: ${(req as any).method} ${(req as any).path}`, authContext);
  }

  // Log successful authentication
  if ((req as any).user && (req as any).path.includes('/auth/login')) {
    const successContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'auth',
      source: 'backend',
      action: 'login_success',
      resource: 'authentication',
      metadata: {
        userId: (req as any).user.id,
        username: (req as any).user.username,
        email: (req as any).user.email,
        role: (req as any).user.role,
        tenantId: (req as any).tenantId,
        loginTime: new Date().toISOString()
      },
      tags: ['auth', 'login', 'success']
    };

    logger.auth(`Successful login for user ${(req as any).user.username}`, successContext);
  }

  next();
};

/**
 * Database operation logging middleware
 */
export const databaseLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Log database operations
  if ((req as any).path.includes('/api/') && ['POST', 'PUT', 'DELETE'].includes((req as any).method)) {
    const dbContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'database',
      source: 'database',
      action: (req as any).method.toLowerCase(),
      resource: (req as any).path.split('/').pop(),
      metadata: {
        operation: (req as any).method,
        resource: (req as any).path.split('/').pop(),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      },
      tags: ['database', (req as any).method.toLowerCase(), (req as any).path.split('/').pop() || 'unknown']
    };

    logger.database(`Database operation: ${(req as any).method} ${(req as any).path}`, dbContext);
  }

  next();
};

/**
 * Security event logging middleware
 */
export const securityLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Log security events
  if ((res as any).statusCode >= 400) {
    const securityContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'security',
      source: 'backend',
      action: 'security_event',
      resource: (req as any).path,
      severity: (res as any).statusCode >= 500 ? 'high' : 'medium',
      metadata: {
        statusCode: (res as any).statusCode,
        errorType: (res as any).statusCode >= 500 ? 'server_error' : 'client_error',
        endpoint: (req as any).path,
        method: (req as any).method,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      },
      tags: ['security', 'error', (res as any).statusCode >= 500 ? 'server_error' : 'client_error']
    };

    logger.security(`Security event: ${(res as any).statusCode} ${(req as any).method} ${(req as any).path}`, securityContext);
  }

  // Log rate limiting events
  if ((req as any).rateLimit) {
    const rateLimitContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'security',
      source: 'backend',
      action: 'rate_limit_exceeded',
      resource: (req as any).path,
      severity: 'high',
      metadata: {
        rateLimit: (req as any).rateLimit,
        endpoint: (req as any).path,
        method: (req as any).method,
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id
      },
      tags: ['security', 'rate_limit', 'exceeded']
    };

    logger.security(`Rate limit exceeded: ${(req as any).method} ${(req as any).path}`, rateLimitContext);
  }

  next();
};

/**
 * Performance logging middleware
 */
export const performanceLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Override (res as any).end to capture performance metrics
  const originalEnd = (res as any).end;
  (res as any).end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests
    if (responseTime > 1000) { // Log requests slower than 1 second
      const performanceContext: LogContext = {
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
        sessionId: (req as any).sessionID,
        requestId: (req as any).requestId,
        correlationId: (req as any).correlationId,
        traceId: (req as any).traceId,
        endpoint: (req as any).path,
        method: (req as any).method,
        statusCode: (res as any).statusCode,
        responseTime,
        ipAddress: (req as any).ip,
        userAgent: (req as any).get('User-Agent'),
        category: 'performance',
        source: 'backend',
        action: 'slow_request',
        resource: (req as any).path,
        severity: responseTime > 5000 ? 'high' : 'medium',
        metadata: {
          responseTime,
          statusCode: (res as any).statusCode,
          endpoint: (req as any).path,
          method: (req as any).method,
          tenantId: (req as any).tenantId,
          userId: (req as any).user?.id,
          memoryUsage: process.memoryUsage()
        },
        tags: ['performance', 'slow_request', (req as any).method.toLowerCase()]
      };

      logger.performance(`Slow request detected: ${responseTime}ms ${(req as any).method} ${(req as any).path}`, performanceContext);
    }

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Business event logging middleware
 */
export const businessLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Log business events
  if ((req as any).path.includes('/api/') && ['POST', 'PUT', 'DELETE'].includes((req as any).method)) {
    const businessContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'business',
      source: 'backend',
      action: (req as any).method.toLowerCase(),
      resource: (req as any).path.split('/').pop(),
      metadata: {
        operation: (req as any).method,
        resource: (req as any).path.split('/').pop(),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
        businessEvent: true
      },
      tags: ['business', (req as any).method.toLowerCase(), (req as any).path.split('/').pop() || 'unknown']
    };

    logger.business(`Business event: ${(req as any).method} ${(req as any).path}`, businessContext);
  }

  next();
};

/**
 * Audit logging middleware
 */
export const auditLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Log audit events for sensitive operations
  const auditPaths = ['/api/users', '/api/tenants', '/api/auth', '/api/roles', '/api/permissions'];
  const isAuditPath = auditPaths.some((path: any) => (req as any).path.includes(path));
  
  if (isAuditPath && ['POST', 'PUT', 'DELETE'].includes((req as any).method)) {
    const auditContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'audit',
      source: 'backend',
      action: (req as any).method.toLowerCase(),
      resource: (req as any).path.split('/').pop(),
      metadata: {
        operation: (req as any).method,
        resource: (req as any).path.split('/').pop(),
        tenantId: (req as any).tenantId,
        userId: (req as any).user?.id,
        auditEvent: true,
        timestamp: new Date().toISOString()
      },
      tags: ['audit', (req as any).method.toLowerCase(), (req as any).path.split('/').pop() || 'unknown']
    };

    logger.audit(`Audit event: ${(req as any).method} ${(req as any).path}`, auditContext);
  }

  next();
};

/**
 * Error logging middleware
 */
export const errorLogging = (error: Error, req: TenantRequest, res: Response, next: NextFunction): void => {
  const errorContext: LogContext = {
    tenantId: (req as any).tenantId,
    userId: (req as any).user?.id,
    sessionId: (req as any).sessionID,
    requestId: (req as any).requestId,
    correlationId: (req as any).correlationId,
    traceId: (req as any).traceId,
    endpoint: (req as any).path,
    method: (req as any).method,
    ipAddress: (req as any).ip,
    userAgent: (req as any).get('User-Agent'),
    category: 'system',
    source: 'backend',
    action: 'error',
    resource: (req as any).path,
    severity: 'high',
    error: {
      name: error.name,
      message: error instanceof Error ? error.message : String(error),
      stack: error.stack,
      code: (error as any).code,
      details: (error as any).details
    },
    metadata: {
      errorType: error.constructor.name,
      endpoint: (req as any).path,
      method: (req as any).method,
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString()
    },
    tags: ['error', error.constructor.name.toLowerCase(), (req as any).method.toLowerCase()]
  };

  logger.logError(error, errorContext);
  next(error);
};

/**
 * Tenant context logging middleware
 */
export const tenantContextLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Log tenant context changes
  if ((req as any).tenantId && (req as any).tenant) {
    const tenantContext: LogContext = {
      tenantId: (req as any).tenantId,
      userId: (req as any).user?.id,
      sessionId: (req as any).sessionID,
      requestId: (req as any).requestId,
      correlationId: (req as any).correlationId,
      traceId: (req as any).traceId,
      endpoint: (req as any).path,
      method: (req as any).method,
      ipAddress: (req as any).ip,
      userAgent: (req as any).get('User-Agent'),
      category: 'system',
      source: 'backend',
      action: 'tenant_context',
      resource: 'tenant',
      metadata: {
        tenantId: (req as any).tenantId,
        tenantName: (req as any).tenant.name,
        tenantDomain: (req as any).tenantDomain,
        userId: (req as any).user?.id,
        timestamp: new Date().toISOString()
      },
      tags: ['tenant', 'context', (req as any).tenant.name]
    };

    logger.system(`Tenant context: ${(req as any).tenant.name} (${(req as any).tenantId})`, tenantContext);
  }

  next();
};

/**
 * Comprehensive logging middleware that combines all logging types
 */
export const comprehensiveLogging = (req: TenantRequest, res: Response, next: NextFunction): void => {
  // Apply all logging middlewares
  requestIdMiddleware(req, res, () => {
    correlationIdMiddleware(req, res, () => {
      traceIdMiddleware(req, res, () => {
        httpRequestLogging(req, res, () => {
          authLogging(req, res, () => {
            databaseLogging(req, res, () => {
              securityLogging(req, res, () => {
                performanceLogging(req, res, () => {
                  businessLogging(req, res, () => {
                    auditLogging(req, res, () => {
                      tenantContextLogging(req, res, next);
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};
