// backend/src/middleware/securityHardening.ts
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss';
import hpp from 'hpp';
import { SecurityService } from '../services/securityService';
import { TenantRequest } from './tenantResolution';
import { log } from '../utils/logger';

/**
 * Security headers middleware using Helmet
 */
export const securityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        childSrc: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent: []
      }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });
};

/**
 * CORS configuration middleware
 */
export const corsSecurity = () => {
  return cors({
    origin: (origin: any, callback: any) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // In production, you would check against allowed origins
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5174', // Frontend dev server
        'http://localhost:5175', // Alternative frontend port
        'http://localhost:5173', // Alternative Vite port
        'https://ibuyscrap.ca', // Production domain
        'https://www.ibuyscrap.ca', // Production domain with www
        'https://honeynwild.com' // Tenant domain
      ];
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'X-Tenant-ID',
      'X-Tenant-Name',
      'X-Is-Super-Admin',
      'X-Original-Host',
      'X-Tenant-Domain'
    ],
    exposedHeaders: [
      'X-Tenant-ID',
      'X-Tenant-Name',
      'X-Tenant-Domain',
      'X-Is-Super-Admin',
      'X-Session-ID',
      'X-User-ID',
      'X-Last-Activity'
    ],
    maxAge: 86400 // 24 hours
  });
};

/**
 * MongoDB injection protection middleware
 */
export const mongoSanitization = () => {
  return mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      log.warn('MongoDB injection attempt detected:', {
        ip: (req as any).ip,
        userAgent: (req as any).get('User-Agent'),
        key,
        endpoint: (req as any).path
      });
    }
  });
};

/**
 * XSS protection middleware
 */
export const xssProtection = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Sanitize request body
      if ((req as any).body && typeof (req as any).body === 'object') {
        (req as any).body = sanitizeObject((req as any).body);
      }
      
      // Sanitize query parameters
      if ((req as any).query && typeof (req as any).query === 'object') {
        (req as any).query = sanitizeObject((req as any).query);
      }
      
      next();
    } catch (error) {
      log.error('XSS protection middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * HTTP Parameter Pollution protection
 */
export const parameterPollutionProtection = () => {
  return hpp({
    whitelist: ['page', 'limit', 'sort', 'order', 'search', 'filter']
  });
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip CSRF check for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes((req as any).method)) {
        return next();
      }

      // Skip CSRF check for API endpoints with proper authentication
      if ((req as any).path.startsWith('/api/') && (req as any).headers.authorization) {
        return next();
      }

      const isValidCSRF = SecurityService.validateCSRFToken(req);
      
      if (!isValidCSRF) {
        const violation = SecurityService.logViolation(
          'csrf',
          'high',
          req,
          { reason: 'Invalid or missing CSRF token' },
          true
        );
        
        return (res as any).status(403).json({
          success: false,
          message: 'CSRF token validation failed',
          code: 'CSRF_VIOLATION'
        });
      }

      next();
    } catch (error) {
      log.error('CSRF protection middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Input validation middleware
 */
export const inputValidation = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for suspicious patterns in input
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload/i,
        /onerror/i,
        /onclick/i,
        /onmouseover/i,
        /onfocus/i,
        /onblur/i,
        /onchange/i,
        /onsubmit/i
      ];

      const checkInput = (input: any): boolean => {
        if (typeof input === 'string') {
          return suspiciousPatterns.some((pattern: any) => pattern.test(input));
        }
        
        if (Array.isArray(input)) {
          return (input as any).some((item: any) => checkInput(item));
        }
        
        if (typeof input === 'object' && input !== null) {
          return Object.values(input).some((value: any) => checkInput(value));
        }
        
        return false;
      };

      if (checkInput((req as any).body) || checkInput((req as any).query)) {
        const violation = SecurityService.logViolation(
          'xss',
          'high',
          req,
          { body: (req as any).body, query: (req as any).query },
          true
        );
        
        return (res as any).status(400).json({
          success: false,
          message: 'Invalid input detected',
          code: 'INPUT_VALIDATION_FAILED'
        });
      }

      next();
    } catch (error) {
      log.error('Input validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Request size limiting middleware
 */
export const requestSizeLimit = (limit: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt((req as any).get('content-length') || '0');
    const limitBytes = parseSizeLimit(limit);
    
    if (contentLength > limitBytes) {
      const violation = SecurityService.logViolation(
        'validation',
        'medium',
        req,
        { contentLength, limit: limitBytes },
        true
      );
      
      return (res as any).status(413).json({
        success: false,
        message: 'Request too large',
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    next();
  };
};

/**
 * Security monitoring middleware
 */
export const securityMonitoring = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log suspicious activity
    const suspiciousIndicators = [
      (req as any).get('User-Agent')?.includes('curl') && !(req as any).path.includes('/api/'),
      (req as any).get('User-Agent')?.includes('python') && !(req as any).path.includes('/api/'),
      (req as any).get('User-Agent')?.includes('bot') && !(req as any).path.includes('/api/'),
      (req as any).query && Object.keys((req as any).query || {}).length > 20,
      (req as any).headers && (req as any).headers['x-forwarded-for'] && (Array.isArray((req as any).headers['x-forwarded-for']) ? (req as any).headers['x-forwarded-for'].length : (req as any).headers['x-forwarded-for'].split(',').length) > 5
    ];

    if (suspiciousIndicators.some(Boolean)) {
      log.warn('Suspicious activity detected:', {
        ip: (req as any).ip,
        userAgent: (req as any).get('User-Agent'),
        endpoint: (req as any).path,
        method: (req as any).method,
        queryParams: Object.keys((req as any).query || {}).length,
        xForwardedFor: (req as any).headers['x-forwarded-for']
      });
    }

    // Monitor response time
    (res as any).on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > 5000) { // Log slow requests
        log.warn('Slow request detected:', {
          ip: (req as any).ip,
          endpoint: (req as any).path,
          method: (req as any).method,
          duration,
          statusCode: (res as any).statusCode
        });
      }
    });

    next();
  };
};

