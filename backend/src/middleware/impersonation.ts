// backend/src/middleware/impersonation.ts
import { Request, Response, NextFunction } from 'express';
import { TenantRequest } from './tenantResolution';
import { ImpersonationService } from '../services/impersonationService';
import { AppError } from '../utils/errors';
import { log } from '../utils/logger';

/**
 * Impersonation authentication middleware
 */
export const impersonationAuth = () => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const impersonationToken = (req as any).headers['x-impersonation-token'] as string;
      
      if (!impersonationToken) {
        return next();
      }

      // Validate impersonation token
      const validation = await ImpersonationService.validateImpersonationToken(impersonationToken);
      
      if (!validation.valid) {
        return (res as any).status(401).json({
          success: false,
          message: 'Invalid impersonation token',
          code: 'INVALID_IMPERSONATION_TOKEN',
          error: validation.error
        });
      }

      // Attach impersonation context to request
      (req as any).impersonation = validation.session;
      (req as any).impersonationRecord = validation.impersonation;
      (req as any).isImpersonated = true;

      // Override user context with impersonated user
      if (validation.session) {
        (req as any).originalUser = (req as any).user;
        (req as any).user = {
          _id: validation.session.targetUserId,
          email: validation.session.targetUserEmail,
          role: validation.session.targetUserRole,
          permissions: validation.session.targetUserPermissions,
          tenantId: validation.session.targetTenantId
        };

        // Override tenant context
        (req as any).tenantId = validation.session.targetTenantId;
        (req as any).isSuperAdmin = false; // Impersonated user is not super admin
      }

      next();
    } catch (error) {
      log.error('Impersonation authentication middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Impersonation action logging middleware
 */
export const impersonationActionLogging = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log action on response
    (res as any).on('finish', async () => {
      try {
        const impersonation = (req as any).impersonation;
        
        if (impersonation) {
          const duration = Date.now() - startTime;
          const action = `${(req as any).method} ${(req as any).path}`;
          
          await ImpersonationService.logAction(
            impersonation.impersonationId,
            action,
            (req as any).path,
            {
              method: (req as any).method,
              statusCode: (res as any).statusCode,
              duration,
              ipAddress: (req as any).ip,
              userAgent: (req as any).get('User-Agent'),
              timestamp: new Date()
            }
          );
        }
      } catch (error) {
        log.error('Failed to log impersonation action:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      }
    });

    next();
  };
};

/**
 * Impersonation session validation middleware
 */
export const impersonationSessionValidation = () => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const impersonation = (req as any).impersonation;
      
      if (!impersonation) {
        return next();
      }

      // Check if session is still active
      const sessionValidation = await ImpersonationService.validateImpersonationToken(
        (req as any).impersonationRecord?.impersonationToken || ''
      );
      
      if (!sessionValidation.valid) {
        return (res as any).status(401).json({
          success: false,
          message: 'Impersonation session expired or invalid',
          code: 'IMPERSONATION_SESSION_EXPIRED'
        });
      }

      // Check risk score and flags
      if (impersonation.riskScore > 80) {
        log.warn('High risk impersonation session detected:', {
          sessionId: impersonation.impersonationId,
          riskScore: impersonation.riskScore,
          flags: impersonation.flags,
          superAdminId: impersonation.superAdminId,
          targetUserId: impersonation.targetUserId
        });
      }

      next();
    } catch (error) {
      log.error('Impersonation session validation middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Impersonation context middleware
 */
export const impersonationContext = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const impersonationContext = ImpersonationService.getImpersonationContext(req);
      
      // Attach impersonation context to request
      (req as any).impersonationContext = impersonationContext;
      
      // Set impersonation headers for frontend
      if (impersonationContext.isImpersonated && impersonationContext.session) {
        (res as any).set('X-Impersonated', 'true');
        (res as any).set('X-Impersonation-Session-ID', impersonationContext.session.impersonationId);
        (res as any).set('X-Original-User-ID', impersonationContext.originalUser?.id || '');
        (res as any).set('X-Impersonated-User-ID', impersonationContext.impersonatedUser?.id || '');
        (res as any).set('X-Impersonation-Risk-Score', impersonationContext.session.riskScore.toString());
        (res as any).set('X-Impersonation-Start-Time', impersonationContext.session.startTime.toISOString());
      }

      next();
    } catch (error) {
      log.error('Impersonation context middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Impersonation rate limiting middleware
 */
export const impersonationRateLimit = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const impersonation = (req as any).impersonation;
      
      if (!impersonation) {
        return next();
      }

      // Check if too many actions in short time
      const recentActions = impersonation.actions?.filter(
        (action: any) => Date.now() - (action as any).timestamp.getTime() < 60000 // Last minute
      ) || [];

      if (recentActions.length > 100) { // More than 100 actions per minute
        log.warn('Impersonation rate limit exceeded:', {
          sessionId: impersonation.impersonationId,
          actionsPerMinute: recentActions.length,
          superAdminId: impersonation.superAdminId,
          targetUserId: impersonation.targetUserId
        });

        return (res as any).status(429).json({
          success: false,
          message: 'Impersonation rate limit exceeded',
          code: 'IMPERSONATION_RATE_LIMIT_EXCEEDED'
        });
      }

      next();
    } catch (error) {
      log.error('Impersonation rate limit middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Impersonation security middleware
 */
export const impersonationSecurity = () => {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const impersonation = (req as any).impersonation;
      
      if (!impersonation) {
        return next();
      }

      // Check for suspicious patterns
      const suspiciousPatterns = [
        (req as any).path.includes('/admin') && !impersonation.targetUserRole.includes('admin'),
        (req as any).method === 'DELETE' && impersonation.riskScore > 50,
        (req as any).path.includes('/export') && impersonation.actions?.length > 20,
        (req as any).path.includes('/bulk') && impersonation.riskScore > 30
      ];

      if (suspiciousPatterns.some(Boolean)) {
        log.warn('Suspicious impersonation activity detected:', {
          sessionId: impersonation.impersonationId,
          path: (req as any).path,
          method: (req as any).method,
          riskScore: impersonation.riskScore,
          suspiciousPatterns: suspiciousPatterns.map((pattern: any, index: any) => pattern ? `pattern_${index}` : null).filter(Boolean)
        });

        // Add flag to impersonation
        if (!impersonation.flags.includes('suspicious_activity')) {
          impersonation.flags.push('suspicious_activity');
        }
      }

      next();
    } catch (error) {
      log.error('Impersonation security middleware error:', { error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) });
      next(error);
    }
  };
};

/**
 * Comprehensive impersonation middleware stack
 */
export const comprehensiveImpersonation = () => {
  return [
    impersonationAuth(),
    impersonationSessionValidation(),
    impersonationContext(),
    impersonationRateLimit(),
    impersonationSecurity(),
    impersonationActionLogging()
  ];
};
