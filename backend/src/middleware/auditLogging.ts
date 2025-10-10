// backend/src/middleware/auditLogging.ts
import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditLogService';
import { TenantRequest } from './tenantResolution';
import { log } from '../utils/logger';

export interface AuditLogOptions {
  action?: string;
  resource?: string;
  resourceId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing';
  skipLogging?: boolean;
  customDetails?: any;
  metadata?: any;
}

export interface AuditLogRequest extends Request {
  auditLog?: {
    startTime: number;
    requestId: string;
    sessionId?: string;
    tenantId?: string;
    userId?: string;
    userEmail?: string;
  };
}

/**
 * Middleware to automatically log API requests and responses
 */
export const auditLogging = (options: AuditLogOptions = {}) => {
  return async (req: AuditLogRequest, res: Response, next: NextFunction) => {
    try {
      // Skip logging if explicitly disabled
      if (options.skipLogging) {
        return next();
      }

      const startTime = Date.now();
      const requestId = (req as any).headers['x-request-id'] as string || 
                       `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = (req as any).headers['x-session-id'] as string;
      
      // Store audit context in request
      (req as any).auditLog = {
        startTime,
        requestId,
        sessionId,
        tenantId: (req as TenantRequest).tenantId,
        userId: (req as any).user?._id,
        userEmail: (req as any).user?.email
      };

      // Set request ID in response headers
      (res as any).set('X-Request-ID', requestId);

      // Override (res as any).end to capture response details
      const originalEnd = (res as any).end.bind(res);
      (res as any).end = function(chunk?: any, encoding?: any) {
        try {
          // Log the audit entry asynchronously (don't block response)
          setImmediate(async () => {
            try {
              await logAuditEntry(req, res, options, startTime);
            } catch (error) {
              log.error('Failed to log audit entry:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
            }
          });
        } catch (error) {
          log.error('Error in audit logging middleware:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
        }

        // Call original end method
        return originalEnd(chunk, encoding);
      };

      next();
    } catch (error) {
      log.error('Audit logging middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(); // Continue processing even if audit logging fails
    }
  };
};

/**
 * Log audit entry for the request
 */
async function logAuditEntry(
  req: AuditLogRequest, 
  res: Response, 
  options: AuditLogOptions, 
  startTime: number
): Promise<void> {
  try {
    const user = (req as any).user;
    const tenantId = (req as TenantRequest).tenantId;
    
    // Skip logging if no user context (public endpoints)
    if (!user) {
      return;
    }

    const duration = Date.now() - startTime;
    const action = options.action || getActionFromMethod((req as any).method);
    const resource = options.resource || getResourceFromPath((req as any).path);
    const severity = options.severity || getSeverityFromStatusCode((res as any).statusCode);
    const category = options.category || getCategoryFromPath((req as any).path);

    // Determine resource ID from path parameters or body
    let resourceId = options.resourceId;
    if (!resourceId) {
      resourceId = getResourceIdFromRequest(req);
    }

    // Prepare audit details
    const auditDetails: any = {
      method: (req as any).method,
      path: (req as any).path,
      query: (req as any).query,
      statusCode: (res as any).statusCode,
      duration,
      userAgent: (req as any).get('User-Agent'),
      ...options.customDetails
    };

    // Add request body for certain operations (be careful with sensitive data)
    if (shouldLogRequestBody((req as any).method, (req as any).path)) {
      (auditDetails as any).requestBody = sanitizeRequestBody((req as any).body);
    }

    // Add response data for certain operations
    if (shouldLogResponseBody((req as any).method, (req as any).path, (res as any).statusCode)) {
      (auditDetails as any).responseData = sanitizeResponseBody((res as any).get('content-type'), (res as any).get('content-length'));
    }

    // Log the audit entry
    await AuditLogService.logAction(
      user._id,
      user.email,
      action,
      resource,
      {
        resourceId,
        details: auditDetails,
        ipAddress: (req as any).ip || (req as any).connection.remoteAddress,
        userAgent: (req as any).get('User-Agent'),
        tenantId,
        severity,
        category,
        metadata: {
          requestId: (req as any).auditLog?.requestId,
          sessionId: (req as any).auditLog?.sessionId,
          duration,
          ...options.metadata
        }
      }
    );

  } catch (error) {
    log.error('Failed to create audit log entry:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
  }
}

/**
 * Determine action from HTTP method
 */
function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'unknown';
  }
}

/**
 * Determine resource from request path
 */
function getResourceFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length >= 2 && segments[0] === 'api') {
    return segments[1];
  }
  
  return 'unknown';
}

/**
 * Determine severity from HTTP status code
 */
function getSeverityFromStatusCode(statusCode: number): 'low' | 'medium' | 'high' | 'critical' {
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'high';
  if (statusCode >= 300) return 'medium';
  return 'low';
}

/**
 * Determine category from request path
 */
function getCategoryFromPath(path: string): 'user' | 'tenant' | 'subscription' | 'system' | 'security' | 'billing' {
  if (path.includes('/auth') || path.includes('/login') || path.includes('/logout')) {
    return 'security';
  }
  if (path.includes('/users')) {
    return 'user';
  }
  if (path.includes('/tenants')) {
    return 'tenant';
  }
  if (path.includes('/subscriptions') || path.includes('/billing')) {
    return 'billing';
  }
  if (path.includes('/system') || path.includes('/admin')) {
    return 'system';
  }
  return 'system';
}

/**
 * Extract resource ID from request
 */
function getResourceIdFromRequest(req: Request): string | undefined {
  // Try to get from URL parameters
  const params = (req as any).params;
  const possibleIds = ['id', 'userId', 'tenantId', 'subscriptionId', 'profileId'];
  
  for (const idField of possibleIds) {
    if (params[idField]) {
      return params[idField];
    }
  }
  
  // Try to get from request body
  if ((req as any).body && typeof (req as any).body === 'object') {
    for (const idField of possibleIds) {
      if ((req as any).body[idField]) {
        return (req as any).body[idField];
      }
    }
  }
  
  return undefined;
}

/**
 * Determine if request body should be logged
 */
function shouldLogRequestBody(method: string, path: string): boolean {
  // Don't log sensitive endpoints
  if (path.includes('/auth') || path.includes('/password') || path.includes('/login')) {
    return false;
  }
  
  // Log body for create/update operations
  return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
}

/**
 * Determine if response body should be logged
 */
function shouldLogResponseBody(method: string, path: string, statusCode: number): boolean {
  // Don't log sensitive responses
  if (path.includes('/auth') || path.includes('/password') || path.includes('/login')) {
    return false;
  }
  
  // Only log successful responses
  return statusCode >= 200 && statusCode < 300;
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'sin', 'creditCard'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Sanitize response body information
 */
function sanitizeResponseBody(contentType: string | undefined, contentLength: string | undefined): any {
  return {
    contentType,
    contentLength: contentLength ? parseInt(contentLength) : undefined
  };
}

/**
 * Middleware to log specific actions with custom details
 */
export const logAction = (
  action: string,
  resource: string,
  options: Omit<AuditLogOptions, 'action' | 'resource'> = {}
) => {
  return auditLogging({
    action,
    resource,
    ...options
  });
};

/**
 * Middleware for security-sensitive endpoints
 */
export const securityAudit = (action: string, resource: string = 'security') => {
  return auditLogging({
    action,
    resource,
    severity: 'high',
    category: 'security'
  });
};

/**
 * Middleware for user management operations
 */
export const userAudit = (action: string) => {
  return auditLogging({
    action,
    resource: 'user',
    severity: 'medium',
    category: 'user'
  });
};

/**
 * Middleware for tenant management operations
 */
export const tenantAudit = (action: string) => {
  return auditLogging({
    action,
    resource: 'tenant',
    severity: 'medium',
    category: 'tenant'
  });
};

/**
 * Middleware for system operations
 */
export const systemAudit = (action: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
  return auditLogging({
    action,
    resource: 'system',
    severity,
    category: 'system'
  });
};