/**
 * Tenant security validation middleware
 */
export const tenantSecurityValidation = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Validate tenant context security
      if ((req as any).tenantId && !(req as any).isSuperAdmin) {
        // Ensure tenant ID is valid ObjectId format
        const objectIdPattern = /^[0-9a-fA-F]{24}$/;
        if (!objectIdPattern.test((req as any).tenantId)) {
          const violation = SecurityService.logViolation(
            'validation',
            'high',
            req,
            { tenantId: (req as any).tenantId, reason: 'Invalid tenant ID format' },
            true
          );
          
          return (res as any).status(400).json({
            success: false,
            message: 'Invalid tenant context',
            code: 'INVALID_TENANT'
          });
        }
      }

      // Validate super admin access
      if ((req as any).isSuperAdmin && (req as any).path.includes('/admin')) {
        const user = (req as any).user;
        if (!user || user.role !== 'super_admin') {
          const violation = SecurityService.logViolation(
            'validation',
            'critical',
            req,
            { reason: 'Unauthorized super admin access attempt' },
            true
          );
          
          return (res as any).status(403).json({
            success: false,
            message: 'Unauthorized access',
            code: 'UNAUTHORIZED_SUPER_ADMIN'
          });
        }
      }

      next();
    } catch (error) {
      log.error('Tenant security validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Content type validation middleware
 */
export const contentTypeValidation = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip for GET requests, DELETE requests, and OPTIONS
      if (['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes((req as any).method)) {
        return next();
      }

      const contentType = (req as any).get('content-type');
      const expectedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ];

      if (!contentType || !expectedTypes.some((type: any) => contentType.includes(type))) {
        const violation = SecurityService.logViolation(
          'headers',
          'medium',
          req,
          { contentType, expectedTypes },
          true
        );
        
        return (res as any).status(415).json({
          success: false,
          message: 'Unsupported media type',
          code: 'UNSUPPORTED_MEDIA_TYPE'
        });
      }

      next();
    } catch (error) {
      log.error('Content type validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Helper function to sanitize objects recursively
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }

  if (Array.isArray(obj)) {
    return (obj as any).map((item: any) => sanitizeObject(item));
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      (sanitized as any)[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Helper function to parse size limit string
 */
function parseSizeLimit(limit: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = limit.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) {
    return 10 * 1024 * 1024; // Default 10MB
  }

  const size = parseFloat((match as any)[1]);
  const unit = (match as any)[2] || 'b';
  
  return Math.floor(size * (units as any)[unit]);
}
