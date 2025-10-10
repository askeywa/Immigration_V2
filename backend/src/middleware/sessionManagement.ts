// backend/src/middleware/sessionManagement.ts
import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';
import { TenantRequest } from './tenantResolution';
import { log } from '../utils/logger';

/**
 * Session management middleware that validates and manages sessions
 */
export const sessionManagement = () => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Skip session validation for public endpoints
      const publicPaths = ['/api/auth/login', '/api/auth/register', '/health', '/api/health'];
      if (publicPaths.some((path: any) => (req as any).path.startsWith(path))) {
        return next();
      }

      // Validate session
      const validation = SessionService.validateSession(req);
      
      if (!validation.isValid) {
        // Handle session violations
        if (validation.violations && validation.violations.length > 0) {
          const criticalViolations = validation.violations.filter((v: any) => v.severity === 'critical');
          
          if (criticalViolations.length > 0) {
            log.warn('Critical session violation detected:', { 
              sessionId: (req as any).sessionID,
              violations: criticalViolations 
            });
            
            return (res as any).status(401).json({
              success: false,
              message: 'Session security violation detected',
              code: 'SESSION_VIOLATION'
            });
          }
          
          // Log non-critical violations but continue
          log.warn('Session violations detected:', { 
            sessionId: (req as any).sessionID,
            violations: validation.violations 
          });
        } else {
          return (res as any).status(401).json({
            success: false,
            message: 'Invalid or expired session',
            code: 'INVALID_SESSION'
          });
        }
      }

      // Attach session data to request
      if (validation.sessionData) {
        (req as any).sessionData = validation.sessionData;
        
        // Set tenant context from session if not already set
        if (!(req as any).tenantId && validation.sessionData.tenantId) {
          (req as any).tenantId = validation.sessionData.tenantId;
        }
        
        // Set user context
        (req as any).user = {
          _id: validation.sessionData.userId,
          email: validation.sessionData.userEmail,
          role: validation.sessionData.role,
          permissions: validation.sessionData.permissions,
          tenantId: validation.sessionData.tenantId
        };
        
        // Set super admin flag
        (req as any).isSuperAdmin = validation.sessionData.isSuperAdmin;
      }

      next();
    } catch (error) {
      log.error('Session management middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to enforce concurrent session limits
 */
export const concurrentSessionLimit = (maxSessions: number = 3) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // This would require implementing concurrent session tracking
      // For now, just pass through
      next();
    } catch (error) {
      log.error('Concurrent session limit middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to track session activity
 */
export const sessionActivityTracking = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ✅ Minimal session activity update - reduce object creation
      if ((req as any).session && ((req as any).session as any).userData) {
        // Update last activity timestamp only
        ((req as any).session as any).userData.lastActivity = new Date();
        
        // ✅ Set minimal headers only in development
        if (process.env.NODE_ENV !== 'production') {
          const sessionData = ((req as any).session as any).userData;
          (res as any).set('X-Session-ID', (req as any).sessionID);
          (res as any).set('X-User-ID', sessionData.userId);
        }
      }

      next();
    } catch (error) {
      log.error('Session activity tracking middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to validate tenant access from session
 */
export const validateTenantAccess = () => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const sessionData = (req as any).sessionData;
      
      if (!sessionData) {
        return (res as any).status(401).json({
          success: false,
          message: 'Session data not found'
        });
      }

      // Super admins can access any tenant
      if (sessionData.isSuperAdmin) {
        return next();
      }

      // Check if user's tenant matches the requested tenant
      if ((req as any).tenantId && sessionData.tenantId !== (req as any).tenantId) {
        log.warn('Tenant access violation:', {
          userId: sessionData.userId,
          sessionTenantId: sessionData.tenantId,
          requestedTenantId: (req as any).tenantId
        });
        
        return (res as any).status(403).json({
          success: false,
          message: 'Access denied to tenant data'
        });
      }

      next();
    } catch (error) {
      log.error('Tenant access validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to enforce session timeout
 */
export const sessionTimeout = (timeoutMinutes: number = 30) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).session && ((req as any).session as any).userData) {
        const sessionData = ((req as any).session as any).userData;
        const now = new Date();
        const lastActivity = new Date(sessionData.lastActivity);
        const timeoutMs = timeoutMinutes * 60 * 1000;
        
        if (now.getTime() - lastActivity.getTime() > timeoutMs) {
          log.info('Session timeout:', {
            sessionId: (req as any).sessionID,
            userId: sessionData.userId,
            lastActivity: sessionData.lastActivity
          });
          
          // Destroy expired session
          await SessionService.destroySession(req);
          
          return (res as any).status(401).json({
            success: false,
            message: 'Session timeout',
            code: 'SESSION_TIMEOUT'
          });
        }
      }

      next();
    } catch (error) {
      log.error('Session timeout middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to log session events
 */
export const sessionLogging = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // ✅ DISABLE session logging in production to prevent memory leaks
      if (process.env.NODE_ENV === 'production') {
        return next();
      }

      // Development-only session logging
      const originalEnd = (res as any).end.bind(res);
      
      (res as any).end = function(chunk?: any, encoding?: any) {
        if ((req as any).session && ((req as any).session as any).userData) {
          const sessionData = ((req as any).session as any).userData;
          
          // Minimal logging for development
          log.debug('Session activity:', {
            sessionId: (req as any).sessionID,
            userId: sessionData.userId,
            method: (req as any).method,
            path: (req as any).path,
            statusCode: (res as any).statusCode
          });
        }
        
        return originalEnd(chunk, encoding);
      };

      next();
    } catch (error) {
      log.error('Session logging middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to enforce session security policies
 */
export const sessionSecurityPolicy = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).session && ((req as any).session as any).userData) {
        const sessionData = ((req as any).session as any).userData;
        
        // Check for suspicious activity patterns
        const suspiciousPatterns = [
          // Multiple rapid requests
          // Requests from different IPs
          // Requests with different user agents
          // Requests outside normal business hours (optional)
        ];
        
        // Set security headers
        (res as any).set('X-Content-Type-Options', 'nosniff');
        (res as any).set('X-Frame-Options', 'DENY');
        (res as any).set('X-XSS-Protection', '1; mode=block');
        (res as any).set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        
        // Set session security headers
        (res as any).set('X-Session-Secure', 'true');
        (res as any).set('X-Session-HttpOnly', 'true');
      }

      next();
    } catch (error) {
      log.error('Session security policy middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Middleware to handle session refresh
 */
export const sessionRefresh = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if ((req as any).session && ((req as any).session as any).userData) {
        const sessionData = ((req as any).session as any).userData;
        
        // Refresh session if it's close to expiration
        const now = new Date();
        const lastActivity = new Date(sessionData.lastActivity);
        const maxAge = (req as any).session.cookie.maxAge || 24 * 60 * 60 * 1000;
        const sessionAge = now.getTime() - sessionData.loginTime.getTime();
        const remainingTime = maxAge - sessionAge;
        
        // Refresh if less than 25% of session time remains
        if (remainingTime < maxAge * 0.25) {
          log.info('Refreshing session:', {
            sessionId: (req as any).sessionID,
            userId: sessionData.userId,
            remainingTime
          });
          
          (req as any).session.touch();
          (res as any).set('X-Session-Refreshed', 'true');
        }
      }

      next();
    } catch (error) {
      log.error('Session refresh middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};
